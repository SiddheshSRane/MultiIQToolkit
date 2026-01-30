import Converter from "./pages/Converter";
import Hub from "./pages/Hub";
import FileModify from "./pages/FileModify";
import FileMerger from "./pages/FileMerger";
import DateTimeConverter from "./pages/DateTimeConverter";
import JsonConverter from "./pages/JsonConverter";
import TemplateMapper from "./pages/TemplateMapper";
import QrFusion from "./pages/QrFusion";
import DiffChecker from "./pages/DiffChecker";
import Auth from "./components/Auth";
import type { LogEntry } from "./components/ActivityLog";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
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
  Loader2,
  ArrowLeft,
  Lightbulb,
  Moon,
  Sun,
  GitCompare,
  Zap
} from "lucide-react";

type PageType = "convert" | "file" | "merge" | "datetime" | "json" | "map" | "qr" | "diff" | null;

const TOOL_INSIGHTS: Record<string, string> = {
  convert: "The Text Transformer uses high-speed streaming for large lists. Tip: Use 'Quoted CSV' preset for database imports.",
  datetime: "Always standardize your global logs to UTC using the 'ISO-8601' format for bulletproof data storage.",
  file: "Batch modification happens locally in your browser—your data never leaves your device. High-speed, high-privacy.",
  merge: "Optimized for merging massive datasets. Use the 'Unified Template' mode to ensure consistent column alignment.",
  json: "Transform legacy spreadsheets into modern API structures instantly. Supports deep-nested JSON validation.",
  map: "Perfect for ERP migrations. Create a visual bridge between source data and your target system schema.",
  qr: "Generate scannable, protocol-correct assets. Wi-Fi mode handles WPA/WPA2 protocol sculpting automatically.",
  diff: "Visualizing code differences side-by-side helps catch regression bugs before they hit regression testing.",
};


