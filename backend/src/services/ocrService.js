const model = require('../config/gemini');

const analyzeReceipt = async (imageBuffer, mimeType, categories = []) => {
    console.log('Analyzing receipt with categories:', categories);
    try {
        const prompt = `
      Analyze this image of a receipt or invoice. 
      
      I will provide a list of ALLOWED CATEGORIES. You must categorize this receipt into exactly ONE of them.
      
      ALLOWED CATEGORIES:
      ${JSON.stringify(categories)}
      
      INSTRUCTIONS:
      1. Identify the items purchased.
      2. Select the best matching category from the ALLOWED CATEGORIES list above.
      3. If the items are food/drink, use "Meals & Entertainment".
      4. If the items are office supplies, use "Office Supplies".
      5. If the item is a vehicle expense, use "Vehicle & Automobile".
      6. If NO category matches, use "Uncategorized".
      7. STRICTLY output "Fast Food", "Restaurant", etc. ONLY if they are in the ALLOWED CATEGORIES list. Otherwise, map them to "Meals & Entertainment".
      
      Return a JSON object with these fields:
      - merchant: string (The store or vendor name)
      - total_amount: number (float)
      - tax_amount: number (float)
      - date: string (YYYY-MM-DD)
      - category: string (EXACT MATCH from ALLOWED CATEGORIES)
      - suggested_description: string (e.g. "Team Lunch at Burger King")
      - items: array of objects { description, price }
    `;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: mimeType,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting (```json ... ```)
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Gemini OCR Error:", error);
        throw new Error('Failed to process image with AI');
    }
};

module.exports = { analyzeReceipt };
