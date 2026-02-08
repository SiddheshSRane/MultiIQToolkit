const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const XLSX = require('xlsx');
const authMiddleware = require('../middleware/auth');
const { unifiedBatchHandler } = require('../utils/fileHelpers');
const { removeColumns, bulkRenameColumns, replaceBlankValues, convertDatetimeColumn, splitFile } = require('../utils/fileTools');

const { validateBody, validateFile } = require('../middleware/validator');

router.post('/preview-columns', upload.single('file'), validateFile(), async (req, res, next) => {
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = req.body.sheet_name || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            const error = new Error(`Sheet "${sheetName}" not found.`);
            error.status = 400;
            throw error;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: "" });
        const headers = jsonData[0] || [];
        const rows = jsonData.slice(1, 11); // Sample 10 rows

        res.json({
            columns: headers,
            sheets: workbook.SheetNames,
            sample: {
                headers: headers,
                rows: rows
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/remove-columns', authMiddleware, upload.array('files'), validateFile('files'), validateBody(['columns']), async (req, res, next) => {
    try {
        const { columns, sheet_name, all_sheets } = req.body;
        const columnsList = columns.split(',').map(c => c.trim()).filter(Boolean);

        await unifiedBatchHandler(res, {
            files: req.files,
            processorFunc: removeColumns,
            argsDict: {
                columns_to_remove: columnsList,
                sheet_name,
                apply_all_sheets: all_sheets === 'true'
            },
            actionName: 'Remove Columns',
            extSuffix: '_cleaned',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
});

router.post('/rename-columns', authMiddleware, upload.array('files'), validateFile('files'), validateBody(['mapping']), async (req, res, next) => {
    try {
        const { mapping, sheet_name, all_sheets } = req.body;
        let renameMap;
        try {
            renameMap = JSON.parse(mapping);
        } catch (e) {
            const error = new Error("Invalid JSON mapping provided.");
            error.status = 400;
            throw error;
        }

        await unifiedBatchHandler(res, {
            files: req.files,
            processorFunc: bulkRenameColumns,
            argsDict: {
                rename_map: renameMap,
                sheet_name,
                apply_all_sheets: all_sheets === 'true'
            },
            actionName: 'Rename Columns',
            extSuffix: '_renamed',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
});

router.post('/replace-blanks', authMiddleware, upload.array('files'), validateFile('files'), validateBody(['columns']), async (req, res, next) => {
    try {
        const { columns, replacement = '', sheet_name, all_sheets } = req.body;
        const columnsList = columns.split(',').map(c => c.trim()).filter(Boolean);

        await unifiedBatchHandler(res, {
            files: req.files,
            processorFunc: replaceBlankValues,
            argsDict: {
                replace_value: replacement,
                target_columns: columnsList,
                sheet_name,
                apply_all_sheets: all_sheets === 'true'
            },
            actionName: 'Replace Blanks',
            extSuffix: '_modified',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
});

router.post('/convert-datetime', authMiddleware, upload.array('files'), validateFile('files'), validateBody(['column', 'target_format']), async (req, res, next) => {
    try {
        const { column, target_format, sheet_name, all_sheets } = req.body;
        const columnsList = column.split(',').map(c => c.trim()).filter(Boolean);

        await unifiedBatchHandler(res, {
            files: req.files,
            processorFunc: convertDatetimeColumn,
            argsDict: {
                column_names: columnsList,
                target_format,
                sheet_name,
                apply_all_sheets: all_sheets === 'true'
            },
            actionName: 'Convert DateTime',
            extSuffix: '_formatted',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
});

router.post('/split-file', authMiddleware, upload.single('file'), validateFile(), validateBody(['rows_per_split']), async (req, res, next) => {
    try {
        const { rows_per_split } = req.body;
        const rows = parseInt(rows_per_split, 10);

        if (isNaN(rows) || rows <= 0) {
            const error = new Error("Invalid rows_per_split. Must be a positive number.");
            error.status = 400;
            throw error;
        }

        const is_csv = req.file.originalname.toLowerCase().endsWith('.csv');
        const [buffer, ext] = await splitFile(req.file.buffer, {
            rows_per_split: rows,
            originalname: req.file.originalname,
            is_csv
        });

        if (!buffer) {
            const error = new Error(ext || "Splitting failed.");
            error.status = 400;
            throw error;
        }

        const outName = `${req.file.originalname.split('.')[0]}_split.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${outName}"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
