// src/services/barter-transaction.service.js
'use strict';

/**
 * Barter Transaction Service
 * Business logic untuk membuat dan manage barter transactions/offers
 *
 * RESPONSIBILITIES:
 * - Validate business rules untuk barter
 * - Create barter transaction
 * - Update status transaction
 * - Create related notifications
 */

class BarterTransactionService {
    constructor(transactionRepository, itemRepository, userRepository, notificationService) {
        this.transactionRepository = transactionRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    /**
     * Create new barter offer/transaction
     * @param {string} requester_id - User yang membuat offer
     * @param {string} requester_item_id - Item yang ditawarkan
     * @param {string} owner_item_id - Item yang diinginkan
     * @param {string} notes - Optional notes/pesan
     * @returns {Promise<object>} Created transaction
     */
    async createBarterOffer(requester_id, requester_item_id, owner_item_id, notes = null) {
        try {
            // Validate items
            if (!requester_item_id || !owner_item_id) {
                throw new Error('Item IDs diperlukan');
            }

            if (requester_item_id === owner_item_id) {
                throw new Error('Tidak bisa barter dengan item yang sama');
            }

            // Get requester item
            const requesterItem = await this.itemRepository.getItemById(requester_item_id);
            if (!requesterItem) {
                throw new Error('Item yang Anda tawarkan tidak ditemukan');
            }

            // Check ownership
            if (requesterItem.user_id !== requester_id) {
                throw new Error('Item yang Anda tawarkan bukan milik Anda');
            }

            // Get owner item
            const ownerItem = await this.itemRepository.getItemById(owner_item_id);
            if (!ownerItem) {
                throw new Error('Item yang Anda inginkan tidak ditemukan');
            }

            // Check items are available
            if (!requesterItem.is_available) {
                throw new Error('Item yang Anda tawarkan sedang tidak tersedia');
            }

            if (!ownerItem.is_available) {
                throw new Error('Item yang Anda inginkan sedang tidak tersedia');
            }

            // Don't allow user to barter with themselves
            if (ownerItem.user_id === requester_id) {
                throw new Error('Anda tidak bisa barter dengan item milik Anda sendiri');
            }

            // Get status PENDING
            const pendingStatus = await this.transactionRepository.getStatusByName('PENDING');
            if (!pendingStatus) {
                throw new Error('Status PENDING tidak ditemukan di database');
            }

            // Create transaction
            console.log(`[createBarterOffer] Creating transaction with:`, {
                requester_id,
                owner_id: ownerItem.user_id,
                requester_item_id,
                owner_item_id,
                status_id: pendingStatus.status_id
            });

            const transaction = await this.transactionRepository.create({
                requester_id,
                owner_id: ownerItem.user_id,
                requester_item_id,
                owner_item_id,
                status_id: pendingStatus.status_id,
                notes: notes ? notes.trim() : null,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            });

            console.log(`[createBarterOffer] Transaction created:`, transaction);

            if (!transaction) {
                throw new Error('Gagal membuat penawaran barter');
            }

            // Create notification untuk owner (penerima offer)
            const requesterUser = await this.userRepository.findById(requester_id);
            await this.notificationService.createBarterRequestNotification(
                ownerItem.user_id,
                transaction.transaction_id,
                requesterUser.full_name
            );

            return {
                success: true,
                message: 'Penawaran barter berhasil dibuat',
                data: {
                    transaction_id: transaction.transaction_id,
                    status: 'PENDING',
                    created_at: transaction.created_at
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Accept barter offer
     * @param {string} transaction_id - Transaction ID
     * @param {string} user_id - User yang accept (must be owner)
     * @returns {Promise<object>} Updated transaction
     */
    async acceptBarterOffer(transaction_id, user_id) {
        try {
            // Get transaction
            const transaction = await this.transactionRepository.findById(transaction_id);
            if (!transaction) {
                throw new Error('Transaksi tidak ditemukan');
            }

            // Check authorization - hanya owner yang bisa accept
            if (transaction.owner_id !== user_id) {
                throw new Error('Anda tidak memiliki akses untuk menerima penawaran ini');
            }

            // Get status
            const acceptedStatus = await this.transactionRepository.getStatusByName('ACCEPTED');
            if (!acceptedStatus) {
                throw new Error('Status ACCEPTED tidak ditemukan');
            }

            // Update status transaksi menjadi ACCEPTED
            const updated = await this.transactionRepository.updateStatus(
                transaction_id,
                acceptedStatus.status_id
            );

            // Tandai kedua item sebagai tidak tersedia lagi untuk barter
            await this.itemRepository.updateItem(
                transaction.requester_item_id,
                transaction.requester_id,
                { isAvailable: false }
            );

            await this.itemRepository.updateItem(
                transaction.owner_item_id,
                transaction.owner_id,
                { isAvailable: false }
            );

            // Create notification untuk requester
            const ownerUser = await this.userRepository.findById(user_id);
            await this.notificationService.createBarterAcceptedNotification(
                transaction.requester_id,
                transaction_id,
                ownerUser.full_name
            );

            return {
                success: true,
                message: 'Penawaran barter diterima',
                data: {
                    transaction_id: updated.transaction_id,
                    status: 'ACCEPTED'
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Reject barter offer
     * @param {string} transaction_id - Transaction ID
     * @param {string} user_id - User yang reject (must be owner)
     * @returns {Promise<object>} Updated transaction
     */
    async rejectBarterOffer(transaction_id, user_id) {
        try {
            // Get transaction
            const transaction = await this.transactionRepository.findById(transaction_id);
            if (!transaction) {
                throw new Error('Transaksi tidak ditemukan');
            }

            // Check authorization
            if (transaction.owner_id !== user_id) {
                throw new Error('Anda tidak memiliki akses untuk menolak penawaran ini');
            }

            // Get status
            const rejectedStatus = await this.transactionRepository.getStatusByName('REJECTED');
            if (!rejectedStatus) {
                throw new Error('Status REJECTED tidak ditemukan');
            }

            // Update status
            const updated = await this.transactionRepository.updateStatus(
                transaction_id,
                rejectedStatus.status_id
            );

            // Create notification untuk requester
            const ownerUser = await this.userRepository.findById(user_id);
            await this.notificationService.createBarterRejectedNotification(
                transaction.requester_id,
                transaction_id,
                ownerUser.full_name
            );

            return {
                success: true,
                message: 'Penawaran barter ditolak',
                data: {
                    transaction_id: updated.transaction_id,
                    status: 'REJECTED'
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get transaction detail
     * @param {string} transaction_id - Transaction ID
     * @param {string} user_id - Current user ID (untuk check akses)
     * @returns {Promise<object>} Transaction detail
     */
    async getTransactionDetail(transaction_id, user_id) {
        try {
            console.log(`[getTransactionDetail] transaction_id: ${transaction_id}, user_id: ${user_id}`);

            const transaction = await this.transactionRepository.findById(transaction_id);

            console.log(`[getTransactionDetail] Transaction found:`, transaction ? 'YES' : 'NO');
            if (transaction) {
                console.log(`[getTransactionDetail] requester_id: ${transaction.requester_id}, owner_id: ${transaction.owner_id}`);
            }

            if (!transaction) {
                throw new Error('Transaksi tidak ditemukan');
            }

            // Check authorization - user harus peserta transaksi
            const isParticipant = transaction.requester_id === user_id || transaction.owner_id === user_id;
            console.log(`[getTransactionDetail] isParticipant: ${isParticipant}`);

            if (!isParticipant) {
                throw new Error('Anda tidak memiliki akses ke transaksi ini');
            }

            return {
                success: true,
                data: transaction
            };
        } catch (error) {
            console.error(`[getTransactionDetail] ERROR:`, error.message);
            throw error;
        }
    }

    /**
     * Get list of transactions untuk user (sebagai requester atau owner)
     * @param {string} user_id - User ID
     * @param {number} limit - Pagination limit (default 10)
     * @param {number} offset - Pagination offset (default 0)
     * @returns {Promise<object>} Transaction list dengan pagination info
     */
    async getUserTransactions(user_id, limit = 10, offset = 0) {
        try {
            // Validate inputs
            if (!user_id) {
                throw new Error('User ID diperlukan');
            }

            limit = Math.max(1, Math.min(parseInt(limit) || 10, 100)); // 1-100
            offset = Math.max(0, parseInt(offset) || 0);

            console.log(`[getUserTransactions] Fetching for user: ${user_id}, limit: ${limit}, offset: ${offset}`);

            // Get transactions
            const transactions = await this.transactionRepository.findByUserId(user_id, limit, offset);

            // Get total count
            const total = await this.transactionRepository.getCountByUserId(user_id);

            console.log(`[getUserTransactions] Found ${transactions.length} transactions, total: ${total}`);

            return {
                success: true,
                data: {
                    transactions,
                    pagination: {
                        total,
                        limit,
                        offset,
                        page: Math.floor(offset / limit) + 1,
                        pages: Math.ceil(total / limit)
                    }
                }
            };
        } catch (error) {
            console.error(`[getUserTransactions] ERROR:`, error.message);
            throw error;
        }
    }

    /**
     * Complete barter transaction (mark item as received)
     * @param {string} transaction_id - Transaction ID
     * @param {string} user_id - Current user ID
     * @returns {Promise<object>} Updated transaction and status
     */
    async completeTransaction(transaction_id, user_id) {
        try {
            // 1. Get transaction
            const transaction = await this.transactionRepository.findById(transaction_id);
            if (!transaction) {
                throw new Error('Transaksi tidak ditemukan');
            }

            // 2. Determine roles
            const isRequester = transaction.requester_id === user_id;
            const isOwner = transaction.owner_id === user_id;

            if (!isRequester && !isOwner) {
                throw new Error('Anda tidak memiliki akses ke transaksi ini');
            }

            // 3. Check current status
            const validCurrentStatuses = ['ACCEPTED', 'AWAITING_RECEIPT_BY_OWNER', 'AWAITING_RECEIPT_BY_REQUESTER'];
            if (!validCurrentStatuses.includes(transaction.status_name)) {
                throw new Error(`Tidak dapat mengonfirmasi penerimaan pada status ${transaction.status_name}`);
            }

            // 4. Check if already confirmed
            if (isRequester && transaction.requester_confirmed_at) {
                throw new Error('Anda sudah mengonfirmasi penerimaan barang');
            }
            if (isOwner && transaction.owner_confirmed_at) {
                throw new Error('Anda sudah mengonfirmasi penerimaan barang');
            }

            // 5. Update confirmation in DB
            await this.transactionRepository.confirmReceipt(transaction_id, isRequester);

            // Fetch updated transaction to check both confirmations
            const updatedTx = await this.transactionRepository.findById(transaction_id);
            
            const bothConfirmed = updatedTx.requester_confirmed_at && updatedTx.owner_confirmed_at;

            if (bothConfirmed) {
                // Both have confirmed -> move to COMPLETED_AWAITING_REVIEW
                const completedStatus = await this.transactionRepository.getStatusByName('COMPLETED_AWAITING_REVIEW');
                if (!completedStatus) {
                    throw new Error('Status COMPLETED_AWAITING_REVIEW tidak ditemukan');
                }

                await this.transactionRepository.updateStatusAndComplete(transaction_id, completedStatus.status_id);

                // Notify both parties
                await this.notificationService.createSystemNotification(
                    updatedTx.requester_id,
                    'Transaksi Selesai!',
                    `Transaksi barter untuk ${updatedTx.requester_item_title} telah selesai. Silakan berikan ulasan.`,
                    transaction_id,
                    'TRANSACTION'
                );

                await this.notificationService.createSystemNotification(
                    updatedTx.owner_id,
                    'Transaksi Selesai!',
                    `Transaksi barter untuk ${updatedTx.owner_item_title} telah selesai. Silakan berikan ulasan.`,
                    transaction_id,
                    'TRANSACTION'
                );

                return {
                    success: true,
                    message: 'Barang diterima. Transaksi barter telah selesai!',
                    data: {
                        transaction_id: transaction_id,
                        status: 'COMPLETED_AWAITING_REVIEW',
                        both_confirmed: true
                    }
                };

            } else {
                // Only one has confirmed -> update status indicating waiting for the other
                let nextStatusName = '';
                if (isRequester) {
                    // Requester confirmed, waiting for owner
                    nextStatusName = 'AWAITING_RECEIPT_BY_OWNER';
                    
                    // Notify Owner
                    await this.notificationService.createSystemNotification(
                        updatedTx.owner_id,
                        'Partner Telah Menerima Barang',
                        `${updatedTx.requester_name} telah mengonfirmasi penerimaan barang. Silakan konfirmasi jika Anda juga telah menerima barang dari ${updatedTx.requester_name}.`,
                        transaction_id,
                        'TRANSACTION'
                    );
                } else {
                    // Owner confirmed, waiting for requester
                    nextStatusName = 'AWAITING_RECEIPT_BY_REQUESTER';

                    // Notify Requester
                    await this.notificationService.createSystemNotification(
                        updatedTx.requester_id,
                        'Partner Telah Menerima Barang',
                        `${updatedTx.owner_name} telah mengonfirmasi penerimaan barang. Silakan konfirmasi jika Anda juga telah menerima barang dari ${updatedTx.owner_name}.`,
                        transaction_id,
                        'TRANSACTION'
                    );
                }

                const partialStatus = await this.transactionRepository.getStatusByName(nextStatusName);
                if (partialStatus) {
                   await this.transactionRepository.updateStatus(transaction_id, partialStatus.status_id);
                }

                return {
                    success: true,
                    message: 'Penerimaan barang dikonfirmasi. Menunggu konfirmasi dari partner Anda.',
                    data: {
                        transaction_id: transaction_id,
                        status: nextStatusName,
                        both_confirmed: false
                    }
                };
            }

        } catch (error) {
            console.error(`[completeTransaction] ERROR:`, error.message);
            throw error;
        }
    }
}

module.exports = BarterTransactionService;
