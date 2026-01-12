import { useState } from "react";
import FileUpload from "../components/FileUpload";
import {
    Braces,
    File,
    Settings,
    Rocket,
    Loader2,
    Zap,
    CheckCircle
} from "lucide-react";

interface JsonConverterProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function JsonConverter({ onLogAction }: JsonConverterProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // Options
    const [orient, setOrient] = useState("records");
    const [indent, setIndent] = useState(4);

    const handleApply = async () => {
        if (files.length === 0) {
            alert("Please upload at least one file.");
            return;
        }

        setLoading(true);
        setStatusMsg(null);

        try {
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            fd.append("orient", orient);
            fd.append("indent", String(indent));

            const res = await fetch("/api/file/convert-to-json", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Conversion failed");
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition");
            let outName = files.length > 1 ? "json_export_batch.zip" : `${files[0].name.split('.')[0]}.txt`;

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match && match[1]) outName = match[1];
            }

            // Download
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = outName;
            link.click();

            setStatusMsg(`Successfully converted ${files.length} file(s) to JSON (.txt).`);
            if (onLogAction) onLogAction("Convert to JSON", outName, blob);

        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app glass-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Braces className="text-primary" />
                JSON Converter
            </h2>
            <p className="desc">
                Convert your Excel or CSV files into structured JSON format. Supports batch conversion and multiple JSON orientations.
            </p>

            <div className="section">
                <h4><File size={18} /> Select Files</h4>
                <FileUpload
                    files={files}
                    onFilesSelected={setFiles}
                />
            </div>

            {files.length > 0 && (
                <div className="section">
                    <h4><Settings size={18} /> Configuration</h4>
                    <div className="form-grid">
                        <div className="input-group">
                            <label>JSON Structure (Orient)</label>
                            <select value={orient} onChange={(e) => setOrient(e.target.value)}>
                                <option value="records">List of Objects (Recommended)</option>
                                <option value="index">Keyed by Index</option>
                                <option value="columns">Keyed by Column</option>
                                <option value="values">Pure Array of Arrays</option>
                                <option value="table">Table Schema format</option>
                            </select>
                            <p className="desc" style={{ fontSize: "11px", marginTop: 4 }}>
                                {orient === "records" && "Example: [{ 'col': 'val' }, ... ]"}
                                {orient === "index" && "Example: { '0': { 'col': 'val' }, ... }"}
                                {orient === "values" && "Example: [[ 'val1', 'val2' ], ... ]"}
                            </p>
                        </div>

                        <div className="input-group">
                            <label>Indentation Spaces</label>
                            <select value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
                                <option value={2}>2 Spaces</option>
                                <option value={4}>4 Spaces (Default)</option>
                                <option value={0}>Minified (No Spaces)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="section flex-responsive">
                <h4 style={{ margin: 0 }}><Rocket size={18} /> Ready?</h4>
                <button className="primary" onClick={handleApply} disabled={loading || files.length === 0}>
                    {loading ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <><Zap size={18} /> Convert ${files.length} File(s)</>}
                </button>
            </div>

            {statusMsg && (
                <div className="section" style={{ borderLeft: "4px solid var(--primary)", background: "rgba(99, 102, 241, 0.05)" }}>
                    <p className="desc" style={{ marginBottom: 0, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <CheckCircle size={18} /> {statusMsg}
                    </p>
                </div>
            )}
        </div>
    );
}
