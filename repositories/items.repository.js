'use strict';

/**
 * Items Repository
 * Menangani semua operasi database untuk items
 */
class ItemsRepository {
    constructor(pgConnection) {
        this.pg = pgConnection;
    }

    /**
     * Get all items milik user dengan pagination
     * @param {string} userId - User ID
     * @param {number} limit - Jumlah items per halaman
     * @param {number} offset - Offset untuk pagination
     * @returns {Promise<Array>} Array of items
     */
    async getUserItems(userId, limit, offset) {
        const query = `
            SELECT
                i.item_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                i.updated_at,
                c.category_id,
                c.category_name,
                it.type_id,
                it.type_name,
                ic.condition_id,
                ic.condition_name,
                (SELECT image_url FROM item_images
                 WHERE item_id = i.item_id AND is_primary = true
                 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM item_images WHERE item_id = i.item_id) as image_count,
                (SELECT COUNT(*) FROM wishlists WHERE item_id = i.item_id) as wishlist_count
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id
            WHERE i.user_id = $1
            ORDER BY i.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await this.pg.query(query, [userId, limit, offset]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get user items: ${error.message}`);
        }
    }

    /**
     * Get total count of user items
     * @param {string} userId - User ID
     * @returns {Promise<number>} Total count
     */
    async getUserItemsCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM items
            WHERE user_id = $1
        `;

        try {
            const result = await this.pg.query(query, [userId]);
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            throw new Error(`Failed to get items count: ${error.message}`);
        }
    }

    /**
     * Get item detail by ID
     * @param {string} itemId - Item ID
     * @returns {Promise<Object>} Item detail object
     */
    async getItemById(itemId) {
        const query = `
            SELECT
                i.item_id,
                i.user_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                i.updated_at,
                c.category_id,
                c.category_name,
                c.category_slug,
                it.type_id,
                it.type_name,
                ic.condition_id,
                ic.condition_name,
                u.full_name as owner_name,
                u.email as owner_email,
                up.avatar_url,
                up.rating_average,
                up.total_successful_barters
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id
            JOIN users u ON i.user_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE i.item_id = $1
        `;

        try {
            const result = await this.pg.query(query, [itemId]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to get item by ID: ${error.message}`);
        }
    }

    /**
     * Get all images for an item
     * @param {string} itemId - Item ID
     * @returns {Promise<Array>} Array of images
     */
    async getItemImages(itemId) {
        const query = `
            SELECT
                image_id as id,
                image_url as url,
                is_primary,
                display_order,
                uploaded_at
            FROM item_images
            WHERE item_id = $1
            ORDER BY display_order ASC, uploaded_at ASC
        `;

        try {
            const result = await this.pg.query(query, [itemId]);
            // Normalize image URLs - fix old /public/ prefixes
            return result.rows.map(row => ({
                ...row,
                url: row.url && row.url.startsWith('/public/uploads/')
                    ? row.url.replace('/public/', '')
                    : row.url
            }));
        } catch (error) {
            throw new Error(`Failed to get item images: ${error.message}`);
        }
    }

    /**
     * Get all tags for an item
     * @param {string} itemId - Item ID
     * @returns {Promise<Array>} Array of tags
     */
    async getItemTags(itemId) {
        const query = `
            SELECT
                t.tag_id,
                t.tag_name,
                t.tag_slug
            FROM item_tags it
            JOIN tags t ON it.tag_id = t.tag_id
            WHERE it.item_id = $1
        `;

        try {
            const result = await this.pg.query(query, [itemId]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get item tags: ${error.message}`);
        }
    }

    /**
     * Create new item
     * @param {string} userId - User ID
     * @param {Object} itemData - Item data
     * @returns {Promise<Object>} Created item
     */
    async createItem(userId, itemData) {
        const query = `
            INSERT INTO items (
                user_id,
                category_id,
                type_id,
                condition_id,
                skill_level_id,
                title,
                description,
                estimated_value,
                is_available
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        try {
            const result = await this.pg.query(query, [
                userId,
                itemData.categoryId,
                itemData.typeId,
                itemData.conditionId || null,
                itemData.skillLevelId || null,
                itemData.title,
                itemData.description,
                itemData.estimatedValue || null,
                true // is_available default true
            ]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to create item: ${error.message}`);
        }
    }

    /**
     * Update existing item
     * @param {string} itemId - Item ID
     * @param {string} userId - User ID (untuk authorization check)
     * @param {Object} itemData - Item data to update
     * @returns {Promise<Object>} Updated item
     */
    async updateItem(itemId, userId, itemData) {
        const query = `
            UPDATE items
            SET
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                estimated_value = COALESCE($4, estimated_value),
                is_available = COALESCE($5, is_available),
                category_id = COALESCE($6, category_id),
                type_id = COALESCE($7, type_id),
                condition_id = COALESCE($8, condition_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE item_id = $1 AND user_id = $9
            RETURNING *
        `;

        try {
            const result = await this.pg.query(query, [
                itemId,
                itemData.title || null,
                itemData.description || null,
                itemData.estimatedValue || null,
                itemData.isAvailable !== undefined ? itemData.isAvailable : null,
                itemData.categoryId || null,
                itemData.typeId || null,
                itemData.conditionId || null,
                userId
            ]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to update item: ${error.message}`);
        }
    }

    /**
     * Delete item
     * @param {string} itemId - Item ID
     * @param {string} userId - User ID (untuk authorization check)
     * @returns {Promise<Object>} Deleted item
     */
    async deleteItem(itemId, userId) {
        const query = `
            DELETE FROM items
            WHERE item_id = $1 AND user_id = $2
            RETURNING *
        `;

        try {
            const result = await this.pg.query(query, [itemId, userId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to delete item: ${error.message}`);
        }
    }

    /**
     * Add image to item
     * @param {string} itemId - Item ID
     * @param {string} imageUrl - Image URL
     * @param {boolean} isPrimary - Is primary image
     * @param {number} displayOrder - Display order
     * @returns {Promise<Object>} Created image record
     */
    async addItemImage(itemId, imageUrl, isPrimary = false, displayOrder = 0) {
        // If isPrimary is true, set all other images to false
        if (isPrimary) {
            await this.pg.query(`
                UPDATE item_images
                SET is_primary = false
                WHERE item_id = $1
            `, [itemId]);
        }

        const query = `
            INSERT INTO item_images (item_id, image_url, is_primary, display_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        try {
            const result = await this.pg.query(query, [itemId, imageUrl, isPrimary, displayOrder]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to add item image: ${error.message}`);
        }
    }

    /**
     * Delete item image
     * @param {string} imageId - Image ID
     * @returns {Promise<Object>} Deleted image record
     */
    async deleteItemImage(imageId) {
        const query = `
            DELETE FROM item_images
            WHERE image_id = $1
            RETURNING *
        `;

        try {
            const result = await this.pg.query(query, [imageId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to delete item image: ${error.message}`);
        }
    }

    /**
     * Add tags to item
     * @param {string} itemId - Item ID
     * @param {Array<string>} tagIds - Array of tag IDs
     * @returns {Promise<void>}
     */
    async addItemTags(itemId, tagIds) {
        if (!tagIds || tagIds.length === 0) {
            return;
        }

        // First delete existing tags
        await this.pg.query(`
            DELETE FROM item_tags
            WHERE item_id = $1
        `, [itemId]);

        // Then insert new tags
        const values = tagIds.map((tagId, index) => `($1, $${index + 2})`).join(',');
        const params = [itemId, ...tagIds];

        const query = `
            INSERT INTO item_tags (item_id, tag_id)
            VALUES ${values}
        `;

        try {
            await this.pg.query(query, params);
        } catch (error) {
            throw new Error(`Failed to add item tags: ${error.message}`);
        }
    }

    /**
     * Get all categories
     * @returns {Promise<Array>} Array of categories
     */
    async getAllCategories() {
        const query = `
            SELECT
                category_id,
                category_name,
                category_slug,
                description,
                icon_url,
                parent_category_id
            FROM categories
            WHERE is_active = true
            ORDER BY category_name ASC
        `;

        try {
            const result = await this.pg.query(query);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get categories: ${error.message}`);
        }
    }

    /**
     * Get all item types
     * @returns {Promise<Array>} Array of item types
     */
    async getAllItemTypes() {
        const query = `
            SELECT
                type_id,
                type_name,
                description
            FROM item_types
            ORDER BY type_name ASC
        `;

        try {
            const result = await this.pg.query(query);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get item types: ${error.message}`);
        }
    }

    /**
     * Get all item conditions
     * @returns {Promise<Array>} Array of item conditions
     */
    async getAllItemConditions() {
        const query = `
            SELECT
                condition_id,
                condition_name,
                description
            FROM item_conditions
            ORDER BY condition_name ASC
        `;

        try {
            const result = await this.pg.query(query);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get item conditions: ${error.message}`);
        }
    }

    /**
     * Get all tags
     * @returns {Promise<Array>} Array of tags
     */
    async getAllTags() {
        const query = `
            SELECT
                tag_id,
                tag_name,
                tag_slug,
                usage_count
            FROM tags
            ORDER BY usage_count DESC, tag_name ASC
        `;

        try {
            const result = await this.pg.query(query);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get tags: ${error.message}`);
        }
    }

    /**
     * Get all skill levels for service items
     * @returns {Promise<Array>} Array of skill levels
     */
    async getAllSkillLevels() {
        const query = `
            SELECT
                level_id,
                level_code,
                level_name,
                description,
                sort_order
            FROM skill_levels
            ORDER BY sort_order ASC
        `;

        try {
            const result = await this.pg.query(query);
            return result.rows;
        } catch (error) {
            // If table doesn't exist yet, return empty array
            if (error.message.includes('does not exist')) {
                return [];
            }
            throw new Error(`Failed to get skill levels: ${error.message}`);
        }
    }

    /**
     * Search items by title or description
     * @param {string} searchQuery - Search query
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of items
     */
    async searchItems(searchQuery, limit, offset, filters = {}) {
        const { categoryId = null, typeId = null } = filters || {};

        const conditions = ['i.is_available = true'];
        const params = [];
        let idx = 1;

        if (searchQuery && searchQuery.trim()) {
            const normalizedQuery = searchQuery.trim();

            conditions.push(`
                (
                    -- Full-text search on precomputed search_vector (indexed)
                    i.search_vector @@ plainto_tsquery('indonesian', $${idx})
                    OR
                    -- Prefix / fuzzy match on title & description (pg_trgm indexes)
                    i.title ILIKE $${idx + 1} || '%' 
                    OR i.description ILIKE $${idx + 1} || '%'
                    OR i.title % $${idx + 1}
                    OR i.description % $${idx + 1}
                )
            `);

            // $idx for full-text, $idx+1 for trigram/prefix
            params.push(normalizedQuery);
            params.push(normalizedQuery);
            idx += 2;
        }


        if (categoryId) {
            conditions.push(`i.category_id = $${idx}`);
            params.push(categoryId);
            idx += 1;
        }

        if (typeId) {
            conditions.push(`i.type_id = $${idx}`);
            params.push(typeId);
            idx += 1;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT
                i.item_id,
                i.user_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                i.updated_at,
                c.category_id,
                c.category_name,
                it.type_id,
                it.type_name,
                ic.condition_id,
                ic.condition_name,
                u.full_name as owner_name,
                u.email as owner_email,
                NULL as owner_avatar,
                (SELECT AVG(CAST(rating as DECIMAL)) FROM reviews WHERE reviews.reviewed_user_id = i.user_id) as owner_rating,
                (SELECT image_url FROM item_images
                 WHERE item_images.item_id = i.item_id AND item_images.is_primary = true
                 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM item_images WHERE item_images.item_id = i.item_id) as image_count,
                (SELECT COUNT(*) FROM wishlists WHERE wishlists.item_id = i.item_id) as wishlist_count
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            JOIN users u ON i.user_id = u.user_id
            LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id
            ${whereClause}
            ORDER BY i.view_count DESC, i.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;

        try {
            params.push(limit, offset);
            const result = await this.pg.query(query, params);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to search items: ${error.message}`);
        }
    }

    /**
     * Get available items by category
     * @param {string} categoryId - Category ID
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of items
     */
    async getItemsByCategory(categoryId, limit, offset) {
        const query = `
            SELECT
                i.item_id,
                i.user_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                c.category_name,
                it.type_name,
                u.full_name as owner_name,
                (SELECT image_url FROM item_images
                 WHERE item_id = i.item_id AND is_primary = true
                 LIMIT 1) as primary_image
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            JOIN users u ON i.user_id = u.user_id
            WHERE c.category_id = $1 AND i.is_available = true
            ORDER BY i.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await this.pg.query(query, [categoryId, limit, offset]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get items by category: ${error.message}`);
        }
    }

    /**
     * Increment view count for item (only once per user)
     * @param {string} itemId - Item ID
     * @param {string} userId - User ID (optional, for anonymous set to null)
     * @returns {Promise<Object>} { viewAdded: boolean, newViewCount: number }
     */
    async incrementViewCount(itemId, userId = null) {
        try {
            // Start transaction
            await this.pg.query('BEGIN');

            // Check if user already viewed this item
            const checkQuery = `
                SELECT view_id FROM item_views 
                WHERE item_id = $1 AND user_id IS NOT DISTINCT FROM $2
                LIMIT 1
            `;
            const checkResult = await this.pg.query(checkQuery, [itemId, userId]);

            let viewAdded = false;
            let newViewCount = null;

            // If not viewed before, add view record and increment count
            if (checkResult.rows.length === 0) {
                // Insert into item_views
                const insertViewQuery = `
                    INSERT INTO item_views (item_id, user_id, viewed_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT DO NOTHING
                `;
                await this.pg.query(insertViewQuery, [itemId, userId]);

                // Increment view count
                const incrementQuery = `
                    UPDATE items
                    SET view_count = view_count + 1
                    WHERE item_id = $1
                    RETURNING view_count
                `;
                const result = await this.pg.query(incrementQuery, [itemId]);
                newViewCount = result.rows[0]?.view_count || 0;
                viewAdded = true;
            } else {
                // Get current view count without incrementing
                const getCountQuery = `
                    SELECT view_count FROM items WHERE item_id = $1
                `;
                const result = await this.pg.query(getCountQuery, [itemId]);
                newViewCount = result.rows[0]?.view_count || 0;
            }

            // Commit transaction
            await this.pg.query('COMMIT');

            return {
                viewAdded,
                newViewCount
            };
        } catch (error) {
            // Rollback on error
            await this.pg.query('ROLLBACK').catch(() => {});
            throw new Error(`Failed to increment view count: ${error.message}`);
        }
    }

    /**
     * Update image order and set primary image
     * @param {Array<string>} imageIds - Array of image IDs in new order
     * @returns {Promise<Object>} Result of the operation
     */
    async updateImageOrder(imageIds) {
        try {
            // Start transaction
            await this.pg.query('BEGIN');

            // Update all images: set is_primary to false and update display_order
            for (let i = 0; i < imageIds.length; i++) {
                const isPrimary = i === 0; // First image is primary
                const query = `
                    UPDATE item_images
                    SET display_order = $1, is_primary = $2
                    WHERE image_id = $3
                `;
                await this.pg.query(query, [i, isPrimary, imageIds[i]]);
            }

            // Commit transaction
            await this.pg.query('COMMIT');

            return {
                success: true,
                message: 'Image order updated successfully'
            };
        } catch (error) {
            // Rollback on error
            await this.pg.query('ROLLBACK');
            throw new Error(`Failed to update image order: ${error.message}`);
        }
    }

    /**
     * Get all available items dengan pagination (rekomendasi default)
     * Excludes items from the current user
     * @param {string} userId - Current user ID (to exclude their items)
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of items with owner details
     */
    async getAllAvailableItems(userId, limit, offset) {
        const query = `
            SELECT
                i.item_id,
                i.user_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                i.updated_at,
                c.category_id,
                c.category_name,
                it.type_id,
                it.type_name,
                ic.condition_id,
                ic.condition_name,
                u.full_name as owner_name,
                u.email as owner_email,
                NULL as owner_avatar,
                (SELECT AVG(CAST(rating as DECIMAL)) FROM reviews WHERE reviews.reviewed_user_id = i.user_id) as owner_rating,
                (SELECT image_url FROM item_images
                 WHERE item_images.item_id = i.item_id AND item_images.is_primary = true
                 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM item_images WHERE item_images.item_id = i.item_id) as image_count,
                (SELECT COUNT(*) FROM wishlists WHERE wishlists.item_id = i.item_id) as wishlist_count
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            JOIN users u ON i.user_id = u.user_id
            LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id
            WHERE i.is_available = true AND i.user_id != $1
            ORDER BY i.view_count DESC, i.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            console.log('[Repository] getAllAvailableItems query starting - userId:', userId, 'limit:', limit, 'offset:', offset);
            const result = await this.pg.query(query, [userId, limit, offset]);
            console.log('[Repository] Query executed, rows returned:', result.rows.length);

            const itemsWithDetails = await Promise.all(
                result.rows.map(async (item) => {
                    const images = await this.getItemImages(item.item_id);
                    const tags = await this.getItemTags(item.item_id);
                    return {
                        ...item,
                        images,
                        tags
                    };
                })
            );

            console.log('[Repository] getAllAvailableItems completed, returning:', itemsWithDetails.length, 'items');
            return itemsWithDetails;
        } catch (error) {
            console.error('[Repository] getAllAvailableItems error:', error.message);
            console.error('[Repository] Error details:', error);
            throw new Error(`Failed to get all available items: ${error.message}`);
        }
    }

    /**
     * Simpan riwayat pencarian user
     */
    async saveUserSearchHistory(userId, keyword) {
        const trimmed = (keyword || '').trim();
        if (!userId || !trimmed) {
            return;
        }

        const query = `
            INSERT INTO user_search_history (user_id, keyword)
            VALUES ($1, $2)
        `;

        try {
            await this.pg.query(query, [userId, trimmed]);
        } catch (error) {
            console.warn('[ItemsRepository.saveUserSearchHistory] Failed:', error.message);
        }
    }

    /**
     * Ambil keyword pencarian terbaru user
     */
    async getRecentSearchKeywords(userId, limit = 5) {
        const query = `
            SELECT keyword
            FROM user_search_history
            WHERE user_id = $1
            ORDER BY searched_at DESC
            LIMIT $2
        `;

        try {
            const result = await this.pg.query(query, [userId, limit]);
            return result.rows.map(row => row.keyword);
        } catch (error) {
            console.warn('[ItemsRepository.getRecentSearchKeywords] Failed:', error.message);
            return [];
        }
    }

    /**
     * Get recommended items berdasarkan keyword pencarian user.
     * Semua item available dikembalikan, tapi yang match keyword diutamakan.
     */
    async getRecommendedItemsByKeywords(userId, keywords, limit, offset) {
        if (!keywords || keywords.length === 0) {
            return this.getAllAvailableItems(userId, limit, offset);
        }

        const patterns = Array.from(
            new Set(
                keywords
                    .map(k => (k || '').trim())
                    .filter(Boolean)
                    .map(k => `%${k}%`)
            )
        );

        if (patterns.length === 0) {
            return this.getAllAvailableItems(userId, limit, offset);
        }

        const query = `
            SELECT
                i.item_id,
                i.user_id,
                i.title,
                i.description,
                i.estimated_value,
                i.is_available,
                i.view_count,
                i.created_at,
                i.updated_at,
                c.category_id,
                c.category_name,
                it.type_id,
                it.type_name,
                ic.condition_id,
                ic.condition_name,
                u.full_name as owner_name,
                u.email as owner_email,
                NULL as owner_avatar,
                (SELECT AVG(CAST(rating as DECIMAL)) FROM reviews WHERE reviews.reviewed_user_id = i.user_id) as owner_rating,
                (SELECT image_url FROM item_images
                 WHERE item_images.item_id = i.item_id AND item_images.is_primary = true
                 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM item_images WHERE item_images.item_id = i.item_id) as image_count,
                (SELECT COUNT(*) FROM wishlists WHERE wishlists.item_id = i.item_id) as wishlist_count,
                CASE
                    WHEN i.title ILIKE ANY($2)
                      OR i.description ILIKE ANY($2)
                      OR c.category_name ILIKE ANY($2)
                    THEN 1
                    ELSE 0
                END AS relevance_score
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            JOIN item_types it ON i.type_id = it.type_id
            JOIN users u ON i.user_id = u.user_id
            LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id
            WHERE i.is_available = true
              AND i.user_id != $1
            ORDER BY relevance_score DESC, i.view_count DESC, i.created_at DESC
            LIMIT $3 OFFSET $4
        `;

        try {
            console.log('[Repository] getRecommendedItemsByKeywords for user:', userId, 'patterns:', patterns);
            const result = await this.pg.query(query, [userId, patterns, limit, offset]);

            const itemsWithDetails = await Promise.all(
                result.rows.map(async (item) => {
                    const images = await this.getItemImages(item.item_id);
                    const tags = await this.getItemTags(item.item_id);
                    return {
                        ...item,
                        images,
                        tags
                    };
                })
            );

            return itemsWithDetails;
        } catch (error) {
            console.error('[Repository] getRecommendedItemsByKeywords error:', error.message);
            console.error('[Repository] Error details:', error);
            return this.getAllAvailableItems(userId, limit, offset);
        }
    }
}

module.exports = ItemsRepository;
