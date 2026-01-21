import { useState, useCallback, useMemo } from "react";
import { fetchWithAuth } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
  Box,
  File as FileIcon,
  Wrench,
  Settings,
  Rocket,
  Download,
  Loader2,
  Zap,
  CheckCircle,
  Search,
  AlertCircle
} from "lucide-react";
import { downloadBlob, extractFilename } from "../utils/download";
import { parseApiError } from "../utils/apiError";

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

// Constants
const API_ENDPOINTS = {
  PREVIEW: "/api/file/preview-columns",
  REMOVE: "/api/file/remove-columns",
  RENAME: "/api/file/rename-columns",
  REPLACE: "/api/file/replace-blanks",
} as const;

const ERROR_MESSAGES = {
  NO_FILES: "Please upload at least one file.",
  NO_COLUMNS_SELECTED: "Select columns to remove",
  NO_RENAME_ENTRIES: "Enter at least one rename",
  NO_REPLACEMENT_VALUE: "Enter a replacement value",
  PREVIEW_FAILED: "Failed to preview file",
  NETWORK_ERROR: "Network error: Failed to fetch preview.",
  PROCESSING_FAILED: "Processing failed",
  UNKNOWN_ERROR: "An error occurred during processing.",
} as const;

export default function FileModify({ onLogAction }: FileModifyProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [sample, setSample] = useState<SampleData | null>(null);
  const [mode, setMode] = useState<Mode>("remove");
  const [selected, setSelected] = useState<string[]>([]);
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  const [replacementValue, setReplacementValue] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [sheets, setSheets] = useState<string[] | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [allSheets, setAllSheets] = useState(false);
  const [loading, setLoading] = useState(false);

  // Utility function to show error message
  const showError = useCallback((message: string) => {
    setErrorMsg(message);
    setStatusMsg(null);
    setTimeout(() => setErrorMsg(null), 7000);
  }, []);

  // Utility function to show success message
  const showSuccess = useCallback((message: string) => {
    setStatusMsg(message);
    setErrorMsg(null);
  }, []);

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

      const data: PreviewResponse = await response.json();

      if (!data.columns || !Array.isArray(data.columns)) {
        throw new Error("Invalid preview response: missing columns");
      }

      setColumns(data.columns);
      setSheets(data.sheets);
      if (data.sample) {
        setSample(data.sample);
      }
      return data;
    } catch (error) {
      console.error("Preview error:", error);
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR;
      showError(message);
      return null;
    }
  }, [showError]);

  // Handle file upload
  const handleFileChange = useCallback(async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setSelected([]);
    setRenameMap({});
    setReplacementValue("");
    setColumns([]);
    setSheets(null);
    setSheet(null);
    setStatusMsg(null);
    setErrorMsg(null);
    setSample(null);
    setResults([]);

    if (selectedFiles.length === 0) return;

    const firstFile = selectedFiles[0];
    const previewData = await fetchPreview(firstFile);

    if (previewData) {
      const firstSheet = previewData.sheets?.[0] ?? null;
      setSheet(firstSheet);
    }
  }, [fetchPreview]);

  const toggleColumn = useCallback((col: string) => {
    setSelected((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }, []);

  const handleRenameChange = useCallback((col: string, newVal: string) => {
    setRenameMap((prev) => {
      const updated = { ...prev };
      if (newVal.trim() === "") {
        delete updated[col];
      } else {
        updated[col] = newVal;
      }
      return updated;
    });
  }, []);

  const selectAllColumns = useCallback(() => {
    setSelected([...columns]);
  }, [columns]);

  const deselectAllColumns = useCallback(() => {
    setSelected([]);
  }, []);

  const clearAllRenames = useCallback(() => {
    setRenameMap({});
  }, []);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    setResults([]);
    setStatusMsg(null);
    setErrorMsg(null);
  }, []);

  const validateInputs = useCallback((): string | null => {
    if (files.length === 0) return ERROR_MESSAGES.NO_FILES;
    if (mode === "remove" && selected.length === 0) return ERROR_MESSAGES.NO_COLUMNS_SELECTED;
    if (mode === "rename") {
      const activeRenames = Object.fromEntries(
        Object.entries(renameMap).filter(([, v]) => v && v.trim() !== "")
      );
      if (Object.keys(activeRenames).length === 0) return ERROR_MESSAGES.NO_RENAME_ENTRIES;
    }
    if (mode === "replace") {
      if (!replacementValue.trim()) return ERROR_MESSAGES.NO_REPLACEMENT_VALUE;
      if (selected.length === 0) return ERROR_MESSAGES.NO_COLUMNS_SELECTED;
    }
    return null;
  }, [files.length, mode, selected, renameMap, replacementValue]);

  const handleApply = useCallback(async () => {
    const validationError = validateInputs();
    if (validationError) {
      showError(validationError);
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (sheet) formData.append("sheet_name", sheet);
      formData.append("all_sheets", String(allSheets));

      let endpoint = "";
      if (mode === "remove") {
        endpoint = API_ENDPOINTS.REMOVE;
        formData.append("columns", selected.join(","));
      } else if (mode === "rename") {
        endpoint = API_ENDPOINTS.RENAME;
        const activeRenames = Object.fromEntries(
          Object.entries(renameMap).filter(([, v]) => v && v.trim() !== "")
        );
        formData.append("mapping", JSON.stringify(activeRenames));
      } else {
        endpoint = API_ENDPOINTS.REPLACE;
        formData.append("columns", selected.join(","));
        formData.append("replacement", replacementValue);
      }

      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType) throw new Error("Server response missing content type");

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Server returned empty file");

      const contentDisposition = response.headers.get("content-disposition");
      const defaultName = files.length > 1
        ? `data_refinery_batch_${Date.now()}.zip`
        : files[0].name.replace(/\.[^/.]+$/, "") + "_modified" + (files[0].name.match(/\.[^/.]+$/) || [".csv"])[0];
      const outputFilename = extractFilename(contentDisposition, defaultName);

      const result: ProcessResult = { blob, filename: outputFilename };
      setResults([result]);
      showSuccess(`Successfully processed ${files.length} file(s). Result: ${outputFilename}`);

      downloadBlob(blob, outputFilename);

      if (onLogAction) {
        const actionName = `${mode.charAt(0).toUpperCase() + mode.slice(1)} Columns`;
        onLogAction(actionName, outputFilename, blob);
      }
    } catch (error) {
      console.error("Apply error:", error);
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      showError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [files, sheet, allSheets, mode, selected, renameMap, replacementValue, validateInputs, showError, showSuccess, onLogAction]);

  const downloadAll = useCallback(() => {
    results.forEach((res) => {
      downloadBlob(res.blob, res.filename);
    });
  }, [results]);

  const handleSheetChange = useCallback(async (newSheet: string) => {
    if (!files[0]) return;
    setSheet(newSheet);
    setSelected([]);
    setRenameMap({});
    setSample(null);
    await fetchPreview(files[0], newSheet);
  }, [files, fetchPreview]);

  const activeRenamesCount = useMemo(() => {
    return Object.values(renameMap).filter((v) => v && v.trim() !== "").length;
  }, [renameMap]);

  return (
    <div className="app glass-card">
      <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Box className="text-primary" />
        Bulk File Editor
      </h2>
      <p className="desc">
        Bulk modify columns across multiple CSV/Excel files. Upload, configure, and apply.
      </p>

      <div className="section">
        <h4>
          <FileIcon size={18} /> Select Files
        </h4>
        <FileUpload
          files={files}
          onFilesSelected={handleFileChange}
        />

        {sheets && (
          <div className="form-grid" style={{ marginTop: 20 }}>
            <div className="input-group">
              <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>
                Target Sheet
              </label>
              <select
                disabled={allSheets}
                value={sheet ?? ""}
                onChange={(e) => handleSheetChange(e.target.value)}
                aria-label="Select target sheet"
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <label className="checkbox" style={{ alignSelf: "end" }}>
              <input
                type="checkbox"
                checked={allSheets}
                onChange={(e) => setAllSheets(e.target.checked)}
                aria-label="Apply to all sheets"
              />
              Apply to All Sheets (Excel)
            </label>
          </div>
        )}
      </div>

      {files.length > 0 && columns.length > 0 && (
        <>
          <div className="section">
            <h4>
              <Wrench size={18} /> Choose Operation
            </h4>
            <div className="mode-group" style={{ marginBottom: 8 }}>
              <button
                className={mode === "remove" ? "active" : ""}
                onClick={() => handleModeChange("remove")}
                aria-pressed={mode === "remove"}
              >
                Remove Columns
              </button>
              <button
                className={mode === "rename" ? "active" : ""}
                onClick={() => handleModeChange("rename")}
                aria-pressed={mode === "rename"}
              >
                Rename Columns
              </button>
              <button
                className={mode === "replace" ? "active" : ""}
                onClick={() => handleModeChange("replace")}
                aria-pressed={mode === "replace"}
              >
                Replace Blanks
              </button>
            </div>
          </div>

          <div className="section">
            <h4>
              <Settings size={18} /> Configuration
            </h4>
            {mode === "remove" ? (
              <>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="desc" style={{ margin: 0 }}>
                    Select columns to remove ({selected.length} selected):
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={selectAllColumns}>All</button>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={deselectAllColumns}>None</button>
                  </div>
                </div>
                <div className="checkbox-grid" style={{ maxHeight: "250px", overflowY: "auto", padding: "4px" }}>
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
              </>
            ) : mode === "rename" ? (
              <>
                <div className="flex-responsive" style={{ marginBottom: 16 }}>
                  <p className="desc" style={{ margin: 0 }}>
                    Enter new names for the columns you wish to rename. Others will remain unchanged.
                    {activeRenamesCount > 0 && ` (${activeRenamesCount} rename${activeRenamesCount > 1 ? "s" : ""} configured)`}
                  </p>
                  <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={clearAllRenames}>Clear All</button>
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
                <div className="flex-responsive" style={{ marginBottom: 16 }}>
                  <p className="desc" style={{ margin: 0 }}>
                    Select columns to check for blanks ({selected.length} selected):
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={selectAllColumns}>All</button>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={deselectAllColumns}>None</button>
                  </div>
                </div>
                <div className="checkbox-grid" style={{ maxHeight: "180px", overflowY: "auto", marginBottom: 20 }}>
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
                <div style={{ maxWidth: 400 }}>
                  <label style={{ display: "block", marginBottom: 8, fontSize: "13px", fontWeight: 600 }}>Replacement Value</label>
                  <input
                    type="text"
                    placeholder="e.g. N/A, 0, or [Missing]"
                    value={replacementValue}
                    onChange={(e) => setReplacementValue(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="section flex-responsive">
        <h4 style={{ margin: 0 }}><Rocket size={18} /> Ready?</h4>
        <div style={{ display: "flex", gap: "12px" }}>
          {results.length > 0 && (
            <button onClick={downloadAll} className="secondary">
              <Download size={18} /> Download {results.length} File{results.length > 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={handleApply}
            disabled={loading || files.length === 0 || columns.length === 0}
            className="primary"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={18} /> Processing...</>
            ) : (
              <><Zap size={18} /> Apply to {files.length} File{files.length > 1 ? "s" : ""}</>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="section" style={{ borderLeft: "4px solid var(--danger)", background: "rgba(244, 63, 94, 0.05)" }}>
          <h4 style={{ color: "var(--text-main)", textTransform: "none", marginBottom: 8 }}>
            <AlertCircle size={18} /> Error
          </h4>
          <p className="desc" style={{ marginBottom: 0, color: "var(--danger)" }}>{errorMsg}</p>
        </div>
      )}

      {statusMsg && (
        <div className="section" style={{ borderLeft: "4px solid var(--primary)", background: "rgba(99, 102, 241, 0.05)" }}>
          <h4 style={{ color: "var(--text-main)", textTransform: "none", marginBottom: 8 }}>
            <CheckCircle size={18} /> Success
          </h4>
          <p className="desc" style={{ marginBottom: 0 }}>{statusMsg}</p>
        </div>
      )}

      {sample && (
        <div className="section">
          <h4><Search size={18} /> Data Preview (Top 5 rows of {files[0]?.name})</h4>
          <div className="table-container" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  {sample.headers.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {sample.rows.map((row, i) => (
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
