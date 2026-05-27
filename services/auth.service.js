// src/services/auth.service.js
'use strict';

const PasswordUtil = require('../utils/password.util');
const JwtUtil = require('../utils/jwt.util');
const crypto = require('crypto');
const { sendVerificationEmail, sendVerificationReminder } = require('../utils/email');

/**
 * Auth Service
 * Business logic layer untuk authentication
 * 
 * RESPONSIBILITIES:
 * - Orchestrate authentication flow
 * - Password verification
 * - Token generation
 * - Business rules validation
 */

class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Login user
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>} { user, accessToken, refreshToken }
     */
    async login(email, password) {
        // 1. Find user by email
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // 2. Check if user is active
        if (!user.is_active) {
            throw new Error('Account is deactivated. Please contact support.');
        }

        // 2.1. Check if email is verified
        if (!user.email_verified) {
            throw new Error('Please verify your email before logging in. Check your inbox for verification link.');
        }

        // 3. Verify password
        const isPasswordValid = await PasswordUtil.verify(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // 4. Update last login
        await this.userRepository.updateLastLogin(user.user_id);

        // 5. Generate tokens
        const tokenPayload = {
            userId: user.user_id,
            email: user.email,
            fullName: user.full_name
        };

        const accessToken = JwtUtil.generateAccessToken(tokenPayload);
        const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);

        // 6. Remove sensitive data
        delete user.password_hash;

        return {
            user,
            accessToken,
            refreshToken
        };
    }

    /**
     * Register new user
     * @param {Object} userData - { email, password, full_name, phone_number }
     * @param {string} baseUrl - Base URL for verification link
     * @returns {Promise<Object>} { user, message, emailSent }
     */
    async register(userData, baseUrl = null) {
        const { email, password, full_name, phone_number } = userData;

        // 1. Validate password strength
        const passwordValidation = PasswordUtil.validateStrength(password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.errors.join(', '));
        }

        // 2. Check if email already exists
        const emailExists = await this.userRepository.emailExists(email);
        if (emailExists) {
            throw new Error('Email already registered');
        }

        // 3. Hash password
        const password_hash = await PasswordUtil.hash(password);

        // 4. Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // 5. Create user (email_verified = false by default)
        const newUser = await this.userRepository.create({
            email,
            password_hash,
            full_name,
            phone_number,
            verification_token: verificationToken,
            verification_token_expires: tokenExpires
        });

        // 6. Send verification email
        const emailBaseUrl = baseUrl || process.env.BASE_URL || 'http://localhost:3000';
        try {
            console.log(`📧 Preparing to send verification email to: ${email}`);
            console.log(`   Base URL: ${emailBaseUrl}`);
            console.log(`   Token: ${verificationToken.substring(0, 10)}...`);

            await sendVerificationEmail(email, full_name, verificationToken, emailBaseUrl);

            console.log(`✅ Verification email sent successfully to ${email}`);
        } catch (error) {
            console.error('❌ Failed to send verification email:', error.message);
            console.error('   Full error:', error);
            // Don't fail registration if email fails, user can request new verification
        }

        // 7. Return user data (NO tokens until email verified)
        delete newUser.password_hash;
        delete newUser.verification_token;

        return {
            user: newUser,
            message: 'Registration successful! Please check your email to verify your account.',
            emailSent: true
        };
    }

    /**
     * Refresh access token
     * @param {string} refreshToken 
     * @returns {Promise<Object>} { accessToken, refreshToken }
     */
    async refreshToken(refreshToken) {
        try {
            // 1. Verify refresh token
            const decoded = JwtUtil.verify(refreshToken);

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            // 2. Get user from database
            const user = await this.userRepository.findById(decoded.userId);

            if (!user) {
                throw new Error('User not found');
            }

            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // 3. Generate new tokens
            const tokenPayload = {
                userId: user.user_id,
                email: user.email,
                fullName: user.full_name
            };

            const newAccessToken = JwtUtil.generateAccessToken(tokenPayload);
            const newRefreshToken = JwtUtil.generateRefreshToken(tokenPayload);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Get user profile
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async getProfile(userId) {
        const user = await this.userRepository.getProfileWithStats(userId);

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    /**
     * Verify token and get user
     * @param {string} token 
     * @returns {Promise<Object>} User data
     */
    async verifyAndGetUser(token) {
        try {
            const decoded = JwtUtil.verify(token);
            const user = await this.userRepository.findById(decoded.userId);

            if (!user) {
                throw new Error('User not found');
            }

            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            delete user.password_hash;
            return user;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async logout(userId) {
        // Status session handled by client removing tokens
        return true;
    }

    /**
     * Verify email with token
     * @param {string} token - Verification token from email
     * @returns {Promise<Object>} Result
     */
    async verifyEmail(token) {
        // 1. Find user by verification token
        const user = await this.userRepository.findByVerificationToken(token);

        if (!user) {
            throw new Error('Invalid or expired verification token');
        }

        // 2. Check if token is expired
        if (user.verification_token_expires && new Date() > new Date(user.verification_token_expires)) {
            throw new Error('Verification token has expired. Please request a new one.');
        }

        // 3. Check if already verified
        if (user.email_verified) {
            return {
                success: true,
                message: 'Email already verified. You can login now.',
                alreadyVerified: true
            };
        }

        // 4. Mark email as verified
        await this.userRepository.markEmailVerified(user.user_id);

        // 5. Generate login tokens
        const tokenPayload = {
            userId: user.user_id,
            email: user.email,
            fullName: user.full_name
        };

        const accessToken = JwtUtil.generateAccessToken(tokenPayload);
        const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);

        return {
            success: true,
            message: 'Email verified successfully! You can now login.',
            user: {
                userId: user.user_id,
                email: user.email,
                fullName: user.full_name
            },
            accessToken,
            refreshToken
        };
    }

    /**
     * Resend verification email
     * @param {string} email - User email
     * @returns {Promise<Object>} Result
     */
    async resendVerificationEmail(email) {
        // 1. Find user by email
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new Error('Email not found');
        }

        // 2. Check if already verified
        if (user.email_verified) {
            throw new Error('Email already verified. Please login.');
        }

        // 3. Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // 4. Update user with new token
        await this.userRepository.updateVerificationToken(user.user_id, verificationToken, tokenExpires);

        // 5. Send verification email
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        try {
            await sendVerificationReminder(email, user.full_name, verificationToken, baseUrl);
            console.log(`✅ Verification email resent to ${email}`);

            return {
                success: true,
                message: 'Verification email sent! Please check your inbox.'
            };
        } catch (error) {
            console.error('❌ Failed to send verification email:', error);
            throw new Error('Failed to send verification email. Please try again later.');
        }
    }
}

module.exports = AuthService;