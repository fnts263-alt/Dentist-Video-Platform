const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_dentist_platform_2024');
        
        // Get user from database
        const user = await db.get(
            'SELECT id, email, first_name, last_name, role, is_active, is_verified FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token - user not found' 
            });
        }

        if (!user.is_active) {
            return res.status(401).json({ 
                success: false, 
                message: 'Account is deactivated' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        }
        
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Middleware to check if user is verified
const requireVerification = (req, res, next) => {
    if (!req.user.is_verified) {
        return res.status(403).json({ 
            success: false, 
            message: 'Email verification required' 
        });
    }
    next();
};

// Middleware to check user roles
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Insufficient permissions' 
            });
        }

        next();
    };
};

// Middleware to check if user is admin
const requireAdmin = requireRole('admin');

// Middleware to check if user is dentist (senior or junior)
const requireDentist = requireRole(['senior_dentist', 'junior_dentist']);

// Middleware to check if user is senior dentist or admin
const requireSeniorOrAdmin = requireRole(['senior_dentist', 'admin']);

// Middleware for optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_dentist_platform_2024');
        
        const user = await db.get(
            'SELECT id, email, first_name, last_name, role, is_active, is_verified FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (user && user.is_active) {
            req.user = user;
        } else {
            req.user = null;
        }
    } catch (error) {
        req.user = null;
    }

    next();
};

// Session-based authentication middleware
const requireSession = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
            success: false, 
            message: 'Session required' 
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireVerification,
    requireRole,
    requireAdmin,
    requireDentist,
    requireSeniorOrAdmin,
    optionalAuth,
    requireSession
};
