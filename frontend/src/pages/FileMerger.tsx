import { useState, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    Files,
    Settings,
    Search,
    Download,
    Loader2,
    Zap,
    Sparkles,
    Layers,
    GitMerge,
    Database
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";
import { useNotifications } from "../contexts/NotificationContext";

type SampleData = {
    headers: string[];
    rows: string[][];
};

interface FileMergerProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function FileMerger({ onLogAction }: FileMergerProps) {
    const { notify, dismiss } = useNotifications();
    const [files, setFiles] = useState<File[]>([]);
    const [commonColumns, setCommonColumns] = useState<string[]>([]);
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [sample, setSample] = useState<SampleData | null>(null);

    // ... (state) ...
    const [strategy, setStrategy] = useState<"intersection" | "union">("intersection");
    const [caseInsensitive] = useState(false);
    const [removeDuplicates, setRemoveDuplicates] = useState(false);
    const [allSheets, setAllSheets] = useState(false);

    const [trimWhitespace, setTrimWhitespace] = useState(false);
    const [casing] = useState<"none" | "upper" | "lower" | "title">("none");
    const [includeSource, setIncludeSource] = useState(true);

    const [mergeMode, setMergeMode] = useState<"stack" | "join">("stack");
    const [joinType, setJoinType] = useState<"left" | "inner" | "right" | "outer">("left");
    const [joinKey, setJoinKey] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultFilename, setResultFilename] = useState<string | null>(null);

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
            setSelectedCols(data.columns);
            setSample(data.sample);
        } catch (e) {
            console.error("Preview error:", e);
            notify('error', 'Preview Error', e instanceof Error ? e.message : "Failed to load columns.");
        } finally {
            setLoading(false);
        }
    }, [notify]);

    const handleFileChange = useCallback(async (selectedFiles: File[]) => {
        setFiles(selectedFiles);
        setCommonColumns([]);
        setSelectedCols([]);
        setJoinKey("");
        setSample(null);
        setResultBlob(null);
        setResultFilename(null);

        if (selectedFiles.length < 2) return;
        await fetchPreview(selectedFiles, strategy, caseInsensitive, allSheets);
    }, [strategy, caseInsensitive, allSheets, fetchPreview]);

    const handleMerge = useCallback(async () => {
        if (files.length < 2) {
            notify('error', 'Files Required', "Please upload at least 2 files to merge.");
            return;
        }

        setLoading(true);
        const toastId = notify('loading', 'Merging Files', 'Consolidating datasets...');

        try {
            const fd = new FormData();
            // ... (form data population) ...
            files.forEach((f) => fd.append("files", f));
            fd.append("selected_columns", selectedCols.join(","));
            fd.append("strategy", strategy);
            fd.append("case_insensitive", String(caseInsensitive));
            fd.append("remove_duplicates", String(removeDuplicates));
            fd.append("all_sheets", String(allSheets));
            fd.append("trim_whitespace", String(trimWhitespace));
            fd.append("casing", casing);
            fd.append("include_source_col", String(includeSource));
            fd.append("join_mode", mergeMode);

            if (mergeMode === "join" && joinKey) {
                fd.append("join_key", joinKey);
            }

            const res = await fetchWithAuth("/api/file/merge-common-columns", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition");
            const outName = extractFilename(contentDisposition, "merged_data.xlsx");

            downloadBlob(blob, outName);
            setResultBlob(blob);
            setResultFilename(outName);
            notify('success', 'Merge Complete', `Consolidated ${files.length} files successfully.`);

            if (onLogAction) onLogAction("Merge Files", outName, blob);
        } catch (e) {
            console.error("Merge error:", e);
            notify('error', 'Merge Failed', e instanceof Error ? e.message : "An error occurred.");
        } finally {
            dismiss(toastId);
            setLoading(false);
        }
    }, [files, selectedCols, strategy, caseInsensitive, removeDuplicates, allSheets, trimWhitespace, casing, includeSource, mergeMode, joinType, joinKey, onLogAction, notify, dismiss]);

    const toggleColumn = useCallback((col: string) => {
        setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    }, []);

    const downloadResult = () => resultBlob && resultFilename && downloadBlob(resultBlob, resultFilename);

    return (
        <div className="app page-enter">
            {/* File Upload */}
            <div className="section slide-in-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--gradient-primary)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <Files size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>SELECT FILES TO MERGE</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Upload 2+ CSV or Excel files</p>
                    </div>
                </div>
                <FileUpload files={files} onFilesSelected={handleFileChange} />
                {files.length > 0 && files.length < 2 && (
                    <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        ⚠️ Add at least one more file to merge
                    </p>
                )}
            </div>

            {files.length >= 2 && (
                <>
                    {/* Merge Configuration */}
                    <div className="section slide-in-left" style={{ animationDelay: '0.1s', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'var(--gradient-info)',
                            borderRadius: '24px 24px 0 0'
                        }} />

                        <div style={{ paddingTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <Settings size={20} style={{ color: 'var(--primary)' }} />
                                <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>MERGE CONFIGURATION</h4>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                <div className="input-group">
                                    <label>Column Strategy</label>
                                    <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
                                        <option value="intersection">Intersection (Common Only)</option>
                                        <option value="union">Union (All Columns)</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label>Merge Mode</label>
                                    <select value={mergeMode} onChange={(e) => setMergeMode(e.target.value as any)}>
                                        <option value="stack">Vertical Stack (Append Rows)</option>
                                        <option value="join">Horizontal Join (SQL Style)</option>
                                    </select>
                                </div>

                                {mergeMode === "join" && (
                                    <>
                                        <div className="input-group">
                                            <label>Join Key Column</label>
                                            <select value={joinKey} onChange={(e) => setJoinKey(e.target.value)}>
                                                <option value="">-- Auto Detect --</option>
                                                {commonColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Join Type</label>
                                            <select value={joinType} onChange={(e) => setJoinType(e.target.value as any)}>
                                                <option value="left">Left (Keep first file)</option>
                                                <option value="inner">Inner (Common keys)</option>
                                                <option value="outer">Outer (All keys)</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '12px'
                            }}>
                                <label className="checkbox">
                                    <input type="checkbox" checked={includeSource} onChange={e => setIncludeSource(e.target.checked)} />
                                    <Database size={16} />
                                    Mark Source Files
                                </label>
                                <label className="checkbox">
                                    <input type="checkbox" checked={removeDuplicates} onChange={e => setRemoveDuplicates(e.target.checked)} />
                                    <Layers size={16} />
                                    Remove Duplicates
                                </label>
                                <label className="checkbox">
                                    <input type="checkbox" checked={trimWhitespace} onChange={e => setTrimWhitespace(e.target.checked)} />
                                    <GitMerge size={16} />
                                    Trim Whitespace
                                </label>
                                <label className="checkbox">
                                    <input type="checkbox" checked={allSheets} onChange={e => setAllSheets(e.target.checked)} />
                                    <Files size={16} />
                                    Process All Sheets
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Column Selection */}
                    <div className="section slide-in-right" style={{ animationDelay: '0.2s', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'var(--gradient-success)',
                            borderRadius: '24px 24px 0 0'
                        }} />

                        <div style={{ paddingTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Search size={20} style={{ color: 'var(--primary)' }} />
                                    <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>COLUMN SELECTION</h4>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="secondary" onClick={() => setSelectedCols(commonColumns)} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                                        Select All
                                    </button>
                                    <button className="secondary" onClick={() => setSelectedCols([])} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {loading && commonColumns.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Analyzing files...</p>
                            ) : (
                                <>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                        Select columns to include in merged file ({selectedCols.length} of {commonColumns.length} selected)
                                    </p>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: '12px',
                                        maxHeight: '250px',
                                        overflowY: 'auto'
                                    }}>
                                        {commonColumns.map(c => (
                                            <label key={c} className="checkbox">
                                                <input type="checkbox" checked={selectedCols.includes(c)} onChange={() => toggleColumn(c)} />
                                                {c}
                                            </label>
                                        ))}
                                    </div>

                                    {sample && (
                                        <div style={{ marginTop: '24px' }}>
                                            <h4 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--text-muted)' }}>PREVIEW (First 5 rows)</h4>
                                            <div className="table-container">
                                                <table>
                                                    <thead>
                                                        <tr>{sample.headers.slice(0, 6).map(h => <th key={h}>{h}</th>)}</tr>
                                                    </thead>
                                                    <tbody>
                                                        {sample.rows.map((row, i) => (
                                                            <tr key={i}>{row.slice(0, 6).map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Merge Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0', gap: '12px' }}>
                {resultBlob && (
                    <button onClick={downloadResult} className="secondary" style={{
                        padding: '18px 40px',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '16px'
                    }}>
                        <Download size={20} />
                        Download Result
                    </button>
                )}
                <button
                    onClick={handleMerge}
                    disabled={loading || files.length < 2}
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
                            Merging...
                        </>
                    ) : (
                        <>
                            <Zap size={20} />
                            Merge Files
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
                    <h5>Pro Tip: Merge Strategies</h5>
                    <p>
                        Use <strong>Intersection</strong> to keep only columns that exist in all files (safest option).
                        Use <strong>Union</strong> to include all columns from all files (fills missing values with blanks).
                        For SQL-style joins, select a common key column to match rows across files.
                    </p>
                </div>
            </div>
        </div>
    );
}
