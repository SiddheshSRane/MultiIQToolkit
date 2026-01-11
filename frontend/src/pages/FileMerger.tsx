import { useState } from "react";

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
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultFilename, setResultFilename] = useState<string | null>(null);

    const handleFileChange = async (fileList: FileList | null) => {
        if (!fileList) return;
        const selectedFiles = Array.from(fileList);
        setFiles(selectedFiles);
        setCommonColumns([]);
        setSelectedCols([]);
        setJoinKey("");
        setSample(null);
        setStatusMsg(null);
        setResultBlob(null);
        setResultFilename(null);

        if (selectedFiles.length < 2) return;
        await fetchPreview(selectedFiles, strategy, caseInsensitive, allSheets);
    };

    const fetchPreview = async (fs: File[], strat: string, caseIn: boolean, sheets: boolean) => {
        try {
            setLoading(true);
            const fd = new FormData();
            fs.forEach((f) => fd.append("files", f));
            fd.append("strategy", strat);
            fd.append("case_insensitive", String(caseIn));
            fd.append("all_sheets", String(sheets));

            const res = await fetch("/api/file/preview-common-columns", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || "Failed to preview files");
                return;
            }

            const data = await res.json();
            setCommonColumns(data.columns);
            setSelectedCols(data.columns); // Initially all selected
            if (data.columns.length > 0) setJoinKey(data.columns[0]);
            setSample(data.sample);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            alert("Select at least 2 files.");
            return;
        }

        if (mergeMode === "join" && !joinKey) {
            alert("Please select a Join Key.");
            return;
        }

        try {
            setLoading(true);
            setStatusMsg(null);
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

            const res = await fetch("/api/file/merge-common-columns", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || "Merge failed");
                return;
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition");
            let filename = `merged_${mergeMode === "stack" ? strategy : joinType}.xlsx`;

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match && match[1]) filename = match[1];
            }

            setResultBlob(blob);
            setResultFilename(filename);
            setStatusMsg("Files merged successfully!");
            if (onLogAction) onLogAction("File Merge", filename, blob);
        } catch (e) {
            console.error(e);
            alert("Error merging files");
        } finally {
            setLoading(false);
        }
    };

    const toggleColumn = (col: string) => {
        setSelectedCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    const downloadResult = () => {
        if (!resultBlob || !resultFilename) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(resultBlob);
        link.download = resultFilename;
        link.click();
    };

    return (
        <div className="app glass-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span>🔗</span> Advanced File Merger
            </h2>
            <p className="desc">
                Combine multiple CSV or Excel files with vertical stacking or horizontal joins (VLOOKUP style).
            </p>

            {/* ================= FILE UPLOAD ================= */}
            <div className="section">
                <h4>
                    <span>📄</span> Select Files
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        multiple
                        onChange={(e) => handleFileChange(e.target.files)}
                    />
                    {files.length > 0 && (
                        <p className="desc" style={{ margin: 0 }}>
                            <b>{files.length}</b> file(s) selected for merging.
                        </p>
                    )}
                </div>
            </div>

            {files.length >= 2 && (
                <>
                    {/* ================= MERGE MODE ================= */}
                    <div className="section">
                        <h4>
                            <span>🛠️</span> Merge Mode
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
                            <span>⚙️</span> Advanced Options
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
                            <span>🔍</span> Preview & Column Selection
                        </h4>
                        {loading ? <p className="desc">Computing columns...</p> : (
                            <>
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
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
                                        <div style={{ overflowX: "auto" }}>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        {sample.headers.slice(0, 5).map(h => <th key={h} style={{ padding: "12px", textAlign: "left" }}>{h}</th>)}
                                                        {sample.headers.length > 5 && <th style={{ padding: "12px" }}>...</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sample.rows.map((row, i) => (
                                                        <tr key={i}>
                                                            {row.slice(0, 5).map((cell, j) => <td key={j} style={{ padding: "12px" }}>{cell}</td>)}
                                                            {row.length > 5 && <td style={{ padding: "12px", opacity: 0.5 }}>...</td>}
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
                    <div className="section" style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ margin: 0 }}>
                            <span>🚀</span> Ready to merge?
                        </h4>
                        <div style={{ display: "flex", gap: "12px" }}>
                            {resultBlob && (
                                <button onClick={downloadResult} className="secondary">
                                    <span>📥</span> Download Result
                                </button>
                            )}
                            <button onClick={handleMerge} disabled={loading || files.length === 0} className="primary">
                                {loading ? (
                                    <><span>⌛</span> Merging...</>
                                ) : (
                                    <><span>⚡</span> Apply Merge</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {statusMsg && (
                <div className="section" style={{ borderLeft: "4px solid var(--primary)", background: "rgba(99, 102, 241, 0.05)" }}>
                    <h4 style={{ color: "var(--text-main)", textTransform: "none", marginBottom: 8 }}>
                        <span>✅</span> Merge Successful
                    </h4>
                    <p className="desc" style={{ marginBottom: 0 }}>{statusMsg}</p>
                </div>
            )}
        </div>
    );
}
