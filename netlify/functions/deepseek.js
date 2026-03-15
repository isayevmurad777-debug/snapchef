// DeepSeek AI - for recipe extraction (OpenAI-compatible API)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!DEEPSEEK_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DeepSeek API key not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
      },
      body: JSON.stringify({
        model: body.model || 'deepseek-chat',
        messages: body.messages || [],
        max_tokens: body.max_tokens || 2000,
        temperature: 0.3,
        response_format: body.response_format || undefined
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'DeepSeek API error' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: data.choices?.[0]?.message?.content || '',
        usage: data.usage
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
