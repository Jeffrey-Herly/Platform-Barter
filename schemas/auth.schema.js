// src/schemas/auth.schema.js
'use strict';

/**
 * Validation schemas untuk authentication endpoints
 * Menggunakan JSON Schema untuk Fastify validation
 */

const loginSchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                minLength: 5,
                maxLength: 255,
                errorMessage: {
                    format: 'Email must be a valid email address',
                    minLength: 'Email must be at least 5 characters',
                    maxLength: 'Email must not exceed 255 characters'
                }
            },
            password: {
                type: 'string',
                minLength: 8,
                maxLength: 100,
                errorMessage: {
                    minLength: 'Password must be at least 8 characters',
                    maxLength: 'Password must not exceed 100 characters'
                }
            },
            remember: {
                type: 'boolean',
                default: false
            }
        },
        additionalProperties: false
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                user_id: { type: 'string' },
                                email: { type: 'string' },
                                full_name: { type: 'string' },
                                phone_number: { type: ['string', 'null'] },
                                is_active: { type: 'boolean' },
                                email_verified: { type: 'boolean' }
                            }
                        },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' }
                    }
                }
            }
        },
        400: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        },
        401: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    }
};

const registerSchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'full_name'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                minLength: 5,
                maxLength: 255,
                errorMessage: {
                    format: 'Email must be a valid email address',
                    minLength: 'Email must be at least 5 characters',
                    maxLength: 'Email must not exceed 255 characters'
                }
            },
            password: {
                type: 'string',
                minLength: 8,
                maxLength: 100,
                errorMessage: {
                    minLength: 'Password must be at least 8 characters',
                    maxLength: 'Password must not exceed 100 characters'
                }
            },
            full_name: {
                type: 'string',
                minLength: 2,
                maxLength: 255,
                errorMessage: {
                    minLength: 'Full name must be at least 2 characters',
                    maxLength: 'Full name must not exceed 255 characters'
                }
            },
            phone_number: {
                type: 'string',
                pattern: '^\\+?[0-9]{10,15}$',
                errorMessage: {
                    pattern: 'Phone number must be 10-15 digits and may start with +'
                }
            }
        },
        additionalProperties: false
    },
    response: {
        201: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                user_id: { type: 'string' },
                                email: { type: 'string' },
                                full_name: { type: 'string' },
                                phone_number: { type: ['string', 'null'] }
                            }
                        },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' }
                    }
                }
            }
        },
        400: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    }
};

const refreshTokenSchema = {
    body: {
        type: 'object',
        properties: {
            refreshToken: {
                type: 'string'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' }
                    }
                }
            }
        },
        401: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    }
};

module.exports = {
    loginSchema,
    registerSchema,
    refreshTokenSchema
};