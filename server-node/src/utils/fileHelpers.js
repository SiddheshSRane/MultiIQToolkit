const AdmZip = require('adm-zip');
const path = require('path');

async function flattenFiles(files) {
    const fileData = [];
    const MAX_FILES_IN_ZIP = 50;

    for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.zip') {
            const zip = new AdmZip(file.buffer);
            const zipEntries = zip.getEntries();

            if (zipEntries.length > MAX_FILES_IN_ZIP) {
                throw new Error(`ZIP contains too many files (Limit: ${MAX_FILES_IN_ZIP})`);
            }

            for (const entry of zipEntries) {
                if (entry.isDirectory || entry.entryName.split('/').some(p => p.startsWith('.'))) {
                    continue;
                }
                const entryExt = path.extname(entry.entryName).toLowerCase();
                if (['.csv', '.xlsx', '.xls'].includes(entryExt)) {
                    fileData.push({
                        buffer: entry.getData(),
                        originalname: entry.entryName
                    });
                }
            }
        } else {
            fileData.push({
                buffer: file.buffer,
                originalname: file.originalname
            });
        }
    }
    return fileData;
}

async function unifiedBatchHandler(res, { files, processorFunc, argsDict, actionName, extSuffix, user = null }) {
    try {
        const flatFiles = await flattenFiles(files);
        const { logActivity, uploadProcessedFile } = require('../core/auth');

        if (flatFiles.length === 0) {
            const error = new Error("No valid CSV or Excel files found.");
            error.status = 400;
            throw error;
        }

        let outputBuffer;
        let finalFilename;
        let contentType;

        if (flatFiles.length === 1) {
            const { buffer, originalname } = flatFiles[0];
            const isCsv = originalname.toLowerCase().endsWith(".csv");

            const [output, resExt] = await processorFunc(buffer, { ...argsDict, is_csv: isCsv });

            if (!output) {
                const error = new Error(resExt || "Processing failed.");
                error.status = 400;
                throw error;
            }

            const finalExt = resExt.startsWith('.') ? resExt : (isCsv ? ".csv" : ".xlsx");
            const baseName = path.parse(originalname).name;
            finalFilename = `${baseName}${extSuffix}${finalExt}`;
            outputBuffer = output;

            contentType = 'application/octet-stream';
            if (finalExt === '.json') contentType = 'application/json';
            else if (finalExt === '.txt') contentType = 'text/plain';
            else if (finalExt === '.csv') contentType = 'text/csv';
            else if (finalExt === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
            // Batch processing
            const zip = new AdmZip();
            for (const { buffer, originalname } of flatFiles) {
                const isCsv = originalname.toLowerCase().endsWith(".csv");
                const [output, resExt] = await processorFunc(buffer, { ...argsDict, is_csv: isCsv });

                if (output) {
                    const finalExt = resExt.startsWith('.') ? resExt : (isCsv ? ".csv" : ".xlsx");
                    const baseName = resExt.startsWith('.') ? (resExt.endsWith(finalExt) ? path.parse(resExt).name : resExt) : path.parse(originalname).name;
                    zip.addFile(`${baseName}${extSuffix}${finalExt}`, output);
                }
            }
            outputBuffer = zip.toBuffer();
            finalFilename = `data_refinery_batch_${Date.now()}.zip`;
            contentType = 'application/zip';
        }

        // Background tasks: Upload and Log
        if (user) {
            (async () => {
                try {
                    const fileUrl = await uploadProcessedFile(user.id, finalFilename, outputBuffer);
                    await logActivity(user.id, actionName, finalFilename, fileUrl);
                } catch (e) {
                    console.error('Unified handler background task error:', e);
                }
            })();
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
        return res.send(outputBuffer);

    } catch (error) {
        throw error; // Re-throw to be caught by the router catch block
    }
}

module.exports = {
    unifiedBatchHandler,
    flattenFiles
};
