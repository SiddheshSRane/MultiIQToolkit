import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import FileMerger from "./pages/FileMerger";
import ActivityLog from "./components/ActivityLog";
import type { LogEntry } from "./components/ActivityLog";
import { useState } from "react";

export default function App() {
  const [page, setPage] = useState<"convert" | "file" | "merge">("convert");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (action: string, filename: string, blob: Blob) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      action,
      filename,
      blob,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="app">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>MiniIQ Toolkit</h2>
      </div>

      <div className="nav-tabs">
        <button
          className={page === "convert" ? "active" : ""}
          onClick={() => setPage("convert")}
        >
          Text Transformer
        </button>
        <button
          className={page === "file" ? "active" : ""}
          onClick={() => setPage("file")}
        >
          Bulk File Editor
        </button>
        <button
          className={page === "merge" ? "active" : ""}
          onClick={() => setPage("merge")}
        >
          Advanced File Merger
        </button>
      </div>

      <div className="main-content">
        {page === "convert" && <Converter onLogAction={addLog} />}
        {page === "file" && <FileModify onLogAction={addLog} />}
        {page === "merge" && <FileMerger onLogAction={addLog} />}
      </div>

      <div className="section" style={{ marginTop: 40, borderTop: "2px solid var(--border-color)", paddingTop: 32 }}>
        <ActivityLog logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}
