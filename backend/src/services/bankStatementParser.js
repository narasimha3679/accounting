const { parse } = require('csv-parse/sync');
const pdfParse = require('pdf-parse');
const { ofx } = require('ofx');
const model = require('../config/gemini');

/**
 * Parse bank statement from various formats
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} originalName - Original filename
 * @returns {Promise<Array>} Array of parsed transactions
 */
const parseBankStatement = async (fileBuffer, mimeType, originalName) => {
    const extension = originalName.split('.').pop()?.toLowerCase();

    if (mimeType === 'text/csv' || extension === 'csv') {
        return parseCSV(fileBuffer);
    } else if (mimeType === 'application/pdf' || extension === 'pdf') {
        return parsePDF(fileBuffer);
    } else if (extension === 'ofx' || extension === 'qfx') {
        return parseOFX(fileBuffer);
    } else {
        throw new Error(`Unsupported file format: ${mimeType || extension}`);
    }
};

/**
 * Parse CSV bank statement
 * Supports common Canadian bank formats
 */
const parseCSV = async (fileBuffer) => {
    const text = fileBuffer.toString('utf-8');
    
    try {
        const records = parse(text, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        });

        const transactions = [];

        for (const record of records) {
            // Try to identify common CSV formats
            const transaction = parseCSVRow(record);
            if (transaction) {
                transactions.push(transaction);
            }
        }

        return transactions;
    } catch (error) {
        throw new Error(`Failed to parse CSV: ${error.message}`);
    }
};

/**
 * Parse a single CSV row - handles multiple bank formats
 */
const parseCSVRow = (row) => {
    // Common field name variations
    const dateField = findField(row, ['date', 'transaction date', 'transaction_date', 'posting date', 'posting_date']);
    const descriptionField = findField(row, ['description', 'transaction description', 'transaction_description', 'details', 'memo', 'merchant', 'payee']);
    const amountField = findField(row, ['amount', 'transaction amount', 'transaction_amount', 'debit', 'credit', 'withdrawal', 'deposit']);
    const balanceField = findField(row, ['balance', 'account balance', 'account_balance']);

    if (!dateField || !amountField) {
        return null; // Skip rows without essential fields
    }

    const dateStr = row[dateField];
    const amountStr = row[amountField];
    const description = row[descriptionField] || '';

    // Parse date - handle multiple formats
    const date = parseDate(dateStr);
    if (!date) {
        return null;
    }

    // Parse amount - handle negative/positive, debit/credit
    const amount = parseAmount(amountStr, row);
    if (amount === null || amount === 0) {
        return null;
    }

    // Only include expenses (negative amounts or debits)
    // Positive amounts are typically deposits/income
    if (amount > 0) {
        return null; // Skip deposits/income
    }

    // Convert to positive for expense amount
    const expenseAmount = Math.abs(amount);

    return {
        date: date,
        description: cleanDescription(description),
        amount: expenseAmount,
        original_amount: amount, // Keep original for reference
        transaction_type: amount < 0 ? 'debit' : 'credit',
    };
};

/**
 * Find field name with case-insensitive matching
 */
const findField = (row, possibleNames) => {
    const keys = Object.keys(row);
    for (const name of possibleNames) {
        const found = keys.find(key => key.toLowerCase() === name.toLowerCase());
        if (found) return found;
    }
    return null;
};

/**
 * Parse date from various formats
 */
const parseDate = (dateStr) => {
    if (!dateStr) return null;

    // Common formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YYYY
    const formats = [
        /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
        /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
    ];

    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            let year, month, day;
            
            if (match[1].length === 4) {
                // YYYY-MM-DD format
                year = parseInt(match[1]);
                month = parseInt(match[2]);
                day = parseInt(match[3]);
            } else {
                // MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY for Canadian banks
                month = parseInt(match[1]);
                day = parseInt(match[2]);
                year = parseInt(match[3]);
            }

            // Validate date
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
        }
    }

    // Try native Date parsing as fallback
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }

    return null;
};

