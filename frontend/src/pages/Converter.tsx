import { useEffect, useState } from "react";
import { convertColumn } from "../api/client";

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
  const [ignoreComments, setIgnoreComments] = useState(true);
  const [stripQuotes, setStripQuotes] = useState(false);

  const handleConvert = async () => {
    if (!input) return;

    const res = await convertColumn({
      text: input,
      delimiter,
      item_prefix: itemPrefix,
      item_suffix: itemSuffix,
      result_prefix: resultPrefix,
      result_suffix: resultSuffix,
      remove_duplicates: dedupe,
      sort_items: sort,
      ignore_comments: ignoreComments,
      strip_quotes: stripQuotes,
    });

    setOutput(res.result);
    setStats(res.stats);
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
  }, [input]);

  return (
    <div>
      <p className="desc">
        Clean, fast column & text transformation. Paste values below.
      </p>

      <textarea
        rows={6}
        placeholder="Paste one value per line (Ctrl + Enter to convert)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {stats && (
        <div className="stats">
          <strong>Lines:</strong> {stats.total_lines} <span>•</span>{" "}
          <strong>Non-empty:</strong> {stats.non_empty} <span>•</span>{" "}
          <strong>Unique:</strong> {stats.unique}
        </div>
      )}

      <div className="section">
        <h4>Formatting</h4>
        <div className="form-grid">
          <input
            type="text"
            placeholder="Delimiter (e.g. , )"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
          />
          <input
            type="text"
            placeholder="Item Prefix"
            value={itemPrefix}
            onChange={(e) => setItemPrefix(e.target.value)}
          />
          <input
            type="text"
            placeholder="Item Suffix"
            value={itemSuffix}
            onChange={(e) => setItemSuffix(e.target.value)}
          />
          <input
            type="text"
            placeholder="Result Prefix"
            value={resultPrefix}
            onChange={(e) => setResultPrefix(e.target.value)}
          />
          <input
            type="text"
            placeholder="Result Suffix"
            value={resultSuffix}
            onChange={(e) => setResultSuffix(e.target.value)}
          />
        </div>
      </div>

      <div className="section">
        <h4>Options</h4>
        <div className="options-grid">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={dedupe}
              onChange={(e) => setDedupe(e.target.checked)}
            />
            Remove duplicates
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={sort}
              onChange={(e) => setSort(e.target.checked)}
            />
            Sort items
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={ignoreComments}
              onChange={(e) => setIgnoreComments(e.target.checked)}
            />
            Ignore comments
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={stripQuotes}
              onChange={(e) => setStripQuotes(e.target.checked)}
            />
            Strip quotes
          </label>
        </div>
      </div>

      <div className="section action">
        <button onClick={handleConvert} disabled={!input}>
          Convert
        </button>
      </div>

      {output && (
        <div className="section">
          <h4>Result</h4>
          <textarea
            rows={6}
            readOnly
            value={output}
            placeholder="Result"
          />

          <div className="inline" style={{ marginTop: 12 }}>
            <button className="secondary" onClick={() => navigator.clipboard.writeText(output)}>
              Copy to Clipboard
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
          </div>
        </div>
      )}
    </div>
  );
}
