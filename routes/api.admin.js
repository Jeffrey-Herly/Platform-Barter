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
    async function adminApiRoutes(fastify) {
      fastify.get('/admin/overview', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.getOverviewAPI(request, reply);
      });

      fastify.get('/admin/users', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.listUsersAPI(request, reply);
      });

      fastify.patch('/admin/users/:id/active', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.setUserActiveAPI(request, reply);
      });

      fastify.get('/admin/items', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.listItemsAPI(request, reply);
      });

      fastify.patch('/admin/items/:id/availability', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.setItemAvailabilityAPI(request, reply);
      });

      fastify.get('/admin/reports', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.listReportsAPI(request, reply);
      });

      fastify.patch('/admin/reports/:id/status', { preHandler: [authMiddleware] }, async (request, reply) => {
        return adminController.updateReportStatusAPI(request, reply);
      });
    },
    { prefix: '/api' }
  );
};

