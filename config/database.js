const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DB_PATH || './database/dentist_platform.db';
        this.init();
    }

    init() {
        // Ensure database directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        // Users table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'junior_dentist',
                is_verified BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                verification_token TEXT,
                reset_token TEXT,
                reset_token_expires DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);

        // Videos table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                thumbnail_path TEXT,
                file_size INTEGER NOT NULL,
                duration INTEGER,
                category TEXT,
                tags TEXT,
                is_active BOOLEAN DEFAULT 1,
                uploaded_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users (id)
            )
        `);

        // Video views table for analytics
        this.db.run(`
            CREATE TABLE IF NOT EXISTS video_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Activity logs table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id INTEGER,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Categories table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Sessions table for session management
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        console.log('Database tables created successfully');
        this.insertDefaultData();
    }

    insertDefaultData() {
        // Insert default categories
        const categories = [
            'General Dentistry',
            'Orthodontics',
            'Oral Surgery',
            'Periodontics',
            'Endodontics',
            'Prosthodontics',
            'Pediatric Dentistry',
            'Cosmetic Dentistry'
        ];

        categories.forEach(category => {
            this.db.run(
                'INSERT OR IGNORE INTO categories (name) VALUES (?)',
                [category]
            );
        });

        // Create default admin user if not exists
        this.db.get(
            'SELECT id FROM users WHERE role = ?',
            ['admin'],
            (err, row) => {
                if (!err && !row) {
                    const bcrypt = require('bcryptjs');
                    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!@#';
                    const hashedPassword = bcrypt.hashSync(adminPassword, 12);
                    
                    this.db.run(
                        `INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_active) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            process.env.ADMIN_EMAIL || 'admin@dentistplatform.com',
                            hashedPassword,
                            'Admin',
                            'User',
                            'admin',
                            1,
                            1
                        ]
                    );
                    console.log('Default admin user created');
                }
            }
        );

        // Create sample dentist users
        const sampleUsers = [
            {
                email: 'senior@dentistplatform.com',
                password: 'senior123!@#',
                firstName: 'Dr. John',
                lastName: 'Smith',
                role: 'senior_dentist'
            },
            {
                email: 'junior@dentistplatform.com',
                password: 'junior123!@#',
                firstName: 'Dr. Jane',
                lastName: 'Doe',
                role: 'junior_dentist'
            }
        ];

        sampleUsers.forEach(user => {
            this.db.get(
                'SELECT id FROM users WHERE email = ?',
                [user.email],
                (err, row) => {
                    if (!err && !row) {
                        const bcrypt = require('bcryptjs');
                        const hashedPassword = bcrypt.hashSync(user.password, 12);
                        
                        this.db.run(
                            `INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_active) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                user.email,
                                hashedPassword,
                                user.firstName,
                                user.lastName,
                                user.role,
                                1,
                                1
                            ]
                        );
                    }
                }
            );
        });
    }

    // Generic query method
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Generic run method
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Generic get method
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = new Database();
