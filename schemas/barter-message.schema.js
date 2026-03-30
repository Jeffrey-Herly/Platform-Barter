// src/schemas/barter-message.schema.js
'use strict';

/**
 * Barter Message Validation Schemas
 * Untuk request body validation menggunakan AJV
 */

const sendMessageSchema = {
    description: 'Send a message in barter transaction',
    tags: ['Messages'],
    body: {
        type: 'object',
        required: ['transaction_id', 'message_text'],
        properties: {
            transaction_id: {
                type: 'string',
                format: 'uuid',
                description: 'Transaction ID untuk chat room'
            },
            message_text: {
                type: 'string',
                minLength: 1,
                maxLength: 5000,
                description: 'Isi pesan'
            }
        },
        additionalProperties: false
    },
    response: {
        201: {
            description: 'Message sent successfully',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: {
                    type: 'object',
                    properties: {
                        message_id: { type: 'string' },
                        transaction_id: { type: 'string' },
                        sender_id: { type: 'string' },
                        message_text: { type: 'string' },
                        is_read: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                data: {
                    type: 'object',
                    properties: {
                        message_id: { type: 'string' },
                        transaction_id: { type: 'string' },
                        sender_id: { type: 'string' },
                        sender_name: { type: 'string' },
                        sender_avatar: { type: 'string' },
                        message_text: { type: 'string' },
                        is_read: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        400: {
            description: 'Bad request',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    }
};

const getChatHistorySchema = {
    description: 'Get chat history for a transaction',
    tags: ['Messages'],
    params: {
        type: 'object',
        required: ['transaction_id'],
        properties: {
            transaction_id: {
                type: 'string',
                format: 'uuid'
            }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            page: {
                type: 'integer',
                minimum: 1,
                default: 1
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 50
            }
        },
        additionalProperties: false
    },
    response: {
        200: {
            description: 'Chat history retrieved',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        messages: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    message_id: { type: 'string' },
                                    sender_id: { type: 'string' },
                                    sender_name: { type: 'string' },
                                    sender_avatar: { type: 'string' },
                                    message_text: { type: 'string' },
                                    is_read: { type: 'boolean' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    is_own: { type: 'boolean' }
                                }
                            }
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                current_page: { type: 'integer' },
                                total_items: { type: 'integer' },
                                total_pages: { type: 'integer' },
                                items_per_page: { type: 'integer' },
                                has_next: { type: 'boolean' },
                                has_prev: { type: 'boolean' }
                            }
                        }
                    }
                }
            }
        }
    }
};

const getUnreadCountSchema = {
    description: 'Get unread message count',
    tags: ['Messages'],
    params: {
        type: 'object',
        required: ['transaction_id'],
        properties: {
            transaction_id: {
                type: 'string',
                format: 'uuid'
            }
        }
    },
    response: {
        200: {
            description: 'Unread count retrieved',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        unread_count: { type: 'integer' }
                    }
                }
            }
        }
    }
};

const getRecentMessagesSchema = {
    description: 'Get recent messages for polling',
    tags: ['Messages'],
    params: {
        type: 'object',
        required: ['transaction_id'],
        properties: {
            transaction_id: {
                type: 'string',
                format: 'uuid'
            }
        }
    },
    querystring: {
        type: 'object',
        required: ['since'],
        properties: {
            since: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp ISO format'
            }
        },
        additionalProperties: false
    },
    response: {
        200: {
            description: 'Recent messages retrieved',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        messages: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    message_id: { type: 'string' },
                                    sender_id: { type: 'string' },
                                    sender_name: { type: 'string' },
                                    sender_avatar: { type: 'string' },
                                    message_text: { type: 'string' },
                                    is_read: { type: 'boolean' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    is_own: { type: 'boolean' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

module.exports = {
    sendMessageSchema,
    getChatHistorySchema,
    getUnreadCountSchema,
    getRecentMessagesSchema
};
