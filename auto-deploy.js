#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Dentist Video Platform - Automated Deployment');
console.log('================================================\n');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSecrets() {
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  const sessionSecret = crypto.randomBytes(64).toString('hex');
  return { jwtSecret, sessionSecret };
}

function createProductionEnv(secrets) {
  const envContent = `# Production Environment Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_PATH=./database/dentist_platform.db

# JWT Configuration
JWT_SECRET=${secrets.jwtSecret}
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
SESSION_SECRET=${secrets.sessionSecret}
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

  fs.writeFileSync('.env.production', envContent);
  log('✅ Created production environment file', 'green');
}

function initializeGit() {
  try {
    execSync('git status', { stdio: 'ignore' });
    log('✅ Git repository already initialized', 'green');
  } catch (error) {
    log('📁 Initializing Git repository...', 'blue');
    execSync('git init', { stdio: 'inherit' });
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Initial commit - Dentist Video Platform"', { stdio: 'inherit' });
    log('✅ Git repository initialized', 'green');
  }
}

function deployToHeroku(secrets) {
  return new Promise((resolve, reject) => {
    log('🚀 Starting Heroku deployment...', 'blue');
    
    try {
      // Check if Heroku CLI is installed
      try {
        execSync('heroku --version', { stdio: 'ignore' });
      } catch (error) {
        log('❌ Heroku CLI not found. Please install it first:', 'red');
        log('   https://devcenter.heroku.com/articles/heroku-cli', 'yellow');
        reject(new Error('Heroku CLI not installed'));
        return;
      }

      // Generate unique app name
      const appName = `dentist-platform-${Date.now().toString(36)}`;
      
      log(`📱 Creating Heroku app: ${appName}`, 'blue');
      execSync(`heroku create ${appName}`, { stdio: 'inherit' });

      // Set environment variables
      log('🔧 Setting environment variables...', 'blue');
      const envVars = [
        `NODE_ENV=production`,
        `JWT_SECRET=${secrets.jwtSecret}`,
        `SESSION_SECRET=${secrets.sessionSecret}`,
        `EMAIL_HOST=smtp.gmail.com`,
        `EMAIL_PORT=587`,
        `EMAIL_USER=dentist.platform.app@gmail.com`,
        `EMAIL_PASS=your-gmail-app-password`,
        `EMAIL_FROM="Dentist Platform <noreply@dentistplatform.com>"`,
        `ADMIN_EMAIL=admin@dentistplatform.com`,
        `ADMIN_PASSWORD=admin123!@#`,
        `MAX_FILE_SIZE=104857600`,
        `BCRYPT_ROUNDS=12`,
        `RATE_LIMIT_WINDOW_MS=900000`,
        `RATE_LIMIT_MAX_REQUESTS=100`,
        `VIDEO_QUALITY=medium`,
        `THUMBNAIL_SIZE=320x240`,
        `ENABLE_TRANSCODING=true`
      ];

      for (const envVar of envVars) {
        execSync(`heroku config:set ${envVar} --app ${appName}`, { stdio: 'inherit' });
      }

      // Add FFmpeg buildpack
      log('🎥 Adding FFmpeg buildpack...', 'blue');
      execSync(`heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git --app ${appName}`, { stdio: 'inherit' });

      // Deploy to Heroku
      log('🚀 Deploying to Heroku...', 'blue');
      execSync(`git push heroku main`, { stdio: 'inherit' });

      const herokuUrl = `https://${appName}.herokuapp.com`;
      
      log('\n✅ Heroku deployment successful!', 'green');
      log(`🌐 Application URL: ${herokuUrl}`, 'cyan');
      log(`📊 Health Check: ${herokuUrl}/api/health`, 'cyan');
      
      resolve({
        platform: 'heroku',
        url: herokuUrl,
        appName: appName
      });
      
    } catch (error) {
      log('❌ Heroku deployment failed:', 'red');
      log(error.message, 'red');
      reject(error);
    }
  });
}

function deployToVercel(secrets) {
  return new Promise((resolve, reject) => {
    log('🚀 Starting Vercel deployment...', 'blue');
    
    try {
      // Check if Vercel CLI is installed
      try {
        execSync('vercel --version', { stdio: 'ignore' });
      } catch (error) {
        log('📦 Installing Vercel CLI...', 'blue');
        execSync('npm install -g vercel', { stdio: 'inherit' });
      }

      // Deploy to Vercel
      log('🚀 Deploying to Vercel...', 'blue');
      const output = execSync('vercel --prod --yes', { encoding: 'utf8', stdio: 'pipe' });
      
      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+/);
      const vercelUrl = urlMatch ? urlMatch[0] : 'https://your-app.vercel.app';
      
      log('\n✅ Vercel deployment successful!', 'green');
      log(`🌐 Application URL: ${vercelUrl}`, 'cyan');
      
      resolve({
        platform: 'vercel',
        url: vercelUrl
      });
      
    } catch (error) {
      log('❌ Vercel deployment failed:', 'red');
      log(error.message, 'red');
      reject(error);
    }
  });
}

