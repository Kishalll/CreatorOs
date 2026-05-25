const db = require('../db/pool');

function mapInvite(row) {
  if (!row) return null;
  return {
    id: row.id,
    inviter: row.inviter_id,
    email: row.email,
    projectName: row.project_name,
    token: row.token,
    status: row.status,
    message: row.message,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function create({ inviter, email, projectName, token, status = 'pending', message }) {
  const result = await db.query(
    `INSERT INTO invites (inviter_id, email, project_name, token, status, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [inviter, email, projectName, token, status, message || null]
  );
  return mapInvite(result.rows[0]);
}

async function findByInviter(inviterId, { limit } = {}) {
  const params = [inviterId];
  let sql = 'SELECT * FROM invites WHERE inviter_id = $1 ORDER BY created_at DESC';

  if (limit) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }

  const result = await db.query(sql, params);
  return result.rows.map(mapInvite);
}

async function findByToken(token) {
  const result = await db.query('SELECT * FROM invites WHERE token = $1', [token]);
  return mapInvite(result.rows[0]);
}

async function acceptByToken(token) {
  const result = await db.query(
    `UPDATE invites
     SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
     WHERE token = $1
     RETURNING *`,
    [token]
  );
  return mapInvite(result.rows[0]);
}

async function summarizeByInviter(inviterId) {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
       COUNT(*) FILTER (WHERE status = 'expired')::int AS expired
     FROM invites
     WHERE inviter_id = $1`,
    [inviterId]
  );

  return result.rows[0] || { total: 0, pending: 0, accepted: 0, expired: 0 };
}

module.exports = {
  acceptByToken,
  create,
  findByInviter,
  findByToken,
  summarizeByInviter,
};
