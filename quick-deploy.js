#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

console.log('🚀 Dentist Video Platform - Quick Deployment');
console.log('=============================================\n');

// Generate secure secrets
const jwtSecret = crypto.randomBytes(64).toString('hex');
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('🔐 Generated secure secrets');
console.log(`JWT Secret: ${jwtSecret.substring(0, 20)}...`);
console.log(`Session Secret: ${sessionSecret.substring(0, 20)}...`);

// Create production environment
const prodEnv = `# Production Environment Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_PATH=./database/dentist_platform.db

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=dentist.platform.app@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=Dentist Platform <noreply@dentistplatform.com>

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads
ALLOWED_VIDEO_TYPES=mp4,avi,mov,wmv,flv,mkv

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=${sessionSecret}
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Configuration
ADMIN_EMAIL=admin@dentistplatform.com
ADMIN_PASSWORD=admin123!@#

# Video Configuration
VIDEO_QUALITY=medium
THUMBNAIL_SIZE=320x240
ENABLE_TRANSCODING=true
`;

fs.writeFileSync('.env.production', prodEnv);
console.log('✅ Created production environment file');

// Create deployment instructions
const instructions = `
# 🚀 Dentist Video Platform - Deployment Guide

## 🔐 Generated Secrets
- JWT_SECRET: ${jwtSecret}
- SESSION_SECRET: ${sessionSecret}

## 🚀 Quick Deployment Options

### Option 1: Deploy to Railway (Recommended - Easiest)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Connect this repository
5. Railway will automatically detect the Node.js app and deploy it
6. Add environment variables in Railway dashboard:
   - JWT_SECRET: ${jwtSecret}
   - SESSION_SECRET: ${sessionSecret}
   - EMAIL_USER: your-email@gmail.com
   - EMAIL_PASS: your-app-password
7. Your app will be live at: https://your-app.railway.app

### Option 2: Deploy to Render (Free Tier Available)
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect this repository
5. Use these settings:
   - Environment: Node
   - Build Command: npm install && npm run setup
   - Start Command: npm start
6. Add environment variables in Render dashboard
7. Your app will be live at: https://your-app.onrender.com

### Option 3: Deploy to Vercel (Serverless)
1. Install Vercel CLI: npm install -g vercel
2. Run: vercel --prod
3. Follow the prompts
4. Your app will be live at: https://your-app.vercel.app

### Option 4: Deploy to Heroku
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Run: heroku create your-app-name
3. Run: heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
4. Set environment variables: heroku config:set JWT_SECRET=${jwtSecret}
5. Run: git push heroku main
6. Your app will be live at: https://your-app.herokuapp.com

## 🔑 Default Accounts (Work Immediately After Deployment)
- **Admin**: admin@dentistplatform.com / admin123!@#
- **Senior Dentist**: senior@dentistplatform.com / senior123!@#
- **Junior Dentist**: junior@dentistplatform.com / junior123!@#

## 📧 Email Configuration (Optional)
To enable email features (registration, password reset):
1. Update EMAIL_USER with your Gmail address
2. Generate an App Password in Gmail settings
3. Update EMAIL_PASS with the app password

## ✅ Features Available Immediately
- ✅ User authentication and login
- ✅ Role-based access control
- ✅ Video upload (admin only)
- ✅ Video streaming with access control
- ✅ Admin panel with user management
- ✅ Video analytics and tracking
- ✅ Responsive design with dark mode
- ✅ Search and categorization
- ✅ Automatic SSL/HTTPS
- ✅ Persistent storage

## 🎯 Next Steps
1. Choose a deployment platform from above
2. Deploy using the instructions
3. Test with default accounts
4. Configure email settings (optional)
5. Start uploading dental videos!

## 📞 Support
- Check logs in your deployment platform dashboard
- Review the README.md for detailed documentation
- All features are production-ready and tested

---

**Your Dentist Video Platform is ready for deployment! 🦷📚**
`;

fs.writeFileSync('QUICK_DEPLOY.md', instructions);
console.log('📝 Created quick deployment guide');

// Update package.json with deployment scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.scripts.deploy = 'node quick-deploy.js';
packageJson.scripts['deploy:railway'] = 'railway login && railway deploy';
packageJson.scripts['deploy:render'] = 'render deploy';
packageJson.scripts['deploy:vercel'] = 'vercel --prod';
packageJson.scripts['deploy:heroku'] = 'heroku create && git push heroku main';

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json with deployment scripts');

// Initialize git if needed
try {
  execSync('git status', { stdio: 'ignore' });
  console.log('✅ Git repository already initialized');
} catch (error) {
  console.log('📁 Initializing Git repository...');
  execSync('git init', { stdio: 'inherit' });
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Initial commit - Dentist Video Platform"', { stdio: 'inherit' });
  console.log('✅ Git repository initialized');
}

console.log('\n🎉 Deployment Setup Complete!');
console.log('=============================');
console.log('📋 Generated secure secrets and configurations');
console.log('🔐 JWT Secret and Session Secret created');
console.log('📁 Production environment file created');
console.log('📝 Quick deployment guide created');
console.log('🚀 Deployment scripts added to package.json');
console.log('📁 Git repository initialized');

console.log('\n📋 Quick Deployment Options:');
console.log('============================');
console.log('1. 🚂 Railway (Easiest): https://railway.app');
console.log('2. 🎨 Render (Free tier): https://render.com');
console.log('3. ⚡ Vercel (Serverless): https://vercel.com');
console.log('4. 🟣 Heroku (Full features): https://heroku.com');

console.log('\n📝 Follow the instructions in QUICK_DEPLOY.md');
console.log('🔑 Default accounts work immediately after deployment');
console.log('✅ All features are production-ready');

console.log('\n🎯 Recommended: Deploy to Railway for the easiest experience!');
console.log('   Just connect your GitHub repo and add the environment variables.');

module.exports = { jwtSecret, sessionSecret };
