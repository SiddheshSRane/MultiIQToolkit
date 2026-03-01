const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const path = require('path');
const axios = require('axios');
const config = require('../core/config');
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
 * Downloads a file from Supabase Storage
 */
async function downloadFromSupabase(bucket, filePath) {
    if (!config.supabaseUrl || !config.supabaseKey) {
        throw new Error("Supabase is not configured.");
    }

    const url = `${config.supabaseUrl}/storage/v1/object/authenticated/${bucket}/${filePath}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'apikey': config.supabaseKey,
                'Authorization': `Bearer ${config.supabaseKey}`
            },
            responseType: 'arraybuffer'
        });

        return Buffer.from(response.data);
    } catch (error) {
        console.error(`Supabase download error (${filePath}):`, error.response?.data || error.message);
        throw new Error(`Failed to download file from Supabase: ${error.message}`);
    }
}

/**
 * Extracts files from request, including ZIPs and Supabase paths
 */
async function flattenFiles(reqFiles, supabaseMeta = null) {
    const flattened = [];
    const MAX_FILES = 50;

    // Add remote files if provided
    if (supabaseMeta && supabaseMeta.paths && Array.isArray(supabaseMeta.paths)) {
        const bucket = supabaseMeta.bucket || 'uploads';
        for (const remotePath of supabaseMeta.paths) {
            const buffer = await downloadFromSupabase(bucket, remotePath);
            flattened.push({
                buffer: buffer,
                originalname: path.basename(remotePath)
            });
        }
    }

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
 * Unified helper to get files from either physical upload or Supabase Storage
 */
async function getFilesFromRequest(req) {
    let supabaseMeta = null;
    if (req.body.supabase_paths) {
        try {
            supabaseMeta = {
                bucket: req.body.supabase_bucket || 'uploads',
                paths: typeof req.body.supabase_paths === 'string'
                    ? JSON.parse(req.body.supabase_paths)
                    : req.body.supabase_paths
            };
        } catch (e) {
            console.error("Failed to parse supabase_paths:", e);
        }
    }

    const physicalFiles = req.file ? [req.file] : (req.files || []);
    return await flattenFiles(physicalFiles, supabaseMeta);
}

/**
 * Handles batch processing of files
 */
async function unifiedBatchHandler(req, res, processorFunc, args, actionName, extSuffix) {
    try {
        const flatFiles = await getFilesFromRequest(req);

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
    getFilesFromRequest,
    unifiedBatchHandler,
    getMediaType
};
