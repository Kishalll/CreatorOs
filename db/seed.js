require('dotenv').config();
const { pool } = require('./pool');

const services = [
  ['url-shortener', 'Titli - URL Shortener', 'Create compact short links and redirect users reliably.', '/services/url-shortener', 'available', 10],
  ['file-upload', 'File Upload', 'Drag and drop or click to upload files. Supports all common formats.', '/services/file-upload', 'available', 20],
  ['smart-bio', 'Smart Bio System', 'A smart mobile-first bio platform with branding, analytics, and custom domains.', '/services/smart-bio', 'coming_soon', 30],
  ['analytics-dashboard', 'Analytics Dashboard', 'Track performance and engagement across your creator services.', '/services/analytics-dashboard', 'coming_soon', 40],
  ['dm-automation', 'DM Automation', 'Automate replies and deliver lead magnets via keyword triggers.', '/services/dm-automation', 'coming_soon', 50],
  ['creator-crm', 'Creator CRM', 'Invite collaborators, manage team access, and view pending invitations.', '/services/creator-crm', 'available', 60],
  ['content-os', 'Content OS', 'Organize ideas, scripts, and content planning workflows.', '/services/content-os', 'coming_soon', 70],
  ['suggestion-tool', 'Caption & Hashtag Tool', 'Get captions, hashtags and song suggestions based on your content type.', '/services/suggestion-tool', 'available', 80],
];

const suggestions = {
  travel: {
    captions: ['Not all those who wander are lost', 'Adventure awaits, go find it', 'Collect moments, not things', 'Life is short and the world is wide', 'Wander often, wonder always'],
    hashtags: ['#travel', '#wanderlust', '#travelgram', '#exploretheworld', '#adventure', '#travelphotography', '#traveldiaries', '#instatravel', '#roamtheplanet'],
    songs: [['Wake Me Up - Avicii', 'uplifting'], ['A Sky Full of Stars - Coldplay', 'cinematic'], ['Sunflower - Post Malone', 'chill'], ['Good Life - OneRepublic', 'feel-good'], ['On Top of the World - Imagine Dragons', 'euphoric']],
  },
  fitness: {
    captions: ['Sweat now, shine later', 'Your only limit is you', 'Train insane or remain the same', 'The body achieves what the mind believes', 'Push yourself because no one else is going to do it for you'],
    hashtags: ['#fitness', '#gym', '#workout', '#fitnessmotivation', '#grind', '#gains', '#fitlife', '#nopainnogain', '#bodybuilding'],
    songs: [['Stronger - Kanye West', 'hype'], ['Till I Collapse - Eminem', 'intense'], ['Eye of the Tiger - Survivor', 'classic'], ['Power - Kanye West', 'dominant'], ["Can't Hold Us - Macklemore", 'energetic']],
  },
  fashion: {
    captions: ['Style is a way to say who you are', "Dress like you're already famous", 'Fashion fades, style is eternal', 'Life is too short to wear boring clothes', 'Outfit of the day: confidence'],
    hashtags: ['#fashion', '#ootd', '#style', '#outfitoftheday', '#aesthetic', '#fashionista', '#streetstyle', '#lookbook', '#fashionblogger'],
    songs: [['Vogue - Madonna', 'iconic'], ['7 rings - Ariana Grande', 'confident'], ['Fancy - Iggy Azalea', 'glam'], ['Boss Bitch - Doja Cat', 'fierce'], ['Formation - Beyonce', 'powerful']],
  },
  tech: {
    captions: ['Building the future, one line at a time', 'Code is poetry', 'Ship it. Iterate. Repeat', 'In a world full of users, be a developer', 'First, solve the problem. Then, write the code'],
    hashtags: ['#tech', '#coding', '#developer', '#buildinpublic', '#100daysofcode', '#programming', '#webdev', '#softwareengineer', '#opensource'],
    songs: [['Harder Better Faster Stronger - Daft Punk', 'focus'], ['Interstellar OST - Hans Zimmer', 'deep work'], ['Lose Yourself - Eminem', 'grind'], ['The Less I Know The Better - Tame Impala', 'flow state'], ['Levels - Avicii', 'productive']],
  },
  aesthetic: {
    captions: ['Soft life, big dreams', "In my own world and it's beautiful", 'Living slowly, loving deeply', 'She believed she could, so she did', 'Bloom where you are planted'],
    hashtags: ['#aesthetic', '#softlife', '#vibes', '#aestheticphotos', '#minimalvibes', '#moodboard', '#dreamy', '#cottagecore', '#coquette'],
    songs: [['Golden Hour - JVKE', 'dreamy'], ['Sweater Weather - The Neighbourhood', 'cozy'], ['Cruel Summer - Taylor Swift', 'nostalgic'], ['Espresso - Sabrina Carpenter', 'girly pop'], ['Die With A Smile - Lady Gaga & Bruno Mars', 'romantic']],
  },
  food: {
    captions: ['Good food, good mood', 'First, we eat. Then, we do everything else', 'Life is too short for bad coffee', 'Eating my feelings, one bite at a time', 'Food is my love language'],
    hashtags: ['#foodie', '#foodphotography', '#instafood', '#foodblogger', '#yummy', '#foodstagram', '#homecooking', '#foodlover', '#delicious'],
    songs: [['Happy - Pharrell Williams', 'upbeat'], ['Sunday Morning - Maroon 5', 'brunch vibes'], ['Peaches - Justin Bieber', 'fruity and fun'], ['Good Day Sunshine - The Beatles', 'feel-good'], ['Butter - BTS', 'smooth']],
  },
  motivation: {
    captions: ['Start where you are. Use what you have. Do what you can', 'Every day is a second chance', 'Dream bigger. Do better. Become more', 'The comeback is always stronger than the setback', 'Small steps every day lead to big results'],
    hashtags: ['#motivation', '#mindset', '#grindset', '#success', '#hustle', '#inspire', '#growth', '#selfdevelopment', '#dailymotivation'],
    songs: [['Hall of Fame - The Script ft. will.i.am', 'inspirational'], ['Believer - Imagine Dragons', 'empowering'], ['Rise - Katy Perry', 'triumphant'], ['Not Afraid - Eminem', 'courageous'], ['Unstoppable - Sia', 'fearless']],
  },
};

