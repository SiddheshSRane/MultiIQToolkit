const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

if (!config.supabaseUrl || !config.supabaseKey) {
    console.error('Supabase credentials missing in backend config!');
}

const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Initialize buckets
(async () => {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        if (buckets && !buckets.find(b => b.name === 'refinery-outputs')) {
            await supabase.storage.createBucket('refinery-outputs', {
                public: true,
                fileSizeLimit: 52428800 // 50MB
            });
            console.log('Created supabase bucket: refinery-outputs');
        }
    } catch (e) {
        console.error('Bucket init error:', e.message);
    }
})();

module.exports = supabase;
