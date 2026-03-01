const dayjs = require('dayjs');
const XLSX = require('xlsx');

// Re-using readData from helpers if needed, but defining localized read here for tools
function readInternal(buffer, filename, allSheets = false) {
    const isCsv = filename.toLowerCase().endsWith('.csv');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    if (isCsv) {
        return [XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" })];
    }

    const sheetsToRead = allSheets ? workbook.SheetNames : [workbook.SheetNames[0]];
    return sheetsToRead.map(name => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "" }));
}

function convertColumnAdvanced(text, options = {}) {
    const {
        delimiter = ",",
        item_prefix = "",
        item_suffix = "",
        result_prefix = "",
        result_suffix = "",
        remove_duplicates = false,
        sort_items = false,
        reverse_items = false,
        ignore_comments = true,
        comment_prefixes = ["#", "//"],
        strip_quotes = false,
        trim_items = false,
        case_transform = "none"
    } = options;

    if (!text) return "";

    let lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let items = [];

    for (let line of lines) {
        let raw = trim_items ? line.trim() : line;

        if (!raw) continue;

        if (ignore_comments && comment_prefixes.some(p => raw.trim().startsWith(p))) {
            continue;
        }

        if (strip_quotes) {
            raw = raw.replace(/^["']|["']$/g, '');
        }

        if (case_transform === "upper") raw = raw.toUpperCase();
        else if (case_transform === "lower") raw = raw.toLowerCase();
        else if (case_transform === "title") {
            raw = raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }

        items.push(raw);
    }

    if (items.length === 0) return "";

    if (remove_duplicates) {
        items = [...new Set(items)];
    }

    if (sort_items) {
        items.sort();
    }

    if (reverse_items) {
        items.reverse();
    }

    const wrappedItems = items.map(item => `${item_prefix}${item}${item_suffix}`);
    const joined = wrappedItems.join(delimiter === "\\n" ? "\n" : (delimiter === "\\t" ? "\t" : delimiter));
    return `${result_prefix}${joined}${result_suffix}`;
}

function columnStats(text) {
    if (!text) return { total_lines: 0, non_empty: 0, unique: 0 };
    const lines = text.split(/\r?\n/);
    const nonEmpty = lines.filter(l => l.trim() !== "");
    const unique = [...new Set(nonEmpty)];
    return {
        total_lines: lines.length,
        non_empty: nonEmpty.length,
        unique: unique.length
    };
}

function convertDatesText(text, targetFormat) {
    if (!text) return ["", 0];
    const lines = text.split(/\r?\n/);
    let validCount = 0;

    const fmt = targetFormat === "ISO 8601" ? "YYYY-MM-DDTHH:mm:ss" : targetFormat;

    const results = lines.map(line => {
        const stripped = line.trim();
        if (!stripped) return "";

        let d;
        if (/^\d+$/.test(stripped)) {
            const num = parseInt(stripped);
            if (num >= 40000 && num <= 60000) {
                d = dayjs(new Date((num - 25569) * 86400 * 1000));
            } else if (num >= 1000000000 && num <= 2147483647) {
                d = dayjs.unix(num);
            } else if (num >= 1000000000000 && num <= 2147483647000) {
                d = dayjs(num);
            }
        }

        if (!d || !d.isValid()) {
            d = dayjs(stripped);
        }

        if (d.isValid()) {
            validCount++;
            return d.format(fmt);
        }
        return line;
    });

    return [results.join('\n'), validCount];
}

async function processRemoveColumns(buffer, { columns_to_remove, sheet_name, isCsv }) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetsToProcess = sheet_name ? [sheet_name] : workbook.SheetNames;

    sheetsToProcess.forEach(name => {
        const sheet = workbook.Sheets[name];
        if (!sheet) return;
        const data = XLSX.utils.sheet_to_json(sheet);
        const cleaned = data.map(row => {
            const newRow = { ...row };
            columns_to_remove.forEach(col => delete newRow[col]);
            return newRow;
        });
        const newSheet = XLSX.utils.json_to_sheet(cleaned);
        workbook.Sheets[name] = newSheet;
    });

    const outBuffer = XLSX.write(workbook, { type: 'buffer', bookType: isCsv ? 'csv' : 'xlsx' });
    return { buffer: outBuffer, extension: isCsv ? '.csv' : '.xlsx' };
}

async function processRenameColumns(buffer, { rename_map, sheet_name, isCsv }) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetsToProcess = sheet_name ? [sheet_name] : workbook.SheetNames;

    sheetsToProcess.forEach(name => {
        const sheet = workbook.Sheets[name];
        if (!sheet) return;
        const data = XLSX.utils.sheet_to_json(sheet);
        const renamed = data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                const newKey = rename_map[key] || key;
                newRow[newKey] = row[key];
            });
            return newRow;
        });
        const newSheet = XLSX.utils.json_to_sheet(renamed);
        workbook.Sheets[name] = newSheet;
    });

    const outBuffer = XLSX.write(workbook, { type: 'buffer', bookType: isCsv ? 'csv' : 'xlsx' });
    return { buffer: outBuffer, extension: isCsv ? '.csv' : '.xlsx' };
}

