
import { useCallback } from "react";
import { Clock, Trash2, Download, FileText } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";

export type LogEntry = {
    id: string;
    timestamp: string;
    action: string;
    filename: string;
    blob?: Blob;
};

interface ActivityLogProps {
    logs: LogEntry[];
    onClear: () => void;
}

export default function ActivityLog({ logs, onClear }: ActivityLogProps) {
    const { notify } = useNotifications();

    const download = useCallback((log: LogEntry) => {
        if (!log.blob) {
            notify('info', 'Export Unavailable', 'Processed files are only downloadable in this session.');
            return;
        }
        const url = URL.createObjectURL(log.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = log.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        notify('info', 'File Exported', `Downloading ${log.filename}...`);
    }, [notify]);

    const handleClear = () => {
        onClear();
    };

    if (logs.length === 0) {
        return (
            <div className="section" style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                <Clock size={40} style={{ marginBottom: 16 }} />
                <p>No refinement activity recorded in this session.</p>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="flex-responsive" style={{ marginBottom: 32, alignItems: "center" }}>
                <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "16px" }}>
                    <div className="icon-box" style={{ margin: 0 }}>
                        <Clock size={24} />
                    </div>
                    Session History
                    <span style={{
                        fontSize: 14,
                        background: 'var(--primary-glow)',
                        color: 'var(--primary)',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontWeight: 800
                    }}>
                        {logs.length}
                    </span>
                </h2>
                <button className="secondary" onClick={handleClear}>
                    <Trash2 size={16} /> Purge Records
                </button>
            </div>

            <div className="hub-grid" style={{ gridTemplateColumns: '1fr' }}>
                {logs.map((log) => (
                    <div key={log.id} className="hub-card" style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: '20px 24px',
                        borderRadius: 20
                    }}>
                        <div className="icon-box" style={{ background: 'var(--bg-app)', color: 'var(--text-muted)' }}>
                            <FileText size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 16, margin: 0 }}>{log.action}</h3>
                            <p style={{ fontSize: 13, margin: '4px 0 0 0', opacity: 0.7 }}>
                                {log.timestamp} • {log.filename}
                            </p>
                        </div>
                        <button className="secondary" onClick={() => download(log)} style={{ padding: '10px 20px' }}>
                            <Download size={14} /> Export
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
