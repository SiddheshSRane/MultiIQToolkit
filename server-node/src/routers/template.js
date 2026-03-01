const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { getExcelHeaders, processTemplateMap, previewTemplateMap } = require('../utils/tools');
const { logActivity } = require('../core/auth');
const { getFilesFromRequest } = require('../utils/helpers');

router.post('/template-headers', upload.single('file'), async (req, res) => {
    try {
        const flatFiles = await getFilesFromRequest(req);
        if (flatFiles.length === 0) return res.status(400).json({ error: "No file provided" });
        const file = flatFiles[0];
        const headers = getExcelHeaders(file.buffer, file.originalname.toLowerCase().endsWith('.csv'));
        res.json({ headers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/template-preview', upload.single('data_file'), async (req, res) => {
    try {
        const flatFiles = await getFilesFromRequest(req);
        if (flatFiles.length === 0) return res.status(400).json({ error: "No data file provided" });
        const file = flatFiles[0];

        const { template_headers, mapping_json } = req.body;
        const tHeaders = JSON.parse(template_headers);
        const mapping = JSON.parse(mapping_json);

        const result = previewTemplateMap(file.buffer, {
            template_headers: tHeaders,
            mapping,
            isCsv: file.originalname.toLowerCase().endsWith('.csv')
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/template-map', upload.single('data_file'), async (req, res) => {
    try {
        const flatFiles = await getFilesFromRequest(req);
        if (flatFiles.length === 0) return res.status(400).json({ error: "No data file provided" });
        const file = flatFiles[0];

        const { template_headers, mapping_json } = req.body;
        const tHeaders = JSON.parse(template_headers);
        const mapping = JSON.parse(mapping_json);

        const { buffer, extension } = await processTemplateMap(file.buffer, {
            template_headers: tHeaders,
            mapping,
            isCsv: file.originalname.toLowerCase().endsWith('.csv')
        });

        if (req.user) {
            await logActivity(req.user.id, "Template Mapping", `mapped_output${extension}`);
        }

        res.setHeader('Content-Disposition', `attachment; filename="mapped_output_${Date.now()}${extension}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
