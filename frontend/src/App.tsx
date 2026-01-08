import Converter from "./pages/Converter";
import FileModify from "./pages/FileModify";
import { useState } from "react";

export default function App() {
  const [page, setPage] = useState<"convert" | "file">("convert");

  return (
    <>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={() => setPage("convert")}>
          Column Converter
        </button>
        <button onClick={() => setPage("file")}>
          File Modify
        </button>
      </div>

      {page === "convert" && <Converter />}
      {page === "file" && <FileModify />}
    </>
  );
}
