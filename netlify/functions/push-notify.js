const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'snapchef-9dae2'
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

// Scheduled: runs every 15 minutes
exports.handler = async (event) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = String(currentHour).padStart(2, '0') + ':' + String(currentMinute).padStart(2, '0');
    const todayKey = now.toISOString().split('T')[0];

    console.log(`Push notify running at ${currentTime}`);

    // Get all users with FCM tokens
    const usersSnapshot = await db.collection('users').where('fcmToken', '!=', '').get();

    if (usersSnapshot.empty) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No users with tokens' }) };
    }

    let sent = 0;
    let errors = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const token = userData.fcmToken;
      const settings = userData.notifSettings;
      const sentToday = userData.sentNotifs || {};

      if (!token || !settings) continue;

      // Check what notifications to send
      const notifications = [];

      // 1. Water reminders (every N minutes)
      if (settings.water && settings.water.enabled) {
        const interval = settings.water.interval || 60;
        // Send if current minute is divisible by interval (approximately)
        if (currentMinute % Math.max(15, interval) < 15) {
          const waterKey = 'water_' + currentHour;
          if (!sentToday[waterKey]) {
            const waterTarget = userData.waterTarget || 8;
            notifications.push({
              key: waterKey,
              title: '💧 Time to hydrate!',
              body: `Don't forget to drink water! Goal: ${waterTarget} glasses.`
            });
          }
        }
      }

      // 2. Meal reminders (at specific times)
      if (settings.meals && settings.meals.enabled) {
        const times = settings.meals.times || ['08:00', '13:00', '19:00'];
        const mealNames = ['Breakfast', 'Lunch', 'Dinner'];
        const mealEmojis = ['🌅', '☀️', '🌙'];

        times.forEach((time, i) => {
          // Check if within 15 min window
          const [h, m] = time.split(':').map(Number);
          if (currentHour === h && currentMinute >= m && currentMinute < m + 15) {
            const mealKey = 'meal_' + i + '_' + todayKey;
            if (!sentToday[mealKey]) {
              notifications.push({
                key: mealKey,
                title: `${mealEmojis[i]} ${mealNames[i]} time!`,
                body: 'Time for a healthy meal. Open SnapChef to log it!'
              });
            }
          }
        });
      }

      // 3. Daily summary (at specific time)
      if (settings.summary && settings.summary.enabled) {
        const summaryTime = settings.summary.time || '21:00';
        const [sh, sm] = summaryTime.split(':').map(Number);
        if (currentHour === sh && currentMinute >= sm && currentMinute < sm + 15) {
          const sumKey = 'summary_' + todayKey;
          if (!sentToday[sumKey]) {
            notifications.push({
              key: sumKey,
              title: '📊 Daily Health Summary',
              body: 'Check your daily health score and nutrition progress!'
            });
          }
        }
      }

      // 4. Health tips (every N hours, roughly)
      if (settings.tips && settings.tips.enabled) {
        const tipsInterval = settings.tips.interval || 120; // minutes
        const tipHours = [9, 11, 14, 16, 18]; // Send at these hours
        if (tipHours.includes(currentHour) && currentMinute < 15) {
          const tipKey = 'tip_' + currentHour + '_' + todayKey;
          if (!sentToday[tipKey]) {
            const tips = [
              { title: '🥗 Eat more greens!', body: 'Adding vegetables improves nutrition and keeps you full.' },
              { title: '🥚 Protein power!', body: 'Include protein in each meal for muscle and appetite control.' },
              { title: '🚶 Move more!', body: 'A 10-minute walk after meals helps digestion.' },
              { title: '💧 Stay hydrated!', body: 'Water is essential for metabolism and energy.' },
              { title: '🍎 Snack smart!', body: 'Choose fruits, nuts, or yogurt over processed snacks.' },
              { title: '🍳 Cook at home!', body: 'Home-cooked meals are healthier and more nutritious.' },
              { title: '😴 Sleep well!', body: 'Good sleep is essential for metabolism.' }
            ];
            const tip = tips[Math.floor(Math.random() * tips.length)];
            notifications.push({
              key: tipKey,
              title: tip.title,
              body: tip.body
            });
          }
        }
      }

      // Send notifications
      for (const notif of notifications) {
        try {
          await messaging.send({
            token: token,
            notification: {
              title: notif.title,
              body: notif.body
            },
            webpush: {
              notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                vibrate: [100, 50, 100],
                tag: 'snapchef-' + notif.key,
                renotify: true
              },
              fcmOptions: {
                link: 'https://bucolic-rabanadas-a3f5cd.netlify.app'
              }
            }
          });

          // Mark as sent
          sentToday[notif.key] = true;
          sent++;
        } catch (sendError) {
          console.error(`Failed to send to ${userDoc.id}:`, sendError.message);
          
          // Remove invalid tokens
          if (sendError.code === 'messaging/invalid-registration-token' ||
              sendError.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(userDoc.id).update({ fcmToken: '' });
          }
          errors++;
        }
      }

      // Update sent notifications tracking
      if (notifications.length > 0) {
        await db.collection('users').doc(userDoc.id).update({
          sentNotifs: sentToday,
          lastNotifCheck: Date.now()
        });
      }
    }

    // Clean up yesterday's sent tracking (at midnight)
    if (currentHour === 0 && currentMinute < 15) {
      const batch = db.batch();
      usersSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { sentNotifs: {} });
      });
      await batch.commit();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sent, errors, time: currentTime })
    };

  } catch (error) {
    console.error('Push notify error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
