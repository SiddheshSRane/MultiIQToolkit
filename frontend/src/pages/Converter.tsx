import { useEffect, useState, useCallback } from "react";
import { convertColumn } from "../api/client";
import {
  Sparkles,
  Type,
  Wrench,
  Zap,
  Clipboard,
  Loader2,
  Trash2,
  ListFilter,
  ArrowDownWideNarrow,
  Braces,
  Quote,
  Hash,
  Scissors,
  RefreshCcw,
  FileText,
  Download,
  Copy,
  BarChart3,
  Settings,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sliders
} from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";

interface ConverterProps {
  onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

interface ConversionStats {
  total_lines: number;
  non_empty: number;
  unique: number;
}

export default function Converter({ onLogAction }: ConverterProps) {
  const { notify, dismiss } = useNotifications();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<ConversionStats | null>(null);

  // Core Formatting Parameters
  const [delimiter, setDelimiter] = useState(", ");
  const [itemPrefix, setItemPrefix] = useState("");
  const [itemSuffix, setItemSuffix] = useState("");
  const [resultPrefix, setResultPrefix] = useState("");
  const [resultSuffix, setResultSuffix] = useState("");

  // Logic Gates
  const [dedupe, setDedupe] = useState(false);
  const [sort, setSort] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [ignoreComments, setIgnoreComments] = useState(true);
  const [trimItems, setTrimItems] = useState(true);
  const [stripQuotes, setStripQuotes] = useState(false);
  const [caseTransform, setCaseTransform] = useState("none");

  const [loading, setLoading] = useState(false);

  const handleConvert = useCallback(async (silent = false) => {
    if (!input.trim()) {
      // Only notify if manual trigger? Or just return silently for empty input in auto-mode
      if (!silent) notify('error', 'Input Required', "Please enter some text to transform.");
      return;
    }
    setLoading(true);
    // Only show loading toast if not silent
    const toastId = !silent ? notify('loading', 'Transforming Text', 'Applying your formatting rules...') : "";

    const payload = {
      text: input,
      delimiter,
      item_prefix: itemPrefix,
      item_suffix: itemSuffix,
      result_prefix: resultPrefix,
      result_suffix: resultSuffix,
      remove_duplicates: dedupe,
      sort_items: sort,
      reverse_items: reverse,
      ignore_comments: ignoreComments,
      strip_quotes: stripQuotes,
      trim_items: trimItems,
      case_transform: caseTransform,
    };

    try {
      const res = await convertColumn(payload);
      setOutput(res.result);
      setStats(res.stats);
      if (!silent) notify('success', 'Transformation Complete', 'Your text has been perfectly formatted.');
      if (onLogAction) {
        onLogAction("Text Transformation", "transformed_text.txt", new Blob([res.result], { type: "text/plain" }));
      }
    } catch (e) {
      console.error("Conversion error:", e);
      // Always show errors
      notify('error', 'Transformation Failed', e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      if (!silent && toastId) dismiss(toastId);
      setLoading(false);
    }
  }, [input, delimiter, itemPrefix, itemSuffix, resultPrefix, resultSuffix, dedupe, sort, reverse, ignoreComments, stripQuotes, trimItems, caseTransform, onLogAction, notify, dismiss]);

  // Auto-Run Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim()) {
        handleConvert(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [handleConvert]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setStats(null);
    notify('info', 'Workspace Cleared', 'Ready for new transformation.');
  }, [notify]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      notify('success', 'Copied to Clipboard', 'Output copied successfully.');
    } catch (e) {
      notify('error', 'Clipboard Error', "Failed to copy to clipboard.");
    }
  }, [output, notify]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transformed_text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('success', 'Download Started', 'Your file is being downloaded.');
  }, [output, notify]);

  const applyPreset = (d: string, ip: string, is: string, rp: string = "", rs: string = "") => {
    setDelimiter(d);
    setItemPrefix(ip);
    setItemSuffix(is);
    setResultPrefix(rp);
    setResultSuffix(rs);
    notify('success', 'Preset Applied', 'Formatting parameters updated.');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleConvert();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleConvert]);

  const inputLines = input.split('\n').length;
  const inputChars = input.length;
  // Removed unused stats variables to satisfy build


  return (
    <div className="app page-enter">
      {/* Quick Presets Section */}
      <div className="section slide-in-left" style={{ animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--gradient-primary)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>QUICK PRESETS</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>One-click formatting templates</p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px'
        }}>
          <button
            className="preset-btn"
            onClick={() => applyPreset(", ", "", "")}
            style={{ background: 'var(--card-bg)' }}
          >
            <FileText size={16} />
            CSV List
          </button>
          <button
            className="preset-btn"
            onClick={() => applyPreset(", ", "'", "'")}
          >
            <Quote size={16} />
            SQL Quotes
          </button>
          <button
            className="preset-btn"
            onClick={() => applyPreset("\\n", "", "")}
          >
            <Type size={16} />
            Newline
          </button>
          <button
            className="preset-btn"
            onClick={() => applyPreset(", ", "", "", "[", "]")}
          >
            <Braces size={16} />
            JSON Array
          </button>
          <button
            className="preset-btn"
            onClick={() => applyPreset(" | ", "", "")}
          >
            <Hash size={16} />
            Pipe Delimited
          </button>
        </div>
      </div>

      {/* Dual Editor Panes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
        gap: '24px',
        marginTop: '24px'
      }}>
        {/* Input Pane */}
        <div className="section slide-in-left" style={{
          display: 'flex',
          flexDirection: 'column',
          animationDelay: '0.2s',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'var(--gradient-info)',
            borderRadius: '24px 24px 0 0'
          }} />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingTop: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Type size={18} style={{ color: 'var(--primary)' }} />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>SOURCE INPUT</h4>
            </div>
            <button
              className="secondary"
              onClick={clearAll}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                borderRadius: '8px'
              }}
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div style={{
            position: 'relative',
            flex: 1
          }}>
            <textarea
              placeholder="Paste your text here... (Ctrl + Enter to transform)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                width: '100%',
                minHeight: '400px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                lineHeight: '1.8',
                resize: 'vertical',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px',
                color: 'var(--text-main)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.08)';
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 4px var(--primary-glow), 0 8px 16px rgba(102, 126, 234, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'translateY(0)';
              }}
            />
          </div>

          {/* Input Stats */}
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            background: 'var(--input-bg)',
            borderRadius: '12px',
            display: 'flex',
            gap: '20px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontWeight: 600
          }}>
            <span><BarChart3 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Lines: {inputLines}</span>
            <span>•</span>
            <span>Characters: {inputChars}</span>
          </div>
        </div>

        {/* Output Pane */}
        <div className="section slide-in-right" style={{
          display: 'flex',
          flexDirection: 'column',
          animationDelay: '0.2s',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'var(--gradient-success)',
            borderRadius: '24px 24px 0 0'
          }} />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingTop: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clipboard size={18} style={{ color: 'var(--primary)' }} />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>TRANSFORMED OUTPUT</h4>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="secondary"
                onClick={handleCopy}
                disabled={!output}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '8px'
                }}
              >
                <Copy size={12} />
                Copy
              </button>
              <button
                className="secondary"
                onClick={handleDownload}
                disabled={!output}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '8px'
                }}
              >
                <Download size={12} />
                Save
              </button>
            </div>
          </div>

          <div style={{
            position: 'relative',
            flex: 1
          }}>
            <textarea
              readOnly
              placeholder="Transformed output will appear here..."
              value={output}
              style={{
                width: '100%',
                minHeight: '400px',
                background: output ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px',
                color: output ? 'var(--success)' : 'var(--text-muted)',
                fontWeight: output ? 600 : 400,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                lineHeight: '1.8',
                resize: 'vertical',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxShadow: output
                  ? '0 4px 6px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(16, 185, 129, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                cursor: 'text'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(16, 185, 129, 0.08)';
                e.target.style.borderColor = 'var(--success)';
                e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1), 0 8px 16px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onBlur={(e) => {
                e.target.style.background = output ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = output
                  ? '0 4px 6px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(16, 185, 129, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'translateY(0)';
              }}
            />
          </div>

          {/* Output Stats */}
          {stats && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              background: 'var(--primary-glow)',
              border: '1px solid var(--primary)',
              borderRadius: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '16px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>TOTAL LINES</div>
                <div style={{ color: 'var(--primary)', fontSize: '18px' }}>{stats.total_lines}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>NON-EMPTY</div>
                <div style={{ color: 'var(--primary)', fontSize: '18px' }}>{stats.non_empty}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>UNIQUE</div>
                <div style={{ color: 'var(--primary)', fontSize: '18px' }}>{stats.unique}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Configuration */}
      <div className="section scale-in" style={{
        marginTop: '24px',
        animationDelay: '0.3s',
        background: 'var(--card-bg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'var(--gradient-warm)',
          borderRadius: '24px 24px 0 0'
        }} />

        <div style={{
          marginBottom: '32px',
          paddingTop: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Wrench size={20} style={{ color: 'var(--primary)' }} />
            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>ADVANCED CONFIGURATION</h4>
          </div>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: '1.6'
          }}>
            Fine-tune your transformation with precision formatting controls
          </p>
        </div>

        {/* Formatting Controls - Organized in sections */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '2px solid var(--border-color)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--primary-glow)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Settings size={16} />
            </div>
            <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 700, letterSpacing: '0.03em' }}>
              FORMATTING PARAMETERS
            </h5>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px'
          }}>
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Delimiter</label>
              <div style={{ position: 'relative' }}>
                <Hash size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <input
                  type="text"
                  placeholder="e.g., ', ' or ' | '"
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    paddingLeft: '38px'
                  }}
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Item Prefix</label>
              <div style={{ position: 'relative' }}>
                <ArrowRight size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <input
                  type="text"
                  placeholder="e.g., '(' or '\''"
                  value={itemPrefix}
                  onChange={(e) => setItemPrefix(e.target.value)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    paddingLeft: '38px'
                  }}
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Item Suffix</label>
              <div style={{ position: 'relative' }}>
                <ArrowLeft size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <input
                  type="text"
                  placeholder="e.g., ')' or '\''"
                  value={itemSuffix}
                  onChange={(e) => setItemSuffix(e.target.value)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    paddingLeft: '38px'
                  }}
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Result Prefix</label>
              <div style={{ position: 'relative' }}>
                <ChevronLeft size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <input
                  type="text"
                  placeholder="e.g., '[' or '{'"
                  value={resultPrefix}
                  onChange={(e) => setResultPrefix(e.target.value)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    paddingLeft: '38px'
                  }}
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Result Suffix</label>
              <div style={{ position: 'relative' }}>
                <ChevronRight size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <input
                  type="text"
                  placeholder="e.g., ']' or '}'"
                  value={resultSuffix}
                  onChange={(e) => setResultSuffix(e.target.value)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    paddingLeft: '38px'
                  }}
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Case Transform</label>
              <div style={{ position: 'relative' }}>
                <Type size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <select
                  value={caseTransform}
                  onChange={(e) => setCaseTransform(e.target.value)}
                  style={{
                    fontSize: '13px',
                    paddingLeft: '38px'
                  }}
                >
                  <option value="none">Original</option>
                  <option value="upper">UPPERCASE</option>
                  <option value="lower">lowercase</option>
                  <option value="title">Title Case</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Options */}
        <div style={{
          paddingTop: '32px',
          borderTop: '2px solid var(--border-color)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--primary-glow)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Sliders size={16} />
            </div>
            <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 700, letterSpacing: '0.03em' }}>
              PROCESSING OPTIONS
            </h5>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '14px'
          }}>
            <label className="checkbox" style={{
              padding: '12px 16px',
              background: dedupe ? 'var(--primary-glow)' : 'var(--input-bg)',
              border: dedupe ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              transition: 'all 0.2s ease'
            }}>
              <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
              <ListFilter size={16} />
              Remove Duplicates
            </label>
            <label className="checkbox" style={{
              padding: '12px 16px',
              background: sort ? 'var(--primary-glow)' : 'var(--input-bg)',
              border: sort ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              transition: 'all 0.2s ease'
            }}>
              <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />
              <ArrowDownWideNarrow size={16} />
              Sort A-Z
            </label>
            <label className="checkbox" style={{
              padding: '12px 16px',
              background: reverse ? 'var(--primary-glow)' : 'var(--input-bg)',
              border: reverse ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              transition: 'all 0.2s ease'
            }}>
              <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
              <RefreshCcw size={16} />
              Reverse Order
            </label>
            <label className="checkbox" style={{
              padding: '12px 16px',
              background: ignoreComments ? 'var(--primary-glow)' : 'var(--input-bg)',
              border: ignoreComments ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              transition: 'all 0.2s ease'
            }}>
              <input type="checkbox" checked={ignoreComments} onChange={(e) => setIgnoreComments(e.target.checked)} />
              <Hash size={16} />
              Ignore Comments
            </label>
            <label className="checkbox" style={{
              padding: '12px 16px',
              background: trimItems ? 'var(--primary-glow)' : 'var(--input-bg)',
              border: trimItems ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              transition: 'all 0.2s ease'
            }}>
              <input type="checkbox" checked={trimItems} onChange={(e) => setTrimItems(e.target.checked)} />
              <Scissors size={16} />
              Trim Whitespace
            </label>
            <label className="checkbox" style={{
              padding: '12px 16px',
              background: stripQuotes ? 'var(--primary-glow)' : 'var(--input-bg)',
              border: stripQuotes ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              transition: 'all 0.2s ease'
            }}>
              <input type="checkbox" checked={stripQuotes} onChange={(e) => setStripQuotes(e.target.checked)} />
              <Quote size={16} />
              Strip Quotes
            </label>
          </div>
        </div>
      </div>

      {/* Transform Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '40px 0'
      }}>
        <button
          onClick={() => handleConvert(false)}
          disabled={loading || !input.trim()}
          style={{
            padding: '18px 60px',
            fontSize: '16px',
            fontWeight: 700,
            borderRadius: '16px',
            background: loading ? 'var(--text-muted)' : 'var(--gradient-primary)',
            border: 'none',
            color: 'white',
            boxShadow: loading ? 'none' : 'var(--shadow-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Transforming...
            </>
          ) : (
            <>
              <Zap size={20} />
              Transform Text
            </>
          )}
        </button>
      </div>

      {/* Pro Tip Section */}
      <div className="tool-help-section scale-in" style={{ animationDelay: '0.4s' }}>
        <div className="tool-help-icon">
          <Sparkles size={24} />
        </div>
        <div className="tool-help-content">
          <h5>Pro Tip: Keyboard Shortcuts</h5>
          <p>
            Press <strong>Ctrl + Enter</strong> to quickly transform your text without clicking the button.
            Use the <strong>Result Prefix/Suffix</strong> to wrap your entire output—perfect for creating
            JSON arrays with <code>[ ]</code> or SQL IN clauses with <code>( )</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
