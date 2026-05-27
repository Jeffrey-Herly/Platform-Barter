// src/controllers/auth.controller.js
'use strict';

/**
 * Auth Controller
 * Handles HTTP requests dan responses untuk authentication
 * 
 * RESPONSIBILITIES:
 * - Validate request data
 * - Call service layer
 * - Format response
 * - Handle errors
 */

class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * Login handler
     * POST /auth/login
     */
    async login(request, reply) {
        try {
            const { email, password, remember } = request.body;

            // Validate input
            if (!email || !password) {
                return reply.code(400).send({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            // Call service
            const result = await this.authService.login(email, password);

            // Set cookie options
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // HTTPS only in production
                sameSite: 'lax',
                path: '/',
                maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000 // 30 days or 7 days
            };

            // Set tokens in cookies
            console.log("this is debug")
            reply
                .setCookie('accessToken', result.accessToken, cookieOptions)
                .setCookie('refreshToken', result.refreshToken, {
                    ...cookieOptions,
                    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days for refresh token
                });
            console.log("this is my second debug")

            // Send response
            return reply.code(200).send({
                success: true,
                message: 'Login successful',
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken
                }
            });
        } catch (error) {
            request.log.error(error);

            // Return 401 for authentication errors, 500 for server errors
            const statusCode = error.message && error.message.includes('not found') ? 401 : 500;

            return reply.code(statusCode).send({
                success: false,
                message: error.message || 'Login failed'
            });
        }
    }

    /**
     * Register handler
     * POST /auth/register
     */
    async register(request, reply) {
        try {
            const { email, password, full_name, phone_number } = request.body;

            // Validate input
            if (!email || !password || !full_name) {
                return reply.code(400).send({
                    success: false,
                    message: 'Email, password, and full name are required'
                });
            }

            // Get base URL for verification link
            const baseUrl = process.env.BASE_URL || `${request.protocol}://${request.hostname}`;

            // Call service with baseUrl
            const result = await this.authService.register({
                email,
                password,
                full_name,
                phone_number
            }, baseUrl);

            // If email verification is enabled, don't set cookies yet
            if (result.emailSent) {
                // Registration successful but email verification required
                return reply.code(201).send({
                    success: true,
                    message: result.message || 'Registration successful! Please check your email to verify your account.',
                    emailSent: true,
                    data: {
                        email: result.user.email,
                        full_name: result.user.full_name
                    }
                });
            }

            // Legacy: If no email verification, set cookies immediately
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            };

            // Set tokens in cookies
            reply
                .setCookie('accessToken', result.accessToken, cookieOptions)
                .setCookie('refreshToken', result.refreshToken, {
                    ...cookieOptions,
                    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
                });

            // Send response
            return reply.code(201).send({
                success: true,
                message: 'Registration successful',
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken
                }
            });
        } catch (error) {
            request.log.error(error);

            return reply.code(400).send({
                success: false,
                message: error.message || 'Registration failed'
            });
        }
    }

    /**
     * Refresh token handler
     * POST /auth/refresh
     */
    async refreshToken(request, reply) {
        try {
            // Get refresh token from cookie or body
            const refreshToken = request.cookies.refreshToken || request.body.refreshToken;

            if (!refreshToken) {
                return reply.code(401).send({
                    success: false,
                    message: 'Refresh token is required'
                });
            }

            // Call service
            const result = await this.authService.refreshToken(refreshToken);

            // Set new tokens in cookies
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            };

            reply
                .setCookie('accessToken', result.accessToken, cookieOptions)
                .setCookie('refreshToken', result.refreshToken, {
                    ...cookieOptions,
                    maxAge: 30 * 24 * 60 * 60 * 1000
                });

            // Send response
            return reply.code(200).send({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken
                }
            });
        } catch (error) {
            request.log.error(error);

            return reply.code(401).send({
                success: false,
                message: error.message || 'Token refresh failed'
            });
        }
    }

    /**
     * Get profile handler
     * GET /auth/profile
     */
    async getProfile(request, reply) {
        try {
            // User sudah di-inject oleh auth middleware
            const userId = request.user.userId;

            // Call service
            const profile = await this.authService.getProfile(userId);

            // Send response
            return reply.code(200).send({
                success: true,
                message: 'Profile retrieved successfully',
                data: profile
            });
        } catch (error) {
            request.log.error(error);

            return reply.code(404).send({
                success: false,
                message: error.message || 'Profile not found'
            });
        }
    }

    /**
     * Logout handler
     * POST /auth/logout
     */
    async logout(request, reply) {
        try {
            const userId = request.user.userId;

            // Memanggil service untuk proses logout
            await this.authService.logout(userId);

            // Clear cookies
            reply
                .clearCookie('accessToken')
                .clearCookie('refreshToken');

            // Send response
            return reply.code(200).send({
                success: true,
                message: 'Logout successful'
            });
        } catch (error) {
            request.log.error(error);

            return reply.code(500).send({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    /**
     * Check auth status
     * GET /auth/check
     */
    async checkAuth(request, reply) {
        try {
            // If request reaches here, auth middleware already verified token
            return reply.code(200).send({
                success: true,
                message: 'Authenticated',
                data: {
                    user: request.user
                }
            });
        } catch (error) {
            return reply.code(401).send({
                success: false,
                message: 'Not authenticated'
            });
        }
    }
}

module.exports = AuthController;