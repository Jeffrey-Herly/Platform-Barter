'use strict';

class AdminService {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async getOverview() {
    const stats = await this.adminRepository.getOverviewStats();
    const recentUsers = await this.adminRepository.getRecentUsers(5);
    const recentItems = await this.adminRepository.getRecentItems(5);
    const recentReports = await this.adminRepository.getRecentReports(5);

    return { stats, recentUsers, recentItems, recentReports };
  }

  async listUsers(options) {
    const limit = Number(options.limit) || 20;
    const page = Number(options.page) || 1;
    const offset = (page - 1) * limit;
    const search = options.search || '';

    const [rows, total] = await Promise.all([
      this.adminRepository.getUsers({ search, limit, offset }),
      this.adminRepository.getUsersCount({ search })
    ]);

    return {
      data: rows,
      meta: { total, page, limit }
    };
  }

  async setUserActive(userId, isActive) {
    if (!userId) throw new Error('userId is required');

    const updated = await this.adminRepository.setUserActive(userId, isActive);
    if (!updated) throw new Error('User not found');

    return { success: true, data: updated };
  }

  async listItems(options) {
    const limit = Number(options.limit) || 20;
    const page = Number(options.page) || 1;
    const offset = (page - 1) * limit;
    const search = options.search || '';
    const onlyInactive = options.onlyInactive === 'true' || options.onlyInactive === true;

    const [rows, total] = await Promise.all([
      this.adminRepository.getItems({ search, onlyInactive, limit, offset }),
      this.adminRepository.getItemsCount({ search, onlyInactive })
    ]);

    return {
      data: rows,
      meta: { total, page, limit }
    };
  }

  async setItemAvailability(itemId, isAvailable) {
    if (!itemId) throw new Error('itemId is required');

    const updated = await this.adminRepository.setItemAvailability(itemId, isAvailable);
    if (!updated) throw new Error('Item not found');

    return { success: true, data: updated };
  }

  async listReports(options) {
    const limit = Number(options.limit) || 20;
    const page = Number(options.page) || 1;
    const offset = (page - 1) * limit;
    const status = options.status || '';
    const normalizedStatus = status || null;

    const [rows, total] = await Promise.all([
      this.adminRepository.getReports({ status: normalizedStatus, limit, offset }),
      this.adminRepository.getReportsCount({ status: normalizedStatus })
    ]);

    return {
      data: rows,
      meta: { total, page, limit }
    };
  }

  async updateReportStatus(reportId, status, adminUserId) {
    if (!reportId) throw new Error('reportId is required');

    const allowedStatuses = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const updated = await this.adminRepository.updateReportStatus(
      reportId,
      status,
      adminUserId || null
    );
    if (!updated) throw new Error('Report not found');

    return { success: true, data: updated };
  }
}

module.exports = AdminService;

