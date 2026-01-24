import { useState, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import { useNotifications } from "../contexts/NotificationContext";
import {
    File as FileIcon,
    Loader2,
    Zap,
    Braces,
    Sparkles,
    Code2,
    FileJson
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";

interface JsonConverterProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

const ORIENT_OPTIONS = [
    { value: "records", label: "List of Objects", desc: "Standard JSON array format", example: '[{"name":"John","age":30}]' },
    { value: "index", label: "Keyed by Index", desc: "Rows indexed by number", example: '{"0":{"name":"John"}}' },
    { value: "columns", label: "Keyed by Column", desc: "Columns as top-level keys", example: '{"name":["John"],"age":[30]}' },
    { value: "values", label: "Array of Arrays", desc: "Pure data arrays", example: '[["John",30]]' },
    { value: "table", label: "Table Schema", desc: "With schema metadata", example: '{"schema":{...},"data":[...]}' },
];

export default function JsonConverter({ onLogAction }: JsonConverterProps) {
    const { notify, dismiss } = useNotifications();
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);

    const [orient, setOrient] = useState("records");
    const [indent, setIndent] = useState(4);

    const handleApply = useCallback(async () => {
        if (files.length === 0) {
            notify('error', 'Files Required', "Please upload at least one file.");
            return;
        }

        setLoading(true);
        const toastId = notify('loading', 'Converting to JSON', 'Transforming your data...');

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
            notify('success', 'Conversion Complete', `Successfully converted ${files.length} file(s) to JSON.`);
            if (onLogAction) onLogAction("Convert to JSON", outName, blob);

        } catch (e) {
            console.error("JSON conversion error:", e);
            notify('error', 'Conversion Failed', e instanceof Error ? e.message : "An error occurred.");
        } finally {
            dismiss(toastId);
            setLoading(false);
        }
    }, [files, orient, indent, onLogAction, notify, dismiss]);

    const selectedOrient = ORIENT_OPTIONS.find(o => o.value === orient);

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
                        <FileIcon size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>SOURCE FILES</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Upload CSV or Excel files to convert</p>
                    </div>
                </div>
                <FileUpload files={files} onFilesSelected={setFiles} />
            </div>

            {files.length > 0 && (
                <>
                    {/* JSON Structure Configuration */}
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
                                <Code2 size={20} style={{ color: 'var(--primary)' }} />
                                <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>JSON STRUCTURE</h4>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '12px',
                                marginBottom: '24px'
                            }}>
                                {ORIENT_OPTIONS.map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => setOrient(opt.value)}
                                        style={{
                                            padding: '16px',
                                            background: orient === opt.value ? 'var(--primary-glow)' : 'var(--input-bg)',
                                            border: orient === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <FileJson size={16} style={{ color: orient === opt.value ? 'var(--primary)' : 'var(--text-muted)' }} />
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: orient === opt.value ? 'var(--primary)' : 'var(--text-main)' }}>
                                                {opt.label}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                            {opt.desc}
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            color: 'var(--text-muted)',
                                            background: 'var(--card-bg)',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {opt.example}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="input-group" style={{ maxWidth: '300px' }}>
                                <label>Formatting / Indentation</label>
                                <select value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
                                    <option value={2}>2 Spaces (Compact)</option>
                                    <option value={4}>4 Spaces (Readable)</option>
                                    <option value={0}>Minified (Production)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Info Panel */}
                    {selectedOrient && (
                        <div style={{
                            padding: '16px 20px',
                            background: 'var(--primary-glow)',
                            border: '1px solid var(--primary)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '24px',
                            animationDelay: '0.2s'
                        }} className="slide-in-right">
                            <Braces size={20} style={{ color: 'var(--primary)' }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)', marginBottom: '4px' }}>
                                    Selected: {selectedOrient.label}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                                    {orient === "records" && "Creates a standard JSON array suitable for most web applications and databases."}
                                    {orient === "index" && "Ideal for referencing specific rows by their original sequence IDs."}
                                    {orient === "columns" && "Useful for column-oriented data processing and analytics."}
                                    {orient === "values" && "Provides the smallest file size by omitting column names."}
                                    {orient === "table" && "Includes schema metadata for type-safe data interchange."}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Convert Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
                <button
                    onClick={handleApply}
                    disabled={loading || files.length === 0}
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
                            Converting...
                        </>
                    ) : (
                        <>
                            <Zap size={20} />
                            Convert to JSON
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
                    <h5>Pro Tip: Choose the Right Structure</h5>
                    <p>
                        For most web APIs and databases, use <strong>List of Objects</strong> (records).
                        For analytics or data science, try <strong>Keyed by Column</strong>.
                        For minimal file size, use <strong>Array of Arrays</strong> with minified formatting.
                    </p>
                </div>
            </div>
        </div>
    );
}
