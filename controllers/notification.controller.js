// src/controllers/notification.controller.js
'use strict';

/**
 * Notification Controller
 * Handles HTTP requests dan responses untuk notifications
 *
 * RESPONSIBILITIES:
 * - Validate request data
 * - Call service layer
 * - Format response
 * - Handle errors
 * - Authenticate user
 */

class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Get all notifications untuk current user
     * GET /api/notifications?page=1&limit=20
     */
    async getNotifications(request, reply) {
        try {
            const { page = 1, limit = 20 } = request.query;
            const user_id = request.user.userId; // From JWT middleware

            const result = await this.notificationService.getUserNotifications(
                user_id,
                parseInt(page, 10),
                parseInt(limit, 10)
            );

            return reply.send(result);
        } catch (error) {
            console.error('Error in getNotifications:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil notifikasi'
            });
        }
    }

    /**
     * Get unread notification count
     * GET /api/notifications/unread/count
     */
    async getUnreadCount(request, reply) {
        try {
            const user_id = request.user.userId;

            const result = await this.notificationService.getUnreadCount(user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in getUnreadCount:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil unread count'
            });
        }
    }

    /**
     * Get notifications by type (filter)
     * GET /api/notifications/type/:type_name?page=1&limit=20
     */
    async getNotificationsByType(request, reply) {
        try {
            const { type_name } = request.params;
            const { page = 1, limit = 20 } = request.query;
            const user_id = request.user.userId;

            if (!type_name) {
                return reply.code(400).send({
                    success: false,
                    message: 'type_name diperlukan'
                });
            }

            const result = await this.notificationService.getNotificationsByType(
                user_id,
                type_name,
                parseInt(page, 10),
                parseInt(limit, 10)
            );

            return reply.send(result);
        } catch (error) {
            console.error('Error in getNotificationsByType:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil notifikasi'
            });
        }
    }

    /**
     * Get recent notifications untuk polling
     * GET /api/notifications/recent?since=2024-01-01T00:00:00Z
     */
    async getRecentNotifications(request, reply) {
        try {
            const { since } = request.query;
            const user_id = request.user.userId;

            if (!since) {
                return reply.code(400).send({
                    success: false,
                    message: 'since query parameter diperlukan'
                });
            }

            const sinceDate = new Date(since);
            if (isNaN(sinceDate.getTime())) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid since timestamp'
                });
            }

            const result = await this.notificationService.getRecentNotifications(
                user_id,
                sinceDate
            );

            return reply.send(result);
        } catch (error) {
            console.error('Error in getRecentNotifications:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil recent notifications'
            });
        }
    }

    /**
     * Mark notification as read
     * PATCH /api/notifications/:notification_id/read
     */
    async markAsRead(request, reply) {
        try {
            const { notification_id } = request.params;

            if (!notification_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'notification_id diperlukan'
                });
            }

            const result = await this.notificationService.markAsRead(notification_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in markAsRead:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal menandai notifikasi sebagai baca'
            });
        }
    }

    /**
     * Mark all notifications as read
     * PATCH /api/notifications/mark-all/read
     */
    async markAllAsRead(request, reply) {
        try {
            const user_id = request.user.userId;

            const result = await this.notificationService.markAllAsRead(user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in markAllAsRead:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal menandai semua notifikasi sebagai baca'
            });
        }
    }

    /**
     * Delete notification
     * DELETE /api/notifications/:notification_id
     */
    async deleteNotification(request, reply) {
        try {
            const { notification_id } = request.params;

            if (!notification_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'notification_id diperlukan'
                });
            }

            const result = await this.notificationService.deleteNotification(notification_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in deleteNotification:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal menghapus notifikasi'
            });
        }
    }
}

module.exports = NotificationController;
