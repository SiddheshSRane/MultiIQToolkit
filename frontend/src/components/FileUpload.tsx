import { useState, useRef, useCallback, useMemo } from "react";
import { Upload, File as FileIcon, Archive, X } from "lucide-react";

interface FileUploadProps {
    onFilesSelected: (files: File[]) => void;
    multiple?: boolean;
    accept?: string;
    files: File[];
}

const DEFAULT_ACCEPT = ".csv,.xlsx,.xls,.zip";

export default function FileUpload({
    onFilesSelected,
    multiple = true,
    accept = DEFAULT_ACCEPT,
    files
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            const newFiles = multiple ? [...files, ...droppedFiles] : [droppedFiles[0]];
            onFilesSelected(newFiles);
        }
    }, [files, multiple, onFilesSelected]);

    const formatSize = useCallback((bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }, []);

    const removeFile = useCallback((index: number) => {
        const updated = files.filter((_, i) => i !== index);
        onFilesSelected(updated);
    }, [files, onFilesSelected]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = Array.from(e.target.files);
            const newFiles = multiple ? [...files, ...selected] : [selected[0]];
            onFilesSelected(newFiles);
        }
        // Reset input to allow selecting the same file again
        e.target.value = "";
    }, [files, multiple, onFilesSelected]);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const totalSize = useMemo(() => {
        return files.reduce((sum, file) => sum + file.size, 0);
    }, [files]);

    return (
        <div className="file-upload-container">
            <div
                className={`drop-zone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                role="button"
                tabIndex={0}
                aria-label="File upload drop zone"
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            >
                <div className="drop-zone-icon">
                    {isDragging ? (
                        <Upload size={40} className="text-primary" aria-hidden="true" />
                    ) : (
                        <FileIcon size={40} className="text-primary" style={{ opacity: 0.5 }} aria-hidden="true" />
                    )}
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
                    onChange={handleFileInputChange}
                    aria-label="File input"
                />
            </div>

            {files.length > 0 && (
                <div className="file-staged-list">
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                        {files.length} file{files.length > 1 ? "s" : ""} selected ({formatSize(totalSize)})
                    </div>
                    {files.map((f, i) => (
                        <div key={`${f.name}-${i}-${f.size}`} className="file-staged-item">
                            <div className="file-info">
                                <span style={{ fontSize: "18px", display: "flex", alignItems: "center" }} aria-hidden="true">
                                    {f.name.endsWith(".zip") ? <Archive size={18} /> : <FileIcon size={18} />}
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
                                title={`Remove ${f.name}`}
                                aria-label={`Remove file ${f.name}`}
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
