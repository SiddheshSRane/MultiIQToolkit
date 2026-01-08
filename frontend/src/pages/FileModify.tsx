import { useState } from "react";

type PreviewResponse = {
  columns: string[];
  sheets: string[] | null;
};

export default function FileModify() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sheets, setSheets] = useState<string[] | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* =========================
     Fetch column preview
     ========================= */
  const fetchPreview = async (f: File, sheetName?: string | null) => {
    const fd = new FormData();
    fd.append("file", f);
    if (sheetName) fd.append("sheet_name", sheetName);

    const res = await fetch("http://localhost:8000/file/preview-columns", {
      method: "POST",
      body: fd,
    });

    const data: PreviewResponse = await res.json();
    setColumns(data.columns);
    setSheets(data.sheets);
  };

  /* =========================
     Handle file upload
     ========================= */
  const handleFileChange = async (f: File) => {
    setFile(f);
    setSelected([]);
    setColumns([]);
    setSheets(null);
    setSheet(null);

    const fd = new FormData();
    fd.append("file", f);

    const res = await fetch("http://localhost:8000/file/preview-columns", {
      method: "POST",
      body: fd,
    });

    const data: PreviewResponse = await res.json();

    setSheets(data.sheets);

    const firstSheet = data.sheets ? data.sheets[0] : null;
    setSheet(firstSheet);

    setColumns(data.columns);
  };

  /* =========================
     Toggle column checkbox
     ========================= */
  const toggleColumn = (col: string) => {
    setSelected((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
    );
  };

  /* =========================
     Apply remove columns
     ========================= */
  const handleApply = async () => {
    if (!file || selected.length === 0) {
      alert("Select a file and at least one column");
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("columns", selected.join(","));
    if (sheet) fd.append("sheet_name", sheet);

    const res = await fetch("http://localhost:8000/file/remove-columns", {
      method: "POST",
      body: fd,
    });

    const blob = await res.blob();

    /* Read filename from backend */
    const contentDisposition = res.headers.get("content-disposition");
    let filename = "cleaned_file";

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match && match[1]) filename = match[1];
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    setLoading(false);
  };

  return (
    <div className="app">
      <h2>File Modify — Remove Columns</h2>
      <p style={{ color: "#94a3b8", marginBottom: 16 }}>
        Upload a CSV or Excel file and remove selected columns
      </p>

      {/* ================= FILE ================= */}
      <div className="section">
        <h4>File</h4>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) =>
            e.target.files && handleFileChange(e.target.files[0])
          }
        />

        {sheets && (
          <div className="inline">
            <label>Sheet</label>
            <select
              value={sheet ?? ""}
              onChange={async (e) => {
                const newSheet = e.target.value;
                setSheet(newSheet);
                setSelected([]);

                if (file) {
                  await fetchPreview(file, newSheet);
                }
              }}
            >
              {sheets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ================= COLUMNS ================= */}
      {columns.length > 0 && (
        <div className="section">
          <h4>Select columns to remove</h4>

          <div className="checkbox-grid">
            {columns.map((col) => (
              <label key={col} className="checkbox">
                <input
                  type="checkbox"
                  checked={selected.includes(col)}
                  onChange={() => toggleColumn(col)}
                />
                {col}
              </label>
            ))}
          </div>

          <p style={{ marginTop: 8, color: "#94a3b8", fontSize: 13 }}>
            Selected: {selected.length}
          </p>
        </div>
      )}

      {/* ================= ACTION ================= */}
      <div className="section action">
        <button onClick={handleApply} disabled={loading}>
          {loading ? "Processing..." : "Apply"}
        </button>
      </div>
    </div>
  );
}
