
import { useState, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    Files,
    Settings,
    Search,
    Rocket,
    Download,
    Loader2,
    Zap
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
    const { notify } = useNotifications();
    const [files, setFiles] = useState<File[]>([]);
    const [commonColumns, setCommonColumns] = useState<string[]>([]);
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [sample, setSample] = useState<SampleData | null>(null);

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
            notify('error', 'Ready State Empty', "Please upload at least 2 files to merge.");
            return;
        }

        setLoading(true);
        notify('loading', 'Merging Datasets', 'Analyzing overlapping structures and unifying rows...');
        try {
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            selectedCols.forEach((c) => fd.append("columns", c));
            fd.append("strategy", strategy);
            fd.append("case_insensitive", String(caseInsensitive));
            fd.append("remove_duplicates", String(removeDuplicates));
            fd.append("all_sheets", String(allSheets));
            fd.append("trim_whitespace", String(trimWhitespace));
            fd.append("case_transform", casing);
            fd.append("include_source", String(includeSource));
            fd.append("merge_mode", mergeMode);

            if (mergeMode === "join") {
                fd.append("join_type", joinType);
                fd.append("join_key", joinKey);
            }

            const res = await fetchWithAuth("/api/file/merge", {
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
            notify('success', 'Merge Complete', `Consolidated ${files.length} files into ${outName}`);

            if (onLogAction) onLogAction("Merge Files", outName, blob);
        } catch (e) {
            console.error("Merge error:", e);
            notify('error', 'Merge Interrupted', e instanceof Error ? e.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    }, [files, selectedCols, strategy, caseInsensitive, removeDuplicates, allSheets, trimWhitespace, casing, includeSource, mergeMode, joinType, joinKey, onLogAction, notify]);

    const toggleColumn = useCallback((col: string) => {
        setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    }, []);

    const downloadResult = () => resultBlob && resultFilename && downloadBlob(resultBlob, resultFilename);

    return (
        <div className="app">
            <div className="section">
                <h4><Files size={18} /> Select Source Files</h4>
                <FileUpload files={files} onFilesSelected={handleFileChange} />
            </div>

            {files.length >= 2 && (
                <>
                    <div className="section">
                        <h4><Settings size={18} /> Unifier Parameters</h4>
                        <div className="form-grid">
                            <div className="input-group">
                                <label>Strategy</label>
                                <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
                                    <option value="intersection">Intersection (Common Only)</option>
                                    <option value="union">Union (All Columns)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Consolidation Logic</label>
                                <select value={mergeMode} onChange={(e) => setMergeMode(e.target.value as any)}>
                                    <option value="stack">Vertical Stack (Append Rows)</option>
                                    <option value="join">Horizontal Join (SQL Style)</option>
                                </select>
                            </div>
                            {mergeMode === "join" && (
                                <>
                                    <div className="input-group">
                                        <label>Join Key (Common Column)</label>
                                        <select value={joinKey} onChange={(e) => setJoinKey(e.target.value)}>
                                            <option value="">-- Auto Detect --</option>
                                            {commonColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Join Type</label>
                                        <select value={joinType} onChange={(e) => setJoinType(e.target.value as any)}>
                                            <option value="left">Left (Keep first file's keys)</option>
                                            <option value="inner">Inner (Keys in all files)</option>
                                            <option value="outer">Outer (Keys in any file)</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="checkbox-grid" style={{ marginTop: 24 }}>
                            <label className="checkbox"><input type="checkbox" checked={includeSource} onChange={e => setIncludeSource(e.target.checked)} /> Mark Sources</label>
                            <label className="checkbox"><input type="checkbox" checked={removeDuplicates} onChange={e => setRemoveDuplicates(e.target.checked)} /> Deduplicate</label>
                            <label className="checkbox"><input type="checkbox" checked={trimWhitespace} onChange={e => setTrimWhitespace(e.target.checked)} /> Trim Spaces</label>
                            <label className="checkbox"><input type="checkbox" checked={allSheets} onChange={e => setAllSheets(e.target.checked)} /> Scan all sheets</label>
                        </div>
                    </div>

                    <div className="section">
                        <h4><Search size={18} /> Schema Discovery</h4>
                        {loading && commonColumns.length === 0 ? <p className="desc">Analying files...</p> : (
                            <>
                                <div className="flex-responsive" style={{ marginBottom: 12 }}>
                                    <p className="desc" style={{ margin: 0 }}>Select columns to project into the final refined dataset:</p>
                                    <div className="inline" style={{ gridTemplateColumns: 'auto auto' }}>
                                        <button className="secondary" onClick={() => setSelectedCols(commonColumns)}>All</button>
                                        <button className="secondary" onClick={() => setSelectedCols([])}>None</button>
                                    </div>
                                </div>
                                <div className="checkbox-grid" style={{ maxHeight: "250px", overflowY: "auto" }}>
                                    {commonColumns.map(c => (
                                        <label key={c} className="checkbox">
                                            <input type="checkbox" checked={selectedCols.includes(c)} onChange={() => toggleColumn(c)} />
                                            {c}
                                        </label>
                                    ))}
                                </div>

                                {sample && (
                                    <div className="table-container" style={{ marginTop: 24 }}>
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
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            <div className="section flex-responsive">
                <h4 style={{ margin: 0 }}><Rocket size={18} /> Ready?</h4>
                <div className="inline" style={{ gridTemplateColumns: 'auto auto' }}>
                    {resultBlob && (
                        <button onClick={downloadResult} className="secondary"><Download size={18} /> Download Unified</button>
                    )}
                    <button onClick={handleMerge} disabled={loading || files.length < 2} className="primary">
                        {loading ? <Loader2 className="animate-spin" /> : <Zap />} Unify Datasets
                    </button>
                </div>
            </div>
        </div>
    );
}
