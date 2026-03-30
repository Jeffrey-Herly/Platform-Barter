// src/repositories/barter-message.repository.js
'use strict';

/**
 * Barter Message Repository
 * Handles all database operations untuk barter_messages table
 * Digunakan untuk chat/negosiasi antar user per offer/transaction
 *
 * OPTIMIZATION:
 * - Eager loading dengan JOIN ke users untuk info pengirim
 * - Pagination untuk menghindari load data terlalu banyak
 * - Index pada transaction_id dan created_at sudah ada di DB
 */

class BarterMessageRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Create new message
     * @param {object} messageData - { transaction_id, sender_id, message_text }
     * @returns {Promise<object>} Created message
     */
    async create(messageData) {
        const { transaction_id, sender_id, message_text } = messageData;

        const query = `
            INSERT INTO barter_messages
            (transaction_id, sender_id, message_text, is_read, created_at)
            VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
            RETURNING
                message_id,
                transaction_id,
                sender_id,
                message_text,
                is_read,
                created_at
        `;

        try {
            const result = await this.db.query(query, [
                transaction_id,
                sender_id,
                message_text
            ]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in create message: ${error.message}`);
        }
    }

    /**
     * Get all messages for a transaction with sender details
     * EAGER LOADING: Include user info untuk menghindari N+1 problem
     * @param {string} transaction_id - UUID
     * @param {number} limit - Pagination limit (default 50)
     * @param {number} offset - Pagination offset (default 0)
     * @returns {Promise<array>} Messages dengan sender info
     */
    async findByTransactionId(transaction_id, limit = 50, offset = 0) {
        const query = `
            SELECT
                bm.message_id,
                bm.transaction_id,
                bm.sender_id,
                bm.message_text,
                bm.is_read,
                bm.created_at,
                -- Eager load sender user info
                u.full_name AS sender_name,
                u.email AS sender_email,
                up.avatar_url AS sender_avatar
            FROM barter_messages bm
            LEFT JOIN users u ON bm.sender_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE bm.transaction_id = $1
            ORDER BY bm.created_at ASC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await this.db.query(query, [
                transaction_id,
                limit,
                offset
            ]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error in findByTransactionId: ${error.message}`);
        }
    }

    /**
     * Get message count for a transaction
     * Digunakan untuk pagination
     * @param {string} transaction_id - UUID
     * @returns {Promise<number>} Total count
     */
    async getCountByTransactionId(transaction_id) {
        const query = `
            SELECT COUNT(*) as total
            FROM barter_messages
            WHERE transaction_id = $1
        `;

        try {
            const result = await this.db.query(query, [transaction_id]);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            throw new Error(`Database error in getCountByTransactionId: ${error.message}`);
        }
    }

    /**
     * Get unread messages count for a user in a transaction
     * @param {string} transaction_id - UUID
     * @param {string} user_id - UUID
     * @returns {Promise<number>} Unread count
     */
    async getUnreadCount(transaction_id, user_id) {
        const query = `
            SELECT COUNT(*) as total
            FROM barter_messages
            WHERE transaction_id = $1
            AND sender_id != $2
            AND is_read = false
        `;

        try {
            const result = await this.db.query(query, [transaction_id, user_id]);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            throw new Error(`Database error in getUnreadCount: ${error.message}`);
        }
    }

    /**
     * Mark message as read
     * @param {string} message_id - UUID
     * @returns {Promise<object>} Updated message
     */
    async markAsRead(message_id) {
        const query = `
            UPDATE barter_messages
            SET is_read = true
            WHERE message_id = $1
            RETURNING
                message_id,
                transaction_id,
                sender_id,
                message_text,
                is_read,
                created_at
        `;

        try {
            const result = await this.db.query(query, [message_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in markAsRead: ${error.message}`);
        }
    }

    /**
     * Mark all messages as read for a transaction and user
     * Digunakan saat user membuka chat room
     * @param {string} transaction_id - UUID
     * @param {string} user_id - UUID
     * @returns {Promise<number>} Updated count
     */
    async markAllAsRead(transaction_id, user_id) {
        const query = `
            UPDATE barter_messages
            SET is_read = true
            WHERE transaction_id = $1
            AND sender_id != $2
            AND is_read = false
            RETURNING message_id
        `;

        try {
            const result = await this.db.query(query, [transaction_id, user_id]);
            return result.rows.length;
        } catch (error) {
            throw new Error(`Database error in markAllAsRead: ${error.message}`);
        }
    }

    /**
     * Get recent messages for a transaction (untuk polling)
     * Hanya ambil messages lebih baru dari timestamp tertentu
     * @param {string} transaction_id - UUID
     * @param {Date} since - Timestamp cutoff
     * @returns {Promise<array>} Recent messages
     */
    async getRecentMessages(transaction_id, since) {
        const query = `
            SELECT
                bm.message_id,
                bm.transaction_id,
                bm.sender_id,
                bm.message_text,
                bm.is_read,
                bm.created_at,
                u.full_name AS sender_name,
                u.email AS sender_email,
                up.avatar_url AS sender_avatar
            FROM barter_messages bm
            LEFT JOIN users u ON bm.sender_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE bm.transaction_id = $1
            AND bm.created_at > $2
            ORDER BY bm.created_at ASC
        `;

        try {
            const result = await this.db.query(query, [transaction_id, since]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error in getRecentMessages: ${error.message}`);
        }
    }

    /**
     * Delete message (soft delete bisa tapi tidak perlu, langsung hard delete)
     * @param {string} message_id - UUID
     * @returns {Promise<boolean>} Success status
     */
    async delete(message_id) {
        const query = `
            DELETE FROM barter_messages
            WHERE message_id = $1
            RETURNING message_id
        `;

        try {
            const result = await this.db.query(query, [message_id]);
            return result.rows.length > 0;
        } catch (error) {
            throw new Error(`Database error in delete: ${error.message}`);
        }
    }

    /**
     * Get chat participants for a transaction
     * @param {string} transaction_id - UUID
     * @returns {Promise<array>} User IDs yang terlibat dalam chat
     */
    async getChatParticipants(transaction_id) {
        const query = `
            SELECT DISTINCT sender_id
            FROM barter_messages
            WHERE transaction_id = $1
        `;

        try {
            const result = await this.db.query(query, [transaction_id]);
            return result.rows.map(r => r.sender_id);
        } catch (error) {
            throw new Error(`Database error in getChatParticipants: ${error.message}`);
        }
    }

    /**
     * Delete conversation untuk user (soft delete)
     * Conversation akan hidden dari user tapi data messages tetap ada
     * @param {string} transaction_id - UUID
     * @param {string} user_id - UUID
     * @returns {Promise<boolean>} Success status
     */
    async deleteConversationForUser(transaction_id, user_id) {
        const query = `
            INSERT INTO user_deleted_conversations (transaction_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (transaction_id, user_id) DO NOTHING
            RETURNING deletion_id
        `;

        try {
            const result = await this.db.query(query, [transaction_id, user_id]);
            return result.rows.length > 0;
        } catch (error) {
            throw new Error(`Database error in deleteConversationForUser: ${error.message}`);
        }
    }

    /**
     * Check if user has deleted a conversation
     * @param {string} transaction_id - UUID
     * @param {string} user_id - UUID
     * @returns {Promise<boolean>} True jika user sudah delete
     */
    async isConversationDeletedByUser(transaction_id, user_id) {
        const query = `
            SELECT deletion_id FROM user_deleted_conversations
            WHERE transaction_id = $1 AND user_id = $2
        `;

        try {
            const result = await this.db.query(query, [transaction_id, user_id]);
            return result.rows.length > 0;
        } catch (error) {
            throw new Error(`Database error in isConversationDeletedByUser: ${error.message}`);
        }
    }

    /**
     * Restore deleted conversation untuk user
     * @param {string} transaction_id - UUID
     * @param {string} user_id - UUID
     * @returns {Promise<boolean>} Success status
     */
    async restoreConversationForUser(transaction_id, user_id) {
        const query = `
            DELETE FROM user_deleted_conversations
            WHERE transaction_id = $1 AND user_id = $2
            RETURNING deletion_id
        `;

        try {
            const result = await this.db.query(query, [transaction_id, user_id]);
            return result.rows.length > 0;
        } catch (error) {
            throw new Error(`Database error in restoreConversationForUser: ${error.message}`);
        }
    }

    /**
     * Get list of conversations untuk a user
     * Join dengan transactions, users, items, dan last message
     * EXCLUDE conversations yang sudah di-delete oleh user
     * @param {string} user_id - UUID
     * @param {number} limit - Pagination limit (default 20)
     * @param {number} offset - Pagination offset (default 0)
     * @returns {Promise<array>} Conversations dengan partner dan last message info
     */
    async getUserConversations(user_id, limit = 20, offset = 0) {
        // Query dengan soft delete (exclude deleted conversations)
        const queryWithSoftDelete = `
            WITH latest_messages AS (
                SELECT DISTINCT ON (bm.transaction_id)
                    bm.message_id,
                    bm.transaction_id,
                    bm.sender_id,
                    bm.message_text,
                    bm.created_at
                FROM barter_messages bm
                ORDER BY bm.transaction_id, bm.created_at DESC
            )
            SELECT
                bt.transaction_id,
                bt.requester_id,
                bt.owner_id,
                bt.status_id,
                bs.status_name,
                bt.requester_item_id,
                bt.owner_item_id,
                ir.title AS requester_item_title,
                io.title AS owner_item_title,
                bt.created_at AS transaction_created_at,
                bt.updated_at AS transaction_updated_at,
                CASE
                    WHEN bt.requester_id = $1 THEN uo.user_id
                    ELSE ur.user_id
                END AS partner_id,
                CASE
                    WHEN bt.requester_id = $1 THEN uo.full_name
                    ELSE ur.full_name
                END AS partner_name,
                CASE
                    WHEN bt.requester_id = $1 THEN uo.email
                    ELSE ur.email
                END AS partner_email,
                CASE
                    WHEN bt.requester_id = $1 THEN upo.avatar_url
                    ELSE upr.avatar_url
                END AS partner_avatar,
                lm.message_id AS last_message_id,
                lm.sender_id AS last_message_sender_id,
                lm.message_text AS last_message_text,
                lm.created_at AS last_message_created_at,
                (SELECT COUNT(*) FROM barter_messages
                 WHERE transaction_id = bt.transaction_id
                 AND sender_id != $1
                 AND is_read = false) AS unread_count
            FROM barter_transactions bt
            LEFT JOIN users ur ON bt.requester_id = ur.user_id
            LEFT JOIN user_profiles upr ON bt.requester_id = upr.user_id
            LEFT JOIN users uo ON bt.owner_id = uo.user_id
            LEFT JOIN user_profiles upo ON bt.owner_id = upo.user_id
            LEFT JOIN items ir ON bt.requester_item_id = ir.item_id
            LEFT JOIN items io ON bt.owner_item_id = io.item_id
            LEFT JOIN barter_statuses bs ON bt.status_id = bs.status_id
            LEFT JOIN latest_messages lm ON bt.transaction_id = lm.transaction_id
            WHERE (bt.requester_id = $1 OR bt.owner_id = $1)
            AND NOT EXISTS (
                SELECT 1 FROM user_deleted_conversations udc
                WHERE udc.transaction_id = bt.transaction_id
                AND udc.user_id = $1
            )
            ORDER BY COALESCE(lm.created_at, bt.updated_at) DESC
            LIMIT $2 OFFSET $3
        `;

        // Fallback query (tanpa soft delete check - jika table belum ada)
        const queryFallback = `
            WITH latest_messages AS (
                SELECT DISTINCT ON (bm.transaction_id)
                    bm.message_id,
                    bm.transaction_id,
                    bm.sender_id,
                    bm.message_text,
                    bm.created_at
                FROM barter_messages bm
                ORDER BY bm.transaction_id, bm.created_at DESC
            )
            SELECT
                bt.transaction_id,
                bt.requester_id,
                bt.owner_id,
                bt.status_id,
                bs.status_name,
                bt.requester_item_id,
                bt.owner_item_id,
                ir.title AS requester_item_title,
                io.title AS owner_item_title,
                bt.created_at AS transaction_created_at,
                bt.updated_at AS transaction_updated_at,
                CASE
                    WHEN bt.requester_id = $1 THEN uo.user_id
                    ELSE ur.user_id
                END AS partner_id,
                CASE
                    WHEN bt.requester_id = $1 THEN uo.full_name
                    ELSE ur.full_name
                END AS partner_name,
                CASE
                    WHEN bt.requester_id = $1 THEN uo.email
                    ELSE ur.email
                END AS partner_email,
                CASE
                    WHEN bt.requester_id = $1 THEN upo.avatar_url
                    ELSE upr.avatar_url
                END AS partner_avatar,
                lm.message_id AS last_message_id,
                lm.sender_id AS last_message_sender_id,
                lm.message_text AS last_message_text,
                lm.created_at AS last_message_created_at,
                (SELECT COUNT(*) FROM barter_messages
                 WHERE transaction_id = bt.transaction_id
                 AND sender_id != $1
                 AND is_read = false) AS unread_count
            FROM barter_transactions bt
            LEFT JOIN users ur ON bt.requester_id = ur.user_id
            LEFT JOIN user_profiles upr ON bt.requester_id = upr.user_id
            LEFT JOIN users uo ON bt.owner_id = uo.user_id
            LEFT JOIN user_profiles upo ON bt.owner_id = upo.user_id
            LEFT JOIN items ir ON bt.requester_item_id = ir.item_id
            LEFT JOIN items io ON bt.owner_item_id = io.item_id
            LEFT JOIN barter_statuses bs ON bt.status_id = bs.status_id
            LEFT JOIN latest_messages lm ON bt.transaction_id = lm.transaction_id
            WHERE bt.requester_id = $1 OR bt.owner_id = $1
            ORDER BY COALESCE(lm.created_at, bt.updated_at) DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            // Try query dengan soft delete dulu
            const result = await this.db.query(queryWithSoftDelete, [user_id, limit, offset]);
            console.log('[getUserConversations] Using soft delete query');
            return result.rows;
        } catch (error) {
            // Jika gagal (table belum ada), fallback ke query tanpa soft delete
            console.warn('[getUserConversations] Soft delete query failed, falling back. Error:', error.message);
            try {
                const result = await this.db.query(queryFallback, [user_id, limit, offset]);
                console.log('[getUserConversations] Using fallback query');
                return result.rows;
            } catch (fallbackError) {
                throw new Error(`Database error in getUserConversations: ${fallbackError.message}`);
            }
        }
    }

    /**
     * Get count of conversations untuk a user
     * @param {string} user_id - UUID
     * @returns {Promise<number>} Total count
     */
    async getConversationCountByUserId(user_id) {
        const queryWithSoftDelete = `
            SELECT COUNT(DISTINCT bt.transaction_id) as total
            FROM barter_transactions bt
            WHERE (bt.requester_id = $1 OR bt.owner_id = $1)
            AND NOT EXISTS (
                SELECT 1 FROM user_deleted_conversations udc
                WHERE udc.transaction_id = bt.transaction_id
                AND udc.user_id = $1
            )
        `;

        const queryFallback = `
            SELECT COUNT(DISTINCT bt.transaction_id) as total
            FROM barter_transactions bt
            WHERE bt.requester_id = $1 OR bt.owner_id = $1
        `;

        try {
            // Try dengan soft delete dulu
            const result = await this.db.query(queryWithSoftDelete, [user_id]);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            console.warn('getConversationCountByUserId: Soft delete query failed, falling back. Error:', error.message);
            // Fallback ke query tanpa soft delete
            try {
                const result = await this.db.query(queryFallback, [user_id]);
                return parseInt(result.rows[0].total, 10);
            } catch (fallbackError) {
                throw new Error(`Database error in getConversationCountByUserId: ${fallbackError.message}`);
            }
        }
    }
}

module.exports = BarterMessageRepository;
