import { useState, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    Layers,
    Files,
    Wrench,
    Settings,
    Search,
    Rocket,
    Download,
    Loader2,
    Zap,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";

type SampleData = {
    headers: string[];
    rows: string[][];
};

interface FileMergerProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function FileMerger({ onLogAction }: FileMergerProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [commonColumns, setCommonColumns] = useState<string[]>([]);
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [sample, setSample] = useState<SampleData | null>(null);

    // Options
    const [strategy, setStrategy] = useState<"intersection" | "union">("intersection");
    const [caseInsensitive, setCaseInsensitive] = useState(false);
    const [removeDuplicates, setRemoveDuplicates] = useState(false);
    const [allSheets, setAllSheets] = useState(false);

    // New Options
    const [trimWhitespace, setTrimWhitespace] = useState(false);
    const [casing, setCasing] = useState<"none" | "upper" | "lower">("none");
    const [includeSource, setIncludeSource] = useState(true);

    // Join Options
    const [mergeMode, setMergeMode] = useState<"stack" | "join">("stack");
    const [joinType, setJoinType] = useState<"left" | "inner" | "right" | "outer">("left");
    const [joinKey, setJoinKey] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultFilename, setResultFilename] = useState<string | null>(null);

    const showError = useCallback((message: string) => {
        setErrorMsg(message);
        setStatusMsg(null);
        setTimeout(() => setErrorMsg(null), 7000);
    }, []);

    const showSuccess = useCallback((message: string) => {
        setStatusMsg(message);
        setErrorMsg(null);
    }, []);

    const handleFileChange = useCallback(async (selectedFiles: File[]) => {
        setFiles(selectedFiles);
        setCommonColumns([]);
        setSelectedCols([]);
        setJoinKey("");
        setSample(null);
        setStatusMsg(null);
        setErrorMsg(null);
        setResultBlob(null);
        setResultFilename(null);

        if (selectedFiles.length < 2) return;
        await fetchPreview(selectedFiles, strategy, caseInsensitive, allSheets);
    }, [strategy, caseInsensitive, allSheets]);

    const fetchPreview = useCallback(async (fs: File[], strat: string, caseIn: boolean, sheets: boolean) => {
        try {
            setLoading(true);
            const fd = new FormData();
            fs.forEach((f) => fd.append("files", f));
            fd.append("strategy", strat);
            fd.append("case_insensitive", String(caseIn));
            fd.append("all_sheets", String(sheets));

            const res = await fetchWithAuth("/api/file/preview-common-columns", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const data = await res.json();
            setCommonColumns(data.columns);
            setSelectedCols(data.columns); // Initially all selected
            if (data.columns.length > 0) setJoinKey(data.columns[0]);
            setSample(data.sample);
        } catch (e) {
            console.error("Preview error:", e);
            showError(e instanceof Error ? e.message : "Failed to preview files");
        } finally {
            setLoading(false);
        }
    }, [showError]);

    const handleMerge = useCallback(async () => {
        if (files.length < 2) {
            showError("Select at least 2 files.");
            return;
        }

        if (mergeMode === "join" && !joinKey) {
            showError("Please select a Join Key.");
            return;
        }

        if (selectedCols.length === 0) {
            showError("Please select at least one column to include in the merge.");
            return;
        }

        try {
            setLoading(true);
            setStatusMsg(null);
            setErrorMsg(null);
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            fd.append("strategy", strategy);
            fd.append("case_insensitive", String(caseInsensitive));
            fd.append("remove_duplicates", String(removeDuplicates));
            fd.append("all_sheets", String(allSheets));

            // New options
            fd.append("selected_columns", selectedCols.join(","));
            fd.append("trim_whitespace", String(trimWhitespace));
            fd.append("casing", casing);
            fd.append("include_source_col", String(includeSource));

            // Join parameters
            fd.append("join_mode", mergeMode === "stack" ? "stack" : joinType);
            if (mergeMode === "join") fd.append("join_key", joinKey);

            const res = await fetchWithAuth("/api/file/merge-common-columns", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            // Validate response has content
            const contentType = res.headers.get("content-type");
            if (!contentType) {
                throw new Error("Server response missing content type");
            }

            const blob = await res.blob();

            // Validate blob is not empty
            if (blob.size === 0) {
                throw new Error("Server returned empty file");
            }

            const contentDisposition = res.headers.get("content-disposition");
            const defaultFilename = `merged_${mergeMode === "stack" ? strategy : joinType}_${Date.now()}.xlsx`;
            const filename = extractFilename(contentDisposition, defaultFilename);

            setResultBlob(blob);
            setResultFilename(filename);
            showSuccess(`Files merged successfully! Result: ${filename}`);
            if (onLogAction) onLogAction("File Merge", filename, blob);
        } catch (e) {
            console.error("Merge error:", e);
            showError(e instanceof Error ? e.message : "Error merging files");
        } finally {
            setLoading(false);
        }
    }, [files, mergeMode, joinKey, strategy, caseInsensitive, removeDuplicates, allSheets, selectedCols, trimWhitespace, casing, includeSource, joinType, onLogAction, showError]);

    const toggleColumn = useCallback((col: string) => {
        setSelectedCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    }, []);

    const downloadResult = useCallback(() => {
        if (!resultBlob || !resultFilename) return;
        downloadBlob(resultBlob, resultFilename);
    }, [resultBlob, resultFilename]);

    return (
        <div className="app glass-card">
            <h2 className="flex-responsive" style={{ gap: "12px", alignItems: "center" }}>
                <Layers className="text-primary" />
                Advanced File Merger
            </h2>
            <p className="desc">
                Combine multiple CSV or Excel files with vertical stacking or horizontal joins (VLOOKUP style).
            </p>

            <div className="section">
                <h4>
                    <Files size={18} /> Select Files
                </h4>
                <FileUpload
                    files={files}
                    onFilesSelected={handleFileChange}
                />
            </div>

            {files.length >= 2 && (
                <>
                    {/* ================= MERGE MODE ================= */}
                    <div className="section">
                        <h4>
                            <Wrench size={18} /> Merge Mode
                        </h4>
                        <div className="mode-group" style={{ marginBottom: 20 }}>
                            <button className={mergeMode === "stack" ? "active" : ""} onClick={() => setMergeMode("stack")}>
                                🥞 Vertical Stack (Merge Rows)
                            </button>
                            <button className={mergeMode === "join" ? "active" : ""} onClick={() => setMergeMode("join")}>
                                🔗 Horizontal Join (VLOOKUP Style)
                            </button>
                        </div>

                        {mergeMode === "join" ? (
                            <div className="form-grid" style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
                                <div className="input-group">
                                    <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Join Type</label>
                                    <select value={joinType} onChange={(e) => setJoinType(e.target.value as any)}>
                                        <option value="left">Left Join (Keep all from File 1)</option>
                                        <option value="inner">Inner Join (Common IDs only)</option>
                                        <option value="right">Right Join (Keep all from File 2)</option>
                                        <option value="outer">Outer Join (Keep everything)</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Join Key (Common ID Column)</label>
                                    <select value={joinKey} onChange={(e) => setJoinKey(e.target.value)}>
                                        {commonColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label style={{ display: "block", marginBottom: 12, fontSize: "14px", fontWeight: 600 }}>Stacking Strategy</label>
                                <div className="mode-group">
                                    <button
                                        className={strategy === "intersection" ? "active" : ""}
                                        onClick={() => { setStrategy("intersection"); fetchPreview(files, "intersection", caseInsensitive, allSheets); }}
                                    >
                                        Intersection (Common Only)
                                    </button>
                                    <button
                                        className={strategy === "union" ? "active" : ""}
                                        onClick={() => { setStrategy("union"); fetchPreview(files, "union", caseInsensitive, allSheets); }}
                                    >
                                        Union (All Columns)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ================= OPTIONS ================= */}
                    <div className="section">
                        <h4>
                            <Settings size={18} /> Advanced Options
                        </h4>

                        <div className="options-grid">
                            <label className="checkbox">
                                <input type="checkbox" checked={caseInsensitive} onChange={e => { setCaseInsensitive(e.target.checked); fetchPreview(files, strategy, e.target.checked, allSheets); }} />
                                Case-Insensitive Match
                            </label>
                            <label className="checkbox">
                                <input type="checkbox" checked={removeDuplicates} onChange={e => setRemoveDuplicates(e.target.checked)} />
                                Remove Duplicate Rows
                            </label>
                            <label className="checkbox">
                                <input type="checkbox" checked={allSheets} onChange={e => { setAllSheets(e.target.checked); fetchPreview(files, strategy, caseInsensitive, e.target.checked); }} />
                                Merge All Sheets (Excel)
                            </label>
                            {mergeMode === "stack" && (
                                <label className="checkbox">
                                    <input type="checkbox" checked={includeSource} onChange={e => setIncludeSource(e.target.checked)} />
                                    Include Source File Column
                                </label>
                            )}
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <h5 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>Data Cleaning</h5>
                            <div className="options-grid">
                                <label className="checkbox">
                                    <input type="checkbox" checked={trimWhitespace} onChange={e => setTrimWhitespace(e.target.checked)} />
                                    Trim Whitespace
                                </label>
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 500 }}>Casing:</span>
                                    <select
                                        value={casing}
                                        onChange={(e) => setCasing(e.target.value as any)}
                                        style={{ width: "auto", minWidth: "120px" }}
                                    >
                                        <option value="none">Original</option>
                                        <option value="upper">UPPERCASE</option>
                                        <option value="lower">lowercase</option>
                                        <option value="title">Title Case</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ================= PREVIEW ================= */}
                    <div className="section">
                        <h4>
                            <Search size={18} /> Preview & Column Selection
                        </h4>
                        {loading ? <p className="desc">Computing columns...</p> : (
                            <>
                                <div style={{ marginBottom: 20 }}>
                                    <div className="flex-responsive" style={{ marginBottom: 12 }}>
                                        <p className="desc" style={{ marginBottom: 0 }}>Select columns to include in the output:</p>
                                        <div style={{ display: "flex", gap: "12px" }}>
                                            <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelectedCols(commonColumns)}>Select All</button>
                                            <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelectedCols([])}>Select None</button>
                                        </div>
                                    </div>
                                    <div className="checkbox-grid" style={{ maxHeight: "200px", overflowY: "auto", padding: "8px" }}>
                                        {commonColumns.map(c => (
                                            <label key={c} className="checkbox">
                                                <input type="checkbox" checked={selectedCols.includes(c)} onChange={() => toggleColumn(c)} />
                                                {c}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {sample && sample.rows.length > 0 && (
                                    <div style={{ marginTop: 24 }}>
                                        <p className="desc" style={{ marginBottom: 12 }}>Sample Data (First File Source):</p>
                                        <div className="table-container">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        {sample.headers.slice(0, 5).map(h => <th key={h}>{h}</th>)}
                                                        {sample.headers.length > 5 && <th>...</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sample.rows.map((row, i) => (
                                                        <tr key={i}>
                                                            {row.slice(0, 5).map((cell, j) => <td key={j}>{cell}</td>)}
                                                            {row.length > 5 && <td style={{ opacity: 0.5 }}>...</td>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* ================= ACTION ================= */}
                    <div className="section flex-responsive">
                        <h4 style={{ margin: 0 }}>
                            <Rocket size={18} /> Ready to merge?
                        </h4>
                        <div style={{ display: "flex", gap: "12px" }}>
                            {resultBlob && (
                                <button onClick={downloadResult} className="secondary">
                                    <Download size={18} /> Download Result
                                </button>
                            )}
                            <button onClick={handleMerge} disabled={loading || files.length === 0} className="primary">
                                {loading ? (
                                    <><Loader2 className="animate-spin" size={18} /> Merging...</>
                                ) : (
                                    <><Zap size={18} /> Apply Merge</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {errorMsg && (
                <div
                    className="section"
                    style={{
                        borderLeft: "4px solid var(--danger)",
                        background: "rgba(244, 63, 94, 0.05)",
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
                    }}
                    role="status"
                    aria-live="polite"
                >
                    <h4 style={{ color: "var(--text-main)", textTransform: "none", marginBottom: 8 }}>
                        <CheckCircle size={18} /> Merge Successful
                    </h4>
                    <p className="desc" style={{ marginBottom: 0 }}>{statusMsg}</p>
                </div>
            )}
        </div>
    );
}
