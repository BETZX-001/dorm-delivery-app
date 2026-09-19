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
async function sendPushNotification({ pushToken, title, body, data }) {
  if (!pushToken) {
    console.log(`[push:skipped] no push_token on file — would have sent "${title}"`);
    return { sent: false, reason: 'no_push_token' };
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: pushToken, sound: 'default', channelId: 'orders', title, body, data }),
      signal: AbortSignal.timeout(5_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.data?.status === 'error') {
      console.error('[push:error]', result?.data?.message || response.statusText);
      return { sent: false, reason: result?.data?.message || 'expo_push_error' };
    }
    return { sent: true, ticket: result.data };
  } catch (error) {
    console.error('[push:error]', error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = { calculateEta, sendPushNotification };
