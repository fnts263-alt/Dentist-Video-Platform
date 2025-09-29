const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const videoProcessor = require('../utils/videoProcessor');
const emailService = require('../utils/email');
const { uploadLimiter, validateFileUpload } = require('../middleware/security');
const { authenticateToken, requireVerification, requireAdmin, requireDentist } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp');
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'video/mp4',
            'video/avi',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-flv',
            'video/x-matroska'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'), false);
        }
    }
});

// Ensure temp directory exists
const tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp');
require('fs').mkdirSync(tempDir, { recursive: true });

// Upload video (Admin only)
router.post('/upload', uploadLimiter, authenticateToken, requireVerification, requireAdmin, upload.single('video'), validateFileUpload, [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('category').optional().trim().isLength({ max: 100 }).withMessage('Category must be less than 100 characters'),
    body('tags').optional().trim().isLength({ max: 500 }).withMessage('Tags must be less than 500 characters')
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

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Video file is required'
            });
        }

        const { title, description, category, tags } = req.body;

        // Validate video file
        videoProcessor.validateVideoFile(req.file);

        // Process video (transcode, generate thumbnail)
        const processedVideo = await videoProcessor.processVideo(req.file, req.user.id);

        // Insert video record into database
        const result = await db.run(
            `INSERT INTO videos (title, description, filename, original_filename, file_path, thumbnail_path, 
             file_size, duration, category, tags, uploaded_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description || null,
                processedVideo.filename,
                processedVideo.originalFilename,
                processedVideo.filePath,
                processedVideo.thumbnailPath,
                processedVideo.fileSize,
                processedVideo.duration,
                category || null,
                tags || null,
                req.user.id
            ]
        );

        // Get the created video with user info
        const video = await db.get(
            `SELECT v.*, u.first_name, u.last_name, u.email 
             FROM videos v 
             JOIN users u ON v.uploaded_by = u.id 
             WHERE v.id = ?`,
            [result.id]
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, 'video_uploaded', 'video', result.id, `Video uploaded: ${title}`, req.ip, req.get('User-Agent')]
        );

        // Notify other admins about new video upload
        const admins = await db.query('SELECT email FROM users WHERE role = ? AND id != ?', ['admin', req.user.id]);
        for (const admin of admins) {
            await emailService.sendNotificationEmail(
                admin.email,
                'New Video Uploaded',
                `A new video "${title}" has been uploaded to the platform by ${req.user.first_name} ${req.user.last_name}.`
            );
        }

        res.status(201).json({
            success: true,
            message: 'Video uploaded and processed successfully',
            video: {
                id: video.id,
                title: video.title,
                description: video.description,
                category: video.category,
                tags: video.tags,
                duration: video.duration,
                fileSize: video.file_size,
                uploadedBy: `${video.first_name} ${video.last_name}`,
                createdAt: video.created_at
            }
        });

    } catch (error) {
        console.error('Video upload error:', error);
        
        // Clean up uploaded file if processing failed
        if (req.file && req.file.path) {
            try {
                await require('fs').promises.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up uploaded file:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Get all videos (with pagination and filters)
router.get('/', authenticateToken, requireVerification, requireDentist, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const category = req.query.category;
        const search = req.query.search;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const offset = (page - 1) * limit;

        let whereConditions = ['v.is_active = 1'];
        let queryParams = [];

        if (category) {
            whereConditions.push('v.category = ?');
            queryParams.push(category);
        }

        if (search) {
            whereConditions.push('(v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM videos v ${whereClause}`;
        const countResult = await db.get(countQuery, queryParams);
        const totalVideos = countResult.total;

        // Get videos
        const videosQuery = `
            SELECT v.id, v.title, v.description, v.filename, v.thumbnail_path, v.duration, 
                   v.category, v.tags, v.created_at, v.file_size,
                   u.first_name, u.last_name
            FROM videos v
            JOIN users u ON v.uploaded_by = u.id
            ${whereClause}
            ORDER BY v.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const videos = await db.query(videosQuery, [...queryParams, limit, offset]);

        // Get categories for filter
        const categories = await db.query('SELECT DISTINCT category FROM videos WHERE is_active = 1 AND category IS NOT NULL ORDER BY category');

        res.json({
            success: true,
            videos: videos.map(video => ({
                id: video.id,
                title: video.title,
                description: video.description,
                thumbnailPath: video.thumbnail_path,
                duration: video.duration,
                category: video.category,
                tags: video.tags,
                uploadedBy: `${video.first_name} ${video.last_name}`,
                createdAt: video.created_at,
                fileSize: video.file_size
            })),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalVideos / limit),
                totalVideos,
                limit
            },
            categories: categories.map(cat => cat.category)
        });

    } catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get single video details
router.get('/:id', authenticateToken, requireVerification, requireDentist, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);

        const video = await db.get(
            `SELECT v.*, u.first_name, u.last_name, u.email
             FROM videos v
             JOIN users u ON v.uploaded_by = u.id
             WHERE v.id = ? AND v.is_active = 1`,
            [videoId]
        );

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Log video view
        await db.run(
            'INSERT INTO video_views (video_id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [videoId, req.user.id, req.ip, req.get('User-Agent')]
        );

        // Get view count for this video
        const viewCount = await db.get(
            'SELECT COUNT(*) as count FROM video_views WHERE video_id = ?',
            [videoId]
        );

        res.json({
            success: true,
            video: {
                id: video.id,
                title: video.title,
                description: video.description,
                filename: video.filename,
                thumbnailPath: video.thumbnail_path,
                duration: video.duration,
                category: video.category,
                tags: video.tags,
                uploadedBy: `${video.first_name} ${video.last_name}`,
                createdAt: video.created_at,
                viewCount: viewCount.count
            }
        });

    } catch (error) {
        console.error('Get video error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Stream video (with access control)
router.get('/:id/stream', authenticateToken, requireVerification, requireDentist, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const range = req.headers.range;

        // Get video info
        const video = await db.get(
            'SELECT * FROM videos WHERE id = ? AND is_active = 1',
            [videoId]
        );

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const videoPath = video.file_path;
        const videoSize = video.file_size;

        if (range) {
            // Handle range requests for video streaming
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
            const chunksize = (end - start) + 1;
            
            const file = require('fs').createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${videoSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff'
            };
            
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Handle full video request
            const head = {
                'Content-Length': videoSize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff'
            };
            
            res.writeHead(200, head);
            require('fs').createReadStream(videoPath).pipe(res);
        }

        // Log video view
        await db.run(
            'INSERT INTO video_views (video_id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [videoId, req.user.id, req.ip, req.get('User-Agent')]
        );

    } catch (error) {
        console.error('Video streaming error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error streaming video'
            });
        }
    }
});

// Update video (Admin only)
router.put('/:id', authenticateToken, requireVerification, requireAdmin, [
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('category').optional().trim().isLength({ max: 100 }),
    body('tags').optional().trim().isLength({ max: 500 })
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

        const videoId = parseInt(req.params.id);
        const { title, description, category, tags } = req.body;

        // Check if video exists
        const existingVideo = await db.get(
            'SELECT * FROM videos WHERE id = ? AND is_active = 1',
            [videoId]
        );

        if (!existingVideo) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Update video
        const updates = [];
        const values = [];

        if (title) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (tags !== undefined) {
            updates.push('tags = ?');
            values.push(tags);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        values.push(videoId);

        await db.run(
            `UPDATE videos SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, 'video_updated', 'video', videoId, `Video updated: ${existingVideo.title}`, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Video updated successfully'
        });

    } catch (error) {
        console.error('Update video error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete video (Admin only)
router.delete('/:id', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);

        // Get video info
        const video = await db.get(
            'SELECT * FROM videos WHERE id = ? AND is_active = 1',
            [videoId]
        );

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Soft delete video
        await db.run(
            'UPDATE videos SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [videoId]
        );

        // Log activity
        await db.run(
            'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, 'video_deleted', 'video', videoId, `Video deleted: ${video.title}`, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Video deleted successfully'
        });

    } catch (error) {
        console.error('Delete video error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get video analytics (Admin only)
router.get('/:id/analytics', authenticateToken, requireVerification, requireAdmin, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);

        // Check if video exists
        const video = await db.get(
            'SELECT id, title FROM videos WHERE id = ? AND is_active = 1',
            [videoId]
        );

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Get view statistics
        const totalViews = await db.get(
            'SELECT COUNT(*) as count FROM video_views WHERE video_id = ?',
            [videoId]
        );

        const uniqueViewers = await db.get(
            'SELECT COUNT(DISTINCT user_id) as count FROM video_views WHERE video_id = ?',
            [videoId]
        );

        // Get recent views
        const recentViews = await db.query(
            `SELECT vv.viewed_at, vv.ip_address, u.first_name, u.last_name, u.email
             FROM video_views vv
             LEFT JOIN users u ON vv.user_id = u.id
             WHERE vv.video_id = ?
             ORDER BY vv.viewed_at DESC
             LIMIT 50`,
            [videoId]
        );

        // Get views by date
        const viewsByDate = await db.query(
            `SELECT DATE(viewed_at) as date, COUNT(*) as views
             FROM video_views
             WHERE video_id = ?
             GROUP BY DATE(viewed_at)
             ORDER BY date DESC
             LIMIT 30`,
            [videoId]
        );

        res.json({
            success: true,
            analytics: {
                video: {
                    id: video.id,
                    title: video.title
                },
                totalViews: totalViews.count,
                uniqueViewers: uniqueViewers.count,
                recentViews: recentViews.map(view => ({
                    viewedAt: view.viewed_at,
                    ipAddress: view.ip_address,
                    viewer: view.first_name && view.last_name ? 
                        `${view.first_name} ${view.last_name}` : 
                        'Anonymous'
                })),
                viewsByDate: viewsByDate.map(item => ({
                    date: item.date,
                    views: item.views
                }))
            }
        });

    } catch (error) {
        console.error('Get video analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
