
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
  RefreshCcw
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
  const { notify } = useNotifications();
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

  const handleConvert = useCallback(async () => {
    if (!input.trim()) {
      notify('error', 'Ready State Empty', "Please enter some text to refine.");
      return;
    }
    setLoading(true);
    notify('loading', 'Refining Stream', 'Applying structural logic to your dataset...');

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
      notify('success', 'Refinement Complete', 'Your list has been perfectly formatted.');
      if (onLogAction) {
        onLogAction("Text Transformation", "refined_list.txt", new Blob([res.result], { type: "text/plain" }));
      }
    } catch (e) {
      console.error("Conversion error:", e);
      notify('error', 'Refinery Blocked', e instanceof Error ? e.message : "An unexpected block occurred.");
    } finally {
      setLoading(false);
    }
  }, [input, delimiter, itemPrefix, itemSuffix, resultPrefix, resultSuffix, dedupe, sort, reverse, ignoreComments, stripQuotes, trimItems, caseTransform, onLogAction, notify]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setStats(null);
    notify('info', 'Terminal Purged', 'Workspace reset to prime state.');
  }, [notify]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      notify('success', 'Copied to Clipboard', 'The refined payload is ready to use.');
    } catch (e) {
      notify('error', 'Clipboard Error', "System prevented clipboard access.");
    }
  }, [output, notify]);

  const applyPreset = (d: string, ip: string, is: string, rp: string = "", rs: string = "") => {
    setDelimiter(d);
    setItemPrefix(ip);
    setItemSuffix(is);
    setResultPrefix(rp);
    setResultSuffix(rs);
    notify('success', 'Preset Activated', 'Formatting parameters updated.');
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

  return (
    <div className="app">
      {/* Top Banner: Presets */}
      <div className="section">
        <h4><Sparkles size={18} /> High-Speed Logical Presets</h4>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <button className="checkbox" onClick={() => applyPreset(", ", "", "")} style={{ justifyContent: 'center' }}>📊 CSV List</button>
          <button className="checkbox" onClick={() => applyPreset(", ", "'", "'")} style={{ justifyContent: 'center' }}>✨ SQL Quotes</button>
          <button className="checkbox" onClick={() => applyPreset("\\n", "", "")} style={{ justifyContent: 'center' }}>📋 Newline</button>
          <button className="checkbox" onClick={() => applyPreset(", ", "", "", "[", "]")} style={{ justifyContent: 'center' }}>🛡️ JSON Array</button>
          <button className="checkbox" onClick={() => applyPreset(" | ", "", "")} style={{ justifyContent: 'center' }}>⚡ Pipe Delimited</button>
        </div>
      </div>

      {/* Main Workspace: Side-by-Side Dual Pane */}
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', alignItems: 'stretch' }}>
        <div className="section" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex-responsive" style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}><Type size={18} /> Source Stream</h4>
            <button className="secondary" onClick={clearAll} style={{ padding: '6px 12px', fontSize: 11 }}>
              <Trash2 size={12} /> Purge Input
            </button>
          </div>
          <textarea
            placeholder="Paste your source list here... (Ctrl + Enter to trigger)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, minHeight: '350px', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
          />
          {stats && (
            <div className="stats" style={{ marginTop: 16, padding: '12px 20px', borderRadius: 14 }}>
              <span style={{ marginRight: 16 }}><strong>Rows Detected:</strong> {stats.total_lines}</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span style={{ marginLeft: 16 }}><strong>Unique Keys:</strong> {stats.unique}</span>
            </div>
          )}
        </div>

        <div className="section" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex-responsive" style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}><Clipboard size={18} /> Refined Result</h4>
            <button className="secondary" onClick={handleCopy} disabled={!output} style={{ padding: '6px 12px', fontSize: 11 }}>
              <Clipboard size={12} /> Copy Output
            </button>
          </div>
          <textarea
            readOnly
            placeholder="Refined data will materialize here..."
            value={output}
            style={{
              flex: 1,
              minHeight: '350px',
              background: 'var(--input-bg)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              fontWeight: 700,
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 1.6
            }}
          />
        </div>
      </div>

      {/* Advanced Configuration Architecture */}
      <div className="section" style={{ borderTop: '4px solid var(--primary)' }}>
        <div style={{ marginBottom: 32, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Wrench size={20} className="text-primary" /> Logic & Schema Infrastructure
          </h4>
          <p className="desc" style={{ margin: '8px 0 0 0', fontSize: 13, marginBottom: 0 }}>Precision-tune your data flow with industrial-grade formatting controls.</p>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: '150px 1fr 1fr', gap: '32px', alignItems: 'start' }}>

          {/* Column 1: Core Delimiter */}
          <div className="input-group">
            <label>Delimiter</label>
            <input
              placeholder="e.g. , "
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              style={{ fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}
            />
          </div>

          {/* Column 2: Item Lifecycle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="input-group">
              <label>Item Prefix</label>
              <input placeholder="Prefix..." value={itemPrefix} onChange={(e) => setItemPrefix(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Item Suffix</label>
              <input placeholder="Suffix..." value={itemSuffix} onChange={(e) => setItemSuffix(e.target.value)} />
            </div>
          </div>

          {/* Column 3: Payload Wrap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="input-group">
              <label>Result Prefix</label>
              <input placeholder="Start..." value={resultPrefix} onChange={(e) => setResultPrefix(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Result Suffix</label>
              <input placeholder="End..." value={resultSuffix} onChange={(e) => setResultSuffix(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Casing & Secondary Logic */}
        <div className="form-grid" style={{ marginTop: 32, gridTemplateColumns: 'minmax(200px, 300px) 1fr' }}>
          <div className="input-group">
            <label>Aesthetic Casing</label>
            <select value={caseTransform} onChange={(e) => setCaseTransform(e.target.value)}>
              <option value="none">Original Data (No Change)</option>
              <option value="upper">GLOBAL UPPERCASE</option>
              <option value="lower">global lowercase</option>
              <option value="title">Global Title Case</option>
            </select>
          </div>
        </div>

        <div className="checkbox-grid" style={{
          marginTop: 40,
          paddingTop: 32,
          borderTop: '1px solid var(--border-color)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16
        }}>
          <label className="checkbox"><input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} /><ListFilter size={18} /> Unique Keys</label>
          <label className="checkbox"><input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /><ArrowDownWideNarrow size={18} /> Sort A-Z</label>
          <label className="checkbox"><input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} /><RefreshCcw size={18} /> Reverse Flow</label>
          <label className="checkbox"><input type="checkbox" checked={ignoreComments} onChange={(e) => setIgnoreComments(e.target.checked)} /><Hash size={18} /> Skip Comments</label>
          <label className="checkbox"><input type="checkbox" checked={trimItems} onChange={(e) => setTrimItems(e.target.checked)} /><Scissors size={18} /> Clean Space</label>
          <label className="checkbox"><input type="checkbox" checked={stripQuotes} onChange={(e) => setStripQuotes(e.target.checked)} /><Quote size={18} /> Strip Quotes</label>
        </div>
      </div>

      {/* Activation Hub */}
      <div className="flex-responsive" style={{ margin: "40px 0", justifyContent: 'center' }}>
        <button className="primary" onClick={handleConvert} disabled={loading} style={{ padding: "20px 100px", fontSize: "18px", borderRadius: '24px' }}>
          {loading ? <Loader2 className="animate-spin" /> : <><Zap /> Execute Industrial Refinement</>}
        </button>
      </div>

      {/* Insight Section */}
      <div className="tool-help-section" style={{ background: 'var(--primary-glow)' }}>
        <div className="tool-help-icon">
          <Braces size={24} />
        </div>
        <div className="tool-help-content">
          <h5>Architectural Insight: Encapsulation</h5>
          <p>By using the <strong>Stream Encapsulation</strong> (Start/End), you can instantly wrap your data for target environments—like <code>[ ]</code> for JSON arrays or <code>( )</code> for SQL IN clauses. The refinery handles the trailing delimiter perfectly every time.</p>
        </div>
      </div>
    </div>
  );
}



