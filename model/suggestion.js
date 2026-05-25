const db = require('../db/pool');

async function getCategories() {
  const result = await db.query('SELECT slug, name FROM suggestion_categories ORDER BY name');
  return result.rows;
}

async function getSuggestionsByCategory(slug) {
  const result = await db.query(
    `SELECT suggestion_items.type, suggestion_items.content, suggestion_items.mood
     FROM suggestion_items
     INNER JOIN suggestion_categories ON suggestion_categories.id = suggestion_items.category_id
     WHERE suggestion_categories.slug = $1
     ORDER BY suggestion_items.type, suggestion_items.sort_order`,
    [slug]
  );

  if (result.rowCount === 0) return null;

  return result.rows.reduce(
    (acc, row) => {
      if (row.type === 'caption') acc.captions.push(row.content);
      if (row.type === 'hashtag') acc.hashtags.push(row.content);
      if (row.type === 'song') acc.songs.push({ title: row.content, mood: row.mood });
      return acc;
    },
    { captions: [], hashtags: [], songs: [] }
  );
}

module.exports = {
  getCategories,
  getSuggestionsByCategory,
};
