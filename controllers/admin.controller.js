'use strict';

class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  isAdminUser(request) {
    const email = request.user?.email || '';
    const adminEnv = process.env.ADMIN_EMAILS || '';
    if (!email || !adminEnv) return false;

    const admins = adminEnv
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    return admins.includes(email.toLowerCase());
  }

  ensureAdmin(request, reply) {
    if (!this.isAdminUser(request)) {
      const accept = request.headers['accept'] || '';
      const wantsHtml = accept.includes('text/html');

      if (wantsHtml) {
        return reply.code(403).view('pages/dashboard/index.ejs', {
          user: request.user,
          overview: null,
          message: null,
          error: 'Anda tidak memiliki akses admin.'
        });
      }

      return reply.code(403).send({
        success: false,
        message: 'Admin access required'
      });
    }
    return null;
  }

  async getAdminDashboard(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const overview = await this.adminService.getOverview();
      return reply.view('pages/admin/index.ejs', {
        user: request.user,
        isAdminUser: true,
        overview,
        message: null,
        error: null
      });
    } catch (error) {
      request.log.error(error);
      return reply.view('pages/admin/index.ejs', {
        user: request.user,
        isAdminUser: true,
        overview: null,
        message: null,
        error: error.message || 'Gagal memuat dashboard admin'
      });
    }
  }

  async getUsersPage(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const result = await this.adminService.listUsers(request.query || {});
      return reply.view('pages/admin/users.ejs', {
        user: request.user,
        isAdminUser: true,
        users: result.data,
        meta: result.meta,
        message: null,
        error: null,
        search: request.query?.search || ''
      });
    } catch (error) {
      request.log.error(error);
      return reply.view('pages/admin/users.ejs', {
        user: request.user,
        isAdminUser: true,
        users: [],
        meta: { total: 0, page: 1, limit: 20 },
        message: null,
        error: error.message || 'Gagal memuat data user',
        search: request.query?.search || ''
      });
    }
  }

  async getItemsPage(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const result = await this.adminService.listItems(request.query || {});
      return reply.view('pages/admin/items.ejs', {
        user: request.user,
        isAdminUser: true,
        items: result.data,
        meta: result.meta,
        message: null,
        error: null,
        search: request.query?.search || '',
        onlyInactive: request.query?.onlyInactive === 'true'
      });
    } catch (error) {
      request.log.error(error);
      return reply.view('pages/admin/items.ejs', {
        user: request.user,
        isAdminUser: true,
        items: [],
        meta: { total: 0, page: 1, limit: 20 },
        message: null,
        error: error.message || 'Gagal memuat data item',
        search: request.query?.search || '',
        onlyInactive: request.query?.onlyInactive === 'true'
      });
    }
  }

  async getReportsPage(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const result = await this.adminService.listReports(request.query || {});
      return reply.view('pages/admin/reports.ejs', {
        user: request.user,
        isAdminUser: true,
        reports: result.data,
        meta: result.meta,
        message: null,
        error: null,
        statusFilter: request.query?.status || ''
      });
    } catch (error) {
      request.log.error(error);
      return reply.view('pages/admin/reports.ejs', {
        user: request.user,
        isAdminUser: true,
        reports: [],
        meta: { total: 0, page: 1, limit: 20 },
        message: null,
        error: error.message || 'Gagal memuat data laporan',
        statusFilter: request.query?.status || ''
      });
    }
  }

  async getOverviewAPI(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const data = await this.adminService.getOverview();
      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Gagal memuat overview admin'
      });
    }
  }

  async listUsersAPI(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const data = await this.adminService.listUsers(request.query || {});
      return reply.send({ success: true, ...data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Gagal memuat data user'
      });
    }
  }

  async setUserActiveAPI(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const userId = request.params.id;
      const { isActive } = request.body || {};
      const result = await this.adminService.setUserActive(userId, Boolean(isActive));
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Gagal mengubah status user'
      });
    }
  }

  async listItemsAPI(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const data = await this.adminService.listItems(request.query || {});
      return reply.send({ success: true, ...data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Gagal memuat data item'
      });
    }
  }

  async setItemAvailabilityAPI(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const itemId = request.params.id;
      const { isAvailable } = request.body || {};
      const result = await this.adminService.setItemAvailability(itemId, Boolean(isAvailable));
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Gagal mengubah status item'
      });
    }
  }

  async listReportsAPI(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const data = await this.adminService.listReports(request.query || {});
      return reply.send({ success: true, ...data });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Gagal memuat data laporan'
      });
    }
  }

  async updateReportStatusAPI(request, reply) {
    const unauthorized = this.ensureAdmin(request, reply);
    if (unauthorized) return unauthorized;

    try {
      const reportId = request.params.id;
      const { status } = request.body || {};
      const adminUserId = request.user?.userId || null;
      const result = await this.adminService.updateReportStatus(reportId, status, adminUserId);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Gagal mengubah status laporan'
      });
    }
  }
}

module.exports = AdminController;

