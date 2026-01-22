import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import FileMerger from "./pages/FileMerger";
import DateTimeConverter from "./pages/DateTimeConverter";
import JsonConverter from "./pages/JsonConverter";
import TemplateMapper from "./pages/TemplateMapper";
import QrFusion from "./pages/QrFusion";
import ActivityLog from "./components/ActivityLog";
import Auth from "./components/Auth";
import CommandPalette from "./components/CommandPalette";
import type { LogEntry } from "./components/ActivityLog";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNotifications } from "./contexts/NotificationContext";
import {
  Gem,
  LogOut,
  Hash,
  Clock,
  Edit3,
  Combine,
  FileCode,
  Columns,
  QrCode,
  Layout,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Lightbulb,
  Moon,
  Sun,
  Search
} from "lucide-react";

type PageType = "convert" | "file" | "merge" | "datetime" | "json" | "map" | "qr" | null;

const TOOL_INSIGHTS: Record<string, string> = {
  convert: "The Text Transformer uses high-speed streaming for large lists. Tip: Use 'Quoted CSV' preset for database imports.",
  datetime: "Always standardize your global logs to UTC using the 'ISO-8601' format for bulletproof data storage.",
  file: "Batch modification happens locally in your browser—your data never leaves your device. High-speed, high-privacy.",
  merge: "Optimized for merging massive datasets. Use the 'Unified Template' mode to ensure consistent column alignment.",
  json: "Transform legacy spreadsheets into modern API structures instantly. Supports deep-nested JSON validation.",
  map: "Perfect for ERP migrations. Create a visual bridge between source data and your target system schema.",
  qr: "Generate scannable, protocol-correct assets. Wi-Fi mode handles WPA/WPA2 protocol sculpting automatically.",
};

const TOOL_CONFIG: Record<string, { label: string; description: string; icon: any }> = {
  convert: {
    label: "Text Transformer",
    description: "Advanced text cleaning, case conversion, and multi-line formatting.",
    icon: Hash,
  },
  datetime: {
    label: "DateTime Helper",
    description: "Convert dates across timezones and standardize formats instantly.",
    icon: Clock,
  },
  file: {
    label: "File Modification",
    description: "Resize, rename, and add metadata to your documents and images.",
    icon: Edit3,
  },
  merge: {
    label: "File Merger",
    description: "Combines multiple PDF, Excel, or CSV files into a single unified document.",
    icon: Combine,
  },
  json: {
    label: "JSON Converter",
    description: "Transform raw data between JSON, CSV, and YAML with ease.",
    icon: FileCode,
  },
  map: {
    label: "Template Mapper",
    description: "Map complex datasets to predefined templates with visual field mapping.",
    icon: Columns,
  },
  qr: {
    label: "QR Fusion",
    description: "Generate branded QR codes with custom colors and logo embedding.",
    icon: QrCode,
  },
};

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { notify } = useNotifications();
  const [page, setPage] = useState<PageType>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !showCommandPalette && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showCommandPalette]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const addLog = useCallback((action: string, filename: string, blob: Blob) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      action,
      filename,
      blob,
    };
    setLogs((prev) => [newLog, ...prev]);
    notify('success', action, `Processed ${filename} successfully.`);
  }, [notify]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    notify('info', 'Activity Cleared', 'Your session history has been purged.');
  }, [notify]);

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

  const ActiveIcon = page ? TOOL_CONFIG[page].icon : null;

  return (
    <div className="layout-root">
      {/* Top Portal Header */}
      <header className="portal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="brand" onClick={() => setPage(null)} style={{ cursor: 'pointer' }}>
            <div className="brand-logo indigo-glow">
              <Gem size={28} />
            </div>
            <h1>DataRefinery</h1>
          </div>

          <div className="search-pill" onClick={() => setShowCommandPalette(true)}>
            <Search size={14} />
            <span>Search tools (/)</span>
          </div>
        </div>

        {user && (
          <div className="user-profile-compact">
            <button
              className="theme-toggle"
              onClick={() => setIsDark(!isDark)}
              style={{ background: 'transparent', border: 'none', padding: 8, color: 'var(--text-muted)' }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="divider" />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                {user.user_metadata?.full_name?.[0] || user.email?.[0].toUpperCase()}
              </div>
              <div className="user-info" style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-main)" }}>
                  {user.user_metadata?.full_name || "User"}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  {user.email}
                </span>
              </div>
            </div>
            <button className="logout-btn" onClick={() => signOut()} title="Sign out" style={{ padding: 8 }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      <main className="main-container">
        {!page ? (
          <div className="hub-workspace">
            <div className="hub-grid">
              {Object.entries(TOOL_CONFIG).map(([id, config]) => {
                const Icon = config.icon;
                return (
                  <div key={id} className="hub-card" onClick={() => setPage(id as PageType)}>
                    <div className="icon-box"><Icon size={24} /></div>
                    <div>
                      <h3>{config.label}</h3>
                      <p>{config.description}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                      Launch Tool <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>

            {logs.length > 0 && (
              <div style={{ marginTop: 64 }}>
                <ActivityLog logs={logs} onClear={clearLogs} />
              </div>
            )}
          </div>
        ) : (
          /* Active Tool View */
          <div className="tool-focused-view">
            <button className="back-btn" onClick={() => setPage(null)}>
              <ArrowLeft size={16} /> Back to Hub
            </button>

            <div className="tool-header-info">
              <div className="tool-icon-large">
                {ActiveIcon && <ActiveIcon size={32} />}
              </div>
              <div>
                <h2>{TOOL_CONFIG[page].label}</h2>
                <p>{TOOL_CONFIG[page].description}</p>
              </div>
            </div>

            <div key={page} className="page-enter">
              {page === "convert" && <Converter onLogAction={addLog} />}
              {page === "datetime" && <DateTimeConverter onLogAction={addLog} />}
              {page === "file" && <FileModify onLogAction={addLog} />}
              {page === "merge" && <FileMerger onLogAction={addLog} />}
              {page === "json" && <JsonConverter onLogAction={addLog} />}
              {page === "map" && <TemplateMapper onLogAction={addLog} />}
              {page === "qr" && <QrFusion onLogAction={addLog} />}
            </div>

            {/* Tool Help Section */}
            <div className="tool-help-section">
              <div className="tool-help-icon">
                <Lightbulb size={24} />
              </div>
              <div className="tool-help-content">
                <h5>Refinery Insight</h5>
                <p>{TOOL_INSIGHTS[page]}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Dock */}
      <nav className="nav-dock">
        <button
          className={!page ? "active" : ""}
          onClick={() => setPage(null)}
          title="Home Hub"
        >
          <Layout size={20} />
        </button>
        <div className="dock-divider" />
        {Object.entries(TOOL_CONFIG).map(([id, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id as PageType)}
              title={config.label}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </nav>

      <footer style={{ position: 'fixed', bottom: 12, right: 24, color: "var(--text-muted)", fontSize: "11px", opacity: 0.5 }}>
        v1.3.0 Master Edition
      </footer>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelect={(id) => setPage(id as PageType)}
        tools={Object.entries(TOOL_CONFIG).map(([id, config]) => ({ id, ...config }))}
      />
    </div>
  );
}
