const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { unifiedBatchHandler, readData } = require('../utils/helpers');

async function processToJson(buffer, { orient, indent, sheet_name, isCsv, filename }) {
    const data = readData(buffer, filename, sheet_name);
    const content = JSON.stringify(data, null, parseInt(indent) || 4);
    return { buffer: Buffer.from(content), extension: '.json' };
}

router.post('/convert-to-json', upload.array('files'), async (req, res) => {
    const { orient, indent, sheet_name, all_sheets } = req.body;
    await unifiedBatchHandler(req, res, processToJson,
        { orient, indent, sheet_name, all_sheets },
        "JSON Conversion", "");
});

module.exports = router;
