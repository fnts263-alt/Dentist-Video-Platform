require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const https = require('https');
const compression = require('compression');
const morgan = require('morgan');
const winston = require('winston');

// Import middleware
const {
    generalLimiter,
    authLimiter,
    uploadLimiter,
    passwordResetLimiter,
    bruteForce,
    corsOptions,
    securityHeaders,
    sanitizeInput,
    validateFileUpload,
    requestLogger,
    mongoSanitize,
    hpp
} = require('./middleware/security');

// Import database
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Configure logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'dentist-video-platform' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Security middleware
app.use(securityHeaders);
app.use(compression());
app.use(require('cors')(corsOptions));
app.use(mongoSanitize());
app.use(hpp());
app.use(sanitizeInput);
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'super_session_secret_for_dentist_platform_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files with security headers
app.use('/uploads', (req, res, next) => {
    // Set security headers for uploaded files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    
    // Prevent direct access to video files without authentication
    if (req.path.includes('.mp4') || req.path.includes('.avi') || req.path.includes('.mov')) {
        return res.status(403).json({
            success: false,
            message: 'Direct access to video files is not allowed'
        });
    }
    
    next();
}, express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve main application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        success: false,
        message: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    db.close();
    process.exit(0);
});

// Start server
function startServer() {
    if (process.env.NODE_ENV === 'production' && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
        // HTTPS server for production
        const options = {
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH)
        };
        
        https.createServer(options, app).listen(PORT, HOST, () => {
            logger.info(`HTTPS Server running on https://${HOST}:${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
        });
    } else {
        // HTTP server for development
        app.listen(PORT, HOST, () => {
            logger.info(`HTTP Server running on http://${HOST}:${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info('Database connected successfully');
        });
    }
}

// Initialize and start server
async function initialize() {
    try {
        // Wait for database initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        logger.info('Initializing Dentist Video Platform...');
        logger.info('Database schema initialized');
        logger.info('Security middleware configured');
        logger.info('Routes configured');
        
        startServer();
    } catch (error) {
        logger.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

// Start the application
initialize();

module.exports = app;
