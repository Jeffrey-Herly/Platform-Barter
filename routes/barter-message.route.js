// src/routes/barter-message.route.js
'use strict';

const {
    sendMessageSchema,
    getChatHistorySchema,
    getUnreadCountSchema,
    getRecentMessagesSchema
} = require('../schemas/barter-message.schema.js');

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

    // Register routes dengan auth middleware
    fastify.register(async function (fastify) {
        /**
         * POST /api/barter-messages/send
         * Send a message in chat room
         */
        fastify.post('/send', {
            preHandler: [authMiddleware],
            schema: sendMessageSchema
        }, async (request, reply) => {
            return messageController.sendMessage(request, reply);
        });

        /**
         * GET /api/barter-messages/:transaction_id
         * Get chat history untuk a transaction
         */
        fastify.get('/:transaction_id', {
            preHandler: [authMiddleware],
            schema: getChatHistorySchema
        }, async (request, reply) => {
            return messageController.getChatHistory(request, reply);
        });

        /**
         * GET /api/barter-messages/:transaction_id/unread
         * Get unread message count
         */
        fastify.get('/:transaction_id/unread', {
            preHandler: [authMiddleware],
            schema: getUnreadCountSchema
        }, async (request, reply) => {
            return messageController.getUnreadCount(request, reply);
        });

        /**
         * GET /api/barter-messages/:transaction_id/recent
         * Get recent messages untuk polling
         */
        fastify.get('/:transaction_id/recent', {
            preHandler: [authMiddleware],
            schema: getRecentMessagesSchema
        }, async (request, reply) => {
            return messageController.getRecentMessages(request, reply);
        });

        /**
         * PATCH /api/barter-messages/:message_id/read
         * Mark message as read
         */
        fastify.patch('/:message_id/read', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return messageController.markAsRead(request, reply);
        });

        /**
         * DELETE /api/barter-messages/:message_id
         * Delete message
         */
        fastify.delete('/:message_id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return messageController.deleteMessage(request, reply);
        });
    }, { prefix: '/api/barter-messages' });
};
