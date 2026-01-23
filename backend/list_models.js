require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GOOGLE_API_KEY) {
    console.error("Missing Google API Key in .env file");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // The SDK doesn't expose listModels directly on the instance clearly in all versions, 
        // but usually it's accessible or we can just try to use a known working one.
        // Actually, checking documentation, we might need to use the API directly or a specific method if exposed.
        // For the Node SDK, it's often not straightforward to list models without using the REST API directly or specific admin tools.

        // Instead, let's just try to generate content with a fallback chain or just print the error details better.
        // But wait, the error message literally said: "Call ListModels to see the list of available models".
        // This implies there is a way.

        // Let's try to hit the REST API directly to list models to be sure.
        const apiKey = process.env.GOOGLE_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Could not list models:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
