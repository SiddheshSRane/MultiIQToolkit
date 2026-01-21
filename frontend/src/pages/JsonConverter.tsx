import { useState, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    Braces,
    File as FileIcon,
    Settings,
    Rocket,
    Loader2,
    Zap,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";

interface JsonConverterProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function JsonConverter({ onLogAction }: JsonConverterProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Options
    const [orient, setOrient] = useState("records");
    const [indent, setIndent] = useState(4);

    const showError = useCallback((message: string) => {
        setErrorMsg(message);
        setStatusMsg(null);
        setTimeout(() => setErrorMsg(null), 7000);
    }, []);

    const showSuccess = useCallback((message: string) => {
        setStatusMsg(message);
        setErrorMsg(null);
    }, []);

    const handleApply = useCallback(async () => {
        if (files.length === 0) {
            showError("Please upload at least one file.");
            return;
        }

        setLoading(true);
        setStatusMsg(null);
        setErrorMsg(null);

        try {
            const formData = new FormData();
            files.forEach((f) => formData.append("files", f));
            formData.append("orient", orient);
            formData.append("indent", String(indent));

            const res = await fetchWithAuth("/api/file/convert-to-json", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition");
            const defaultName = files.length > 1 ? "json_export_batch.zip" : `${files[0].name.split('.')[0]}.txt`;
            const outName = extractFilename(contentDisposition, defaultName);

            downloadBlob(blob, outName);

            showSuccess(`Successfully converted ${files.length} file(s) to JSON (.txt).`);
            if (onLogAction) onLogAction("Convert to JSON", outName, blob);

        } catch (e) {
            console.error("JSON conversion error:", e);
            showError(e instanceof Error ? e.message : "An error occurred during conversion.");
        } finally {
            setLoading(false);
        }
    }, [files, orient, indent, onLogAction, showError]);

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
                <h4><FileIcon size={18} /> Select Files</h4>
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
                <button
                    className="primary"
                    onClick={handleApply}
                    disabled={loading || files.length === 0}
                    aria-label={`Convert ${files.length} file${files.length > 1 ? "s" : ""} to JSON`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} /> Processing...
                        </>
                    ) : (
                        <>
                            <Zap size={18} /> Convert {files.length} File{files.length > 1 ? "s" : ""}
                        </>
                    )}
                </button>
            </div>

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
                    <p className="desc" style={{ marginBottom: 0, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <CheckCircle size={18} /> {statusMsg}
                    </p>
                </div>
            )}
        </div>
    );
}
