import { useEffect, useState } from "react";
import { convertColumn } from "../api/client";

export default function Converter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [dark, setDark] = useState(false);

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

  /* 🌙 Dark mode */
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="app">
      <span className="toggle" onClick={() => setDark(!dark)}>
        {dark ? "☀ Light mode" : "🌙 Dark mode"}
      </span>

      <h2>MiniIQ Toolkit</h2>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        Clean, fast column & text transformation
      </p>

      <textarea
        rows={8}
        placeholder="Paste one value per line (Ctrl + Enter to convert)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {stats && (
        <div className="stats">
          Lines: {stats.total_lines} | Non-empty: {stats.non_empty} | Unique:{" "}
          {stats.unique}
        </div>
      )}

      <h4>Formatting</h4>
      <input
        type="text"
        placeholder="Delimiter"
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

      <h4>Options</h4>
      <div className="options">
        <label>
          <input
            type="checkbox"
            checked={dedupe}
            onChange={(e) => setDedupe(e.target.checked)}
          />{" "}
          Remove duplicates
        </label>

        <label>
          <input
            type="checkbox"
            checked={sort}
            onChange={(e) => setSort(e.target.checked)}
          />{" "}
          Sort items
        </label>

        <label>
          <input
            type="checkbox"
            checked={ignoreComments}
            onChange={(e) => setIgnoreComments(e.target.checked)}
          />{" "}
          Ignore comments
        </label>

        <label>
          <input
            type="checkbox"
            checked={stripQuotes}
            onChange={(e) => setStripQuotes(e.target.checked)}
          />{" "}
          Strip quotes
        </label>
      </div>

      <br />

      <button onClick={handleConvert} disabled={!input}>
        Convert
      </button>

      <textarea
        rows={8}
        readOnly
        value={output}
        placeholder="Result"
        style={{ marginTop: 16 }}
      />

      <br />

      <button onClick={() => navigator.clipboard.writeText(output)}>
        Copy
      </button>

      <button
        onClick={() => {
          const blob = new Blob([output], { type: "text/plain" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "conversion.txt";
          link.click();
        }}
      >
        Download
      </button>
    </div>
  );
}
