const axios = require('axios');
const config = require('./config');

const TOKEN_CACHE = new Map();
const CACHE_TTL = 3600 * 1000; // 1 hour

async function verifyToken(token) {
    try {
        const response = await axios.get(`${config.supabaseUrl}/auth/v1/user`, {
            headers: {
                apikey: config.supabaseKey,
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 200) {
            return {
                id: response.data.id,
                email: response.data.email
            };
        }
        return null;
    } catch (error) {
        console.error('Auth error:', error.message);
        return null;
    }
}

async function getCurrentUser(req) {
    if (!config.supabaseUrl || !config.supabaseKey) return null;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];

    const now = Date.now();
    if (TOKEN_CACHE.has(token)) {
        const { user, expiry } = TOKEN_CACHE.get(token);
        if (now < expiry) return user;
        TOKEN_CACHE.delete(token); // Expired
    }

    const user = await verifyToken(token);
    if (user) {
        TOKEN_CACHE.set(token, { user, expiry: now + CACHE_TTL });
    }
    return user;
}

const supabase = require('./supabase');

async function uploadProcessedFile(userId, filename, buffer) {
    if (!config.supabaseUrl || !config.supabaseKey) return null;

    try {
        const filePath = `${userId}/${Date.now()}_${filename}`;
        const { data, error } = await supabase.storage
            .from('refinery-outputs')
            .upload(filePath, buffer, {
                contentType: filename.endsWith('.csv') ? 'text/csv' :
                    filename.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                        filename.endsWith('.json') ? 'application/json' : 'application/octet-stream',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('refinery-outputs')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Failed to upload to storage:', error.message);
        return null;
    }
}

async function logActivity(userId, action, filename, fileUrl = null) {
    if (!config.supabaseUrl || !config.supabaseKey) return;

    try {
        const payload = {
            user_id: userId,
            action: `Backend: ${action}`,
            filename: filename,
            file_url: fileUrl
        };

        const { error } = await supabase
            .from('activity_logs')
            .insert(payload);

        if (error) throw error;
    } catch (error) {
        console.error('Failed to log activity:', error.message);
    }
}

module.exports = {
    getCurrentUser,
    logActivity,
    uploadProcessedFile
};
