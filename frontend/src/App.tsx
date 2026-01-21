import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import FileMerger from "./pages/FileMerger";
import DateTimeConverter from "./pages/DateTimeConverter";
import JsonConverter from "./pages/JsonConverter";
import TemplateMapper from "./pages/TemplateMapper";
import ActivityLog from "./components/ActivityLog";
import Auth from "./components/Auth";
import type { LogEntry } from "./components/ActivityLog";
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "./contexts/AuthContext";
import {
  Gem,
  FileText,
  Calendar,
  Box,
  Layers,
  Braces,
  LayoutTemplate,
  LogOut,
  User,
  Loader2
} from "lucide-react";

type PageType = "convert" | "file" | "merge" | "datetime" | "json" | "map";

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [page, setPage] = useState<PageType>("convert");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((action: string, filename: string, blob: Blob) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      action,
      filename,
      blob,
    };
    setLogs((prev) => [newLog, ...prev]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handlePageChange = useCallback((newPage: PageType) => {
    setPage(newPage);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setLogs([]);
  }, [signOut]);

  const navItems = useMemo(() => [
    { id: "convert" as PageType, icon: FileText, label: "Text Transformer" },
    { id: "datetime" as PageType, icon: Calendar, label: "DateTime Converter" },
    { id: "file" as PageType, icon: Box, label: "Bulk File Editor" },
    { id: "merge" as PageType, icon: Layers, label: "Advanced File Merger" },
    { id: "json" as PageType, icon: Braces, label: "JSON Converter" },
    { id: "map" as PageType, icon: LayoutTemplate, label: "Template Mapper" },
  ], []);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="layout-root" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 className="animate-spin" size={48} style={{ color: "var(--primary)", marginBottom: "16px" }} />
          <p className="desc">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth component if not authenticated
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="layout-root">
      <div className="flex-responsive" style={{ marginBottom: 24 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
          <Gem className="text-primary" size={28} />
          DataRefinery
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "14px" }}>
            <User size={16} />
            <span>{user.email}</span>
          </div>
          <button
            className="secondary"
            onClick={handleSignOut}
            style={{ padding: "8px 16px", fontSize: "13px" }}
            aria-label="Sign out"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      <nav className="nav-tabs" role="tablist" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => handlePageChange(item.id)}
              role="tab"
              aria-selected={page === item.id}
              aria-controls={`panel-${item.id}`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="main-content" role="tabpanel">
        {page === "convert" && <Converter onLogAction={addLog} />}
        {page === "datetime" && <DateTimeConverter onLogAction={addLog} />}
        {page === "file" && <FileModify onLogAction={addLog} />}
        {page === "merge" && <FileMerger onLogAction={addLog} />}
        {page === "json" && <JsonConverter onLogAction={addLog} />}
        {page === "map" && <TemplateMapper onLogAction={addLog} />}
      </div>

      <div className="app glass-card" style={{ marginTop: 48 }}>
        <ActivityLog logs={logs} onClear={clearLogs} />
      </div>
      <div style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)", fontSize: "12px", opacity: 0.7 }}>
        v1.0.1 (Light Mode)
      </div>
    </div>
  );
}
