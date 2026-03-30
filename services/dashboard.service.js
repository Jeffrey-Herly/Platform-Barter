'use strict';

/**
 * Dashboard Service
 * Menangani business logic untuk dashboard user
 */
class DashboardService {
    constructor(dashboardRepository) {
        this.dashboardRepository = dashboardRepository;
    }

    /**
     * Ambil dashboard overview data user
     */
    async getDashboardOverview(userId) {
        try {
            const profile = await this.dashboardRepository.getUserProfileWithStats(userId);
            const statistics = await this.dashboardRepository.getUserStatistics(userId);
            const unreadNotifications = await this.dashboardRepository.getUnreadNotifications(userId, 5);
            const activeTransactions = await this.dashboardRepository.getActiveBarterTransactions(userId, 3);

            if (!profile) {
                throw new Error('User profile not found');
            }

            return {
                success: true,
                data: {
                    profile: {
                        userId: profile.user_id,
                        fullName: profile.full_name,
                        email: profile.email,
                        phoneNumber: profile.phone_number,
                        avatar: profile.avatar_url,
                        cover: profile.cover_url,
                        bio: profile.bio,
                        address: profile.address,
                        city: profile.city,
                        province: profile.province,
                        postalCode: profile.postal_code,
                        rating: profile.rating_average,
                        totalRatings: profile.total_ratings,
                        totalSuccessfulBarters: profile.total_successful_barters,
                        totalItems: profile.total_items,
                        availableItems: profile.available_items,
                        createdAt: profile.created_at,
                        lastLogin: profile.last_login
                    },
                    statistics: {
                        totalItems: statistics.total_items,
                        availableItems: statistics.available_items,
                        unavailableItems: statistics.unavailable_items,
                        completedBarters: statistics.completed_barters,
                        wishlistCount: statistics.wishlist_count,
                        rating: statistics.rating,
                        totalReviews: statistics.total_reviews
                    },
                    recentNotifications: unreadNotifications.map(notif => ({
                        id: notif.notification_id,
                        title: notif.title,
                        message: notif.message,
                        type: notif.type_name,
                        isRead: notif.is_read,
                        referenceId: notif.reference_id,
                        referenceType: notif.reference_type,
                        createdAt: notif.created_at
                    })),
                    activeTransactions: activeTransactions.map(trans => ({
                        id: trans.transaction_id,
                        otherUserName: trans.other_user_name,
                        requesterItemTitle: trans.requester_item_title,
                        ownerItemTitle: trans.owner_item_title,
                        status: trans.status_name,
                        role: trans.role,
                        updatedAt: trans.updated_at
                    }))
                }
            };
        } catch (error) {
            throw new Error(`Failed to get dashboard overview: ${error.message}`);
        }
    }

    /**
     * Ambil profile lengkap user
     */
    async getUserProfile(userId) {
        try {
            const profile = await this.dashboardRepository.getUserProfileWithStats(userId);

            if (!profile) {
                throw new Error('User profile not found');
            }

            return {
                success: true,
                data: {
                    userId: profile.user_id,
                    fullName: profile.full_name,
                    email: profile.email,
                    phoneNumber: profile.phone_number,
                    avatar: profile.avatar_url,
                    cover: profile.cover_url,
                    bio: profile.bio,
                    address: profile.address,
                    city: profile.city,
                    province: profile.province,
                    postalCode: profile.postal_code,
                    rating: profile.rating_average,
                    totalRatings: profile.total_ratings,
                    totalSuccessfulBarters: profile.total_successful_barters,
                    totalItems: profile.total_items,
                    availableItems: profile.available_items,
                    createdAt: profile.created_at,
                    lastLogin: profile.last_login
                }
            };
        } catch (error) {
            throw new Error(`Failed to get user profile: ${error.message}`);
        }
    }

