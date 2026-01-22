
import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
    ClipboardList,
    File as FileIcon,
    Settings,
    Rocket,
    Loader2,
    Eye,
    Search,
    Zap
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
            notify('error', 'Schema Error', "Could not extract headers from your template.");
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
            notify('error', 'Payload Error', "Failed to load mapping source headers.");
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
            notify('error', 'Selection Required', "Please provide both a template and data file.");
            return;
        }

        setLoading(true);
        notify('loading', 'Mapping Structures', 'Injecting data into your template framework...');
        try {
            const fd = new FormData();
            fd.append("template_file", templateFile);
            fd.append("data_file", dataFile);
            fd.append("mapping", JSON.stringify(mapping));

            const res = await fetchWithAuth("/api/file/map-template", { method: "POST", body: fd });
            if (!res.ok) {
                const errorMessage = await parseApiError(res);
                throw new Error(errorMessage);
            }

            const blob = await res.blob();
            downloadBlob(blob, `mapped_${dataFile.name}`);
            notify('success', 'Mapping Successful', 'Your structured Excel file is ready.');
            if (onLogAction) onLogAction("Map Template", `mapped_${dataFile.name}`, blob);
        } catch (e) {
            console.error("Mapping error:", e);
            notify('error', 'Process Error', e instanceof Error ? e.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    }, [templateFile, dataFile, mapping, onLogAction, notify]);

    const generatePreview = useCallback(async () => {
        if (!templateFile || !dataFile) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("template_file", templateFile);
            fd.append("data_file", dataFile);
            fd.append("mapping", JSON.stringify(mapping));
            fd.append("preview", "true");

            const res = await fetchWithAuth("/api/file/map-template", { method: "POST", body: fd });
            const data = await res.json();
            if (data.headers) setPreview(data);
        } catch (e) {
            console.error("Preview error:", e);
        } finally {
            setLoading(false);
        }
    }, [templateFile, dataFile, mapping]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (templateFile && dataFile) generatePreview();
        }, 1200);
        return () => clearTimeout(timer);
    }, [templateFile, dataFile, mapping, generatePreview]);

    return (
        <div className="app">
            <div className="form-grid">
                <div className="section">
                    <h4><ClipboardList size={18} /> Step 1: Template</h4>
                    <p className="desc">Upload the Excel file that defines the final format.</p>
                    <FileUpload files={templateFile ? [templateFile] : []} onFilesSelected={(fs) => setTemplateFile(fs[0] || null)} />
                </div>
                <div className="section">
                    <h4><FileIcon size={18} /> Step 2: Source Data</h4>
                    <p className="desc">Upload the data file you want to transfer into the template.</p>
                    <FileUpload files={dataFile ? [dataFile] : []} onFilesSelected={(fs) => setDataFile(fs[0] || null)} />
                </div>
            </div>

            {templateHeaders.length > 0 && (
                <div className="section">
                    <div className="flex-responsive" style={{ marginBottom: 16 }}>
                        <h4 style={{ margin: 0 }}><Settings size={18} /> Step 3: Architecture Mapping</h4>
                        <div className="search-pill" style={{ marginLeft: 'auto', background: 'var(--input-bg)' }}>
                            <Search size={14} />
                            <input
                                placeholder="Search headers..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 13, width: 140 }}
                            />
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Target Header (In Template)</th>
                                    <th>Mapping Type</th>
                                    <th>Value / Column Source</th>
                                    <th>Transformation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templateHeaders
                                    .filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(tCol => (
                                        <tr key={tCol}>
                                            <td style={{ fontWeight: 700 }}>{tCol}</td>
                                            <td>
                                                <select value={mapping[tCol]?.type} onChange={(e) => updateMapping(tCol, { ...mapping[tCol], type: e.target.value as any, value: "" })}>
                                                    <option value="none">Omit / Clear</option>
                                                    <option value="column">Map to Source Column</option>
                                                    <option value="static">Static Value</option>
                                                </select>
                                            </td>
                                            <td>
                                                {mapping[tCol]?.type === "column" && (
                                                    <select value={mapping[tCol]?.value} onChange={(e) => updateMapping(tCol, { ...mapping[tCol], value: e.target.value })}>
                                                        <option value="">-- Choose Header --</option>
                                                        {dataHeaders.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                )}
                                                {mapping[tCol]?.type === "static" && (
                                                    <input type="text" placeholder="Value..." value={mapping[tCol]?.value} onChange={(e) => updateMapping(tCol, { ...mapping[tCol], value: e.target.value })} />
                                                )}
                                            </td>
                                            <td>
                                                <select
                                                    disabled={mapping[tCol]?.type !== "column"}
                                                    value={mapping[tCol]?.transform}
                                                    onChange={e => updateMapping(tCol, { ...mapping[tCol], transform: e.target.value as any })}
                                                >
                                                    <option value="none">Original</option>
                                                    <option value="trim">Trim WhiteSpace</option>
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
            )}

            <div className="section flex-responsive">
                <h4 style={{ margin: 0 }}><Rocket size={18} /> Export Refined Portal</h4>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="primary" onClick={handleDownload} disabled={loading || !templateFile || !dataFile}>
                        {loading ? <Loader2 className="animate-spin" /> : <Zap />} Generate Refined Excel
                    </button>
                </div>
            </div>

            {preview && (
                <div className="section">
                    <h4><Eye size={18} /> Blueprint Preview</h4>
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
        </div>
    );
}
