import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import FileMerger from "./pages/FileMerger";
import DateTimeConverter from "./pages/DateTimeConverter";
import ActivityLog from "./components/ActivityLog";
import type { LogEntry } from "./components/ActivityLog";
import { useState } from "react";

export default function App() {
  const [page, setPage] = useState<"convert" | "file" | "merge" | "datetime">("convert");
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
    <div className="layout-root">
      <div className="flex-responsive" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>💎 DataRefinery UAT</h2>
      </div>

      <div className="nav-tabs">
        <button
          className={page === "convert" ? "active" : ""}
          onClick={() => setPage("convert")}
        >
          📝 Text Transformer
        </button>
        <button
          className={page === "datetime" ? "active" : ""}
          onClick={() => setPage("datetime")}
        >
          📅 DateTime Converter
        </button>
        <button
          className={page === "file" ? "active" : ""}
          onClick={() => setPage("file")}
        >
          📦 Bulk File Editor
        </button>
        <button
          className={page === "merge" ? "active" : ""}
          onClick={() => setPage("merge")}
        >
          🔗 Advanced File Merger
        </button>
      </div>

      <div className="main-content">
        {page === "convert" && <Converter onLogAction={addLog} />}
        {page === "datetime" && <DateTimeConverter onLogAction={addLog} />}
        {page === "file" && <FileModify onLogAction={addLog} />}
        {page === "merge" && <FileMerger onLogAction={addLog} />}
      </div>

      <div className="app glass-card" style={{ marginTop: 48 }}>
        <ActivityLog logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}
