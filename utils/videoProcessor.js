const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class VideoProcessor {
    constructor() {
        this.uploadPath = process.env.UPLOAD_PATH || './uploads';
        this.thumbnailSize = process.env.THUMBNAIL_SIZE || '320x240';
        this.enableTranscoding = process.env.ENABLE_TRANSCODING === 'true';
    }

    // Generate thumbnail from video
    async generateThumbnail(videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .screenshots({
                    timestamps: ['10%'],
                    filename: path.basename(outputPath),
                    folder: path.dirname(outputPath),
                    size: this.thumbnailSize
                })
                .on('end', () => {
                    console.log('Thumbnail generated successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error generating thumbnail:', err);
                    reject(err);
                });
        });
    }

    // Get video metadata
    async getVideoMetadata(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                    const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
                    
                    resolve({
                        duration: Math.round(metadata.format.duration),
                        size: metadata.format.size,
                        bitrate: metadata.format.bit_rate,
                        video: videoStream ? {
                            codec: videoStream.codec_name,
                            width: videoStream.width,
                            height: videoStream.height,
                            fps: eval(videoStream.r_frame_rate)
                        } : null,
                        audio: audioStream ? {
                            codec: audioStream.codec_name,
                            sampleRate: audioStream.sample_rate,
                            channels: audioStream.channels
                        } : null
                    });
                }
            });
        });
    }

    // Transcode video to web-friendly format
    async transcodeVideo(inputPath, outputPath, quality = 'medium') {
        if (!this.enableTranscoding) {
            // If transcoding is disabled, just copy the file
            await fs.copyFile(inputPath, outputPath);
            return outputPath;
        }

        const qualitySettings = {
            high: { videoBitrate: '2000k', audioBitrate: '128k' },
            medium: { videoBitrate: '1000k', audioBitrate: '96k' },
            low: { videoBitrate: '500k', audioBitrate: '64k' }
        };

        const settings = qualitySettings[quality] || qualitySettings.medium;

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .videoBitrate(settings.videoBitrate)
                .audioBitrate(settings.audioBitrate)
                .format('mp4')
                .outputOptions([
                    '-movflags faststart', // Optimize for streaming
                    '-preset fast', // Faster encoding
                    '-crf 23', // Good quality/size balance
                    '-pix_fmt yuv420p' // Ensure compatibility
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('Transcoding started:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log(`Transcoding progress: ${progress.percent}% done`);
                })
                .on('end', () => {
                    console.log('Transcoding completed successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Transcoding error:', err);
                    reject(err);
                })
                .run();
        });
    }

    // Process uploaded video file
    async processVideo(file, userId) {
        try {
            const fileExtension = path.extname(file.originalname);
            const baseFileName = path.basename(file.originalname, fileExtension);
            const timestamp = Date.now();
            const userDir = path.join(this.uploadPath, `user_${userId}`);
            
            // Create user directory if it doesn't exist
            await fs.mkdir(userDir, { recursive: true });

            const processedFileName = `${baseFileName}_${timestamp}.mp4`;
            const thumbnailFileName = `${baseFileName}_${timestamp}_thumb.jpg`;
            
            const processedVideoPath = path.join(userDir, processedFileName);
            const thumbnailPath = path.join(userDir, thumbnailFileName);

            // Get original video metadata
            const metadata = await this.getVideoMetadata(file.path);
            
            // Transcode video
            await this.transcodeVideo(file.path, processedVideoPath);
            
            // Generate thumbnail
            await this.generateThumbnail(processedVideoPath, thumbnailPath);

            // Get processed file size
            const stats = await fs.stat(processedVideoPath);
            const processedFileSize = stats.size;

            // Clean up original uploaded file
            await fs.unlink(file.path);

            return {
                filename: processedFileName,
                originalFilename: file.originalname,
                filePath: processedVideoPath,
                thumbnailPath: thumbnailPath,
                fileSize: processedFileSize,
                duration: metadata.duration,
                metadata: metadata
            };

        } catch (error) {
            console.error('Video processing error:', error);
            throw error;
        }
    }

    // Validate video file
    validateVideoFile(file) {
        const allowedMimeTypes = [
            'video/mp4',
            'video/avi',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-flv',
            'video/x-matroska'
        ];

        const allowedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
        const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 104857600; // 100MB

        // Check file size
        if (file.size > maxFileSize) {
            throw new Error(`File size exceeds maximum limit of ${maxFileSize / 1024 / 1024}MB`);
        }

        // Check MIME type
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error('Invalid file type. Only video files are allowed.');
        }

        // Check file extension
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error('Invalid file extension.');
        }

        return true;
    }

    // Delete video and associated files
    async deleteVideo(videoPath, thumbnailPath) {
        try {
            const filesToDelete = [videoPath];
            if (thumbnailPath) {
                filesToDelete.push(thumbnailPath);
            }

            for (const filePath of filesToDelete) {
                try {
                    await fs.unlink(filePath);
                    console.log(`Deleted file: ${filePath}`);
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        console.error(`Error deleting file ${filePath}:`, err);
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting video files:', error);
            throw error;
        }
    }

    // Get video stream info for streaming
    async getVideoStreamInfo(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                    const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
                    
                    resolve({
                        duration: Math.round(metadata.format.duration),
                        size: metadata.format.size,
                        hasVideo: !!videoStream,
                        hasAudio: !!audioStream,
                        videoCodec: videoStream?.codec_name,
                        audioCodec: audioStream?.codec_name
                    });
                }
            });
        });
    }
}

module.exports = new VideoProcessor();
