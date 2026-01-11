import { useState } from "react";
import FileUpload from "../components/FileUpload";

type SampleData = {
  headers: string[];
  rows: string[][];
};

type PreviewResponse = {
  columns: string[];
  sheets: string[] | null;
  sample?: SampleData;
};

type Mode = "remove" | "rename" | "replace" | "datetime";

interface FileModifyProps {
  onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function FileModify({ onLogAction }: FileModifyProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [sample, setSample] = useState<SampleData | null>(null);

  // Mode state
  const [mode, setMode] = useState<Mode>("remove");

  // State for "Remove" and "Replace"
  const [selected, setSelected] = useState<string[]>([]);

  // State for "Rename"
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});

  // State for "Replace"
  const [replacementValue, setReplacementValue] = useState("");

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Result State (for batch we might have multiple)
  const [results, setResults] = useState<{ blob: Blob; filename: string }[]>([]);

  const [sheets, setSheets] = useState<string[] | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [allSheets, setAllSheets] = useState(false);
  const [loading, setLoading] = useState(false);

  /* =========================
     Fetch column preview
     ========================= */
  const fetchPreview = async (f: File, sheetName?: string | null) => {
    try {
      const fd = new FormData();
      fd.append("file", f);
      if (sheetName) fd.append("sheet_name", sheetName);

      const res = await fetch("/api/file/preview-columns", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to preview file");
        return;
      }

      const data: PreviewResponse = await res.json();
      setColumns(data.columns);
      setSheets(data.sheets);
    } catch (e) {
      console.error(e);
      alert("Network error: Failed to fetch preview.");
    }
  };

  /* =========================
     Handle file upload
     ========================= */
  const handleFileChange = async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setSelected([]);
    setRenameMap({});
    setReplacementValue("");
    setColumns([]);
    setSheets(null);
    setSheet(null);
    setStatusMsg(null);
    setSample(null);
    setResults([]);

    if (selectedFiles.length === 0) return;

    // Preview for the first file
    const f = selectedFiles[0];
    try {
      const fd = new FormData();
      fd.append("file", f);

      const res = await fetch("/api/file/preview-columns", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || `Failed to preview ${f.name}`);
        return;
      }

      const data: PreviewResponse = await res.json();
      setSheets(data.sheets);
      const firstSheet = data.sheets ? data.sheets[0] : null;
      setSheet(firstSheet);
      setColumns(data.columns);
      setSample(data.sample || null);
    } catch (e) {
      console.error(e);
      alert("Network error during preview.");
    }
  };

  /* =========================
     Toggle column checkbox (Remove / Replace)
     ========================= */
  const toggleColumn = (col: string) => {
    setSelected((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  /* =========================
     Handle Rename Input
     ========================= */
  const handleRenameChange = (col: string, newVal: string) => {
    setRenameMap((prev) => ({
      ...prev,
      [col]: newVal,
    }));
  };

  /* =========================
     Apply Logic (Batch)
     ========================= */
  const handleApply = async () => {
    if (files.length === 0) {
      alert("Please upload at least one file.");
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setResults([]);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      if (sheet) fd.append("sheet_name", sheet);
      fd.append("all_sheets", String(allSheets));

      let endpoint = "";
      if (mode === "remove") {
        if (selected.length === 0) { alert("Select columns to remove"); setLoading(false); return; }
        endpoint = "remove-columns";
        fd.append("columns", selected.join(","));
      } else if (mode === "rename") {
        const activeRenames = Object.fromEntries(
          Object.entries(renameMap).filter(([_, v]) => v && v.trim() !== "")
        );
        if (Object.keys(activeRenames).length === 0) { alert("Enter at least one rename"); setLoading(false); return; }
        endpoint = "rename-columns";
        fd.append("mapping", JSON.stringify(activeRenames));
      } else {
        if (!replacementValue) { alert("Enter a replacement value"); setLoading(false); return; }
        endpoint = "replace-blanks";
        fd.append("columns", selected.join(","));
        fd.append("replacement", replacementValue);
      }

      const res = await fetch(`/api/file/${endpoint}`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Processing failed");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let outName = files.length > 1 ? "data_refinery_batch.zip" : files[0].name;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) outName = match[1];
      }

      const result = { blob, filename: outName };
      setResults([result]);
      setStatusMsg(`Successfully processed ${files.length} file(s). Result: ${outName}`);

      // Auto-download result
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = outName;
      link.click();

      if (onLogAction) onLogAction(`${mode.charAt(0).toUpperCase() + mode.slice(1)} Columns`, outName, blob);

    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "An error occurred during processing.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = () => {
    results.forEach((res) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(res.blob);
      link.download = res.filename;
      link.click();
    });
  };

  return (
    <div className="app glass-card">
      <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span>📦</span> Bulk File Editor
      </h2>
      <p className="desc">
        Bulk modify columns across multiple CSV/Excel files. Upload, configure, and apply.
      </p>

      {/* ================= FILE ================= */}
      <div className="section">
        <h4>
          <span>📄</span> Select Files
        </h4>
        <FileUpload
          files={files}
          onFilesSelected={handleFileChange}
        />

        {sheets && (
          <div className="form-grid" style={{ marginTop: 20 }}>
            <div className="input-group">
              <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Target Sheet</label>
              <select
                disabled={allSheets}
                value={sheet ?? ""}
                onChange={async (e) => {
                  const newSheet = e.target.value;
                  setSheet(newSheet);
                  if (files[0]) await fetchPreview(files[0], newSheet);
                }}
              >
                {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="checkbox" style={{ alignSelf: "end" }}>
              <input type="checkbox" checked={allSheets} onChange={(e) => setAllSheets(e.target.checked)} />
              Apply to All Sheets (Excel)
            </label>
          </div>
        )}
      </div>

      {files.length > 0 && columns.length > 0 && (
        <>
          {/* ================= MODE SWITCH ================= */}
          <div className="section">
            <h4>
              <span>🛠️</span> Choose Operation
            </h4>
            <div className="mode-group" style={{ marginBottom: 8 }}>
              <button className={mode === "remove" ? "active" : ""} onClick={() => { setMode("remove"); setResults([]); }}>Remove Columns</button>
              <button className={mode === "rename" ? "active" : ""} onClick={() => { setMode("rename"); setResults([]); }}>Rename Columns</button>
              <button className={mode === "replace" ? "active" : ""} onClick={() => { setMode("replace"); setResults([]); }}>Replace Blanks</button>
            </div>
          </div>

          {/* ================= COLUMNS UI ================= */}
          <div className="section">
            <h4>
              <span>⚙️</span> Configuration
            </h4>
            {mode === "remove" ? (
              <>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="desc" style={{ margin: 0 }}>Select columns to remove:</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelected([...columns])}>All</button>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelected([])}>None</button>
                  </div>
                </div>
                <div className="checkbox-grid" style={{ maxHeight: "250px", overflowY: "auto", padding: "4px" }}>
                  {columns.map((col) => (
                    <label key={col} className="checkbox">
                      <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleColumn(col)} />
                      {col}
                    </label>
                  ))}
                </div>
              </>
            ) : mode === "rename" ? (
              <>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="desc" style={{ margin: 0 }}>
                    Enter new names for the columns you wish to rename. Others will remain unchanged.
                  </p>
                  <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setRenameMap({})}>Clear All</button>
                </div>
                <div className="rename-list" style={{ maxHeight: "350px", overflowY: "auto" }}>
                  {columns.map((col) => (
                    <div key={col} className="rename-row">
                      <span title={col} style={{ fontWeight: 600 }}>{col}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                        <span style={{ opacity: 0.3 }}>→</span>
                        <input
                          type="text"
                          placeholder="Enter new name..."
                          value={renameMap[col] || ""}
                          onChange={(e) => handleRenameChange(col, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="desc" style={{ margin: 0 }}>Select columns to check for blanks:</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelected([...columns])}>All</button>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setSelected([])}>None</button>
                  </div>
                </div>
                <div className="checkbox-grid" style={{ maxHeight: "180px", overflowY: "auto", marginBottom: 20 }}>
                  {columns.map((col) => (
                    <label key={col} className="checkbox">
                      <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleColumn(col)} />
                      {col}
                    </label>
                  ))}
                </div>
                <div style={{ maxWidth: 400 }}>
                  <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Replacement Value</label>
                  <input
                    type="text"
                    placeholder="e.g. N/A, 0, or [Missing]"
                    value={replacementValue}
                    onChange={(e) => setReplacementValue(e.target.value)}
                  />
                  <p className="desc" style={{ fontSize: "11px", color: "var(--primary)", marginTop: 8 }}>
                    💡 Tip: Empty or whitespace-only cells will be replaced.
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ================= ACTION ================= */}
      <div className="section" style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
        <h4 style={{ margin: 0 }}>
          <span>🚀</span> Ready?
        </h4>
        <div style={{ display: "flex", gap: "12px" }}>
          {results.length > 0 && (
            <button onClick={downloadAll} className="secondary">
              <span>📥</span> Download {results.length} File(s)
            </button>
          )}
          <button onClick={handleApply} disabled={loading || files.length === 0} className="primary">
            {loading ? (
              <><span>⌛</span> Processing...</>
            ) : (
              <><span>⚡</span> Apply to {files.length} File(s)</>
            )}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="section" style={{ borderLeft: "4px solid var(--primary)", background: "rgba(99, 102, 241, 0.05)" }}>
          <h4 style={{ color: "var(--text-main)", textTransform: "none", marginBottom: 8 }}>
            <span>✅</span> Success
          </h4>
          <p className="desc" style={{ marginBottom: 0 }}>{statusMsg}</p>
        </div>
      )}

      {sample && (
        <div className="section">
          <h4>
            <span>🔍</span> Data Preview (Top 5 rows of {files[0]?.name})
          </h4>
          <div style={{ overflowX: "auto", marginTop: 12, borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {sample.headers.map((h, i) => (
                    <th key={i} style={{ padding: "12px", textAlign: "left", fontSize: "12px", borderBottom: "1px solid var(--glass-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "12px", fontSize: "12px", opacity: 0.8 }}>{cell}</td>
                    ))}
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
