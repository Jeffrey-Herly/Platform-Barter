// src/repositories/notification.repository.js
'use strict';

/**
 * Notification Repository
 * Handles all database operations untuk notifications table
 * Digunakan untuk notifikasi real-time ke user
 *
 * OPTIMIZATION:
 * - Eager loading dengan JOIN ke notification_types
 * - Index pada user_id, is_read, dan created_at sudah ada di DB
 * - Pagination untuk efficiently query notifikasi
 */

class NotificationRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Create new notification
     * @param {object} notificationData - { user_id, type_id, title, message, reference_id, reference_type }
     * @returns {Promise<object>} Created notification
     */
    async create(notificationData) {
        const { user_id, type_id, title, message, reference_id, reference_type } = notificationData;

        const query = `
            INSERT INTO notifications
            (user_id, type_id, title, message, is_read, reference_id, reference_type, created_at)
            VALUES ($1, $2, $3, $4, false, $5, $6, CURRENT_TIMESTAMP)
            RETURNING
                notification_id,
                user_id,
                type_id,
                title,
                message,
                is_read,
                reference_id,
                reference_type,
                created_at
        `;

        try {
            const result = await this.db.query(query, [
                user_id,
                type_id,
                title,
                message,
                reference_id || null,
                reference_type || null
            ]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in create notification: ${error.message}`);
        }
    }

    /**
     * Get all notifications for a user with type details
     * EAGER LOADING: Include notification_types info
     * @param {string} user_id - UUID
     * @param {number} limit - Pagination limit (default 20)
     * @param {number} offset - Pagination offset (default 0)
     * @returns {Promise<array>} Notifications dengan type info
     */
    async findByUserId(user_id, limit = 20, offset = 0) {
        const query = `
            SELECT
                n.notification_id,
                n.user_id,
                n.type_id,
                n.title,
                n.message,
                n.is_read,
                n.reference_id,
                n.reference_type,
                n.created_at,
                -- Eager load notification type
                nt.type_name AS type_name,
                nt.description AS type_description
            FROM notifications n
            LEFT JOIN notification_types nt ON n.type_id = nt.type_id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await this.db.query(query, [
                user_id,
                limit,
                offset
            ]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error in findByUserId: ${error.message}`);
        }
    }

    /**
     * Get unread notifications count for a user
     * Untuk badge counter
     * @param {string} user_id - UUID
     * @returns {Promise<number>} Unread count
     */
    async getUnreadCount(user_id) {
        const query = `
            SELECT COUNT(*) as total
            FROM notifications
            WHERE user_id = $1 AND is_read = false
        `;

        try {
            const result = await this.db.query(query, [user_id]);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            throw new Error(`Database error in getUnreadCount: ${error.message}`);
        }
    }

    /**
     * Get notifications by type for a user
     * Untuk filtering notifikasi berdasarkan kategori
     * @param {string} user_id - UUID
     * @param {string} type_name - Notification type name
     * @param {number} limit - Pagination limit
     * @param {number} offset - Pagination offset
     * @returns {Promise<array>} Filtered notifications
     */
    async findByUserIdAndType(user_id, type_name, limit = 20, offset = 0) {
        const query = `
            SELECT
                n.notification_id,
                n.user_id,
                n.type_id,
                n.title,
                n.message,
                n.is_read,
                n.reference_id,
                n.reference_type,
                n.created_at,
                nt.type_name AS type_name,
                nt.description AS type_description
            FROM notifications n
            LEFT JOIN notification_types nt ON n.type_id = nt.type_id
            WHERE n.user_id = $1 AND nt.type_name = $2
            ORDER BY n.created_at DESC
            LIMIT $3 OFFSET $4
        `;

        try {
            const result = await this.db.query(query, [
                user_id,
                type_name,
                limit,
                offset
            ]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error in findByUserIdAndType: ${error.message}`);
        }
    }

    /**
     * Get notification by ID
     * @param {string} notification_id - UUID
     * @returns {Promise<object|null>} Notification atau null
     */
    async findById(notification_id) {
        const query = `
            SELECT
                n.notification_id,
                n.user_id,
                n.type_id,
                n.title,
                n.message,
                n.is_read,
                n.reference_id,
                n.reference_type,
                n.created_at,
                nt.type_name AS type_name,
                nt.description AS type_description
            FROM notifications n
            LEFT JOIN notification_types nt ON n.type_id = nt.type_id
            WHERE n.notification_id = $1
        `;

        try {
            const result = await this.db.query(query, [notification_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in findById: ${error.message}`);
        }
    }

    /**
     * Mark notification as read
     * @param {string} notification_id - UUID
     * @returns {Promise<object>} Updated notification
     */
    async markAsRead(notification_id) {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE notification_id = $1
            RETURNING
                notification_id,
                user_id,
                type_id,
                title,
                message,
                is_read,
                reference_id,
                reference_type,
                created_at
        `;

        try {
            const result = await this.db.query(query, [notification_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in markAsRead: ${error.message}`);
        }
    }

    /**
     * Mark all unread notifications as read for a user
     * @param {string} user_id - UUID
     * @returns {Promise<number>} Updated count
     */
    async markAllAsRead(user_id) {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE user_id = $1 AND is_read = false
            RETURNING notification_id
        `;

        try {
            const result = await this.db.query(query, [user_id]);
            return result.rows.length;
        } catch (error) {
            throw new Error(`Database error in markAllAsRead: ${error.message}`);
        }
    }

    /**
     * Get recent notifications untuk polling
     * Hanya ambil notifications lebih baru dari timestamp tertentu
     * @param {string} user_id - UUID
     * @param {Date} since - Timestamp cutoff
     * @returns {Promise<array>} Recent notifications
     */
    async getRecentNotifications(user_id, since) {
        const query = `
            SELECT
                n.notification_id,
                n.user_id,
                n.type_id,
                n.title,
                n.message,
                n.is_read,
                n.reference_id,
                n.reference_type,
                n.created_at,
                nt.type_name AS type_name,
                nt.description AS type_description
            FROM notifications n
            LEFT JOIN notification_types nt ON n.type_id = nt.type_id
            WHERE n.user_id = $1 AND n.created_at > $2
            ORDER BY n.created_at DESC
        `;

        try {
            const result = await this.db.query(query, [user_id, since]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error in getRecentNotifications: ${error.message}`);
        }
    }

    /**
     * Delete old notifications (auto-cleanup)
     * Hapus notifikasi lebih dari X hari (default 30 hari)
     * @param {number} days - Number of days to keep (default 30)
     * @returns {Promise<number>} Deleted count
     */
    async deleteOldNotifications(days = 30) {
        const query = `
            DELETE FROM notifications
            WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${days} days'
            RETURNING notification_id
        `;

        try {
            const result = await this.db.query(query);
            return result.rows.length;
        } catch (error) {
            throw new Error(`Database error in deleteOldNotifications: ${error.message}`);
        }
    }

    /**
     * Delete notification by ID
     * @param {string} notification_id - UUID
     * @returns {Promise<boolean>} Success status
     */
    async delete(notification_id) {
        const query = `
            DELETE FROM notifications
            WHERE notification_id = $1
            RETURNING notification_id
        `;

        try {
            const result = await this.db.query(query, [notification_id]);
            return result.rows.length > 0;
        } catch (error) {
            throw new Error(`Database error in delete: ${error.message}`);
        }
    }

    /**
     * Get total count of notifications for a user
     * Digunakan untuk pagination info
     * @param {string} user_id - UUID
     * @returns {Promise<number>} Total count
     */
    async getCountByUserId(user_id) {
        const query = `
            SELECT COUNT(*) as total
            FROM notifications
            WHERE user_id = $1
        `;

        try {
            const result = await this.db.query(query, [user_id]);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            throw new Error(`Database error in getCountByUserId: ${error.message}`);
        }
    }

    /**
     * Get notification type by name
     * @param {string} type_name - Type name
     * @returns {Promise<object|null>} Notification type atau null
     */
    async getNotificationTypeByName(type_name) {
        const query = `
            SELECT type_id, type_name, description
            FROM notification_types
            WHERE type_name = $1
        `;

        try {
            const result = await this.db.query(query, [type_name]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in getNotificationTypeByName: ${error.message}`);
        }
    }
}

module.exports = NotificationRepository;
