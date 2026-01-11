import { useEffect, useState } from "react";
import { convertColumn, exportXlsx } from "../api/client";

interface ConverterProps {
  onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function Converter({ onLogAction }: ConverterProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<any>(null);

  const [delimiter, setDelimiter] = useState(", ");
  const [itemPrefix, setItemPrefix] = useState("");
  const [itemSuffix, setItemSuffix] = useState("");
  const [resultPrefix, setResultPrefix] = useState("");
  const [resultSuffix, setResultSuffix] = useState("");

  const [dedupe, setDedupe] = useState(false);
  const [sort, setSort] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [ignoreComments, setIgnoreComments] = useState(true);
  const [stripQuotes, setStripQuotes] = useState(false);
  const [trimItems, setTrimItems] = useState(true);
  const [caseTransform, setCaseTransform] = useState("none");

  const [loading, setLoading] = useState(false);

  const getPayload = () => ({
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
  });

  const handleConvert = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await convertColumn(getPayload());
      setOutput(res.result);
      setStats(res.stats);
      if (onLogAction) {
        onLogAction("Text Conversion", "conversion.txt", new Blob([res.result], { type: "text/plain" }));
      }
    } catch (e) {
      alert("Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setStats(null);
  };

  /* 🔥 Keyboard shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        handleConvert();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [input, delimiter, itemPrefix, itemSuffix, dedupe, sort, reverse, ignoreComments, stripQuotes, trimItems, caseTransform]);

  return (
    <div className="app glass-card">
      <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span>📝</span> Text Transformer
      </h2>
      <p className="desc">
        CLEAN, FAST COLUMN & TEXT TRANSFORMATION. PASTE VALUES BELOW.
      </p>

      {/* --- PRESETS --- */}
      <div className="section" style={{ marginBottom: 32 }}>
        <h4><span>✨</span> Quick Presets</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          <button className="secondary" onClick={() => {
            setDelimiter(", "); setItemPrefix(""); setItemSuffix(""); setResultPrefix(""); setResultSuffix("");
          }}>📊 Comma CSV</button>
          <button className="secondary" onClick={() => {
            setDelimiter(", "); setItemPrefix("'"); setItemSuffix("'"); setResultPrefix(""); setResultSuffix("");
          }}>✨ Quoted CSV</button>
          <button className="secondary" onClick={() => {
            setDelimiter("\\n"); setItemPrefix(""); setItemSuffix(""); setResultPrefix(""); setResultSuffix("");
          }}>📋 Newline List</button>
        </div>
      </div>

      <div className="flex-responsive" style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>
          <span>📥</span> Input Values
        </h4>
        <button className="secondary" onClick={clearAll} style={{ padding: "6px 12px", fontSize: "12px" }}>Clear All</button>
      </div>

      <textarea
        rows={8}
        placeholder="Paste one value per line (Ctrl + Enter to convert)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <p className="desc" style={{ fontSize: "11px", textAlign: "right", marginTop: "8px", opacity: 0.7 }}>
        ⌨️ Press <b>Ctrl + Enter</b> to convert instantly
      </p>

      <div className="stats" style={{ marginBottom: 24, padding: "12px 20px" }}>
        <strong>Lines:</strong> {stats?.total_lines || 0} <span style={{ opacity: 0.3, margin: "0 8px" }}>|</span>{" "}
        <strong>Non-empty:</strong> {stats?.non_empty || 0} <span style={{ opacity: 0.3, margin: "0 8px" }}>|</span>{" "}
        <strong>Unique:</strong> {stats?.unique || 0}
      </div>

      <div className="section">
        <h4>
          <span>🛠️</span> Formatting
        </h4>
        <div className="form-grid">
          <div className="input-group">
            <label>Delimiter</label>
            <input
              type="text"
              placeholder="e.g. , "
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
            />
            <p className="desc" style={{ fontSize: "11px", marginTop: 4 }}>
              💡 Use <b>\n</b> for new lines or <b>,</b> for commas.
            </p>
          </div>
          <div className="input-group">
            <label>Item Prefix</label>
            <input
              type="text"
              placeholder="e.g. '"
              value={itemPrefix}
              onChange={(e) => setItemPrefix(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Item Suffix</label>
            <input
              type="text"
              placeholder="e.g. '"
              value={itemSuffix}
              onChange={(e) => setItemSuffix(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Result Prefix</label>
            <input
              type="text"
              placeholder="e.g. ["
              value={resultPrefix}
              onChange={(e) => setResultPrefix(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Result Suffix</label>
            <input
              type="text"
              placeholder="e.g. ]"
              value={resultSuffix}
              onChange={(e) => setResultSuffix(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <h4>
          <span>⚙️</span> Options
        </h4>
        <div className="options-grid">
          <label className="checkbox">
            <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
            Remove duplicates
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />
            Sort items
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
            Reverse list
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={ignoreComments} onChange={(e) => setIgnoreComments(e.target.checked)} />
            Ignore comments
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={stripQuotes} onChange={(e) => setStripQuotes(e.target.checked)} />
            Strip quotes
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={trimItems} onChange={(e) => setTrimItems(e.target.checked)} />
            Trim whitespace
          </label>
          <div className="input-group">
            <label>Casing</label>
            <select
              value={caseTransform}
              onChange={(e) => setCaseTransform(e.target.value)}
              style={{ width: "auto", minWidth: "120px" }}
            >
              <option value="none">Original</option>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="title">Title Case</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section flex-responsive">
        <h4 style={{ margin: 0 }}>
          <span>🚀</span> Ready to convert?
        </h4>
        <button onClick={handleConvert} disabled={!input || loading} className="primary">
          {loading ? (
            <><span>⌛</span> Converting...</>
          ) : (
            <><span>⚡</span> Apply Conversion</>
          )}
        </button>
      </div>

      {output && (
        <div className="section">
          <h4>
            <span>✨</span> Converted Results
          </h4>
          <textarea
            rows={8}
            readOnly
            value={output}
            placeholder="Result"
            style={{ marginBottom: 20 }}
          />

          <div className="inline">
            <button className="secondary" onClick={() => navigator.clipboard.writeText(output)}>
              <span>📋</span> Copy Result
            </button>
            <button className="secondary" onClick={() => {
              const blob = new Blob([output], { type: "text/plain" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "conversion.txt";
              link.click();
              if (onLogAction) onLogAction("Download TXT", "conversion.txt", blob);
            }}>
              <span>📄</span> .txt
            </button>
            <button className="primary" onClick={async () => {
              const blob = await exportXlsx(getPayload());
              if (onLogAction && blob) onLogAction("Download XLSX", "conversion.xlsx", blob);
            }}
              style={{ marginLeft: "auto" }}
            >
              <span>🚀</span> Download .xlsx
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
