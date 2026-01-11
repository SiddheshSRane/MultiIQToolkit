import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import FileMerger from "./pages/FileMerger";
import { useState } from "react";

export default function App() {
  const [page, setPage] = useState<"convert" | "file" | "merge">("convert");

  return (
    <div className="app">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>MiniIQ Toolkit</h2>
      </div>

      <div className="nav-tabs">
        <button
          className={page === "convert" ? "active" : ""}
          onClick={() => setPage("convert")}
        >
          Text Transformer
        </button>
        <button
          className={page === "file" ? "active" : ""}
          onClick={() => setPage("file")}
        >
          Bulk File Editor
        </button>
        <button
          className={page === "merge" ? "active" : ""}
          onClick={() => setPage("merge")}
        >
          Advanced File Merger
        </button>
      </div>

      {page === "convert" && <Converter />}
      {page === "file" && <FileModify />}
      {page === "merge" && <FileMerger />}
    </div>
  );
}
