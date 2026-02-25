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

const Diff = require('diff');

function computeDiff(text1, text2, { ignoreWhitespace = false, ignoreCase = false } = {}) {
    const lines1 = text1.split(/\r?\n/);
    const lines2 = text2.split(/\r?\n/);

    const diff = Diff.diffLines(text1, text2, {
        ignoreCase,
        ignoreWhitespace
    });

    const diffRows = [];
    let l_idx = 0;
    let r_idx = 0;

    const splitLines = (str) => {
        const parts = str.split(/\r?\n/);
        // If string ends with newline, split adds an extra empty element
        if (str.endsWith('\n')) parts.pop();
        return parts;
    };

    for (let i = 0; i < diff.length; i++) {
        const part = diff[i];
        const partLines = splitLines(part.value);

        if (!part.added && !part.removed) {
            // Equal
            for (let k = 0; k < partLines.length; k++) {
                diffRows.push({
                    type: 'equal',
                    left: { num: l_idx + 1, text: lines1[l_idx] },
                    right: { num: r_idx + 1, text: lines2[r_idx] }
                });
                l_idx++;
                r_idx++;
            }
        } else if (part.removed) {
            // Check if next is added to handle 'replace'
            const nextPart = diff[i + 1];
            if (nextPart && nextPart.added) {
                const nextPartLines = splitLines(nextPart.value);

                const maxLen = Math.max(partLines.length, nextPartLines.length);
                for (let k = 0; k < maxLen; k++) {
                    let left = null;
                    let right = null;
                    if (k < partLines.length) {
                        left = { num: l_idx + 1, text: lines1[l_idx] };
                        l_idx++;
                    }
                    if (k < nextPartLines.length) {
                        right = { num: r_idx + 1, text: lines2[r_idx] };
                        r_idx++;
                    }

                    if (left && right) {
                        // Char-level diff for 'replace' rows
                        const charDiff = Diff.diffChars(left.text, right.text);
                        left.parts = charDiff.filter(c => !c.added).map(c => ({
                            text: c.value,
                            type: c.removed ? 'delete' : 'equal'
                        }));
                        right.parts = charDiff.filter(c => !c.removed).map(c => ({
                            text: c.value,
                            type: c.added ? 'insert' : 'equal'
                        }));
                        diffRows.push({ type: 'replace', left, right });
                    } else if (left) {
                        diffRows.push({ type: 'delete', left, right: null });
                    } else if (right) {
                        diffRows.push({ type: 'insert', left: null, right });
                    }
                }
                i++; // Skip next added part
            } else {
                for (let k = 0; k < partLines.length; k++) {
                    diffRows.push({
                        type: 'delete',
                        left: { num: l_idx + 1, text: lines1[l_idx] },
                        right: null
                    });
                    l_idx++;
                }
            }
        } else if (part.added) {
            for (let k = 0; k < partLines.length; k++) {
                diffRows.push({
                    type: 'insert',
                    left: null,
                    right: { num: r_idx + 1, text: lines2[r_idx] }
                });
                r_idx++;
            }
        }
    }

    const stats = {
        additions: diffRows.filter(r => r.type === 'insert').length,
        deletions: diffRows.filter(r => r.type === 'delete').length,
        changes: diffRows.filter(r => r.type === 'replace').length,
        identical: diffRows.filter(r => r.type === 'equal').length,
        total_rows: diffRows.length
    };

    return { diffs: diffRows, stats };
}

module.exports = {
    convertColumnAdvanced,
    columnStats,
    convertDatesText,
    computeDiff,
    parseFlexible,
    mapStrftimeToDayjs
};
