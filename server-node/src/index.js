const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const config = require('./core/config');
const logger = require('./middleware/logger');

const app = express();

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: '*',
    credentials: false,
    exposedHeaders: ['Content-Disposition']
}));
app.use(compression({ threshold: 1000 }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(logger);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now() / 1000,
        supabase_configured: !!(config.supabaseUrl && config.supabaseKey)
    });
});

app.get('/api', (req, res) => {
    res.json({
        status: 'ok',
        message: 'DataRefinery API (Node.js) is running',
        version: '1.2.0'
    });
});

// Import routers
app.use('/api', require('./routers/text'));
app.use('/api/file', require('./routers/jsonConv'));
app.use('/api/file', require('./routers/fileOps'));
app.use('/api/file', require('./routers/merger'));
app.use('/api/file', require('./routers/template'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack);

    const statusCode = err.status || 500;
    res.status(statusCode).json({
        error: err.message || 'An internal server error occurred.',
        type: err.name,
        code: err.code || 'INTERNAL_ERROR',
        path: req.path
    });
});

app.listen(config.port, () => {
    console.log(`[SYSTEM] Refinery Server running on port ${config.port}`);
});
