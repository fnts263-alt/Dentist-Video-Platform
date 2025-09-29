const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const emailService = require('../utils/email');
const { authLimiter, passwordResetLimiter, bruteForce } = require('../middleware/security');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', authLimiter, [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
    body('role').isIn(['senior_dentist', 'junior_dentist']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password, firstName, lastName, role } = req.body;

        // Check if user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate verification token
        const verificationToken = emailService.generateVerificationToken();

        // Insert new user
        const result = await db.run(
            `INSERT INTO users (email, password, first_name, last_name, role, verification_token) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, firstName, lastName, role, verificationToken]
        );

        const newUser = await db.get('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?', [result.id]);

        // Send verification email
        await emailService.sendVerificationEmail(newUser, verificationToken);

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (action, details, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            ['user_registered', `New user registered: ${email}`, req.ip, req.get('User-Agent')]
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for verification.',
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Login user
router.post('/login', authLimiter, bruteForce.prevent, [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user
        const user = await db.get(
            'SELECT id, email, password, first_name, last_name, role, is_verified, is_active FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await db.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'super_secret_jwt_key_for_dentist_platform_2024',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Set session
        req.session.userId = user.id;
        req.session.userRole = user.role;

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [user.id, 'user_login', req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isVerified: user.is_verified
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout user
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [req.user.id, 'user_logout', req.ip, req.get('User-Agent')]
        );

        // Clear session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
        });

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Verify email
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        // Find user with verification token
        const user = await db.get(
            'SELECT id, email, first_name, last_name, role FROM users WHERE verification_token = ? AND is_verified = 0',
            [token]
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        // Update user as verified
        await db.run(
            'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
            [user.id]
        );

        // Send welcome email
        await emailService.sendWelcomeEmail(user);

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [user.id, 'email_verified', req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Request password reset
router.post('/forgot-password', passwordResetLimiter, [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email } = req.body;

        // Find user
        const user = await db.get('SELECT id, email, first_name, last_name FROM users WHERE email = ?', [email]);
        
        if (!user) {
            // Don't reveal if user exists or not
            return res.json({
                success: true,
                message: 'If the email exists, a password reset link has been sent'
            });
        }

        // Generate reset token
        const resetToken = emailService.generateResetToken();
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Update user with reset token
        await db.run(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, resetExpires, user.id]
        );

        // Send reset email
        await emailService.sendPasswordResetEmail(user, resetToken);

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [user.id, 'password_reset_requested', req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Reset password
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { token, password } = req.body;

        // Find user with valid reset token
        const user = await db.get(
            'SELECT id, email FROM users WHERE reset_token = ? AND reset_token_expires > ?',
            [token, new Date()]
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password and clear reset token
        await db.run(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [user.id, 'password_reset_completed', req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, email, first_name, last_name, role, is_verified, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isVerified: user.is_verified,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('firstName').optional().trim().isLength({ min: 2 }),
    body('lastName').optional().trim().isLength({ min: 2 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { firstName, lastName } = req.body;
        const updates = [];
        const values = [];

        if (firstName) {
            updates.push('first_name = ?');
            values.push(firstName);
        }

        if (lastName) {
            updates.push('last_name = ?');
            values.push(lastName);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        values.push(req.user.id);

        await db.run(
            `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'profile_updated', 'User updated profile information', req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
