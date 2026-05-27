// src/schemas/notification.schema.js
'use strict';

/**
 * Notification Validation Schemas
 * Untuk request body validation menggunakan AJV
 */

const getNotificationsSchema = {
    description: 'Get user notifications with pagination',
    tags: ['Notifications'],
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
                default: 20
            }
        },
        additionalProperties: false
    },
    response: {
        200: {
            description: 'Notifications retrieved',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        notifications: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    notification_id: { type: 'string' },
                                    type_name: { type: 'string' },
                                    title: { type: 'string' },
                                    message: { type: 'string' },
                                    is_read: { type: 'boolean' },
                                    reference_id: { type: 'string' },
                                    reference_type: { type: 'string' },
                                    created_at: { type: 'string', format: 'date-time' }
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
    description: 'Get unread notification count',
    tags: ['Notifications'],
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

const getNotificationsByTypeSchema = {
    description: 'Get notifications by type',
    tags: ['Notifications'],
    params: {
        type: 'object',
        required: ['type_name'],
        properties: {
            type_name: {
                type: 'string',
                enum: [
                    'BARTER_REQUEST',
                    'BARTER_ACCEPTED',
                    'BARTER_REJECTED',
                    'NEW_MESSAGE',
                    'REVIEW_RECEIVED',
                    'ITEM_MATCHED',
                    'SYSTEM'
                ]
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
                default: 20
            }
        },
        additionalProperties: false
    },
    response: {
        200: {
            description: 'Filtered notifications retrieved',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        notifications: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    notification_id: { type: 'string' },
                                    type_name: { type: 'string' },
                                    title: { type: 'string' },
                                    message: { type: 'string' },
                                    is_read: { type: 'boolean' },
                                    reference_id: { type: 'string' },
                                    reference_type: { type: 'string' },
                                    created_at: { type: 'string', format: 'date-time' }
                                }
                            }
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                current_page: { type: 'integer' },
                                items_per_page: { type: 'integer' },
                                has_next: { type: 'boolean' }
                            }
                        }
                    }
                }
            }
        }
    }
};

const getRecentNotificationsSchema = {
    description: 'Get recent notifications for polling',
    tags: ['Notifications'],
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
            description: 'Recent notifications retrieved',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        notifications: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    notification_id: { type: 'string' },
                                    type_name: { type: 'string' },
                                    title: { type: 'string' },
                                    message: { type: 'string' },
                                    is_read: { type: 'boolean' },
                                    reference_id: { type: 'string' },
                                    reference_type: { type: 'string' },
                                    created_at: { type: 'string', format: 'date-time' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

const markAsReadSchema = {
    description: 'Mark notification as read',
    tags: ['Notifications'],
    params: {
        type: 'object',
        required: ['notification_id'],
        properties: {
            notification_id: {
                type: 'string',
                format: 'uuid'
            }
        }
    },
    response: {
        200: {
            description: 'Notification marked as read',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        notification_id: { type: 'string' },
                        is_read: { type: 'boolean' }
                    }
                }
            }
        }
    }
};

const deleteNotificationSchema = {
    description: 'Delete notification',
    tags: ['Notifications'],
    params: {
        type: 'object',
        required: ['notification_id'],
        properties: {
            notification_id: {
                type: 'string',
                format: 'uuid'
            }
        }
    },
    response: {
        200: {
            description: 'Notification deleted',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    }
};

module.exports = {
    getNotificationsSchema,
    getUnreadCountSchema,
    getNotificationsByTypeSchema,
    getRecentNotificationsSchema,
    markAsReadSchema,
    deleteNotificationSchema
};
