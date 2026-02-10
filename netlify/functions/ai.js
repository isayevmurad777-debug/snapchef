// OpenAI API proxy function
const fetch = require('node-fetch');

// In-memory istifadə məlumatı (production üçün Firestore tövsiyə olunur)
const userUsage = new Map();
const MAX_FREE_GENERATIONS = 10;

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
    // Firebase ID token-i yoxla
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Login required' }),
      };
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Request body-ni parse et
    const { userId, prompt, action } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId required' }),
      };
    }

    // İstifadə limitini yoxla
    const currentUsage = userUsage.get(userId) || 0;

    // Əgər yalnız limit yoxlaması istənilsə
    if (action === 'check-limit') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          used: currentUsage,
          limit: MAX_FREE_GENERATIONS,
          remaining: MAX_FREE_GENERATIONS - currentUsage,
        }),
      };
    }

    // Limit aşılıb?
    if (currentUsage >= MAX_FREE_GENERATIONS) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Free limit reached',
          message: 'Premium üzvlüyə keçid edin',
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
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await openaiResponse.json();
    const response = data.choices[0].message.content;

    // İstifadə sayını artır
    userUsage.set(userId, currentUsage + 1);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response,
        usage: {
          used: currentUsage + 1,
          limit: MAX_FREE_GENERATIONS,
          remaining: MAX_FREE_GENERATIONS - currentUsage - 1,
        },
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
