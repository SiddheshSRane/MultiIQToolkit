const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const authMiddleware = require('../middleware/auth');
const { unifiedBatchHandler } = require('../utils/fileHelpers');
const { convertToJSON } = require('../utils/jsonConverter');

const { validateFile } = require('../middleware/validator');

router.post('/convert-to-json', authMiddleware, upload.array('files'), validateFile('files'), async (req, res, next) => {
    try {
        const {
            orient = 'records',
            indent = 4,
            sheet_name = null,
            all_sheets = 'false'
        } = req.body;

        await unifiedBatchHandler(res, {
            files: req.files,
            processorFunc: convertToJSON,
            argsDict: {
                orient,
                indent: parseInt(indent, 10),
                sheet_name,
                apply_all_sheets: all_sheets === 'true'
            },
            actionName: 'JSON Conversion',
            extSuffix: '',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
