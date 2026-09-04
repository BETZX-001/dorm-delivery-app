// controllers/orderController.js
const pool = require('../db');
const { calculateEta, sendMockPushNotification } = require('../routes/notifications');

const STATE_MACHINE = {
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['SHOPPING'],
  SHOPPING: ['DELIVERING'],
  DELIVERING: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
};

// POST /api/orders
// Requester places an order on a slot. Uses SELECT ... FOR UPDATE to lock the slot
// row for the duration of the transaction, preventing two concurrent requests from
// both reading current_orders < max_orders as true and overbooking the slot.
async function placeOrder(req, res) {
  const { uid } = req.user;
  const { slot_id, item_name, quantity, note } = req.body;

  if (!slot_id || !item_name || !quantity) {
    return res.status(400).json({ error: 'slot_id, item_name and quantity are required' });
  }
  if (Number(quantity) < 1) {
    return res.status(400).json({ error: 'quantity must be at least 1' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Row-level lock on the target slot for this transaction.
    const [slotRows] = await conn.query(
      'SELECT * FROM Slots WHERE slot_id = :slot_id FOR UPDATE',
      { slot_id }
    );

    if (slotRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Slot not found' });
    }

    const slot = slotRows[0];

    if (slot.status !== 'OPEN') {
      await conn.rollback();
      return res.status(409).json({ error: 'Slot is not open for new orders' });
    }
    if (new Date(slot.cut_off_time) <= new Date()) {
      await conn.rollback();
      return res.status(409).json({ error: 'Slot cut-off time has passed' });
    }
    if (slot.current_orders >= slot.max_orders) {
      await conn.rollback();
      return res.status(409).json({ error: 'Slot is already full' });
    }
    if (slot.runner_id === uid) {
      await conn.rollback();
      return res.status(400).json({ error: 'Runner cannot order on their own slot' });
    }

    const [orderResult] = await conn.query(
      `INSERT INTO Orders (slot_id, requester_id, item_name, quantity, note, order_status)
       VALUES (:slot_id, :uid, :item_name, :quantity, :note, 'PENDING')`,
      { slot_id, uid, item_name, quantity, note: note || null }
    );

    const newCount = slot.current_orders + 1;
    const newStatus = newCount >= slot.max_orders ? 'FULL' : 'OPEN';

    await conn.query(
      'UPDATE Slots SET current_orders = :newCount, status = :newStatus WHERE slot_id = :slot_id',
      { newCount, newStatus, slot_id }
    );

    await conn.commit();

    const [orderRows] = await pool.query('SELECT * FROM Orders WHERE order_id = :id', {
      id: orderResult.insertId,
    });

    return res.status(201).json({ order: orderRows[0] });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Failed to place order' });
  } finally {
    conn.release();
  }
}

// GET /api/orders/mine
// Requester views their own orders.
async function getMyOrders(req, res) {
  const { uid } = req.user;
  try {
    const [orders] = await pool.query(
      `SELECT o.*, s.destination, s.cut_off_time, s.status AS slot_status
       FROM Orders o JOIN Slots s ON s.slot_id = o.slot_id
       WHERE o.requester_id = :uid
       ORDER BY o.created_at DESC`,
      { uid }
    );
    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

// GET /api/orders/slot/:slotId
// Runner views all orders placed on one of their slots.
async function getOrdersForSlot(req, res) {
  const { uid } = req.user;
  const { slotId } = req.params;

  try {
    const [slotRows] = await pool.query('SELECT runner_id FROM Slots WHERE slot_id = :slotId', {
      slotId,
    });
    if (slotRows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    if (slotRows[0].runner_id !== uid) {
      return res.status(403).json({ error: 'Only the owning runner can view these orders' });
    }

    const [orders] = await pool.query(
      `SELECT o.*, u.name AS requester_name, u.room_number
       FROM Orders o JOIN Users u ON u.user_id = o.requester_id
       WHERE o.slot_id = :slotId
       ORDER BY o.created_at ASC`,
      { slotId }
    );

    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch orders for slot' });
  }
}

// PATCH /api/orders/:orderId/status
// Runner advances an order through the state machine:
// PENDING -> ACCEPTED -> SHOPPING -> DELIVERING -> COMPLETED (or PENDING -> REJECTED).
async function updateOrderStatus(req, res) {
  const { uid } = req.user;
  const { orderId } = req.params;
  const { order_status } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      `SELECT o.*, s.runner_id
       FROM Orders o JOIN Slots s ON s.slot_id = o.slot_id
       WHERE o.order_id = :orderId FOR UPDATE`,
      { orderId }
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];

    if (order.runner_id !== uid) {
      await conn.rollback();
      return res.status(403).json({ error: 'Only the owning runner can update this order' });
    }

    const allowedNext = STATE_MACHINE[order.order_status] || [];
    if (!allowedNext.includes(order_status)) {
      await conn.rollback();
      return res.status(409).json({
        error: `Cannot move order from ${order.order_status} to ${order_status}`,
        allowedNext,
      });
    }

    await conn.query('UPDATE Orders SET order_status = :order_status WHERE order_id = :orderId', {
      order_status,
      orderId,
    });

    // Trigger ETA calculation + notify the requester when the order goes DELIVERING.
    let etaPayload = null;
    if (order_status === 'DELIVERING') {
      const [[{ activeCount }]] = await conn.query(
        `SELECT COUNT(*) AS activeCount FROM Orders
         WHERE slot_id = :slot_id AND order_status IN ('ACCEPTED', 'SHOPPING', 'DELIVERING')`,
        { slot_id: order.slot_id }
      );

      const { etaMinutes, etaTime } = calculateEta({ pendingOrderCount: activeCount });
      etaPayload = { etaMinutes, etaTime };

      const [[requester]] = await conn.query(
        'SELECT push_token FROM Users WHERE user_id = :requester_id',
        { requester_id: order.requester_id }
      );

      await sendMockPushNotification({
        pushToken: requester?.push_token,
        title: 'Your order is on the way!',
        body: `${order.item_name} is out for delivery — ETA ~${etaMinutes} min.`,
        data: { order_id: order.order_id, eta_minutes: etaMinutes },
      });
    }

    // If the order is rejected, free up a capacity slot on the parent Slot.
    if (order_status === 'REJECTED') {
      await conn.query(
        `UPDATE Slots
         SET current_orders = GREATEST(current_orders - 1, 0),
             status = IF(status = 'FULL', 'OPEN', status)
         WHERE slot_id = :slot_id`,
        { slot_id: order.slot_id }
      );
    }

    await conn.commit();

    const [updated] = await pool.query('SELECT * FROM Orders WHERE order_id = :orderId', {
      orderId,
    });
    return res.json({ order: updated[0], eta: etaPayload });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    conn.release();
  }
}

module.exports = { placeOrder, getMyOrders, getOrdersForSlot, updateOrderStatus };
