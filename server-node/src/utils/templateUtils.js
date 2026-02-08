const XLSX = require('xlsx');

function getExcelHeaders(buffer, { is_csv = false } = {}) {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: 1 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        return data[0] || [];
    } catch (error) {
        console.error('getExcelHeaders error:', error);
        return [];
    }
}

function applyTransformation(val, transform) {
    if (!transform || transform === 'none') return val;
    val = String(val);
    if (transform === 'trim') return val.trim();
    if (transform === 'uppercase') return val.toUpperCase();
    if (transform === 'lowercase') return val.toLowerCase();
    if (transform === 'titlecase') return val.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return val;
}

function mapTemplateData(templateHeaders, dataBuffer, { is_csv = false, mapping = {} } = {}) {
    try {
        const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const outputData = data.map(row => {
            const newRow = {};
            templateHeaders.forEach(tCol => {
                const mapRule = mapping[tCol] || { type: 'none' };
                const transform = mapRule.transform || 'none';

                if (mapRule.type === 'column') {
                    const sourceCol = mapRule.value;
                    const val = row[sourceCol] !== undefined ? row[sourceCol] : "";
                    newRow[tCol] = applyTransformation(val, transform);
                } else if (mapRule.type === 'static') {
                    newRow[tCol] = mapRule.value || "";
                } else {
                    newRow[tCol] = "";
                }
            });
            return newRow;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(outputData, { header: templateHeaders });
        XLSX.utils.book_append_sheet(wb, ws, "Mapped_Data");

        return [XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), "mapped_output.xlsx"];
    } catch (error) {
        console.error('mapTemplateData error:', error);
        return [null, error.message];
    }
}

function previewMappedData(templateHeaders, dataBuffer, { is_csv = false, mapping = {} } = {}) {
    try {
        const workbook = XLSX.read(dataBuffer, { type: 'buffer', sheetRows: 6 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const previewRows = data.map(row => {
            return templateHeaders.map(tCol => {
                const mapRule = mapping[tCol] || { type: 'none' };
                const transform = mapRule.transform || 'none';

                if (mapRule.type === 'column') {
                    const sourceCol = mapRule.value;
                    const val = row[sourceCol] !== undefined ? row[sourceCol] : "";
                    return applyTransformation(val, transform);
                } else if (mapRule.type === 'static') {
                    return mapRule.value || "";
                } else {
                    return "";
                }
            });
        });

        return {
            headers: templateHeaders,
            rows: previewRows
        };
    } catch (error) {
        console.error('previewMappedData error:', error);
        return { headers: [], rows: [], error: error.message };
    }
}

module.exports = {
    getExcelHeaders,
    mapTemplateData,
    previewMappedData
};
