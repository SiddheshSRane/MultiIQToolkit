import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    Keyboard,
    Files,
    Loader2,
    Zap,
    Settings,
    FileText,
    Calendar,
    Clock,
    Copy,
    Sparkles,
    Globe
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";
import { useNotifications } from "../contexts/NotificationContext";

interface SampleData {
    headers: string[];
    rows: string[][];
}

interface ConversionStats {
    total_lines: number;
    non_empty: number;
    unique: number;
}

interface DateTimeConverterProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

const DATE_FORMATS = [
    { label: "YYYY-MM-DD", value: "%Y-%m-%d", example: "2024-01-23" },
    { label: "DD/MM/YYYY", value: "%d/%m/%Y", example: "23/01/2024" },
    { label: "MM/DD/YYYY", value: "%m/%d/%Y", example: "01/23/2024" },
    { label: "MM-DD-YYYY", value: "%m-%d-%Y", example: "01-23-2024" },
    { label: "DD-MM-YYYY", value: "%d-%m-%Y", example: "23-01-2024" },
    { label: "ISO 8601", value: "ISO 8601", example: "2024-01-23T22:18:00Z" },
    { label: "Custom Format", value: "custom", example: "Use strftime codes" },
];

export default function DateTimeConverter({ onLogAction }: DateTimeConverterProps) {
    const { notify, dismiss } = useNotifications();
    const [mode, setMode] = useState<"paste" | "file">("paste");

    // ... (state)

    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [stats, setStats] = useState<ConversionStats | null>(null);

    const [files, setFiles] = useState<File[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [sheet, setSheet] = useState<string | null>(null);
    const [, setSheets] = useState<string[] | null>(null);
    const [, setSample] = useState<SampleData | null>(null);
    const [allSheets] = useState(false);

    const [format, setFormat] = useState<string>("%Y-%m-%d");
    const [customFormat, setCustomFormat] = useState<string>("");

    const [loading, setLoading] = useState(false);

    const getTargetFormat = useCallback(() => format === "custom" ? customFormat : format, [format, customFormat]);

    // Fetch column preview
    const fetchPreview = useCallback(async (f: File, sheetName?: string | null) => {
        try {
            const fd = new FormData();
            fd.append("file", f);
            if (sheetName) fd.append("sheet_name", sheetName);

            const res = await fetchWithAuth("/api/file/preview-columns", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const data = await res.json();
            setSheets(data.sheets);
            const firstSheet = data.sheets ? data.sheets[0] : null;
            if (!sheetName && firstSheet) {
                setSheet(firstSheet);
                return;
            }

            setColumns(data.columns);
            setSample(data.sample || null);
        } catch (e) {
            console.error("Preview error:", e);
            notify('error', 'Preview Failed', e instanceof Error ? e.message : "Failed to preview file");
        }
    }, [notify]);

    useEffect(() => {
        if (files[0]) {
            fetchPreview(files[0], sheet);
        } else {
            setColumns([]);
            setSample(null);
            setSheets(null);
            setSheet(null);
        }
    }, [files, sheet, fetchPreview]);

    const handleConvertPaste = useCallback(async () => {
        if (!input.trim()) {
            notify('error', 'Input Required', "Please enter some dates to convert.");
            return;
        }
        setLoading(true);
        const toastId = notify('loading', 'Converting Dates', 'Standardizing date formats...');

        try {
            const res = await fetchWithAuth("/api/convert/datetime", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: input,
                    target_format: getTargetFormat(),
                }),
            });

            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const data = await res.json();
            setOutput(data.result);
            setStats(data.stats);
            notify('success', 'Conversion Complete', 'Dates standardized successfully.');

            if (onLogAction) {
                onLogAction("DateTime Conversion", "dates.txt", new Blob([data.result], { type: "text/plain" }));
            }
        } catch (e) {
            console.error("Conversion error:", e);
            notify('error', 'Conversion Failed', e instanceof Error ? e.message : "Conversion failed.");
        } finally {
            dismiss(toastId);
            setLoading(false);
        }
    }, [input, getTargetFormat, onLogAction, notify, dismiss]);

    const handleConvertFile = useCallback(async () => {
        if (files.length === 0 || selectedCols.length === 0) {
            notify('error', 'Selection Required', "Please select files and at least one column.");
            return;
        }

        setLoading(true);
        const toastId = notify('loading', 'Processing Files', 'Converting date columns...');

        try {
            const fd = new FormData();
            files.forEach(f => fd.append("files", f));
            fd.append("column", selectedCols.join(","));
            fd.append("target_format", getTargetFormat());
            if (sheet) fd.append("sheet_name", sheet);
            fd.append("all_sheets", String(allSheets));

            const res = await fetchWithAuth("/api/file/convert-datetime", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition");
            const defaultName = files.length > 1 ? "converted_dates_batch.zip" : files[0].name;
            const outName = extractFilename(contentDisposition, defaultName);

            downloadBlob(blob, outName);
            notify('success', 'Export Complete', `Processed ${files.length} file(s) successfully.`);
            if (onLogAction) onLogAction("File DateTime Conversion", outName, blob);
        } catch (e) {
            console.error("File conversion error:", e);
            notify('error', 'Process Failed', e instanceof Error ? e.message : "Error during processing.");
        } finally {
            dismiss(toastId);
            setLoading(false);
        }
    }, [files, selectedCols, getTargetFormat, sheet, allSheets, onLogAction, notify, dismiss]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(output);
            notify('success', 'Copied', 'Results copied to clipboard.');
        } catch (e) {
            notify('error', 'Clipboard Error', "Failed to copy to clipboard.");
        }
    }, [output, notify]);

    const clearAll = useCallback(() => {
        setInput("");
        setOutput("");
        setStats(null);
        setFiles([]);
        setColumns([]);
        setSelectedCols([]);
        notify('info', 'Workspace Cleared', 'All data cleared.');
    }, [notify]);

    useEffect(() => {
        if (mode !== "paste") return;
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                handleConvertPaste();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [mode, handleConvertPaste]);

    const selectedFormat = DATE_FORMATS.find(f => f.value === format);

    return (
        <div className="app page-enter">
            {/* Mode Selector */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'var(--input-bg)',
                padding: '8px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                width: 'fit-content',
                marginBottom: '32px'
            }}>
                <button
                    className={mode === "paste" ? "active" : ""}
                    onClick={() => setMode("paste")}
                    style={{
                        borderRadius: '12px',
                        background: mode === "paste" ? 'var(--primary)' : 'transparent',
                        color: mode === "paste" ? 'white' : 'var(--text-muted)',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        boxShadow: mode === "paste" ? 'var(--shadow-md)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Keyboard size={16} />
                    Paste Mode
                </button>
                <button
                    className={mode === "file" ? "active" : ""}
                    onClick={() => setMode("file")}
                    style={{
                        borderRadius: '12px',
                        background: mode === "file" ? 'var(--primary)' : 'transparent',
                        color: mode === "file" ? 'white' : 'var(--text-muted)',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        boxShadow: mode === "file" ? 'var(--shadow-md)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Files size={16} />
                    File Mode
                </button>
            </div>

            {mode === "paste" ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
                    {/* Input Section */}
                    <div className="section slide-in-left" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'var(--gradient-info)',
                            borderRadius: '24px 24px 0 0'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} style={{ color: 'var(--primary)' }} />
                                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>INPUT DATES</h4>
                            </div>
                            <button className="secondary" onClick={clearAll} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                                Clear
                            </button>
                        </div>

                        <textarea
                            placeholder="Paste dates here (one per line)&#10;Examples:&#10;2023-05-15&#10;15/06/2023&#10;06-20-2023"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            style={{
                                flex: 1,
                                minHeight: '300px',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '13px',
                                lineHeight: '1.8',
                                resize: 'vertical'
                            }}
                        />

                        <p style={{ fontSize: '11px', textAlign: 'right', marginTop: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            ⌨️ Press <strong>Ctrl + Enter</strong> to convert
                        </p>
                    </div>

                    {/* Output Section */}
                    {output && (
                        <div className="section slide-in-right" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: 'var(--gradient-success)',
                                borderRadius: '24px 24px 0 0'
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={18} style={{ color: 'var(--primary)' }} />
                                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>CONVERTED DATES</h4>
                                </div>
                                <button className="secondary" onClick={handleCopy} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                                    <Copy size={12} />
                                    Copy
                                </button>
                            </div>

                            <textarea
                                readOnly
                                value={output}
                                style={{
                                    flex: 1,
                                    minHeight: '300px',
                                    background: 'var(--input-bg)',
                                    border: '2px solid var(--primary)',
                                    color: 'var(--primary)',
                                    fontWeight: 600,
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '13px',
                                    lineHeight: '1.8',
                                    resize: 'vertical'
                                }}
                            />

                            {stats && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '16px',
                                    background: 'var(--primary-glow)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '12px',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '16px',
                                    fontSize: '12px',
                                    fontWeight: 700
                                }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>TOTAL LINES</div>
                                        <div style={{ color: 'var(--primary)', fontSize: '18px' }}>{stats.total_lines}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>VALID DATES</div>
                                        <div style={{ color: 'var(--primary)', fontSize: '18px' }}>{stats.non_empty}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* File Upload Section */}
                    <div className="section slide-in-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'var(--gradient-info)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <Files size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>SELECT FILES</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Upload CSV or Excel files</p>
                            </div>
                        </div>
                        <FileUpload files={files} onFilesSelected={setFiles} />
                    </div>

                    {/* Column Selection */}
                    {columns.length > 0 && (
                        <div className="section slide-in-right" style={{ animationDelay: '0.1s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'var(--gradient-warm)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>SELECT DATE COLUMNS</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Choose columns to convert</p>
                                </div>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '12px'
                            }}>
                                {columns.map(col => (
                                    <label key={col} className="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedCols.includes(col)}
                                            onChange={() => setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                                        />
                                        {col}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Format Configuration */}
            <div className="section scale-in" style={{ marginTop: '24px', animationDelay: '0.2s', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'var(--gradient-primary)',
                    borderRadius: '24px 24px 0 0'
                }} />

                <div style={{ paddingTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Settings size={20} style={{ color: 'var(--primary)' }} />
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>DATE FORMAT CONFIGURATION</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Choose your target date format</p>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '16px'
                    }}>
                        {DATE_FORMATS.map(f => (
                            <div
                                key={f.value}
                                onClick={() => setFormat(f.value)}
                                style={{
                                    padding: '16px',
                                    background: format === f.value ? 'var(--primary-glow)' : 'var(--input-bg)',
                                    border: format === f.value ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: format === f.value ? 'var(--primary)' : 'var(--text-main)' }}>
                                    {f.label}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {f.example}
                                </div>
                            </div>
                        ))}
                    </div>

                    {format === "custom" && (
                        <div className="input-group" style={{ marginTop: '20px' }}>
                            <label>Custom Python strftime Format</label>
                            <input
                                value={customFormat}
                                onChange={(e) => setCustomFormat(e.target.value)}
                                placeholder="%Y-%m-%d %H:%M:%S"
                                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                Use Python strftime codes: %Y (year), %m (month), %d (day), %H (hour), %M (minute), %S (second)
                            </p>
                        </div>
                    )}

                    {selectedFormat && selectedFormat.value !== "custom" && (
                        <div style={{
                            marginTop: '20px',
                            padding: '12px 16px',
                            background: 'var(--input-bg)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '13px',
                            color: 'var(--text-muted)'
                        }}>
                            <Globe size={16} />
                            <span>Selected format: <strong style={{ color: 'var(--primary)' }}>{selectedFormat.label}</strong> → Example: <code style={{ background: 'var(--card-bg)', padding: '2px 8px', borderRadius: '4px' }}>{selectedFormat.example}</code></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Convert Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
                <button
                    onClick={mode === "paste" ? handleConvertPaste : handleConvertFile}
                    disabled={loading}
                    style={{
                        padding: '18px 60px',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '16px',
                        background: loading ? 'var(--text-muted)' : 'var(--gradient-primary)',
                        border: 'none',
                        color: 'white',
                        boxShadow: loading ? 'none' : 'var(--shadow-xl)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Converting...
                        </>
                    ) : (
                        <>
                            <Zap size={20} />
                            {mode === "paste" ? "Convert Dates" : "Process Files"}
                        </>
                    )}
                </button>
            </div>

            {/* Pro Tip */}
            <div className="tool-help-section scale-in" style={{ animationDelay: '0.3s' }}>
                <div className="tool-help-icon">
                    <Sparkles size={24} />
                </div>
                <div className="tool-help-content">
                    <h5>Pro Tip: Batch Processing</h5>
                    <p>
                        In <strong>File Mode</strong>, you can select multiple date columns at once to convert them all in a single operation.
                        The tool automatically detects various date formats and standardizes them to your chosen format.
                    </p>
                </div>
            </div>
        </div>
    );
}
