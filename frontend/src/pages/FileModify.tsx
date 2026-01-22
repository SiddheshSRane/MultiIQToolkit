
import { useState, useCallback, useMemo, useEffect } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
  File as FileIcon,
  Wrench,
  Settings,
  Rocket,
  Download,
  Loader2,
  Zap,
  Search
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";
import { useNotifications } from "../contexts/NotificationContext";

type SampleData = {
  headers: string[];
  rows: string[][];
};

type PreviewResponse = {
  columns: string[];
  sheets: string[] | null;
  sample?: SampleData;
};

type Mode = "remove" | "rename" | "replace";

type ProcessResult = {
  blob: Blob;
  filename: string;
};

interface FileModifyProps {
  onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

const API_ENDPOINTS = {
  PREVIEW: "/api/file/preview-columns",
  REMOVE: "/api/file/remove-columns",
  RENAME: "/api/file/rename-columns",
  REPLACE: "/api/file/replace-blanks",
} as const;

export default function FileModify({ onLogAction }: FileModifyProps) {
  const { notify } = useNotifications();
  const [files, setFiles] = useState<File[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [sample, setSample] = useState<SampleData | null>(null);
  const [mode, setMode] = useState<Mode>("remove");
  const [selected, setSelected] = useState<string[]>([]);
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  const [replacementValue, setReplacementValue] = useState("");
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [sheet, setSheet] = useState<string | null>(null);
  const [allSheets] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch column preview
  const fetchPreview = useCallback(async (file: File, sheetName?: string | null): Promise<PreviewResponse | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (sheetName) formData.append("sheet_name", sheetName);

      const response = await fetchWithAuth(API_ENDPOINTS.PREVIEW, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setColumns(data.columns);
      setSample(data.sample || null);
      if (!sheetName && data.sheets?.[0]) setSheet(data.sheets[0]);
      return data;
    } catch (e) {
      console.error("Preview error:", e);
      notify('error', 'Preview Failed', e instanceof Error ? e.message : "Failed to load file preview");
      return null;
    }
  }, [notify]);

  useEffect(() => {
    if (files[0]) {
      fetchPreview(files[0], sheet);
    } else {
      setColumns([]);
      setSample(null);
      setSheet(null);
    }
  }, [files, sheet, fetchPreview]);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    setResults([]);
  }, []);

  const toggleColumn = useCallback((col: string) => {
    setSelected((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }, []);

  const selectAllColumns = useCallback(() => setSelected([...columns]), [columns]);
  const deselectAllColumns = useCallback(() => setSelected([]), []);

  const handleRenameChange = useCallback((col: string, val: string) => {
    setRenameMap((prev) => ({ ...prev, [col]: val }));
  }, []);

  const clearAllRenames = useCallback(() => setRenameMap({}), []);
  const activeRenamesCount = useMemo(() => Object.values(renameMap).filter(v => v.trim() !== "").length, [renameMap]);

  const handleApply = useCallback(async () => {
    if (files.length === 0) {
      notify('error', 'Selection Required', "Please upload at least one file.");
      return;
    }

    setLoading(true);
    notify('loading', 'Processing', `Applying ${mode} operation to ${files.length} file(s)...`);

    try {
      const endpoint = API_ENDPOINTS[mode.toUpperCase() as keyof typeof API_ENDPOINTS];
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      if (mode === "remove" || mode === "replace") {
        selected.forEach((s) => formData.append("columns", s));
      }

      if (mode === "rename") {
        formData.append("rename_map", JSON.stringify(renameMap));
      }

      if (mode === "replace") {
        formData.append("value", replacementValue);
      }

      if (sheet) formData.append("sheet_name", sheet);
      formData.append("all_sheets", String(allSheets));

      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const outName = extractFilename(contentDisposition, files.length > 1 ? "processed_batch.zip" : files[0].name);

      downloadBlob(blob, outName);
      setResults([{ blob, filename: outName }]);
      notify('success', 'Operation Success', `Successfully processed ${files.length} file(s).`);

      if (onLogAction) onLogAction(`File ${mode}`, outName, blob);
    } catch (e) {
      console.error("Processing error:", e);
      notify('error', 'Processing Failed', e instanceof Error ? e.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [files, mode, selected, renameMap, replacementValue, sheet, allSheets, onLogAction, notify]);

  const downloadAll = useCallback(() => {
    results.forEach((r) => downloadBlob(r.blob, r.filename));
  }, [results]);

  return (
    <div className="app">
      <div className="section">
        <h4><FileIcon size={18} /> Select Files</h4>
        <FileUpload files={files} onFilesSelected={setFiles} />
      </div>

      {files.length > 0 && columns.length > 0 && (
        <>
          <div className="section">
            <h4><Wrench size={18} /> Choose Operation</h4>
            <div className="mode-group">
              <button className={mode === "remove" ? "active" : ""} onClick={() => handleModeChange("remove")}>Remove Columns</button>
              <button className={mode === "rename" ? "active" : ""} onClick={() => handleModeChange("rename")}>Rename Columns</button>
              <button className={mode === "replace" ? "active" : ""} onClick={() => handleModeChange("replace")}>Replace Blanks</button>
            </div>
          </div>

          <div className="section">
            <h4><Settings size={18} /> Configuration</h4>
            {mode === "remove" ? (
              <>
                <div className="flex-responsive" style={{ marginBottom: 16 }}>
                  <p className="desc" style={{ margin: 0 }}>Select columns to remove ({selected.length} selected):</p>
                  <div className="inline" style={{ gridTemplateColumns: 'auto auto' }}>
                    <button className="secondary" onClick={selectAllColumns}>All</button>
                    <button className="secondary" onClick={deselectAllColumns}>None</button>
                  </div>
                </div>
                <div className="checkbox-grid" style={{ maxHeight: "300px", overflowY: "auto" }}>
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
                <div className="flex-responsive" style={{ marginBottom: 16 }}>
                  <p className="desc" style={{ margin: 0 }}>Enter new names for the columns. {activeRenamesCount > 0 && `(${activeRenamesCount} active)`}</p>
                  <button className="secondary" onClick={clearAllRenames}>Clear All</button>
                </div>
                <div className="rename-list" style={{ maxHeight: "400px", overflowY: "auto", display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {columns.map((col) => (
                    <div key={col} className="rename-row">
                      <span title={col} style={{ fontWeight: 700, minWidth: 140 }}>{col}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                        <span style={{ opacity: 0.3 }}>→</span>
                        <input type="text" placeholder="New column name..." value={renameMap[col] || ""} onChange={(e) => handleRenameChange(col, e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex-responsive" style={{ marginBottom: 16 }}>
                  <p className="desc" style={{ margin: 0 }}>Select columns to check for blanks ({selected.length} selected):</p>
                  <div className="inline" style={{ gridTemplateColumns: 'auto auto' }}>
                    <button className="secondary" onClick={selectAllColumns}>All</button>
                    <button className="secondary" onClick={deselectAllColumns}>None</button>
                  </div>
                </div>
                <div className="checkbox-grid" style={{ maxHeight: "200px", overflowY: "auto", marginBottom: 20 }}>
                  {columns.map((col) => (
                    <label key={col} className="checkbox">
                      <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleColumn(col)} />
                      {col}
                    </label>
                  ))}
                </div>
                <div className="input-group" style={{ maxWidth: 400 }}>
                  <label>Replacement Value</label>
                  <input type="text" placeholder="e.g. N/A, 0, or [Missing]" value={replacementValue} onChange={(e) => setReplacementValue(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="section flex-responsive">
        <h4 style={{ margin: 0 }}><Rocket size={18} /> Ready?</h4>
        <div className="inline" style={{ gridTemplateColumns: 'auto auto' }}>
          {results.length > 0 && (
            <button onClick={downloadAll} className="secondary"><Download size={18} /> Download Result</button>
          )}
          <button onClick={handleApply} disabled={loading || files.length === 0} className="primary">
            {loading ? <Loader2 className="animate-spin" /> : <Zap />} Apply Changes
          </button>
        </div>
      </div>

      {sample && (
        <div className="section">
          <h4><Search size={18} /> Preview (Top 5 rows)</h4>
          <div className="table-container" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>{sample.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {sample.rows.map((row, i) => (
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
