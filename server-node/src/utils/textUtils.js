const dayjs = require('dayjs');

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

        // Unescape delimiter
        let realDelimiter = delimiter;
        if (realDelimiter === '\\n') realDelimiter = '\n';
        if (realDelimiter === '\\t') realDelimiter = '\t';

        // Normalize newlines
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

        // Remove duplicates
        if (removeDuplicates) {
            items = [...new Set(items)];
        }

        // Sort items
        if (sortItems) {
            items.sort();
        }

        // Reverse items
        if (reverseItems) {
            items.reverse();
        }

        // Apply wrapping
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
            return {
                total_lines: 0,
                non_empty: 0,
                unique: 0
            };
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
        let fmt = targetFormat;
        if (fmt === 'ISO 8601') {
            fmt = 'YYYY-MM-DDTHH:mm:ss';
        }

        let validCount = 0;
        const results = lines.map(line => {
            const stripped = line.trim();
            if (!stripped) return '';

            try {
                let d;
                // Numeric detection
                if (/^\d+$/.test(stripped)) {
                    const num = parseInt(stripped, 10);
                    // Excel serial dates (40k-60k)
                    if (num >= 40000 && num <= 60000) {
                        // Excel dates start from Dec 30, 1899
                        d = dayjs('1899-12-30').add(num, 'day');
                    } else if (num >= 1000000000 && num <= 2147483647) {
                        d = dayjs.unix(num);
                    } else if (num >= 1000000000000 && num <= 2147483647000) {
                        d = dayjs(num);
                    }
                }

                if (!d || !d.isValid()) {
                    // dayjs parsing is less flexible than pandas mixed format by default
                    // but we can try
                    d = dayjs(stripped);
                }

                if (!d.isValid()) {
                    return line;
                } else {
                    validCount++;
                    // Convert target format to dayjs format if needed
                    // Python %Y-%m-%d -> YYYY-MM-DD
                    const mappedFmt = fmt.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD').replace('%H', 'HH').replace('%M', 'mm').replace('%S', 'ss');
                    return d.format(mappedFmt);
                }
            } catch (e) {
                return line;
            }
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
    convertDatesText
};