/**
 * Parse amount from various formats
 */
const parseAmount = (amountStr, row) => {
    if (!amountStr) {
        // Try to determine from debit/credit columns
        const debit = parseFloat(row['debit'] || row['withdrawal'] || '0');
        const credit = parseFloat(row['credit'] || row['deposit'] || '0');
        
        if (debit > 0) return -debit; // Negative for expenses
        if (credit > 0) return credit; // Positive for income
        return null;
    }

    // Remove currency symbols and commas
    const cleaned = amountStr.toString().replace(/[$,CAD\s]/g, '');
    const amount = parseFloat(cleaned);

    if (isNaN(amount)) {
        return null;
    }

    // If amount is positive but we have a debit indicator, make it negative
    if (amount > 0 && (row['debit'] || row['withdrawal'])) {
        return -amount;
    }

    return amount;
};

/**
 * Clean and normalize description
 */
const cleanDescription = (description) => {
    if (!description) return 'Unnamed Transaction';
    
    // Remove extra whitespace
    let cleaned = description.trim().replace(/\s+/g, ' ');
    
    // Remove common prefixes/suffixes
    cleaned = cleaned.replace(/^(DEBIT|CREDIT|ACH|EFT|POS|ATM)\s*/i, '');
    cleaned = cleaned.replace(/\s*(REF|REF#|REFERENCE).*$/i, '');
    
    return cleaned || 'Unnamed Transaction';
};

/**
 * Parse PDF bank statement
 */
const parsePDF = async (fileBuffer) => {
    try {
        const data = await pdfParse(fileBuffer);
        const text = data.text || '';

        console.log(`PDF text extracted: ${text.length} characters`);

        // If PDF has very little text, it might be a scanned/image PDF
        if (text.length < 100) {
            console.warn('PDF appears to be image-based (scanned). Text extraction may not work.');
            return [{
                date: new Date().toISOString().split('T')[0],
                description: 'PDF Statement - Scanned/Image PDF detected. Please use CSV or OFX format, or ensure PDF contains selectable text.',
                amount: 0,
                raw_text: text,
                needs_ai_processing: false,
                is_scanned: true,
            }];
        }

        // Extract transactions from PDF text
        // This is a simplified parser - may need enhancement for specific bank formats
        const transactions = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Look for transaction patterns
        // Common pattern: Date Description Amount
        const transactionPattern = /^(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(.+?)\s+([$]?\d+[.,]\d{2})$/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(transactionPattern);
            
            if (match) {
                const date = parseDate(match[1]);
                const description = cleanDescription(match[2]);
                const amountStr = match[3];
                const amount = parseAmount(amountStr, {});

                if (date && amount !== null && amount < 0) {
                    transactions.push({
                        date: date,
                        description: description,
                        amount: Math.abs(amount),
                        original_amount: amount,
                        transaction_type: 'debit',
                    });
                }
            }
        }

        // If no transactions found with pattern matching, try AI-based extraction
        if (transactions.length === 0 && text.length > 100) {
            console.log('No transactions found via regex, attempting AI extraction...');
            // Use AI to extract transactions from PDF text
            try {
                const aiTransactions = await extractTransactionsFromPDFText(text);
                if (aiTransactions && aiTransactions.length > 0) {
                    console.log(`AI extraction found ${aiTransactions.length} transactions`);
                    return aiTransactions;
                } else {
                    console.warn('AI extraction returned no transactions');
                }
            } catch (aiError) {
                console.error('AI extraction failed:', aiError.message);
            }
        }

        // Final fallback if AI also fails
        if (transactions.length === 0) {
            console.warn('Could not extract transactions from PDF. Text length:', text.length);
            return [{
                date: new Date().toISOString().split('T')[0],
                description: 'PDF Statement - Could not extract transactions. The PDF may be image-based or in an unsupported format. Try CSV or OFX format instead.',
                amount: 0,
                raw_text: text.substring(0, 500), // Include first 500 chars for debugging
                needs_ai_processing: false,
            }];
        }

        return transactions;
    } catch (error) {
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
};

/**
 * Parse OFX/QFX file (Quicken/QuickBooks format)
 */
const parseOFX = async (fileBuffer) => {
    try {
        const text = fileBuffer.toString('utf-8');
        const ofxData = ofx.parse(text);

        const transactions = [];

        // OFX structure: OFX -> BANKMSGSRSV1 -> STMTTRNRS -> STMTRS -> BANKTRANLIST -> STMTTRN
        const bankTransactions = ofxData?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN || [];

        for (const trn of bankTransactions) {
            const amount = parseFloat(trn.TRNAMT || '0');
            
            // Only include expenses (negative amounts)
            if (amount >= 0) {
                continue;
            }

            const date = trn.DTPOSTED ? parseOFXDate(trn.DTPOSTED) : null;
            const description = cleanDescription(trn.NAME || trn.MEMO || '');

            if (date && amount < 0) {
                transactions.push({
                    date: date,
                    description: description,
                    amount: Math.abs(amount),
                    original_amount: amount,
                    transaction_type: 'debit',
                });
            }
        }

        return transactions;
    } catch (error) {
        throw new Error(`Failed to parse OFX/QFX: ${error.message}`);
    }
};

/**
 * Extract transactions from PDF text using AI
 */
const extractTransactionsFromPDFText = async (text) => {
    try {
        // Limit text length to avoid token limits (keep first 10000 characters)
        const limitedText = text.substring(0, 10000);
        
        const prompt = `
You are analyzing a bank statement PDF that has been converted to text. Extract all expense transactions (debits/withdrawals) from this text.

INSTRUCTIONS:
1. Find all transactions that are expenses (debits, withdrawals, payments)
2. Ignore deposits, credits, transfers, and balance information
3. Extract: date, description/merchant, and amount for each transaction
4. Amounts should be positive numbers (we'll handle debits as expenses)
5. Dates should be in YYYY-MM-DD format

Return a JSON array of transactions. Each transaction should have:
- date: string (YYYY-MM-DD format)
- description: string (merchant name or transaction description)
- amount: number (positive amount, as a number not string)

PDF TEXT:
${limitedText}

Return ONLY valid JSON array, no markdown, no explanations. Example format:
[
  {"date": "2026-01-15", "description": "STARBUCKS #1234", "amount": 5.50},
  {"date": "2026-01-16", "description": "AMAZON PURCHASE", "amount": 29.99}
]
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();

        // Clean up potential markdown formatting
        const cleanedText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();

        let transactions;
        try {
            transactions = JSON.parse(cleanedText);
        } catch (parseError) {
            // Try to extract JSON from text if wrapped in other content
            const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                transactions = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        // Ensure we have an array
        if (!Array.isArray(transactions)) {
            transactions = [transactions];
        }

        // Convert to our transaction format
        return transactions.map(t => ({
            date: t.date || new Date().toISOString().split('T')[0],
            description: cleanDescription(t.description || 'Unnamed Transaction'),
            amount: parseFloat(t.amount) || 0,
            original_amount: -(parseFloat(t.amount) || 0), // Negative for expenses
            transaction_type: 'debit',
        })).filter(t => t.amount > 0); // Only include transactions with valid amounts

    } catch (error) {
        console.error('AI PDF extraction error:', error);
        return [];
    }
};

/**
 * Parse OFX date format (YYYYMMDDHHMMSS or YYYYMMDD)
 */
const parseOFXDate = (dateStr) => {
    if (!dateStr) return null;

    // OFX format: YYYYMMDDHHMMSS or YYYYMMDD
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})/);
    if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }

    return null;
};

module.exports = {
    parseBankStatement,
    parseCSV,
    parsePDF,
    parseOFX,
};
