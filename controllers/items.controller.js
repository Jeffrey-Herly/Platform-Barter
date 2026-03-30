'use strict';

/**
 * Items Controller
 * Menangani HTTP requests untuk items management (create, edit, delete)
 */
class ItemsController {
    constructor(itemsService) {
        this.itemsService = itemsService;
    }

    /**
     * GET /items/search
     * Display search page with recommended items
     */
    async searchPage(request, reply) {
        try {
            console.log('[Items Controller] searchPage() called');

            // Get form data (categories for filtering)
            const formDataResult = await this.itemsService.getFormData();
            console.log('[Items Controller] Form data retrieved:', formDataResult.success ? 'success' : 'failed');

            const result = reply.view('pages/dashboard/search.ejs', {
                user: request.user,
                formData: formDataResult.data,
                recommendedItems: [], // Recommended items will be loaded via API
                message: null,
                error: null
            });

            console.log('[Items Controller] Search page rendered successfully');
            return result;
        } catch (error) {
            console.error('[Items Controller] Error in searchPage:', error.message);
            request.log.error(error);
            return reply.view('pages/dashboard/search.ejs', {
                user: request.user,
                formData: null,
                recommendedItems: [],
                message: null,
                error: error.message
            });
        }
    }

    /**
     * GET /items/create
     * Display create item page
     */
    async createItemPage(request, reply) {
        try {
            // Get form data (categories, types, conditions, tags)
            const formDataResult = await this.itemsService.getFormData();

            return reply.view('pages/dashboard/create-item.ejs', {
                user: request.user,
                formData: formDataResult.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/create-item.ejs', {
                user: request.user,
                formData: null,
                message: null,
                error: error.message
            });
        }
    }

    /**
     * GET /items/:id
     * Display item detail page
     */
    async viewItemPage(request, reply) {
        try {
            const itemId = request.params.id;
            const userId = request.user?.userId || null; // null for anonymous users

            // Get item detail (pass userId for per-user view tracking)
            const itemDetailResult = await this.itemsService.getItemDetail(itemId, userId);

            if (!itemDetailResult.success) {
                return reply.status(404).view('pages/dashboard/view-item.ejs', {
                    user: request.user,
                    itemData: null,
                    message: null,
                    error: 'Item tidak ditemukan'
                });
            }

            return reply.view('pages/dashboard/view-item.ejs', {
                user: request.user,
                itemData: itemDetailResult.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).view('pages/dashboard/view-item.ejs', {
                user: request.user,
                itemData: null,
                message: null,
                error: error.message
            });
        }
    }

    /**
     * GET /items/:id/edit
     * Display edit item page
     */
    async editItemPage(request, reply) {
        try {
            const itemId = request.params.id;
            const userId = request.user.userId;

            // Get item detail (pass userId for per-user view tracking)
            const itemDetailResult = await this.itemsService.getItemDetail(itemId, userId);

            if (!itemDetailResult.success) {
                return reply.status(404).view('pages/dashboard/edit-item.ejs', {
                    user: request.user,
                    itemData: null,
                    formData: null,
                    message: null,
                    error: 'Item tidak ditemukan'
                });
            }

            // Check authorization - item harus milik user
            if (itemDetailResult.data.owner.id !== userId) {
                return reply.status(403).view('pages/dashboard/edit-item.ejs', {
                    user: request.user,
                    itemData: null,
                    formData: null,
                    message: null,
                    error: 'Anda tidak memiliki akses untuk edit item ini'
                });
            }

            // Get form data
            const formDataResult = await this.itemsService.getFormData();

            return reply.view('pages/dashboard/edit-item.ejs', {
                user: request.user,
                itemData: itemDetailResult.data,
                formData: formDataResult.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/edit-item.ejs', {
                user: request.user,
                itemData: null,
                formData: null,
                message: null,
                error: error.message
            });
        }
    }
}

module.exports = ItemsController;
