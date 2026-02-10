const multer = require('multer');

// Store files in memory buffer
const storage = multer.memoryStorage();

// Upload middleware for receipt images (OCR)
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();

        const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (isValidMimeType && isValidExtension) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (.jpg, .jpeg, .png, .gif, .webp) are allowed!'), false);
        }
    },
});

// Upload middleware for bank statements (PDF, CSV, OFX, QFX)
const bankStatementUpload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for statements
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'text/csv',
            'application/pdf',
            'application/x-ofx',
            'application/vnd.intu.qfx',
            'application/octet-stream', // Some banks use this for OFX/QFX
        ];
        
        const allowedExtensions = ['.csv', '.pdf', '.ofx', '.qfx'];
        const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();

        // Check both MIME type AND file extension for security
        const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (isValidMimeType && isValidExtension) {
            cb(null, true);
        } else {
            cb(new Error(`Only CSV, PDF, OFX, or QFX files are allowed! Both MIME type and extension must be valid. Received: ${file.mimetype} (${fileExtension})`), false);
        }
    },
});

module.exports = upload;
module.exports.bankStatementUpload = bankStatementUpload;
