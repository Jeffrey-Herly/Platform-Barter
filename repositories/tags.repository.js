/**
 * Tags Repository
 * Handle all tag-related database operations
 */

class TagsRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Get all global tags (system tags)
   */
  async getGlobalTags() {
    try {
      const result = await this.db.query(
        `SELECT tag_id, tag_name, tag_slug, usage_count, created_at
         FROM tags
         WHERE is_custom = false AND user_id IS NULL
         ORDER BY tag_name ASC`
      );
      return result.rows;
    } catch (error) {
      console.error('[TagsRepository] Error getting global tags:', error);
      throw error;
    }
  }

  /**
   * Get user's custom tags + global tags
   * @param {string} userId - User UUID
   */
  async getUserTags(userId) {
    try {
      const result = await this.db.query(
        `SELECT tag_id, tag_name, tag_slug, usage_count, user_id, is_custom, created_at,
                CASE WHEN is_custom = true THEN 'custom' ELSE 'global' END as tag_type
         FROM tags
         WHERE (is_custom = true AND user_id = $1)
         OR (is_custom = false AND user_id IS NULL)
         ORDER BY is_custom DESC, tag_name ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('[TagsRepository] Error getting user tags:', error);
      throw error;
    }
  }

  /**
   * Get tag by ID
   * @param {string} tagId - Tag UUID
   */
  async getTagById(tagId) {
    try {
      const result = await this.db.query(
        `SELECT * FROM tags WHERE tag_id = $1`,
        [tagId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[TagsRepository] Error getting tag by ID:', error);
      throw error;
    }
  }

  /**
   * Check if tag exists for user
   * @param {string} tagName - Tag name
   * @param {string} userId - User UUID (for custom tags)
   * @param {boolean} isCustom - Is custom tag
   */
  async tagExists(tagName, userId, isCustom) {
    try {
      const result = await this.db.query(
        `SELECT tag_id FROM tags 
         WHERE tag_name = $1 AND user_id = $2 AND is_custom = $3`,
        [tagName, userId, isCustom]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('[TagsRepository] Error checking tag existence:', error);
      throw error;
    }
  }

  /**
   * Create custom tag for user
   * @param {string} tagName - Tag name
   * @param {string} userId - User UUID
   */
  async createCustomTag(tagName, userId) {
    try {
      // Check if tag already exists for this user
      const exists = await this.tagExists(tagName, userId, true);
      if (exists) {
        throw new Error(`Tag "${tagName}" already exists for this user`);
      }

      // Generate slug from tag name
      const tagSlug = tagName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const result = await this.db.query(
        `INSERT INTO tags (tag_name, tag_slug, user_id, is_custom, usage_count)
         VALUES ($1, $2, $3, true, 0)
         RETURNING tag_id, tag_name, tag_slug, user_id, is_custom, created_at`,
        [tagName, tagSlug, userId]
      );

      console.log(`[TagsRepository] Custom tag created: ${tagName} for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      console.error('[TagsRepository] Error creating custom tag:', error);
      throw error;
    }
  }

  /**
   * Get or create tag
   * If tag exists (global), return it
   * If not exists, create as custom tag for user
   * @param {string} tagName - Tag name
   * @param {string} userId - User UUID
   */
  async getOrCreateTag(tagName, userId) {
    try {
      // First, check if global tag exists
      let result = await this.db.query(
        `SELECT tag_id, tag_name, tag_slug, user_id, is_custom, created_at
         FROM tags 
         WHERE tag_name = $1 AND is_custom = false AND user_id IS NULL`,
        [tagName]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Check if custom tag exists for this user
      result = await this.db.query(
        `SELECT tag_id, tag_name, tag_slug, user_id, is_custom, created_at
         FROM tags 
         WHERE tag_name = $1 AND is_custom = true AND user_id = $2`,
        [tagName, userId]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create new custom tag for user
      return await this.createCustomTag(tagName, userId);
    } catch (error) {
      console.error('[TagsRepository] Error in getOrCreateTag:', error);
      throw error;
    }
  }

  /**
   * Delete custom tag
   * @param {string} tagId - Tag UUID
   * @param {string} userId - User UUID (for authorization)
   */
  async deleteCustomTag(tagId, userId) {
    try {
      // Verify tag belongs to user
      const tag = await this.getTagById(tagId);
      if (!tag || tag.is_custom === false) {
        throw new Error('Cannot delete non-custom tags');
      }
      if (tag.user_id !== userId) {
        throw new Error('Unauthorized: Tag does not belong to this user');
      }

      // Delete tag (cascade will handle item_tags)
      const result = await this.db.query(
        `DELETE FROM tags WHERE tag_id = $1 AND user_id = $2 AND is_custom = true
         RETURNING tag_id`,
        [tagId, userId]
      );

      console.log(`[TagsRepository] Custom tag deleted: ${tagId}`);
      return result.rows.length > 0;
    } catch (error) {
      console.error('[TagsRepository] Error deleting custom tag:', error);
      throw error;
    }
  }

  /**
   * Search tags by name (for user's tags only)
   * @param {string} searchTerm - Search term
   * @param {string} userId - User UUID
   */
  async searchUserTags(searchTerm, userId) {
    try {
      const result = await this.db.query(
        `SELECT tag_id, tag_name, tag_slug, usage_count, user_id, is_custom, created_at,
                CASE WHEN is_custom = true THEN 'custom' ELSE 'global' END as tag_type
         FROM tags
         WHERE (tag_name ILIKE $1)
         AND ((is_custom = true AND user_id = $2) OR (is_custom = false AND user_id IS NULL))
         ORDER BY is_custom DESC, tag_name ASC
         LIMIT 20`,
        [`%${searchTerm}%`, userId]
      );
      return result.rows;
    } catch (error) {
      console.error('[TagsRepository] Error searching user tags:', error);
      throw error;
    }
  }

  /**
   * Get tags for specific item
   * @param {string} itemId - Item UUID
   */
  async getItemTags(itemId) {
    try {
      const result = await this.db.query(
        `SELECT t.tag_id, t.tag_name, t.tag_slug, t.user_id, t.is_custom, t.usage_count
         FROM tags t
         JOIN item_tags it ON t.tag_id = it.tag_id
         WHERE it.item_id = $1
         ORDER BY t.tag_name ASC`,
        [itemId]
      );
      return result.rows;
    } catch (error) {
      console.error('[TagsRepository] Error getting item tags:', error);
      throw error;
    }
  }

  /**
   * Attach tags to item
   * @param {string} itemId - Item UUID
   * @param {Array<string>} tagIds - Array of tag IDs
   */
  async attachTagsToItem(itemId, tagIds) {
    try {
      if (!tagIds || tagIds.length === 0) {
        return [];
      }

      const placeholders = tagIds.map((_, i) => `($1, $${i + 2})`).join(',');
      const result = await this.db.query(
        `INSERT INTO item_tags (item_id, tag_id)
         VALUES ${placeholders}
         ON CONFLICT DO NOTHING
         RETURNING item_id, tag_id`,
        [itemId, ...tagIds]
      );

      console.log(`[TagsRepository] Attached ${result.rows.length} tags to item ${itemId}`);
      return result.rows;
    } catch (error) {
      console.error('[TagsRepository] Error attaching tags to item:', error);
      throw error;
    }
  }

  /**
   * Detach all tags from item
   * @param {string} itemId - Item UUID
   */
  async detachAllTagsFromItem(itemId) {
    try {
      const result = await this.db.query(
        `DELETE FROM item_tags WHERE item_id = $1
         RETURNING tag_id`,
        [itemId]
      );

      console.log(`[TagsRepository] Detached ${result.rows.length} tags from item ${itemId}`);
      return result.rows;
    } catch (error) {
      console.error('[TagsRepository] Error detaching tags:', error);
      throw error;
    }
  }

  /**
   * Update item tags (detach old, attach new)
   * @param {string} itemId - Item UUID
   * @param {Array<string>} newTagIds - Array of new tag IDs
   */
  async updateItemTags(itemId, newTagIds) {
    try {
      // First detach all old tags
      await this.detachAllTagsFromItem(itemId);

      // Then attach new tags
      if (newTagIds && newTagIds.length > 0) {
        return await this.attachTagsToItem(itemId, newTagIds);
      }

      return [];
    } catch (error) {
      console.error('[TagsRepository] Error updating item tags:', error);
      throw error;
    }
  }
}

module.exports = TagsRepository;
