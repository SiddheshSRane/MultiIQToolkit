
import { useCallback } from "react";

export type LogEntry = {
    id: string;
    timestamp: string;
    action: string;
    filename: string;
    blob: Blob;
};

interface ActivityLogProps {
    logs: LogEntry[];
    onClear: () => void;
}

export default function ActivityLog({ logs, onClear }: ActivityLogProps) {
    const download = useCallback((log: LogEntry) => {
        const url = URL.createObjectURL(log.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = log.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Clean up object URL after a delay to ensure download starts
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }, []);

    if (logs.length === 0) {
        return (
            <div className="activity-log-empty" role="status" aria-live="polite">
                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", margin: "24px 0" }}>
                    No actions recorded in this session.
                </p>
            </div>
        );
    }

    return (
        <div className="activity-log">
            <div className="flex-responsive" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0 }}>Session Activity ({logs.length})</h4>
                <button
                    className="text-btn"
                    style={{
                        fontSize: "12px",
                        background: "transparent",
                        color: "var(--primary)",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px"
                    }}
                    onClick={onClear}
                    aria-label="Clear activity history"
                >
                    Clear History
                </button>
            </div>
            <div className="log-list" style={{ maxHeight: "400px", overflowY: "auto" }} role="list">
                {logs.map((log) => (
                    <div
                        key={log.id}
                        className="log-item flex-responsive"
                        role="listitem"
                        style={{
                            padding: "12px",
                            background: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            marginBottom: "8px"
                        }}
                    >
                        <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                                {log.action}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                {log.timestamp} • {log.filename}
                            </div>
                        </div>
                        <button
                            className="secondary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => download(log)}
                            aria-label={`Download ${log.filename}`}
                        >
                            Download
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
