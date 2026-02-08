require('dotenv').config();

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  port: process.env.PORT || 8000,
  cacheTtl: 3600 * 1000, // 1 hour in ms
};

module.exports = config;
