const { getCurrentUser } = require('../core/auth');

async function authMiddleware(req, res, next) {
    const user = await getCurrentUser(req);
    // Unlike FastAPI Depends, we attach user to req or just proceed
    // In FastAPI, get_current_user returns user or None. 
    // Many routes in the Python code have user=Depends(get_current_user) but don't strictly require it?
    // Actually, FastAPI Depends(get_current_user) would fail if it raises exception, 
    // but here it returns None if not found.
    req.user = user;
    next();
}

module.exports = authMiddleware;