    /**
     * Ambil notifikasi user dengan pagination
     */
    async getNotifications(userId, limit = 20, offset = 0) {
        try {
            const notifications = await this.dashboardRepository.getAllNotifications(userId, limit, offset);
            const unreadCount = await this.dashboardRepository.getUnreadNotificationCount(userId);

            return {
                success: true,
                data: {
                    notifications: notifications.map(notif => ({
                        id: notif.notification_id,
                        title: notif.title,
                        message: notif.message,
                        type: notif.type_name,
                        isRead: notif.is_read,
                        referenceId: notif.reference_id,
                        referenceType: notif.reference_type,
                        createdAt: notif.created_at
                    })),
                    unreadCount
                }
            };
        } catch (error) {
            throw new Error(`Failed to get notifications: ${error.message}`);
        }
    }

    /**
     * Ambil user items dengan pagination
     */
    async getUserItems(userId, limit = 10, offset = 0) {
        try {
            const items = await this.dashboardRepository.getUserItems(userId, limit, offset);
            const totalCount = await this.dashboardRepository.getUserItemsCount(userId);

            return {
                success: true,
                data: {
                    items: items.map(item => ({
                        id: item.item_id,
                        title: item.title,
                        description: item.description,
                        estimatedValue: item.estimated_value,
                        isAvailable: item.is_available,
                        viewCount: item.view_count,
                        categoryName: item.category_name,
                        type: item.type_name,
                        condition: item.condition_name,
                        primaryImage: item.primary_image,
                        createdAt: item.created_at
                    })),
                    totalCount,
                    limit,
                    offset
                }
            };
        } catch (error) {
            throw new Error(`Failed to get user items: ${error.message}`);
        }
    }

    /**
     * Ambil wishlist user dengan pagination
     */
    async getUserWishlist(userId, limit = 10, offset = 0) {
        try {
            const wishlist = await this.dashboardRepository.getUserWishlist(userId, limit, offset);
            const totalCount = await this.dashboardRepository.getUserWishlistCount(userId);

            return {
                success: true,
                data: {
                    items: wishlist.map(item => ({
                        id: item.wishlist_id,
                        itemId: item.item_id,
                        title: item.title,
                        description: item.description,
                        estimatedValue: item.estimated_value,
                        viewCount: item.view_count,
                        categoryName: item.category_name,
                        ownerName: item.owner_name,
                        ownerId: item.owner_id,
                        primaryImage: item.primary_image,
                        createdAt: item.created_at
                    })),
                    totalCount,
                    limit,
                    offset
                }
            };
        } catch (error) {
            throw new Error(`Failed to get wishlist: ${error.message}`);
        }
    }

    /**
     * Tambah item ke wishlist
     */
    async addWishlistItem(userId, itemId) {
        try {
            const created = await this.dashboardRepository.createWishlistItem(userId, itemId);

            if (!created) {
                return {
                    success: false,
                    message: 'Item sudah ada di wishlist Anda'
                };
            }

            return {
                success: true,
                message: 'Item berhasil ditambahkan ke wishlist',
                data: {
                    id: created.wishlist_id
                }
            };
        } catch (error) {
            throw new Error(`Failed to add wishlist item: ${error.message}`);
        }
    }

    /**
     * Ambil reviews terhadap user
     */
    async getUserReviews(userId) {
        try {
            const reviews = await this.dashboardRepository.getUserReviews(userId);

            return {
                success: true,
                data: {
                    reviews: reviews.map(review => ({
                        id: review.review_id,
                        rating: review.rating,
                        text: review.review_text,
                        reviewerName: review.reviewer_name,
                        reviewerId: review.reviewer_id,
                        createdAt: review.created_at
                    }))
                }
            };
        } catch (error) {
            throw new Error(`Failed to get reviews: ${error.message}`);
        }
    }

