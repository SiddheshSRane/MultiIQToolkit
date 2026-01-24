import { useState, useEffect } from 'react';
import {
    Activity,
    Shield,
    Clock,
    ChevronRight,
    Hash,
    Edit3,
    Combine,
    FileCode,
    Columns,
    QrCode,
    GitCompare,
    Cpu,
    Lightbulb
} from "lucide-react";

interface HubProps {
    setPage: (page: any) => void;
    logs: any[];
    onClearLogs: () => void;
}

const TOOL_CONFIG: Record<string, { label: string; description: string; icon: any; color: string; badge?: string }> = {
    convert: {
        label: "Text Transformer",
        description: "Advanced text cleaning streams.",
        icon: Hash,
        color: "#6366f1"
    },
    datetime: {
        label: "DateTime Helper",
        description: "Global timezone synchronization.",
        icon: Clock,
        color: "#06b6d4"
    },
    file: {
        label: "File Modification",
        description: "Secure local meta-tagging.",
        icon: Edit3,
        color: "#f59e0b"
    },
    merge: {
        label: "File Merger",
        description: "Unified document fusion.",
        icon: Combine,
        color: "#8b5cf6"
    },
    json: {
        label: "JSON Converter",
        description: "Intelligent schema validation.",
        icon: FileCode,
        color: "#10b981"
    },
    map: {
        label: "Template Mapper",
        description: "Visual data field mapping.",
        icon: Columns,
        color: "#ec4899"
    },
    qr: {
        label: "QR Fusion",
        description: "Protocol-correct generation.",
        icon: QrCode,
        color: "#ef4444"
    },
    diff: {
        label: "Code Comparer",
        description: "Semantic logic diffing.",
        icon: GitCompare,
        color: "#f97316",
        badge: "NEW"
    },
};

const PRO_TIPS = [
    "Press '/' to instantly access the Command Center from anywhere.",
    "The Text Transformer supports multi-cursor editing logic.",
    "File processing happens locally - your data never leaves this device.",
    "Use 'Midnight' theme for long coding sessions to reduce eye strain.",
    "Diff Checker ignores whitespace by default for cleaner results."
];

