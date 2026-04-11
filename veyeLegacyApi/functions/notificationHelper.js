/**
 * Shared helper to send push notifications via OneSignal.
 * Used by: notification HTTP handler, aiPipeline writeToFirestore
 */
const axios = require('axios');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Lazy getter — avoids calling admin.firestore() before initializeApp()
const getDb = () => admin.firestore();

function replaceUndefined(str) {
  if (typeof str !== 'string') return str || 'Port-au-Prince';
  return str.replace(/undefined/g, 'Port-au-Prince').replace(/underfined/g, 'Port-au-Prince');
}

/**
 * Send notification to OneSignal
 * @param {string} information - Message content
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendOneSignalNotification(information, position) {
  const cleaned = replaceUndefined(information ?? '');
  const appId = process.env.ONESIGNAL_API_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_ID_KEY;

  if (!appId || !apiKey) {
    functions.logger.warn('sendOneSignalNotification: ONESIGNAL_API_ID or ONESIGNAL_REST_API_ID_KEY not set');
    return { success: false, error: 'Missing OneSignal config' };
  }

  // get all users within range of the incident position
  const users = await getUsersForNotification(position);
  const playerIds = users.map(u => u.deviceToken).filter(Boolean);

  functions.logger.info('sendOneSignalNotification: playerIds', { playerIds })

  if (playerIds.length === 0) {
    functions.logger.info('sendOneSignalNotification: no eligible users in range, skipping');
    return { success: true, skipped: 'no_users_in_range' };
  }

  const message = {
    app_id: appId,
    contents: { "en": cleaned },
    headings: { "en": 'VEYe' },
    include_player_ids: playerIds,
    data: { title: 'VEYe', contents: cleaned },
  };

  try {
    const resp = await axios.post('https://onesignal.com/api/v1/notifications', message, {
      headers: {
        Authorization: `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    functions.logger.info('sendOneSignalNotification: success', { id: resp.data?.id });
    return { success: true };
  } catch (err) {
    functions.logger.error('sendOneSignalNotification: failed', { err: err.message });
    return { success: false, error: err.message };
  }
}

async function getUsersForNotification(messagePosition) {
  if (!messagePosition?.latitude || !messagePosition?.longitude) return [];
  const snapshot = await getDb().collection('Users').get();
  const allUsers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  const eligible = [];
  for (const user of allUsers) {
    if (!user.coords?.latitude || !user.coords?.longitude || !user.deviceToken) continue;
    const radiusKm = user.notificationRadiusKm ?? user.radiusKm ?? 25;
    const distance = calculateDistance(messagePosition, user.coords);
    if (distance <= radiusKm) eligible.push(user);
  }
  return eligible;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function calculateDistance(position1, position2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(position2.latitude - position1.latitude);
  const dLon = toRad(position2.longitude - position1.longitude);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(position1.latitude)) * Math.cos(toRad(position2.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { sendOneSignalNotification, replaceUndefined };
