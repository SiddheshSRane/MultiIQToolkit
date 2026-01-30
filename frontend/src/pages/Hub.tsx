import { useState } from 'react';
import {
    Clock,
    ChevronRight,
    Hash,
    Edit3,
    Combine,
    FileCode,
    Columns,
    QrCode,
    GitCompare,
    Search,
    History
} from "lucide-react";

interface HubProps {
    setPage: (page: any) => void;
    logs: any[];
    onClearLogs: () => void;
}

const TOOL_CONFIG: Record<string, { label: string; icon: any; color: string; desc: string }> = {
    convert: { label: 'Text Transformer', icon: Hash, color: '#6366f1', desc: 'Precision text formatting and clean up.' },
    diff: { label: 'Code Comparer', icon: GitCompare, color: '#f97316', desc: 'Deep visual difference analysis.' },
    file: { label: 'File Modification', icon: Edit3, color: '#f59e0b', desc: 'Batch attribute and content tuning.' },
    merge: { label: 'File Merger', icon: Combine, color: '#8b5cf6', desc: 'Unified document fusion.' },
    json: { label: 'JSON Converter', icon: FileCode, color: '#10b981', desc: 'Visual schema validation.' },
    datetime: { label: 'DateTime Helper', icon: Clock, color: '#06b6d4', desc: 'Temporal data timezone shifting.' },
    map: { label: 'Template Mapper', icon: Columns, color: '#ec4899', desc: 'Vertical data field mapping.' },
    qr: { label: 'QR Fusion', icon: QrCode, color: '#ef4444', desc: 'Bulk generation of secure codes.' }
};

export default function Hub({ setPage, logs, onClearLogs }: HubProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTools = Object.entries(TOOL_CONFIG).filter(([_, config]) =>
        config.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="hub-workspace animate-fade-in">
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: 64, marginTop: 40 }}>
                <h1 style={{ fontSize: 44, fontWeight: 900, color: 'var(--text-main)', marginBottom: 16, letterSpacing: '-0.03em', maxWidth: 800, margin: '0 auto 16px auto' }}>
                    Everything you need to <span style={{ color: 'var(--primary)' }}>Master Data</span>
                </h1>
                <p style={{ fontSize: 19, color: 'var(--text-muted)', maxWidth: 650, margin: '0 auto', lineHeight: 1.6 }}>
                    The world's most secure data processing toolkit. 100% Client-side. No trackers. No cloud uploads. Just performance.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: 40 }}>
                    <div className="hub-search-container" style={{ width: '100%', maxWidth: 500 }}>
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Find a tool (e.g. Merge PDF, JSON, QR)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="hub-search-input"
                            style={{ height: 60, fontSize: 16, borderRadius: 16 }}
                        />
                    </div>
                </div>
            </div>

            {!searchQuery ? (
                /* Standard Grid */
                <div className="hub-grid">
                    {Object.entries(TOOL_CONFIG).map(([key, config]) => (
                        <div
                            key={key}
                            className="hub-card"
                            onClick={() => setPage(key)}
                        >
                            <div className="icon-box" style={{ background: `${config.color}15`, color: config.color }}>
                                <config.icon />
                            </div>
                            <h3>{config.label}</h3>
                            <p>{config.desc}</p>
                        </div>
                    ))}
                </div>
            ) : (
                /* Search Results */
                <div style={{ minHeight: '40vh' }}>
                    <h4 className="category-title">Found {filteredTools.length} tools matching your search</h4>
                    <div className="hub-grid">
                        {filteredTools.map(([key, config]) => (
                            <div
                                key={key}
                                className="hub-card"
                                onClick={() => setPage(key)}
                            >
                                <div className="icon-box" style={{ background: `${config.color}15`, color: config.color }}>
                                    <config.icon />
                                </div>
                                <h3>{config.label}</h3>
                                <p>{config.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mission History Section */}
            <div style={{ marginTop: 80, paddingBottom: 60 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 24, fontVariationSettings: '"wght" 850', display: 'flex', alignItems: 'center', margin: 0 }}>
                        <History size={24} style={{ marginRight: 12, color: 'var(--primary)' }} />
                        Recent Activity
                    </h2>
                    {logs.length > 0 && (
                        <button className="secondary" onClick={onClearLogs} style={{ padding: '8px 16px', fontSize: 12 }}>
                            Clear Session
                        </button>
                    )}
                </div>

                {logs.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 24, border: '1px dashed var(--border-color)' }}>
                        <div style={{ background: 'var(--primary-glow)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: 'var(--primary)' }}>
                            <History size={32} />
                        </div>
                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>No recent activity</h4>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Your session history will appear here once you start processing data.</p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        {logs.slice(0, 5).map((log, i) => (
                            <div key={i} className="log-row" style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '16px 24px',
                                borderBottom: i === logs.slice(0, 5).length - 1 ? 'none' : '1px solid var(--border-color)',
                                fontSize: 13,
                                background: 'var(--card-bg)'
                            }}>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    marginRight: 16,
                                    opacity: 0.6
                                }} />
                                <span style={{ fontWeight: 800, minWidth: 160, color: 'var(--text-main)' }}>{log.action}</span>
                                <span style={{ color: 'var(--text-muted)', flex: 1 }}>{log.filename}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{log.timestamp}</span>
                                <ChevronRight size={14} style={{ marginLeft: 20, opacity: 0.3 }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
