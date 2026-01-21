import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    Calendar,
    Keyboard,
    Files,
    Download,
    BarChart2,
    File as FileIcon,
    Settings,
    Rocket,
    Loader2,
    Zap,
    Clipboard,
    Search,
    CheckCircle,
    Sparkles,
    AlertCircle
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";

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
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const getTargetFormat = useCallback(() => format === "custom" ? customFormat : format, [format, customFormat]);

    const showError = useCallback((message: string) => {
        setErrorMsg(message);
        setStatusMsg(null);
        setTimeout(() => setErrorMsg(null), 7000);
    }, []);

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
            setSheet(firstSheet);
            setColumns(data.columns);
            setSample(data.sample || null);
        } catch (e) {
            console.error("Preview error:", e);
            showError(e instanceof Error ? e.message : "Failed to preview file");
        }
    }, [showError]);

    const handleFileChange = useCallback(async (selectedFiles: File[]) => {
        setFiles(selectedFiles);
        setSelectedCols([]);
        setErrorMsg(null);
        if (selectedFiles[0]) {
            await fetchPreview(selectedFiles[0]);
        }
    }, [fetchPreview]);

    const toggleColumn = useCallback((col: string) => {
        setSelectedCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    }, []);

    // Paste Mode Logic
    const handleConvertPaste = useCallback(async () => {
        if (!input.trim()) {
            showError("Please enter some dates to convert");
            return;
        }
        setLoading(true);
        setErrorMsg(null);
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

            if (onLogAction) {
                onLogAction("DateTime Conversion", "dates.txt", new Blob([data.result], { type: "text/plain" }));
            }
        } catch (e) {
            console.error("Conversion error:", e);
            showError(e instanceof Error ? e.message : "Conversion failed");
        } finally {
            setLoading(false);
        }
    }, [input, getTargetFormat, onLogAction, showError]);

    const handleDownloadPasteXlsx = useCallback(async () => {
        try {
            const res = await fetchWithAuth("/api/convert/datetime/export-xlsx", {
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

            const blob = await res.blob();

            // Validate blob is not empty
            if (blob.size === 0) {
                throw new Error("Server returned empty file");
            }

            downloadBlob(blob, "dates_conversion.xlsx");

            if (onLogAction) onLogAction("Download Dates Excel", "dates_conversion.xlsx", blob);
        } catch (e) {
            console.error("Excel export error:", e);
            showError(e instanceof Error ? e.message : "Excel export failed");
        }
    }, [input, getTargetFormat, onLogAction, showError]);

    // File Mode Logic
    const handleConvertFile = useCallback(async () => {
        if (files.length === 0 || selectedCols.length === 0) {
            showError("Please select files and at least one column.");
            return;
        }

        setLoading(true);
        setStatusMsg(null);
        setErrorMsg(null);

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

            setStatusMsg(`Successfully processed ${files.length} file(s). Result: ${outName}`);
            if (onLogAction) onLogAction("File DateTime Conversion", outName, blob);
        } catch (e) {
            console.error("File conversion error:", e);
            showError(e instanceof Error ? e.message : "Error during processing");
        } finally {
            setLoading(false);
        }
    }, [files, selectedCols, getTargetFormat, sheet, allSheets, onLogAction, showError]);

    const clearAll = useCallback(() => {
        setInput("");
        setOutput("");
        setStats(null);
        setFiles([]);
        setColumns([]);
        setSelectedCols([]);
        setStatusMsg(null);
        setErrorMsg(null);
    }, []);

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
        <div className="app glass-card">
            <h2 className="flex-responsive" style={{ gap: "12px", alignItems: "center" }}>
                <Calendar className="text-primary" />
                DateTime Converter
            </h2>
            <div className="mode-group" style={{ marginBottom: 24 }}>
                <button className={mode === "paste" ? "active" : ""} onClick={() => setMode("paste")}><Keyboard size={16} /> Paste Mode</button>
                <button className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}><Files size={16} /> File Mode</button>
            </div>

            {mode === "paste" ? (
                <>
                    <p className="desc">
                        Standardize dates/times with ease. Paste your values below.
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
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
                        <div className="stats" style={{ marginBottom: 24, padding: "12px 20px" }}>
                            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                                <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <BarChart2 size={14} /> Statistics:
                                </span>
                                <span><strong>Total:</strong> {stats.total_lines}</span>
                                <span style={{ opacity: 0.3 }}>|</span>
                                <span><strong>Non-empty:</strong> {stats.non_empty}</span>
                                <span style={{ opacity: 0.3 }}>|</span>
                                <span><strong>Unique:</strong> {stats.unique}</span>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <p className="desc">
                        Bulk convert dates in multiple CSV/Excel files. Select target columns below.
                    </p>

                    <div className="section">
                        <h4>
                            <FileIcon size={18} /> Select Files
                        </h4>
                        <FileUpload
                            files={files}
                            onFilesSelected={handleFileChange}
                        />
                    </div>

                    {columns.length > 0 && (
                        <div className="section">
                            <h4>
                                <Settings size={18} /> Select Date Columns
                            </h4>
                            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <p className="desc" style={{ margin: 0 }}>Select columns to convert:</p>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelectedCols([...columns])}>All</button>
                                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelectedCols([])}>None</button>
                                </div>
                            </div>
                            <div className="checkbox-grid" style={{ maxHeight: "150px", overflowY: "auto", padding: "8px", marginBottom: 16 }}>
                                {columns.map(col => (
                                    <label key={col} className="checkbox">
                                        <input type="checkbox" checked={selectedCols.includes(col)} onChange={() => toggleColumn(col)} />
                                        {col}
                                    </label>
                                ))}
                            </div>

                            {sheets && (
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Target Sheet</label>
                                        <select disabled={allSheets} value={sheet ?? ""} onChange={(e) => {
                                            const s = e.target.value;
                                            setSheet(s);
                                            fetchPreview(files[0], s);
                                        }}>
                                            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "12px" }}>
                                        <label className="checkbox" style={{ width: "100%" }}>
                                            <input type="checkbox" checked={allSheets} onChange={e => setAllSheets(e.target.checked)} />
                                            Process All Sheets
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <div className="section">
                <h4>
                    <Settings size={18} /> Target Format
                </h4>
                <div className="form-grid">
                    <div className="input-group">
                        <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Choose Format</label>
                        <select value={format} onChange={(e) => setFormat(e.target.value)}>
                            {DATE_FORMATS.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                    {format === "custom" && (
                        <div className="input-group">
                            <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Custom strftime</label>
                            <input
                                type="text"
                                placeholder="e.g. %m/%d/%Y or %Y-%m-%d %H:%M"
                                value={customFormat}
                                onChange={(e) => setCustomFormat(e.target.value)}
                            />
                            <p className="desc" style={{ fontSize: "11px", color: "var(--primary)", marginTop: 8 }}>
                                💡 Tip: Use <b>%</b> signs (e.g. <b>%m/%d/%Y</b> instead of mm/dd/yyyy).
                            </p>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px" }}>
                                <span><b>%Y</b> = Year (2024)</span>
                                <span><b>%y</b> = Year (24)</span>
                                <span><b>%m</b> = Month (09)</span>
                                <span><b>%d</b> = Day (21)</span>
                                <span><b>%H</b> = Hour (14)</span>
                                <span><b>%M</b> = Minute (30)</span>
                                <span><b>%S</b> = Second (00)</span>
                                <span><b>%p</b> = AM/PM</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="section flex-responsive">
                <h4 style={{ margin: 0 }}>
                    <Rocket size={18} /> Ready to process?
                </h4>
                <button
                    onClick={mode === "paste" ? handleConvertPaste : handleConvertFile}
                    disabled={loading || (mode === "paste" ? !input : files.length === 0)}
                    className="primary"
                >
                    {loading ? (
                        <><Loader2 className="animate-spin" size={18} /> Working...</>
                    ) : (
                        <><Zap size={18} /> {mode === "paste" ? "Standardize Dates" : `Apply to ${files.length} File(s)`}</>
                    )}
                </button>
            </div>

            {mode === "paste" && output && (
                <div className="section">
                    <h4>
                        <Sparkles size={18} /> Converted Results
                    </h4>
                    <textarea
                        rows={8}
                        readOnly
                        value={output}
                        placeholder="Results appear here..."
                        style={{ marginBottom: 20 }}
                    />

                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button className="secondary" onClick={() => navigator.clipboard.writeText(output)}>
                            <Clipboard size={18} /> Copy Result
                        </button>
                        <button className="secondary" onClick={() => {
                            const blob = new Blob([output], { type: "text/plain" });
                            downloadBlob(blob, "dates_standardized.txt");
                            if (onLogAction) onLogAction("Download Dates TXT", "dates_standardized.txt", blob);
                        }}>
                            <FileIcon size={18} /> .txt
                        </button>
                        <button className="primary" onClick={handleDownloadPasteXlsx} style={{ marginLeft: "auto" }}>
                            <Rocket size={18} /> Download .xlsx
                        </button>
                    </div>
                </div>
            )}

            {mode === "file" && sample && (
                <div className="section">
                    <h4>
                        <Search size={18} /> Data Preview (Top 5 rows of {files[0]?.name})
                    </h4>
                    <div className="table-container" style={{ marginTop: 12 }}>
                        <table style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                    {sample.headers.map((h, i) => (
                                        <th key={i} style={{ fontSize: "12px", borderBottom: "1px solid var(--glass-border)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sample.rows.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                        {row.map((cell, j) => (
                                            <td key={j} style={{ fontSize: "12px", opacity: 0.8 }}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {errorMsg && (
                <div
                    className="section"
                    style={{
                        borderLeft: "4px solid var(--danger)",
                        background: "rgba(244, 63, 94, 0.05)",
                        marginTop: 24,
                    }}
                    role="alert"
                    aria-live="polite"
                >
                    <h4 style={{ color: "var(--text-main)", textTransform: "none", marginBottom: 8 }}>
                        <AlertCircle size={18} /> Error
                    </h4>
                    <p className="desc" style={{ marginBottom: 0, color: "var(--danger)" }}>{errorMsg}</p>
                </div>
            )}

            {statusMsg && (
                <div
                    className="section"
                    style={{
                        borderLeft: "4px solid var(--primary)",
                        background: "rgba(99, 102, 241, 0.05)",
                        marginTop: 24,
                    }}
                    role="status"
                    aria-live="polite"
                >
                    <h4 style={{ color: "var(--text-main)", textTransform: "none", marginBottom: 8 }}>
                        <CheckCircle size={18} /> Success
                    </h4>
                    <p className="desc" style={{ marginBottom: 0 }}>{statusMsg}</p>
                </div>
            )}
        </div>
    );
}
