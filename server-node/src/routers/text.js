const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../core/auth');
const { convertColumnAdvanced, columnStats, convertDatesText } = require('../utils/textUtils');
const XLSX = require('xlsx');

const { validateBody } = require('../middleware/validator');

router.post('/convert', authMiddleware, validateBody(['text']), async (req, res, next) => {
    try {
        const {
            text,
            delimiter = ', ',
            item_prefix = '',
            item_suffix = '',
            result_prefix = '',
            result_suffix = '',
            remove_duplicates = false,
            sort_items = false,
            reverse_items = false,
            ignore_comments = true,
            strip_quotes = false,
            trim_items = true,
            case_transform = 'none'
        } = req.body;

        const result = convertColumnAdvanced(text, {
            delimiter,
            itemPrefix: item_prefix,
            itemSuffix: item_suffix,
            resultPrefix: result_prefix,
            resultSuffix: result_suffix,
            removeDuplicates: remove_duplicates,
            sortItems: sort_items,
            reverseItems: reverse_items,
            ignoreComments: ignore_comments,
            stripQuotes: strip_quotes,
            trimItems: trim_items,
            caseTransform: case_transform
        });

        const stats = columnStats(text);

        if (req.user) {
            await logActivity(req.user.id, 'Text Conversion', 'clipboard');
        }

        res.json({ result, stats });
    } catch (error) {
        next(error);
    }
});

router.post('/convert/export-xlsx', authMiddleware, validateBody(['text']), async (req, res, next) => {
    try {
        const {
            text,
            item_prefix = '',
            item_suffix = '',
            remove_duplicates = false,
            sort_items = false,
            reverse_items = false,
            ignore_comments = true,
            strip_quotes = false,
            trim_items = true,
            case_transform = 'none'
        } = req.body;

        const result = convertColumnAdvanced(text, {
            delimiter: '\n',
            itemPrefix: item_prefix,
            itemSuffix: item_suffix,
            removeDuplicates: remove_duplicates,
            sortItems: sort_items,
            reverseItems: reverse_items,
            ignoreComments: ignore_comments,
            stripQuotes: strip_quotes,
            trimItems: trim_items,
            caseTransform: case_transform
        });

        const items = result.split('\n').filter(Boolean);
        const data = items.map(item => ({ Items: item }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'ConvertedData');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        if (req.user) {
            await logActivity(req.user.id, 'Text Export XLSX', 'conversion.xlsx');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="conversion.xlsx"');
        res.send(buf);
    } catch (error) {
        next(error);
    }
});

router.post('/convert/datetime', authMiddleware, validateBody(['text', 'target_format']), async (req, res, next) => {
    try {
        const { text, target_format } = req.body;

        const [result, valid_count] = convertDatesText(text, target_format);
        const stats = columnStats(text);
        stats.non_empty = valid_count;

        if (req.user) {
            await logActivity(req.user.id, 'DateTime Conversion (Text)', 'clipboard');
        }

        res.json({ result, stats });
    } catch (error) {
        next(error);
    }
});

router.post('/convert/datetime/export-xlsx', authMiddleware, validateBody(['text', 'target_format']), async (req, res, next) => {
    try {
        const { text, target_format } = req.body;

        const [result] = convertDatesText(text, target_format);
        const items = result.split('\n').filter(Boolean);
        const data = items.map(item => ({ 'Converted DateTime': item }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'ConvertedDates');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        if (req.user) {
            await logActivity(req.user.id, 'DateTime Export XLSX', 'dates_conversion.xlsx');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="dates_conversion.xlsx"');
        res.send(buf);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
