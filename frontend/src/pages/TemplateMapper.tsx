import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    ClipboardList,
    File as FileIcon,
    Settings,
    Loader2,
    Eye,
    Search,
    Zap,
    Sparkles
} from "lucide-react";
import { downloadBlob } from "../utils/download";
import { parseApiError } from "../utils/apiError";
import { useNotifications } from "../contexts/NotificationContext";

type MappingRule = {
    type: "column" | "static" | "none";
    value: string;
    transform?: "none" | "trim" | "uppercase" | "lowercase" | "titlecase";
    required?: boolean;
};

type PreviewData = {
    headers: string[];
    rows: string[][];
    error?: string;
};

interface TemplateMapperProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function TemplateMapper({ onLogAction }: TemplateMapperProps) {
    const { notify } = useNotifications();
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [dataFile, setDataFile] = useState<File | null>(null);

    const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
    const [dataHeaders, setDataHeaders] = useState<string[]>([]);

    const [mapping, setMapping] = useState<Record<string, MappingRule>>({});
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");

    const loadTemplateHeaders = useCallback(async (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetchWithAuth("/api/file/template-headers", { method: "POST", body: fd });
            if (!res.ok) throw new Error("Failed to load template headers");
            const data = await res.json();
            setTemplateHeaders(data.headers);

            const newMapping: Record<string, MappingRule> = {};
            data.headers.forEach((h: string) => {
                newMapping[h] = { type: "none", value: "", transform: "none", required: false };
            });
            setMapping(newMapping);
        } catch (e) {
            console.error("Template error:", e);
            notify('error', 'Template Error', "Could not extract headers from template.");
        }
    }, [notify]);

    const loadDataHeaders = useCallback(async (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetchWithAuth("/api/file/template-headers", { method: "POST", body: fd });
            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }
            const data = await res.json();
            setDataHeaders(data.headers);
        } catch (e) {
            console.error("Data error:", e);
            notify('error', 'Data Error', "Failed to load source headers.");
        }
    }, [notify]);

    useEffect(() => {
        if (templateFile) loadTemplateHeaders(templateFile);
        else setTemplateHeaders([]);
    }, [templateFile, loadTemplateHeaders]);

    useEffect(() => {
        if (dataFile) loadDataHeaders(dataFile);
        else setDataHeaders([]);
    }, [dataFile, loadDataHeaders]);

    const updateMapping = (col: string, rule: MappingRule) => {
        setMapping(prev => ({ ...prev, [col]: rule }));
    };

    const handleDownload = useCallback(async () => {
        if (!templateFile || !dataFile) {
            notify('error', 'Files Required', "Please provide both template and data files.");
            return;
        }

        setLoading(true);
        notify('loading', 'Mapping Data', 'Applying field mappings...');

        try {
            const fd = new FormData();
            fd.append("template_headers", JSON.stringify(templateHeaders));
            fd.append("data_file", dataFile);
            fd.append("mapping_json", JSON.stringify(mapping));

            const res = await fetchWithAuth("/api/file/template-map", { method: "POST", body: fd });
            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const blob = await res.blob();
            downloadBlob(blob, `mapped_${dataFile.name}`);
            notify('success', 'Mapping Complete', 'Your mapped file is ready.');
            if (onLogAction) onLogAction("Map Template", `mapped_${dataFile.name}`, blob);
        } catch (e) {
            console.error("Mapping error:", e);
            notify('error', 'Mapping Failed', e instanceof Error ? e.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    }, [templateFile, dataFile, templateHeaders, mapping, onLogAction, notify]);

    const generatePreview = useCallback(async () => {
        if (!templateFile || !dataFile || templateHeaders.length === 0) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("template_headers", JSON.stringify(templateHeaders));
            fd.append("data_file", dataFile);
            fd.append("mapping_json", JSON.stringify(mapping));

            const res = await fetchWithAuth("/api/file/template-preview", { method: "POST", body: fd });
            const data = await res.json();
            if (data.headers) setPreview(data);
        } catch (e) {
            console.error("Preview error:", e);
        } finally {
            setLoading(false);
        }
    }, [templateFile, dataFile, templateHeaders, mapping]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (templateFile && dataFile) generatePreview();
        }, 1200);
        return () => clearTimeout(timer);
    }, [templateFile, dataFile, mapping, generatePreview]);

    const filteredHeaders = templateHeaders.filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="app page-enter">
            {/* File Upload Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                <div className="section slide-in-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'var(--gradient-info)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>STEP 1: TEMPLATE</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Upload target format file</p>
                        </div>
                    </div>
                    <FileUpload files={templateFile ? [templateFile] : []} onFilesSelected={(fs) => setTemplateFile(fs[0] || null)} />
                </div>

                <div className="section slide-in-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'var(--gradient-success)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <FileIcon size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>STEP 2: SOURCE DATA</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Upload data to map</p>
                        </div>
                    </div>
                    <FileUpload files={dataFile ? [dataFile] : []} onFilesSelected={(fs) => setDataFile(fs[0] || null)} />
                </div>
            </div>

            {/* Mapping Configuration */}
            {templateHeaders.length > 0 && (
                <div className="section slide-in-left" style={{ animationDelay: '0.1s', marginTop: '24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'var(--gradient-primary)',
                        borderRadius: '24px 24px 0 0'
                    }} />

                    <div style={{ paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Settings size={20} style={{ color: 'var(--primary)' }} />
                                <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>STEP 3: FIELD MAPPING</h4>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--input-bg)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                                <input
                                    placeholder="Search fields..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '13px', width: '140px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Target Field</th>
                                        <th>Mapping Type</th>
                                        <th>Source / Value</th>
                                        <th>Transform</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHeaders.map(tCol => (
                                        <tr key={tCol}>
                                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{tCol}</td>
                                            <td>
                                                <select value={mapping[tCol]?.type} onChange={(e) => updateMapping(tCol, { ...mapping[tCol], type: e.target.value as any, value: "" })}>
                                                    <option value="none">Omit / Clear</option>
                                                    <option value="column">Map to Column</option>
                                                    <option value="static">Static Value</option>
                                                </select>
                                            </td>
                                            <td>
                                                {mapping[tCol]?.type === "column" && (
                                                    <select value={mapping[tCol]?.value} onChange={(e) => updateMapping(tCol, { ...mapping[tCol], value: e.target.value })}>
                                                        <option value="">-- Choose Column --</option>
                                                        {dataHeaders.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                )}
                                                {mapping[tCol]?.type === "static" && (
                                                    <input type="text" placeholder="Enter value..." value={mapping[tCol]?.value} onChange={(e) => updateMapping(tCol, { ...mapping[tCol], value: e.target.value })} />
                                                )}
                                                {mapping[tCol]?.type === "none" && (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <select
                                                    disabled={mapping[tCol]?.type !== "column"}
                                                    value={mapping[tCol]?.transform}
                                                    onChange={e => updateMapping(tCol, { ...mapping[tCol], transform: e.target.value as any })}
                                                >
                                                    <option value="none">Original</option>
                                                    <option value="trim">Trim Whitespace</option>
                                                    <option value="uppercase">UPPERCASE</option>
                                                    <option value="lowercase">lowercase</option>
                                                    <option value="titlecase">Title Case</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
                <button
                    onClick={handleDownload}
                    disabled={loading || !templateFile || !dataFile}
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
                            Mapping...
                        </>
                    ) : (
                        <>
                            <Zap size={20} />
                            Generate Mapped File
                        </>
                    )}
                </button>
            </div>

            {/* Preview */}
            {preview && (
                <div className="section scale-in" style={{ animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Eye size={20} style={{ color: 'var(--primary)' }} />
                        <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>PREVIEW</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>(First 5 rows)</span>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>{preview.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((row, i) => (
                                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pro Tip */}
            <div className="tool-help-section scale-in" style={{ animationDelay: '0.3s' }}>
                <div className="tool-help-icon">
                    <Sparkles size={24} />
                </div>
                <div className="tool-help-content">
                    <h5>Pro Tip: Field Mapping Strategies</h5>
                    <p>
                        Use <strong>Map to Column</strong> to transfer data from your source file.
                        Use <strong>Static Value</strong> to fill fields with constant values (like dates, IDs, or default text).
                        Apply transformations to clean data during the mapping process (trim whitespace, change case, etc.).
                    </p>
                </div>
            </div>
        </div>
    );
}