    /**
     * Buat review baru untuk user lain berdasarkan transaksi barter yang sudah selesai.
     */
    async createUserReview(reviewerId, reviewedUserId, rating, reviewText) {
        try {
            const parsedRating = Number(rating);

            if (!parsedRating || Number.isNaN(parsedRating)) {
                throw new Error('Rating harus berupa angka');
            }

            if (parsedRating < 1 || parsedRating > 5) {
                throw new Error('Rating harus antara 1 sampai 5');
            }

            if (reviewerId === reviewedUserId) {
                throw new Error('Tidak boleh memberikan review ke diri sendiri');
            }

            // Cari transaksi selesai terbaru antara kedua user yang belum direview
            const tx = await this.dashboardRepository.findLatestCompletedTransactionForReview(
                reviewerId,
                reviewedUserId
            );

            if (!tx) {
                throw new Error('Anda belum memiliki transaksi selesai dengan pengguna ini atau sudah memberikan review');
            }

            const created = await this.dashboardRepository.createUserReview({
                transactionId: tx.transaction_id,
                reviewerId,
                reviewedUserId,
                rating: parsedRating,
                reviewText
            });

            return {
                success: true,
                message: 'Review berhasil dikirim',
                data: {
                    id: created.review_id,
                    rating: created.rating,
                    text: created.review_text,
                    createdAt: created.created_at
                }
            };
        } catch (error) {
            throw new Error(`Failed to create review: ${error.message}`);
        }
    }

