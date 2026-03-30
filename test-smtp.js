// Quick SMTP diagnostic test
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
    console.log('=== SMTP DIAGNOSTIC TEST ===\n');

    // 1. Check env vars
    console.log('1. Environment Variables:');
    console.log(`   SMTP_HOST: "${process.env.SMTP_HOST}"`);
    console.log(`   SMTP_PORT: "${process.env.SMTP_PORT}"`);
    console.log(`   SMTP_USER: "${process.env.SMTP_USER}"`);
    console.log(`   SMTP_PASS: "${process.env.SMTP_PASS}" (length: ${(process.env.SMTP_PASS || '').length})`);
    console.log(`   SMTP_PASS has trailing space: ${(process.env.SMTP_PASS || '').endsWith(' ')}`);
    console.log(`   EMAIL_FROM: "${process.env.EMAIL_FROM}"`);
    console.log(`   BASE_URL: "${process.env.BASE_URL}"`);
    console.log('');

    // 2. Create transporter
    console.log('2. Creating transporter...');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: (process.env.SMTP_PASS || '').trim()
        }
    });

    // 3. Verify connection
    console.log('\n3. Verifying SMTP connection...');
    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully!');
    } catch (error) {
        console.error('❌ SMTP connection FAILED!');
        console.error(`   Code: ${error.code}`);
        console.error(`   Message: ${error.message}`);
        console.error(`   Response: ${error.response}`);
        console.error(`   ResponseCode: ${error.responseCode}`);
        return;
    }

    // 4. Send test email
    console.log('\n4. Sending test email...');
    try {
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER,
            subject: 'SMTP Test - Barterin',
            text: 'If you receive this, SMTP is working!',
            html: '<b>If you receive this, SMTP is working!</b>'
        });
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
    } catch (error) {
        console.error('❌ Send email FAILED!');
        console.error(`   Code: ${error.code}`);
        console.error(`   Message: ${error.message}`);
        console.error(`   Response: ${error.response}`);
    }
}

testSMTP().catch(console.error);
