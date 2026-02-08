const XLSX = require('xlsx');
const dayjs = require('dayjs');

function safeFilename(originalname) {
    if (!originalname) return "processed_file";
    return originalname.includes('.') ? originalname.split('.').slice(0, -1).join('.') : originalname;
}

function readExcelSheets(buffer, { targetSheet = null, applyAll = false } = {}) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = {};
    const sheetNames = applyAll || !targetSheet ? workbook.SheetNames : [targetSheet];

    for (const name of sheetNames) {
        const sheet = workbook.Sheets[name];
        if (sheet) {
            sheets[name] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        }
    }
    return { sheets, workbook };
}

function writeExcel(sheets) {
    const wb = XLSX.utils.book_new();
    for (const [name, data] of Object.entries(sheets)) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function removeColumns(buffer, { columns_to_remove, sheet_name, apply_all_sheets = false, is_csv = false } = {}) {
    if (!columns_to_remove || columns_to_remove.length === 0) return [null, "No columns selected."];

    try {
        if (is_csv) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            let data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            data = data.map(row => {
                const newRow = { ...row };
                columns_to_remove.forEach(col => delete newRow[col]);
                return newRow;
            });

            const newSheet = XLSX.utils.json_to_sheet(data);
            const newWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWb, newSheet, 'Sheet1');
            return [XLSX.write(newWb, { type: 'buffer', bookType: 'csv' }), '.csv'];
        } else {
            const { sheets } = readExcelSheets(buffer, { targetSheet: sheet_name, applyAll: apply_all_sheets });
            const processedSheets = {};

            for (const [name, data] of Object.entries(sheets)) {
                processedSheets[name] = data.map(row => {
                    const newRow = { ...row };
                    columns_to_remove.forEach(col => delete newRow[col]);
                    return newRow;
                });
            }
            return [writeExcel(processedSheets), '.xlsx'];
        }
    } catch (error) {
        console.error('removeColumns error:', error);
        return [null, error.message];
    }
}

function bulkRenameColumns(buffer, { rename_map, sheet_name, apply_all_sheets = false, is_csv = false } = {}) {
    try {
        if (is_csv) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            let data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            data = data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    const newKey = rename_map[key] || key;
                    newRow[newKey] = row[key];
                });
                return newRow;
            });

            const newSheet = XLSX.utils.json_to_sheet(data);
            const newWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWb, newSheet, 'Sheet1');
            return [XLSX.write(newWb, { type: 'buffer', bookType: 'csv' }), '.csv'];
        } else {
            const { sheets } = readExcelSheets(buffer, { targetSheet: sheet_name, applyAll: apply_all_sheets });
            const processedSheets = {};

            for (const [name, data] of Object.entries(sheets)) {
                processedSheets[name] = data.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => {
                        const newKey = rename_map[key] || key;
                        newRow[newKey] = row[key];
                    });
                    return newRow;
                });
            }
            return [writeExcel(processedSheets), '.xlsx'];
        }
    } catch (error) {
        console.error('bulkRenameColumns error:', error);
        return [null, error.message];
    }
}

function replaceBlankValues(buffer, { replace_value, sheet_name, apply_all_sheets = false, target_columns = [], is_csv = false } = {}) {
    try {
        const processData = (data) => {
            return data.map(row => {
                const newRow = { ...row };
                const cols = target_columns.length > 0 ? target_columns : Object.keys(row);
                cols.forEach(col => {
                    if (newRow[col] === undefined || newRow[col] === null || String(newRow[col]).trim() === "") {
                        newRow[col] = replace_value;
                    }
                });
                return newRow;
            });
        };

        if (is_csv) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            let data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            data = processData(data);
            const newSheet = XLSX.utils.json_to_sheet(data);
            const newWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWb, newSheet, 'Sheet1');
            return [XLSX.write(newWb, { type: 'buffer', bookType: 'csv' }), '.csv'];
        } else {
            const { sheets } = readExcelSheets(buffer, { targetSheet: sheet_name, applyAll: apply_all_sheets });
            const processedSheets = {};
            for (const [name, data] of Object.entries(sheets)) {
                processedSheets[name] = processData(data);
            }
            return [writeExcel(processedSheets), '.xlsx'];
        }
    } catch (error) {
        console.error('replaceBlankValues error:', error);
        return [null, error.message];
    }
}

function convertDatetimeColumn(buffer, { column_names, target_format, sheet_name, apply_all_sheets = false, is_csv = false } = {}) {
    try {
        const processData = (data) => {
            return data.map(row => {
                const newRow = { ...row };
                column_names.forEach(col => {
                    if (newRow[col]) {
                        const val = String(newRow[col]).trim();
                        let d;
                        if (/^\d+$/.test(val)) {
                            const num = parseInt(val, 10);
                            if (num >= 4000 && num <= 60000) d = dayjs('1899-12-30').add(num, 'day');
                            else if (num >= 1000000000 && num <= 2147483647) d = dayjs.unix(num);
                            else if (num >= 1000000000000 && num <= 2147483647000) d = dayjs(num);
                        }
                        if (!d || !d.isValid()) d = dayjs(val);

                        if (d && d.isValid()) {
                            let fmt = target_format;
                            if (fmt === "ISO 8601") fmt = "YYYY-MM-DDTHH:mm:ss";
                            const mappedFmt = fmt.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD').replace('%H', 'HH').replace('%M', 'mm').replace('%S', 'ss');
                            newRow[col] = d.format(mappedFmt);
                        }
                    }
                });
                return newRow;
            });
        };

        if (is_csv) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            let data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            data = processData(data);
            const newSheet = XLSX.utils.json_to_sheet(data);
            const newWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWb, newSheet, 'Sheet1');
            return [XLSX.write(newWb, { type: 'buffer', bookType: 'csv' }), '.csv'];
        } else {
            const { sheets } = readExcelSheets(buffer, { targetSheet: sheet_name, applyAll: apply_all_sheets });
            const processedSheets = {};
            for (const [name, data] of Object.entries(sheets)) {
                processedSheets[name] = processData(data);
            }
            return [writeExcel(processedSheets), '.xlsx'];
        }
    } catch (error) {
        console.error('convertDatetimeColumn error:', error);
        return [null, error.message];
    }
}

const AdmZip = require('adm-zip');

function splitFile(buffer, { rows_per_split, originalname, is_csv = false } = {}) {
    try {
        const rowsPerSplit = parseInt(rows_per_split, 10) || 1000;
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (data.length <= rowsPerSplit) {
            return [null, "File is smaller than or equal to the split size threshold."];
        }

        const zip = new AdmZip();
        const baseName = safeFilename(originalname);
        const extension = is_csv ? '.csv' : '.xlsx';

        for (let i = 0; i < data.length; i += rowsPerSplit) {
            const chunk = data.slice(i, i + rowsPerSplit);
            const chunkSheet = XLSX.utils.json_to_sheet(chunk);
            const chunkWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(chunkWb, chunkSheet, 'Sheet1');
            const chunkBuffer = XLSX.write(chunkWb, { type: 'buffer', bookType: is_csv ? 'csv' : 'xlsx' });

            const partNum = (i / rowsPerSplit) + 1;
            zip.addFile(`${baseName}_part_${partNum}${extension}`, chunkBuffer);
        }

        return [zip.toBuffer(), '.zip'];
    } catch (error) {
        console.error('splitFile error:', error);
        return [null, error.message];
    }
}

module.exports = {
    removeColumns,
    bulkRenameColumns,
    replaceBlankValues,
    convertDatetimeColumn,
    splitFile,
    readExcelSheets,
    writeExcel
};
