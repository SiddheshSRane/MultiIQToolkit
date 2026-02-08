const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../core/auth');
const { flattenFiles } = require('../utils/fileHelpers');
const { previewCommonColumns, mergeFilesAdvanced } = require('../utils/mergerUtils');

const { validateFile } = require('../middleware/validator');

router.post('/preview-common-columns', upload.array('files'), validateFile('files'), async (req, res, next) => {
    try {
        const fileData = await flattenFiles(req.files);
        const { strategy = 'intersection', case_insensitive = 'false', all_sheets = 'false' } = req.body;

        const [columns, sample] = previewCommonColumns(fileData, {
            strategy,
            case_insensitive: case_insensitive === 'true',
            all_sheets: all_sheets === 'true'
        });

        res.json({
            columns: columns,
            sample: {
                headers: sample[0] || [],
                rows: sample.slice(1)
            },
            file_count: fileData.length
        });
    } catch (error) {
        next(error);
    }
});

router.post('/merge-common-columns', authMiddleware, upload.array('files'), validateFile('files'), async (req, res, next) => {
    try {
        const fileData = await flattenFiles(req.files);
        const {
            strategy = 'intersection',
            case_insensitive = 'false',
            remove_duplicates = 'false',
            all_sheets = 'false',
            selected_columns = null,
            trim_whitespace = 'false',
            casing = 'none',
            include_source_col = 'true',
            join_mode = 'stack',
            join_key = null
        } = req.body;

        const columnsList = selected_columns ? selected_columns.split(',').map(c => c.trim()).filter(Boolean) : null;

        const [output, columns, filename] = await mergeFilesAdvanced(fileData, {
            strategy,
            case_insensitive: case_insensitive === 'true',
            remove_duplicates: remove_duplicates === 'true',
            all_sheets: all_sheets === 'true',
            selected_columns: columnsList,
            trim_whitespace: trim_whitespace === 'true',
            casing,
            include_source_col: include_source_col === 'true',
            join_mode,
            join_key
        });

        if (!output) {
            const error = new Error(filename || "Merge failed.");
            error.status = 400;
            throw error;
        }

        if (req.user) {
            // Background log
            logActivity(req.user.id, "Advanced Merge", filename).catch(console.error);
        }

        const extension = filename.endsWith('.xlsx') ? '.xlsx' : '.csv';
        res.setHeader('Content-Type', extension === '.xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(output);

    } catch (error) {
        next(error);
    }
});

module.exports = router;
