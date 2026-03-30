'use strict';

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
  const AdminRepository = require('../repositories/admin.repository.js');
  const AdminService = require('../services/admin.service.js');
  const AdminController = require('../controllers/admin.controller.js');

  const adminRepository = new AdminRepository(fastify.pg);
  const adminService = new AdminService(adminRepository);
  const adminController = new AdminController(adminService);

  fastify.register(
    async function adminRoutes(fastify) {
      fastify.get('/', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.getAdminDashboard(request, reply);
      });

      fastify.get('/users', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.getUsersPage(request, reply);
      });

      fastify.get('/items', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.getItemsPage(request, reply);
      });

      fastify.get('/reports', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.getReportsPage(request, reply);
      });
    },
    { prefix: '/admin' }
  );
};

