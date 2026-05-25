const db = require('../db/pool');

function mapUploadedFile(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    originalName: row.original_name,
    storedName: row.stored_name,
    size: row.size_bytes,
    mimetype: row.mimetype,
    createdAt: row.created_at,
  };
}

async function create({ userId, originalName, storedName, size, mimetype }) {
  const result = await db.query(
    `INSERT INTO uploaded_files (user_id, original_name, stored_name, size_bytes, mimetype)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId || null, originalName, storedName, size, mimetype]
  );
  return mapUploadedFile(result.rows[0]);
}

module.exports = {
  create,
};
