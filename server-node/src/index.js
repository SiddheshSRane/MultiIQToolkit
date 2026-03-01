const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const config = require('./core/config');
const authMiddleware = require('./middleware/auth');

// Routers
const textRouter = require('./routers/text');
const fileOpsRouter = require('./routers/fileOps');
const mergerRouter = require('./routers/merger');
const jsonConvRouter = require('./routers/jsonConv');
const templateRouter = require('./routers/template');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply Auth globally
app.use(authMiddleware);

// Routes
app.use('/api', textRouter);
app.use('/api/file', fileOpsRouter);
app.use('/api/file', mergerRouter);
app.use('/api/file', jsonConvRouter);
app.use('/api/file', templateRouter);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        supabase_configured: !!(config.supabaseUrl && config.supabaseKey),
        engine: 'Node.js'
    });
});

// Root check
app.get('/api', (req, res) => {
    res.json({
        status: 'ok',
        message: 'DataRefinery Node API is running',
        version: '1.1.0'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'An internal server error occurred.',
        message: err.message
    });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(config.port, () => {
        console.log(`🚀 Node.js API running on http://localhost:${config.port}`);
    });
}

module.exports = app;
