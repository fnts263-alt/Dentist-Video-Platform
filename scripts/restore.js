#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Restore script for database and uploads
async function restore(backupPath) {
    console.log('🦷 Dentist Video Platform Restore');
    console.log('==================================\n');

    if (!backupPath) {
        console.error('❌ Please provide a backup path');
        console.log('Usage: node scripts/restore.js <backup-path>');
        process.exit(1);
    }

    try {
        const fullBackupPath = path.resolve(backupPath);
        
        if (!fs.existsSync(fullBackupPath)) {
            console.error(`❌ Backup file not found: ${fullBackupPath}`);
            process.exit(1);
        }

        console.log(`📁 Restoring from: ${fullBackupPath}`);

        // Determine if it's a compressed or uncompressed backup
        let restoreDir;
        
        if (fullBackupPath.endsWith('.tar.gz')) {
            console.log('📦 Extracting compressed backup...');
            
            const extractDir = path.join(__dirname, '..', 'backups', 'temp-restore');
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true, force: true });
            }
            fs.mkdirSync(extractDir, { recursive: true });
            
            await execAsync(`tar -xzf "${fullBackupPath}" -C "${extractDir}"`);
            
            // Find the extracted directory
            const extractedDirs = fs.readdirSync(extractDir);
            if (extractedDirs.length > 0) {
                restoreDir = path.join(extractDir, extractedDirs[0]);
            } else {
                throw new Error('No directories found in extracted backup');
            }
            
            console.log('   ✓ Backup extracted');
        } else {
            restoreDir = fullBackupPath;
        }

        // Check backup info
        const backupInfoPath = path.join(restoreDir, 'backup-info.json');
        if (fs.existsSync(backupInfoPath)) {
            const backupInfo = JSON.parse(fs.readFileSync(backupInfoPath, 'utf8'));
            console.log('\n📋 Backup Information:');
            console.log(`   Date: ${backupInfo.timestamp}`);
            console.log(`   Version: ${backupInfo.version}`);
            console.log(`   Node Version: ${backupInfo.nodeVersion}`);
            console.log(`   Platform: ${backupInfo.platform}`);
        }

        // Confirm restore
        console.log('\n⚠️  WARNING: This will overwrite your current database and uploads!');
        console.log('Make sure you have a current backup before proceeding.');
        
        // In a real implementation, you would want to add a confirmation prompt here
        // For automation purposes, we'll proceed directly
        
        // Stop the application if running (in production, you'd want to handle this properly)
        console.log('\n🛑 Please stop the application before restoring...');
        
        // Restore database
        console.log('🗄️  Restoring database...');
        const dbBackupPath = path.join(restoreDir, 'database.db');
        const dbPath = path.join(__dirname, '..', 'database', 'dentist_platform.db');
        
        if (fs.existsSync(dbBackupPath)) {
            // Ensure database directory exists
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            fs.copyFileSync(dbBackupPath, dbPath);
            console.log('   ✓ Database restored');
        } else {
            console.log('   ⚠️  Database backup not found in restore package');
        }

        // Restore uploads
        console.log('📁 Restoring uploads...');
        const uploadsBackupPath = path.join(restoreDir, 'uploads');
        const uploadsPath = path.join(__dirname, '..', 'uploads');
        
        if (fs.existsSync(uploadsBackupPath)) {
            // Remove existing uploads directory
            if (fs.existsSync(uploadsPath)) {
                fs.rmSync(uploadsPath, { recursive: true, force: true });
            }
            
            // Copy restored uploads
            await copyDirectory(uploadsBackupPath, uploadsPath);
            console.log('   ✓ Uploads restored');
        } else {
            console.log('   ⚠️  Uploads backup not found in restore package');
        }

        // Restore configuration (optional)
        console.log('⚙️  Restoring configuration...');
        const configFiles = ['.env', 'package.json'];
        
        for (const file of configFiles) {
            const sourcePath = path.join(restoreDir, file);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(__dirname, '..', file);
                
                // Create backup of current config
                if (fs.existsSync(destPath)) {
                    fs.copyFileSync(destPath, `${destPath}.backup.${Date.now()}`);
                }
                
                fs.copyFileSync(sourcePath, destPath);
                console.log(`   ✓ ${file} restored (backup created)`);
            }
        }

        // Clean up temp directory
        if (fullBackupPath.endsWith('.tar.gz')) {
            const tempDir = path.join(__dirname, '..', 'backups', 'temp-restore');
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }

        console.log('\n✅ Restore completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Review your configuration files');
        console.log('   2. Install dependencies: npm install');
        console.log('   3. Start the application: npm start');
        console.log('   4. Verify that all data has been restored correctly');

    } catch (error) {
        console.error('\n❌ Restore failed:', error.message);
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

// Run restore
if (require.main === module) {
    const backupPath = process.argv[2];
    restore(backupPath);
}

module.exports = { restore };