async function processReplaceBlanks(buffer, { replace_value, sheet_name, target_columns, isCsv }) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetsToProcess = sheet_name ? [sheet_name] : workbook.SheetNames;

    sheetsToProcess.forEach(name => {
        const sheet = workbook.Sheets[name];
        if (!sheet) return;
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const replaced = data.map(row => {
            const newRow = { ...row };
            const cols = target_columns || Object.keys(newRow);
            cols.forEach(col => {
                if (newRow[col] === "" || newRow[col] === null || newRow[col] === undefined) {
                    newRow[col] = replace_value;
                }
            });
            return newRow;
        });
        const newSheet = XLSX.utils.json_to_sheet(replaced);
        workbook.Sheets[name] = newSheet;
    });

    const outBuffer = XLSX.write(workbook, { type: 'buffer', bookType: isCsv ? 'csv' : 'xlsx' });
    return { buffer: outBuffer, extension: isCsv ? '.csv' : '.xlsx' };
}

async function processMergeFiles(files, options) {
    const {
        strategy = "intersection",
        case_insensitive = false,
        remove_duplicates = false,
        all_sheets = false,
        selected_columns = null,
        trim_whitespace = false,
        casing = "none",
        include_source_col = true,
        join_mode = "stack",
        join_key = null
    } = options;

    let allData = [];
    const fileHeaders = [];

    for (const { buffer, originalname } of files) {
        const dfList = readInternal(buffer, originalname, all_sheets);
        for (const df of dfList) {
            if (df.length === 0) continue;

            if (include_source_col && join_mode === "stack") {
                df.forEach(row => row["Source_File"] = originalname);
            }

            if (trim_whitespace || casing !== "none") {
                df.forEach(row => {
                    Object.keys(row).forEach(key => {
                        if (typeof row[key] === 'string') {
                            if (trim_whitespace) row[key] = row[key].trim();
                            if (casing === "upper") row[key] = row[key].toUpperCase();
                            else if (casing === "lower") row[key] = row[key].toLowerCase();
                        }
                    });
                });
            }

            allData.push(df);
            fileHeaders.push(Object.keys(df[0]));
        }
    }

    if (allData.length === 0) throw new Error("No valid data found.");

    let mergedData = [];
    let finalColumns = [];

    if (join_mode === "stack") {
        let masterCols = [];
        if (strategy === "intersection") {
            const sets = fileHeaders.map(h => new Set(h.filter(c => c !== "Source_File").map(c => case_insensitive ? c.toLowerCase() : c)));
            const intersection = [...sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))];

            const firstHeader = fileHeaders[0];
            masterCols = firstHeader.filter(c => {
                const match = case_insensitive ? c.toLowerCase() : c;
                return intersection.includes(match);
            });
        } else {
            const seen = new Set();
            for (const headers of fileHeaders) {
                for (const c of headers) {
                    if (c === "Source_File") continue;
                    const match = case_insensitive ? c.toLowerCase() : c;
                    if (!seen.has(match)) {
                        masterCols.push(c);
                        seen.add(match);
                    }
                }
            }
        }

        if (selected_columns) {
            const sel = new Set(selected_columns.map(c => case_insensitive ? c.toLowerCase() : c));
            masterCols = masterCols.filter(c => sel.has(case_insensitive ? c.toLowerCase() : c));
        }

        finalColumns = [...masterCols];
        if (include_source_col) finalColumns.push("Source_File");

        mergedData = allData.flatMap(df => {
            return df.map(row => {
                const newRow = {};
                finalColumns.forEach(col => {
                    if (case_insensitive) {
                        const actualKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
                        newRow[col] = actualKey ? row[actualKey] : "";
                    } else {
                        newRow[col] = row[col] || "";
                    }
                });
                return newRow;
            });
        });

        if (remove_duplicates) {
            const seenRows = new Set();
            mergedData = mergedData.filter(row => {
                const val = JSON.stringify(row);
                if (seenRows.has(val)) return false;
                seenRows.add(val);
                return true;
            });
        }
    } else {
        // Basic Horizontal Join
        if (!join_key) throw new Error("Join key required.");
        mergedData = allData[0];
        for (let i = 1; i < allData.length; i++) {
            const nextDf = allData[i];
            mergedData = mergedData.map(row => {
                const match = nextDf.find(r => String(r[join_key]) === String(row[join_key]));
                return { ...row, ...(match || {}) };
            });
        }
        finalColumns = Object.keys(mergedData[0] || {});
    }

    const newSheet = XLSX.utils.json_to_sheet(mergedData, { header: finalColumns });
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Merged_Data");

    const isAnyCsv = files.every(f => f.originalname.toLowerCase().endsWith('.csv'));
    const buffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: isAnyCsv ? 'csv' : 'xlsx' });
    return { buffer, extension: isAnyCsv ? '.csv' : '.xlsx' };
}

