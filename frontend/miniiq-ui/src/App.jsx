import { useState } from "react";
import "./App.css";

const TOOLS = [
  { label: "Column → CSV", value: "column_to_csv" },
  { label: "Column → Quoted CSV", value: "column_to_quoted_csv" },
  { label: "CSV → Column", value: "csv_to_column" },
  { label: "Spaces → Commas", value: "spaces_to_commas" },
  { label: "Newlines → Commas", value: "newlines_to_commas" },
];

function App() {
  const [activeTab, setActiveTab] = useState("text");

  // ---------- STATE MANAGEMENT ----------
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [tool, setTool] = useState(TOOLS[0].value);
  const [loading, setLoading] = useState(false);
  const [csvFiles, setCsvFiles] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [excelFiles, setExcelFiles] = useState([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [removeFile, setRemoveFile] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [excelMeta, setExcelMeta] = useState({});
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([]);

  // ---------- HELPER FUNCTIONS ----------
  const download = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const runTool = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("http://127.0.0.1:8000/text-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, tool }),
      });
      const data = await res.json();
      setOutput(data.output || "");
    } catch {
      setOutput("Error connecting to backend");
    }
    setLoading(false);
  };

  const mergeCSV = async () => {
    if (csvFiles.length < 2) return alert("Upload at least 2 CSV files");
    setCsvLoading(true);
    const formData = new FormData();
    csvFiles.forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("http://127.0.0.1:8000/merge-csv", {
        method: "POST",
        body: formData,
      });
      const blob = await res.blob();
      download(blob, "merged.csv");
    } catch {
      alert("CSV merge failed");
    }
    setCsvLoading(false);
  };

  const mergeExcel = async () => {
    if (excelFiles.length < 2) return alert("Upload at least 2 Excel files");
    setExcelLoading(true);
    const formData = new FormData();
    excelFiles.forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("http://127.0.0.1:8000/merge-excel", {
        method: "POST",
        body: formData,
      });
      const blob = await res.blob();
      download(blob, "merged.xlsx");
    } catch {
      alert("Excel merge failed");
    }
    setExcelLoading(false);
  };

  const fetchExcelMetadata = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("http://127.0.0.1:8000/excel-metadata", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setExcelMeta(data);
    const firstSheet = Object.keys(data)[0];
    setSelectedSheet(firstSheet);
    setSelectedColumns([]);
  };

  const removeColumns = async () => {
    if (!removeFile || !selectedSheet || selectedColumns.length === 0) {
      alert("Select a sheet and at least one column");
      return;
    }
    setRemoveLoading(true);
    const formData = new FormData();
    formData.append("file", removeFile);
    formData.append("sheet_name", selectedSheet);
    formData.append("columns", selectedColumns.join(","));
    try {
      const res = await fetch("http://127.0.0.1:8000/remove-columns", {
        method: "POST",
        body: formData,
      });
      const blob = await res.blob();
      download(blob, "cleaned.xlsx");
    } catch {
      alert("Failed to remove columns");
    }
    setRemoveLoading(false);
  };

  // ---------- UI RENDERING ----------
  return (
    <div className="app">
      <h2>MiniIQ Toolkit</h2>

      <div className="tabs">
        <button
          className={activeTab === "text" ? "active" : ""}
          onClick={() => setActiveTab("text")}
        >
          Text
        </button>

        <button
          className={activeTab === "csv" ? "active" : ""}
          onClick={() => setActiveTab("csv")}
        >
          CSV
        </button>

        <button
          className={activeTab === "excel" ? "active" : ""}
          onClick={() => setActiveTab("excel")}
        >
          Excel
        </button>

        <button
          className={activeTab === "remove" ? "active" : ""}
          onClick={() => setActiveTab("remove")}
        >
          Remove Columns
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "text" && (
          <div className="tool-container">
            <select value={tool} onChange={(e) => setTool(e.target.value)}>
              {TOOLS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <textarea
              rows="5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Input"
            />
            <button onClick={runTool} disabled={loading}>
              {loading ? "Converting..." : "Convert"}
            </button>
            <textarea rows="5" value={output} readOnly placeholder="Output" />
          </div>
        )}

        {activeTab === "csv" && (
          <div className="tool-container">
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={(e) => setCsvFiles([...e.target.files])}
            />
            <button onClick={mergeCSV} disabled={csvLoading}>
              {csvLoading ? "Merging..." : "Merge CSV"}
            </button>
          </div>
        )}

        {activeTab === "excel" && (
          <div className="tool-container">
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFiles([...e.target.files])}
            />
            <button onClick={mergeExcel} disabled={excelLoading}>
              {excelLoading ? "Merging..." : "Merge Excel"}
            </button>
          </div>
        )}

        {activeTab === "remove" && (
          <div className="tool-container">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                setRemoveFile(file);
                fetchExcelMetadata(file);
              }}
            />

            {Object.keys(excelMeta).length > 0 && (
              <select
                value={selectedSheet}
                onChange={(e) => {
                  setSelectedSheet(e.target.value);
                  setSelectedColumns([]);
                }}
              >
                {Object.keys(excelMeta).map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            )}

            {selectedSheet && (
              <div className="column-controls">
                <button
                  onClick={() =>
                    setSelectedColumns(excelMeta[selectedSheet] || [])
                  }
                >
                  Select All
                </button>
                <button onClick={() => setSelectedColumns([])}>
                  Deselect All
                </button>
              </div>
            )}

            <div className="column-grid">
              {excelMeta[selectedSheet]?.map((col) => (
                <label key={col} className="column-label">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={() =>
                      setSelectedColumns((prev) =>
                        prev.includes(col)
                          ? prev.filter((c) => c !== col)
                          : [...prev, col]
                      )
                    }
                  />
                  {col}
                </label>
              ))}
            </div>

            <button
              onClick={removeColumns}
              disabled={removeLoading}
              className="action-button"
            >
              {removeLoading ? "Processing..." : "Remove Selected Columns"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
