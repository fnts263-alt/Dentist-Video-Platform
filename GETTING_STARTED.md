# 🚀 Getting Started - Dentist Video Platform

Welcome to the Dentist Video Platform! This guide will help you get up and running in minutes.

## ⚡ Quick Start (Automated)

### For Linux/macOS:
```bash
chmod +x start.sh
./start.sh
```

### For Windows:
```cmd
start.bat
```

That's it! The script will automatically:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Create configuration files
- ✅ Setup the database
- ✅ Start the server

## 📋 Manual Setup

If you prefer manual setup or need to troubleshoot:

### 1. Prerequisites
- **Node.js 16+** and **npm 8+**
- **FFmpeg** (for video processing)
- **Email service** (Gmail, SendGrid, etc.)

### 2. Installation
```bash
# Clone or download the project
cd dentist-video-platform

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env
# Edit .env with your settings

# Setup the application
npm run setup

# Start the server
npm start
```

### 3. Access the Application
- Open your browser and go to: `http://localhost:3000`
- Use the default accounts below to login

## 🔐 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@dentistplatform.com` | `admin123!@#` |
| **Senior Dentist** | `senior@dentistplatform.com` | `senior123!@#` |
| **Junior Dentist** | `junior@dentistplatform.com` | `junior123!@#` |

## ⚙️ Essential Configuration

Edit your `.env` file with these required settings:

```env
# Email Configuration (Required for user registration)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Dentist Platform <noreply@yourdomain.com>"

# Security (Change these in production!)
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret
```

## 📧 Email Setup

### Gmail Setup:
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in `EMAIL_PASS`

### Other Email Services:
Update these values in `.env`:
- `EMAIL_HOST`: Your SMTP server
- `EMAIL_PORT`: SMTP port (usually 587 or 465)
- `EMAIL_SECURE`: true for SSL, false for TLS

## 🎥 Video Processing

### FFmpeg Installation:

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
- Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Or use: `choco install ffmpeg`

## 🎯 First Steps

1. **Login as Admin**
   - Use: `admin@dentistplatform.com` / `admin123!@#`
   - Access the admin panel from the navigation

2. **Upload Your First Video**
   - Click the "Upload Video" button in the admin panel
   - Select a video file (MP4, AVI, MOV, etc.)
   - Add title, description, and category
   - Click upload and wait for processing

3. **Test User Access**
   - Login as a dentist user
   - Browse and watch videos
   - Test the search and filter functionality

## 🛠️ Available Commands

```bash
# Start production server
npm start

# Start development server (with auto-reload)
npm run dev

# Setup application (run once)
npm run setup

# Create backup
npm run backup

# Restore from backup
npm run restore <backup-path>
```

## 📁 Key Files & Directories

```
dentist-video-platform/
├── 📄 server.js              # Main server file
├── 📄 package.json           # Dependencies & scripts
├── 📄 .env                   # Environment configuration
├── 📁 public/                # Frontend files
│   ├── 📄 index.html         # Main application
│   └── 📁 js/app.js          # Frontend JavaScript
├── 📁 uploads/               # Video files storage
├── 📁 database/              # SQLite database
├── 📁 logs/                  # Application logs
└── 📁 scripts/               # Setup & maintenance scripts
```

## 🔧 Troubleshooting

### Common Issues:

**1. "FFmpeg not found" error:**
- Install FFmpeg (see installation guide above)
- Restart the server after installation

**2. Email not working:**
- Check your email credentials in `.env`
- Verify SMTP settings
- Check firewall/network restrictions

**3. "Database locked" error:**
- Stop the server (Ctrl+C)
- Wait a few seconds
- Restart with `npm start`

**4. Permission errors on uploads:**
```bash
# Linux/macOS
chmod -R 755 uploads/
chown -R $USER:$USER uploads/

# Windows
# Run command prompt as administrator
```

**5. Port 3000 already in use:**
- Change PORT in `.env` file
- Or kill the process using port 3000

### Health Check:
Visit `http://localhost:3000/api/health` to verify the server is running.

## 🌐 Production Deployment

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions including:
- Docker deployment
- Cloud deployment (Heroku, AWS, DigitalOcean)
- SSL/HTTPS configuration
- Monitoring and maintenance

## 📚 Features Overview

### 🔐 Security Features
- ✅ User authentication & authorization
- ✅ Role-based access control
- ✅ Email verification
- ✅ Password reset
- ✅ Rate limiting
- ✅ Input validation & sanitization

### 📹 Video Features
- ✅ Secure video upload (admin only)
- ✅ Video transcoding & optimization
- ✅ Thumbnail generation
- ✅ Secure streaming with access control
- ✅ Download prevention
- ✅ Video analytics & view tracking

### 🎨 User Interface
- ✅ Responsive design (mobile-friendly)
- ✅ Dark mode toggle
- ✅ Professional UI with Tailwind CSS
- ✅ Advanced search & filtering
- ✅ Video player with autoplay & loop

### 👨‍⚕️ Admin Panel
- ✅ Dashboard with analytics
- ✅ User management
- ✅ Video management
- ✅ Activity logs
- ✅ Backup & restore

## 🆘 Need Help?

1. **Check the logs:**
   ```bash
   # View application logs
   tail -f logs/combined.log
   ```

2. **Review documentation:**
   - [README.md](README.md) - Complete documentation
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide

3. **Common solutions:**
   - Restart the server
   - Check `.env` configuration
   - Verify FFmpeg installation
   - Check file permissions

## 🎉 You're All Set!

Your Dentist Video Platform is now running! 

- **Application**: http://localhost:3000
- **Admin Panel**: Login as admin to access
- **API Health**: http://localhost:3000/api/health

Happy learning with your dental video platform! 🦷📚
