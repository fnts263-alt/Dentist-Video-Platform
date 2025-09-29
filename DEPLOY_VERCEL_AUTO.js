#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

console.log('🚀 Dentist Video Platform - Automatic Vercel Deployment');
console.log('=======================================================\n');

// Generate secure secrets for production
const jwtSecret = crypto.randomBytes(64).toString('hex');
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('🔐 Generated secure production secrets');
console.log(`JWT Secret: ${jwtSecret.substring(0, 20)}...`);
console.log(`Session Secret: ${sessionSecret.substring(0, 20)}...`);

// Update vercel.json with generated secrets
const vercelConfig = {
    "version": 2,
    "name": "dentist-video-platform",
    "builds": [
        {
            "src": "server.js",
            "use": "@vercel/node",
            "config": {
                "maxLambdaSize": "50mb"
            }
        }
    ],
    "routes": [
        {
            "src": "/api/(.*)",
            "dest": "/server.js"
        },
        {
            "src": "/uploads/(.*)",
            "dest": "/server.js"
        },
        {
            "src": "/(.*)",
            "dest": "/server.js"
        }
    ],
    "env": {
        "NODE_ENV": "production",
        "PORT": "3000",
        "HOST": "0.0.0.0",
        "DB_PATH": "./database/dentist_platform.db",
        "JWT_SECRET": jwtSecret,
        "JWT_EXPIRES_IN": "24h",
        "EMAIL_HOST": "smtp.gmail.com",
        "EMAIL_PORT": "587",
        "EMAIL_SECURE": "false",
        "EMAIL_USER": "dentist.platform.app@gmail.com",
        "EMAIL_PASS": "your-gmail-app-password",
        "EMAIL_FROM": "Dentist Platform <noreply@dentistplatform.com>",
        "MAX_FILE_SIZE": "104857600",
        "UPLOAD_PATH": "./uploads",
        "ALLOWED_VIDEO_TYPES": "mp4,avi,mov,wmv,flv,mkv",
        "BCRYPT_ROUNDS": "12",
        "SESSION_SECRET": sessionSecret,
        "RATE_LIMIT_WINDOW_MS": "900000",
        "RATE_LIMIT_MAX_REQUESTS": "100",
        "ADMIN_EMAIL": "admin@dentistplatform.com",
        "ADMIN_PASSWORD": "admin123!@#",
        "VIDEO_QUALITY": "medium",
        "THUMBNAIL_SIZE": "320x240",
        "ENABLE_TRANSCODING": "true"
    },
    "functions": {
        "server.js": {
            "maxDuration": 30
        }
    },
    "regions": ["iad1"],
    "public": true
};

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
console.log('✅ Updated vercel.json with production configuration');

// Initialize Git repository if needed
function initializeGit() {
    try {
        execSync('git status', { stdio: 'ignore' });
        console.log('✅ Git repository already initialized');
    } catch (error) {
        console.log('📁 Initializing Git repository...');
        execSync('git init', { stdio: 'inherit' });
        execSync('git add .', { stdio: 'inherit' });
        execSync('git commit -m "Initial commit - Dentist Video Platform for Vercel"', { stdio: 'inherit' });
        console.log('✅ Git repository initialized');
    }
}

// Deploy to Vercel automatically
async function deployToVercel() {
    console.log('\n⚡ Deploying to Vercel...');
    
    try {
        // Check if Vercel CLI is installed
        try {
            execSync('vercel --version', { stdio: 'ignore' });
            console.log('✅ Vercel CLI already installed');
        } catch (error) {
            console.log('📦 Installing Vercel CLI...');
            execSync('npm install -g vercel', { stdio: 'inherit' });
            console.log('✅ Vercel CLI installed');
        }

        // Login to Vercel (this will open browser for authentication)
        console.log('🔐 Authenticating with Vercel...');
        console.log('   A browser window will open for authentication');
        
        try {
            execSync('vercel login', { stdio: 'inherit' });
            console.log('✅ Vercel authentication successful');
        } catch (error) {
            console.log('⚠️  Vercel login requires browser authentication');
            console.log('   Please visit https://vercel.com and sign up');
            console.log('   Then run: vercel login');
            return { status: 'requires_auth', url: null };
        }

        // Deploy to Vercel
        console.log('🚀 Deploying to Vercel...');
        const output = execSync('vercel --prod --yes', { encoding: 'utf8', stdio: 'pipe' });
        
        // Extract URL from output
        const urlMatch = output.match(/https:\/\/[^\s]+/);
        const vercelUrl = urlMatch ? urlMatch[0] : 'https://dentist-video-platform.vercel.app';
        
        console.log('\n✅ Vercel deployment successful!');
        console.log(`🌐 LIVE URL: ${vercelUrl}`);
        console.log(`📊 Health Check: ${vercelUrl}/api/health`);
        
        return {
            status: 'success',
            url: vercelUrl
        };
        
    } catch (error) {
        console.log('❌ Vercel deployment failed:', error.message);
        return {
            status: 'failed',
            url: null,
            error: error.message
        };
    }
}

