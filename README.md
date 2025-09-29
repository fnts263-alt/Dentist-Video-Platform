# 🦷 Dentist Video Platform

A professional, secure video platform designed specifically for dental education and training. This platform provides role-based access control, secure video streaming, and comprehensive analytics for dental professionals.

## ✨ Features

### 🔐 Security & Authentication
- **User Authentication**: Registration, login, email verification
- **Password Reset**: Secure password reset via email
- **Role-Based Access Control (RBAC)**: Admin, Senior Dentist, Junior Dentist roles
- **JWT Token Authentication**: Secure API access
- **Rate Limiting**: Protection against brute-force attacks
- **Input Validation & Sanitization**: XSS and SQL injection protection

### 📹 Video Management
- **Secure Video Upload**: Admin-only video upload with file validation
- **Video Transcoding**: Automatic conversion to web-friendly formats (MP4 H.264)
- **Thumbnail Generation**: Automatic thumbnail creation from videos
- **Video Streaming**: Secure streaming with access control
- **Video Analytics**: Track views, user engagement, and analytics
- **Download Prevention**: Videos cannot be downloaded directly

### 🎨 User Interface
- **Responsive Design**: Mobile-first, cross-browser compatible
- **Dark Mode**: Toggle between light and dark themes
- **Professional UI**: Clean, modern interface with Tailwind CSS
- **Video Player**: Custom video player with autoplay and loop
- **Search & Filter**: Advanced video search and categorization

### 👨‍⚕️ Admin Panel
- **Dashboard**: Comprehensive analytics and statistics
- **User Management**: Create, update, and manage user accounts
- **Video Management**: Upload, edit, and delete videos
- **Activity Logs**: Track all user actions and system events
- **Backup & Restore**: Automated backup and restore functionality

### 📊 Analytics & Reporting
- **View Tracking**: Track who watched what and when
- **User Analytics**: Monitor user engagement and activity
- **Video Performance**: Analyze video popularity and usage
- **System Statistics**: Monitor platform health and usage

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- FFmpeg (for video processing)
- Email service (Gmail, SendGrid, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dentist-video-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env file with your configuration
   ```

4. **Setup the application**
   ```bash
   npm run setup
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   - Open your browser and go to `http://localhost:3000`

### Default Accounts
- **Admin**: `admin@dentistplatform.com` / `admin123!@#`
- **Senior Dentist**: `senior@dentistplatform.com` / `senior123!@#`
- **Junior Dentist**: `junior@dentistplatform.com` / `junior123!@#`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DB_PATH=./database/dentist_platform.db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=24h

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Dentist Platform <noreply@dentistplatform.com>

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads
ALLOWED_VIDEO_TYPES=mp4,avi,mov,wmv,flv,mkv

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_change_this_in_production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSL Configuration (for production)
SSL_KEY_PATH=
SSL_CERT_PATH=

# Admin Configuration
ADMIN_EMAIL=admin@dentistplatform.com
ADMIN_PASSWORD=admin123!@#

# Video Configuration
VIDEO_QUALITY=medium
THUMBNAIL_SIZE=320x240
ENABLE_TRANSCODING=true
```

### Email Setup

For Gmail:
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in `EMAIL_PASS`

For other email services:
- Update `EMAIL_HOST`, `EMAIL_PORT`, and `EMAIL_SECURE` accordingly

## 📁 Project Structure

```
dentist-video-platform/
├── config/                 # Database and configuration
│   └── database.js
├── middleware/             # Express middleware
│   ├── auth.js            # Authentication middleware
│   └── security.js        # Security middleware
├── routes/                 # API routes
│   ├── auth.js            # Authentication routes
│   ├── videos.js          # Video management routes
│   └── admin.js           # Admin panel routes
├── utils/                  # Utility functions
│   ├── email.js           # Email service
│   └── videoProcessor.js  # Video processing utilities
├── scripts/                # Setup and maintenance scripts
│   ├── setup.js           # Initial setup
│   ├── backup.js          # Backup script
│   └── restore.js         # Restore script
├── public/                 # Static files
│   ├── index.html         # Main application
│   └── js/
│       └── app.js         # Frontend JavaScript
├── uploads/                # User uploaded files
├── database/               # SQLite database
├── logs/                   # Application logs
├── backups/                # Backup files
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🔧 Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm run setup` - Initialize the application (run once)
- `npm run backup` - Create a backup of database and uploads
- `npm run restore <backup-path>` - Restore from backup

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Email verification for new accounts
- Secure password reset flow

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Security headers (Helmet.js)

### File Security
- File type validation
- File size limits (100MB max)
- Malicious file detection
- Secure file storage
- Direct access prevention

## 📹 Video Processing

### Supported Formats
- Input: MP4, AVI, MOV, WMV, FLV, MKV
- Output: MP4 (H.264 codec)
- Maximum file size: 100MB

### Processing Pipeline
1. File upload validation
2. Video transcoding (if enabled)
3. Thumbnail generation
4. Metadata extraction
5. Secure storage

### Requirements
- FFmpeg must be installed on the server
- Sufficient disk space for video processing
- Adequate server resources for transcoding

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   export NODE_ENV=production
   ```

2. **Install Dependencies**
   ```bash
   npm ci --only=production
   ```

3. **Configure SSL**
   - Set `SSL_KEY_PATH` and `SSL_CERT_PATH` in `.env`
   - Or use a reverse proxy (nginx, Apache)

4. **Setup Process Manager**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "dentist-platform"
   pm2 save
   pm2 startup
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Deployment

The platform is ready for deployment on:
- **Heroku**: Use the included Procfile
- **AWS EC2**: Follow standard Node.js deployment
- **DigitalOcean**: Use the provided setup scripts
- **Google Cloud Platform**: Deploy using Cloud Run or Compute Engine

## 📊 Monitoring & Maintenance

### Logging
- Application logs in `logs/` directory
- Error tracking with Winston
- Request logging with Morgan

### Backup Strategy
- Automated daily backups
- Database and file system backup
- Compressed backup archives
- Automated cleanup of old backups

### Performance Monitoring
- Video processing metrics
- User engagement analytics
- System resource monitoring
- Error rate tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## 🔄 Version History

- **v1.0.0** - Initial release with core features
  - User authentication and RBAC
  - Video upload and streaming
  - Admin panel
  - Security features
  - Responsive UI with dark mode

---

**Built with ❤️ for the dental community**
