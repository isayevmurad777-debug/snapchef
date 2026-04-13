// OpenAI TTS - Much cheaper than ElevenLabs ($0.015/1K chars vs $0.30/1K chars)
// Voice: "nova" = warm female voice, perfect for Chef Luna

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { text, voice, speed } = JSON.parse(event.body || '{}');
        
        if (!text || text.trim().length === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'No text provided' }) };
        }

        // Limit text length to control costs
        const trimmedText = text.substring(0, 500);

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',           // Cheaper model ($0.015/1K chars)
                input: trimmedText,
                voice: voice || 'nova',    // nova = warm female voice
                speed: speed || 1.0,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenAI TTS error:', err);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'TTS failed', fallback: true }) };
        }

        // Convert audio buffer to base64
        const arrayBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ audio: base64Audio })
        };

    } catch (error) {
        console.error('TTS function error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message, fallback: true }) };
    }
};
