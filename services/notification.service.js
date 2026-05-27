// src/services/notification.service.js
'use strict';

/**
 * Notification Service
 * Business logic untuk notifikasi real-time ke user
 *
 * RESPONSIBILITIES:
 * - Create notifications untuk berbagai events
 * - Format notification messages
 * - Handle notification logic
 * - Clean up old notifications
 */

class NotificationService {
    constructor(notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * Create notification untuk new message
     * @param {string} user_id - UUID (recipient)
     * @param {string} transaction_id - UUID
     * @param {string} sender_id - UUID (who sent the message)
     * @returns {Promise<object>} Created notification
     */
    async createNewMessageNotification(user_id, transaction_id, sender_id) {
        try {
            const typeData = await this.notificationRepository.getNotificationTypeByName('NEW_MESSAGE');
            if (!typeData) {
                throw new Error('Notification type NEW_MESSAGE tidak ditemukan');
            }

            return await this.notificationRepository.create({
                user_id,
                type_id: typeData.type_id,
                title: 'Pesan Baru',
                message: 'Anda menerima pesan baru dalam negosiasi barter',
                reference_id: transaction_id,
                reference_type: 'TRANSACTION'
            });
        } catch (error) {
            console.error('Error creating new message notification:', error);
            // Log error without interrupting main flow
            return null;
        }
    }

    /**
     * Create notification untuk new barter request
     * @param {string} user_id - UUID (recipient - owner of item)
     * @param {string} transaction_id - UUID
     * @param {string} requester_name - String
     * @returns {Promise<object>} Created notification
     */
    async createBarterRequestNotification(user_id, transaction_id, requester_name) {
        try {
            const typeData = await this.notificationRepository.getNotificationTypeByName('BARTER_REQUEST');
            if (!typeData) {
                throw new Error('Notification type BARTER_REQUEST tidak ditemukan');
            }

            return await this.notificationRepository.create({
                user_id,
                type_id: typeData.type_id,
                title: 'Permintaan Barter Baru',
                message: `${requester_name} membuat penawaran barter untuk item Anda`,
                reference_id: transaction_id,
                reference_type: 'TRANSACTION'
            });
        } catch (error) {
            console.error('Error creating barter request notification:', error);
            return null;
        }
    }

    /**
     * Create notification untuk barter accepted
     * @param {string} user_id - UUID (recipient - requester)
     * @param {string} transaction_id - UUID
     * @param {string} owner_name - String
     * @returns {Promise<object>} Created notification
     */
    async createBarterAcceptedNotification(user_id, transaction_id, owner_name) {
        try {
            const typeData = await this.notificationRepository.getNotificationTypeByName('BARTER_ACCEPTED');
            if (!typeData) {
                throw new Error('Notification type BARTER_ACCEPTED tidak ditemukan');
            }

            return await this.notificationRepository.create({
                user_id,
                type_id: typeData.type_id,
                title: 'Penawaran Diterima',
                message: `${owner_name} menerima penawaran barter Anda`,
                reference_id: transaction_id,
                reference_type: 'TRANSACTION'
            });
        } catch (error) {
            console.error('Error creating barter accepted notification:', error);
            return null;
        }
    }

    /**
     * Create notification untuk barter rejected
     * @param {string} user_id - UUID (recipient - requester)
     * @param {string} transaction_id - UUID
     * @param {string} owner_name - String
     * @returns {Promise<object>} Created notification
     */
    async createBarterRejectedNotification(user_id, transaction_id, owner_name) {
        try {
            const typeData = await this.notificationRepository.getNotificationTypeByName('BARTER_REJECTED');
            if (!typeData) {
                throw new Error('Notification type BARTER_REJECTED tidak ditemukan');
            }

            return await this.notificationRepository.create({
                user_id,
                type_id: typeData.type_id,
                title: 'Penawaran Ditolak',
                message: `${owner_name} menolak penawaran barter Anda`,
                reference_id: transaction_id,
                reference_type: 'TRANSACTION'
            });
        } catch (error) {
            console.error('Error creating barter rejected notification:', error);
            return null;
        }
    }

    /**
     * Create system notification
     * @param {string} user_id - UUID
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} reference_id - Optional UUID (entity ID)
     * @param {string} reference_type - Optional string (entity type)
     * @returns {Promise<object>} Created notification
     */
    async createSystemNotification(user_id, title, message, reference_id = null, reference_type = null) {
        try {
            const typeData = await this.notificationRepository.getNotificationTypeByName('SYSTEM');
            if (!typeData) {
                throw new Error('Notification type SYSTEM tidak ditemukan');
            }

            return await this.notificationRepository.create({
                user_id,
                type_id: typeData.type_id,
                title,
                message,
                reference_id,
                reference_type
            });
        } catch (error) {
            console.error('Error creating system notification:', error);
            return null;
        }
    }

    /**
     * Get all notifications untuk user dengan pagination
     * @param {string} user_id - UUID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<object>} Paginated notifications
     */
    async getUserNotifications(user_id, page = 1, limit = 20) {
        try {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 100) limit = 20;

            const offset = (page - 1) * limit;

            const notifications = await this.notificationRepository.findByUserId(
                user_id,
                limit,
                offset
            );

            const total = await this.notificationRepository.getCountByUserId(user_id);

            return {
                success: true,
                data: {
                    notifications: notifications.map(notif => ({
                        notification_id: notif.notification_id,
                        type_name: notif.type_name,
                        title: notif.title,
                        message: notif.message,
                        is_read: notif.is_read,
                        reference_id: notif.reference_id,
                        reference_type: notif.reference_type,
                        created_at: notif.created_at
                    })),
                    pagination: {
                        current_page: page,
                        total_items: total,
                        total_pages: Math.ceil(total / limit),
                        items_per_page: limit,
                        has_next: page < Math.ceil(total / limit),
                        has_prev: page > 1
                    }
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get unread notification count
     * @param {string} user_id - UUID
     * @returns {Promise<object>} Unread count
     */
    async getUnreadCount(user_id) {
        try {
            const count = await this.notificationRepository.getUnreadCount(user_id);
            return {
                success: true,
                data: {
                    unread_count: count
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get notifications by type (filter)
     * @param {string} user_id - UUID
     * @param {string} type_name - Notification type
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<object>} Filtered notifications
     */
    async getNotificationsByType(user_id, type_name, page = 1, limit = 20) {
        try {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 100) limit = 20;

            const offset = (page - 1) * limit;

            const notifications = await this.notificationRepository.findByUserIdAndType(
                user_id,
                type_name,
                limit,
                offset
            );

            return {
                success: true,
                data: {
                    notifications: notifications.map(notif => ({
                        notification_id: notif.notification_id,
                        type_name: notif.type_name,
                        title: notif.title,
                        message: notif.message,
                        is_read: notif.is_read,
                        reference_id: notif.reference_id,
                        reference_type: notif.reference_type,
                        created_at: notif.created_at
                    })),
                    pagination: {
                        current_page: page,
                        items_per_page: limit,
                        has_next: notifications.length === limit
                    }
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Mark notification as read
     * @param {string} notification_id - UUID
     * @returns {Promise<object>} Updated notification
     */
    async markAsRead(notification_id) {
        try {
            const notification = await this.notificationRepository.markAsRead(notification_id);

            if (!notification) {
                throw new Error('Notifikasi tidak ditemukan');
            }

            return {
                success: true,
                data: {
                    notification_id: notification.notification_id,
                    is_read: notification.is_read
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Mark all notifications as read untuk user
     * @param {string} user_id - UUID
     * @returns {Promise<object>} Count of marked notifications
     */
    async markAllAsRead(user_id) {
        try {
            const count = await this.notificationRepository.markAllAsRead(user_id);

            return {
                success: true,
                data: {
                    marked_count: count
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get recent notifications untuk polling
     * @param {string} user_id - UUID
     * @param {Date} since - Timestamp cutoff
     * @returns {Promise<object>} Recent notifications
     */
    async getRecentNotifications(user_id, since) {
        try {
            if (!since || !(since instanceof Date)) {
                throw new Error('Valid "since" timestamp diperlukan');
            }

            const notifications = await this.notificationRepository.getRecentNotifications(
                user_id,
                since
            );

            return {
                success: true,
                data: {
                    notifications: notifications.map(notif => ({
                        notification_id: notif.notification_id,
                        type_name: notif.type_name,
                        title: notif.title,
                        message: notif.message,
                        is_read: notif.is_read,
                        reference_id: notif.reference_id,
                        reference_type: notif.reference_type,
                        created_at: notif.created_at
                    }))
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete notification
     * @param {string} notification_id - UUID
     * @returns {Promise<object>} Success status
     */
    async deleteNotification(notification_id) {
        try {
            const deleted = await this.notificationRepository.delete(notification_id);

            if (!deleted) {
                throw new Error('Notifikasi tidak ditemukan');
            }

            return {
                success: true,
                message: 'Notifikasi berhasil dihapus'
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Clean up old notifications (auto-delete notifikasi lama)
     * Biasanya dipanggil via scheduled job atau cron
     * @param {number} days - Keep notifications from last N days
     * @returns {Promise<object>} Cleanup result
     */
    async cleanupOldNotifications(days = 30) {
        try {
            const deletedCount = await this.notificationRepository.deleteOldNotifications(days);

            return {
                success: true,
                data: {
                    deleted_count: deletedCount,
                    message: `${deletedCount} notifikasi lama berhasil dihapus`
                }
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = NotificationService;
