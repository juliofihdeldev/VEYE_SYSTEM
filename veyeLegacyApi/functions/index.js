const admin = require('firebase-admin');
const functions = require("firebase-functions");
const { processPost, unblockUser } = require('./aiPipeline');

admin.initializeApp();
const { sendOneSignalNotification } = require('./notificationHelper');

// Telegram channel monitor (see veyeLegacyApi/TELEGRAM_PLAN.md)
const telegram = require('./telegramMonitor');
exports.telegramMonitor = telegram.telegramMonitor;
exports.telegramMonitorRun = telegram.telegramMonitorRun;

exports.notification = functions.https.onRequest(async (request, response) => {
  const information = request?.body?.information ?? '';
  const latitude = request?.body?.latitude ?? null;
  const longitude = request?.body?.longitude ?? null;
  const position = latitude && longitude ? { latitude, longitude } : null;

  functions.logger.info('notification: received', {
    infoLength: String(information).length,
    hasPosition: !!position,
  });

  const result = await sendOneSignalNotification(information, position);

  if (result.success) {
    response.status(200).send('Notification sent!');
  } else {
    response.status(500).send('Notification failed');
  }
});

exports.unblockUser = functions.https.onRequest(async (request, response) => {
  const secret = request.headers['x-veye-secret'] ?? request.body?.secret;
  if (!secret || secret !== process.env.PROCESS_ALERT_SECRET) {
    return response.status(401).send('Unauthorized');
  }

  const { userId } = request.body;
  if (!userId) return response.status(400).json({ error: 'userId is required' });

  try {
    const db = admin.firestore();
    await unblockUser(db, userId);
    return response.status(200).json({ success: true, userId, unblockReason: 'manual_admin' });
  } catch (err) {
    functions.logger.error('unblockUser endpoint failed', { err: err.message });
    return response.status(500).json({ error: err.message });
  }
});

// Public endpoint — called by the mobile app, protected by troll detection (no secret needed)
exports.processGlobalAlert = functions.https.onRequest(async (request, response) => {
  const db = admin.firestore();
  try {
    const result = await processPost(db, request.body, true);
    if (result.skipped === 'user_blocked') {
      return response.status(403).json(result);
    }
    return response.status(200).json(result);
  } catch (err) {
    functions.logger.error('processGlobalAlert: unhandled error', { err: err.message });
    return response.status(500).json({ error: err.message });
  }
});

// Admin endpoint — called by the dashboard, requires the secret
exports.processAdminAlert = functions.https.onRequest(async (request, response) => {
  const secret = request.headers['x-veye-secret'] ?? request.body?.secret;
  if (!secret || secret !== process.env.PROCESS_ALERT_SECRET) {
    return response.status(401).send('Unauthorized');
  }

  const db = admin.firestore();
  const result = await processPost(db, request.body, true);

  if (result.processed) {
    return response.status(200).json(result);
  }
  return response.status(500).json(result);
});

// Write an health check endpoint
exports.healthCheck = functions.https.onRequest(async (request, response) => {
  return response.status(200).json({ status: 'ok' });
});