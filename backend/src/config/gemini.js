const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GOOGLE_API_KEY) {
    console.error("Missing Google API Key in .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// Use Gemini 2.5 Flash-Lite as it is listed in available models and has a free tier
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

module.exports = model;