export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { notify } = useNotifications();
  const [page, setPage] = useState<PageType>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [theme, setTheme] = useState<string>('modern');

  useEffect(() => {
    if (user) {
      const savedTheme = user.user_metadata?.theme || 'modern';
      setTheme(savedTheme);

      const fetchLogs = async () => {
        try {
          const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (data && !error) {
            setLogs(data.map((l: any) => ({
              id: l.id,
              timestamp: new Date(l.created_at).toLocaleTimeString(),
              action: l.action,
              filename: l.filename,
              blob: undefined
            })));
          }
        } catch (e) {
          console.error("Failed to fetch logs:", e);
        }
      };
      fetchLogs();
    }
  }, [user]);


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const addLog = useCallback(async (action: string, filename: string, blob: Blob) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      action,
      filename,
      blob,
    };
    setLogs((prev) => [newLog, ...prev]);
    notify('success', action, `Processed ${filename} successfully.`);

    if (user) {
      try {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action,
          filename
        });
      } catch (e) {
        console.error("Failed to persist log:", e);
      }
    }
  }, [notify, user]);

  const clearLogs = useCallback(async () => {
    setLogs([]);
    if (user) {
      const { error } = await supabase.from('activity_logs').delete().eq('user_id', user.id);
      if (error) console.error("Error clearing logs:", error);
    }
    notify('info', 'Activity Cleared', 'Your session history has been purged.');
  }, [notify, user]);

  const cycleTheme = async () => {
    const themes = ['modern', 'dark', 'cyberpunk', 'retro', 'midnight'];
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(nextTheme);
    if (user) {
      await supabase.auth.updateUser({ data: { theme: nextTheme } });
    }
  };

  if (authLoading) {
    return (
      <div className="layout-root" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Loader2 className="animate-spin" size={48} style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!user) return <Auth />;

  const getThemeIcon = () => {
    if (theme === 'cyberpunk') return <Zap size={20} />;
    if (theme === 'retro') return <Hash size={20} />;
    if (['midnight', 'dark'].includes(theme)) return <Moon size={20} />;
    return <Sun size={20} />;
  };

  return (
    <div className="layout-root">
      <header className="portal-header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <div className="brand" onClick={() => setPage(null)} style={{ cursor: 'pointer', marginRight: 40, display: 'flex', alignItems: 'center' }}>
              <h1 style={{ margin: 0, padding: 0, background: 'transparent', WebkitTextFillColor: 'initial', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 900 }}>
                <Gem size={24} color="#e11d48" /> DATA<span style={{ color: '#e11d48' }}>REFINERY</span>
              </h1>
            </div>

            <nav className="nav-menu">
              <div className={`nav-item ${page === 'convert' || page === 'diff' ? 'active' : ''}`}>
                TEXT TOOLS
                <div className="mega-menu" style={{ minWidth: 280 }}>
                  <div className="menu-list">
                    <div className="menu-link" onClick={() => setPage('convert')}>
                      <Hash size={18} color="#6366f1" />
                      <span>Text Transformer</span>
                    </div>
                    <div className="menu-link" onClick={() => setPage('diff')}>
                      <GitCompare size={18} color="#f97316" />
                      <span>Code Comparer</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`nav-item ${['file', 'merge', 'map'].includes(page || '') ? 'active' : ''}`}>
                FILE OPERATIONS
                <div className="mega-menu" style={{ width: 450, gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <span className="menu-section-title">Modify & Organize</span>
                    <div className="menu-list">
                      <div className="menu-link" onClick={() => setPage('file')}>
                        <Edit3 size={18} color="#f59e0b" />
                        <span>File Modification</span>
                      </div>
                      <div className="menu-link" onClick={() => setPage('merge')}>
                        <Combine size={18} color="#8b5cf6" />
                        <span>File Merger</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="menu-section-title">Visual Mapping</span>
                    <div className="menu-list">
                      <div className="menu-link" onClick={() => setPage('map')}>
                        <Columns size={18} color="#ec4899" />
                        <span>Template Mapper</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`nav-item ${['json', 'datetime'].includes(page || '') ? 'active' : ''}`}>
                CONVERTERS
                <div className="mega-menu" style={{ minWidth: 280 }}>
                  <div className="menu-list">
                    <div className="menu-link" onClick={() => setPage('json')}>
                      <FileCode size={18} color="#10b981" />
                      <span>JSON Converter</span>
                    </div>
                    <div className="menu-link" onClick={() => setPage('datetime')}>
                      <Clock size={18} color="#06b6d4" />
                      <span>DateTime Helper</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`nav-item ${page === 'qr' ? 'active' : ''}`}>
                UTILITIES
                <div className="mega-menu" style={{ minWidth: 240 }}>
                  <div className="menu-list">
                    <div className="menu-link" onClick={() => setPage('qr')}>
                      <QrCode size={18} color="#ef4444" />
                      <span>QR Fusion</span>
                    </div>
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {user && (
            <div className="user-profile-compact">
              <button className="theme-toggle" onClick={cycleTheme} style={{ background: 'transparent', border: 'none', padding: 8, color: 'var(--text-muted)' }}>
                {getThemeIcon()}
              </button>
              <div className="divider" />
              <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                {user.user_metadata?.full_name?.[0] || user.email?.[0].toUpperCase()}
              </div>
              <button className="logout-btn" onClick={() => signOut()} title="Sign out" style={{ padding: 8 }}>
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-container">
        {page ? (
          <div className="tool-focused-view slide-in-bottom">
            <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn-ghost"
                onClick={() => setPage(null)}
                style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: 0 }}
              >
                <ArrowLeft size={16} /> BACK TO DASHBOARD
              </button>
            </div>

            <div key={page} className="page-enter">
              {page === "convert" && <Converter onLogAction={addLog} />}
              {page === "datetime" && <DateTimeConverter onLogAction={addLog} />}
              {page === "file" && <FileModify onLogAction={addLog} />}
              {page === "merge" && <FileMerger onLogAction={addLog} />}
              {page === "json" && <JsonConverter onLogAction={addLog} />}
              {page === "map" && <TemplateMapper onLogAction={addLog} />}
              {page === "qr" && <QrFusion onLogAction={addLog} />}
              {page === "diff" && <DiffChecker />}
            </div>

            <div className="tool-help-section" style={{ marginTop: 40 }}>
              <div className="tool-help-icon"><Lightbulb size={24} /></div>
              <div className="tool-help-content">
                <h5>Refinery Insight</h5>
                <p>{TOOL_INSIGHTS[page]}</p>
              </div>
            </div>
          </div>
        ) : (
          <Hub setPage={setPage} logs={logs} onClearLogs={clearLogs} />
        )}
      </main>
    </div>
  );
}
