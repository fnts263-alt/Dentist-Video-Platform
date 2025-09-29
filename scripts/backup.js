#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Backup script for database and uploads
async function backup() {
    console.log('🦷 Dentist Video Platform Backup');
    console.log('=================================\n');

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);
        
        // Create backup directory
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`📁 Creating backup in: ${backupDir}`);

        // Backup database
        console.log('🗄️  Backing up database...');
        const dbPath = path.join(__dirname, '..', 'database', 'dentist_platform.db');
        const dbBackupPath = path.join(backupDir, 'database.db');
        
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, dbBackupPath);
            console.log('   ✓ Database backed up');
        } else {
            console.log('   ⚠️  Database file not found');
        }

        // Backup uploads directory
        console.log('📁 Backing up uploads...');
        const uploadsPath = path.join(__dirname, '..', 'uploads');
        const uploadsBackupPath = path.join(backupDir, 'uploads');
        
        if (fs.existsSync(uploadsPath)) {
            await copyDirectory(uploadsPath, uploadsBackupPath);
            console.log('   ✓ Uploads backed up');
        } else {
            console.log('   ⚠️  Uploads directory not found');
        }

        // Backup configuration
        console.log('⚙️  Backing up configuration...');
        const configFiles = ['.env', 'package.json'];
        
        for (const file of configFiles) {
            const sourcePath = path.join(__dirname, '..', file);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(backupDir, file);
                fs.copyFileSync(sourcePath, destPath);
                console.log(`   ✓ ${file} backed up`);
            }
        }

        // Create backup info file
        const backupInfo = {
            timestamp: new Date().toISOString(),
            version: require('../package.json').version,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        fs.writeFileSync(
            path.join(backupDir, 'backup-info.json'),
            JSON.stringify(backupInfo, null, 2)
        );

        // Compress backup
        console.log('📦 Compressing backup...');
        const compressedPath = `${backupDir}.tar.gz`;
        
        try {
            await execAsync(`tar -czf "${compressedPath}" -C "${path.dirname(backupDir)}" "${path.basename(backupDir)}"`);
            
            // Remove uncompressed directory
            fs.rmSync(backupDir, { recursive: true, force: true });
            
            console.log('   ✓ Backup compressed');
            console.log(`   📁 Backup saved to: ${compressedPath}`);
        } catch (error) {
            console.log('   ⚠️  Could not compress backup, keeping uncompressed');
            console.log(`   📁 Backup saved to: ${backupDir}`);
        }

        // Clean up old backups (keep last 10)
        await cleanupOldBackups();

        console.log('\n✅ Backup completed successfully!');

    } catch (error) {
        console.error('\n❌ Backup failed:', error.message);
        process.exit(1);
    }
}

async function copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}

async function cleanupOldBackups() {
    const backupsDir = path.join(__dirname, '..', 'backups');
    
    if (!fs.existsSync(backupsDir)) {
        return;
    }

    const files = fs.readdirSync(backupsDir)
        .filter(file => file.startsWith('backup-') && (file.endsWith('.tar.gz') || fs.statSync(path.join(backupsDir, file)).isDirectory()))
        .map(file => ({
            name: file,
            path: path.join(backupsDir, file),
            stats: fs.statSync(path.join(backupsDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

    // Keep only the last 10 backups
    if (files.length > 10) {
        const filesToDelete = files.slice(10);
        
        for (const file of filesToDelete) {
            try {
                if (file.stats.isDirectory()) {
                    fs.rmSync(file.path, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(file.path);
                }
                console.log(`   🗑️  Removed old backup: ${file.name}`);
            } catch (error) {
                console.log(`   ⚠️  Could not remove old backup: ${file.name}`);
            }
        }
    }
}

// Run backup
if (require.main === module) {
    backup();
}

module.exports = { backup };
