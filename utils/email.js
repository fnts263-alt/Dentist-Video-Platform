const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendVerificationEmail(user, verificationToken) {
        const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Dentist Platform <noreply@dentistplatform.com>',
            to: user.email,
            subject: 'Verify Your Email - Dentist Video Platform',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                        .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🦷 Dentist Video Platform</h1>
                        </div>
                        <div class="content">
                            <h2>Welcome, Dr. ${user.first_name}!</h2>
                            <p>Thank you for registering with the Dentist Video Platform. To complete your registration and access our educational content, please verify your email address.</p>
                            <p><strong>Your Account Details:</strong></p>
                            <ul>
                                <li>Name: Dr. ${user.first_name} ${user.last_name}</li>
                                <li>Email: ${user.email}</li>
                                <li>Role: ${user.role.replace('_', ' ').toUpperCase()}</li>
                            </ul>
                            <p>Click the button below to verify your email:</p>
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                            <p>If the button doesn't work, copy and paste this link into your browser:</p>
                            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                            <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
                            <p>If you didn't create this account, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Dentist Video Platform. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Verification email sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending verification email:', error);
            return false;
        }
    }

    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Dentist Platform <noreply@dentistplatform.com>',
            to: user.email,
            subject: 'Password Reset - Dentist Video Platform',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .warning { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 6px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🦷 Dentist Video Platform</h1>
                        </div>
                        <div class="content">
                            <h2>Password Reset Request</h2>
                            <p>Hello Dr. ${user.first_name},</p>
                            <p>We received a request to reset your password for your Dentist Video Platform account.</p>
                            <p>Click the button below to reset your password:</p>
                            <a href="${resetUrl}" class="button">Reset Password</a>
                            <p>If the button doesn't work, copy and paste this link into your browser:</p>
                            <p><a href="${resetUrl}">${resetUrl}</a></p>
                            <div class="warning">
                                <strong>Security Notice:</strong>
                                <ul>
                                    <li>This link will expire in 1 hour</li>
                                    <li>If you didn't request this reset, please ignore this email</li>
                                    <li>Your password will remain unchanged until you click the link above</li>
                                </ul>
                            </div>
                        </div>
                        <div class="footer">
                            <p>© 2024 Dentist Video Platform. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Password reset email sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return false;
        }
    }

    async sendWelcomeEmail(user) {
        const loginUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/login`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Dentist Platform <noreply@dentistplatform.com>',
            to: user.email,
            subject: 'Welcome to Dentist Video Platform!',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #059669; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🦷 Dentist Video Platform</h1>
                        </div>
                        <div class="content">
                            <h2>Welcome, Dr. ${user.first_name}!</h2>
                            <p>Your email has been successfully verified! You now have full access to the Dentist Video Platform.</p>
                            
                            <h3>What you can do:</h3>
                            <div class="feature">
                                <strong>📚 Educational Content:</strong> Access our comprehensive library of dental procedure videos
                            </div>
                            <div class="feature">
                                <strong>🔍 Search & Filter:</strong> Find specific procedures and techniques quickly
                            </div>
                            <div class="feature">
                                <strong>📊 Progress Tracking:</strong> Monitor your learning progress and view history
                            </div>
                            <div class="feature">
                                <strong>💬 Discussion:</strong> Engage with other dental professionals
                            </div>
                            
                            <p>Ready to start learning? Click below to access the platform:</p>
                            <a href="${loginUrl}" class="button">Access Platform</a>
                            
                            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Dentist Video Platform. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Welcome email sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return false;
        }
    }

    async sendNotificationEmail(adminEmail, subject, message) {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Dentist Platform <noreply@dentistplatform.com>',
            to: adminEmail,
            subject: `[Dentist Platform] ${subject}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Platform Notification</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🦷 Dentist Video Platform</h1>
                        </div>
                        <div class="content">
                            <h2>${subject}</h2>
                            <p>${message}</p>
                            <p>Please check the admin panel for more details.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Dentist Video Platform. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending notification email:', error);
            return false;
        }
    }

    generateVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = new EmailService();
