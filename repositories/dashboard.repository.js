'use strict';

/**
 * Dashboard Repository
 * Menangani akses data untuk dashboard user
 */
class DashboardRepository {
    constructor(pgConnection) {
        this.pg = pgConnection;
    }

    /**
     * Ambil data profil lengkap user beserta statistik
     */
    async getUserProfileWithStats(userId) {
        const query = `
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.phone_number,
                u.created_at,
                u.last_login,
                up.profile_id,
                up.avatar_url,
                up.cover_url,
                up.bio,
                up.address,
                up.city,
                up.province,
                up.postal_code,
                up.rating_average,
                up.total_ratings,
                up.total_successful_barters,
                COUNT(DISTINCT i.item_id) as total_items,
                COUNT(DISTINCT CASE WHEN i.is_available = true THEN i.item_id END) as available_items
            FROM users u
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            LEFT JOIN items i ON u.user_id = i.user_id
            WHERE u.user_id = $1
            GROUP BY u.user_id, up.profile_id
        `;

        const result = await this.pg.query(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Ambil notifikasi user (belum dibaca)
     */
    async getUnreadNotifications(userId, limit = 10) {
        const query = `
            SELECT
                n.notification_id,
                n.title,
                n.message,
                n.is_read,
                n.reference_id,
                n.reference_type,
                n.created_at,
                nt.type_name
            FROM notifications n
            JOIN notification_types nt ON n.type_id = nt.type_id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2
        `;

        const result = await this.pg.query(query, [userId, limit]);
        return result.rows;
    }

    /**
     * Ambil semua notifikasi dengan pagination
     */
    async getAllNotifications(userId, limit = 20, offset = 0) {
        const query = `
            SELECT
                n.notification_id,
                n.title,
                n.message,
                n.is_read,
                n.reference_id,
                n.reference_type,
                n.created_at,
                nt.type_name
            FROM notifications n
            JOIN notification_types nt ON n.type_id = nt.type_id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await this.pg.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Hitung total notifikasi yang belum dibaca
     */
    async getUnreadNotificationCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = $1 AND is_read = false
        `;

        const result = await this.pg.query(query, [userId]);
        return parseInt(result.rows[0]?.count || 0);
    }

    /**
     * Tandai notifikasi sebagai dibaca
     */
    async markNotificationAsRead(notificationId) {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE notification_id = $1
            RETURNING *
        `;

        const result = await this.pg.query(query, [notificationId]);
        return result.rows[0];
    }

    /**
     * Tandai semua notifikasi user sebagai dibaca
     */
    async markAllNotificationsAsRead(userId) {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE user_id = $1 AND is_read = false
            RETURNING notification_id
        `;

        const result = await this.pg.query(query, [userId]);
        // Kembalikan jumlah notifikasi yang di-update
        return result.rows.length;
    }

    /**
     * Ambil item milik user dengan filter
     */
    async getUserItems(userId, limit = 10, offset = 0) {
        const query = `
            SELECT
                i.item_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                c.category_name,
                it.type_name,
                ic.condition_name,
                (SELECT image_url FROM item_images
                 WHERE item_id = i.item_id AND is_primary = true
                 LIMIT 1) as primary_image
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id
            WHERE i.user_id = $1
            ORDER BY i.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await this.pg.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Hitung total item milik user
     */
    async getUserItemsCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM items
            WHERE user_id = $1
        `;

        const result = await this.pg.query(query, [userId]);
        return parseInt(result.rows[0]?.count || 0);
    }

    /**
     * Ambil active barter transactions (permintaan yang diterima)
     */
    async getActiveBarterTransactions(userId, limit = 5) {
        const query = `
            SELECT
                bt.transaction_id,
                bt.created_at,
                bt.updated_at,
                bs.status_name,
                CASE
                    WHEN bt.owner_id = $1 THEN u1.full_name
                    ELSE u2.full_name
                END as other_user_name,
                i1.title as requester_item_title,
                i2.title as owner_item_title,
                CASE
                    WHEN bt.owner_id = $1 THEN 'Penerima'
                    ELSE 'Pengirim'
                END as role
            FROM barter_transactions bt
            JOIN users u1 ON bt.requester_id = u1.user_id
            JOIN users u2 ON bt.owner_id = u2.user_id
            JOIN items i1 ON bt.requester_item_id = i1.item_id
            JOIN items i2 ON bt.owner_item_id = i2.item_id
            JOIN barter_statuses bs ON bt.status_id = bs.status_id
            WHERE (bt.requester_id = $1 OR bt.owner_id = $1)
                AND bs.status_name IN ('PENDING', 'NEGOTIATING')
            ORDER BY bt.updated_at DESC
            LIMIT $2
        `;

        const result = await this.pg.query(query, [userId, limit]);
        return result.rows;
    }

    /**
     * Ambil statistics overview user
     */
    async getUserStatistics(userId) {
        const query = `
            SELECT
                (SELECT COUNT(*) FROM items WHERE user_id = $1) as total_items,
                (SELECT COUNT(*) FROM items WHERE user_id = $1 AND is_available = true) as available_items,
                (SELECT COUNT(*) FROM items WHERE user_id = $1 AND is_available = false) as unavailable_items,
                (SELECT COUNT(*) FROM barter_transactions
                 WHERE (requester_id = $1 OR owner_id = $1)
                 AND status_id IN (SELECT status_id FROM barter_statuses WHERE status_name = 'COMPLETED')) as completed_barters,
                (SELECT COUNT(*) FROM wishlists WHERE user_id = $1) as wishlist_count,
                (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE reviewed_user_id = $1) as rating,
                (SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = $1) as total_reviews
        `;

        const result = await this.pg.query(query, [userId]);
        return result.rows[0];
    }

    /**
     * Ambil wishlist items user
     */
    async getUserWishlist(userId, limit = 10, offset = 0) {
        const query = `
            SELECT
                w.wishlist_id,
                i.item_id,
                i.title,
                i.description,
                i.estimated_value,
                i.view_count,
                i.created_at,
                u.full_name as owner_name,
                u.user_id as owner_id,
                c.category_name,
                (SELECT image_url FROM item_images
                 WHERE item_id = i.item_id AND is_primary = true
                 LIMIT 1) as primary_image
            FROM wishlists w
            JOIN items i ON w.item_id = i.item_id
            JOIN users u ON i.user_id = u.user_id
            JOIN categories c ON i.category_id = c.category_id
            WHERE w.user_id = $1
            ORDER BY w.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await this.pg.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Tambah item ke wishlist user
     */
    async createWishlistItem(userId, itemId) {
        const query = `
            INSERT INTO wishlists (user_id, item_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, item_id) DO NOTHING
            RETURNING wishlist_id
        `;

        const result = await this.pg.query(query, [userId, itemId]);
        return result.rows[0] || null;
    }

    /**
     * Hitung total wishlist items
     */
    async getUserWishlistCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM wishlists
            WHERE user_id = $1
        `;

        const result = await this.pg.query(query, [userId]);
        return parseInt(result.rows[0]?.count || 0);
    }

    /**
     * Ambil recent reviews terhadap user
     */
    async getUserReviews(userId, limit = 5) {
        const query = `
            SELECT
                r.review_id,
                r.rating,
                r.review_text,
                r.created_at,
                u.full_name as reviewer_name,
                u.user_id as reviewer_id,
                bt.transaction_id
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.user_id
            JOIN barter_transactions bt ON r.transaction_id = bt.transaction_id
            WHERE r.reviewed_user_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2
        `;

        const result = await this.pg.query(query, [userId, limit]);
        return result.rows;
    }

    /**
     * Cari transaksi barter terakhir yang selesai antara dua user
     * yang belum pernah diberi review oleh reviewer tersebut.
     */
    async findLatestCompletedTransactionForReview(reviewerId, reviewedUserId) {
        const query = `
            SELECT bt.transaction_id
            FROM barter_transactions bt
            JOIN barter_statuses bs ON bt.status_id = bs.status_id
            LEFT JOIN reviews r
                ON r.transaction_id = bt.transaction_id
               AND r.reviewer_id = $1
            WHERE bs.status_name = 'COMPLETED'
              AND (
                    (bt.requester_id = $1 AND bt.owner_id = $2)
                 OR (bt.requester_id = $2 AND bt.owner_id = $1)
              )
              AND r.review_id IS NULL
            ORDER BY bt.completed_at DESC NULLS LAST, bt.created_at DESC
            LIMIT 1
        `;

        const result = await this.pg.query(query, [reviewerId, reviewedUserId]);
        return result.rows[0] || null;
    }

    /**
     * Buat review baru untuk user
     */
    async createUserReview({ transactionId, reviewerId, reviewedUserId, rating, reviewText }) {
        const query = `
            INSERT INTO reviews (
                review_id,
                transaction_id,
                reviewer_id,
                reviewed_user_id,
                rating,
                review_text,
                created_at,
                updated_at
            )
            VALUES (
                uuid_generate_v4(),
                $1, $2, $3, $4, $5,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING
                review_id,
                rating,
                review_text,
                created_at
        `;

        const result = await this.pg.query(query, [
            transactionId,
            reviewerId,
            reviewedUserId,
            rating,
            reviewText || null
        ]);
        return result.rows[0];
    }

    /**
     * Get report type row by type_name (e.g. 'FRAUD', 'SPAM')
     */
    async getReportTypeByName(typeName) {
        const query = `
            SELECT type_id, type_name, description
            FROM report_types
            WHERE type_name = $1
        `;

        const result = await this.pg.query(query, [typeName]);
        return result.rows[0] || null;
    }

    /**
     * Create report record for a user (fraud/spam/etc)
     */
    async createUserReport({ reporterId, reportedUserId, typeId, description }) {
        const query = `
            INSERT INTO reports (
                report_id,
                reporter_id,
                reported_user_id,
                reported_item_id,
                type_id,
                description,
                status,
                created_at
            )
            VALUES (
                uuid_generate_v4(),
                $1, $2, NULL, $3, $4,
                'PENDING',
                CURRENT_TIMESTAMP
            )
            RETURNING
                report_id,
                status,
                created_at
        `;

        const result = await this.pg.query(query, [
            reporterId,
            reportedUserId,
            typeId,
            description || null
        ]);

        return result.rows[0];
    }

    /**
     * Get user reviews with pagination
     * @param {string} userId - User ID
     * @param {number} limit - Items per page
     * @param {number} offset - Pagination offset
     * @returns {Promise<Array>} Paginated reviews
     */
    async getUserReviewsPaginated(userId, limit, offset) {
        const query = `
            SELECT
                r.review_id,
                r.rating,
                r.review_text,
                r.created_at,
                u.full_name as reviewer_name,
                u.user_id as reviewer_id,
                bt.transaction_id
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.user_id
            JOIN barter_transactions bt ON r.transaction_id = bt.transaction_id
            WHERE r.reviewed_user_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await this.pg.query(query, [userId, limit, offset]);
        return result.rows;
    }

    /**
     * Get total count of user reviews
     * @param {string} userId - User ID
     * @returns {Promise<number>} Total count
     */
    async getUserReviewsCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM reviews
            WHERE reviewed_user_id = $1
        `;

        const result = await this.pg.query(query, [userId]);
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Update user profile
     * Uses UPSERT to handle cases where user_profiles record doesn't exist yet
     */
    async updateUserProfile(userId, profileData) {
        const { bio, address, city, province, postal_code, avatar_url, cover_url } = profileData;

        const query = `
            INSERT INTO user_profiles (
                user_id, bio, address, city, province, postal_code, avatar_url, cover_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id)
            DO UPDATE SET
                bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
                address = COALESCE(EXCLUDED.address, user_profiles.address),
                city = COALESCE(EXCLUDED.city, user_profiles.city),
                province = COALESCE(EXCLUDED.province, user_profiles.province),
                postal_code = COALESCE(EXCLUDED.postal_code, user_profiles.postal_code),
                avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
                cover_url = COALESCE(EXCLUDED.cover_url, user_profiles.cover_url)
            RETURNING *
        `;

        const result = await this.pg.query(query, [
            userId,
            bio,
            address,
            city,
            province,
            postal_code,
            avatar_url,
            cover_url
        ]);

        return result.rows[0];
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        const query = `
            DELETE FROM notifications
            WHERE notification_id = $1
            RETURNING *
        `;

        const result = await this.pg.query(query, [notificationId]);
        return result.rows[0];
    }

    /**
     * Delete wishlist item
     */
    async deleteWishlistItem(wishlistId) {
        const query = `
            DELETE FROM wishlists
            WHERE wishlist_id = $1
            RETURNING *
        `;

        const result = await this.pg.query(query, [wishlistId]);
        return result.rows[0];
    }

    /**
     * Delete item by id
     */
    async deleteItem(itemId, userId) {
        const query = `
            DELETE FROM items
            WHERE item_id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await this.pg.query(query, [itemId, userId]);
        return result.rows[0];
    }

    /**
     * Get item by id
     */
    async getItemById(itemId) {
        const query = `
            SELECT
                i.item_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                i.user_id,
                c.category_name,
                c.category_id,
                it.type_name,
                it.type_id,
                ic.condition_name,
                ic.condition_id,
                (SELECT image_url FROM item_images
                 WHERE item_id = i.item_id AND is_primary = true
                 LIMIT 1) as primary_image
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id
            WHERE i.item_id = $1
        `;

        const result = await this.pg.query(query, [itemId]);
        return result.rows[0] || null;
    }

    /**
     * Update item
     */
    async updateItem(itemId, userId, itemData) {
        const { title, description, estimated_value, is_available, category_id, type_id, condition_id } = itemData;

        const query = `
            UPDATE items
            SET
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                estimated_value = COALESCE($4, estimated_value),
                is_available = COALESCE($5, is_available),
                category_id = COALESCE($6, category_id),
                type_id = COALESCE($7, type_id),
                condition_id = COALESCE($8, condition_id)
            WHERE item_id = $1 AND user_id = $9
            RETURNING *
        `;

        const result = await this.pg.query(query, [
            itemId,
            title,
            description,
            estimated_value,
            is_available,
            category_id,
            type_id,
            condition_id,
            userId
        ]);

        return result.rows[0];
    }
}

module.exports = DashboardRepository;
