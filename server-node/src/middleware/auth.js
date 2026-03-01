const { verifyToken } = require('../core/auth');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Optional auth - some endpoints might not strictly require it but use it for logging
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    req.user = user;
    next();
}

module.exports = authMiddleware;
