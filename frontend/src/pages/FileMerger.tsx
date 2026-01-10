import { useState } from "react";

type SampleData = {
    headers: string[];
    rows: string[][];
};

export default function FileMerger() {
    const [files, setFiles] = useState<File[]>([]);
    const [commonColumns, setCommonColumns] = useState<string[]>([]);
    const [sample, setSample] = useState<SampleData | null>(null);

    // Options
    const [strategy, setStrategy] = useState<"intersection" | "union">("intersection");
    const [caseInsensitive, setCaseInsensitive] = useState(false);
    const [removeDuplicates, setRemoveDuplicates] = useState(false);
    const [allSheets, setAllSheets] = useState(false);

    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultFilename, setResultFilename] = useState<string | null>(null);

    const handleFileChange = async (fileList: FileList | null) => {
        if (!fileList) return;
        const selectedFiles = Array.from(fileList);
        setFiles(selectedFiles);
        setCommonColumns([]);
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

            const res = await fetch("http://localhost:8000/file/preview-common-columns", {
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

        try {
            setLoading(true);
            setStatusMsg(null);
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            fd.append("strategy", strategy);
            fd.append("case_insensitive", String(caseInsensitive));
            fd.append("remove_duplicates", String(removeDuplicates));
            fd.append("all_sheets", String(allSheets));

            const res = await fetch("http://localhost:8000/file/merge-common-columns", {
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
            let filename = `merged_${strategy}.xlsx`;

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match && match[1]) filename = match[1];
            }

            setResultBlob(blob);
            setResultFilename(filename);
            setStatusMsg("Files merged successfully!");
        } catch (e) {
            console.error(e);
            alert("Error merging files");
        } finally {
            setLoading(false);
        }
    };

    const downloadResult = () => {
        if (!resultBlob || !resultFilename) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(resultBlob);
        link.download = resultFilename;
        link.click();
    };

    return (
        <div>
            <p className="desc">
                Advanced tool to combine multiple CSV/Excel files. Choose your strategy and options below.
            </p>

            {/* ================= FILE UPLOAD ================= */}
            <div className="section">
                <h4>1. Upload Files</h4>
                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    multiple
                    onChange={(e) => handleFileChange(e.target.files)}
                />
                {files.length > 0 && (
                    <p className="desc" style={{ marginTop: 8, marginBottom: 0 }}>
                        {files.length} files selected.
                    </p>
                )}
            </div>

            {files.length >= 2 && (
                <>
                    {/* ================= OPTIONS ================= */}
                    <div className="section">
                        <h4>2. Configuration</h4>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: "block", marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>Merge Strategy</label>
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
                        </div>
                    </div>

                    {/* ================= PREVIEW ================= */}
                    <div className="section">
                        <h4>3. Preview & Columns</h4>
                        {loading ? <p className="desc">Processing...</p> : (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <p className="desc" style={{ marginBottom: 8 }}>Result will have <b>{commonColumns.length}</b> columns:</p>
                                    <div className="checkbox-grid" style={{ maxHeight: "150px", overflowY: "auto", padding: "8px", background: "var(--bg-app)", borderRadius: "8px" }}>
                                        {commonColumns.map(c => <span key={c} style={{ fontSize: "12px", opacity: 0.8 }}>{c}</span>)}
                                    </div>
                                </div>

                                {sample && sample.rows.length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        <p className="desc" style={{ marginBottom: 8 }}>Sample Data (First File):</p>
                                        <div style={{ overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                                <thead>
                                                    <tr style={{ background: "var(--bg-app)" }}>
                                                        {sample.headers.slice(0, 5).map(h => <th key={h} style={{ padding: "8px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>{h}</th>)}
                                                        {sample.headers.length > 5 && <th style={{ padding: "8px" }}>...</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sample.rows.map((row, i) => (
                                                        <tr key={i} style={{ borderTop: "1px solid var(--border-color)" }}>
                                                            {row.slice(0, 5).map((cell, j) => <td key={j} style={{ padding: "8px", borderRight: "1px solid var(--border-color)" }}>{cell}</td>)}
                                                            {row.length > 5 && <td style={{ padding: "8px" }}>...</td>}
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
                    <div className="section action">
                        <button onClick={handleMerge} disabled={loading} className={resultBlob ? "secondary" : "primary"}>
                            {loading ? "Merging..." : "Apply Merge"}
                        </button>
                        {resultBlob && (
                            <button onClick={downloadResult} className="primary" style={{ marginLeft: 12 }}>
                                Download Result
                            </button>
                        )}
                    </div>
                </>
            )}

            {statusMsg && (
                <div className="section" style={{ background: "var(--bg-app)", padding: "16px", borderRadius: "8px" }}>
                    <h4 style={{ color: "var(--primary)", marginTop: 0 }}>Success</h4>
                    <p style={{ marginBottom: 0 }}>{statusMsg}</p>
                </div>
            )}
        </div>
    );
}
