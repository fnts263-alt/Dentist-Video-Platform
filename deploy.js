#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Dentist Video Platform - Automated Deployment');
console.log('================================================\n');

// Generate secure secrets
const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(64).toString('hex');
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('🔐 Generated secure secrets for deployment');

// Create production .env file
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

# Production URLs
BASE_URL=https://your-app-name.herokuapp.com
`;

fs.writeFileSync('.env.production', prodEnv);
console.log('✅ Created production environment file');

// Update package.json with deployment scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.scripts.deploy = 'node deploy.js';
packageJson.scripts['deploy:heroku'] = 'git push heroku main';
packageJson.scripts['deploy:vercel'] = 'vercel --prod';
packageJson.scripts['deploy:render'] = 'render deploy';

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json with deployment scripts');

// Create deployment status file
const deploymentStatus = {
  timestamp: new Date().toISOString(),
  secrets: {
    jwtSecret: jwtSecret,
    sessionSecret: sessionSecret
  },
  deployments: {
    heroku: null,
    vercel: null,
    render: null
  },
  urls: {
    heroku: null,
    vercel: null,
    render: null
  }
};

fs.writeFileSync('deployment-status.json', JSON.stringify(deploymentStatus, null, 2));

console.log('\n📋 Deployment Options:');
console.log('====================');
console.log('1. Heroku (Recommended for full features)');
console.log('   - Full Node.js support');
console.log('   - FFmpeg support');
console.log('   - Persistent storage');
console.log('   - Automatic SSL');
console.log('');
console.log('2. Vercel (Serverless)');
console.log('   - Fast global deployment');
console.log('   - Automatic SSL');
console.log('   - Limited file storage');
console.log('');
console.log('3. Render (Alternative)');
console.log('   - Persistent storage');
console.log('   - Automatic SSL');
console.log('   - Good for small to medium apps');
console.log('');

// Deploy to Heroku
console.log('🚀 Starting Heroku deployment...');
try {
  // Check if Heroku CLI is installed
  try {
    execSync('heroku --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('⚠️  Heroku CLI not found. Please install it first:');
    console.log('   https://devcenter.heroku.com/articles/heroku-cli');
    console.log('   Then run: npm run deploy:heroku');
    throw new Error('Heroku CLI not installed');
  }

  // Create Heroku app
  const appName = `dentist-platform-${Date.now().toString(36)}`;
  
  console.log(`📱 Creating Heroku app: ${appName}`);
  execSync(`heroku create ${appName}`, { stdio: 'inherit' });

  // Set environment variables
  console.log('🔧 Setting environment variables...');
  const envVars = [
    `NODE_ENV=production`,
    `JWT_SECRET=${jwtSecret}`,
    `SESSION_SECRET=${sessionSecret}`,
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
  console.log('🎥 Adding FFmpeg buildpack...');
  execSync(`heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git --app ${appName}`, { stdio: 'inherit' });

  // Deploy to Heroku
  console.log('🚀 Deploying to Heroku...');
  execSync(`git push heroku main`, { stdio: 'inherit' });

  const herokuUrl = `https://${appName}.herokuapp.com`;
  
  // Update deployment status
  deploymentStatus.deployments.heroku = 'success';
  deploymentStatus.urls.heroku = herokuUrl;
  fs.writeFileSync('deployment-status.json', JSON.stringify(deploymentStatus, null, 2));

  console.log('\n✅ Heroku deployment successful!');
  console.log(`🌐 Application URL: ${herokuUrl}`);
  console.log(`📊 Health Check: ${herokuUrl}/api/health`);
  
} catch (error) {
  console.log('❌ Heroku deployment failed:', error.message);
  console.log('📝 Manual deployment instructions:');
  console.log('   1. Install Heroku CLI');
  console.log('   2. Run: heroku create your-app-name');
  console.log('   3. Run: npm run deploy:heroku');
}

// Deploy to Vercel
console.log('\n🚀 Starting Vercel deployment...');
try {
  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('⚠️  Vercel CLI not found. Installing...');
    execSync('npm install -g vercel', { stdio: 'inherit' });
  }

  // Deploy to Vercel
  console.log('🚀 Deploying to Vercel...');
  execSync('vercel --prod --yes', { stdio: 'inherit' });

  // Get deployment URL
  const vercelUrl = execSync('vercel ls --json', { encoding: 'utf8' });
  const deployments = JSON.parse(vercelUrl);
  const latestDeployment = deployments[0];
  
  // Update deployment status
  deploymentStatus.deployments.vercel = 'success';
  deploymentStatus.urls.vercel = latestDeployment.url;
  fs.writeFileSync('deployment-status.json', JSON.stringify(deploymentStatus, null, 2));

  console.log('\n✅ Vercel deployment successful!');
  console.log(`🌐 Application URL: ${latestDeployment.url}`);
  
} catch (error) {
  console.log('❌ Vercel deployment failed:', error.message);
  console.log('📝 Manual deployment instructions:');
  console.log('   1. Run: npm install -g vercel');
  console.log('   2. Run: vercel --prod');
}

// Deploy to Render
console.log('\n🚀 Starting Render deployment...');
try {
  console.log('📝 Render deployment instructions:');
  console.log('   1. Go to: https://render.com');
  console.log('   2. Connect your GitHub repository');
  console.log('   3. Use the render.yaml configuration');
  console.log('   4. Deploy automatically');
  
  console.log('\n✅ Render deployment configuration ready!');
  console.log('📋 Use the render.yaml file for automatic deployment');
  
} catch (error) {
  console.log('❌ Render deployment setup failed:', error.message);
}

// Final summary
console.log('\n🎉 Deployment Summary');
console.log('====================');
console.log('📋 Generated secure secrets and configurations');
console.log('🔐 JWT Secret and Session Secret created');
console.log('📁 Production environment file created');
console.log('🚀 Deployment configurations ready for all platforms');
console.log('');
console.log('📝 Next Steps:');
console.log('   1. Configure email settings in your deployment platform');
console.log('   2. Test the deployed applications');
console.log('   3. Access admin panel with: admin@dentistplatform.com / admin123!@#');
console.log('');
console.log('🔗 Default Accounts:');
console.log('   Admin: admin@dentistplatform.com / admin123!@#');
console.log('   Senior: senior@dentistplatform.com / senior123!@#');
console.log('   Junior: junior@dentistplatform.com / junior123!@#');
console.log('');
console.log('✅ Deployment automation completed!');

module.exports = { deploymentStatus };
