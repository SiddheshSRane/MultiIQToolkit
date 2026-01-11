import { useEffect, useState } from "react";
import { convertColumn, exportXlsx } from "../api/client";

export default function Converter() {
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
    <div>
      <p className="desc">
        Clean, fast column & text transformation. Paste values below.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Input</h4>
        <button className="text-btn" onClick={clearAll}>Clear All</button>
      </div>

      <textarea
        rows={8}
        placeholder="Paste one value per line (Ctrl + Enter to convert)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {stats && (
        <div className="stats" style={{ marginBottom: 20 }}>
          <strong>Lines:</strong> {stats.total_lines} <span>•</span>{" "}
          <strong>Non-empty:</strong> {stats.non_empty} <span>•</span>{" "}
          <strong>Unique:</strong> {stats.unique}
        </div>
      )}

      <div className="section">
        <h4>Formatting</h4>
        <div className="form-grid">
          <div className="input-group">
            <label>Delimiter</label>
            <input
              type="text"
              placeholder="e.g. , "
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Item Prefix</label>
            <input
              type="text"
              value={itemPrefix}
              onChange={(e) => setItemPrefix(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Item Suffix</label>
            <input
              type="text"
              value={itemSuffix}
              onChange={(e) => setItemSuffix(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Result Prefix</label>
            <input
              type="text"
              value={resultPrefix}
              onChange={(e) => setResultPrefix(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Result Suffix</label>
            <input
              type="text"
              value={resultSuffix}
              onChange={(e) => setResultSuffix(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <h4>Options</h4>
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
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Casing:</span>
            <select
              value={caseTransform}
              onChange={(e) => setCaseTransform(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: "4px", background: "var(--card-bg)", color: "var(--text-main)", border: "1px solid var(--border-color)" }}
            >
              <option value="none">Original</option>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="title">Title Case</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section action">
        <button onClick={handleConvert} disabled={!input || loading} className="primary">
          {loading ? "Converting..." : "Convert"}
        </button>
      </div>

      {output && (
        <div className="section">
          <h4>Result</h4>
          <textarea
            rows={8}
            readOnly
            value={output}
            placeholder="Result"
          />

          <div className="inline" style={{ marginTop: 16, gap: 12 }}>
            <button className="secondary" onClick={() => navigator.clipboard.writeText(output)}>
              Copy Result
            </button>
            <button
              className="secondary"
              onClick={() => {
                const blob = new Blob([output], { type: "text/plain" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "conversion.txt";
                link.click();
              }}
            >
              Download .txt
            </button>
            <button
              className="secondary"
              onClick={() => {
                const blob = new Blob([output], { type: "text/csv" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "conversion.csv";
                link.click();
              }}
            >
              Download .csv
            </button>
            <button
              className="primary"
              onClick={() => exportXlsx(getPayload())}
              style={{ marginLeft: "auto" }}
            >
              Download .xlsx
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
