import { useState, useEffect } from "react";
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
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [dataFile, setDataFile] = useState<File | null>(null);

    const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
    const [dataHeaders, setDataHeaders] = useState<string[]>([]);

    const [mapping, setMapping] = useState<Record<string, MappingRule>>({});
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(false);

    // UI State for filtering
    const [searchTerm, setSearchTerm] = useState("");
    const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false);

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
                newMapping[h] = { type: "none", value: "", transform: "none", required: false };
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
        setMapping((prev: Record<string, MappingRule>) => ({ ...prev, [tCol]: rule }));
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
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Auto-preview useEffect with debounce
    useEffect(() => {
        if (!dataFile || templateHeaders.length === 0) return;

        const timer = setTimeout(() => {
            fetchPreview();
        }, 800); // 800ms debounce

        return () => clearTimeout(timer);
    }, [mapping, dataFile, templateHeaders]);

    const handleDownload = async () => {
        if (!dataFile || templateHeaders.length === 0) return;

        // Validation: check for required columns that are unmapped
        const missingRequired = Object.entries(mapping).filter(([_, rule]) => rule.required && rule.type === "none");
        if (missingRequired.length > 0) {
            alert(`The following required columns are unmapped: ${missingRequired.map(([h]) => h).join(", ")}`);
            return;
        }

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
                    <div className="flex-responsive" style={{ marginBottom: 16 }}>
                        <h4><Settings size={18} /> 3. Map Columns</h4>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <input
                                    type="text"
                                    placeholder="Search columns..."
                                    style={{ padding: "6px 12px", fontSize: "13px", minWidth: "200px" }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <label className="checkbox" style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
                                <input type="checkbox" checked={showOnlyUnmapped} onChange={(e) => setShowOnlyUnmapped(e.target.checked)} />
                                Only Unmapped
                            </label>
                        </div>
                    </div>

                    <div className="table-container" style={{ marginTop: 20 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: "40px" }}>Req.</th>
                                    <th>Template Column</th>
                                    <th>Source Selection</th>
                                    <th>Value / Column Name</th>
                                    <th>Transformation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templateHeaders
                                    .filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .filter(h => {
                                        if (!showOnlyUnmapped) return true;
                                        const rule = mapping[h];
                                        if (!rule || rule.type === "none") return true;
                                        if (rule.type === "column" && !rule.value) return true;
                                        if (rule.type === "static" && !rule.value) return true;
                                        return false;
                                    })
                                    .map((tCol: string) => (
                                        <tr key={tCol} style={{ background: mapping[tCol]?.required && mapping[tCol]?.type === "none" ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={mapping[tCol]?.required || false}
                                                    onChange={(e) => updateMapping(tCol, { ...mapping[tCol], required: e.target.checked })}
                                                    title="Mark as required"
                                                />
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {tCol}
                                                {mapping[tCol]?.required && <span style={{ color: "var(--primary)", marginLeft: 4 }}>*</span>}
                                            </td>
                                            <td>
                                                <select
                                                    style={{ padding: "4px 8px" }}
                                                    value={mapping[tCol]?.type || "none"}
                                                    onChange={(e) => updateMapping(tCol, { ...mapping[tCol], type: e.target.value as any, value: "" })}
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
                                                        {dataHeaders.map((dCol: string) => <option key={dCol} value={dCol}>{dCol}</option>)}
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
                                            <td>
                                                <select
                                                    disabled={mapping[tCol]?.type !== "column"}
                                                    value={mapping[tCol]?.transform || "none"}
                                                    onChange={(e) => updateMapping(tCol, { ...mapping[tCol], transform: e.target.value as any })}
                                                >
                                                    <option value="none">None</option>
                                                    <option value="trim">Trim</option>
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

            {templateHeaders.length > 0 && dataFile && (
                <div className="section" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button className="primary" onClick={handleDownload} disabled={loading}>
                        {loading ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <><Rocket size={18} /> Generate & Download Excel</>}
                    </button>
                    {loading && <p className="desc" style={{ margin: 0, fontSize: "12px" }}>Updating preview...</p>}
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
                                {preview.rows.map((row: string[], i: number) => (
                                    <tr key={i}>
                                        {row.map((cell: string, j: number) => <td key={j}>{cell}</td>)}
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
