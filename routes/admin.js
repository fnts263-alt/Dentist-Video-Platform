const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const emailService = require('../utils/email');
const videoProcessor = require('../utils/videoProcessor');
const { authenticateToken, requireVerification, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Dashboard statistics
router.get('/dashboard', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        // Get user statistics
        const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
        const verifiedUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_verified = 1');
        const activeUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
        const usersByRole = await db.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role 
            ORDER BY count DESC
        `);

        // Get video statistics
        const totalVideos = await db.get('SELECT COUNT(*) as count FROM videos WHERE is_active = 1');
        const totalViews = await db.get('SELECT COUNT(*) as count FROM video_views');
        const videosByCategory = await db.query(`
            SELECT category, COUNT(*) as count 
            FROM videos 
            WHERE is_active = 1 AND category IS NOT NULL
            GROUP BY category 
            ORDER BY count DESC
            LIMIT 10
        `);

        // Get recent activity
        const recentActivity = await db.query(`
            SELECT al.action, al.resource_type, al.resource_id, al.details, al.created_at,
                   u.first_name, u.last_name, u.email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 20
        `);

        // Get recent user registrations
        const recentRegistrations = await db.query(`
            SELECT first_name, last_name, email, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // Get recent video uploads
        const recentVideos = await db.query(`
            SELECT v.title, v.category, v.created_at, u.first_name, u.last_name
            FROM videos v
            JOIN users u ON v.uploaded_by = u.id
            WHERE v.is_active = 1
            ORDER BY v.created_at DESC
            LIMIT 10
        `);

        // Get storage usage
        const storageStats = await db.get(`
            SELECT 
                COUNT(*) as total_videos,
                SUM(file_size) as total_size,
                AVG(file_size) as avg_size
            FROM videos 
            WHERE is_active = 1
        `);

        res.json({
            success: true,
            dashboard: {
                users: {
                    total: totalUsers.count,
                    verified: verifiedUsers.count,
                    active: activeUsers.count,
                    byRole: usersByRole
                },
                videos: {
                    total: totalVideos.count,
                    totalViews: totalViews.count,
                    byCategory: videosByCategory
                },
                storage: {
                    totalVideos: storageStats.total_videos,
                    totalSize: storageStats.total_size || 0,
                    averageSize: Math.round(storageStats.avg_size || 0)
                },
                recentActivity: recentActivity.map(activity => ({
                    action: activity.action,
                    resourceType: activity.resource_type,
                    resourceId: activity.resource_id,
                    details: activity.details,
                    timestamp: activity.created_at,
                    user: activity.first_name && activity.last_name ? 
                        `${activity.first_name} ${activity.last_name}` : 
                        'System'
                })),
                recentRegistrations: recentRegistrations.map(user => ({
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                    role: user.role,
                    registeredAt: user.created_at
                })),
                recentVideos: recentVideos.map(video => ({
                    title: video.title,
                    category: video.category,
                    uploadedBy: `${video.first_name} ${video.last_name}`,
                    uploadedAt: video.created_at
                }))
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all users with pagination
router.get('/users', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const role = req.query.role;
        const status = req.query.status; // active, inactive, verified, unverified
        const offset = (page - 1) * limit;

        let whereConditions = ['1=1'];
        let queryParams = [];

        if (search) {
            whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (role) {
            whereConditions.push('role = ?');
            queryParams.push(role);
        }

        if (status === 'active') {
            whereConditions.push('is_active = 1');
        } else if (status === 'inactive') {
            whereConditions.push('is_active = 0');
        } else if (status === 'verified') {
            whereConditions.push('is_verified = 1');
        } else if (status === 'unverified') {
            whereConditions.push('is_verified = 0');
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
        const countResult = await db.get(countQuery, queryParams);
        const totalUsers = countResult.total;

        // Get users
        const usersQuery = `
            SELECT id, email, first_name, last_name, role, is_verified, is_active, 
                   created_at, last_login
            FROM users 
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const users = await db.query(usersQuery, [...queryParams, limit, offset]);

        res.json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isVerified: user.is_verified,
                isActive: user.is_active,
                createdAt: user.created_at,
                lastLogin: user.last_login
            })),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
                limit
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create new user (Admin only)
router.post('/users', authenticateToken, requireVerification, requireAdmin, [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
    body('role').isIn(['admin', 'senior_dentist', 'junior_dentist']).withMessage('Invalid role')
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

        // Create user
        const result = await db.run(
            `INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, firstName, lastName, role, 1, 1]
        );

        const newUser = await db.get('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?', [result.id]);

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, 'user_created', 'user', result.id, `User created: ${email}`, req.ip, req.get('User-Agent')]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user
router.put('/users/:id', authenticateToken, requireVerification, requireAdmin, [
    body('firstName').optional().trim().isLength({ min: 2 }),
    body('lastName').optional().trim().isLength({ min: 2 }),
    body('role').optional().isIn(['admin', 'senior_dentist', 'junior_dentist']),
    body('isActive').optional().isBoolean(),
    body('isVerified').optional().isBoolean()
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

        const userId = parseInt(req.params.id);
        const { firstName, lastName, role, isActive, isVerified } = req.body;

        // Check if user exists
        const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from deactivating themselves
        if (userId === req.user.id && isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }

        // Update user
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
        if (role) {
            updates.push('role = ?');
            values.push(role);
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            values.push(isActive ? 1 : 0);
        }
        if (isVerified !== undefined) {
            updates.push('is_verified = ?');
            values.push(isVerified ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        values.push(userId);

        await db.run(
            `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, 'user_updated', 'user', userId, `User updated: ${existingUser.email}`, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Check if user exists
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete user
        await db.run(
            'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, 'user_deleted', 'user', userId, `User deleted: ${user.email}`, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Reset user password
router.post('/users/:id/reset-password', authenticateToken, requireVerification, requireAdmin, [
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
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

        const userId = parseInt(req.params.id);
        const { newPassword } = req.body;

        // Check if user exists
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await db.run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, userId]
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, 'password_reset', 'user', userId, `Password reset for user: ${user.email}`, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all videos (Admin view)
router.get('/videos', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const category = req.query.category;
        const uploadedBy = req.query.uploadedBy;
        const offset = (page - 1) * limit;

        let whereConditions = ['1=1'];
        let queryParams = [];

        if (search) {
            whereConditions.push('(v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            whereConditions.push('v.category = ?');
            queryParams.push(category);
        }

        if (uploadedBy) {
            whereConditions.push('v.uploaded_by = ?');
            queryParams.push(uploadedBy);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM videos v 
            WHERE ${whereClause}
        `;
        const countResult = await db.get(countQuery, queryParams);
        const totalVideos = countResult.total;

        // Get videos
        const videosQuery = `
            SELECT v.*, u.first_name, u.last_name, u.email,
                   (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id) as view_count
            FROM videos v
            JOIN users u ON v.uploaded_by = u.id
            WHERE ${whereClause}
            ORDER BY v.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const videos = await db.query(videosQuery, [...queryParams, limit, offset]);

        res.json({
            success: true,
            videos: videos.map(video => ({
                id: video.id,
                title: video.title,
                description: video.description,
                filename: video.filename,
                originalFilename: video.original_filename,
                fileSize: video.file_size,
                duration: video.duration,
                category: video.category,
                tags: video.tags,
                isActive: video.is_active,
                uploadedBy: {
                    id: video.uploaded_by,
                    name: `${video.first_name} ${video.last_name}`,
                    email: video.email
                },
                viewCount: video.view_count,
                createdAt: video.created_at,
                updatedAt: video.updated_at
            })),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalVideos / limit),
                totalVideos,
                limit
            }
        });

    } catch (error) {
        console.error('Get admin videos error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get activity logs
router.get('/activity-logs', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const action = req.query.action;
        const userId = req.query.userId;
        const offset = (page - 1) * limit;

        let whereConditions = ['1=1'];
        let queryParams = [];

        if (action) {
            whereConditions.push('al.action = ?');
            queryParams.push(action);
        }

        if (userId) {
            whereConditions.push('al.user_id = ?');
            queryParams.push(userId);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM activity_logs al WHERE ${whereClause}`;
        const countResult = await db.get(countQuery, queryParams);
        const totalLogs = countResult.total;

        // Get activity logs
        const logsQuery = `
            SELECT al.*, u.first_name, u.last_name, u.email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const logs = await db.query(logsQuery, [...queryParams, limit, offset]);

        res.json({
            success: true,
            logs: logs.map(log => ({
                id: log.id,
                action: log.action,
                resourceType: log.resource_type,
                resourceId: log.resource_id,
                details: log.details,
                ipAddress: log.ip_address,
                userAgent: log.user_agent,
                timestamp: log.created_at,
                user: log.first_name && log.last_name ? 
                    `${log.first_name} ${log.last_name}` : 
                    'System'
            })),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLogs / limit),
                totalLogs,
                limit
            }
        });

    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get system statistics
router.get('/statistics', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        // Get date range
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // User statistics
        const userStats = await db.get(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_users
            FROM users
        `, [startDate.toISOString()]);

        // Video statistics
        const videoStats = await db.get(`
            SELECT 
                COUNT(*) as total_videos,
                SUM(file_size) as total_storage,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_videos
            FROM videos 
            WHERE is_active = 1
        `, [startDate.toISOString()]);

        // View statistics
        const viewStats = await db.get(`
            SELECT 
                COUNT(*) as total_views,
                COUNT(DISTINCT user_id) as unique_viewers,
                COUNT(DISTINCT video_id) as videos_viewed,
                SUM(CASE WHEN viewed_at >= ? THEN 1 ELSE 0 END) as recent_views
            FROM video_views
        `, [startDate.toISOString()]);

        // Daily activity for chart
        const dailyActivity = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as registrations
            FROM users
            WHERE created_at >= ?
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [startDate.toISOString()]);

        const dailyViews = await db.query(`
            SELECT 
                DATE(viewed_at) as date,
                COUNT(*) as views
            FROM video_views
            WHERE viewed_at >= ?
            GROUP BY DATE(viewed_at)
            ORDER BY date ASC
        `, [startDate.toISOString()]);

        res.json({
            success: true,
            statistics: {
                period: `${days} days`,
                users: userStats,
                videos: videoStats,
                views: viewStats,
                dailyActivity: dailyActivity,
                dailyViews: dailyViews
            }
        });

    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
