// src/repositories/barter-transaction.repository.js
'use strict';

/**
 * Barter Transaction Repository
 * Handles all database operations untuk barter_transactions table
 * Menyimpan data offer/penawaran barter antara user
 *
 * OPTIMIZATION:
 * - Eager loading dengan JOIN ke users dan items
 * - Index pada requester_id, owner_id, status_id sudah ada
 */

class BarterTransactionRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Find transaction by ID dengan details lengkap
     * @param {string} transaction_id - UUID
     * @returns {Promise<object|null>} Transaction dengan relasi data
     */
    async findById(transaction_id) {
        console.log(`[Repository.findById] Searching for transaction: ${transaction_id}`);

        const query = `
            SELECT
                bt.transaction_id,
                bt.requester_id,
                bt.owner_id,
                bt.requester_item_id,
                bt.owner_item_id,
                bt.status_id,
                bt.notes,
                bt.created_at,
                bt.updated_at,
                bt.expires_at,
                bt.completed_at,
                -- User details
                ur.full_name AS requester_name,
                ur.email AS requester_email,
                -- User profiles dengan avatar
                upr.avatar_url AS requester_avatar,
                uo.full_name AS owner_name,
                uo.email AS owner_email,
                upo.avatar_url AS owner_avatar,
                -- User profiles objects untuk compatibility dengan controller
                json_build_object('avatar_url', COALESCE(upr.avatar_url, '/images/default-avatar.png')) AS requester_profile,
                json_build_object('avatar_url', COALESCE(upo.avatar_url, '/images/default-avatar.png')) AS owner_profile,
                -- Item details (basic + thumbnail)
                ir.title AS requester_item_title,
                io.title AS owner_item_title,
                (SELECT image_url
                 FROM item_images
                 WHERE item_id = bt.requester_item_id
                   AND is_primary = true
                 LIMIT 1) AS requester_item_image,
                (SELECT image_url
                 FROM item_images
                 WHERE item_id = bt.owner_item_id
                   AND is_primary = true
                 LIMIT 1) AS owner_item_image,
                -- Status
                bs.status_name,
                bs.description AS status_description
            FROM barter_transactions bt
            LEFT JOIN users ur ON bt.requester_id = ur.user_id
            LEFT JOIN user_profiles upr ON bt.requester_id = upr.user_id
            LEFT JOIN users uo ON bt.owner_id = uo.user_id
            LEFT JOIN user_profiles upo ON bt.owner_id = upo.user_id
            LEFT JOIN items ir ON bt.requester_item_id = ir.item_id
            LEFT JOIN items io ON bt.owner_item_id = io.item_id
            LEFT JOIN barter_statuses bs ON bt.status_id = bs.status_id
            WHERE bt.transaction_id = $1
        `;

        try {
            const result = await this.db.query(query, [transaction_id]);
            console.log(`[Repository.findById] Result rows: ${result.rows.length}`);
            const row = result.rows[0] || null;
            if (row) {
                console.log(`[Repository.findById] Found transaction - requester_id: ${row.requester_id}, owner_id: ${row.owner_id}`);
            }
            return row;
        } catch (error) {
            console.error(`[Repository.findById] Database error:`, error.message);
            throw new Error(`Database error in findById: ${error.message}`);
        }
    }

    /**
     * Get transactions untuk a user (sebagai requester atau owner)
     * @param {string} user_id - UUID
     * @param {number} limit - Pagination limit
     * @param {number} offset - Pagination offset
     * @returns {Promise<array>} Transactions
     */
    async findByUserId(user_id, limit = 10, offset = 0) {
        const query = `
            SELECT
                bt.transaction_id,
                bt.requester_id,
                bt.owner_id,
                bt.requester_item_id,
                bt.owner_item_id,
                bt.status_id,
                bt.notes,
                bt.created_at,
                bt.updated_at,
                bt.expires_at,
                bt.completed_at,
                ur.full_name AS requester_name,
                ur.email AS requester_email,
                uo.full_name AS owner_name,
                uo.email AS owner_email,
                ir.title AS requester_item_title,
                io.title AS owner_item_title,
                bs.status_name
            FROM barter_transactions bt
            LEFT JOIN users ur ON bt.requester_id = ur.user_id
            LEFT JOIN users uo ON bt.owner_id = uo.user_id
            LEFT JOIN items ir ON bt.requester_item_id = ir.item_id
            LEFT JOIN items io ON bt.owner_item_id = io.item_id
            LEFT JOIN barter_statuses bs ON bt.status_id = bs.status_id
            WHERE bt.requester_id = $1 OR bt.owner_id = $1
            ORDER BY bt.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await this.db.query(query, [user_id, limit, offset]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error in findByUserId: ${error.message}`);
        }
    }

    /**
     * Get transactions by status
     * @param {string} status_id - UUID
     * @param {number} limit - Pagination limit
     * @param {number} offset - Pagination offset
     * @returns {Promise<array>} Transactions
     */
    async findByStatusId(status_id, limit = 10, offset = 0) {
        const query = `
            SELECT
                bt.transaction_id,
                bt.requester_id,
                bt.owner_id,
                bt.requester_item_id,
                bt.owner_item_id,
                bt.status_id,
                bt.notes,
                bt.created_at,
                bt.updated_at,
                ur.full_name AS requester_name,
                uo.full_name AS owner_name,
                ir.title AS requester_item_title,
                io.title AS owner_item_title,
                bs.status_name
            FROM barter_transactions bt
            LEFT JOIN users ur ON bt.requester_id = ur.user_id
            LEFT JOIN users uo ON bt.owner_id = uo.user_id
            LEFT JOIN items ir ON bt.requester_item_id = ir.item_id
            LEFT JOIN items io ON bt.owner_item_id = io.item_id
            LEFT JOIN barter_statuses bs ON bt.status_id = bs.status_id
            WHERE bt.status_id = $1
            ORDER BY bt.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await this.db.query(query, [status_id, limit, offset]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error in findByStatusId: ${error.message}`);
        }
    }

    /**
     * Get status ID by status name
     * @param {string} status_name - Status name
     * @returns {Promise<object|null>} Status dengan ID
     */
    async getStatusByName(status_name) {
        const query = `
            SELECT status_id, status_name, description
            FROM barter_statuses
            WHERE status_name = $1
        `;

        try {
            const result = await this.db.query(query, [status_name]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in getStatusByName: ${error.message}`);
        }
    }

    /**
     * Update transaction status
     * @param {string} transaction_id - UUID
     * @param {string} new_status_id - UUID
     * @returns {Promise<object>} Updated transaction
     */
    async updateStatus(transaction_id, new_status_id) {
        const query = `
            UPDATE barter_transactions
            SET status_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE transaction_id = $2
            RETURNING
                transaction_id,
                requester_id,
                owner_id,
                requester_item_id,
                owner_item_id,
                status_id,
                notes,
                created_at,
                updated_at,
                expires_at,
                completed_at
        `;

        try {
            const result = await this.db.query(query, [new_status_id, transaction_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in updateStatus: ${error.message}`);
        }
    }

    /**
     * Confirm receipt of item
     * @param {string} transaction_id - UUID
     * @param {boolean} isRequester - true jika requester yang konfirmasi, false jika owner
     * @returns {Promise<object>} Updated transaction
     */
    async confirmReceipt(transaction_id, isRequester) {
        const columnToUpdate = isRequester ? 'requester_confirmed_at' : 'owner_confirmed_at';
        const query = `
            UPDATE barter_transactions
            SET ${columnToUpdate} = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE transaction_id = $1
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, [transaction_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in confirmReceipt: ${error.message}`);
        }
    }

    /**
     * Update transaction status and mark as completed
     * @param {string} transaction_id - UUID
     * @param {string} status_id - UUID for completed status
     * @returns {Promise<object>} Updated transaction
     */
    async updateStatusAndComplete(transaction_id, status_id) {
        // Also set review window (e.g., 7 days from completion)
        const query = `
            UPDATE barter_transactions
            SET 
                status_id = $1, 
                completed_at = CURRENT_TIMESTAMP,
                review_window_expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days',
                updated_at = CURRENT_TIMESTAMP
            WHERE transaction_id = $2
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, [status_id, transaction_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in updateStatusAndComplete: ${error.message}`);
        }
    }

    /**
     * Get count of transactions for a user
     * @param {string} user_id - UUID
     * @returns {Promise<number>} Total count
     */
    async getCountByUserId(user_id) {
        const query = `
            SELECT COUNT(*) as total
            FROM barter_transactions
            WHERE requester_id = $1 OR owner_id = $1
        `;

        try {
            const result = await this.db.query(query, [user_id]);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            throw new Error(`Database error in getCountByUserId: ${error.message}`);
        }
    }

    /**
     * Create new barter transaction
     * @param {object} transactionData - { requester_id, owner_id, requester_item_id, owner_item_id, status_id, notes, expires_at }
     * @returns {Promise<object>} Created transaction
     */
    async create(transactionData) {
        const {
            requester_id,
            owner_id,
            requester_item_id,
            owner_item_id,
            status_id,
            notes,
            expires_at
        } = transactionData;

        const query = `
            INSERT INTO barter_transactions
            (requester_id, owner_id, requester_item_id, owner_item_id, status_id, notes, expires_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING
                transaction_id,
                requester_id,
                owner_id,
                requester_item_id,
                owner_item_id,
                status_id,
                notes,
                created_at,
                updated_at,
                expires_at,
                completed_at
        `;

        try {
            const result = await this.db.query(query, [
                requester_id,
                owner_id,
                requester_item_id,
                owner_item_id,
                status_id,
                notes || null,
                expires_at || null
            ]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error in create transaction: ${error.message}`);
        }
    }
}

module.exports = BarterTransactionRepository;
