import { useState, useCallback } from "react";
import { splitFile } from "../api/client";
import FileUpload from "../components/FileUpload";
import { useNotifications } from "../contexts/NotificationContext";
import {
    Scissors,
    File as FileIcon,
    Loader2,
    Sparkles,
    Settings,
} from "lucide-react";
import { downloadBlob } from "../utils/download";

interface FileSplitterProps {
    onLogAction?: (action: string, filename: string, blob: Blob) => void;
}

export default function FileSplitter({ onLogAction }: FileSplitterProps) {
    const { notify } = useNotifications();
    const [file, setFile] = useState<File | null>(null);
    const [rowsPerSplit, setRowsPerSplit] = useState(1000);
    const [loading, setLoading] = useState(false);

    const handleApply = useCallback(async () => {
        if (!file) {
            notify('error', 'File Required', "Please upload a file to split.");
            return;
        }

        setLoading(true);
        const loadingId = notify('loading', 'Splitting File', `Dividing into ${rowsPerSplit} row chunks...`);

        try {
            const blob = await splitFile(file, rowsPerSplit);
            const outName = `${file.name.split('.')[0]}_split_parts.zip`;

            downloadBlob(blob, outName);
            notify('success', 'Split Complete', `Successfully divided into parts.`, 5000, loadingId);
            if (onLogAction) onLogAction("File Split", outName, blob);

        } catch (e) {
            console.error("Split error:", e);
            notify('error', 'Split Failed', e instanceof Error ? e.message : "An error occurred.", 5000, loadingId);
        } finally {
            setLoading(false);
        }
    }, [file, rowsPerSplit, onLogAction, notify]);

    return (
        <div className="app page-enter">
            {/* File Upload */}
            <div className="section slide-in-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--gradient-primary)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <FileIcon size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>SOURCE FILE</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Upload CSV or Excel file to split</p>
                    </div>
                </div>
                <FileUpload files={file ? [file] : []} onFilesSelected={(fs) => setFile(fs[0] || null)} />
            </div>

            {file && (
                <div className="section slide-in-left" style={{ animationDelay: '0.1s', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'var(--gradient-info)',
                        borderRadius: '24px 24px 0 0'
                    }} />

                    <div style={{ paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <Settings size={20} style={{ color: 'var(--primary)' }} />
                            <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>SPLIT CONFIGURATION</h4>
                        </div>

                        <div className="input-group" style={{ maxWidth: '300px' }}>
                            <label>Rows Per File</label>
                            <input
                                type="number"
                                value={rowsPerSplit}
                                onChange={(e) => setRowsPerSplit(Math.max(1, parseInt(e.target.value) || 0))}
                                min="1"
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                Lower values create more files but ensure each is under platform limits.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
                <button
                    onClick={handleApply}
                    disabled={loading || !file}
                    style={{
                        padding: '18px 60px',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '16px',
                        background: loading ? 'var(--text-muted)' : 'var(--gradient-primary)',
                        border: 'none',
                        color: 'white',
                        boxShadow: loading ? 'none' : 'var(--shadow-xl)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Splitting...
                        </>
                    ) : (
                        <>
                            <Scissors size={20} />
                            Split File
                        </>
                    )}
                </button>
            </div>

            {/* Pro Tip */}
            <div className="tool-help-section scale-in" style={{ animationDelay: '0.3s' }}>
                <div className="tool-help-icon">
                    <Sparkles size={16} />
                </div>
                <div className="tool-help-content">
                    <h5>Pro Tip: Managing Large Datasets</h5>
                    <p style={{ fontSize: '13px' }}>
                        Web platforms often have a <strong>4.5MB payload limit</strong>. If your file is larger, use this tool to split it into smaller chunks (e.g., 5000 rows each). This allows you to process each chunk individually using the other refinery tools.
                    </p>
                </div>
            </div>
        </div>
    );
}
