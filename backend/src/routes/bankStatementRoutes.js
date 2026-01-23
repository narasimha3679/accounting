const express = require('express');
const router = express.Router();
const { bankStatementUpload } = require('../middleware/upload');
const authenticateUser = require('../middleware/auth');
const { parseBankStatement } = require('../services/bankStatementParser');
const { categorizeTransactions, detectDuplicates } = require('../services/transactionCategorizer');

/**
 * Upload and parse bank statement
 * POST /api/bank-statements/upload
 */
router.post('/upload', authenticateUser, bankStatementUpload.single('statement'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No statement file uploaded' });
        }

        console.log('Received bank statement upload:', req.file.originalname);

        // Parse the statement
        const transactions = await parseBankStatement(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        if (!transactions || transactions.length === 0) {
            return res.status(400).json({ 
                error: 'No transactions found in statement. Please check the file format.' 
            });
        }

        // Return parsed transactions (categorization can be done separately or here)
        res.json({
            success: true,
            data: {
                transactions: transactions,
                count: transactions.length,
            }
        });
    } catch (error) {
        console.error('Bank statement upload error:', error);
        res.status(500).json({ 
            error: error.message || 'Error processing bank statement',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Categorize transactions using AI
 * POST /api/bank-statements/categorize
 */
router.post('/categorize', authenticateUser, async (req, res) => {
    try {
        const { transactions, categories } = req.body;

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'No transactions provided' });
        }

        console.log(`Categorizing ${transactions.length} transactions`);

        // Categorize transactions
        const categorized = await categorizeTransactions(transactions, categories || []);

        res.json({
            success: true,
            data: {
                transactions: categorized,
                count: categorized.length,
            }
        });
    } catch (error) {
        console.error('Transaction categorization error:', error);
        res.status(500).json({ 
            error: error.message || 'Error categorizing transactions',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Upload, parse, and categorize in one step
 * POST /api/bank-statements/process
 */
router.post('/process', authenticateUser, bankStatementUpload.single('statement'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No statement file uploaded' });
        }

        console.log('Processing bank statement:', req.file.originalname);

        // Parse the statement
        const transactions = await parseBankStatement(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        if (!transactions || transactions.length === 0) {
            return res.status(400).json({ 
                error: 'No transactions found in statement. Please check the file format.' 
            });
        }

        // Parse categories if provided
        let categories = [];
        if (req.body.categories) {
            try {
                categories = JSON.parse(req.body.categories);
            } catch (e) {
                console.warn('Failed to parse categories:', e);
            }
        }

        // Categorize transactions
        let categorized = transactions;
        if (categories.length > 0) {
            categorized = await categorizeTransactions(transactions, categories);
        }

        // Check for duplicates if existing transactions are provided
        let withDuplicates = categorized;
        if (req.body.existing_transactions) {
            try {
                const existing = JSON.parse(req.body.existing_transactions);
                withDuplicates = detectDuplicates(categorized, existing);
            } catch (e) {
                console.warn('Failed to parse existing transactions for duplicate check:', e);
            }
        }

        res.json({
            success: true,
            data: {
                transactions: withDuplicates,
                count: withDuplicates.length,
                duplicates_found: withDuplicates.filter(t => t.is_duplicate).length,
            }
        });
    } catch (error) {
        console.error('Bank statement processing error:', error);
        res.status(500).json({ 
            error: error.message || 'Error processing bank statement',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;
