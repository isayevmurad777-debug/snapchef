// Server-side URL fetcher - no CORS issues
// Fetches page HTML and extracts useful content

const https = require('https');
const http = require('http');

function fetchUrl(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: timeout
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractYouTubeDescription(html) {
  // Method 1: shortDescription from ytInitialPlayerResponse
  const sdMatch = html.match(/"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (sdMatch && sdMatch[1].length > 30) {
    return sdMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\u0026/g, '&')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, ' ')
      .substring(0, 5000);
  }

  // Method 2: meta description
  const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  if (metaMatch) return metaMatch[1];

  // Method 3: og:description
  const ogMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/);
  if (ogMatch) return ogMatch[1];

  return null;
}

function extractRecipeFromHtml(html) {
  // Method 1: JSON-LD structured data
  const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch;
  while ((ldMatch = ldRegex.exec(html)) !== null) {
    try {
      const obj = JSON.parse(ldMatch[1].trim());
      const str = JSON.stringify(obj);
      if (str.includes('"Recipe"')) return str.substring(0, 5000);
      if (obj['@graph']) {
        const recipe = obj['@graph'].find(item => item['@type'] === 'Recipe');
        if (recipe) return JSON.stringify(recipe).substring(0, 5000);
      }
    } catch (e) {}
  }

  // Method 2: Extract text from recipe containers
  // Simple regex-based extraction (no DOM in Node.js)
  const recipePatterns = [
    /class="[^"]*(?:recipe-content|wprm-recipe|tasty-recipe|recipe-card)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /itemtype="[^"]*Recipe[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|section)>/i,
    /id="recipe"[^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const pattern of recipePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Strip HTML tags
      const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 100) return text.substring(0, 5000);
    }
  }

  // Method 3: og:description for social platforms
  const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/);
  if (ogDesc && ogDesc[1].length > 50) return ogDesc[1];

  // Method 4: Main content text
  let bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (bodyText.length > 200) return bodyText.substring(0, 4000);

  return null;
}

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

  try {
    const { url, platform } = JSON.parse(event.body || '{}');

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL required' }) };
    }

    console.log('Fetching URL:', url, 'Platform:', platform);

    const html = await fetchUrl(url);
    
    let content = null;
    let title = null;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/\s+/g, ' ').trim();

    // Platform-specific extraction
    if (platform === 'youtube') {
      content = extractYouTubeDescription(html);
    } else {
      content = extractRecipeFromHtml(html);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: !!content,
        title: title || '',
        content: content || '',
        contentLength: content ? content.length : 0
      })
    };

  } catch (error) {
    console.error('Fetch error:', error.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        title: '',
        content: '',
        error: error.message
      })
    };
  }
};