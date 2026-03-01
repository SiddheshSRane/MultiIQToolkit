const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { processRemoveColumns, processRenameColumns, processReplaceBlanks } = require('../utils/tools');
const { readData, unifiedBatchHandler } = require('../utils/helpers');

router.post('/preview-columns', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const { sheet_name } = req.body;
        const data = readData(req.file.buffer, req.file.originalname, sheet_name);

        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        const rows = data.slice(0, 10).map(row => Object.values(row));

        res.json({
            columns: headers,
            sample: { headers, rows }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/remove-columns', upload.array('files'), async (req, res) => {
    const { columns, sheet_name, all_sheets } = req.body;
    const columns_to_remove = columns.split(',').map(c => c.trim()).filter(Boolean);

    await unifiedBatchHandler(req, res, processRemoveColumns,
        { columns_to_remove, sheet_name, all_sheets },
        "Remove Columns", "_cleaned");
});

router.post('/rename-columns', upload.array('files'), async (req, res) => {
    const { mapping, sheet_name, all_sheets } = req.body;
    let rename_map = {};
    try {
        rename_map = JSON.parse(mapping);
    } catch (e) {
        return res.status(400).json({ error: "Invalid mapping JSON" });
    }

    await unifiedBatchHandler(req, res, processRenameColumns,
        { rename_map, sheet_name, all_sheets },
        "Rename Columns", "_renamed");
});

router.post('/replace-blanks', upload.array('files'), async (req, res) => {
    const { columns, replacement, sheet_name, all_sheets } = req.body;
    const target_columns = columns ? columns.split(',').map(c => c.trim()).filter(Boolean) : null;

    await unifiedBatchHandler(req, res, processReplaceBlanks,
        { replace_value: replacement, sheet_name, all_sheets, target_columns },
        "Replace Blanks", "_modified");
});

module.exports = router;
