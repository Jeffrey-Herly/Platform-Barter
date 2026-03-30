'use strict';

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
    // Initialize repositories
    const BarterMessageRepository = require('../repositories/barter-message.repository.js');
    const BarterTransactionRepository = require('../repositories/barter-transaction.repository.js');
    const NotificationRepository = require('../repositories/notification.repository.js');

    const messageRepository = new BarterMessageRepository(fastify.pg);
    const transactionRepository = new BarterTransactionRepository(fastify.pg);
    const notificationRepository = new NotificationRepository(fastify.pg);

    // Initialize services
    const NotificationService = require('../services/notification.service.js');
    const BarterMessageService = require('../services/barter-message.service.js');

    const notificationService = new NotificationService(notificationRepository);
    const messageService = new BarterMessageService(
        messageRepository,
        transactionRepository,
        notificationRepository,
        notificationService
    );

    // Initialize controller
    const BarterMessageController = require('../controllers/barter-message.controller.js');
    const messageController = new BarterMessageController(messageService);

    // Register routes
    fastify.register(async function (fastify) {
        /**
         * GET /conversations/page
         * Display conversations list page (HTML view)
         */
        fastify.get('/page', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return messageController.getConversationsPage(request, reply);
        });

        /**
         * DELETE /conversations/:transaction_id/delete
         * Delete conversation for user (soft delete)
         */
        fastify.delete('/:transaction_id/delete', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return messageController.deleteConversation(request, reply);
        });

        /**
         * POST /conversations/:transaction_id/restore
         * Restore deleted conversation for user
         */
        fastify.post('/:transaction_id/restore', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return messageController.restoreConversation(request, reply);
        });

        /**
         * GET /conversations
         * Get conversations list (API JSON)
         */
        fastify.get('/', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return messageController.getConversations(request, reply);
        });
    }, { prefix: '/conversations' });
};
