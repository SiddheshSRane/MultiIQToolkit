function validateBody(requiredFields) {
    return (req, res, next) => {
        const missing = requiredFields.filter(field => !req.body[field] && req.body[field] !== false && req.body[field] !== 0);
        if (missing.length > 0) {
            return res.status(400).json({
                error: `Missing required fields: ${missing.join(', ')}`,
                code: 'VALIDATION_ERROR'
            });
        }
        next();
    };
}

function validateFile(fieldName = 'file') {
    return (req, res, next) => {
        if (!req.file && (!req.files || req.files.length === 0)) {
            return res.status(400).json({
                error: `No file uploaded for field: ${fieldName}`,
                code: 'FILE_REQUIRED'
            });
        }
        next();
    };
}

module.exports = {
    validateBody,
    validateFile
};
