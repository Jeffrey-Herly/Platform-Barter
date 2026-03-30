// src/controllers/barter-transaction.controller.js
'use strict';

/**
 * Barter Transaction Controller
 * Menangani HTTP requests untuk barter transactions
 */

class BarterTransactionController {
    constructor(transactionService) {
        this.transactionService = transactionService;
    }

    /**
     * POST /barter/create-offer
     * Create new barter offer
     */
    async createBarterOffer(request, reply) {
        try {
            const { requester_item_id, owner_item_id, notes } = request.body;
            const requester_id = request.user.userId;

            // Validate
            if (!requester_item_id || !owner_item_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'Item IDs diperlukan'
                });
            }

            // Call service
            const result = await this.transactionService.createBarterOffer(
                requester_id,
                requester_item_id,
                owner_item_id,
                notes
            );

            return reply.code(201).send(result);
        } catch (error) {
            console.error('Error in createBarterOffer:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal membuat penawaran barter'
            });
        }
    }

    /**
     * POST /barter/:transaction_id/accept
     * Accept barter offer
     */
    async acceptBarterOffer(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            const result = await this.transactionService.acceptBarterOffer(transaction_id, user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in acceptBarterOffer:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal menerima penawaran barter'
            });
        }
    }

    /**
     * POST /barter/:transaction_id/reject
     * Reject barter offer
     */
    async rejectBarterOffer(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            const result = await this.transactionService.rejectBarterOffer(transaction_id, user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in rejectBarterOffer:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal menolak penawaran barter'
            });
        }
    }

    /**
     * GET /barter/:transaction_id
     * Get transaction detail (untuk chat/negotiation page)
     */
    async getTransactionDetail(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            const result = await this.transactionService.getTransactionDetail(transaction_id, user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in getTransactionDetail:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal mengambil detail transaksi'
            });
        }
    }

    /**
     * GET /barter/:transaction_id (page)
     * Display transaction detail page dengan chat
     */
    async getTransactionDetailPage(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            console.log(`[getTransactionDetailPage] Params - transaction_id: ${transaction_id}, user_id: ${user_id}`);

            if (!transaction_id) {
                console.log('[getTransactionDetailPage] Transaction ID is empty');
                return reply.status(400).view('pages/barter/transaction-detail.ejs', {
                    currentUser: request.user,
                    transaction: null,
                    partnerAvatar: null,
                    error: 'Transaction ID tidak ditemukan'
                });
            }

            console.log('[getTransactionDetailPage] Calling service.getTransactionDetail()');
            const result = await this.transactionService.getTransactionDetail(transaction_id, user_id);

            console.log('[getTransactionDetailPage] Service returned:', result.success ? 'SUCCESS' : 'FAILED');

            if (!result.success) {
                console.log('[getTransactionDetailPage] Returning 404 - transaction not found');
                return reply.status(404).view('pages/barter/transaction-detail.ejs', {
                    currentUser: request.user,
                    transaction: null,
                    partnerAvatar: null,
                    error: result.message || 'Transaksi tidak ditemukan'
                });
            }

            const transaction = result.data;

            // Determine partner avatar
            const isRequester = transaction.requester_id === user_id;
            const partnerAvatar = isRequester
                ? transaction.owner_profile?.avatar_url
                : transaction.requester_profile?.avatar_url;

            console.log('[getTransactionDetailPage] Rendering page with transaction data');

            return reply.view('pages/barter/transaction-detail.ejs', {
                currentUser: request.user,
                transaction: transaction,
                partnerAvatar: partnerAvatar || '/images/default-avatar.png',
                error: null
            });
        } catch (error) {
            console.error('[getTransactionDetailPage] CAUGHT ERROR:', error.message);
            console.error('[getTransactionDetailPage] Full error:', error);

            // Ensure all required fields are present
            return reply.status(500).view('pages/barter/transaction-detail.ejs', {
                currentUser: request.user || {},
                transaction: null,
                partnerAvatar: null,
                error: error.message || 'Terjadi kesalahan saat memproses transaksi'
            });
        }
    }

    /**
     * GET /barter/list
     * Get list of transactions for the user (API endpoint)
     */
    async getUserTransactions(request, reply) {
        try {
            const user_id = request.user.userId;
            const limit = parseInt(request.query.limit) || 10;
            const offset = parseInt(request.query.offset) || 0;

            console.log(`[getUserTransactions] Fetching transactions for user: ${user_id}`);

            const result = await this.transactionService.getUserTransactions(user_id, limit, offset);

            return reply.send(result);
        } catch (error) {
            console.error('Error in getUserTransactions:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal mengambil daftar transaksi'
            });
        }
    }

    /**
     * GET /barter/transactions/page
     * Display transactions list page (HTML view)
     */
    async getTransactionsListPage(request, reply) {
        try {
            const user_id = request.user.userId;
            const limit = parseInt(request.query.limit) || 10;
            const offset = parseInt(request.query.offset) || 0;

            console.log(`[getTransactionsListPage] Fetching for user: ${user_id}, limit: ${limit}, offset: ${offset}`);

            const result = await this.transactionService.getUserTransactions(user_id, limit, offset);

            if (!result.success) {
                return reply.status(400).view('pages/barter/transactions-list.ejs', {
                    currentUser: request.user,
                    transactionsList: null,
                    pagination: null,
                    error: result.message || 'Gagal mengambil daftar transaksi'
                });
            }

            return reply.view('pages/barter/transactions-list.ejs', {
                currentUser: request.user,
                transactionsList: result.data.transactions,
                pagination: result.data.pagination,
                error: null
            });
        } catch (error) {
            console.error('[getTransactionsListPage] ERROR:', error);

            return reply.status(500).view('pages/barter/transactions-list.ejs', {
                currentUser: request.user || {},
                transactionsList: null,
                pagination: null,
                error: error.message || 'Terjadi kesalahan saat memproses daftar transaksi'
            });
        }
    }

    /**
     * POST /barter/:transaction_id/complete
     * Complete barter offer (mark item as received)
     */
    async completeTransaction(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            const result = await this.transactionService.completeTransaction(transaction_id, user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in completeTransaction:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal mengonfirmasi penerimaan barang'
            });
        }
    }
}

module.exports = BarterTransactionController;
