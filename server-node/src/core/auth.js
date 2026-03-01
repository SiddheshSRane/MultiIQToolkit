const axios = require('axios');
const config = require('./config');

const tokenCache = new Map();

async function verifyToken(token) {
    if (!config.supabaseUrl || !config.supabaseKey) return null;

    // Check cache
    if (tokenCache.has(token)) {
        const { user, expiry } = tokenCache.get(token);
        if (Date.now() < expiry) return user;
        tokenCache.delete(token);
    }

    try {
        const response = await axios.get(`${config.supabaseUrl}/auth/v1/user`, {
            headers: {
                'apikey': config.supabaseKey,
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 200) {
            const user = response.data;
            tokenCache.set(token, {
                user,
                expiry: Date.now() + config.cacheTtl
            });
            return user;
        }
    } catch (error) {
        console.error('Auth error:', error.message);
    }
    return null;
}

async function logActivity(userId, action, filename, fileUrl = null) {
    if (!config.supabaseUrl || !config.supabaseKey) return;

    try {
        await axios.post(`${config.supabaseUrl}/rest/v1/activity_logs`, {
            user_id: userId,
            action: `Backend (Node): ${action}`,
            filename: filename,
            file_url: fileUrl
        }, {
            headers: {
                'apikey': config.supabaseKey,
                'Authorization': `Bearer ${config.supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });
    } catch (error) {
        console.error('Failed to log activity:', error.message);
    }
}

module.exports = {
    verifyToken,
    logActivity
};
