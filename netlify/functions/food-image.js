// Pexels API - Free high-quality food images
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!PEXELS_API_KEY) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'not_configured' }) };
  }

  try {
    const query = event.queryStringParameters?.q || 'food';
    const perPage = event.queryStringParameters?.n || 1;

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + ' food dish')}&per_page=${perPage}&orientation=landscape`,
      {
        headers: { 'Authorization': PEXELS_API_KEY }
      }
    );

    if (!response.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'Pexels API error' }) };
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      const images = data.photos.map(p => ({
        url: p.src.medium,       // 350x233 - fast loading
        urlLarge: p.src.large,   // 940x627
        urlOriginal: p.src.original,
        photographer: p.photographer,
        alt: p.alt || query
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ images: images })
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ images: [] }) };

  } catch (error) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: error.message }) };
  }
};