    /**
     * Create fraud/abuse report for another user from profile page.
     */
    async createUserReport(reporterId, reportedUserId, typeName, description) {
        try {
            if (!typeName) {
                throw new Error('Tipe laporan diperlukan');
            }

            const normalized = String(typeName).toUpperCase();
            const allowed = ['FRAUD', 'SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'OTHER'];
            if (!allowed.includes(normalized)) {
                throw new Error('Tipe laporan tidak valid');
            }

            if (reporterId === reportedUserId) {
                throw new Error('Anda tidak dapat melaporkan diri sendiri');
            }

            // Minimal panjang deskripsi untuk laporan yang berguna
            if (!description || String(description).trim().length < 10) {
                throw new Error('Deskripsi laporan terlalu singkat. Jelaskan masalahnya dengan lebih detail.');
            }

            const typeRow = await this.dashboardRepository.getReportTypeByName(normalized);
            if (!typeRow) {
                throw new Error('Tipe laporan tidak tersedia di sistem');
            }

            const created = await this.dashboardRepository.createUserReport({
                reporterId,
                reportedUserId,
                typeId: typeRow.type_id,
                description: description.trim()
            });

            return {
                success: true,
                message: 'Laporan berhasil dikirim dan akan ditinjau oleh admin',
                data: {
                    id: created.report_id,
                    status: created.status,
                    createdAt: created.created_at
                }
            };
        } catch (error) {
            throw new Error(`Failed to create report: ${error.message}`);
        }
    }

    /**
     * Get user reviews with pagination
     * @param {string} userId - User ID
     * @param {number} limit - Items per page
     * @param {number} offset - Pagination offset
     * @returns {Promise<Object>} Reviews data with pagination info
     */
    async getUserReviewsPaginated(userId, limit, offset) {
        try {
            const reviews = await this.dashboardRepository.getUserReviewsPaginated(userId, limit, offset);
            const totalCount = await this.dashboardRepository.getUserReviewsCount(userId);

            return {
                success: true,
                data: {
                    reviews: reviews.map(review => ({
                        id: review.review_id,
                        rating: review.rating,
                        text: review.review_text,
                        reviewerName: review.reviewer_name,
                        reviewerId: review.reviewer_id,
                        createdAt: review.created_at
                    })),
                    totalCount,
                    limit,
                    offset,
                    hasMore: (offset + limit) < totalCount
                }
            };
        } catch (error) {
            throw new Error(`Failed to get reviews: ${error.message}`);
        }
    }

    /**
     * Mark notification sebagai read
     */
    async markNotificationAsRead(notificationId) {
        try {
            const result = await this.dashboardRepository.markNotificationAsRead(notificationId);

            if (!result) {
                throw new Error('Notification not found');
            }

            return {
                success: true,
                message: 'Notification marked as read'
            };
        } catch (error) {
            throw new Error(`Failed to mark notification as read: ${error.message}`);
        }
    }

    /**
     * Mark semua notifications sebagai read
     */
    async markAllNotificationsAsRead(userId) {
        try {
            await this.dashboardRepository.markAllNotificationsAsRead(userId);

            return {
                success: true,
                message: 'All notifications marked as read'
            };
        } catch (error) {
            throw new Error(`Failed to mark all notifications as read: ${error.message}`);
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, profileData) {
        try {
            // Validate input
            const allowedFields = ['bio', 'address', 'city', 'province', 'postal_code', 'avatar_url', 'cover_url'];
            const sanitizedData = {};

            for (const field of allowedFields) {
                if (profileData[field] !== undefined) {
                    sanitizedData[field] = profileData[field];
                }
            }

            const result = await this.dashboardRepository.updateUserProfile(userId, sanitizedData);

            if (!result) {
                throw new Error('Failed to update profile');
            }

            return {
                success: true,
                message: 'Profile updated successfully',
                data: result
            };
        } catch (error) {
            throw new Error(`Failed to update profile: ${error.message}`);
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        try {
            const result = await this.dashboardRepository.deleteNotification(notificationId);

            if (!result) {
                throw new Error('Notification not found');
            }

            return {
                success: true,
                message: 'Notification deleted'
            };
        } catch (error) {
            throw new Error(`Failed to delete notification: ${error.message}`);
        }
    }

    /**
     * Delete wishlist item
     */
    async deleteWishlistItem(wishlistId) {
        try {
            const result = await this.dashboardRepository.deleteWishlistItem(wishlistId);

            if (!result) {
                throw new Error('Wishlist item not found');
            }

            return {
                success: true,
                message: 'Item removed from wishlist'
            };
        } catch (error) {
            throw new Error(`Failed to delete wishlist item: ${error.message}`);
        }
    }

    /**
     * Delete item
     */
    async deleteItem(itemId, userId) {
        try {
            const result = await this.dashboardRepository.deleteItem(itemId, userId);

            if (!result) {
                throw new Error('Item not found or you do not have permission to delete it');
            }

            return {
                success: true,
                message: 'Item deleted successfully'
            };
        } catch (error) {
            throw new Error(`Failed to delete item: ${error.message}`);
        }
    }

    /**
     * Get item detail
     */
    async getItemDetail(itemId) {
        try {
            const item = await this.dashboardRepository.getItemById(itemId);

            if (!item) {
                throw new Error('Item not found');
            }

            return {
                success: true,
                data: {
                    id: item.item_id,
                    title: item.title,
                    description: item.description,
                    estimatedValue: item.estimated_value,
                    isAvailable: item.is_available,
                    viewCount: item.view_count,
                    categoryName: item.category_name,
                    categoryId: item.category_id,
                    typeName: item.type_name,
                    typeId: item.type_id,
                    conditionName: item.condition_name,
                    conditionId: item.condition_id,
                    primaryImage: item.primary_image,
                    createdAt: item.created_at
                }
            };
        } catch (error) {
            throw new Error(`Failed to get item detail: ${error.message}`);
        }
    }

    /**
     * Update item
     */
    async updateItem(itemId, userId, itemData) {
        try {
            // Validate input
            const allowedFields = ['title', 'description', 'estimated_value', 'is_available', 'category_id', 'type_id', 'condition_id'];
            const sanitizedData = {};

            for (const field of allowedFields) {
                if (itemData[field] !== undefined) {
                    sanitizedData[field] = itemData[field];
                }
            }

            const result = await this.dashboardRepository.updateItem(itemId, userId, sanitizedData);

            if (!result) {
                throw new Error('Item not found or you do not have permission to update it');
            }

            return {
                success: true,
                message: 'Item updated successfully',
                data: {
                    id: result.item_id,
                    title: result.title,
                    description: result.description,
                    estimatedValue: result.estimated_value,
                    isAvailable: result.is_available
                }
            };
        } catch (error) {
            throw new Error(`Failed to update item: ${error.message}`);
        }
    }
}

module.exports = DashboardService;
