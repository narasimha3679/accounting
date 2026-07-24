const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const employeeRoutes = require('./routes/employeeRoutes');
const pushNotificationRoutes = require('./routes/pushNotificationRoutes');
const companyMemberRoutes = require('./routes/companyMemberRoutes');
const payMyselfRoutes = require('./routes/payMyselfRoutes');
const compensationStrategyRoutes = require('./routes/compensationStrategyRoutes');

const app = express();

// Security Middleware — allow cross-origin API responses to the frontend
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
// FRONTEND_URL may be a single URL (also used for invite emails) or comma-separated origins.
const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://cashual.org',
    'https://www.cashual.org',
    'http://cashual.org',
    'http://www.cashual.org',
];

const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim()).filter(Boolean)
    : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Reject without throwing — a thrown Error becomes a 500 with no CORS headers
            callback(null, false);
        }
    },
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
app.use('/api/employees', employeeRoutes);
app.use('/api/push-notifications', pushNotificationRoutes);
app.use('/api/company-members', companyMemberRoutes);
app.use('/api/pay-myself', payMyselfRoutes);
app.use('/api/compensation-strategy', compensationStrategyRoutes);


// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'backend' });
});

module.exports = app;
