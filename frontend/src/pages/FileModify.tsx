import { useState, useCallback, useMemo, useEffect } from "react";
import { previewColumns, modifyFiles } from "../api/client";
import FileUpload from "../components/FileUpload";
import {
  File as FileIcon,
  Wrench,
  Download,
  Loader2,
  Zap,
  Search,
  Sparkles,
  Edit3,
  Trash2,
  Replace
} from "lucide-react";
import { downloadBlob } from "../utils/download";
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

const MODES = [
  { id: "remove", label: "Remove Columns", icon: Trash2, color: "var(--gradient-danger)" },
  { id: "rename", label: "Rename Columns", icon: Edit3, color: "var(--gradient-info)" },
  { id: "replace", label: "Replace Blanks", icon: Replace, color: "var(--gradient-warm)" },
] as const;

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
  const [loading, setLoading] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheet, setSheet] = useState<string | null>(null);
  const [applyAllSheets, setApplyAllSheets] = useState(false);

  const VERCEL_PAYLOAD_LIMIT = 100 * 1024 * 1024; // 100MB
  const PREVIEW_SLICE_SIZE = 1 * 1024 * 1024; // 1MB for preview

  const sliceFileForPreview = useCallback((file: File): Blob | File => {
    if (file.name.toLowerCase().endsWith('.csv') && file.size > PREVIEW_SLICE_SIZE) {
      return file.slice(0, PREVIEW_SLICE_SIZE);
    }
    return file;
  }, []);

  // Preview Fetching Logic
  const fetchPreview = useCallback(async (file: File, sheetName?: string | null): Promise<PreviewResponse | null> => {
    try {
      const previewFile = sliceFileForPreview(file);
      const data = await previewColumns(previewFile, sheetName);

      setColumns(data.columns);
      setSample(data.sample || null);
      if (data.sheets) setAvailableSheets(data.sheets);
      if (!sheetName && data.sheets?.[0]) setSheet(data.sheets[0]);
      return data;
    } catch (e) {
      console.error("Preview error:", e);
      notify('error', 'Preview Failed', e instanceof Error ? e.message : "Failed to load file preview");
      return null;
    }
  }, [notify, sliceFileForPreview]);

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

    const largeFile = files.find(f => f.size > VERCEL_PAYLOAD_LIMIT);
    if (largeFile) {
      notify('error', 'File Too Large', `"${largeFile.name}" exceeds the 100MB threshold. Please use the 'File Splitter' tool to divide your file into smaller parts first.`);
      return;
    }

    setLoading(true);
    const loadingId = notify('loading', 'Processing Files', `Applying ${mode} operation...`);

    try {
      const params: any = {
        sheetName: sheet,
        allSheets: applyAllSheets
      };

      if (mode === "remove" || mode === "replace") {
        params.columns = selected.join(",");
      }

      if (mode === "rename") {
        params.mapping = renameMap;
      }

      if (mode === "replace") {
        params.replacement = replacementValue;
      }

      const { blob, filename } = await modifyFiles(mode, files, params);

      downloadBlob(blob, filename);
      setResults([{ blob, filename }]);
      notify('success', 'Operation Complete', `Successfully processed ${files.length} file(s).`, 5000, loadingId);

      if (onLogAction) onLogAction(`File ${mode}`, filename, blob);
    } catch (e) {
      console.error("Processing error:", e);
      notify('error', 'Processing Failed', e instanceof Error ? e.message : "An error occurred.", 5000, loadingId);
    } finally {
      setLoading(false);
    }
  }, [files, mode, selected, renameMap, replacementValue, sheet, applyAllSheets, onLogAction, notify, VERCEL_PAYLOAD_LIMIT]);

  const downloadAll = useCallback(() => {
    results.forEach((r) => downloadBlob(r.blob, r.filename));
  }, [results]);

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
            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>SELECT FILES</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Upload CSV or Excel files to modify</p>
          </div>
        </div>
        <FileUpload files={files} onFilesSelected={setFiles} />
      </div>

      {files.length > 0 && columns.length > 0 && (
        <>
          {/* Mode Selector */}
          <div className="section slide-in-left" style={{ animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Wrench size={20} style={{ color: 'var(--primary)' }} />
              <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>CHOOSE OPERATION</h4>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '12px'
            }}>
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleModeChange(m.id as Mode)}
                    style={{
                      padding: '20px',
                      background: mode === m.id ? 'var(--primary-glow)' : 'var(--input-bg)',
                      border: mode === m.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: mode === m.id ? m.color : 'var(--card-bg)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: mode === m.id ? 'var(--primary)' : 'var(--text-main)' }}>
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration */}
          <div className="section slide-in-right" style={{ animationDelay: '0.2s', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: MODES.find(m => m.id === mode)?.color || 'var(--gradient-primary)',
              borderRadius: '24px 24px 0 0'
            }} />

            <div style={{ paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>CONFIGURATION</h4>
              </div>

              {availableSheets.length > 1 && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  background: 'var(--primary-glow)',
                  borderRadius: '12px',
                  border: '1px solid var(--primary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>Select Excel Sheet</label>
                    <label className="checkbox" style={{ padding: '4px 8px', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <input type="checkbox" checked={applyAllSheets} onChange={(e) => setApplyAllSheets(e.target.checked)} />
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>Apply to all sheets</span>
                    </label>
                  </div>
                  <select
                    value={sheet || ""}
                    onChange={(e) => setSheet(e.target.value)}
                    disabled={applyAllSheets}
                    style={{
                      width: '100%',
                      background: 'white',
                      opacity: applyAllSheets ? 0.5 : 1,
                      cursor: applyAllSheets ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {mode === "remove" && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      Select columns to remove ({selected.length} selected)
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="secondary" onClick={selectAllColumns} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                        Select All
                      </button>
                      <button className="secondary" onClick={deselectAllColumns} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                        Clear
                      </button>
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {columns.map((col) => (
                      <label key={col} className="checkbox">
                        <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleColumn(col)} />
                        {col}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {mode === "rename" && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      Enter new names for columns {activeRenamesCount > 0 && `(${activeRenamesCount} active)`}
                    </p>
                    <button className="secondary" onClick={clearAllRenames} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                      Clear All
                    </button>
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {columns.map((col) => (
                      <div key={col} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: 'var(--input-bg)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <span style={{ fontWeight: 700, minWidth: '140px', fontSize: '13px' }}>{col}</span>
                        <span style={{ opacity: 0.3, fontSize: '18px' }}>→</span>
                        <input
                          type="text"
                          placeholder="New column name..."
                          value={renameMap[col] || ""}
                          onChange={(e) => handleRenameChange(col, e.target.value)}
                          style={{ flex: 1, background: 'var(--card-bg)' }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {mode === "replace" && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      Select columns to check for blanks ({selected.length} selected)
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="secondary" onClick={selectAllColumns} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                        Select All
                      </button>
                      <button className="secondary" onClick={deselectAllColumns} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                        Clear
                      </button>
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginBottom: '20px'
                  }}>
                    {columns.map((col) => (
                      <label key={col} className="checkbox">
                        <input type="checkbox" checked={selected.includes(col)} onChange={() => toggleColumn(col)} />
                        {col}
                      </label>
                    ))}
                  </div>
                  <div className="input-group" style={{ maxWidth: '400px' }}>
                    <label>Replacement Value</label>
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
          </div>
        </>
      )}

      {/* Apply Button */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0', gap: '12px' }}>
        {results.length > 0 && (
          <button onClick={downloadAll} className="secondary" style={{
            padding: '18px 40px',
            fontSize: '16px',
            fontWeight: 700,
            borderRadius: '16px'
          }}>
            <Download size={20} />
            Download Result
          </button>
        )}
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
              Processing...
            </>
          ) : (
            <>
              <Zap size={20} />
              Apply Changes
            </>
          )}
        </button>
      </div>

      {/* Preview Table */}
      {sample && (
        <div className="section scale-in" style={{ animationDelay: '0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Search size={20} style={{ color: 'var(--primary)' }} />
            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>DATA PREVIEW</h4>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>(Top 5 rows)</span>
          </div>
          <div className="table-container">
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

      {/* Pro Tip */}
      <div className="tool-help-section scale-in" style={{ animationDelay: '0.4s' }}>
        <div className="tool-help-icon">
          <Sparkles size={24} />
        </div>
        <div className="tool-help-content">
          <h5>Pro Tip: Batch Operations</h5>
          <p>
            You can upload multiple files at once and apply the same operation to all of them.
            The tool will process them in batch and return a ZIP file with all modified files.
          </p>
        </div>
      </div>
    </div>
  );
}
