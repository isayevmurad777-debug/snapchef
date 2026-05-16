// Summarize Chef Luna voice conversation into 1-2 memorable facts
exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };
    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
    try {
        const { transcript } = JSON.parse(event.body || "{}");
        if (!transcript || transcript.length < 30) {
            return { statusCode: 200, headers, body: JSON.stringify({ summary: "" }) };
        }
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + process.env.DEEPSEEK_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "Extract 1-2 key facts about the user from this voice conversation between a user and Chef Luna. Focus on: food preferences, dietary restrictions, recipes liked, cooking goals, personal info shared. Output ONLY the facts as a single concise sentence (under 100 chars). If nothing notable, output empty string. Do not include quotes or labels."
                    },
                    { role: "user", content: transcript.substring(0, 3000) }
                ],
                temperature: 0.3,
                max_tokens: 80
            })
        });
        if (!response.ok) {
            return { statusCode: 200, headers, body: JSON.stringify({ summary: "" }) };
        }
        const data = await response.json();
        const summary = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "").trim();
        return { statusCode: 200, headers, body: JSON.stringify({ summary }) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ summary: "", error: error.message }) };
    }
};
