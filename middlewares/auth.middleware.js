// src/middlewares/auth.middleware.js
'use strict';

const JwtUtil = require('../utils/jwt.util');

/**
 * Check apakah email termasuk dalam daftar admin
 * @param {string} email - Email user
 * @returns {boolean} true jika email ada di ADMIN_EMAILS
 */
function isAdminEmail(email) {
    const adminEnv = process.env.ADMIN_EMAILS || '';
    if (!email || !adminEnv) return false;

    const admins = adminEnv
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    return admins.includes(email.toLowerCase());
}

/**
 * Auth Middleware
 * Middleware untuk verify JWT token dan protect routes
 * 
 * USAGE:
 * fastify.get('/protected', { preHandler: authMiddleware }, handler)
 */

/**
 * Authenticate user middleware
 * Verifies JWT token from cookie or Authorization header
 */
async function authMiddleware(request, reply) {
    try {
        // Helper untuk menangani unauthorized (redirect untuk page, JSON untuk API)
        const handleUnauthorized = (message, code) => {
            const url = request.raw.url || request.url || '';
            const accept = request.headers['accept'] || '';
            const isApi = url.startsWith('/api');
            const isAuthRoute = url.startsWith('/auth');
            const wantsHtml = accept.includes('text/html');

            // Untuk request halaman (GET HTML, bukan /api, bukan /auth), redirect ke halaman login
            if (!isApi && !isAuthRoute && request.method === 'GET' && wantsHtml) {
                return reply.redirect('/auth');
            }

            // Selain itu (API / auth routes / non-HTML) kembalikan JSON 401
            const payload = {
                success: false,
                message
            };

            if (code) {
                payload.code = code;
            }

            return reply.code(401).send(payload);
        };

        // 1. Get token from cookie or Authorization header
        let token = request.cookies.accessToken;

        if (!token) {
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        // 2. Check if token exists
        if (!token) {
            return handleUnauthorized('Authentication required. Please login.');
        }

        // 3. Verify token
        const decoded = JwtUtil.verify(token);

        // 4. Check token type
        if (decoded.type !== 'access') {
            return handleUnauthorized('Invalid token type');
        }

        // 5. Attach user data to request
        request.user = {
            userId: decoded.userId,
            email: decoded.email,
            fullName: decoded.fullName,
            isAdmin: isAdminEmail(decoded.email)
        };

        // Continue to next handler
    } catch (error) {
        request.log.error(error);

        // Handle specific JWT errors
        if (error.message === 'Token has expired') {
            const handleUnauthorized = (message, code) => {
                const url = request.raw.url || request.url || '';
                const accept = request.headers['accept'] || '';
                const isApi = url.startsWith('/api');
                const isAuthRoute = url.startsWith('/auth');
                const wantsHtml = accept.includes('text/html');

                if (!isApi && !isAuthRoute && request.method === 'GET' && wantsHtml) {
                    return reply.redirect('/auth');
                }

                const payload = {
                    success: false,
                    message
                };

                if (code) {
                    payload.code = code;
                }

                return reply.code(401).send(payload);
            };

            return handleUnauthorized(
                'Token has expired. Please refresh your token.',
                'TOKEN_EXPIRED'
            );
        }

        if (error.message === 'Invalid token') {
            const handleUnauthorized = (message, code) => {
                const url = request.raw.url || request.url || '';
                const accept = request.headers['accept'] || '';
                const isApi = url.startsWith('/api');
                const isAuthRoute = url.startsWith('/auth');
                const wantsHtml = accept.includes('text/html');

                if (!isApi && !isAuthRoute && request.method === 'GET' && wantsHtml) {
                    return reply.redirect('/auth');
                }

                const payload = {
                    success: false,
                    message
                };

                if (code) {
                    payload.code = code;
                }

                return reply.code(401).send(payload);
            };

            return handleUnauthorized(
                'Invalid token. Please login again.',
                'INVALID_TOKEN'
            );
        }

        const url = request.raw.url || request.url || '';
        const accept = request.headers['accept'] || '';
        const isApi = url.startsWith('/api');
        const isAuthRoute = url.startsWith('/auth');
        const wantsHtml = accept.includes('text/html');

        if (!isApi && !isAuthRoute && request.method === 'GET' && wantsHtml) {
            return reply.redirect('/auth');
        }

        return reply.code(401).send({
            success: false,
            message: 'Authentication failed'
        });
    }
}

/**
 * Optional auth middleware
 * Verifies token if exists, but doesn't block if missing
 * Useful for routes that work for both authenticated and guest users
 */
async function optionalAuthMiddleware(request, reply) {
    try {
        let token = request.cookies.accessToken;

        if (!token) {
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (token) {
            const decoded = JwtUtil.verify(token);

            if (decoded.type === 'access') {
                request.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    fullName: decoded.fullName,
                    isAdmin: isAdminEmail(decoded.email)
                };
            }
        }
    } catch (error) {
        // Just log error but don't block request
        request.log.warn('Optional auth failed:', error.message);
    }
}

/**
 * Check if user is verified
 * Must be used after authMiddleware
 */
async function verifiedUserMiddleware(request, reply) {
    // This would require getting user from database
    // For now, just pass through
    // TODO: Implement check email_verified from database
}

/**
 * Rate limiting middleware for auth routes
 * Prevents brute force attacks
 */
function createRateLimiter(options = {}) {
    const maxAttempts = options.maxAttempts || 3;
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    const attempts = new Map();

    return async function rateLimitMiddleware(request, reply) {
        const key = request.ip; // or use email from body
        const now = Date.now();

        // Clean old attempts
        for (const [ip, data] of attempts.entries()) {
            if (now - data.firstAttempt > windowMs) {
                attempts.delete(ip);
            }
        }

        // Check current attempts
        const userAttempts = attempts.get(key);

        if (!userAttempts) {
            attempts.set(key, {
                count: 1,
                firstAttempt: now
            });
        } else {
            userAttempts.count++;

            if (userAttempts.count > maxAttempts) {
                const timeLeft = Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000 / 60);

                return reply.code(429).send({
                    success: false,
                    message: `Too many login attempts. Please try again in ${timeLeft} minutes.`
                });
            }
        }
    };
}

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    verifiedUserMiddleware,
    createRateLimiter
};
