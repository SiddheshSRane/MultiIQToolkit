const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const COMMON_DATE_FORMATS = [
    'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD',
    'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY.MM.DD', 'DD.MM.YYYY',
    'MM.DD.YYYY', 'D/M/YYYY', 'M/D/YYYY', 'YYYY/M/D',
    'YYYY-M-D', 'D-M-YYYY', 'M-D-YYYY', 'YYYY MM DD',
    'DD MM YYYY', 'MM DD YYYY', 'MMM D, YYYY', 'MMMM D, YYYY',
    'D MMM YYYY', 'D MMMM YYYY', 'YYYY-MM-DD HH:mm:ss',
    'DD/MM/YYYY HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', 'ISO8601'
];

function mapStrftimeToDayjs(fmt) {
    if (!fmt || fmt === 'ISO 8601') return 'YYYY-MM-DDTHH:mm:ss';
    return fmt
        .replace(/%Y/g, 'YYYY')
        .replace(/%y/g, 'YY')
        .replace(/%m/g, 'MM')
        .replace(/%d/g, 'DD')
        .replace(/%H/g, 'HH')
        .replace(/%M/g, 'mm')
        .replace(/%S/g, 'ss')
        .replace(/%b/g, 'MMM')
        .replace(/%B/g, 'MMMM');
}

function parseFlexible(val) {
    if (!val) return null;
    const stripped = String(val).trim();
    if (!stripped) return null;

    let d;
    // Numeric detection
    if (/^\d+$/.test(stripped)) {
        const num = parseInt(stripped, 10);
        if (num >= 40000 && num <= 60000) {
            d = dayjs('1899-12-30').add(num, 'day');
        } else if (num >= 1000000000 && num <= 2147483647) {
            d = dayjs.unix(num);
        } else if (num >= 1000000000000 && num <= 2147483647000) {
            d = dayjs(num);
        }
    }

    if (d && d.isValid()) return d;

    // Try standard parsing
    try {
        d = dayjs(stripped);
        if (d.isValid()) return d;
    } catch (e) { }

    // Try common formats
    for (const fmt of COMMON_DATE_FORMATS) {
        try {
            d = dayjs(stripped, fmt, true);
            if (d.isValid()) return d;
        } catch (e) { }
    }

    return null;
}

function convertColumnAdvanced(
    text,
    {
        delimiter = ',',
        itemPrefix = '',
        itemSuffix = '',
        resultPrefix = '',
        resultSuffix = '',
        removeDuplicates = false,
        sortItems = false,
        reverseItems = false,
        ignoreComments = true,
        commentPrefixes = ['#', '//'],
        keepEmpty = false,
        stripQuotes = false,
        trimItems = false,
        caseTransform = 'none', // 'none', 'upper', 'lower', 'title'
    } = {}
) {
    try {
        if (!text) return '';

        let realDelimiter = delimiter;
        if (realDelimiter === '\\n') realDelimiter = '\n';
        if (realDelimiter === '\\t') realDelimiter = '\t';

        let lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

        let items = [];
        for (let line of lines) {
            let raw = trimItems ? line.trim() : line;
            if (!raw && !keepEmpty) continue;

            if (ignoreComments) {
                const trimmed = raw.trim();
                if (commentPrefixes.some(prefix => trimmed.startsWith(prefix))) {
                    continue;
                }
            }

            if (stripQuotes) {
                raw = raw.replace(/^["']|["']$/g, '');
            }

            if (caseTransform === 'upper') {
                raw = raw.toUpperCase();
            } else if (caseTransform === 'lower') {
                raw = raw.toLowerCase();
            } else if (caseTransform === 'title') {
                raw = raw.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }

            items.push(raw);
        }

        if (items.length === 0) return '';
        if (removeDuplicates) items = [...new Set(items)];
        if (sortItems) items.sort();
        if (reverseItems) items.reverse();

        const wrappedItems = items.map(item => `${itemPrefix}${item}${itemSuffix}`);
        const joined = wrappedItems.join(realDelimiter);
        return `${resultPrefix}${joined}${resultSuffix}`;
    } catch (error) {
        console.error('Error in convertColumnAdvanced:', error);
        return '';
    }
}

function columnStats(text) {
    try {
        if (!text || !text.trim()) {
            return { total_lines: 0, non_empty: 0, unique: 0 };
        }
        const lines = text.split(/\r?\n/).map(x => x.trim());
        const nonEmpty = lines.filter(x => x);

        return {
            total_lines: lines.length,
            non_empty: nonEmpty.length,
            unique: new Set(nonEmpty).size
        };
    } catch (error) {
        console.error('Error in columnStats:', error);
        return {};
    }
}

function convertDatesText(text, targetFormat) {
    try {
        if (!text) return ['', 0];

        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const dayjsFmt = mapStrftimeToDayjs(targetFormat);

        let validCount = 0;
        const results = lines.map(line => {
            const stripped = line.trim();
            if (!stripped) return '';

            const d = parseFlexible(stripped);
            if (d && d.isValid()) {
                validCount++;
                return d.format(dayjsFmt);
            }
            return line;
        });

        return [results.join('\n'), validCount];
    } catch (error) {
        console.error('Error in convertDatesText:', error);
        return [text, 0];
    }
}

module.exports = {
    convertColumnAdvanced,
    columnStats,
    convertDatesText,
    parseFlexible,
    mapStrftimeToDayjs
};
