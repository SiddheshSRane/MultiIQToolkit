
import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    Keyboard,
    Files,
    Download,
    Loader2,
    Zap,
    Clipboard,
    Settings,
    FileText
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
    { label: "YYYY-MM-DD", value: "%Y-%m-%d" },
    { label: "DD/MM/YYYY", value: "%d/%m/%Y" },
    { label: "MM/DD/YYYY", value: "%m/%d/%Y" },
    { label: "MM-DD-YYYY", value: "%m-%d-%Y" },
    { label: "DD-MM-YYYY", value: "%d-%m-%Y" },
    { label: "ISO 8601", value: "ISO 8601" },
    { label: "Custom Format (strftime)", value: "custom" },
];

export default function DateTimeConverter({ onLogAction }: DateTimeConverterProps) {
    const { notify } = useNotifications();
    const [mode, setMode] = useState<"paste" | "file">("paste");

    // Paste Mode State
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [stats, setStats] = useState<ConversionStats | null>(null);

    // File Mode State
    const [files, setFiles] = useState<File[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [sheet, setSheet] = useState<string | null>(null);
    const [sheets, setSheets] = useState<string[] | null>(null);
    const [sample, setSample] = useState<SampleData | null>(null);
    const [allSheets, setAllSheets] = useState(false);

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
            notify('error', 'Ready State Empty', "Please enter some dates to convert.");
            return;
        }
        setLoading(true);
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
            notify('success', 'Refinement Complete', 'Dates standardized successfully.');

            if (onLogAction) {
                onLogAction("DateTime Conversion", "dates.txt", new Blob([data.result], { type: "text/plain" }));
            }
        } catch (e) {
            console.error("Conversion error:", e);
            notify('error', 'Refinery Blocked', e instanceof Error ? e.message : "Conversion failed.");
        } finally {
            setLoading(false);
        }
    }, [input, getTargetFormat, onLogAction, notify]);

    const handleConvertFile = useCallback(async () => {
        if (files.length === 0 || selectedCols.length === 0) {
            notify('error', 'Selection Required', "Please select files and at least one column.");
            return;
        }

        setLoading(true);
        notify('loading', 'Standardizing File(s)', 'Processing calendar data structures...');
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
            const defaultName = files.length > 1 ? "standardized_dates_batch.zip" : files[0].name;
            const outName = extractFilename(contentDisposition, defaultName);

            downloadBlob(blob, outName);
            notify('success', 'Export Complete', `Processed ${files.length} file(s) into ${outName}`);
            if (onLogAction) onLogAction("File DateTime Conversion", outName, blob);
        } catch (e) {
            console.error("File conversion error:", e);
            notify('error', 'Process Interrupted', e instanceof Error ? e.message : "Error during processing.");
        } finally {
            setLoading(false);
        }
    }, [files, selectedCols, getTargetFormat, sheet, allSheets, onLogAction, notify]);

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
        notify('info', 'Workspace Reset', 'All date values and files cleared.');
    }, [notify]);

    /* Keyboard shortcut */
    useEffect(() => {
        if (mode !== "paste") return;
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter") {
                handleConvertPaste();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [mode, handleConvertPaste]);

    return (
        <div className="app">
            <div className="mode-group" style={{ marginBottom: 32 }}>
                <button className={mode === "paste" ? "active" : ""} onClick={() => setMode("paste")}><Keyboard size={16} /> Paste Mode</button>
                <button className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}><Files size={16} /> File Mode</button>
            </div>

            {mode === "paste" ? (
                <>
                    <div className="flex-responsive" style={{ marginBottom: 12 }}>
                        <h4 style={{ margin: 0 }}>
                            <Download size={18} /> Input Dates
                        </h4>
                        <button className="secondary" onClick={clearAll} style={{ padding: "6px 12px", fontSize: "12px" }}>Clear All</button>
                    </div>

                    <textarea
                        rows={8}
                        placeholder="Paste one date per line (Ctrl + Enter to convert)&#10;e.g. 2023-05-15, 15/06/2023, invalid-date"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <p className="desc" style={{ fontSize: "11px", textAlign: "right", marginTop: "8px", opacity: 0.7 }}>
                        ⌨️ Press <b>Ctrl + Enter</b> to convert instantly
                    </p>

                    {stats && (
                        <div className="stats" style={{ margin: '24px 0', padding: "12px 20px" }}>
                            <strong>Lines:</strong> {stats.total_lines} <span style={{ opacity: 0.3, margin: "0 8px" }}>|</span>{" "}
                            <strong>Valid:</strong> {stats.non_empty}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="section">
                        <h4><Files size={18} /> Select Files</h4>
                        <FileUpload files={files} onFilesSelected={setFiles} />
                    </div>

                    {columns.length > 0 && (
                        <div className="section">
                            <h4><FileText size={18} /> Choose Columns to Standardize</h4>
                            <div className="checkbox-grid">
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

            <div className="section">
                <h4><Settings size={18} /> Configuration</h4>
                <div className="form-grid">
                    <div className="input-group">
                        <label>Target Format</label>
                        <select value={format} onChange={(e) => setFormat(e.target.value)}>
                            {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    </div>
                    {format === "custom" && (
                        <div className="input-group">
                            <label>Custom Python strftime</label>
                            <input value={customFormat} onChange={(e) => setCustomFormat(e.target.value)} placeholder="%Y-%m-%d %H:%M:%S" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-responsive" style={{ margin: "40px 0" }}>
                <button
                    className="primary"
                    onClick={mode === "paste" ? handleConvertPaste : handleConvertFile}
                    disabled={loading}
                    style={{ padding: "16px 48px", fontSize: "16px" }}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Zap />}
                    {mode === "paste" ? "Standardize Text" : "Standardize Files"}
                </button>
            </div>

            {output && mode === "paste" && (
                <div className="page-enter">
                    <div className="flex-responsive" style={{ marginBottom: 12 }}>
                        <h4 style={{ margin: 0 }}><Clipboard size={18} /> Results</h4>
                        <div className="inline" style={{ gap: 8 }}>
                            <button className="secondary" onClick={handleCopy}><Clipboard size={14} /> Copy</button>
                        </div>
                    </div>
                    <textarea rows={10} value={output} readOnly />
                </div>
            )}
        </div>
    );
}
