import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import { useState, useEffect } from "react";

export default function App() {
  const [page, setPage] = useState<"convert" | "file">("convert");
  const [dark, setDark] = useState(true);

  /* 🌙 Dark mode effect */
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="app">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>MiniIQ Toolkit</h2>
        <button
          className="secondary"
          onClick={() => setDark(!dark)}
          style={{ margin: 0, padding: "8px 12px", fontSize: "13px" }}
        >
          {dark ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>

      <div className="nav-tabs">
        <button
          className={page === "convert" ? "active" : ""}
          onClick={() => setPage("convert")}
        >
          Converter
        </button>
        <button
          className={page === "file" ? "active" : ""}
          onClick={() => setPage("file")}
        >
          File Modify
        </button>
      </div>

      {page === "convert" && <Converter />}
      {page === "file" && <FileModify />}
    </div>
  );
}
