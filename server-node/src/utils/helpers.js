const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const path = require('path');
const { logActivity } = require('../core/auth');

/**
 * Standardizes reading data into a common format (array of objects)
 */
function readData(buffer, filename, sheetName = null) {
    const isCsv = filename.toLowerCase().endsWith('.csv');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const activeSheet = sheetName || workbook.SheetNames[0];
    if (!activeSheet) return [];

    return XLSX.utils.sheet_to_json(workbook.Sheets[activeSheet], { defval: "" });
}

/**
 * Extracts files from request, including ZIPs
 */
async function flattenFiles(reqFiles) {
    const flattened = [];
    const MAX_FILES = 50;

    for (const file of reqFiles) {
        if (file.originalname.toLowerCase().endsWith('.zip')) {
            const zip = new AdmZip(file.buffer);
            const entries = zip.getEntries();

            if (entries.length > MAX_FILES) {
                throw new Error(`ZIP contains too many files (Limit: ${MAX_FILES})`);
            }

            for (const entry of entries) {
                if (entry.isDirectory || entry.entryName.startsWith('.')) continue;

                const ext = path.extname(entry.entryName).toLowerCase();
                if (['.csv', '.xlsx', '.xls'].includes(ext)) {
                    flattened.push({
                        buffer: entry.getData(),
                        originalname: entry.entryName
                    });
                }
            }
        } else {
            flattened.push(file);
        }
    }
    return flattened;
}

/**
 * Handles batch processing of files
 */
async function unifiedBatchHandler(req, res, processorFunc, args, actionName, extSuffix) {
    try {
        const flatFiles = await flattenFiles(req.files || []);

        if (req.user) {
            await logActivity(req.user.id, actionName, `${flatFiles.length} files`);
        }

        if (flatFiles.length === 0) {
            return res.status(400).json({ error: "No valid CSV or Excel files found." });
        }

        // Single file processing
        if (flatFiles.length === 1) {
            const file = flatFiles[0];
            const isCsv = file.originalname.toLowerCase().endsWith('.csv');

            const { buffer, extension } = await processorFunc(file.buffer, { ...args, isCsv, filename: file.originalname });

            const baseName = path.parse(file.originalname).name;
            const finalExt = extension || (isCsv ? '.csv' : '.xlsx');

            res.setHeader('Content-Disposition', `attachment; filename="${baseName}${extSuffix}${finalExt}"`);
            res.setHeader('Content-Type', getMediaType(finalExt));
            return res.send(buffer);
        }

        // Multiple files processing
        const zip = new AdmZip();
        for (const file of flatFiles) {
            const isCsv = file.originalname.toLowerCase().endsWith('.csv');
            try {
                const { buffer, extension } = await processorFunc(file.buffer, { ...args, isCsv, filename: file.originalname });
                const baseName = path.parse(file.originalname).name;
                const finalExt = extension || (isCsv ? '.csv' : '.xlsx');
                zip.addFile(`${baseName}${extSuffix}${finalExt}`, buffer);
            } catch (err) {
                console.error(`Error processing ${file.originalname}:`, err.message);
            }
        }

        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="data_refinery_batch_${Date.now()}.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        return res.send(zipBuffer);

    } catch (error) {
        console.error(`Batch handler error:`, error);
        res.status(500).json({ error: error.message });
    }
}

function getMediaType(ext) {
    switch (ext) {
        case '.csv': return 'text/csv';
        case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case '.json': return 'application/json';
        case '.txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
}

module.exports = {
    readData,
    flattenFiles,
    unifiedBatchHandler,
    getMediaType
};
