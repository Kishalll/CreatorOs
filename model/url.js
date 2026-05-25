const db = require('../db/pool');

function mapUrl(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    shortId: row.short_id,
    redirectUrl: row.redirect_url,
    totalClicks: row.total_clicks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function create({ userId, shortId, redirectUrl }) {
  const result = await db.query(
    `INSERT INTO urls (user_id, short_id, redirect_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId || null, shortId, redirectUrl]
  );
  return mapUrl(result.rows[0]);
}

async function findByShortId(shortId) {
  const result = await db.query('SELECT * FROM urls WHERE short_id = $1', [shortId]);
  return mapUrl(result.rows[0]);
}

async function recordClick(shortId, { referrer, userAgent } = {}) {
  const result = await db.query(
    `UPDATE urls
     SET total_clicks = total_clicks + 1, updated_at = NOW()
     WHERE short_id = $1
     RETURNING *`,
    [shortId]
  );
  const url = mapUrl(result.rows[0]);
  if (!url) return null;

  await db.query(
    'INSERT INTO url_clicks (url_id, referrer, user_agent) VALUES ($1, $2, $3)',
    [url.id, referrer || null, userAgent || null]
  );

  return url;
}

async function analyticsByShortId(shortId) {
  const url = await findByShortId(shortId);
  if (!url) return null;

  const clicks = await db.query(
    `SELECT clicked_at AS "timeStamp", referrer, user_agent AS "userAgent"
     FROM url_clicks
     WHERE url_id = $1
     ORDER BY clicked_at DESC`,
    [url.id]
  );

  return {
    totalClicks: url.totalClicks,
    analytics: clicks.rows,
  };
}

async function dashboardStats(userId) {
  const result = await db.query(
    `WITH user_urls AS (
       SELECT * FROM urls WHERE user_id = $1
     ),
     current_month AS (
       SELECT COUNT(*)::int AS links, COALESCE(SUM(total_clicks), 0)::int AS clicks
       FROM user_urls
       WHERE created_at >= date_trunc('month', NOW())
     ),
     previous_month AS (
       SELECT COUNT(*)::int AS links, COALESCE(SUM(total_clicks), 0)::int AS clicks
       FROM user_urls
       WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
         AND created_at < date_trunc('month', NOW())
     )
     SELECT
       (SELECT COUNT(*)::int FROM user_urls) AS total_links,
       (SELECT COALESCE(SUM(total_clicks), 0)::int FROM user_urls) AS total_clicks,
       (SELECT COALESCE(MAX(total_clicks), 0)::int FROM user_urls) AS top_clicks,
       (SELECT links FROM current_month) AS current_links,
       (SELECT links FROM previous_month) AS previous_links,
       (SELECT clicks FROM current_month) AS current_clicks,
       (SELECT clicks FROM previous_month) AS previous_clicks`,
    [userId]
  );

  const row = result.rows[0] || {};
  const linkTrend = percentChange(row.current_links || 0, row.previous_links || 0);
  const clickTrend = percentChange(row.current_clicks || 0, row.previous_clicks || 0);

  return {
    totalLinks: row.total_links || 0,
    totalClicks: row.total_clicks || 0,
    topClicks: row.top_clicks || 0,
    linkTrend,
    clickTrend,
  };
}

async function recentByUser(userId, limit = 5) {
  const result = await db.query(
    `SELECT *
     FROM urls
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map(mapUrl);
}

async function clicksByDay(userId, days = 7) {
  const result = await db.query(
    `WITH series AS (
       SELECT generate_series(
         date_trunc('day', NOW()) - (($2::int - 1) * INTERVAL '1 day'),
         date_trunc('day', NOW()),
         INTERVAL '1 day'
       ) AS day
     )
     SELECT
       series.day::date AS day,
       COUNT(urls.id)::int AS clicks
     FROM series
     LEFT JOIN url_clicks ON date_trunc('day', url_clicks.clicked_at) = series.day
     LEFT JOIN urls ON urls.id = url_clicks.url_id AND urls.user_id = $1
     GROUP BY series.day
     ORDER BY series.day`,
    [userId, days]
  );
  return result.rows.map((row) => ({
    label: new Date(row.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clicks: row.clicks,
  }));
}

async function topReferrers(userId, limit = 5) {
  const result = await db.query(
    `SELECT COALESCE(NULLIF(url_clicks.referrer, ''), 'Direct') AS source, COUNT(*)::int AS clicks
     FROM url_clicks
     INNER JOIN urls ON urls.id = url_clicks.url_id
     WHERE urls.user_id = $1
     GROUP BY source
     ORDER BY clicks DESC
     LIMIT $2`,
    [userId, limit]
  );

  const total = result.rows.reduce((sum, row) => sum + row.clicks, 0);
  if (total === 0) return [];

  return result.rows.map((row) => ({
    source: row.source,
    percent: Math.round((row.clicks / total) * 100),
  }));
}

function percentChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

module.exports = {
  analyticsByShortId,
  clicksByDay,
  create,
  dashboardStats,
  findByShortId,
  recentByUser,
  recordClick,
  topReferrers,
};
