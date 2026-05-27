// src/repositories/user.repository.js
'use strict';

/**
 * User Repository
 * Berisi semua SQL queries yang berhubungan dengan tabel users
 * 
 * BEST PRACTICE:
 * - Satu file repository untuk satu entity/table
 * - Semua SQL queries di sini, tidak tersebar di controller
 * - Return raw data, biarkan service layer yang process
 */

class UserRepository {
    constructor(db) {
        this.db = db; // PostgreSQL client/pool
    }

    /**
     * Find user by email
     * @param {string} email 
     * @returns {Promise<Object|null>} User object atau null
     */
    async findByEmail(email) {
        const query = `
      SELECT 
        u.user_id,
        u.email,
        u.password_hash,
        u.full_name,
        u.phone_number,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.last_login
      FROM users u
      WHERE u.email = $1
      LIMIT 1
    `;

        try {
            const result = await this.db.query(query, [email]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in findByEmail: ${error.message}`);
        }
    }

    /**
     * Find user by ID
     * @param {string} userId - UUID
     * @returns {Promise<Object|null>}
     */
    async findById(userId) {
        const query = `
      SELECT 
        u.user_id,
        u.email,
        u.full_name,
        u.phone_number,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.last_login,
        up.avatar_url,
        up.bio,
        up.city,
        up.province,
        up.rating_average,
        up.total_ratings,
        up.total_successful_barters
      FROM users u
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      WHERE u.user_id = $1
      LIMIT 1
    `;

        try {
            const result = await this.db.query(query, [userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in findById: ${error.message}`);
        }
    }

    /**
     * Update last login timestamp
     * @param {string} userId 
     * @returns {Promise<boolean>}
     */
    async updateLastLogin(userId) {
        const query = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING user_id
    `;

        try {
            const result = await this.db.query(query, [userId]);
            return result.rowCount > 0;
        } catch (error) {
            throw new Error(`Database error in updateLastLogin: ${error.message}`);
        }
    }

    /**
     * Create new user (untuk register)
     * @param {Object} userData 
     * @returns {Promise<Object>}
     */
    async create(userData) {
        const {
            email,
            password_hash,
            full_name,
            phone_number,
            verification_token,
            verification_token_expires
        } = userData;

        const query = `
      INSERT INTO users (
        email,
        password_hash,
        full_name,
        phone_number,
        verification_token,
        verification_token_expires
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, email, full_name, phone_number, email_verified, created_at
    `;

        try {
            const result = await this.db.query(query, [
                email,
                password_hash,
                full_name,
                phone_number || null,
                verification_token || null,
                verification_token_expires || null
            ]);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('Email already exists');
            }
            throw new Error(`Database error in create: ${error.message}`);
        }
    }

    /**
     * Check if email exists
     * @param {string} email 
     * @returns {Promise<boolean>}
     */
    async emailExists(email) {
        const query = `
      SELECT EXISTS(
        SELECT 1 FROM users WHERE email = $1
      ) as exists
    `;

        try {
            const result = await this.db.query(query, [email]);
            return result.rows[0].exists;
        } catch (error) {
            throw new Error(`Database error in emailExists: ${error.message}`);
        }
    }

    /**
     * Get user profile with statistics
     * @param {string} userId 
     * @returns {Promise<Object|null>}
     */
    async getProfileWithStats(userId) {
        const query = `
      SELECT 
        u.user_id,
        u.email,
        u.full_name,
        u.phone_number,
        u.email_verified,
        u.created_at,
        u.last_login,
        up.avatar_url,
        up.bio,
        up.address,
        up.city,
        up.province,
        up.postal_code,
        up.rating_average,
        up.total_ratings,
        up.total_successful_barters,
        -- Statistics
        COUNT(DISTINCT i.item_id) as total_items_posted,
        COUNT(DISTINCT CASE WHEN i.is_available = TRUE THEN i.item_id END) as available_items,
        COUNT(DISTINCT bt.transaction_id) as total_transactions,
        COUNT(DISTINCT w.wishlist_id) as wishlist_count
      FROM users u
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      LEFT JOIN items i ON u.user_id = i.user_id
      LEFT JOIN barter_transactions bt ON u.user_id = bt.requester_id 
        OR u.user_id = bt.owner_id
      LEFT JOIN wishlists w ON u.user_id = w.user_id
      WHERE u.user_id = $1
      GROUP BY 
        u.user_id, u.email, u.full_name, u.phone_number, 
        u.email_verified, u.created_at, u.last_login,
        up.avatar_url, up.bio, up.address, up.city, 
        up.province, up.postal_code, up.rating_average, 
        up.total_ratings, up.total_successful_barters
    `;

        try {
            const result = await this.db.query(query, [userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in getProfileWithStats: ${error.message}`);
        }
    }

    /**
     * Find user by verification token
     * @param {string} token - Verification token
     * @returns {Promise<Object|null>}
     */
    async findByVerificationToken(token) {
        const query = `
            SELECT
                user_id, email, full_name, phone_number, is_active,
                email_verified, verification_token, verification_token_expires,
                created_at
            FROM users
            WHERE verification_token = $1
        `;

        try {
            const result = await this.db.query(query, [token]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in findByVerificationToken: ${error.message}`);
        }
    }

    /**
     * Mark user email as verified
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async markEmailVerified(userId) {
        const query = `
            UPDATE users
            SET
                email_verified = true,
                verification_token = NULL,
                verification_token_expires = NULL
            WHERE user_id = $1
        `;

        try {
            await this.db.query(query, [userId]);
            return true;
        } catch (error) {
            throw new Error(`Database error in markEmailVerified: ${error.message}`);
        }
    }

    /**
     * Update verification token for user
     * @param {string} userId - User ID
     * @param {string} token - New verification token
     * @param {Date} expiresAt - Token expiration date
     * @returns {Promise<boolean>}
     */
    async updateVerificationToken(userId, token, expiresAt) {
        const query = `
            UPDATE users
            SET
                verification_token = $1,
                verification_token_expires = $2
            WHERE user_id = $3
        `;

        try {
            await this.db.query(query, [token, expiresAt, userId]);
            return true;
        } catch (error) {
            throw new Error(`Database error in updateVerificationToken: ${error.message}`);
        }
    }
}

module.exports = UserRepository;