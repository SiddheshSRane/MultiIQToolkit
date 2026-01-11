

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
    const download = (log: LogEntry) => {
        const url = URL.createObjectURL(log.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = log.filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (logs.length === 0) {
        return (
            <div className="activity-log-empty">
                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", margin: "24px 0" }}>
                    No actions recorded in this session.
                </p>
            </div>
        );
    }

    return (
        <div className="activity-log">
            <div className="flex-responsive" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: 0 }}>Session Activity</h4>
                <button className="text-btn" style={{ fontSize: "12px", background: "transparent", color: "var(--primary)", border: "none", cursor: "pointer" }} onClick={onClear}>Clear History</button>
            </div>
            <div className="log-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {logs.map((log) => (
                    <div key={log.id} className="log-item flex-responsive" style={{
                        padding: "12px",
                        background: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        marginBottom: "8px"
                    }}>
                        <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>{log.action}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{log.timestamp} • {log.filename}</div>
                        </div>
                        <button className="secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => download(log)}>
                            Download
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
