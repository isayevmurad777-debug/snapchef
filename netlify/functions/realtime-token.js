// Chef Luna Live Voice - OpenAI Realtime API ephemeral token generator
// Generates short-lived session token so the API key never leaves the backend
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
        const { lunaMemory, userName, language } = JSON.parse(event.body || '{}');

        // Build Chef Luna persona with personalized memory context
        let instructions = "You are Chef Luna, a warm, friendly, enthusiastic female cooking assistant inside the SnapChef app. You speak naturally and conversationally, like a close friend who happens to be a chef.\n\n";
        instructions += "PERSONALITY:\n- Warm, encouraging, patient\n- Uses cooking metaphors and light humor\n- Speaks naturally, not robotic\n- Gets excited about good food\n\n";
        instructions += "EXPERTISE:\n- Recipes from all cuisines (Italian, Turkish, Azerbaijani, Asian, French, Mexican, etc.)\n- Cooking techniques and tips\n- Ingredient substitutions\n- Meal planning and nutrition\n- Dietary considerations\n\n";
        instructions += "APP NAVIGATION: You can navigate the SnapChef app for the user using tools. When they ask to 'open', 'show', 'go to' a section (recipe/analyze/health/plan/saved/settings) or want to scan ingredients or generate a recipe, call the appropriate tool. Briefly confirm what you're doing in speech.\n\n";

        if (userName) {
            instructions += "The user's name is " + userName + ". Address them by name occasionally to feel personal.\n\n";
        }
        if (lunaMemory) {
            if (lunaMemory.favCuisine) {
                instructions += "User's favorite cuisine: " + lunaMemory.favCuisine + ". Lean toward suggestions in this style when relevant.\n";
            }
            if (lunaMemory.allergies && lunaMemory.allergies.length > 0) {
                instructions += "CRITICAL - User allergies/intolerances: " + lunaMemory.allergies.join(", ") + ". NEVER suggest recipes containing these.\n";
            }
            if (lunaMemory.notes && lunaMemory.notes.length > 0) {
                instructions += "Things to remember about this user: " + lunaMemory.notes.slice(-10).join("; ") + ".\n";
            }
        }

        // Language preference
        if (language === "az") {
            instructions += "\nThe user speaks Azerbaijani. Respond in Azerbaijani naturally.";
        } else if (language === "ru") {
            instructions += "\nThe user speaks Russian. Respond in Russian naturally.";
        } else {
            instructions += "\nRespond in English by default, but match the language the user speaks.";
        }

        instructions += "\n\nVOICE GUIDELINES (very important):\n- Keep responses SHORT (2-3 sentences max) - this is voice, not text\n- Use contractions (you'll, I'm, let's)\n- Pause for the user to respond\n- Don't list full step-by-step recipes - share them conversationally\n- If user wants a complete recipe, suggest they tap Generate Recipe in the app\n- Sound genuinely interested and engaged";

        // Create ephemeral session with OpenAI Realtime API
        const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                session: {
                    type: "realtime",
                    model: "gpt-realtime",
                    instructions: instructions,
                    audio: {
                        output: { voice: "coral" },
                        input: { transcription: { model: "whisper-1" } }
                    },
                    tools: [
                        {
                            type: "function",
                            name: "show_recipe",
                            description: "Display a recipe card to the user when you recommend or discuss a specific dish. Call this whenever you mention a particular recipe by name.",
                            parameters: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "Recipe name" },
                                    cuisine: { type: "string", description: "Cuisine type, e.g., Italian, Turkish" },
                                    cookTime: { type: "string", description: "Cooking time, e.g., 30 min" },
                                    difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                                    ingredients: { type: "array", items: { type: "string" }, description: "Main 3-5 ingredients" },
                                    calories: { type: "number", description: "Approximate calories per serving" }
                                },
                                required: ["name"]
                            }
                        },
                        {
                            type: "function",
                            name: "show_calories",
                            description: "Display calorie and nutrition info when discussing nutrition or when user asks about calories.",
                            parameters: {
                                type: "object",
                                properties: {
                                    food: { type: "string", description: "Food or dish name" },
                                    calories: { type: "number", description: "Calories per serving" },
                                    protein: { type: "number", description: "Protein in grams" },
                                    carbs: { type: "number", description: "Carbs in grams" },
                                    fat: { type: "number", description: "Fat in grams" }
                                },
                                required: ["food", "calories"]
                            }
                        },
                        {
                            type: "function",
                            name: "navigate",
                            description: "Navigate the user to a different section of the app. Call when user asks to go to/open/show a specific section.",
                            parameters: {
                                type: "object",
                                properties: {
                                    section: {
                                        type: "string",
                                        enum: ["recipe", "analyze", "health", "plan", "saved", "settings"],
                                        description: "Section name: recipe (recipe generator), analyze (food analyzer), health (calorie/nutrition tracking), plan (meal planning), saved (saved recipes), settings"
                                    }
                                },
                                required: ["section"]
                            }
                        },
                        {
                            type: "function",
                            name: "scan_ingredients",
                            description: "Open the camera so the user can scan/photograph their ingredients to generate a recipe. Call when user wants to scan, photograph, or take a picture of ingredients.",
                            parameters: { type: "object", properties: {} }
                        },
                        {
                            type: "function",
                            name: "generate_recipe_now",
                            description: "Switch to the recipe section and trigger recipe generation. Call when user explicitly wants to generate a recipe now.",
                            parameters: { type: "object", properties: {} }
                        }
                    ],
                    tool_choice: "auto"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("OpenAI Realtime session error:", errText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: "Failed to create realtime session", details: errText })
            };
        }

        const data = await response.json();
        return { statusCode: 200, headers, body: JSON.stringify(data) };

    } catch (error) {
        console.error("realtime-token error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
