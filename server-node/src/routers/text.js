const express = require('express');
const router = express.Router();
const { convertColumnAdvanced, convertDatesText, columnStats } = require('../utils/tools');
const { logActivity } = require('../core/auth');
const XLSX = require('xlsx');

router.post('/convert', async (req, res) => {
    try {
        const payload = req.body;
        const result = convertColumnAdvanced(payload.text, payload);
        const stats = columnStats(payload.text);

        if (req.user) {
            await logActivity(req.user.id, "Text Conversion", "clipboard");
        }

        res.json({ result, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/convert/export-xlsx', async (req, res) => {
    try {
        const payload = req.body;
        const result = convertColumnAdvanced(payload.text, { ...payload, delimiter: "\n" });
        const items = result.split('\n');

        const data = items.map(item => ({ Items: item }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ConvertedData");

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        if (req.user) {
            await logActivity(req.user.id, "Download CSV as XLSX", "conversion.xlsx");
        }

        res.setHeader('Content-Disposition', 'attachment; filename="conversion.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/convert/datetime', async (req, res) => {
    try {
        const { text, target_format } = req.body;
        const [result, validCount] = convertDatesText(text, target_format);
        const stats = columnStats(text);
        stats.non_empty = validCount;

        if (req.user) {
            await logActivity(req.user.id, "DateTime Conversion (Text)", "clipboard");
        }

        res.json({ result, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/convert/datetime/export-xlsx', async (req, res) => {
    try {
        const { text, target_format } = req.body;
        const [result] = convertDatesText(text, target_format);
        const items = result.split('\n');

        const data = items.map(item => ({ "Converted DateTime": item }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ConvertedDates");

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        if (req.user) {
            await logActivity(req.user.id, "DateTime Export XLSX", "dates_conversion.xlsx");
        }

        res.setHeader('Content-Disposition', 'attachment; filename="dates_conversion.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
