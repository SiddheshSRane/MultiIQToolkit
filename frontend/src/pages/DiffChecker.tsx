import { useState, useCallback, useEffect } from "react";
import { fetchWithAuth } from "../api/client";
import {
    Trash2,
    ArrowLeft,
    Loader2,
    Zap,
    Split,
    Maximize2,
    Minimize2,
    CaseSensitive,
    AlignLeft,
    Columns,
    AlignJustify
} from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";

interface DiffRow {
    type: "equal" | "replace" | "delete" | "insert";
    left?: { num: number; text: string; parts?: { text: string; type: string }[] };
    right?: { num: number; text: string; parts?: { text: string; type: string }[] };
}

interface DiffResponse {
    diffs: DiffRow[];
    stats: {
        additions: number;
        deletions: number;
        changes: number;
        identical: number;
        total_rows: number;
    };
}

export default function DiffChecker() {
    const { notify, dismiss } = useNotifications();
    const [text1, setText1] = useState("");
    const [text2, setText2] = useState("");
    const [diffResult, setDiffResult] = useState<DiffResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // Settings
    const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
    const [ignoreCase, setIgnoreCase] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [fullWidth, setFullWidth] = useState(false);

    const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

    // Sync scrolling for split view
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (viewMode !== 'split') return;
        const target = e.target as HTMLDivElement;
        const sibling = target.nextElementSibling || target.previousElementSibling;
        if (sibling) {
            sibling.scrollTop = target.scrollTop;
            sibling.scrollLeft = target.scrollLeft;
        }
    };

    const handleCompare = useCallback(async () => {
        if (!text1.trim() && !text2.trim()) {
            notify('error', 'Input Required', "Please enter text to compare.");
            return;
        }

        setLoading(true);
        const toastId = notify('loading', 'Comparing...', 'Calculating differences...');

        try {
            const res = await fetchWithAuth("/api/diff/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text1,
                    text2,
                    ignore_whitespace: ignoreWhitespace,
                    ignore_case: ignoreCase
                })
            });

            if (!res.ok) throw new Error("Comparison failed");

            const data = await res.json();
            setDiffResult(data);
            notify('success', 'Comparison Complete', `Found ${data.stats.changes} changes.`);
        } catch (e) {
            console.error(e);
            notify('error', 'Error', "Failed to compute diff.");
        } finally {
            dismiss(toastId);
            setLoading(false);
        }
    }, [text1, text2, ignoreWhitespace, ignoreCase, notify, dismiss]);

    const clearAll = () => {
        setText1("");
        setText2("");
        setDiffResult(null);
        notify('info', 'Cleared', 'Workspace reset.');
    };

    // Keyboard shortcut: Ctrl+Enter to compare
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                handleCompare();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleCompare]);

    // Helper to render text with parts
    const renderText = (cell: { text: string; parts?: { text: string; type: string }[] } | undefined) => {
        if (!cell) return "";
        if (cell.parts) {
            return cell.parts.map((p, i) => (
                <span key={i} className={`part-${p.type}`}>{p.text}</span>
            ));
        }
        return cell.text;
    };

    return (
        <div className={`app page-enter ${fullWidth ? 'full-width-mode' : ''}`}>
            {/* Header & Controls */}
            <div className="section slide-in-top">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'var(--gradient-primary)',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                            <Split size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>CODE COMPARER</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Professional Text Analysis</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {diffResult && (
                            <div className="toggle-group" style={{ marginRight: '16px', background: 'var(--card-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <button
                                    className={`toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
                                    onClick={() => setViewMode('split')}
                                    title="Split View"
                                >
                                    <Columns size={14} />
                                </button>
                                <button
                                    className={`toggle-btn ${viewMode === 'unified' ? 'active' : ''}`}
                                    onClick={() => setViewMode('unified')}
                                    title="Unified View"
                                >
                                    <AlignJustify size={14} />
                                </button>
                            </div>
                        )}

                        <button
                            className={`secondary ${ignoreWhitespace ? 'active-toggle' : ''}`}
                            onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
                            title="Ignore Whitespace"
                        >
                            <AlignLeft size={16} />
                            <span className="hide-mobile">Ignore Spaces</span>
                        </button>
                        <button
                            className={`secondary ${ignoreCase ? 'active-toggle' : ''}`}
                            onClick={() => setIgnoreCase(!ignoreCase)}
                            title="Ignore Case"
                        >
                            <CaseSensitive size={16} />
                            <span className="hide-mobile">Ignore Case</span>
                        </button>
                        <button className="secondary" onClick={() => setShowLineNumbers(!showLineNumbers)}>
                            #
                        </button>
                        <button className="secondary" onClick={() => setFullWidth(!fullWidth)}>
                            {fullWidth ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>

                        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }} />

                        <button
                            className="secondary"
                            onClick={clearAll}
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger-glow)' }}
                        >
                            <Trash2 size={16} />
                            <span className="hide-mobile">Clear</span>
                        </button>
                        <button
                            onClick={handleCompare}
                            disabled={loading}
                            className="primary"
                            style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none' }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                            Compare
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor / Diff View */}
            <div className={`diff-container ${diffResult ? 'view-mode' : 'edit-mode'}`} style={{ marginTop: '20px' }}>

                {!diffResult ? (
                    /* EDIT MODE: Dual Textareas */
                    <div className="diff-editors">
                        <div className="section slide-in-left editor-pane">
                            <div className="editor-header">
                                ORIGINAL TEXT
                            </div>
                            <div className="textarea-wrapper">
                                <textarea
                                    value={text1}
                                    onChange={e => setText1(e.target.value)}
                                    placeholder="Paste original text here..."
                                    className="code-editor"
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        <div className="section slide-in-right editor-pane">
                            <div className="editor-header">
                                MODIFIED TEXT
                            </div>
                            <div className="textarea-wrapper">
                                <textarea
                                    value={text2}
                                    onChange={e => setText2(e.target.value)}
                                    placeholder="Paste new version here..."
                                    className="code-editor"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* VIEW MODE: Diff Rendering */
                    <div className="section scale-in">
                        {/* Stats Bar */}
                        <div className="stats-bar">
                            <div className="stat-item">
                                <span className="stat-val green">+{diffResult.stats.additions}</span>
                                <span className="stat-label">Additions</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-val red">-{diffResult.stats.deletions}</span>
                                <span className="stat-label">Deletions</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-val orange">~{diffResult.stats.changes}</span>
                                <span className="stat-label">Changes</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-val">{diffResult.stats.total_rows}</span>
                                <span className="stat-label">Lines</span>
                            </div>
                        </div>

                        <div className={`diff-viewer ${viewMode}`}>
                            {viewMode === 'split' ? (
                                <>
                                    <div className="diff-header-row split">
                                        <div className="diff-gutter">L</div>
                                        <div className="diff-content">ORIGINAL</div>
                                        <div className="diff-gutter">R</div>
                                        <div className="diff-content">MODIFIED</div>
                                    </div>
                                    <div className="diff-scroll-area split" onScroll={handleScroll}>
                                        {diffResult.diffs.map((row, idx) => (
                                            <div key={idx} className={`diff-row type-${row.type}`}>
                                                <div className="diff-half left">
                                                    {showLineNumbers && <div className="diff-num">{row.left?.num || ''}</div>}
                                                    <div className="diff-text">{renderText(row.left)}</div>
                                                </div>
                                                <div className="diff-half right">
                                                    {showLineNumbers && <div className="diff-num">{row.right?.num || ''}</div>}
                                                    <div className="diff-text">{renderText(row.right)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                /* UNIFIED VIEW */
                                <>
                                    <div className="diff-header-row unified">
                                        <div className="diff-gutter">L</div>
                                        <div className="diff-gutter">R</div>
                                        <div className="diff-content">CODE</div>
                                    </div>
                                    <div className="diff-scroll-area unified">
                                        {diffResult.diffs.map((row, idx) => {
                                            if (row.type === 'replace') {
                                                return (
                                                    <>
                                                        <div key={`${idx}-l`} className="diff-row unified type-delete">
                                                            <div className="diff-num">{row.left?.num}</div>
                                                            <div className="diff-num empty"></div>
                                                            <div className="diff-text">{renderText(row.left)}</div>
                                                        </div>
                                                        <div key={`${idx}-r`} className="diff-row unified type-insert">
                                                            <div className="diff-num empty"></div>
                                                            <div className="diff-num">{row.right?.num}</div>
                                                            <div className="diff-text">{renderText(row.right)}</div>
                                                        </div>
                                                    </>
                                                );
                                            }
                                            return (
                                                <div key={idx} className={`diff-row unified type-${row.type}`}>
                                                    <div className="diff-num">{row.left?.num || ''}</div>
                                                    <div className="diff-num">{row.right?.num || ''}</div>
                                                    <div className="diff-text">
                                                        {renderText(row.type === 'insert' ? row.right : row.left)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                            <button className="secondary" onClick={() => setDiffResult(null)}>
                                <ArrowLeft size={16} />
                                Back to Editor
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        /* Layout & Full Width */
        .app.full-width-mode {
            max-width: 100% !important;
            padding: 0 32px;
        }

        /* Shared Styles */
        .part-insert { background: rgba(16, 185, 129, 0.3); color: inherit; border-radius: 2px; }
        .part-delete { background: rgba(239, 68, 68, 0.3); color: inherit; border-radius: 2px; text-decoration: line-through; }
        
        /* Stats Bar */
        .stats-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1px;
            background: var(--border-color);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border-color);
            margin-bottom: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .stat-item {
            background: var(--bg-card);
            padding: 16px;
            text-align: center;
            transition: background 0.2s;
        }
        .stat-item:hover { background: var(--bg-secondary); }
        .stat-val { font-size: 20px; fontWeight: 800; display: block; margin-bottom: 4px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
        
        .green { color: #34d399; }
        .red { color: #f87171; }
        .orange { color: #fbbf24; }

        /* Unified View Toggle */
        .toggle-group { display: flex; gap: 2px; }
        .toggle-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 6px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: all 0.2s;
        }
        .toggle-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
        .toggle-btn.active { background: var(--primary-glow); color: var(--primary); }

        /* Editors */
        .diff-editors {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            height: 70vh;
        }
        .editor-pane { 
            display: flex; 
            flex-direction: column; 
            height: 100%; 
            background: var(--bg-card);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            overflow: hidden;
        }
        .editor-header {
            padding: 12px 16px;
            background: rgba(0,0,0,0.2);
            border-bottom: 1px solid var(--border-color);
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        .textarea-wrapper {
            flex: 1;
            position: relative;
        }
        .code-editor {
            width: 100%;
            height: 100%;
            background: transparent;
            border: none;
            padding: 16px;
            color: var(--text-main);
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            line-height: 1.6;
            resize: none;
            outline: none;
        }
        
        /* Diff Viewer Container */
        .diff-viewer {
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background: var(--bg-card); /* Smoother background */
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            height: 70vh;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        /* Headers */
        .diff-header-row {
            background: rgba(0,0,0,0.3);
            border-bottom: 1px solid var(--border-color);
            font-weight: 700;
            color: var(--text-muted);
            font-size: 11px;
            letter-spacing: 0.05em;
        }
        .diff-header-row.split { display: grid; grid-template-columns: 50px 1fr 50px 1fr; }
        .diff-header-row.unified { display: grid; grid-template-columns: 50px 50px 1fr; }
        .diff-header-row > div { padding: 12px; text-align: center; border-right: 1px solid var(--border-color); }
        .diff-header-row > div:last-child { border-right: none; }

        /* Scroll Area */
        .diff-scroll-area { overflow-y: auto; flex: 1; }
        
        /* Rows */
        .diff-row { 
            border-bottom: 1px solid rgba(255, 255, 255, 0.02); 
            transition: background 0.1s;
        }
        .diff-row:hover { background: rgba(255,255,255,0.01); }
        .diff-row.split { display: grid; grid-template-columns: 1fr 1fr; }
        .diff-row.unified { display: grid; grid-template-columns: 50px 50px 1fr; }

        /* Cells */
        .diff-half { display: flex; width: 100%; border-right: 1px solid var(--border-color); }
        .diff-half:last-child { border-right: none; }
        
        .diff-num {
            width: 50px;
            min-width: 50px;
            padding: 4px 8px;
            text-align: right;
            color: var(--text-muted);
            background: rgba(0, 0, 0, 0.15);
            border-right: 1px solid var(--border-color);
            user-select: none;
            font-size: 11px;
            opacity: 0.7;
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }
        .diff-num.empty { background: transparent; }

        .diff-text {
            flex: 1;
            padding: 4px 12px;
            white-space: pre-wrap;
            word-break: break-all;
            line-height: 1.6;
            color: var(--text-code); /* Ensure high contrast */
        }

        /* Type Highlighting - More Subtle & Professional */
        .type-insert .right { background: rgba(16, 185, 129, 0.08); }
        .type-insert .diff-text { color: #ecfccb; } /* Lighter green text for readability on dark */
        
        .type-delete .left { background: rgba(239, 68, 68, 0.08); }
        .type-delete .left .diff-text { color: #fee2e2; text-decoration: line-through; opacity: 0.6; }
        
        .type-replace .left { background: rgba(245, 158, 11, 0.04); }
        .type-replace .right { background: rgba(245, 158, 11, 0.08); }
        .type-replace .right .diff-text { color: #fef3c7; }

        /* Unified Specifics */
        .unified.type-insert .diff-text { background: rgba(16, 185, 129, 0.08); }
        .unified.type-delete .diff-text { background: rgba(239, 68, 68, 0.08); }

        .type-insert .diff-num { background: rgba(16, 185, 129, 0.1); color: #34d399; border-right-color: rgba(16, 185, 129, 0.2); }
        .type-delete .diff-num { background: rgba(239, 68, 68, 0.1); color: #f87171; border-right-color: rgba(239, 68, 68, 0.2); }

        .active-toggle {
            background: var(--primary-glow) !important;
            color: var(--primary) !important;
            border-color: var(--primary) !important;
        }

        @media (max-width: 768px) {
            .diff-editors { grid-template-columns: 1fr; height: auto; }
            .code-editor { min-height: 300px; }
            .hide-mobile { display: none; }
            .diff-header-row { display: none; }
            .app.full-width-mode { padding: 0 16px; }
        }
      `}</style>
        </div>
    );
}
