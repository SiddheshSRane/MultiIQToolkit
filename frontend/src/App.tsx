import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import FileMerger from "./pages/FileMerger";
import DateTimeConverter from "./pages/DateTimeConverter";
import JsonConverter from "./pages/JsonConverter";
import TemplateMapper from "./pages/TemplateMapper";
import ActivityLog from "./components/ActivityLog";
import type { LogEntry } from "./components/ActivityLog";
import { useState } from "react";
import {
  Gem,
  FileText,
  Calendar,
  Box,
  Layers,
  Braces,
  LayoutTemplate
} from "lucide-react";

export default function App() {
  const [page, setPage] = useState<"convert" | "file" | "merge" | "datetime" | "json" | "map">("convert");
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
        <h2 style={{ display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
          <Gem className="text-primary" size={28} />
          DataRefinery
        </h2>
      </div>

      <div className="nav-tabs">
        <button
          className={page === "convert" ? "active" : ""}
          onClick={() => setPage("convert")}
        >
          <FileText size={18} />
          Text Transformer
        </button>
        <button
          className={page === "datetime" ? "active" : ""}
          onClick={() => setPage("datetime")}
        >
          <Calendar size={18} />
          DateTime Converter
        </button>
        <button
          className={page === "file" ? "active" : ""}
          onClick={() => setPage("file")}
        >
          <Box size={18} />
          Bulk File Editor
        </button>
        <button
          className={page === "merge" ? "active" : ""}
          onClick={() => setPage("merge")}
        >
          <Layers size={18} />
          Advanced File Merger
        </button>
        <button
          className={page === "json" ? "active" : ""}
          onClick={() => setPage("json")}
        >
          <Braces size={18} />
          JSON Converter
        </button>
        <button
          className={page === "map" ? "active" : ""}
          onClick={() => setPage("map")}
        >
          <LayoutTemplate size={18} />
          Template Mapper
        </button>
      </div>

      <div className="main-content">
        {page === "convert" && <Converter onLogAction={addLog} />}
        {page === "datetime" && <DateTimeConverter onLogAction={addLog} />}
        {page === "file" && <FileModify onLogAction={addLog} />}
        {page === "merge" && <FileMerger onLogAction={addLog} />}
        {page === "json" && <JsonConverter onLogAction={addLog} />}
        {page === "map" && <TemplateMapper onLogAction={addLog} />}
      </div>

      <div className="app glass-card" style={{ marginTop: 48 }}>
        <ActivityLog logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}
