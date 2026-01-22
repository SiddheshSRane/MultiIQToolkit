
import React, { useState, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Image as ImageIcon, Palette, Wifi, Globe, Loader2, Zap, Settings } from 'lucide-react';
import { useNotifications } from "../contexts/NotificationContext";

interface QrFusionProps {
    onLogAction: (action: string, filename: string, blob: Blob) => void;
}

export default function QrFusion({ onLogAction }: QrFusionProps) {
    const { notify } = useNotifications();
    const [mode, setMode] = useState<'text' | 'wifi'>('text');
    const [text, setText] = useState('https://datarefinery.app');

    // Wi-Fi States
    const [ssid, setSsid] = useState('');
    const [wifiPass, setWifiPass] = useState('');
    const [encryption, setEncryption] = useState('WPA');
    const [hidden, setHidden] = useState(false);

    const [fgColor, setFgColor] = useState('#4f46e5');
    const [bgColor, setBgColor] = useState('#ffffff');
    const [size, setSize] = useState(256);
    const [includeImage, setIncludeImage] = useState(false);
    const [imageSrc, setImageSrc] = useState('');
    const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
    const [loading, setLoading] = useState(false);

    const qrValue = mode === 'text'
        ? text
        : `WIFI:T:${encryption};S:${ssid};P:${wifiPass};H:${hidden};;`;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageSrc(event.target?.result as string);
                setIncludeImage(true);
                notify('success', 'Asset Loaded', 'Logo embedded into QR engine.');
            };
            reader.readAsDataURL(file);
        }
    };

    const downloadQr = useCallback(() => {
        setLoading(true);
        const canvas = document.querySelector('.qr-fusion-canvas canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const name = `qr_fusion_${Date.now()}.png`;
                    link.download = name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    onLogAction('Generated QR Code', name, blob);
                    notify('success', 'Blueprint Exported', 'High-resolution QR asset is ready.');
                }
                setLoading(false);
            }, 'image/png');
        } else {
            setLoading(false);
        }
    }, [onLogAction, notify]);

    return (
        <div className="app">
            <div className="mode-group" style={{ marginBottom: 32 }}>
                <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>
                    <Globe size={16} /> URL / Plain Text
                </button>
                <button className={mode === 'wifi' ? 'active' : ''} onClick={() => setMode('wifi')}>
                    <Wifi size={16} /> Wi-Fi Credentials
                </button>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                    <div className="section">
                        <h4><Settings size={18} /> Content Configuration</h4>
                        {mode === 'text' ? (
                            <div className="input-group">
                                <label>Target Payload</label>
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Enter URL or text to encode..."
                                    rows={4}
                                />
                            </div>
                        ) : (
                            <div className="form-grid">
                                <div className="input-group">
                                    <label>Network SSID</label>
                                    <input type="text" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="Home_WiFi" />
                                </div>
                                <div className="input-group">
                                    <label>Access Password</label>
                                    <input type="text" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} placeholder="••••••••" />
                                </div>
                                <div className="input-group">
                                    <label>Encryption</label>
                                    <select value={encryption} onChange={(e) => setEncryption(e.target.value)}>
                                        <option value="WPA">WPA/WPA2</option>
                                        <option value="WEP">WEP</option>
                                        <option value="nopass">No Password</option>
                                    </select>
                                </div>
                                <label className="checkbox">
                                    <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
                                    Hidden Network
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="form-grid">
                        <div className="section">
                            <h4><Palette size={18} /> Aesthetics</h4>
                            <div className="form-grid">
                                <div className="input-group">
                                    <label>Foreground</label>
                                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} style={{ padding: 4, height: 44 }} />
                                </div>
                                <div className="input-group">
                                    <label>Background</label>
                                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ padding: 4, height: 44 }} />
                                </div>
                            </div>
                        </div>

                        <div className="section">
                            <h4><ImageIcon size={18} /> Branding</h4>
                            <p className="desc" style={{ fontSize: 11, marginBottom: 12 }}>Embed custom logo (H-level correction required).</p>
                            <input type="file" accept="image/*" onChange={handleImageUpload} id="logo-upload" style={{ display: 'none' }} />
                            <div className="inline" style={{ gridTemplateColumns: '1fr auto' }}>
                                <button className="secondary" onClick={() => document.getElementById('logo-upload')?.click()} style={{ padding: '10px' }}>
                                    <ImageIcon size={14} /> {includeImage ? "Update Logo" : "Upload Image"}
                                </button>
                                {includeImage && (
                                    <button className="secondary" title="Remove Logo" onClick={() => { setIncludeImage(false); setImageSrc(''); }} style={{ color: 'var(--danger)' }}>
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="section">
                        <h4><QrCode size={18} /> Technical Blueprint</h4>
                        <div className="form-grid">
                            <div className="input-group">
                                <label>Matrix Density ({size}px)</label>
                                <input type="range" min="128" max="512" step="32" value={size} onChange={(e) => setSize(parseInt(e.target.value))} />
                            </div>
                            <div className="input-group">
                                <label>Error Correction</label>
                                <select value={errorLevel} onChange={(e) => setErrorLevel(e.target.value as any)}>
                                    <option value="L">L (7%) - Minimum</option>
                                    <option value="M">M (15%) - Normal</option>
                                    <option value="Q">Q (25%) - Advanced</option>
                                    <option value="H">H (30%) - Logo Safe</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'sticky', top: 0 }}>
                    <div className="hub-card" style={{ padding: 32, textAlign: 'center', background: 'var(--card-bg)' }}>
                        <div className="qr-fusion-canvas" style={{
                            padding: 24,
                            background: 'var(--bg-app)',
                            borderRadius: 24,
                            border: '1px solid var(--border-color)',
                            marginBottom: 24,
                            display: 'inline-block'
                        }}>
                            <QRCodeCanvas
                                value={qrValue}
                                size={size}
                                bgColor={bgColor}
                                fgColor={fgColor}
                                level={errorLevel}
                                includeMargin={true}
                                imageSettings={includeImage ? {
                                    src: imageSrc,
                                    height: size * 0.22,
                                    width: size * 0.22,
                                    excavate: true,
                                } : undefined}
                            />
                        </div>
                        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Matrix Preview</h3>
                        <p className="desc" style={{ fontSize: 13, marginBottom: 24 }}>Real-time blueprint generation. Scan with any lens to verify.</p>

                        <button className="primary" style={{ width: '100%', padding: '16px' }} onClick={downloadQr} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : <Zap />} Export Asset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
