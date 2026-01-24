import React, { useState, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Image as ImageIcon, Palette, Wifi, Globe, Loader2, Settings, Sparkles, Download } from 'lucide-react';
import { useNotifications } from "../contexts/NotificationContext";

interface QrFusionProps {
    onLogAction: (action: string, filename: string, blob: Blob) => void;
}

export default function QrFusion({ onLogAction }: QrFusionProps) {
    const { notify } = useNotifications();
    const [mode, setMode] = useState<'text' | 'wifi'>('text');
    const [text, setText] = useState('https://example.com');

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
                notify('success', 'Logo Uploaded', 'Logo embedded successfully.');
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
                    const name = `qr_code_${Date.now()}.png`;
                    link.download = name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    onLogAction('Generated QR Code', name, blob);
                    notify('success', 'QR Code Downloaded', 'High-resolution QR code saved.');
                }
                setLoading(false);
            }, 'image/png');
        } else {
            setLoading(false);
        }
    }, [onLogAction, notify]);

    return (
        <div className="app page-enter">
            {/* Mode Selector */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'var(--input-bg)',
                padding: '8px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                width: 'fit-content',
                marginBottom: '32px'
            }}>
                <button
                    onClick={() => setMode('text')}
                    style={{
                        borderRadius: '12px',
                        background: mode === 'text' ? 'var(--primary)' : 'transparent',
                        color: mode === 'text' ? 'white' : 'var(--text-muted)',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        boxShadow: mode === 'text' ? 'var(--shadow-md)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Globe size={16} />
                    URL / Text
                </button>
                <button
                    onClick={() => setMode('wifi')}
                    style={{
                        borderRadius: '12px',
                        background: mode === 'wifi' ? 'var(--primary)' : 'transparent',
                        color: mode === 'wifi' ? 'white' : 'var(--text-muted)',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        boxShadow: mode === 'wifi' ? 'var(--shadow-md)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Wifi size={16} />
                    Wi-Fi
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 380px',
                gap: '24px',
                alignItems: 'start'
            }}>
                {/* Configuration Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Content Configuration */}
                    <div className="section slide-in-left" style={{ position: 'relative', overflow: 'hidden' }}>
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
                                <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>CONTENT CONFIGURATION</h4>
                            </div>

                            {mode === 'text' ? (
                                <div className="input-group">
                                    <label>URL or Text Content</label>
                                    <textarea
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        placeholder="Enter URL or text to encode..."
                                        rows={4}
                                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <div className="input-group">
                                        <label>Network SSID</label>
                                        <input type="text" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="MyWiFi" />
                                    </div>
                                    <div className="input-group">
                                        <label>Password</label>
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
                                        <Wifi size={16} />
                                        Hidden Network
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Styling Options */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                        {/* Colors */}
                        <div className="section slide-in-left" style={{ animationDelay: '0.1s', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: 'var(--gradient-warm)',
                                borderRadius: '24px 24px 0 0'
                            }} />

                            <div style={{ paddingTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <Palette size={20} style={{ color: 'var(--primary)' }} />
                                    <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>COLORS</h4>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group">
                                        <label>Foreground</label>
                                        <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} style={{ padding: 4, height: 44, cursor: 'pointer' }} />
                                    </div>
                                    <div className="input-group">
                                        <label>Background</label>
                                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ padding: 4, height: 44, cursor: 'pointer' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logo */}
                        <div className="section slide-in-right" style={{ animationDelay: '0.1s', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: 'var(--gradient-success)',
                                borderRadius: '24px 24px 0 0'
                            }} />

                            <div style={{ paddingTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <ImageIcon size={20} style={{ color: 'var(--primary)' }} />
                                    <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>LOGO BRANDING</h4>
                                </div>

                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    Embed a logo (requires H-level error correction)
                                </p>

                                <input type="file" accept="image/*" onChange={handleImageUpload} id="logo-upload" style={{ display: 'none' }} />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="secondary" onClick={() => document.getElementById('logo-upload')?.click()} style={{ flex: 1 }}>
                                        <ImageIcon size={14} />
                                        {includeImage ? "Change Logo" : "Upload Logo"}
                                    </button>
                                    {includeImage && (
                                        <button className="secondary" onClick={() => { setIncludeImage(false); setImageSrc(''); }} style={{ color: 'var(--danger)', padding: '0 16px' }}>
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Settings */}
                    <div className="section slide-in-left" style={{ animationDelay: '0.2s', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'var(--gradient-primary)',
                            borderRadius: '24px 24px 0 0'
                        }} />

                        <div style={{ paddingTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <QrCode size={20} style={{ color: 'var(--primary)' }} />
                                <h4 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.05em' }}>TECHNICAL SETTINGS</h4>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Size: {size}px</label>
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
                </div>

                {/* Live Preview Panel */}
                <div style={{ position: 'sticky', top: '20px' }}>
                    <div className="section scale-in" style={{ animationDelay: '0.3s', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'var(--gradient-primary)',
                            borderRadius: '24px 24px 0 0'
                        }} />

                        <div style={{ paddingTop: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.05em' }}>LIVE PREVIEW</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                                Real-time QR code generation
                            </p>

                            <div className="qr-fusion-canvas" style={{
                                padding: '32px',
                                background: 'var(--input-bg)',
                                borderRadius: '20px',
                                border: '1px solid var(--border-color)',
                                marginBottom: '24px',
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

                            <button
                                onClick={downloadQr}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    background: loading ? 'var(--text-muted)' : 'var(--gradient-primary)',
                                    border: 'none',
                                    color: 'white',
                                    boxShadow: loading ? 'none' : 'var(--shadow-lg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} />
                                        Download QR Code
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pro Tip */}
            <div className="tool-help-section scale-in" style={{ animationDelay: '0.4s', marginTop: '40px' }}>
                <div className="tool-help-icon">
                    <Sparkles size={24} />
                </div>
                <div className="tool-help-content">
                    <h5>Pro Tip: Error Correction Levels</h5>
                    <p>
                        Use <strong>H (30%)</strong> error correction when embedding logos to ensure the QR code remains scannable.
                        For simple QR codes without logos, <strong>L (7%)</strong> creates smaller, cleaner codes.
                        Wi-Fi QR codes can be scanned by most modern smartphones to connect automatically.
                    </p>
                </div>
            </div>
        </div>
    );
}
