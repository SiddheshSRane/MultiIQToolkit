const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../core/auth');
const { getExcelHeaders, mapTemplateData, previewMappedData } = require('../utils/templateUtils');

const { validateBody, validateFile } = require('../middleware/validator');

router.post('/template-headers', upload.single('file'), validateFile(), async (req, res, next) => {
    try {
        const is_csv = req.file.originalname.toLowerCase().endsWith(".csv");
        const headers = getExcelHeaders(req.file.buffer, { is_csv });
        res.json({ headers });
    } catch (error) {
        next(error);
    }
});

router.post('/template-preview', upload.single('data_file'), validateFile('data_file'), validateBody(['template_headers', 'mapping_json']), async (req, res, next) => {
    try {
        const { template_headers, mapping_json } = req.body;
        const tHeaders = JSON.parse(template_headers);
        const mapping = JSON.parse(mapping_json);
        const is_csv = req.file.originalname.toLowerCase().endsWith(".csv");

        const preview = previewMappedData(tHeaders, req.file.buffer, { is_csv, mapping });
        res.json(preview);
    } catch (error) {
        next(error);
    }
});

router.post('/template-map', authMiddleware, upload.single('data_file'), validateFile('data_file'), validateBody(['template_headers', 'mapping_json']), async (req, res, next) => {
    try {
        const { template_headers, mapping_json } = req.body;
        const tHeaders = JSON.parse(template_headers);
        const mapping = JSON.parse(mapping_json);
        const is_csv = req.file.originalname.toLowerCase().endsWith(".csv");

        const [output, filename] = await mapTemplateData(tHeaders, req.file.buffer, { is_csv, mapping });

        if (!output) {
            const error = new Error(filename || "Mapping failed.");
            error.status = 400;
            throw error;
        }

        if (req.user) {
            logActivity(req.user.id, "Template Mapping", filename).catch(console.error);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="mapped_output_${Date.now()}.xlsx"`);
        res.send(output);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
