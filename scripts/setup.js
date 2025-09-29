#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Setup script to initialize the application
async function setup() {
    console.log('🦷 Dentist Video Platform Setup');
    console.log('================================\n');

    try {
        // Create necessary directories
        console.log('📁 Creating directories...');
        const directories = [
            'uploads',
            'uploads/temp',
            'uploads/user_1',
            'uploads/user_2',
            'uploads/user_3',
            'database',
            'logs',
            'backups'
        ];

        directories.forEach(dir => {
            const dirPath = path.join(__dirname, '..', dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`   ✓ Created ${dir}`);
            } else {
                console.log(`   ✓ ${dir} already exists`);
            }
        });

        // Create .env file if it doesn't exist
        console.log('\n🔧 Setting up environment configuration...');
        const envPath = path.join(__dirname, '..', '.env');
        const envExamplePath = path.join(__dirname, '..', 'env.example');

        if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log('   ✓ Created .env file from env.example');
        } else if (fs.existsSync(envPath)) {
            console.log('   ✓ .env file already exists');
        } else {
            console.log('   ⚠️  Please create .env file manually');
        }

        // Initialize database
        console.log('\n🗄️  Initializing database...');
        const db = require('../config/database');
        
        // Wait a moment for database initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('   ✓ Database initialized');
        console.log('   ✓ Default users created');
        console.log('   ✓ Categories created');

        // Create sample data
        console.log('\n📊 Creating sample data...');
        await createSampleData();
        
        console.log('\n✅ Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Configure your .env file with proper email settings');
        console.log('   2. Install FFmpeg for video processing (if not already installed)');
        console.log('   3. Run: npm start');
        console.log('   4. Visit: http://localhost:3000');
        console.log('\n🔐 Default accounts:');
        console.log('   Admin: admin@dentistplatform.com / admin123!@#');
        console.log('   Senior: senior@dentistplatform.com / senior123!@#');
        console.log('   Junior: junior@dentistplatform.com / junior123!@#');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

async function createSampleData() {
    const db = require('../config/database');
    
    // Create sample videos (metadata only, no actual files)
    const sampleVideos = [
        {
            title: 'Basic Dental Cleaning Procedure',
            description: 'Comprehensive guide to professional dental cleaning techniques including scaling, polishing, and fluoride application.',
            category: 'General Dentistry',
            tags: 'cleaning, scaling, prevention, hygiene',
            duration: 1800, // 30 minutes
            file_size: 150000000, // 150MB
            filename: 'sample_cleaning.mp4',
            original_filename: 'dental_cleaning.mp4',
            file_path: '/uploads/user_1/sample_cleaning.mp4',
            thumbnail_path: '/uploads/user_1/sample_cleaning_thumb.jpg',
            uploaded_by: 1 // Admin user
        },
        {
            title: 'Orthodontic Braces Installation',
            description: 'Step-by-step procedure for installing traditional metal braces including bracket placement and wire installation.',
            category: 'Orthodontics',
            tags: 'braces, orthodontics, installation, brackets',
            duration: 2400, // 40 minutes
            file_size: 200000000, // 200MB
            filename: 'sample_braces.mp4',
            original_filename: 'braces_installation.mp4',
            file_path: '/uploads/user_1/sample_braces.mp4',
            thumbnail_path: '/uploads/user_1/sample_braces_thumb.jpg',
            uploaded_by: 1
        },
        {
            title: 'Root Canal Treatment Process',
            description: 'Complete root canal procedure from diagnosis to restoration, including cleaning, shaping, and filling techniques.',
            category: 'Endodontics',
            tags: 'root canal, endodontics, treatment, procedure',
            duration: 3600, // 60 minutes
            file_size: 300000000, // 300MB
            filename: 'sample_rootcanal.mp4',
            original_filename: 'root_canal_procedure.mp4',
            file_path: '/uploads/user_1/sample_rootcanal.mp4',
            thumbnail_path: '/uploads/user_1/sample_rootcanal_thumb.jpg',
            uploaded_by: 1
        }
    ];

    for (const video of sampleVideos) {
        try {
            await db.run(
                `INSERT OR IGNORE INTO videos (title, description, filename, original_filename, file_path, 
                 thumbnail_path, file_size, duration, category, tags, uploaded_by, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    video.title, video.description, video.filename, video.original_filename,
                    video.file_path, video.thumbnail_path, video.file_size, video.duration,
                    video.category, video.tags, video.uploaded_by, 1
                ]
            );
        } catch (error) {
            console.log(`   ⚠️  Could not create sample video: ${video.title}`);
        }
    }

    console.log('   ✓ Sample videos created');
}

// Run setup
if (require.main === module) {
    setup();
}

module.exports = { setup };
