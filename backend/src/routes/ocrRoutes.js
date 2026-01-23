const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const authenticateUser = require('../middleware/auth');
const { analyzeReceipt } = require('../services/ocrService');

router.post('/analyze', authenticateUser, upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        console.log('Received OCR Request');
        console.log('Raw Categories Body:', req.body.categories);

        // Parse categories if present
        let categories = [];
        if (req.body.categories) {
            try {
                categories = JSON.parse(req.body.categories);
            } catch (e) {
                console.warn('Failed to parse categories:', e);
            }
        }

        // Process with Gemini
        const data = await analyzeReceipt(req.file.buffer, req.file.mimetype, categories);

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('OCR Route Error:', error);
        res.status(500).json({ error: error.message || 'Error processing receipt' });
    }
});

module.exports = router;
