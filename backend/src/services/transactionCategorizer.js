const model = require('../config/gemini');

/**
 * Categorize a batch of transactions using AI
 * @param {Array} transactions - Array of transaction objects with date, description, amount
 * @param {Array} categories - Array of available expense categories
 * @returns {Promise<Array>} Transactions with added category, hst_paid, and suggested_description
 */
const categorizeTransactions = async (transactions, categories = []) => {
    if (!transactions || transactions.length === 0) {
        return [];
    }

    // Prepare category list for AI
    const categoryNames = categories.map(c => c.name || c).join(', ');

    try {
        // Process in batches to avoid token limits (max 50 transactions per batch)
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < transactions.length; i += batchSize) {
            batches.push(transactions.slice(i, i + batchSize));
        }

        const categorizedTransactions = [];

        for (const batch of batches) {
            const batchResults = await categorizeBatch(batch, categoryNames, categories);
            categorizedTransactions.push(...batchResults);
        }

        return categorizedTransactions;
    } catch (error) {
        console.error('Transaction categorization error:', error);
        // Return transactions with default values if categorization fails
        return transactions.map(t => ({
            ...t,
            category: null,
            category_id: null,
            hst_paid: 0,
            suggested_description: t.description,
            deduction_percentage: 1.0,
        }));
    }
};

/**
 * Categorize a single batch of transactions
 */
const categorizeBatch = async (transactions, categoryNames, categories) => {
    const prompt = `
You are a financial assistant helping to categorize business expenses for a Canadian corporation.

AVAILABLE CATEGORIES:
${categoryNames || 'No categories provided'}

INSTRUCTIONS:
1. Analyze each transaction and assign it to the BEST MATCHING category from the list above
2. If no category matches well, use "Uncategorized"
3. For Canadian expenses, calculate HST (13% Harmonized Sales Tax) when applicable
4. Suggest a clear, descriptive name for the expense
5. Determine if the expense is fully deductible (100%) or partially deductible (50% for meals/entertainment)

CANADIAN TAX RULES:
- Most business expenses: 100% deductible, HST applies (13%)
- Meals & Entertainment: 50% deductible, HST applies (13%)
- Some expenses may be HST-exempt (e.g., certain services, financial services)
- If unsure about HST, default to including it (13% of amount)

TRANSACTIONS TO CATEGORIZE:
${JSON.stringify(transactions, null, 2)}

Return a JSON array where each object has:
- category: string (exact match from AVAILABLE CATEGORIES)
- category_id: number (if you can match to a category ID, otherwise null)
- hst_paid: number (13% of amount if HST applies, 0 if exempt)
- suggested_description: string (improved description)
- deduction_percentage: number (1.0 for 100%, 0.5 for 50%, etc.)

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no explanations.
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let categorized;
        try {
            categorized = JSON.parse(cleanedText);
        } catch (parseError) {
            // Try to extract JSON from text if wrapped in other content
            const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                categorized = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        // Ensure we have an array
        if (!Array.isArray(categorized)) {
            categorized = [categorized];
        }

        // Merge AI results with original transactions
        return transactions.map((transaction, index) => {
            const aiResult = categorized[index] || {};
            
            // Find category ID if category name is provided
            let category_id = null;
            if (aiResult.category && categories.length > 0) {
                const matchedCategory = categories.find(
                    c => (c.name || c).toLowerCase() === aiResult.category.toLowerCase()
                );
                if (matchedCategory) {
                    category_id = matchedCategory.id || matchedCategory.category_id;
                }
            }

            // Calculate HST if not provided (13% of amount)
            let hst_paid = aiResult.hst_paid;
            if (hst_paid === undefined || hst_paid === null) {
                // Default to including HST for most business expenses
                // Meals/entertainment still get HST, just 50% deduction
                hst_paid = parseFloat((transaction.amount * 0.13).toFixed(2));
            }

            // Default deduction percentage
            const deduction_percentage = aiResult.deduction_percentage !== undefined 
                ? parseFloat(aiResult.deduction_percentage) 
                : 1.0;

            return {
                ...transaction,
                category: aiResult.category || null,
                category_id: category_id,
                hst_paid: hst_paid,
                suggested_description: aiResult.suggested_description || transaction.description,
                deduction_percentage: deduction_percentage,
            };
        });
    } catch (error) {
        console.error('Batch categorization error:', error);
        // Return transactions with defaults
        return transactions.map(t => ({
            ...t,
            category: null,
            category_id: null,
            hst_paid: parseFloat((t.amount * 0.13).toFixed(2)),
            suggested_description: t.description,
            deduction_percentage: 1.0,
        }));
    }
};

/**
 * Check for potential duplicate transactions
 * @param {Array} newTransactions - New transactions to check
 * @param {Array} existingTransactions - Existing transactions to compare against
 * @returns {Array} Transactions with duplicate flags
 */
const detectDuplicates = (newTransactions, existingTransactions = []) => {
    if (!existingTransactions || existingTransactions.length === 0) {
        return newTransactions.map(t => ({ ...t, is_duplicate: false }));
    }

    return newTransactions.map(transaction => {
        // Check for duplicates based on amount and date (within 3 days)
        const isDuplicate = existingTransactions.some(existing => {
            const amountMatch = Math.abs(existing.amount - transaction.amount) < 0.01;
            const dateMatch = datesWithinRange(existing.expense_date || existing.date, transaction.date, 3);
            const descriptionSimilar = areDescriptionsSimilar(
                existing.description,
                transaction.description || transaction.suggested_description
            );

            return amountMatch && dateMatch && descriptionSimilar;
        });

        return {
            ...transaction,
            is_duplicate: isDuplicate,
        };
    });
};

/**
 * Check if two dates are within a specified number of days
 */
const datesWithinRange = (date1, date2, days = 3) => {
    if (!date1 || !date2) return false;
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d1 - d2);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays <= days;
};

/**
 * Check if two descriptions are similar (basic string similarity)
 */
const areDescriptionsSimilar = (desc1, desc2) => {
    if (!desc1 || !desc2) return false;
    
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(desc1);
    const norm2 = normalize(desc2);
    
    // Check if one contains the other (for partial matches)
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        return true;
    }
    
    // Simple Levenshtein-like check (if strings are very similar)
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    
    if (longer.length === 0) return true;
    
    // If shorter string is 80% similar to longer string
    const similarity = (longer.length - editDistance(longer, shorter)) / longer.length;
    return similarity > 0.8;
};

/**
 * Simple edit distance calculation
 */
const editDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
};

module.exports = {
    categorizeTransactions,
    detectDuplicates,
};
