const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { processMergeFiles, previewCommonColumns } = require('../utils/tools');
const { flattenFiles, getMediaType } = require('../utils/helpers');
const { logActivity } = require('../core/auth');

router.post('/preview-common-columns', upload.array('files'), async (req, res) => {
    try {
        const flatFiles = await flattenFiles(req.files || []);
        const { strategy, case_insensitive } = req.body;

        const result = previewCommonColumns(flatFiles, { strategy, case_insensitive: case_insensitive === 'true' });

        res.json({
            ...result,
            file_count: flatFiles.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/merge-common-columns', upload.array('files'), async (req, res) => {
    try {
        const flatFiles = await flattenFiles(req.files || []);
        const options = {
            strategy: req.body.strategy,
            case_insensitive: req.body.case_insensitive === 'true',
            remove_duplicates: req.body.remove_duplicates === 'true',
            all_sheets: req.body.all_sheets === 'true',
            selected_columns: req.body.selected_columns ? req.body.selected_columns.split(',') : null,
            trim_whitespace: req.body.trim_whitespace === 'true',
            casing: req.body.casing,
            include_source_col: req.body.include_source_col === 'true',
            join_mode: req.body.join_mode,
            join_key: req.body.join_key
        };

        const { buffer, extension } = await processMergeFiles(flatFiles, options);

        if (req.user) {
            await logActivity(req.user.id, "Advanced Merge", `merged_data${extension}`);
        }

        res.setHeader('Content-Disposition', `attachment; filename="merged_data${extension}"`);
        res.setHeader('Content-Type', getMediaType(extension));
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
