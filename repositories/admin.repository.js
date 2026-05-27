'use strict';

/**
 * Admin Repository
 * Akses data agregat dan listing untuk kebutuhan panel admin.
 *
 * Catatan:
 * - Reuse sebanyak mungkin view/tabel yang sudah ada (v_items_detail, v_transactions_detail, dll)
 * - Repository ini hanya berisi query, tanpa business logic.
 */
class AdminRepository {
  constructor(pgConnection) {
    this.pg = pgConnection;
  }

  /**
   * Ambil statistik ringkas untuk dashboard admin.
   */
  async getOverviewStats() {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = true) AS active_users,
        (SELECT COUNT(*) FROM items) AS total_items,
        (SELECT COUNT(*) FROM items WHERE is_available = true) AS available_items,
        (SELECT COUNT(*) FROM barter_transactions) AS total_transactions,
        (
          SELECT COUNT(*)
          FROM barter_transactions bt
          JOIN barter_statuses bs ON bt.status_id = bs.status_id
          WHERE bs.status_name IN ('PENDING', 'NEGOTIATING', 'ACCEPTED')
        ) AS active_transactions,
        (SELECT COUNT(*) FROM reports) AS total_reports,
        (
          SELECT COUNT(*)
          FROM reports
          WHERE status IN ('PENDING', 'REVIEWING')
        ) AS open_reports
    `;

    const result = await this.pg.query(query);
    return result.rows[0] || null;
  }

  async getRecentUsers(limit = 5) {
    const query = `
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.last_login
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT $1
    `;

    const result = await this.pg.query(query, [limit]);
    return result.rows;
  }

  async getRecentItems(limit = 5) {
    const query = `
      SELECT
        item_id,
        title,
        description,
        estimated_value,
        is_available,
        created_at,
        owner_name,
        owner_email,
        category_name,
        item_type
      FROM v_items_detail
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await this.pg.query(query, [limit]);
    return result.rows;
  }

  async getRecentReports(limit = 5) {
    const query = `
      SELECT
        r.report_id,
        r.description,
        r.status,
        r.created_at,
        rt.type_name AS report_type,
        ru.full_name AS reporter_name,
        ru.email AS reporter_email,
        tu.full_name AS target_user_name,
        tu.email AS target_user_email,
        i.title AS target_item_title
      FROM reports r
      JOIN report_types rt ON r.type_id = rt.type_id
      JOIN users ru ON r.reporter_id = ru.user_id
      LEFT JOIN users tu ON r.reported_user_id = tu.user_id
      LEFT JOIN items i ON r.reported_item_id = i.item_id
      ORDER BY r.created_at DESC
      LIMIT $1
    `;

    const result = await this.pg.query(query, [limit]);
    return result.rows;
  }

  async getUsers({ search, limit = 20, offset = 0 }) {
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      whereClause += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`;
    }

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.last_login
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await this.pg.query(query, params);
    return result.rows;
  }

  async getUsersCount({ search }) {
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      whereClause += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`;
    }

    const query = `
      SELECT COUNT(*) AS count
      FROM users u
      ${whereClause}
    `;

    const result = await this.pg.query(query, params);
    return parseInt(result.rows[0]?.count || 0, 10);
  }

  async setUserActive(userId, isActive) {
    const query = `
      UPDATE users
      SET is_active = $2
      WHERE user_id = $1
      RETURNING user_id, is_active
    `;

    const result = await this.pg.query(query, [userId, isActive]);
    return result.rows[0] || null;
  }

  async getItems({ search, onlyInactive = false, limit = 20, offset = 0 }) {
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      whereClause += ` AND (title ILIKE $${idx} OR owner_email ILIKE $${idx})`;
    }

    if (onlyInactive) {
      whereClause += ' AND is_available = false';
    }

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT
        item_id,
        title,
        is_available,
        estimated_value,
        created_at,
        owner_name,
        owner_email,
        category_name,
        item_type
      FROM v_items_detail
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await this.pg.query(query, params);
    return result.rows;
  }

  async getItemsCount({ search, onlyInactive = false }) {
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      whereClause += ` AND (title ILIKE $${idx} OR owner_email ILIKE $${idx})`;
    }

    if (onlyInactive) {
      whereClause += ' AND is_available = false';
    }

    const query = `
      SELECT COUNT(*) AS count
      FROM v_items_detail
      ${whereClause}
    `;

    const result = await this.pg.query(query, params);
    return parseInt(result.rows[0]?.count || 0, 10);
  }

  async setItemAvailability(itemId, isAvailable) {
    const query = `
      UPDATE items
      SET is_available = $2
      WHERE item_id = $1
      RETURNING item_id, is_available
    `;

    const result = await this.pg.query(query, [itemId, isAvailable]);
    return result.rows[0] || null;
  }

  async getReports({ status, limit = 20, offset = 0 }) {
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT
        r.report_id,
        r.status,
        r.created_at,
        r.description,
        rt.type_name AS report_type,
        ru.full_name AS reporter_name,
        ru.email AS reporter_email,
        tu.full_name AS target_user_name,
        tu.email AS target_user_email,
        i.title AS target_item_title
      FROM reports r
      JOIN report_types rt ON r.type_id = rt.type_id
      JOIN users ru ON r.reporter_id = ru.user_id
      LEFT JOIN users tu ON r.reported_user_id = tu.user_id
      LEFT JOIN items i ON r.reported_item_id = i.item_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await this.pg.query(query, params);
    return result.rows;
  }

  async getReportsCount({ status }) {
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const query = `
      SELECT COUNT(*) AS count
      FROM reports
      ${whereClause}
    `;

    const result = await this.pg.query(query, params);
    return parseInt(result.rows[0]?.count || 0, 10);
  }

  async updateReportStatus(reportId, status, resolvedByUserId) {
    const query = `
      UPDATE reports
      SET
        status = $2,
        resolved_by = $3,
        resolved_at = CASE
          WHEN $2 IN ('RESOLVED', 'DISMISSED') THEN CURRENT_TIMESTAMP
          ELSE resolved_at
        END
      WHERE report_id = $1
      RETURNING report_id, status, resolved_by, resolved_at
    `;

    const result = await this.pg.query(query, [reportId, status, resolvedByUserId]);
    return result.rows[0] || null;
  }
}

module.exports = AdminRepository;

