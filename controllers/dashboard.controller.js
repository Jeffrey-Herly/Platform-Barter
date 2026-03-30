'use strict';

/**
 * Dashboard Controller
 * Menangani HTTP requests untuk dashboard user
 */
const { saveAvatarFile, saveCoverFile } = require('../utils/file-upload');

class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * GET /dashboard
     * Display dashboard page
     */
    async getDashboard(request, reply) {
        try {
            const userId = request.user.userId;

            // Ambil overview data
            const overview = await this.dashboardService.getDashboardOverview(userId);

            return reply.view('pages/dashboard/index.ejs', {
                user: request.user,
                overview: overview.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/index.ejs', {
                user: request.user,
                overview: null,
                message: null,
                error: error.message
            });
        }
    }

    /**
     * GET /dashboard/profile
     * Display user profile page
     */
    async getProfile(request, reply) {
        try {
            const userId = request.user.userId;
            const profile = await this.dashboardService.getUserProfile(userId);
            const reviews = await this.dashboardService.getUserReviews(userId);

            return reply.view('pages/dashboard/profile.ejs', {
                user: request.user,
                profile: profile.data,
                reviews: reviews.data.reviews,
                message: request.query.message || null,
                error: request.query.error || null,
                isPublicView: false
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/profile.ejs', {
                user: request.user,
                profile: null,
                reviews: [],
                message: null,
                error: error.message,
                isPublicView: false
            });
        }
    }

    /**
     * GET /users/:id
     * Display public profile page for another user
     */
    async getPublicProfile(request, reply) {
        try {
            const targetUserId = request.params.id;
            const profile = await this.dashboardService.getUserProfile(targetUserId);
            const reviews = await this.dashboardService.getUserReviews(targetUserId);

            return reply.view('pages/dashboard/profile.ejs', {
                user: request.user,
                profile: profile.data,
                reviews: reviews.data.reviews,
                message: null,
                error: null,
                isPublicView: true
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/profile.ejs', {
                user: request.user,
                profile: null,
                reviews: [],
                message: null,
                error: error.message || 'Profil pengguna tidak ditemukan',
                isPublicView: true
            });
        }
    }

    /**
     * GET /dashboard/items
     * Display user items page
     */
    async getItems(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = parseInt(request.query.limit) || 10;
            const offset = parseInt(request.query.offset) || 0;

            const itemsData = await this.dashboardService.getUserItems(userId, limit, offset);

            return reply.view('pages/dashboard/items.ejs', {
                user: request.user,
                itemsData: itemsData.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/items.ejs', {
                user: request.user,
                itemsData: null,
                message: null,
                error: error.message
            });
        }
    }

    /**
     * GET /dashboard/notifications
     * Display notifications page
     */
    async getNotifications(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = parseInt(request.query.limit) || 20;
            const offset = parseInt(request.query.offset) || 0;

            const notificationsData = await this.dashboardService.getNotifications(userId, limit, offset);

            return reply.view('pages/dashboard/notifications.ejs', {
                user: request.user,
                notificationsData: notificationsData.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/notifications.ejs', {
                user: request.user,
                notificationsData: null,
                message: null,
                error: error.message
            });
        }
    }

    /**
     * GET /dashboard/wishlist
     * Display user wishlist page
     */
    async getWishlist(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = parseInt(request.query.limit) || 10;
            const offset = parseInt(request.query.offset) || 0;

            const wishlistData = await this.dashboardService.getUserWishlist(userId, limit, offset);

            return reply.view('pages/dashboard/wishlist.ejs', {
                user: request.user,
                wishlistData: wishlistData.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/wishlist.ejs', {
                user: request.user,
                wishlistData: null,
                message: null,
                error: error.message
            });
        }
    }

    /**
     * GET /dashboard/reviews
     * Display reviews page with pagination
     */
    async getReviews(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = parseInt(request.query.limit) || 10;
            const offset = parseInt(request.query.offset) || 0;

            const reviewsData = await this.dashboardService.getUserReviewsPaginated(userId, limit, offset);

            return reply.view('pages/dashboard/reviews.ejs', {
                user: request.user,
                reviewsData: reviewsData.data,
                message: null,
                error: null
            });
        } catch (error) {
            request.log.error(error);
            return reply.view('pages/dashboard/reviews.ejs', {
                user: request.user,
                reviewsData: null,
                message: null,
                error: error.message
            });
        }
    }

    /**
     * API: GET /api/dashboard
     * Get dashboard overview data (for AJAX)
     */
    async getDashboardAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const overview = await this.dashboardService.getDashboardOverview(userId);
            return reply.send(overview);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: GET /api/dashboard/profile
     * Get user profile data
     */
    async getProfileAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const profile = await this.dashboardService.getUserProfile(userId);
            return reply.send(profile);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: GET /api/dashboard/items
     * Get user items with pagination
     */
    async getItemsAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = Math.min(parseInt(request.query.limit) || 10, 50);
            const offset = parseInt(request.query.offset) || 0;

            const itemsData = await this.dashboardService.getUserItems(userId, limit, offset);
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
     * API: GET /api/dashboard/notifications
     * Get user notifications with pagination
     */
    async getNotificationsAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = Math.min(parseInt(request.query.limit) || 20, 100);
            const offset = parseInt(request.query.offset) || 0;

            const notificationsData = await this.dashboardService.getNotifications(userId, limit, offset);
            return reply.send(notificationsData);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: GET /api/dashboard/wishlist
     * Get user wishlist with pagination
     */
    async getWishlistAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const limit = Math.min(parseInt(request.query.limit) || 10, 50);
            const offset = parseInt(request.query.offset) || 0;

            const wishlistData = await this.dashboardService.getUserWishlist(userId, limit, offset);
            return reply.send(wishlistData);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: POST /api/dashboard/notifications/:id/read
     * Mark notification as read
     */
    async markNotificationAsReadAPI(request, reply) {
        try {
            const notificationId = request.params.id;
            const result = await this.dashboardService.markNotificationAsRead(notificationId);
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
     * API: POST /api/dashboard/notifications/read-all
     * Mark all notifications as read
     */
    async markAllNotificationsAsReadAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const result = await this.dashboardService.markAllNotificationsAsRead(userId);
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
     * API: DELETE /api/dashboard/notifications/:id
     * Delete a notification
     */
    async deleteNotificationAPI(request, reply) {
        try {
            const notificationId = request.params.id;
            const result = await this.dashboardService.deleteNotification(notificationId);
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
     * API: PUT /api/dashboard/profile
     * Update user profile
     */
    async updateProfileAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const profileData = request.body;

            const result = await this.dashboardService.updateUserProfile(userId, profileData);
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
     * API: POST /api/dashboard/profile/avatar
     * Upload / update profile avatar (image file)
     * Accepts both JSON base64 and multipart/form-data
     */
    async uploadProfileAvatarAPI(request, reply) {
        try {
            const userId = request.user.userId;
            let buffer, filename;

            // Check if request is JSON (base64 approach)
            const contentType = request.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const { fileData, fileName, mimeType } = request.body || {};
                if (!fileData || !fileName) {
                    return reply.status(400).send({
                        success: false,
                        message: 'fileData dan fileName diperlukan'
                    });
                }

                // Extract base64 data (remove data:image/...;base64, prefix)
                const base64Match = fileData.match(/^data:[^;]+;base64,(.+)$/);
                if (!base64Match) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Format base64 tidak valid'
                    });
                }

                buffer = Buffer.from(base64Match[1], 'base64');
                filename = fileName;
            } else if (request.isMultipart && request.isMultipart()) {
                // Fallback to multipart/form-data
                let filePart = request.file ? await request.file() : null;

                if (!filePart && request.parts) {
                    for await (const part of request.parts()) {
                        if (part.type === 'file') {
                            filePart = part;
                            break;
                        }
                    }
                }

                if (!filePart) {
                    return reply.status(400).send({
                        success: false,
                        message: 'File avatar tidak ditemukan dalam request'
                    });
                }

                buffer = await filePart.toBuffer();
                filename = filePart.filename;
            } else {
                return reply.status(400).send({
                    success: false,
                    message: 'Request harus JSON atau multipart/form-data'
                });
            }

            const saved = await saveAvatarFile(buffer, filename);

            await this.dashboardService.updateUserProfile(userId, {
                avatar_url: saved.url
            });

            return reply.send({
                success: true,
                message: 'Foto profil berhasil diperbarui',
                data: {
                    avatarUrl: saved.url
                }
            });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message || 'Gagal mengunggah foto profil'
            });
        }
    }

    /**
     * API: POST /api/dashboard/profile/cover
     * Upload / update profile header / cover banner
     * Accepts both JSON base64 and multipart/form-data
     */
    async uploadProfileCoverAPI(request, reply) {
        try {
            const userId = request.user.userId;
            let buffer, filename;

            const contentType = request.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const { fileData, fileName, mimeType } = request.body || {};
                if (!fileData || !fileName) {
                    return reply.status(400).send({
                        success: false,
                        message: 'fileData dan fileName diperlukan'
                    });
                }

                const base64Match = fileData.match(/^data:[^;]+;base64,(.+)$/);
                if (!base64Match) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Format base64 tidak valid'
                    });
                }

                buffer = Buffer.from(base64Match[1], 'base64');
                filename = fileName;
            } else if (request.isMultipart && request.isMultipart()) {
                let filePart = request.file ? await request.file() : null;

                if (!filePart && request.parts) {
                    for await (const part of request.parts()) {
                        if (part.type === 'file') {
                            filePart = part;
                            break;
                        }
                    }
                }

                if (!filePart) {
                    return reply.status(400).send({
                        success: false,
                        message: 'File cover tidak ditemukan dalam request'
                    });
                }

                buffer = await filePart.toBuffer();
                filename = filePart.filename;
            } else {
                return reply.status(400).send({
                    success: false,
                    message: 'Request harus JSON atau multipart/form-data'
                });
            }

            const saved = await saveCoverFile(buffer, filename);

            await this.dashboardService.updateUserProfile(userId, {
                cover_url: saved.url
            });

            return reply.send({
                success: true,
                message: 'Header banner berhasil diperbarui',
                data: {
                    coverUrl: saved.url
                }
            });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message || 'Gagal mengunggah header banner'
            });
        }
    }

    /**
     * POST /dashboard/profile/upload-avatar (native form submission)
     * Handles multipart file upload and redirects back to profile page
     */
    async uploadAvatarForm(request, reply) {
        try {
            const userId = request.user.userId;

            if (!request.isMultipart || !request.isMultipart()) {
                return reply.redirect('/dashboard/profile?error=Format+request+tidak+valid');
            }

            let filePart = request.file ? await request.file() : null;

            if (!filePart && request.parts) {
                for await (const part of request.parts()) {
                    if (part.type === 'file') {
                        filePart = part;
                        break;
                    }
                }
            }

            if (!filePart) {
                return reply.redirect('/dashboard/profile?error=File+tidak+ditemukan');
            }

            const buffer = await filePart.toBuffer();
            const saved = await saveAvatarFile(buffer, filePart.filename);

            await this.dashboardService.updateUserProfile(userId, {
                avatar_url: saved.url
            });

            return reply.redirect('/dashboard/profile?message=Foto+profil+berhasil+diperbarui');
        } catch (error) {
            request.log.error(error);
            return reply.redirect('/dashboard/profile?error=' + encodeURIComponent(error.message || 'Gagal mengunggah foto profil'));
        }
    }

    /**
     * POST /dashboard/profile/upload-cover (native form submission)
     * Handles multipart file upload and redirects back to profile page
     */
    async uploadCoverForm(request, reply) {
        try {
            const userId = request.user.userId;

            if (!request.isMultipart || !request.isMultipart()) {
                return reply.redirect('/dashboard/profile?error=Format+request+tidak+valid');
            }

            let filePart = request.file ? await request.file() : null;

            if (!filePart && request.parts) {
                for await (const part of request.parts()) {
                    if (part.type === 'file') {
                        filePart = part;
                        break;
                    }
                }
            }

            if (!filePart) {
                return reply.redirect('/dashboard/profile?error=File+tidak+ditemukan');
            }

            const buffer = await filePart.toBuffer();
            const saved = await saveCoverFile(buffer, filePart.filename);

            await this.dashboardService.updateUserProfile(userId, {
                cover_url: saved.url
            });

            return reply.redirect('/dashboard/profile?message=Header+banner+berhasil+diperbarui');
        } catch (error) {
            request.log.error(error);
            return reply.redirect('/dashboard/profile?error=' + encodeURIComponent(error.message || 'Gagal mengunggah header banner'));
        }
    }

    /**
     * API: DELETE /api/dashboard/wishlist/:id
     * Delete wishlist item
     */
    async deleteWishlistItemAPI(request, reply) {
        try {
            const wishlistId = request.params.id;
            const result = await this.dashboardService.deleteWishlistItem(wishlistId);
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
     * API: POST /api/dashboard/wishlist
     * Tambah item ke wishlist
     */
    async addWishlistItemAPI(request, reply) {
        try {
            const userId = request.user.userId;
            const { itemId } = request.body || {};

            if (!itemId) {
                return reply.status(400).send({
                    success: false,
                    message: 'itemId diperlukan'
                });
            }

            const result = await this.dashboardService.addWishlistItem(userId, itemId);
            const statusCode = result.success ? 200 : 400;

            return reply.status(statusCode).send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: GET /api/dashboard/items/:id
     * Get item detail
     */
    async getItemDetailAPI(request, reply) {
        try {
            const itemId = request.params.id;
            const result = await this.dashboardService.getItemDetail(itemId);
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
     * API: PUT /api/dashboard/items/:id
     * Update item
     */
    async updateItemAPI(request, reply) {
        try {
            const itemId = request.params.id;
            const userId = request.user.userId;
            const itemData = request.body;

            const result = await this.dashboardService.updateItem(itemId, userId, itemData);
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
     * API: DELETE /api/dashboard/items/:id
     * Delete item
     */
    async deleteItemAPI(request, reply) {
        try {
            const itemId = request.params.id;
            const userId = request.user.userId;

            const result = await this.dashboardService.deleteItem(itemId, userId);
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
     * API: POST /api/users/:id/reviews
     * Create review for another user (from public profile)
     */
    async createUserReviewAPI(request, reply) {
        try {
            const reviewerId = request.user.userId;
            const reviewedUserId = request.params.id;
            const { rating, reviewText } = request.body || {};

            const result = await this.dashboardService.createUserReview(
                reviewerId,
                reviewedUserId,
                rating,
                reviewText
            );

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(400).send({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: POST /api/users/:id/report
     * Create fraud/abuse report for another user from public profile
     */
    async createUserReportAPI(request, reply) {
        try {
            const reporterId = request.user.userId;
            const reportedUserId = request.params.id;
            const { type, description } = request.body || {};

            const result = await this.dashboardService.createUserReport(
                reporterId,
                reportedUserId,
                type,
                description
            );

            return reply.send(result);
        } catch (error) {
            request.log.error(error);
            return reply.status(400).send({
                success: false,
                message: error.message
            });
        }
    }

}

module.exports = DashboardController;
