const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const ExpressBrute = require('express-brute');
const ExpressBruteStore = require('express-brute-redis');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            message: message || 'Too many requests, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: message || 'Too many requests, please try again later.'
            });
        }
    });
};

// General rate limiting
const generalLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'Too many requests from this IP, please try again later.'
);

// Auth rate limiting (more restrictive)
const authLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per window
    'Too many authentication attempts, please try again later.'
);

// Upload rate limiting
const uploadLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    10, // 10 uploads per hour
    'Upload limit exceeded, please try again later.'
);

// Password reset rate limiting
const passwordResetLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts per hour
    'Too many password reset attempts, please try again later.'
);

// Brute force protection for login
const bruteForceStore = new ExpressBrute.MemoryStore();
const bruteForce = new ExpressBrute(bruteForceStore, {
    freeRetries: 3,
    minWait: 5 * 60 * 1000, // 5 minutes
    maxWait: 15 * 60 * 1000, // 15 minutes
    lifetime: 24 * 60 * 60, // 24 hours
    refreshTimeoutOnRequest: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    handleStoreError: (error) => {
        console.error('Brute force store error:', error);
    }
});

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'https://yourdomain.com' // Add your production domain
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security headers configuration
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize request body
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key]);
            }
        }
    }

    // Sanitize query parameters
    if (req.query) {
        for (let key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = xss(req.query[key]);
            }
        }
    }

    // Sanitize URL parameters
    if (req.params) {
        for (let key in req.params) {
            if (typeof req.params[key] === 'string') {
                req.params[key] = xss(req.params[key]);
            }
        }
    }

    next();
};

// File upload security middleware
const validateFileUpload = (req, res, next) => {
    if (!req.file && !req.files) {
        return next();
    }

    const file = req.file || req.files[0];
    const allowedMimeTypes = [
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-flv',
        'video/x-matroska'
    ];

    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 104857600; // 100MB

    if (file.size > maxFileSize) {
        return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum limit of 100MB'
        });
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid file type. Only video files are allowed.'
        });
    }

    // Check for malicious file extensions
    const maliciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (maliciousExtensions.includes(fileExtension)) {
        return res.status(400).json({
            success: false,
            message: 'File type not allowed for security reasons'
        });
    }

    next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    });

    next();
};

module.exports = {
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
};
