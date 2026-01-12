import { useState } from "react";
import FileUpload from "../components/FileUpload";
import {
    ClipboardList,
    File,
    BarChart,
    Settings,
    Search,
    Rocket,
    Loader2,
    Eye
} from "lucide-react";

type MappingRule = {
    type: "column" | "static" | "none";
    value: string;
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
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [dataFile, setDataFile] = useState<File | null>(null);

    const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
    const [dataHeaders, setDataHeaders] = useState<string[]>([]);

    const [mapping, setMapping] = useState<Record<string, MappingRule>>({});
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(false);

    // Load Template Headers
    const loadTemplateHeaders = async (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetch("/api/file/template-headers", { method: "POST", body: fd });
            const data = await res.json();
            setTemplateHeaders(data.headers);

            // Initialize mapping
            const newMapping: Record<string, MappingRule> = {};
            data.headers.forEach((h: string) => {
                newMapping[h] = { type: "none", value: "" };
            });
            setMapping(newMapping);
        } catch (e) { console.error(e); }
    };

    // Load Data Headers
    const loadDataHeaders = async (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetch("/api/file/template-headers", { method: "POST", body: fd });
            const data = await res.json();
            setDataHeaders(data.headers);
        } catch (e) { console.error(e); }
    };

    const updateMapping = (tCol: string, rule: MappingRule) => {
        setMapping(prev => ({ ...prev, [tCol]: rule }));
    };

    const fetchPreview = async () => {
        if (!dataFile || templateHeaders.length === 0) return;
        setLoading(true);
        const fd = new FormData();
        fd.append("data_file", dataFile);
        fd.append("template_headers", JSON.stringify(templateHeaders));
        fd.append("mapping_json", JSON.stringify(mapping));

        try {
            const res = await fetch("/api/file/template-preview", { method: "POST", body: fd });
            const data = await res.json();
            setPreview(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDownload = async () => {
        if (!dataFile || templateHeaders.length === 0) return;
        setLoading(true);
        const fd = new FormData();
        fd.append("data_file", dataFile);
        fd.append("template_headers", JSON.stringify(templateHeaders));
        fd.append("mapping_json", JSON.stringify(mapping));

        try {
            const res = await fetch("/api/file/template-map", { method: "POST", body: fd });
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            const outName = `${templateFile?.name.split('.')[0] || 'template'}_mapped_${Date.now()}.xlsx`;
            link.download = outName;
            link.click();
            if (onLogAction) onLogAction("Template Mapping", outName, blob);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    return (
        <div className="app glass-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ClipboardList className="text-primary" />
                Template Column Mapper
            </h2>
            <p className="desc">
                Map source data columns to a template schema and generate a perfectly formatted Excel output.
            </p>

            <div className="form-grid">
                <div className="section">
                    <h4><File size={18} /> 1. Template Schema</h4>
                    <FileUpload
                        files={templateFile ? [templateFile] : []}
                        onFilesSelected={(files) => {
                            if (files[0]) {
                                setTemplateFile(files[0]);
                                loadTemplateHeaders(files[0]);
                            }
                        }}
                    />
                </div>
                <div className="section">
                    <h4><BarChart size={18} /> 2. Source Data</h4>
                    <FileUpload
                        files={dataFile ? [dataFile] : []}
                        onFilesSelected={(files) => {
                            if (files[0]) {
                                setDataFile(files[0]);
                                loadDataHeaders(files[0]);
                            }
                        }}
                    />
                </div>
            </div>

            {templateHeaders.length > 0 && (
                <div className="section">
                    <h4><Settings size={18} /> 3. Map Columns</h4>
                    <div className="table-container" style={{ marginTop: 20 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Template Column</th>
                                    <th>Source Selection</th>
                                    <th>Value / Column Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templateHeaders.map(tCol => (
                                    <tr key={tCol}>
                                        <td style={{ fontWeight: 600 }}>{tCol}</td>
                                        <td>
                                            <select
                                                style={{ padding: "4px 8px" }}
                                                value={mapping[tCol]?.type || "none"}
                                                onChange={(e) => updateMapping(tCol, { type: e.target.value as any, value: "" })}
                                            >
                                                <option value="none">Unmapped (Blank)</option>
                                                <option value="column">Source Column</option>
                                                <option value="static">Static Value</option>
                                            </select>
                                        </td>
                                        <td>
                                            {mapping[tCol]?.type === "column" && (
                                                <select
                                                    value={mapping[tCol]?.value}
                                                    onChange={(e) => updateMapping(tCol, { ...mapping[tCol], value: e.target.value })}
                                                >
                                                    <option value="">Select Column...</option>
                                                    {dataHeaders.map(dCol => <option key={dCol} value={dCol}>{dCol}</option>)}
                                                </select>
                                            )}
                                            {mapping[tCol]?.type === "static" && (
                                                <input
                                                    type="text"
                                                    placeholder="Enter static value..."
                                                    value={mapping[tCol]?.value}
                                                    onChange={(e) => updateMapping(tCol, { ...mapping[tCol], value: e.target.value })}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {templateHeaders.length > 0 && dataFile && (
                <div className="section" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button className="secondary" onClick={fetchPreview} disabled={loading}>
                        {loading ? <><Loader2 className="animate-spin" size={18} /> Loading...</> : <><Search size={18} /> Preview Mapping</>}
                    </button>
                    <button className="primary" onClick={handleDownload} disabled={loading}>
                        {loading ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <><Rocket size={18} /> Generate & Download Excel</>}
                    </button>
                </div>
            )}

            {preview && (
                <div className="section">
                    <h4><Eye size={18} /> Preview (First 5 Rows)</h4>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    {preview.headers.map((h, i) => <th key={i}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => <td key={j}>{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
