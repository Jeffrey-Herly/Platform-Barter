'use strict';

/**
 * API Items Controller
 * Menangani HTTP API requests untuk items operations (create, read, update, delete)
 */
class ApiItemsController {
    constructor(itemsService) {
        this.itemsService = itemsService;
    }

    /**
     * GET /api/items
     * Get user items with pagination
     */
    async getUserItems(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = Math.min(parseInt(request.query.limit) || 10, 50);
            const offset = parseInt(request.query.offset) || 0;

            const itemsData = await this.itemsService.getUserItems(userId, limit, offset);
            return reply.send(itemsData);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/items
     * Create new item
     */
    async createItem(request, reply) {
        try {
            const userId = request.user.userId;
            const itemData = {};
            const files = [];

            // Check if request has multipart content
            const contentType = request.headers['content-type'];

            if (contentType && contentType.includes('multipart/form-data')) {
                // Handle multipart form data
                for await (const part of request.parts()) {
                    if (part.type === 'field') {
                        // Handle form fields
                        const value = part.value;

                        if (part.fieldname === 'tags') {
                            // Tags can come as JSON string or individual values
                            if (!itemData.tags) {
                                itemData.tags = [];
                            }
                            
                            if (value && value.trim()) {
                                // Try to parse as JSON first
                                try {
                                    const parsed = JSON.parse(value);
                                    if (Array.isArray(parsed)) {
                                        itemData.tags = parsed;
                                    } else {
                                        itemData.tags.push(value.trim());
                                    }
                                } catch (e) {
                                    // Not JSON, treat as individual value
                                    itemData.tags.push(value.trim());
                                }
                            }
                        } else if (part.fieldname === 'isAvailable') {
                            // Handle boolean field
                            itemData[part.fieldname] = value === 'true' || value === true;
                        } else {
                            // Trim string values and assign
                            if (typeof value === 'string') {
                                itemData[part.fieldname] = value.trim();
                            } else {
                                itemData[part.fieldname] = value;
                            }
                        }
                    } else if (part.type === 'file') {
                        // Handle file uploads
                        const buffer = await part.toBuffer();
                        files.push({
                            filename: part.filename,
                            mimetype: part.mimetype,
                            encoding: part.encoding,
                            buffer: buffer
                        });
                    }
                }
                if (files.length > 0) {
                    itemData.images = files;
                }
            } else {
                // Fallback to request.body if no multipart
                Object.assign(itemData, request.body);
                
                // Parse tags if it's a JSON string
                if (itemData.tags && typeof itemData.tags === 'string') {
                    try {
                        itemData.tags = JSON.parse(itemData.tags);
                    } catch (e) {
                        itemData.tags = [itemData.tags];
                    }
                }
            }

            // Debug logging
            request.log.info('Item data received:', itemData);

            const result = await this.itemsService.createItem(userId, itemData);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            return reply.status(201).send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/items/:id
     * Get item detail
     */
    async getItemDetail(request, reply) {
        try {
            const itemId = request.params.id;

            const result = await this.itemsService.getItemDetail(itemId);

            if (!result.success) {
                return reply.status(404).send(result);
            }

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * PUT /api/items/:id
     * Update item
     */
    async updateItem(request, reply) {
        try {
            const itemId = request.params.id;
            const userId = request.user.userId;
            const itemData = {};
            const files = [];

            // Check if request has multipart data
            const contentType = request.headers['content-type'];
            if (contentType && contentType.includes('multipart/form-data')) {
                // Handle multipart form data
                for await (const part of request.parts()) {
                    if (part.type === 'field') {
                        // Handle form fields
                        const value = part.value;

                        if (part.fieldname === 'tags') {
                            // Tags can come as JSON string or individual values
                            if (!itemData.tags) {
                                itemData.tags = [];
                            }
                            
                            if (value && value.trim()) {
                                // Try to parse as JSON first
                                try {
                                    const parsed = JSON.parse(value);
                                    if (Array.isArray(parsed)) {
                                        itemData.tags = parsed;
                                    } else {
                                        itemData.tags.push(value.trim());
                                    }
                                } catch (e) {
                                    // Not JSON, treat as individual value
                                    itemData.tags.push(value.trim());
                                }
                            }
                        } else if (part.fieldname === 'isAvailable') {
                            // Handle boolean field
                            itemData[part.fieldname] = value === 'true' || value === true;
                        } else {
                            // Trim string values and assign
                            if (typeof value === 'string') {
                                itemData[part.fieldname] = value.trim();
                            } else {
                                itemData[part.fieldname] = value;
                            }
                        }
                    } else if (part.type === 'file') {
                        // Handle file uploads
                        const buffer = await part.toBuffer();
                        files.push({
                            filename: part.filename,
                            mimetype: part.mimetype,
                            encoding: part.encoding,
                            buffer: buffer
                        });
                    }
                }
                if (files.length > 0) {
                    itemData.newImages = files;
                }
            } else {
                // Fallback to request.body
                Object.assign(itemData, request.body);
            }

            const result = await this.itemsService.updateItem(itemId, userId, itemData);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            // Jika ada query redirect (kasus form HTML), redirect ke URL tersebut
            const redirectTo = request.query && request.query.redirect;
            if (redirectTo) {
                // Fastify v5 signature: redirect(url, code?)
                return reply.redirect(redirectTo, 303);
            }

            // Default: response JSON (untuk API / fetch)
            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * DELETE /api/items/:id
     * Delete item
     */
    async deleteItem(request, reply) {
        try {
            const itemId = request.params.id;
            const userId = request.user.userId;

            const result = await this.itemsService.deleteItem(itemId, userId);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/items/search
     * Search items
     */
    async searchItems(request, reply) {
        try {
            const query = request.query.q;
            const limit = Math.min(parseInt(request.query.limit) || 20, 50);
            const offset = parseInt(request.query.offset) || 0;

            const userId = request.user && request.user.userId;
            const filters = {
                categoryId: request.query.categoryId || null,
                typeId: request.query.typeId || null
            };

            const result = await this.itemsService.searchItems(query, limit, offset, userId, filters);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/items/category/:id
     * Get items by category
     */
    async getItemsByCategory(request, reply) {
        try {
            const categoryId = request.params.id;
            const limit = Math.min(parseInt(request.query.limit) || 20, 50);
            const offset = parseInt(request.query.offset) || 0;

            const result = await this.itemsService.getItemsByCategory(categoryId, limit, offset);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * DELETE /api/items/images/:id
     * Delete item image
     */
    async deleteImage(request, reply) {
        try {
            const imageId = request.params.id;

            const result = await this.itemsService.deleteImage(imageId);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/items/recommended
     * Get recommended items (excluding current user's items)
     */
    async getRecommendedItems(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = Math.min(parseInt(request.query.limit) || 12, 50);
            const offset = parseInt(request.query.offset) || 0;

            const result = await this.itemsService.getRecommendedItems(userId, limit, offset);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * PUT /api/items/images/reorder
     * Reorder item images
     */
    async reorderImages(request, reply) {
        try {
            const { imageIds } = request.body;

            const result = await this.itemsService.reorderImages(imageIds);

            if (!result.success) {
                return reply.status(400).send(result);
            }

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/items/my-items
     * Get current user's items (simplified for dropdowns/modals)
     */
    async getMyItems(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = 100; // Get up to 100 items
            const offset = 0;

            const itemsData = await this.itemsService.getUserItems(userId, limit, offset);

            if (!itemsData.success) {
                return reply.status(500).send(itemsData);
            }

            // Return simplified response for dropdown/modal use
            return reply.send({
                success: true,
                data: {
                    items: itemsData.data.items.map(item => ({
                        item_id: item.id,
                        item_title: item.title,
                        item_type: item.type.name,
                        category_name: item.category.name,
                        item_image: item.image
                    }))
                }
            });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = ApiItemsController;
