const nodemailer = require('nodemailer');

/**
 * Email Service Utility
 * Handles sending emails for verification, notifications, etc.
 */

// Create reusable transporter
// NOTE: Configure these with your actual email service credentials
const createTransporter = () => {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  SMTP credentials not configured. Email sending will fail.');
        console.warn('   Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env file');
    }

    const config = {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: (process.env.SMTP_PASS || '').trim()
        },
        debug: process.env.NODE_ENV !== 'production', // Enable debug in dev
        logger: process.env.NODE_ENV !== 'production'  // Log to console in dev
    };

    console.log(`📧 Email transporter created: ${config.host}:${config.port} (user: ${config.auth.user})`);

    return nodemailer.createTransport(config);
};

/**
 * Send verification email to user
 * @param {string} to - Recipient email address
 * @param {string} userName - User's name
 * @param {string} verificationToken - Token for verification
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<Object>} Email send result
 */
async function sendVerificationEmail(to, userName, verificationToken, baseUrl) {
    try {
        console.log(`\n📧 Attempting to send verification email to: ${to}`);
        console.log(`   User: ${userName}`);
        console.log(`   Base URL: ${baseUrl}`);

        const transporter = createTransporter();

        // Verify SMTP connection before sending
        try {
            await transporter.verify();
            console.log('✅ SMTP connection verified successfully');
        } catch (verifyError) {
            console.error('❌ SMTP connection verification failed:', verifyError.message);
            throw new Error(`SMTP connection failed: ${verifyError.message}`);
        }

        const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: `"Barterin" <${process.env.SMTP_USER}>`,
            to: to,
            subject: 'Verifikasi Email Anda - Barterin',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 8px 8px 0 0;
                        }
                        .content {
                            background: #f9f9f9;
                            padding: 30px;
                            border-radius: 0 0 8px 8px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 6px;
                            margin: 20px 0;
                            font-weight: bold;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            color: #666;
                            font-size: 12px;
                        }
                        .warning {
                            background: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Selamat Datang di Barterin!</h1>
                        </div>
                        <div class="content">
                            <p>Halo <strong>${userName}</strong>,</p>

                            <p>Terima kasih telah mendaftar di Barterin! Untuk melengkapi proses registrasi Anda, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>

                            <div style="text-align: center;">
                                <a href="${verificationUrl}" class="button">
                                    ✅ Verifikasi Email Saya
                                </a>
                            </div>

                            <p>Atau copy dan paste link berikut ke browser Anda:</p>
                            <p style="background: white; padding: 15px; border-radius: 4px; word-break: break-all;">
                                <code>${verificationUrl}</code>
                            </p>

                            <div class="warning">
                                <strong>⚠️ Perhatian:</strong>
                                <ul>
                                    <li>Link verifikasi ini akan <strong>kadaluarsa dalam 24 jam</strong></li>
                                    <li>Jika Anda tidak mendaftar di Barterin, abaikan email ini</li>
                                    <li>Jangan bagikan link ini kepada siapapun</li>
                                </ul>
                            </div>

                            <p>Setelah email Anda terverifikasi, Anda dapat:</p>
                            <ul>
                                <li>✅ Menambahkan item barang atau jasa untuk di-barter</li>
                                <li>✅ Mencari dan menawarkan barter kepada pengguna lain</li>
                                <li>✅ Berkomunikasi dengan pengguna lain melalui sistem pesan</li>
                                <li>✅ Memberikan review setelah transaksi</li>
                            </ul>

                            <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>

                            <p>Salam hangat,<br>
                            <strong>Tim Barterin</strong></p>
                        </div>
                        <div class="footer">
                            <p>© 2025 Barterin. All rights reserved.</p>
                            <p>Email ini dikirim otomatis, mohon tidak membalas email ini.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        console.log('📤 Sending email...');
        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Verification email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);

        // For development: Log preview URL (Ethereal)
        if (process.env.NODE_ENV !== 'production') {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log(`   Preview URL: ${previewUrl}`);
            }
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };
    } catch (error) {
        console.error('\n❌ Error sending verification email:');
        console.error(`   Error code: ${error.code || 'UNKNOWN'}`);
        console.error(`   Error message: ${error.message}`);

        // Provide specific error messages
        let userMessage = 'Failed to send verification email. ';
        if (error.code === 'EAUTH') {
            userMessage += 'Email authentication failed. Please check SMTP credentials.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            userMessage += 'Cannot connect to email server. Please check your internet connection.';
        } else {
            userMessage += error.message;
        }

        throw new Error(userMessage);
    }
}

/**
 * Send email verification reminder
 * @param {string} to - Recipient email
 * @param {string} userName - User's name
 * @param {string} verificationToken - New token
 * @param {string} baseUrl - Base URL
 * @returns {Promise<Object>}
 */
async function sendVerificationReminder(to, userName, verificationToken, baseUrl) {
    try {
        const transporter = createTransporter();
        const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: `"Barterin" <${process.env.EMAIL_FROM || 'noreply@barterin.com'}>`,
            to: to,
            subject: 'Reminder: Verifikasi Email Anda',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>🔔 Reminder: Verifikasi Email</h2>
                        </div>
                        <div class="content">
                            <p>Halo <strong>${userName}</strong>,</p>
                            <p>Kami perhatikan bahwa Anda belum memverifikasi email Anda. Silakan klik tombol di bawah untuk verifikasi:</p>
                            <div style="text-align: center;">
                                <a href="${verificationUrl}" class="button">Verifikasi Sekarang</a>
                            </div>
                            <p>Link: <code>${verificationUrl}</code></p>
                            <p>Salam,<br>Tim Barterin</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending reminder:', error);
        throw error;
    }
}

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} userName - User's name
 * @param {string} resetToken - Reset token
 * @param {string} baseUrl - Base URL
 * @returns {Promise<Object>}
 */
async function sendPasswordResetEmail(to, userName, resetToken, baseUrl) {
    // Implementasi pengiriman email reset password
    return { success: false, message: 'Feature not yet available' };
}

module.exports = {
    sendVerificationEmail,
    sendVerificationReminder,
    sendPasswordResetEmail
};
