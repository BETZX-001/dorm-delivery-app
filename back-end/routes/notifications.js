// utils/notifications.js

// Minutes assumed per remaining pending item when estimating a delivery ETA.
// Swap this for a real distance/traffic-based calculation later.
const MINUTES_PER_ITEM = 4;
const BASE_TRAVEL_MINUTES = 10;

/**
 * Rough ETA calculation for a DELIVERING order: base travel time plus a small
 * per-item buffer for however many orders are still active on the same slot.
 */
function calculateEta({ pendingOrderCount = 1 } = {}) {
  const minutes = BASE_TRAVEL_MINUTES + MINUTES_PER_ITEM * Math.max(pendingOrderCount - 1, 0);
  const etaTime = new Date(Date.now() + minutes * 60 * 1000);
  return { etaMinutes: minutes, etaTime };
}

/**
 * Mock Expo push notification sender.
 *
 * In production this would POST to https://exp.host/--/api/v2/push/send
 * with { to: pushToken, title, body, data }. For now it just logs, so the
 * rest of the order flow can be built and tested without needing real
 * device push tokens wired up yet. Swap the body of this function for a
 * fetch() call to the Expo endpoint when you're ready to go live.
 */
async function sendMockPushNotification({ pushToken, title, body, data }) {
  if (!pushToken) {
    console.log(`[push:skipped] no push_token on file — would have sent "${title}"`);
    return { sent: false, reason: 'no_push_token' };
  }

  console.log('[push:mock]', JSON.stringify({ to: pushToken, title, body, data }, null, 2));
  return { sent: true, mock: true };
}

module.exports = { calculateEta, sendMockPushNotification };
