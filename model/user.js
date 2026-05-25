const db = require('../db/pool');

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    authProvider: row.auth_provider,
    googleId: row.google_id,
    avatar: row.avatar,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findById(id) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return mapUser(result.rows[0]);
}

async function findByEmail(email) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  return mapUser(result.rows[0]);
}

async function findByGoogleId(googleId) {
  const result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return mapUser(result.rows[0]);
}

async function create({
  name,
  email,
  password = null,
  authProvider = 'local',
  googleId = null,
  avatar = null,
  lastLoginAt = null,
}) {
  const result = await db.query(
    `INSERT INTO users (name, email, password, auth_provider, google_id, avatar, last_login_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, email.toLowerCase().trim(), password, authProvider, googleId, avatar, lastLoginAt]
  );
  return mapUser(result.rows[0]);
}

async function updateGoogleProfile(id, { googleId, name, avatar, authProvider, lastLoginAt }) {
  const result = await db.query(
    `UPDATE users
     SET google_id = COALESCE($2, google_id),
         name = COALESCE(NULLIF($3, ''), name),
         avatar = COALESCE($4, avatar),
         auth_provider = COALESCE($5, auth_provider),
         last_login_at = COALESCE($6, last_login_at),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, googleId, name, avatar, authProvider, lastLoginAt]
  );
  return mapUser(result.rows[0]);
}

async function touchLastLogin(id) {
  const result = await db.query(
    `UPDATE users
     SET last_login_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return mapUser(result.rows[0]);
}

module.exports = {
  create,
  findByEmail,
  findByGoogleId,
  findById,
  touchLastLogin,
  updateGoogleProfile,
};