async function seed() {
  for (const service of services) {
    await pool.query(
      `INSERT INTO services (key, name, description, route, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         route = EXCLUDED.route,
         status = EXCLUDED.status,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()`,
      service
    );
  }

  for (const [slug, data] of Object.entries(suggestions)) {
    const categoryResult = await pool.query(
      `INSERT INTO suggestion_categories (slug, name)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [slug, slug.charAt(0).toUpperCase() + slug.slice(1)]
    );
    const categoryId = categoryResult.rows[0].id;

    await pool.query('DELETE FROM suggestion_items WHERE category_id = $1', [categoryId]);

    for (const [index, value] of data.captions.entries()) {
      await pool.query(
        'INSERT INTO suggestion_items (category_id, type, content, sort_order) VALUES ($1, $2, $3, $4)',
        [categoryId, 'caption', value, index + 1]
      );
    }

    for (const [index, value] of data.hashtags.entries()) {
      await pool.query(
        'INSERT INTO suggestion_items (category_id, type, content, sort_order) VALUES ($1, $2, $3, $4)',
        [categoryId, 'hashtag', value, index + 1]
      );
    }

    for (const [index, [title, mood]] of data.songs.entries()) {
      await pool.query(
        'INSERT INTO suggestion_items (category_id, type, content, mood, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [categoryId, 'song', title, mood, index + 1]
      );
    }
  }

  console.log('Seed data loaded');
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error('Seed failed:', error);
    pool.end().finally(() => process.exit(1));
  });
