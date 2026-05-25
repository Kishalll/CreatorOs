const db = require('../db/pool');

function mapService(row) {
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    route: row.route,
    status: row.status,
  };
}

async function findAll() {
  const result = await db.query('SELECT * FROM services ORDER BY sort_order, name');
  return result.rows.map(mapService);
}

async function findByKey(key) {
  const result = await db.query('SELECT * FROM services WHERE key = $1', [key]);
  return result.rows[0] ? mapService(result.rows[0]) : null;
}

async function getSummary() {
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'available')::int AS available,
       COUNT(*) FILTER (WHERE status = 'coming_soon')::int AS coming_soon
     FROM services`
  );
  return result.rows[0] || { available: 0, coming_soon: 0 };
}

module.exports = {
  findAll,
  findByKey,
  getSummary,
};
