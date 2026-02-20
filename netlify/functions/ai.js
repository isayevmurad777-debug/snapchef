// OpenAI API proxy function with Firestore usage tracking
const admin = require('firebase-admin');

// Initialize Firebase Admin (yalnız bir dəfə)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const MAX_FREE_GENERATIONS = 15; // Gündə 15 pulsuz

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Yalnız POST request qəbul et
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Firebase ID token-i yoxla və təsdiqlə
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Login required' }),
      };
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Token-i təsdiqlə
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    const userId = decodedToken.uid;

    // Request body-ni parse et
    const { prompt, action, messages, max_tokens } = JSON.parse(event.body);

    // Firestore-dan istifadə məlumatını oxu
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    let currentUsage = 0;
    let lastResetDate = null;

    if (userDoc.exists) {
      const userData = userDoc.data();
      currentUsage = userData.recipeGenerations || 0;
      lastResetDate = userData.lastResetDate || null;
    }

    // Gündəlik reset: Əgər son reset bugündən əvvəldirsə, counter-i sıfırla
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (lastResetDate !== today) {
      currentUsage = 0;
      await userDocRef.set(
        {
          recipeGenerations: 0,
          lastResetDate: today,
        },
        { merge: true }
      );
    }

    // Əgər yalnız limit yoxlaması istənilsə
    if (action === 'check-limit') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          used: currentUsage,
          limit: MAX_FREE_GENERATIONS,
          remaining: Math.max(0, MAX_FREE_GENERATIONS - currentUsage),
        }),
      };
    }

    // Limit aşılıb?
    if (currentUsage >= MAX_FREE_GENERATIONS) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'free_limit_exceeded',
          message: 'Günlük pulsuz limit bitdi. Premium üzvlüyə keçid edin',
          used: currentUsage,
          limit: MAX_FREE_GENERATIONS,
        }),
      };
    }

    // OpenAI API çağırışı
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages || [{ role: 'user', content: prompt }],
        max_tokens: max_tokens || 1500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await openaiResponse.json();
    const response = data.choices[0].message.content;

    // Markdown code fence-ləri təmizlə
    const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Firestore-da istifadə sayını artır
    await userDocRef.set(
      {
        recipeGenerations: currentUsage + 1,
        lastGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastResetDate: today,
        email: decodedToken.email || null,
      },
      { merge: true }
    );

    const usageInfo = {
      used: currentUsage + 1,
      limit: MAX_FREE_GENERATIONS,
      remaining: MAX_FREE_GENERATIONS - currentUsage - 1,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: cleanResponse,
        usage: usageInfo,
        _usage: usageInfo, // backward compatibility
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
