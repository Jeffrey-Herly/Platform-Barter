// src/routes/barter-transaction.route.js
'use strict';

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
    // Initialize repositories
    const BarterTransactionRepository = require('../repositories/barter-transaction.repository.js');
    const ItemRepository = require('../repositories/items.repository.js');
    const UserRepository = require('../repositories/user.repository.js');
    const NotificationRepository = require('../repositories/notification.repository.js');

    const transactionRepository = new BarterTransactionRepository(fastify.pg);
    const itemRepository = new ItemRepository(fastify.pg);
    const userRepository = new UserRepository(fastify.pg);
    const notificationRepository = new NotificationRepository(fastify.pg);

    // Initialize services
    const NotificationService = require('../services/notification.service.js');
    const BarterTransactionService = require('../services/barter-transaction.service.js');

    const notificationService = new NotificationService(notificationRepository);
    const transactionService = new BarterTransactionService(
        transactionRepository,
        itemRepository,
        userRepository,
        notificationService
    );

    // Initialize controller
    const BarterTransactionController = require('../controllers/barter-transaction.controller.js');
    const transactionController = new BarterTransactionController(transactionService);

    // Register routes
    fastify.register(async function (fastify) {
        /**
         * POST /barter/create-offer
         * Create new barter offer
         */
        fastify.post('/create-offer', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.createBarterOffer(request, reply);
        });

        /**
         * POST /barter/:transaction_id/accept
         * Accept barter offer
         */
        fastify.post('/:transaction_id/accept', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.acceptBarterOffer(request, reply);
        });

        fastify.post('/:transaction_id/reject', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.rejectBarterOffer(request, reply);
        });

        /**
         * POST /barter/:transaction_id/complete
         * Complete barter offer (mark item as received)
         */
        fastify.post('/:transaction_id/complete', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.completeTransaction(request, reply);
        });

        /**
         * GET /barter/list
         * Get transactions list (API JSON)
         */
        fastify.get('/list', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.getUserTransactions(request, reply);
        });

        /**
         * GET /barter/transactions/page
         * Display transactions list page (HTML view)
         */
        fastify.get('/transactions/page', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.getTransactionsListPage(request, reply);
        });

        /**
         * GET /barter/:transaction_id/page
         * Display transaction detail page (HTML view)
         */
        fastify.get('/:transaction_id/page', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.getTransactionDetailPage(request, reply);
        });

        /**
         * GET /barter/:transaction_id
         * Get transaction detail (API JSON)
         */
        fastify.get('/:transaction_id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return transactionController.getTransactionDetail(request, reply);
        });
    }, { prefix: '/barter' });
};
