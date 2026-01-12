import { useState, useRef } from "react";
import { Upload, File, Archive, X } from "lucide-react";

interface FileUploadProps {
    onFilesSelected: (files: File[]) => void;
    multiple?: boolean;
    accept?: string;
    files: File[];
}

export default function FileUpload({ onFilesSelected, multiple = true, accept = ".csv,.xlsx,.xls,.zip", files }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            onFilesSelected(multiple ? [...files, ...droppedFiles] : [droppedFiles[0]]);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const removeFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        onFilesSelected(updated);
    };

    return (
        <div className="file-upload-container">
            <div
                className={`drop-zone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="drop-zone-icon">
                    {isDragging ? <Upload size={40} className="text-primary" /> : <File size={40} className="text-primary" style={{ opacity: 0.5 }} />}
                </div>
                <div className="drop-zone-text">
                    <p style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "16px" }}>
                        {isDragging ? "Drop them here!" : "Click or Drag & Drop"}
                    </p>
                    <p className="desc" style={{ margin: 0, fontSize: "13px" }}>
                        Supports CSV, Excel, and ZIP files
                    </p>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    multiple={multiple}
                    accept={accept}
                    onChange={(e) => {
                        if (e.target.files) {
                            const selected = Array.from(e.target.files);
                            onFilesSelected(multiple ? [...files, ...selected] : [selected[0]]);
                        }
                    }}
                />
            </div>

            {files.length > 0 && (
                <div className="file-staged-list">
                    {files.map((f, i) => (
                        <div key={`${f.name}-${i}`} className="file-staged-item">
                            <div className="file-info">
                                <span style={{ fontSize: "18px", display: "flex", alignItems: "center" }}>
                                    {f.name.endsWith(".zip") ? <Archive size={18} /> : <File size={18} />}
                                </span>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 600 }}>{f.name}</span>
                                    <span className="file-size">{formatSize(f.size)}</span>
                                </div>
                            </div>
                            <button
                                className="remove-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(i);
                                }}
                                title="Remove file"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
