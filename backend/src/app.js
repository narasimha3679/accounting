const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ocrRoutes = require('./routes/ocrRoutes');
const bankStatementRoutes = require('./routes/bankStatementRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const emailRoutes = require('./routes/emailRoutes');
const pushNotificationRoutes = require('./routes/pushNotificationRoutes');
const companyMemberRoutes = require('./routes/companyMemberRoutes');

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Adjust for production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/ocr', ocrRoutes);
app.use('/api/bank-statements', bankStatementRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/push-notifications', pushNotificationRoutes);
app.use('/api/company-members', companyMemberRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

module.exports = app;
