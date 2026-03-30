// src/routes/auth.js
'use strict';

const { loginSchema, registerSchema } = require('../schemas/auth.schema.js');
const { authMiddleware, optionalAuthMiddleware, createRateLimiter } = require('../middlewares/auth.middleware.js');

// Rate limiter for login/register
const loginRateLimiter = createRateLimiter({
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
});

module.exports = async function (fastify, opts) {
    // Inject dependencies
    const UserRepository = require('../repositories/user.repository.js');
    const AuthService = require('../services/auth.service.js');
    const AuthController = require('../controllers/auth.controller.js');

    // Initialize dependencies
    const userRepository = new UserRepository(fastify.pg);
    const authService = new AuthService(userRepository);
    const authController = new AuthController(authService);

    // Register routes with /auth prefix
    fastify.register(async function authRoutes(fastify) {
        /**
         * GET /auth
         * Display login page (redirect ke dashboard jika sudah login)
         */
        fastify.get('/', {
            preHandler: [optionalAuthMiddleware]
        }, async function (request, reply) {
            // Jika sudah ada user dari token, langsung arahkan ke dashboard
            if (request.user && request.user.userId) {
                return reply.redirect('/dashboard');
            }

            return reply.view('pages/auth/login.ejs', {
                message: null,
                error: null
            });
        });

        /**
         * POST /auth/login
         * Login endpoint
         */
        fastify.post('/login', {
            schema: loginSchema,
            // preHandler: [loginRateLimiter]
        }, async (request, reply) => {
            return authController.login(request, reply);
        });

        /**
         * GET /auth/register
         * Display register page
         */
        fastify.get('/register', async function (request, reply) {
            return reply.view('pages/auth/register.ejs', {
                message: null,
                error: null
            });
        });

        /**
         * POST /auth/register
         * Register endpoint
         */
        fastify.post('/register', {
            schema: registerSchema,
            preHandler: [loginRateLimiter]
        }, async (request, reply) => {
            return authController.register(request, reply);
        });

        /**
         * POST /auth/refresh
         * Refresh access token
         */
        fastify.post('/refresh', async (request, reply) => {
            return authController.refreshToken(request, reply);
        });

        /**
         * GET /auth/profile
         * Get user profile (Protected route)
         */
        fastify.get('/profile', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return authController.getProfile(request, reply);
        });

        /**
         * POST /auth/logout
         * Logout endpoint (Protected route)
         */
        fastify.post('/logout', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return authController.logout(request, reply);
        });

        /**
         * GET /auth/check
         * Check authentication status
         */
        fastify.get('/check', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return authController.checkAuth(request, reply);
        });

        /**
         * GET /auth/dashboard
         * Example protected page (LEGACY - use /dashboard instead)
         */
        fastify.get('/dashboard', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return reply.view('pages/dashboard.ejs', {
                user: request.user
            });
        });

        // Verify email
        fastify.get('/verify-email', async (request, reply) => {
            const { token } = request.query;
            if (!token) {
                return reply.view('pages/auth/verify-result.ejs', {
                    success: false,
                    message: 'Invalid verification link'
                });
            }

            try {
                const result = await authService.verifyEmail(token);
                return reply.view('pages/auth/verify-result.ejs', {
                    success: true,
                    message: result.message,
                    user: result.user
                });
            } catch (error) {
                return reply.view('pages/auth/verify-result.ejs', {
                    success: false,
                    message: error.message
                });
            }
        });

        // Resend verification
        fastify.post('/resend-verification', async (request, reply) => {
            const { email } = request.body;
            try {
                const result = await authService.resendVerificationEmail(email);
                return reply.send(result);
            } catch (error) {
                return reply.status(400).send({
                    success: false,
                    message: error.message
                });
            }
        });


    }, { prefix: '/auth' });
};