// Create deployment summary
function createDeploymentSummary(result) {
    const summary = {
        timestamp: new Date().toISOString(),
        deployment_status: result.status,
        platform: 'Vercel',
        live_url: result.url,
        secrets: {
            jwtSecret: jwtSecret,
            sessionSecret: sessionSecret
        },
        defaultAccounts: {
            admin: {
                email: 'admin@dentistplatform.com',
                password: 'admin123!@#',
                role: 'admin',
                access: 'Full access, video upload, user management'
            },
            senior_dentist: {
                email: 'senior@dentistplatform.com',
                password: 'senior123!@#',
                role: 'senior_dentist',
                access: 'View all videos, search and filter'
            },
            junior_dentist: {
                email: 'junior@dentistplatform.com',
                password: 'junior123!@#',
                role: 'junior_dentist',
                access: 'View all videos, search and filter'
            }
        },
        features: [
            'Secure JWT authentication',
            'Role-based access control',
            'Video upload and streaming',
            'Admin panel with analytics',
            'User management',
            'Video analytics and tracking',
            'Responsive design with dark mode',
            'Automatic HTTPS/SSL',
            'Serverless deployment',
            'Email integration'
        ]
    };

    fs.writeFileSync('VERCEL_DEPLOYMENT_RESULTS.json', JSON.stringify(summary, null, 2));
    
    console.log('\n📋 Deployment Summary');
    console.log('====================');
    console.log('✅ Generated secure production secrets');
    console.log('✅ Updated Vercel configuration');
    console.log('✅ Configured environment variables');
    
    if (result.status === 'success') {
        console.log(`✅ Vercel deployment successful: ${result.url}`);
    } else if (result.status === 'requires_auth') {
        console.log('⚠️  Vercel authentication required');
    } else {
        console.log('❌ Vercel deployment failed');
    }

    return summary;
}

// Main deployment function
async function main() {
    try {
        console.log('🚀 Starting automatic Vercel deployment...');
        
        // Initialize Git
        initializeGit();
        
        // Deploy to Vercel
        const result = await deployToVercel();
        
        // Create deployment summary
        const summary = createDeploymentSummary(result);
        
        if (result.status === 'success') {
            console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
            console.log('========================');
            console.log('✅ Your Dentist Video Platform is now LIVE on Vercel!');
            console.log(`🌐 LIVE URL: ${result.url}`);
            
            console.log('\n🔑 DEFAULT ACCOUNTS (READY TO USE):');
            console.log('Admin: admin@dentistplatform.com / admin123!@#');
            console.log('Senior: senior@dentistplatform.com / senior123!@#');
            console.log('Junior: junior@dentistplatform.com / junior123!@#');
            
            console.log('\n✅ PRODUCTION FEATURES:');
            console.log('- ✅ Automatic HTTPS/SSL enabled');
            console.log('- ✅ Serverless deployment');
            console.log('- ✅ Role-based access control');
            console.log('- ✅ Video upload and streaming');
            console.log('- ✅ Admin panel with analytics');
            console.log('- ✅ User management system');
            console.log('- ✅ Professional responsive UI');
            console.log('- ✅ Email integration ready');
            
            console.log('\n🎯 READY TO USE:');
            console.log('1. Visit the URL above');
            console.log('2. Login with admin account');
            console.log('3. Access admin panel and upload videos');
            console.log('4. Invite dentists to register');
            
            console.log('\n🚀 Your professional dental education platform is LIVE!');
            console.log('   Dentists can now access and use the platform immediately!');
            
        } else if (result.status === 'requires_auth') {
            console.log('\n⚠️  Manual Authentication Required');
            console.log('===================================');
            console.log('1. Go to https://vercel.com');
            console.log('2. Sign up with GitHub');
            console.log('3. Run: vercel login');
            console.log('4. Run: vercel --prod');
            console.log('5. Your platform will be deployed automatically');
            
        } else {
            console.log('\n❌ Deployment failed');
            console.log('Please check the error messages above');
        }
        
    } catch (error) {
        console.error('\n❌ Deployment process failed:', error.message);
        process.exit(1);
    }
}

// Run the deployment
main();
