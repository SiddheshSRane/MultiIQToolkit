import { useState } from "react";

type PreviewResponse = {
  columns: string[];
  sheets: string[] | null;
};

type Mode = "remove" | "rename" | "replace";

export default function FileModify() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);

  // Mode state
  const [mode, setMode] = useState<Mode>("remove");

  // State for "Remove" and "Replace"
  const [selected, setSelected] = useState<string[]>([]);

  // State for "Rename"
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});

  // State for "Replace"
  const [replacementValue, setReplacementValue] = useState("");

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);

  // Result State
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFilename, setResultFilename] = useState<string | null>(null);

  const [sheets, setSheets] = useState<string[] | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* =========================
     Fetch column preview
     ========================= */
  const fetchPreview = async (f: File, sheetName?: string | null) => {
    try {
      const fd = new FormData();
      fd.append("file", f);
      if (sheetName) fd.append("sheet_name", sheetName);

      const res = await fetch("http://localhost:8000/file/preview-columns", {
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
  /* =========================
     Handle file upload
     ========================= */
  const handleFileChange = async (f: File) => {
    setFile(f);
    setSelected([]);
    setRenameMap({});
    setReplacementValue("");
    setColumns([]);
    setSheets(null);
    setSheet(null);
    setStatusMsg(null);
    setPreviewData(null);
    setResultBlob(null);
    setResultFilename(null);

    try {
      const fd = new FormData();
      fd.append("file", f);

      const res = await fetch("http://localhost:8000/file/preview-columns", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to preview file");
        return;
      }

      const data: PreviewResponse = await res.json();

      setSheets(data.sheets);

      const firstSheet = data.sheets ? data.sheets[0] : null;
      setSheet(firstSheet);

      setColumns(data.columns);
    } catch (e) {
      console.error(e);
      alert("Network error: Failed to upload file.");
    }
  };

  /* =========================
     Toggle column checkbox (Remove / Replace)
     ========================= */
  const toggleColumn = (col: string) => {
    setSelected((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
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
     Apply Logic
     ========================= */
  const handleApply = async () => {
    if (!file) return;

    if (mode === "remove") {
      await handleRemoveApply();
    } else if (mode === "rename") {
      await handleRenameApply();
    } else {
      await handleReplaceApply();
    }
  };

  const handleRemoveApply = async () => {
    if (!file || selected.length === 0) {
      alert("Select a file and at least one column to remove");
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setPreviewData(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("columns", selected.join(","));
      if (sheet) fd.append("sheet_name", sheet);

      const res = await fetch("http://localhost:8000/file/remove-columns", {
        method: "POST",
        body: fd,
      });

      const { blob, filename } = await processResponse(res, "cleaned_file");
      setResultBlob(blob);
      setResultFilename(filename);
      await handleResultBlob(blob);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error removing columns");
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceApply = async () => {
    if (!file || selected.length === 0) {
      alert("Select at least one column");
      return;
    }
    if (!replacementValue) {
      alert("Enter a replacement value");
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setPreviewData(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("columns", selected.join(","));
      fd.append("replacement", replacementValue);
      if (sheet) fd.append("sheet_name", sheet);

      const res = await fetch("http://localhost:8000/file/replace-blanks", {
        method: "POST",
        body: fd,
      });

      const { blob, filename } = await processResponse(res, "filled_file");
      setResultBlob(blob);
      setResultFilename(filename);
      await handleResultBlob(blob);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error replacing values");
    } finally {
      setLoading(false);
    }
  };

  const handleRenameApply = async () => {
    // Filter out empty renames
    const activeRenames: Record<string, string> = {};
    for (const [key, val] of Object.entries(renameMap)) {
      if (val && val.trim() !== "") {
        activeRenames[key] = val.trim();
      }
    }

    if (Object.keys(activeRenames).length === 0) {
      alert("Enter at least one new column name");
      return;
    }

    // Check for duplicates in new names (simple check)
    const newNames = Object.values(activeRenames);
    if (new Set(newNames).size !== newNames.length) {
      alert("Duplicate new column names are not allowed");
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setPreviewData(null);

    try {
      const fd = new FormData();
      fd.append("file", file!); // file check done in handleApply
      fd.append("mapping", JSON.stringify(activeRenames));
      if (sheet) fd.append("sheet_name", sheet);

      const res = await fetch("http://localhost:8000/file/rename-columns", {
        method: "POST",
        body: fd,
      });

      const { blob, filename } = await processResponse(res, "renamed_file");
      setResultBlob(blob);
      setResultFilename(filename);
      await handleResultBlob(blob);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error renaming columns");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Helper: Process Response
     ========================= */
  const processResponse = async (res: Response, defaultName: string) => {
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Operation failed");
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get("content-disposition");
    let filename = defaultName;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match && match[1]) filename = match[1];
    }

    return { blob, filename };
  };

  /* =========================
     Helper: Download Blob
     ========================= */
  const downloadResult = () => {
    if (!resultBlob || !resultFilename) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(resultBlob);
    link.download = resultFilename;
    link.click();
  };

  const handleResultBlob = async (blob: Blob) => {
    setStatusMsg("Task completed successfully! You can now download the result.");

    const isCsvInput = file?.name.toLowerCase().endsWith(".csv");

    if (isCsvInput) {
      const text = await blob.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "").slice(0, 5);
      const parsed = lines.map(line => line.split(","));
      setPreviewData(parsed);
    } else {
      setPreviewData(null);
    }
  };

  return (
    <div>
      <p className="desc">
        Upload a file to modify its columns.
      </p>

      {/* ================= FILE ================= */}
      <div className="section">
        <h4>File</h4>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) =>
            e.target.files && handleFileChange(e.target.files[0])
          }
        />

        {sheets && (
          <div className="inline">
            <label>Sheet</label>
            <select
              value={sheet ?? ""}
              onChange={async (e) => {
                const newSheet = e.target.value;
                setSheet(newSheet);
                setSelected([]);
                setRenameMap({});
                setReplacementValue("");
                setStatusMsg(null);
                setPreviewData(null);
                setResultBlob(null);
                setResultFilename(null);

                if (file) {
                  await fetchPreview(file, newSheet);
                }
              }}
            >
              {sheets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {columns.length > 0 && (
        <>
          {/* ================= MODE SWITCH ================= */}
          <div className="section">
            <div className="mode-group">
              <button
                className={mode === "remove" ? "active" : ""}
                onClick={() => {
                  setMode("remove");
                  setStatusMsg(null);
                  setPreviewData(null);
                  setResultBlob(null);
                  setResultFilename(null);
                }}
              >
                Remove Columns
              </button>
              <button
                className={mode === "rename" ? "active" : ""}
                onClick={() => {
                  setMode("rename");
                  setStatusMsg(null);
                  setPreviewData(null);
                  setResultBlob(null);
                  setResultFilename(null);
                }}
              >
                Rename Columns
              </button>
              <button
                className={mode === "replace" ? "active" : ""}
                onClick={() => {
                  setMode("replace");
                  setStatusMsg(null);
                  setPreviewData(null);
                  setResultBlob(null);
                  setResultFilename(null);
                }}
              >
                Replace Blanks
              </button>
            </div>
          </div>

          {/* ================= COLUMNS UI ================= */}
          <div className="section">
            {mode === "remove" ? (
              <>
                <h4>Select columns to remove</h4>
                <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                  <button className="secondary" onClick={() => setSelected([...columns])}>
                    Select All
                  </button>
                  <button className="secondary" onClick={() => setSelected([])}>
                    Deselect All
                  </button>
                </div>
                <div className="checkbox-grid">
                  {columns.map((col) => (
                    <label key={col} className="checkbox">
                      <input
                        type="checkbox"
                        checked={selected.includes(col)}
                        onChange={() => toggleColumn(col)}
                      />
                      {col}
                    </label>
                  ))}
                </div>
                <p style={{ marginTop: 8 }} className="desc">
                  Selected: {selected.length}
                </p>
              </>
            ) : mode === "rename" ? (
              <>
                <h4>Rename columns</h4>
                <div className="rename-list">
                  {columns.map((col) => (
                    <div key={col} className="rename-row">
                      <span title={col}>{col}</span>
                      <input
                        type="text"
                        placeholder="New name (optional)"
                        value={renameMap[col] || ""}
                        onChange={(e) => handleRenameChange(col, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4>Select columns to fill blank values</h4>
                <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                  <button className="secondary" onClick={() => setSelected([...columns])}>
                    Select All
                  </button>
                  <button className="secondary" onClick={() => setSelected([])}>
                    Deselect All
                  </button>
                </div>
                <div className="checkbox-grid">
                  {columns.map((col) => (
                    <label key={col} className="checkbox">
                      <input
                        type="checkbox"
                        checked={selected.includes(col)}
                        onChange={() => toggleColumn(col)}
                      />
                      {col}
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: 24 }}>
                  <h4>Replacement Value</h4>
                  <input
                    type="text"
                    placeholder="Enter value to replace blanks with"
                    value={replacementValue}
                    onChange={(e) => setReplacementValue(e.target.value)}
                    style={{ maxWidth: 300 }}
                  />
                </div>

                <p style={{ marginTop: 8 }} className="desc">
                  Selected: {selected.length} columns
                </p>
              </>
            )}
          </div>
        </>
      )}

      {/* ================= ACTION ================= */}
      <div className="section action" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button onClick={handleApply} disabled={loading || !file} className={resultBlob ? "secondary" : "primary"}>
          {loading ? "Processing..." : "Apply Changes"}
        </button>

        {resultBlob && (
          <button onClick={downloadResult} className="primary" style={{ background: "var(--primary)" }}>
            Download Result
          </button>
        )}
      </div>

      {statusMsg && (
        <div className="section" style={{ marginTop: 24, padding: "16px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <h4 style={{ color: "var(--primary)", marginTop: 0 }}>Success</h4>
          <p style={{ marginBottom: 0 }}>{statusMsg}</p>
        </div>
      )}

      {previewData && (
        <div className="section">
          <h4>Result Preview (First 5 lines)</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "8px", borderRight: "1px solid var(--border-color)" }}>{cell}</td>
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
