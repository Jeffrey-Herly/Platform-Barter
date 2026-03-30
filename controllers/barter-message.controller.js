// src/controllers/barter-message.controller.js
'use strict';

/**
 * Barter Message Controller
 * Handles HTTP requests dan responses untuk chat/negosiasi messages
 *
 * RESPONSIBILITIES:
 * - Validate request data
 * - Call service layer
 * - Format response
 * - Handle errors
 * - Authenticate user
 */

class BarterMessageController {
    constructor(messageService) {
        this.messageService = messageService;
    }

    /**
     * Send a message
     * POST /api/barter-messages/send
     */
    async sendMessage(request, reply) {
        try {
            const { transaction_id, message_text } = request.body;
            const user_id = request.user.userId; // From JWT middleware

            // Validate
            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            if (!message_text || message_text.trim() === '') {
                return reply.code(400).send({
                    success: false,
                    message: 'Pesan tidak boleh kosong'
                });
            }

            // Call service
            const result = await this.messageService.sendMessage(
                transaction_id,
                user_id,
                message_text
            );

            return reply.code(201).send(result);
        } catch (error) {
            console.error('Error in sendMessage:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengirim pesan'
            });
        }
    }

    /**
     * Get chat history untuk a transaction
     * GET /api/barter-messages/:transaction_id?page=1&limit=50
     */
    async getChatHistory(request, reply) {
        try {
            const { transaction_id } = request.params;
            const { page = 1, limit = 50 } = request.query;
            const user_id = request.user.userId;

            // Validate
            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            // Call service
            const result = await this.messageService.getChatHistory(
                transaction_id,
                user_id,
                parseInt(page, 10),
                parseInt(limit, 10)
            );

            return reply.send(result);
        } catch (error) {
            console.error('Error in getChatHistory:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil chat history'
            });
        }
    }

    /**
     * Get unread message count
     * GET /api/barter-messages/:transaction_id/unread
     */
    async getUnreadCount(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            const result = await this.messageService.getUnreadCount(
                transaction_id,
                user_id
            );

            return reply.send(result);
        } catch (error) {
            console.error('Error in getUnreadCount:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil unread count'
            });
        }
    }

    /**
     * Get recent messages untuk polling
     * GET /api/barter-messages/:transaction_id/recent?since=2024-01-01T00:00:00Z
     */
    async getRecentMessages(request, reply) {
        try {
            const { transaction_id } = request.params;
            const { since } = request.query;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            if (!since) {
                return reply.code(400).send({
                    success: false,
                    message: 'since query parameter diperlukan'
                });
            }

            const sinceDate = new Date(since);
            if (isNaN(sinceDate.getTime())) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid since timestamp'
                });
            }

            const result = await this.messageService.getRecentMessages(
                transaction_id,
                user_id,
                sinceDate
            );

            return reply.send(result);
        } catch (error) {
            console.error('Error in getRecentMessages:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil recent messages'
            });
        }
    }

    /**
     * Mark message as read
     * PATCH /api/barter-messages/:message_id/read
     */
    async markAsRead(request, reply) {
        try {
            const { message_id } = request.params;

            if (!message_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'message_id diperlukan'
                });
            }

            const result = await this.messageService.markMessageAsRead(message_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in markAsRead:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal menandai pesan sebagai baca'
            });
        }
    }

    /**
     * Delete message
     * DELETE /api/barter-messages/:message_id
     */
    async deleteMessage(request, reply) {
        try {
            const { message_id } = request.params;
            const user_id = request.user.userId;

            if (!message_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'message_id diperlukan'
                });
            }

            const result = await this.messageService.deleteMessage(message_id, user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in deleteMessage:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal menghapus pesan'
            });
        }
    }

    /**
     * Get conversations list
     * GET /api/conversations?limit=20&offset=0
     */
    async getConversations(request, reply) {
        try {
            const user_id = request.user.userId;
            const limit = parseInt(request.query.limit) || 20;
            const offset = parseInt(request.query.offset) || 0;

            const result = await this.messageService.getUserConversations(user_id, limit, offset);

            return reply.send(result);
        } catch (error) {
            console.error('Error in getConversations:', error);
            return reply.code(500).send({
                success: false,
                message: error.message || 'Gagal mengambil daftar percakapan'
            });
        }
    }

    /**
     * Delete conversation for user
     * DELETE /conversations/:transaction_id/delete
     */
    async deleteConversation(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            const result = await this.messageService.deleteConversation(transaction_id, user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in deleteConversation:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal menghapus percakapan'
            });
        }
    }

    /**
     * Restore deleted conversation for user
     * POST /conversations/:transaction_id/restore
     */
    async restoreConversation(request, reply) {
        try {
            const { transaction_id } = request.params;
            const user_id = request.user.userId;

            if (!transaction_id) {
                return reply.code(400).send({
                    success: false,
                    message: 'transaction_id diperlukan'
                });
            }

            const result = await this.messageService.restoreConversation(transaction_id, user_id);

            return reply.send(result);
        } catch (error) {
            console.error('Error in restoreConversation:', error);
            return reply.code(400).send({
                success: false,
                message: error.message || 'Gagal mengembalikan percakapan'
            });
        }
    }

    /**
     * Display conversations list page
     * GET /conversations
     */
    async getConversationsPage(request, reply) {
        try {
            const user_id = request.user.userId;
            const limit = parseInt(request.query.limit) || 20;
            const offset = parseInt(request.query.offset) || 0;

            const result = await this.messageService.getUserConversations(user_id, limit, offset);

            if (!result.success) {
                return reply.status(400).view('pages/barter/conversations.ejs', {
                    currentUser: request.user,
                    conversationsList: null,
                    pagination: null,
                    error: result.message || 'Gagal mengambil daftar percakapan'
                });
            }

            return reply.view('pages/barter/conversations.ejs', {
                currentUser: request.user,
                conversationsList: result.data.conversations,
                pagination: result.data.pagination,
                error: null
            });
        } catch (error) {
            console.error('Error in getConversationsPage:', error);

            return reply.status(500).view('pages/barter/conversations.ejs', {
                currentUser: request.user || {},
                conversationsList: null,
                pagination: null,
                error: error.message || 'Terjadi kesalahan saat memproses daftar percakapan'
            });
        }
    }
}

module.exports = BarterMessageController;