function previewCommonColumns(files, options) {
    const { strategy = "intersection", case_insensitive = false } = options;
    const allHeaders = [];
    const firstFileData = [];

    files.forEach((file, i) => {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: "" });
        const headers = data[0] || [];
        allHeaders.push(headers);
        if (i === 0) {
            firstFileData.push(...data.slice(0, 6)); // Header + 5 rows
        }
    });

    let common = [];
    if (strategy === "intersection") {
        const sets = allHeaders.map(h => new Set(h.map(c => case_insensitive ? String(c).toLowerCase() : String(c))));
        const intersection = [...sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))];
        common = allHeaders[0].filter(c => {
            const match = case_insensitive ? String(c).toLowerCase() : String(c);
            return intersection.includes(match);
        });
    } else {
        const seen = new Set();
        allHeaders.forEach(headers => {
            headers.forEach(c => {
                const match = case_insensitive ? String(c).toLowerCase() : String(c);
                if (!seen.has(match)) {
                    common.push(c);
                    seen.add(match);
                }
            });
        });
    }

    return { columns: common.map(String), sample: firstFileData.map(row => row.map(String)) };
}

function getExcelHeaders(buffer, isCsv) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] || [];
    return headers.map(String);
}

function applyTransform(val, transform) {
    if (!val) return "";
    const s = String(val);
    switch (transform) {
        case "trim": return s.trim();
        case "uppercase": return s.toUpperCase();
        case "lowercase": return s.toLowerCase();
        default: return s;
    }
}

async function processTemplateMap(buffer, { template_headers, mapping, isCsv }) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });

    const mappedData = data.map(row => {
        const newRow = {};
        template_headers.forEach(tCol => {
            const rule = mapping[tCol] || { type: "none" };
            const transform = rule.transform || "none";

            if (rule.type === "column") {
                newRow[tCol] = applyTransform(row[rule.value], transform);
            } else if (rule.type === "static") {
                newRow[tCol] = rule.value || "";
            } else {
                newRow[tCol] = "";
            }
        });
        return newRow;
    });

    const newSheet = XLSX.utils.json_to_sheet(mappedData, { header: template_headers });
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Mapped_Data");
    const outBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
    return { buffer: outBuffer, extension: '.xlsx' };
}

function previewTemplateMap(buffer, { template_headers, mapping, isCsv }) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }).slice(0, 5);

    const rows = data.map(row => {
        return template_headers.map(tCol => {
            const rule = mapping[tCol] || { type: "none" };
            const transform = rule.transform || "none";

            if (rule.type === "column") {
                return applyTransform(row[rule.value], transform);
            } else if (rule.type === "static") {
                return String(rule.value || "");
            } else {
                return "";
            }
        });
    });

    return { headers: template_headers, rows };
}

module.exports = {
    convertColumnAdvanced,
    columnStats,
    convertDatesText,
    processRemoveColumns,
    processRenameColumns,
    processReplaceBlanks,
    processMergeFiles,
    previewCommonColumns,
    getExcelHeaders,
    processTemplateMap,
    previewTemplateMap
};
