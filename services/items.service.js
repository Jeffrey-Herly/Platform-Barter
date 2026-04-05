'use strict';

const { saveImageFiles } = require('../utils/file-upload');

/**
 * Items Service
 * Menangani business logic untuk items
 */
class ItemsService {
    constructor(itemsRepository) {
        this.itemsRepository = itemsRepository;
    }

    /**
     * Get user items dengan pagination
     * @param {string} userId - User ID
     * @param {number} limit - Items per page
     * @param {number} offset - Pagination offset
     * @returns {Promise<Object>} Items data with pagination info
     */
    async getUserItems(userId, limit, offset) {
        try {
            const items = await this.itemsRepository.getUserItems(userId, limit, offset);
            const totalCount = await this.itemsRepository.getUserItemsCount(userId);

            return {
                success: true,
                data: {
                    items: items.map(item => this._formatItemForList(item)),
                    totalCount,
                    limit,
                    offset,
                    hasMore: (offset + limit) < totalCount
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get item detail dengan semua informasi lengkap
     * @param {string} itemId - Item ID
     * @returns {Promise<Object>} Item detail
     */
    async getItemDetail(itemId, userId = null) {
        try {
            // Get item detail
            const item = await this.itemsRepository.getItemById(itemId);
            if (!item) {
                return {
                    success: false,
                    message: 'Item not found'
                };
            }

            // Get images
            const images = await this.itemsRepository.getItemImages(itemId);

            // Get tags
            const tags = await this.itemsRepository.getItemTags(itemId);

            // Increment view count (only if user hasn't viewed before)
            const viewResult = await this.itemsRepository.incrementViewCount(itemId, userId);

            // Normalize image URLs - fix old /public/ prefixes
            const normalizeImageUrl = (url) => {
                if (!url) return null;
                if (url.startsWith('/public/uploads/')) {
                    return url.replace('/public/', '');
                }
                return url;
            };

            return {
                success: true,
                data: {
                    id: item.item_id,
                    title: item.title,
                    description: item.description,
                    estimatedValue: item.estimated_value,
                    isAvailable: item.is_available,
                    viewCount: item.view_count,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    category: {
                        id: item.category_id,
                        name: item.category_name,
                        slug: item.category_slug
                    },
                    type: {
                        id: item.type_id,
                        name: item.type_name
                    },
                    condition: item.condition_id ? {
                        id: item.condition_id,
                        name: item.condition_name
                    } : null,
                    owner: {
                        id: item.user_id,
                        name: item.owner_name,
                        email: item.owner_email,
                        avatar: item.avatar_url,
                        rating: item.rating_average,
                        successfulBarters: item.total_successful_barters
                    },
                    images: images.map(img => ({
                        id: img.id || img.image_id, // Support both old and new field names
                        url: normalizeImageUrl(img.url || img.image_url), // Support both old and new field names
                        isPrimary: img.is_primary,
                        displayOrder: img.display_order
                    })),
                    tags: tags.map(tag => ({
                        id: tag.tag_id || tag.id,
                        name: tag.tag_name || tag.name,
                        slug: tag.tag_slug || tag.slug,
                        isCustom: tag.is_custom !== undefined ? tag.is_custom : tag.isCustom
                    }))
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Create new item
     * @param {string} userId - User ID
     * @param {Object} itemData - Item data
     * @returns {Promise<Object>} Created item
     */
    async createItem(userId, itemData) {
        try {
            // Validate required fields
            if (!itemData.title || !itemData.title.trim()) {
                return {
                    success: false,
                    message: 'Title is required'
                };
            }

            if (!itemData.description || !itemData.description.trim()) {
                return {
                    success: false,
                    message: 'Description is required'
                };
            }

            if (!itemData.categoryId) {
                return {
                    success: false,
                    message: 'Category is required'
                };
            }

            if (!itemData.typeId) {
                return {
                    success: false,
                    message: 'Item type is required'
                };
            }

            // Tentukan condition / skill level
            let conditionId = itemData.conditionId || null;
            let skillLevelId = itemData.skillLevelId || null;

            // Jika skill level diisi (item jasa), kosongkan condition_id agar konsisten dengan schema
            if (skillLevelId) {
                conditionId = null;
            }

            // Create item
            const createdItem = await this.itemsRepository.createItem(userId, {
                title: itemData.title.trim(),
                description: itemData.description.trim(),
                categoryId: itemData.categoryId,
                typeId: itemData.typeId,
                conditionId,
                skillLevelId,
                estimatedValue: itemData.estimatedValue ? parseFloat(itemData.estimatedValue) : null
            });

            // Add tags if provided
            if (itemData.tags && itemData.tags.length > 0) {
                // Parse tags if it's a JSON string
                let tagIds = itemData.tags;
                if (typeof tagIds === 'string') {
                    try {
                        tagIds = JSON.parse(tagIds);
                    } catch (e) {
                        console.warn('Failed to parse tags JSON:', itemData.tags);
                        tagIds = [];
                    }
                }
                
                // Only proceed if we have valid tag IDs
                if (Array.isArray(tagIds) && tagIds.length > 0) {
                    await this.itemsRepository.addItemTags(createdItem.item_id, tagIds);
                }
            }

            // Handle images if provided
            if (itemData.images && itemData.images.length > 0) {
                try {
                    // Save images to disk
                    const savedFiles = await saveImageFiles(itemData.images);

                    // Store image URLs in database
                    for (let i = 0; i < savedFiles.length; i++) {
                        const file = savedFiles[i];
                        // First image is primary
                        const isPrimary = i === 0;
                        await this.itemsRepository.addItemImage(
                            createdItem.item_id,
                            file.url,
                            isPrimary,
                            i
                        );
                    }
                } catch (error) {
                    // Log error but don't fail the whole request
                    console.error('Error saving images:', error);
                }
            }

            return {
                success: true,
                message: 'Item created successfully',
                data: {
                    id: createdItem.item_id,
                    title: createdItem.title,
                    description: createdItem.description,
                    estimatedValue: createdItem.estimated_value,
                    isAvailable: createdItem.is_available,
                    createdAt: createdItem.created_at
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Update existing item
     * @param {string} itemId - Item ID
     * @param {string} userId - User ID (untuk authorization)
     * @param {Object} itemData - Item data to update
     * @returns {Promise<Object>} Updated item
     */
    async updateItem(itemId, userId, itemData) {
        try {
            // Validate at least one field is being updated
            if (!itemData.title && !itemData.description && !itemData.categoryId &&
                !itemData.typeId && itemData.isAvailable === undefined) {
                return {
                    success: false,
                    message: 'No fields to update'
                };
            }

            // Update item
            const updatedItem = await this.itemsRepository.updateItem(itemId, userId, {
                title: itemData.title ? itemData.title.trim() : null,
                description: itemData.description ? itemData.description.trim() : null,
                categoryId: itemData.categoryId || null,
                typeId: itemData.typeId || null,
                conditionId: itemData.conditionId || null,
                estimatedValue: itemData.estimatedValue ? parseFloat(itemData.estimatedValue) : null,
                isAvailable: itemData.isAvailable
            });

            if (!updatedItem) {
                return {
                    success: false,
                    message: 'Item not found or unauthorized'
                };
            }

            // Update tags if provided
            if (itemData.tags) {
                // Parse tags if it's a JSON string
                let tagIds = itemData.tags;
                if (typeof tagIds === 'string') {
                    try {
                        tagIds = JSON.parse(tagIds);
                    } catch (e) {
                        console.warn('Failed to parse tags JSON:', itemData.tags);
                        tagIds = [];
                    }
                }
                
                // Only proceed if we have valid tag IDs
                if (Array.isArray(tagIds) && tagIds.length > 0) {
                    await this.itemsRepository.addItemTags(itemId, tagIds);
                } else if (Array.isArray(tagIds) && tagIds.length === 0) {
                    // Clear tags if empty array
                    await this.itemsRepository.addItemTags(itemId, []);
                }
            }

            // Handle new images if provided
            if (itemData.newImages && itemData.newImages.length > 0) {
                try {
                    // Save images to disk
                    const savedFiles = await saveImageFiles(itemData.newImages);

                    // Store image URLs in database
                    for (let i = 0; i < savedFiles.length; i++) {
                        const file = savedFiles[i];
                        await this.itemsRepository.addItemImage(
                            itemId,
                            file.url,
                            false,
                            i + 100  // Display order
                        );
                    }
                } catch (error) {
                    // Log error but don't fail the whole request
                    console.error('Error saving images:', error);
                }
            }

            return {
                success: true,
                message: 'Item updated successfully',
                data: {
                    id: updatedItem.item_id,
                    title: updatedItem.title,
                    description: updatedItem.description,
                    estimatedValue: updatedItem.estimated_value,
                    isAvailable: updatedItem.is_available,
                    updatedAt: updatedItem.updated_at
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Delete item
     * @param {string} itemId - Item ID
     * @param {string} userId - User ID (untuk authorization)
     * @returns {Promise<Object>} Result
     */
    async deleteItem(itemId, userId) {
        try {
            const deletedItem = await this.itemsRepository.deleteItem(itemId, userId);

            if (!deletedItem) {
                return {
                    success: false,
                    message: 'Item not found or unauthorized'
                };
            }

            return {
                success: true,
                message: 'Item deleted successfully',
                data: {
                    id: deletedItem.item_id,
                    title: deletedItem.title
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get form data untuk create/edit item (categories, types, conditions, tags, skill levels)
     * @returns {Promise<Object>} Form data
     */
    async getFormData() {
        try {
            const [categories, types, conditions, tags, skillLevels] = await Promise.all([
                this.itemsRepository.getAllCategories(),
                this.itemsRepository.getAllItemTypes(),
                this.itemsRepository.getAllItemConditions(),
                this.itemsRepository.getAllTags(),
                this.itemsRepository.getAllSkillLevels()
            ]);

            return {
                success: true,
                data: {
                    categories: categories.map(c => ({
                        id: c.category_id,
                        name: c.category_name,
                        slug: c.category_slug,
                        icon: c.icon_url,
                        parent: c.parent_category_id
                    })),
                    types: types.map(t => ({
                        id: t.type_id,
                        name: t.type_name
                    })),
                    conditions: conditions.map(c => ({
                        id: c.condition_id,
                        name: c.condition_name
                    })),
                    skillLevels: skillLevels.map(s => ({
                        id: s.level_id,
                        code: s.level_code,
                        name: s.level_name
                    })),
                    tags: tags.map(t => ({
                        id: t.tag_id,
                        name: t.tag_name,
                        slug: t.tag_slug
                    }))
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Search items
     * @param {string} query - Search query
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @param {string|null} userId - Current user ID (untuk simpan history)
     * @returns {Promise<Object>} Search results
     */
    async searchItems(query, limit, offset, userId = null, filters = {}) {
        try {
            const trimmedQuery = (query || '').trim();
            const hasTextQuery = trimmedQuery.length >= 2;
            const { categoryId = null, typeId = null } = filters || {};

            // Jika tidak ada keyword dan tidak ada filter, tolak (agar tidak mengembalikan semua data tanpa kriteria)
            if (!hasTextQuery && !categoryId && !typeId) {
                return {
                    success: false,
                    message: 'Search query too short'
                };
            }

            // Simpan riwayat pencarian user (best-effort) hanya jika ada keyword
            if (userId && hasTextQuery) {
                this.itemsRepository.saveUserSearchHistory(userId, trimmedQuery)
                    .catch(err => {
                        console.warn('[ItemsService.searchItems] Failed to save search history:', err.message);
                    });
            }

            // Jika tidak ada keyword tapi ada filter, kirim null sebagai search term
            const searchTerm = hasTextQuery ? trimmedQuery : null;

            const items = await this.itemsRepository.searchItems(searchTerm, limit, offset, {
                categoryId,
                typeId
            });

            // Fetch full details for each item (images, tags, owner info)
            const itemsWithDetails = await Promise.all(
                items.map(async (item) => {
                    const images = await this.itemsRepository.getItemImages(item.item_id);
                    const tags = await this.itemsRepository.getItemTags(item.item_id);

                    return {
                        ...item,
                        images,
                        tags
                    };
                })
            );

            return {
                success: true,
                data: {
                    items: itemsWithDetails.map(item => this._formatItemWithDetails(item)),
                    query: trimmedQuery
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get items by category
     * @param {string} categoryId - Category ID
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Object>} Items by category
     */
    async getItemsByCategory(categoryId, limit, offset) {
        try {
            const items = await this.itemsRepository.getItemsByCategory(categoryId, limit, offset);

            return {
                success: true,
                data: {
                    items: items.map(item => this._formatItemForList(item))
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get recommended items
     * Relevan dengan user_search_history (keyword terbaru) dan fallback ke popular items
     * @param {string} userId - Current user ID
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Object>} Recommended items
     */
    async getRecommendedItems(userId, limit, offset) {
        try {
            // Ambil keyword pencarian terbaru user
            const keywords = await this.itemsRepository.getRecentSearchKeywords(userId, 5);

            let items;
            if (keywords && keywords.length > 0) {
                // Rekomendasi berdasarkan keyword (judul/deskripsi/kategori)
                items = await this.itemsRepository.getRecommendedItemsByKeywords(userId, keywords, limit, offset);
            } else {
                // Fallback: item populer / terbaru
                items = await this.itemsRepository.getAllAvailableItems(userId, limit, offset);
            }

            return {
                success: true,
                data: {
                    items: items.map(item => this._formatItemWithDetails(item))
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Format item dengan details (untuk list view dengan info owner dan images)
     * @param {Object} item - Item dari database
     * @returns {Object} Formatted item with details
     * @private
     */
    _formatItemWithDetails(item) {
        // Normalize image URLs - remove old /public/ prefix if present
        const normalizeImageUrl = (url) => {
            if (!url) return null;
            if (url.startsWith('/public/uploads/')) {
                return url.replace('/public/', '');
            }
            return url;
        };

        const images = (item.images || []).map(img => ({
            ...img,
            url: normalizeImageUrl(img.url)
        }));

        return {
            id: item.item_id,
            title: item.title,
            description: item.description.length > 100
                ? item.description.substring(0, 100) + '...'
                : item.description,
            estimatedValue: item.estimated_value,
            isAvailable: item.is_available,
            viewCount: item.view_count,
            createdAt: item.created_at,
            category: {
                id: item.category_id,
                name: item.category_name
            },
            type: {
                name: item.type_name
            },
            condition: item.condition_name || 'N/A',
            owner: {
                id: item.user_id,
                name: item.owner_name,
                email: item.owner_email,
                avatar: item.owner_avatar,
                rating: item.owner_rating ? parseFloat(item.owner_rating) : null
            },
            images: images,
            tags: item.tags || []
        };
    }

    /**
     * Format item untuk list view
     * @param {Object} item - Item dari database
     * @returns {Object} Formatted item
     * @private
     */
    _formatItemForList(item) {
        // Normalize image URL - remove old /public/ prefix if present
        const normalizeImageUrl = (url) => {
            if (!url) return null;
            if (url.startsWith('/public/uploads/')) {
                return url.replace('/public/', '');
            }
            return url;
        };

        const primaryImage = normalizeImageUrl(item.primary_image);

        return {
            id: item.item_id,
            title: item.title,
            description: item.description.length > 100
                ? item.description.substring(0, 100) + '...'
                : item.description,
            estimatedValue: item.estimated_value,
            isAvailable: item.is_available,
            viewCount: item.view_count,
            createdAt: item.created_at,
            category: {
                name: item.category_name
            },
            type: {
                name: item.type_name
            },
            condition: item.condition_name || 'N/A',
            primaryImage: primaryImage, // Changed from 'image' to 'primaryImage' to match template
            image: primaryImage, // Keep for backward compatibility
            ownerName: item.owner_name,
            wishlistCount: item.wishlist_count,
            imageCount: item.image_count
        };
    }

    /**
     * Delete image
     * @param {string} imageId - Image ID
     * @returns {Promise<Object>} Result
     */
    async deleteImage(imageId) {
        try {
            const deleted = await this.itemsRepository.deleteItemImage(imageId);

            if (!deleted) {
                return {
                    success: false,
                    message: 'Image not found'
                };
            }

            return {
                success: true,
                message: 'Image deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Reorder images and set primary image
     * @param {Array<string>} imageIds - Array of image IDs in new order
     * @returns {Promise<Object>} Result
     */
    async reorderImages(imageIds) {
        try {
            if (!imageIds || imageIds.length === 0) {
                return {
                    success: false,
                    message: 'Image IDs are required'
                };
            }

            const result = await this.itemsRepository.updateImageOrder(imageIds);

            return {
                success: true,
                message: 'Images reordered successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = ItemsService;
