
import { useState, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import { useNotifications } from "../contexts/NotificationContext";
import {
    File as FileIcon,
    Settings,
    Loader2,
    Zap,
    Braces
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";

interface JsonConverterProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function JsonConverter({ onLogAction }: JsonConverterProps) {
    const { notify } = useNotifications();
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);

    // Options
    const [orient, setOrient] = useState("records");
    const [indent, setIndent] = useState(4);

    const handleApply = useCallback(async () => {
        if (files.length === 0) {
            notify('error', 'Selection Required', "Please upload at least one file.");
            return;
        }

        setLoading(true);
        notify('loading', 'Refining Data', 'Converting your files to structured JSON...');

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
            const defaultName = files.length > 1 ? "json_export_batch.zip" : `${files[0].name.split('.')[0]}.json`;
            const outName = extractFilename(contentDisposition, defaultName);

            downloadBlob(blob, outName);
            notify('success', 'Refinement Complete', `Successfully converted ${files.length} file(s) into JSON.`);
            if (onLogAction) onLogAction("Convert to JSON", outName, blob);

        } catch (e) {
            console.error("JSON conversion error:", e);
            notify('error', 'Conversion Failed', e instanceof Error ? e.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    }, [files, orient, indent, onLogAction, notify]);

    return (
        <div className="app">
            <div className="section">
                <h4><FileIcon size={18} /> Source Files</h4>
                <FileUpload files={files} onFilesSelected={setFiles} />
            </div>

            {files.length > 0 && (
                <div className="section">
                    <h4><Settings size={18} /> Architecture Configuration</h4>
                    <div className="form-grid">
                        <div className="input-group">
                            <label>JSON Structure (Orient)</label>
                            <select value={orient} onChange={(e) => setOrient(e.target.value)}>
                                <option value="records">List of Objects (Recommended)</option>
                                <option value="index">Keyed by Index</option>
                                <option value="columns">Keyed by Column</option>
                                <option value="values">Pure Array of Arrays</option>
                                <option value="table">Table Schema Layout</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Beautification / Indent</label>
                            <select value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
                                <option value={2}>2 Spaces (Compact)</option>
                                <option value={4}>4 Spaces (Readable)</option>
                                <option value={0}>Minified (Production)</option>
                            </select>
                        </div>
                    </div>

                    <div className="tool-help-section" style={{ marginTop: 24, padding: 24 }}>
                        <div className="tool-help-icon" style={{ width: 40, height: 40 }}><Braces size={20} /></div>
                        <div className="tool-help-content">
                            <h5>Design Insight</h5>
                            <p style={{ fontSize: 13 }}>
                                {orient === "records" && "Records mode creates a standard JSON array suitable for most web applications and databases."}
                                {orient === "index" && "Index mode is ideal if you need to reference specific rows by their original sequence IDs."}
                                {orient === "values" && "Values mode provides the smallest file size by omitting column names from every row."}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-responsive" style={{ margin: "40px 0", justifyContent: 'center' }}>
                <button
                    className="primary"
                    onClick={handleApply}
                    disabled={loading || files.length === 0}
                    style={{ padding: '16px 64px', fontSize: 16 }}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Zap />}
                    Refine to JSON
                </button>
            </div>
        </div>
    );
}
