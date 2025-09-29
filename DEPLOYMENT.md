# 🚀 Deployment Guide

This guide provides step-by-step instructions for deploying the Dentist Video Platform to various cloud providers and environments.

## 📋 Prerequisites

Before deployment, ensure you have:
- Node.js 16+ installed
- FFmpeg installed on the server
- Domain name (for production)
- SSL certificate (for HTTPS)
- Email service configured (Gmail, SendGrid, etc.)

## 🐳 Docker Deployment (Recommended)

### 1. Build and Run with Docker

```bash
# Build the Docker image
docker build -t dentist-platform .

# Run the container
docker run -d \
  --name dentist-platform \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/backups:/app/backups \
  -e NODE_ENV=production \
  -e EMAIL_HOST=your-smtp-host \
  -e EMAIL_USER=your-email \
  -e EMAIL_PASS=your-password \
  dentist-platform
```

### 2. Using Docker Compose

```bash
# Copy and configure environment
cp env.example .env
# Edit .env with your settings

# Start all services
docker-compose up -d

# For production with nginx
docker-compose --profile production up -d
```

## ☁️ Cloud Deployment

### Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   # Install Heroku CLI
   npm install -g heroku
   ```

2. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

3. **Configure Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-super-secret-jwt-key
   heroku config:set EMAIL_HOST=smtp.gmail.com
   heroku config:set EMAIL_USER=your-email@gmail.com
   heroku config:set EMAIL_PASS=your-app-password
   heroku config:set EMAIL_FROM="Dentist Platform <noreply@yourdomain.com>"
   ```

4. **Install FFmpeg Buildpack**
   ```bash
   heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
   heroku buildpacks:add heroku/nodejs
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### AWS EC2 Deployment

1. **Launch EC2 Instance**
   - Choose Ubuntu 20.04 LTS
   - Select appropriate instance size (t3.medium or larger)
   - Configure security groups (ports 22, 80, 443)

2. **Connect and Setup**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install FFmpeg
   sudo apt install -y ffmpeg
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install -y nginx
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone your-repository-url
   cd dentist-video-platform
   
   # Install dependencies
   npm ci --only=production
   
   # Configure environment
   cp env.example .env
   # Edit .env with production values
   
   # Setup application
   npm run setup
   
   # Start with PM2
   pm2 start server.js --name "dentist-platform"
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   ```bash
   # Copy nginx configuration
   sudo cp nginx.conf /etc/nginx/sites-available/dentist-platform
   sudo ln -s /etc/nginx/sites-available/dentist-platform /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   
   # Test and restart nginx
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### DigitalOcean App Platform

1. **Create New App**
   - Connect your GitHub repository
   - Choose Node.js as the runtime

2. **Configure Build Settings**
   ```yaml
   name: dentist-platform
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/dentist-video-platform
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: JWT_SECRET
       value: your-super-secret-jwt-key
     - key: EMAIL_HOST
       value: smtp.gmail.com
     - key: EMAIL_USER
       value: your-email@gmail.com
     - key: EMAIL_PASS
       value: your-app-password
     - key: EMAIL_FROM
       value: "Dentist Platform <noreply@yourdomain.com>"
   ```

3. **Deploy**
   - Click "Create Resources"
   - Wait for deployment to complete

### Google Cloud Platform

1. **Create App Engine Application**
   ```yaml
   # app.yaml
   runtime: nodejs18
   env: standard
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
     target_cpu_utilization: 0.6
   
   env_variables:
     NODE_ENV: production
     JWT_SECRET: your-super-secret-jwt-key
     EMAIL_HOST: smtp.gmail.com
     EMAIL_USER: your-email@gmail.com
     EMAIL_PASS: your-app-password
     EMAIL_FROM: "Dentist Platform <noreply@yourdomain.com>"
   ```

2. **Deploy**
   ```bash
   gcloud app deploy
   ```

## 🔒 SSL/HTTPS Configuration

### Using Let's Encrypt (Certbot)

1. **Install Certbot**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Obtain Certificate**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Using Cloudflare

1. **Add Domain to Cloudflare**
2. **Update Nameservers**
3. **Enable SSL/TLS**
4. **Configure Page Rules for caching**

## 📊 Monitoring & Maintenance

### Log Monitoring

```bash
# View application logs
pm2 logs dentist-platform

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Strategy

```bash
# Create backup
npm run backup

# Schedule daily backups
crontab -e
# Add: 0 2 * * * cd /path/to/app && npm run backup
```

### Performance Monitoring

```bash
# Monitor PM2 processes
pm2 monit

# Monitor system resources
htop
```

## 🔧 Environment Configuration

### Production Environment Variables

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DB_PATH=/app/database/dentist_platform.db

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-session-secret-change-this
BCRYPT_ROUNDS=12

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Dentist Platform <noreply@yourdomain.com>"

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_PATH=/app/uploads
ALLOWED_VIDEO_TYPES=mp4,avi,mov,wmv,flv,mkv

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSL (if using built-in SSL)
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password

# Video Processing
VIDEO_QUALITY=medium
THUMBNAIL_SIZE=320x240
ENABLE_TRANSCODING=true
```

## 🚨 Troubleshooting

### Common Issues

1. **FFmpeg not found**
   ```bash
   # Install FFmpeg
   sudo apt install -y ffmpeg
   ```

2. **Permission denied for uploads**
   ```bash
   # Fix permissions
   sudo chown -R www-data:www-data uploads/
   sudo chmod -R 755 uploads/
   ```

3. **Database locked**
   ```bash
   # Restart application
   pm2 restart dentist-platform
   ```

4. **Email not working**
   - Check SMTP credentials
   - Verify firewall settings
   - Test with telnet to SMTP port

### Health Checks

```bash
# Check application health
curl http://localhost:3000/api/health

# Check nginx status
sudo systemctl status nginx

# Check PM2 status
pm2 status
```

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer Configuration**
   ```nginx
   upstream dentist_platform {
       server 10.0.1.10:3000;
       server 10.0.1.11:3000;
       server 10.0.1.12:3000;
   }
   ```

2. **Database Considerations**
   - Consider PostgreSQL for production
   - Implement database clustering
   - Use Redis for session storage

3. **File Storage**
   - Use AWS S3 or similar for video storage
   - Implement CDN for video delivery
   - Consider video transcoding services

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize video processing
- Use SSD storage for better I/O
- Implement caching strategies

## 🔐 Security Checklist

- [ ] SSL/HTTPS enabled
- [ ] Strong passwords and secrets
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting setup
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] SQL injection protection
- [ ] XSS protection enabled

## 📞 Support

For deployment issues:
1. Check the logs first
2. Review this deployment guide
3. Check the main README.md
4. Create an issue in the repository

---

**Happy Deploying! 🚀**
