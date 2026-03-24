// ElevenLabs Text-to-Speech - Natural voice for Chef Luna
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Female voice IDs (natural sounding)
// Rachel - warm, friendly female voice (default)
// Bella - soft, young female
// Elli - friendly female
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!ELEVENLABS_API_KEY) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'not_configured', fallback: true }) };
  }

  try {
    const { text, voice_id, lang } = JSON.parse(event.body || '{}');

    if (!text || text.length > 500) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Text required (max 500 chars)' }) };
    }

    // Select voice based on language
    let voiceId = voice_id || DEFAULT_VOICE_ID;
    
    // ElevenLabs voice settings for warm, natural female voice
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',  // Supports 29 languages including AZ, RU, EN
        voice_settings: {
          stability: 0.65,        // Slightly less stable = more natural variation
          similarity_boost: 0.75, // Natural but consistent
          style: 0.35,            // Some expressiveness
          use_speaker_boost: true  // Clearer voice
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('ElevenLabs error:', response.status, errData);
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ error: errData.detail || 'TTS failed', fallback: true }) 
      };
    }

    // Convert audio to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio: base64Audio,
        format: 'audio/mpeg'
      })
    };

  } catch (error) {
    console.error('TTS error:', error.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: error.message, fallback: true })
    };
  }
};