export default function Hub({ setPage, logs, onClearLogs }: HubProps) {
    const [greeting, setGreeting] = useState('');
    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning, Operator');
        else if (hour < 18) setGreeting('Good afternoon, Operator');
        else setGreeting('Good evening, Operator');

        // Rotate tips
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % PRO_TIPS.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hub-workspace animate-fade-in">
            {/* Mission Control Header */}
            <div className="mission-header slide-in-top">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                    <div>
                        <div className="status-badge">
                            <span className="pulsing-dot"></span>
                            SYSTEM ONLINE
                        </div>
                        <h1 className="hub-title">{greeting}</h1>
                        <p className="hub-subtitle">All systems nominal. Ready for command.</p>
                    </div>

                    {/* Live System Stats Widget */}
                    <div className="system-stats glass-card hide-mobile">
                        <div className="stat-row">
                            <Cpu size={14} className="stat-icon" />
                            <div className="stat-label">CPU Load</div>
                            <div className="stat-bar"><div className="stat-fill" style={{ width: '12%' }}></div></div>
                            <div className="stat-val">12%</div>
                        </div>
                        <div className="stat-row">
                            <Activity size={14} className="stat-icon" />
                            <div className="stat-label">Memory</div>
                            <div className="stat-bar"><div className="stat-fill" style={{ width: '34%' }}></div></div>
                            <div className="stat-val">34%</div>
                        </div>
                        <div className="stat-row">
                            <Shield size={14} className="stat-icon" />
                            <div className="stat-label">Enclave</div>
                            <div className="stat-bar"><div className="stat-fill secure" style={{ width: '100%' }}></div></div>
                            <div className="stat-val secure">ACTIVE</div>
                        </div>
                    </div>
                </div>

                {/* Pro Tip Ticker */}
                <div className="pro-tip-ticker">
                    <Lightbulb size={16} className="tip-icon" />
                    <span className="tip-label">PRO TIP:</span>
                    <span key={tipIndex} className="tip-text slide-up">{PRO_TIPS[tipIndex]}</span>
                </div>
            </div>

            {/* Main Tools Grid */}
            <div className="hub-grid" style={{ marginBottom: '64px' }}>
                {Object.entries(TOOL_CONFIG).map(([id, config], index) => {
                    const Icon = config.icon;
                    return (
                        <div
                            key={id}
                            className="hub-card module-card"
                            onClick={() => setPage(id)}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="card-shine"></div>
                            <div className="module-header">
                                <div className="icon-box" style={{ color: config.color, borderColor: config.color + '40' }}>
                                    <Icon size={22} />
                                </div>
                                {config.badge && <span className="module-badge">{config.badge}</span>}
                            </div>

                            <div className="module-content">
                                <h3>{config.label}</h3>
                                <p>{config.description}</p>
                            </div>

                            <div className="module-footer">
                                <span className="engage-text">INITIALIZE</span>
                                <ChevronRight size={14} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Operations - Persistent History */}
            {logs && logs.length > 0 && (
                <div className="recent-ops-section slide-in-bottom" style={{ animationDelay: '0.4s' }}>
                    <div className="ops-header">
                        <div className="flex-center gap-12">
                            <div className="icon-box-small">
                                <Activity size={18} />
                            </div>
                            <h3>Mission History</h3>
                        </div>
                        <button onClick={onClearLogs} className="glass-btn-mini">
                            PURGE HISTORY
                        </button>
                    </div>

                    <div className="ops-grid">
                        {logs.slice(0, 4).map((log) => (
                            <div key={log.id} className="op-row glass-card">
                                <div className="op-info">
                                    <div className="op-dot"></div>
                                    <div className="op-main">
                                        <span className="op-action">{log.action}</span>
                                        <span className="op-file">{log.filename}</span>
                                    </div>
                                </div>
                                <div className="op-time">{log.timestamp}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .mission-header {
                    margin-bottom: 40px;
                }
                .hub-title {
                    font-size: 42px;
                    font-weight: 800;
                    margin: 8px 0;
                    background: linear-gradient(to right, var(--text-main), var(--text-muted));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -0.03em;
                }
                .hub-subtitle {
                    font-size: 16px;
                    color: var(--text-muted);
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 12px;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 20px;
                    color: #10b981;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                }
                .pulsing-dot {
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #10b981;
                    animation: pulse 2s infinite;
                }
                
                /* System Stats Widget */
                .system-stats {
                    width: 300px;
                    padding: 16px;
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .stat-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 12px;
                }
                .stat-icon { color: var(--text-muted); }
                .stat-label { width: 60px; color: var(--text-muted); font-weight: 600; }
                .stat-bar { flex: 1; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden; }
                .stat-fill { height: 100%; background: var(--primary); border-radius: 2px; }
                .stat-fill.secure { background: #10b981; }
                .stat-val { width: 40px; text-align: right; font-weight: 700; color: var(--text-main); }
                .stat-val.secure { color: #10b981; }

                /* Pro Tip */
                .pro-tip-ticker {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 20px;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    margin-top: 24px;
                    font-size: 13px;
                }
                .tip-icon { color: #fbbf24; }
                .tip-label { font-weight: 800; letter-spacing: 0.05em; color: var(--text-muted); }
                .tip-text { color: var(--text-main); animation: slideUpFade 0.5s; }

                /* Module Cards */
                .module-card {
                    position: relative;
                    padding: 24px;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .module-card:hover {
                    transform: translateY(-8px) scale(1.01);
                    border-color: var(--primary);
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
                }
                .module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }
                .icon-box {
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    background: var(--bg-app);
                    border: 1px solid;
                }
                .module-badge {
                    font-size: 10px;
                    font-weight: 800;
                    padding: 2px 6px;
                    background: var(--primary);
                    color: white;
                    border-radius: 4px;
                }
                .module-content h3 {
                    font-size: 16px;
                    margin-bottom: 6px;
                    font-weight: 700;
                }
                .module-content p {
                    font-size: 13px;
                    color: var(--text-muted);
                    line-height: 1.5;
                }
                .module-footer {
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-muted);
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                .module-card:hover .module-footer { opacity: 1; color: var(--primary); }
                
                @media (max-width: 768px) {
                    .hide-mobile { display: none; }
                    .hub-title { font-size: 32px; }
                    .mission-header { margin-bottom: 24px; }
                }

                .recent-ops-section { margin-top: 60px; border-top: 1px solid var(--border-color); padding-top: 40px; }
                .ops-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .ops-header h3 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
                .icon-box-small { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(99, 102, 241, 0.1); color: #6366f1; }
                .ops-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
                .op-row { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-radius: 16px; transition: all 0.2s; border: 1px solid var(--border-color); background: var(--card-bg); }
                .op-row:hover { border-color: var(--primary); background: rgba(255, 255, 255, 0.05); transform: translateY(-2px); }
                .op-info { display: flex; align-items: center; gap: 12px; }
                .op-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); }
                .op-main { display: flex; flexDirection: column; }
                .op-action { font-size: 13px; font-weight: 700; color: var(--text-main); }
                .op-file { font-size: 10px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .op-time { font-size: 10px; color: var(--text-muted); font-weight: 600; }
                .glass-btn-mini { background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); font-size: 10px; font-weight: 800; padding: 6px 12px; border-radius: 6px; cursor: pointer; letter-spacing: 0.05em; transition: all 0.2s; }
                .glass-btn-mini:hover { color: #ef4444; border-color: #ef444450; background: #ef444410; }
                .flex-center { display: flex; align-items: center; }
                .gap-12 { gap: 12px; }

            `}</style>
        </div>
    );
}