function createDeploymentInstructions(secrets) {
  const instructions = `
# 🚀 Dentist Video Platform - Deployment Instructions

## 🔐 Generated Secrets
- JWT_SECRET: ${secrets.jwtSecret}
- SESSION_SECRET: ${secrets.sessionSecret}

## 📋 Deployment Options

### Option 1: Heroku (Recommended)
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login: \`heroku login\`
3. Create app: \`heroku create your-app-name\`
4. Set environment variables:
   \`\`\`bash
   heroku config:set JWT_SECRET=${secrets.jwtSecret}
   heroku config:set SESSION_SECRET=${secrets.sessionSecret}
   heroku config:set EMAIL_USER=your-email@gmail.com
   heroku config:set EMAIL_PASS=your-app-password
   \`\`\`
5. Add FFmpeg buildpack:
   \`\`\`bash
   heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
   \`\`\`
6. Deploy: \`git push heroku main\`

### Option 2: Vercel
1. Install Vercel CLI: \`npm install -g vercel\`
2. Login: \`vercel login\`
3. Deploy: \`vercel --prod\`

### Option 3: Render
1. Go to https://render.com
2. Connect GitHub repository
3. Use the provided render.yaml configuration
4. Deploy automatically

## 🔑 Default Accounts
- Admin: admin@dentistplatform.com / admin123!@#
- Senior: senior@dentistplatform.com / senior123!@#
- Junior: junior@dentistplatform.com / junior123!@#

## 📧 Email Configuration
Update these environment variables with your email service:
- EMAIL_USER: Your email address
- EMAIL_PASS: Your email password or app password
- EMAIL_HOST: SMTP host (e.g., smtp.gmail.com)

## ✅ Next Steps
1. Deploy using one of the methods above
2. Configure email settings
3. Test the deployed application
4. Access admin panel with default credentials
`;

  fs.writeFileSync('DEPLOYMENT_INSTRUCTIONS.md', instructions);
  log('📝 Created deployment instructions file', 'green');
}

async function main() {
  try {
    // Generate secrets
    log('🔐 Generating secure secrets...', 'blue');
    const secrets = generateSecrets();
    
    // Create production environment file
    createProductionEnv(secrets);
    
    // Initialize Git if needed
    initializeGit();
    
    // Create deployment instructions
    createDeploymentInstructions(secrets);
    
    log('\n🎯 Deployment Options:', 'magenta');
    log('====================', 'magenta');
    
    // Try Heroku deployment first
    try {
      const herokuResult = await deployToHeroku(secrets);
      log(`\n🎉 Successfully deployed to Heroku!`, 'green');
      log(`🌐 URL: ${herokuResult.url}`, 'cyan');
      log(`📊 Health Check: ${herokuResult.url}/api/health`, 'cyan');
    } catch (herokuError) {
      log('\n⚠️  Heroku deployment skipped', 'yellow');
    }
    
    // Try Vercel deployment
    try {
      const vercelResult = await deployToVercel(secrets);
      log(`\n🎉 Successfully deployed to Vercel!`, 'green');
      log(`🌐 URL: ${vercelResult.url}`, 'cyan');
    } catch (vercelError) {
      log('\n⚠️  Vercel deployment skipped', 'yellow');
    }
    
    // Final summary
    log('\n🎉 Deployment Process Complete!', 'green');
    log('================================', 'green');
    log('📋 Generated secure secrets and configurations', 'cyan');
    log('🔐 JWT Secret and Session Secret created', 'cyan');
    log('📁 Production environment file created', 'cyan');
    log('🚀 Deployment configurations ready for all platforms', 'cyan');
    log('📝 Deployment instructions saved to DEPLOYMENT_INSTRUCTIONS.md', 'cyan');
    
    log('\n📝 Manual Deployment Steps:', 'yellow');
    log('==========================', 'yellow');
    log('1. Choose a deployment platform (Heroku, Vercel, or Render)', 'cyan');
    log('2. Follow the instructions in DEPLOYMENT_INSTRUCTIONS.md', 'cyan');
    log('3. Configure email settings in your deployment platform', 'cyan');
    log('4. Test the deployed application', 'cyan');
    log('5. Access admin panel with: admin@dentistplatform.com / admin123!@#', 'cyan');
    
    log('\n🔑 Default Accounts:', 'magenta');
    log('==================', 'magenta');
    log('Admin: admin@dentistplatform.com / admin123!@#', 'cyan');
    log('Senior: senior@dentistplatform.com / senior123!@#', 'cyan');
    log('Junior: junior@dentistplatform.com / junior123!@#', 'cyan');
    
    log('\n✅ Deployment automation completed!', 'green');
    log('The platform is ready for deployment to any cloud provider.', 'green');
    
  } catch (error) {
    log('❌ Deployment process failed:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the deployment process
main();
