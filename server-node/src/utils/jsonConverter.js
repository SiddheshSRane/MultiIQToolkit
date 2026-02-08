const XLSX = require('xlsx');

async function convertToJSON(buffer, { is_csv = true, sheet_name = null, orient = 'records', indent = 4, apply_all_sheets = false } = {}) {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let jsonStr;

        if (apply_all_sheets) {
            const allData = {};
            workbook.SheetNames.forEach(name => {
                const sheet = workbook.Sheets[name];
                allData[name] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            });
            jsonStr = JSON.stringify(allData, null, indent);
        } else {
            const targetSheet = sheet_name || workbook.SheetNames[0];
            const sheet = workbook.Sheets[targetSheet];
            if (!sheet) throw new Error(`Sheet "${targetSheet}" not found.`);

            const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            jsonStr = JSON.stringify(data, null, indent);
        }

        return [Buffer.from(jsonStr, 'utf-8'), '.json'];
    } catch (error) {
        console.error('Error converting to JSON:', error);
        return [null, error.message];
    }
}

module.exports = {
    convertToJSON
};
