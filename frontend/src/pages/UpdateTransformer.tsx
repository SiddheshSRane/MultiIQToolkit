import { useState } from "react";

interface UpdateTransformerProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

interface ValidationData {
    success: boolean;
    table: string;
    set_col: string;
    set_val: string;
    where_base: string;
    where_var: { col: string; val: string } | null;
}

export default function UpdateTransformer({ onLogAction }: UpdateTransformerProps) {
    const [refQuery, setRefQuery] = useState("");
    const [validation, setValidation] = useState<ValidationData | null>(null);
    const [setValues, setSetValues] = useState("");
    const [whereValues, setWhereValues] = useState("");
    const [mode, setMode] = useState<"pairwise" | "cross">("pairwise");

    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleValidate = async () => {
        if (!refQuery) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/sql/validate-update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: refQuery }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Validation failed");
            setValidation(data);
        } catch (e: any) {
            setError(e.message);
            setValidation(null);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!validation) return;
        setLoading(true);
        setError(null);
        try {
            const sList = setValues.split("\n").map(v => v.trim()).filter(Boolean);
            const wList = whereValues.split("\n").map(v => v.trim()).filter(Boolean);

            if (mode === "pairwise" && sList.length !== wList.length) {
                throw new Error(`Pairwise mode requires same number of SET and WHERE values. (Found ${sList.length} vs ${wList.length})`);
            }

            const res = await fetch("/api/sql/generate-updates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reference_query: refQuery,
                    set_values: sList,
                    where_values: wList,
                    mode
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");
            setResults(data.queries);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const content = results.join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "batch_updates.txt";
        link.click();
        if (onLogAction) onLogAction("SQL Export", "batch_updates.txt", blob);
    };

    return (
        <div className="app glass-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span>🛡️</span> UPDATE Query Transformer
            </h2>
            <p className="desc">
                GENERATE SAFELY. BATCH SQL UPDATES FROM A VALIDATED TEMPLATE.
            </p>

            {/* --- STEP 1: REFERENCE QUERY --- */}
            <div className="section">
                <h4>
                    <span>📥</span> 1. Reference UPDATE Query
                </h4>
                <p className="desc" style={{ fontSize: "12px", marginBottom: 12 }}>
                    Paste your master query. Must include <b>SET</b> and <b>WHERE</b>.
                </p>
                <textarea
                    rows={4}
                    placeholder="e.g. UPDATE users SET status = 'active' WHERE user_id = '123'"
                    value={refQuery}
                    onChange={(e) => setRefQuery(e.target.value)}
                    disabled={!!validation}
                    style={{ fontFamily: "monospace", fontSize: "13px" }}
                />
                {!validation ? (
                    <button className="primary" onClick={handleValidate} disabled={loading || !refQuery} style={{ marginTop: 12 }}>
                        {loading ? "Validating..." : "Validate Template"}
                    </button>
                ) : (
                    <button className="secondary" onClick={() => { setValidation(null); setResults([]); }} style={{ marginTop: 12 }}>
                        Reset Template
                    </button>
                )}
            </div>

            {error && (
                <div className="section" style={{ borderLeft: "4px solid #f43f5e", background: "rgba(244, 63, 94, 0.05)" }}>
                    <p style={{ color: "#fb7185", margin: 0, fontSize: "13px" }}>⚠️ {error}</p>
                </div>
            )}

            {/* --- STEP 2: BATCH INPUTS --- */}
            {validation && (
                <div className="section">
                    <h4>
                        <span>⚙️</span> 2. Batch Operations
                    </h4>
                    <div className="stats" style={{ padding: "12px", marginBottom: 20, background: "rgba(255,255,255,0.02)" }}>
                        <p className="desc" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--primary)" }}>Identified Components:</p>
                        <div style={{ display: "flex", gap: "20px", marginTop: 8, fontSize: "13px" }}>
                            <span><b>Table:</b> {validation.table}</span>
                            <span><b>Set Column:</b> {validation.set_col}</span>
                            <span><b>Where Logic:</b> {validation.where_base}</span>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="input-group">
                            <label>New SET Values (One per line)</label>
                            <textarea
                                rows={6}
                                placeholder="active&#10;inactive&#10;pending"
                                value={setValues}
                                onChange={e => setSetValues(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>New WHERE Values (One per line)</label>
                            <textarea
                                rows={6}
                                placeholder="101&#10;102&#10;103"
                                value={whereValues}
                                onChange={e => setWhereValues(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 24 }}>
                        <div style={{ display: "flex", gap: 12 }}>
                            <label className="checkbox">
                                <input type="radio" checked={mode === "pairwise"} onChange={() => setMode("pairwise")} />
                                Pairwise (1-to-1)
                            </label>
                            <label className="checkbox">
                                <input type="radio" checked={mode === "cross"} onChange={() => setMode("cross")} />
                                All Combinations
                            </label>
                        </div>
                        <button className="primary" onClick={handleGenerate} disabled={loading || !setValues || !whereValues} style={{ marginLeft: "auto" }}>
                            {loading ? "Generating..." : "Generate Batch"}
                        </button>
                    </div>
                </div>
            )}

            {/* --- STEP 3: PREVIEW & EXPORT --- */}
            {results.length > 0 && (
                <div className="section">
                    <h4>
                        <span>✨</span> 3. Generated Queries ({results.length})
                    </h4>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "12px", marginBottom: 24 }}>
                        <p className="desc" style={{ fontSize: "11px", marginBottom: 12 }}>Preview of first 3 queries:</p>
                        <pre style={{ margin: 0, fontSize: "11px", overflowX: "auto", color: "var(--text-main)", opacity: 0.9 }}>
                            {results.slice(0, 3).join("\n")}
                            {results.length > 3 && "\n..."}
                        </pre>
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                        <button className="secondary" onClick={() => navigator.clipboard.writeText(results.join("\n"))}>
                            <span>📋</span> Copy All
                        </button>
                        <button className="primary" onClick={handleDownload}>
                            <span>🚀</span> Download .txt
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
