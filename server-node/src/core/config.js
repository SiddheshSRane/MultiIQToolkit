require('dotenv').config();
const path = require('path');

const config = {
    port: process.env.PORT || 8000,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    maxFileSizeMb: 50,
    logsDir: path.join(__dirname, '../../logs'),
    cacheTtl: 3600 * 1000 // 1 hour in ms
};

if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn('⚠️ Supabase credentials missing from environment variables.');
}

module.exports = config;
