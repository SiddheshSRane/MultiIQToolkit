const XLSX = require('xlsx');

function previewCommonColumns(files, { strategy = 'intersection', case_insensitive = false, all_sheets = false } = {}) {
    let columnSets = [];
    let firstFileColsOrdered = [];
    let previewSample = [];

    for (let i = 0; i < files.length; i++) {
        const { buffer, originalname } = files[i];
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: 6 });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

            const cols = (data[0] || []).map(c => String(c).trim());

            if (i === 0) {
                firstFileColsOrdered = cols;
                previewSample = data.map(row => row.map(val => (val === null || val === undefined || String(val).toLowerCase() === 'nan') ? "" : String(val)));
            }

            const targetSet = new Set(case_insensitive ? cols.map(c => c.toLowerCase()) : cols);
            columnSets.push(targetSet);
        } catch (error) {
            console.error(`Error previewing ${originalname}:`, error);
        }
    }

    if (columnSets.length === 0) return [[], []];

    let common = [];
    if (strategy === 'intersection') {
        const shared = [...columnSets[0]].filter(c => columnSets.every(set => set.has(c)));
        common = firstFileColsOrdered.filter(c => shared.includes(case_insensitive ? c.toLowerCase() : c));
    } else {
        const seen = new Set();
        common = [];
        columnSets.forEach(set => {
            set.forEach(c => {
                const check = case_insensitive ? c.toLowerCase() : c;
                if (!seen.has(check)) {
                    common.push(c);
                    seen.add(check);
                }
            });
        });
    }

    return [common.map(String), previewSample];
}

async function mergeFilesAdvanced(files, {
    strategy = 'intersection',
    case_insensitive = false,
    remove_duplicates = false,
    all_sheets = false,
    selected_columns = null,
    trim_whitespace = false,
    casing = 'none',
    include_source_col = true,
    join_mode = 'stack',
    join_key = null
} = {}) {
    if (files.length === 0) return [null, null, "No files provided."];

    const allDfs = [];

    try {
        for (const { buffer, originalname } of files) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetsToRead = all_sheets ? workbook.SheetNames : [workbook.SheetNames[0]];

            for (const sheetName of sheetsToRead) {
                const sheet = workbook.Sheets[sheetName];
                let data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (data.length === 0) continue;

                // Source tracking
                if (include_source_col && join_mode === 'stack') {
                    data = data.map(row => ({ ...row, Source_File: originalname }));
                }

                // Data cleaning
                data = data.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => {
                        let val = row[key];
                        if (typeof val === 'string') {
                            if (trim_whitespace) val = val.trim();
                            if (casing === 'upper') val = val.toUpperCase();
                            else if (casing === 'lower') val = val.toLowerCase();
                            else if (casing === 'title') val = val.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                        }
                        newRow[key] = val;
                    });
                    return newRow;
                });

                allDfs.push(data);
            }
        }

        if (allDfs.length === 0) return [null, null, "No valid data found."];

        let mergedData;
        let finalCols;

        if (join_mode === 'stack') {
            const columnSets = allDfs.map(df => {
                const keys = Object.keys(df[0] || {}).filter(k => k !== 'Source_File');
                return new Set(case_insensitive ? keys.map(k => k.toLowerCase()) : keys);
            });

            let masterCols = [];
            if (strategy === 'intersection') {
                const shared = [...columnSets[0]].filter(c => columnSets.every(set => set.has(c)));
                const firstDfKeys = Object.keys(allDfs[0][0] || {}).filter(k => k !== 'Source_File');
                masterCols = firstDfKeys.filter(k => shared.includes(case_insensitive ? k.toLowerCase() : k));
            } else {
                const seen = new Set();
                allDfs.forEach(df => {
                    Object.keys(df[0] || {}).forEach(k => {
                        if (k === 'Source_File') return;
                        const check = case_insensitive ? k.toLowerCase() : k;
                        if (!seen.has(check)) {
                            masterCols.push(k);
                            seen.add(check);
                        }
                    });
                });
            }

            if (selected_columns) {
                const selLower = selected_columns.map(c => c.toLowerCase());
                masterCols = masterCols.filter(c => selLower.includes(c.toLowerCase()));
            }

            mergedData = [];
            allDfs.forEach(df => {
                df.forEach(row => {
                    const newRow = {};
                    masterCols.forEach(col => {
                        // Find match with case insensitivity
                        const actualKey = Object.keys(row).find(k => case_insensitive ? k.toLowerCase() === col.toLowerCase() : k === col);
                        newRow[col] = actualKey ? row[actualKey] : "";
                    });
                    if (include_source_col) newRow.Source_File = row.Source_File;
                    mergedData.push(newRow);
                });
            });

            if (remove_duplicates) {
                const seen = new Set();
                mergedData = mergedData.filter(row => {
                    const { Source_File, ...rest } = row;
                    const str = JSON.stringify(rest);
                    if (seen.has(str)) return false;
                    seen.add(str);
                    return true;
                });
            }
            finalCols = [...masterCols];
            if (include_source_col) finalCols.push('Source_File');

        } else {
            // Horizontal Join
            if (!join_key) return [null, null, "Join key is required for horizontal merge."];

            mergedData = allDfs[0];
            for (let i = 1; i < allDfs.length; i++) {
                const nextDf = allDfs[i];
                const key = join_key;

                if (join_mode === 'inner') {
                    mergedData = mergedData.filter(row1 => nextDf.some(row2 => String(row1[key]) === String(row2[key])));
                }
                // Simplified join logic (in production you'd use a better join algorithm)
                mergedData = mergedData.map(row1 => {
                    const match = nextDf.find(row2 => String(row1[key]) === String(row2[key]));
                    if (match) return { ...row1, ...match };
                    return row1;
                });
            }
            finalCols = Object.keys(mergedData[0] || {});
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(mergedData, { header: finalCols });
        XLSX.utils.book_append_sheet(wb, ws, "Merged_Data");

        const extension = files.some(f => !f.originalname.toLowerCase().endsWith('.csv')) ? '.xlsx' : '.csv';
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: extension === '.csv' ? 'csv' : 'xlsx' });

        return [buffer, finalCols, `merged_data_${join_mode}${extension}`];

    } catch (error) {
        console.error('mergeFilesAdvanced error:', error);
        return [null, null, `Merge Error: ${error.message}`];
    }
}

module.exports = {
    previewCommonColumns,
    mergeFilesAdvanced
};
