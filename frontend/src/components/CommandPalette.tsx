import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    Command,
    Calculator,
    Clock,
    Palette,
    Hash,
    Check,
    Zap,
    ArrowRight
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string) => void;
    tools: any[];
}

type ActionType = 'tool' | 'action' | 'calc' | 'copy';

interface SmartResult {
    id: string;
    type: ActionType;
    label: string;
    description: string;
    icon: any;
    action?: () => void;
    group: string;
}

export default function CommandPalette({ isOpen, onClose, onSelect, tools }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { notify } = useNotifications();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Smart Action Engines
    const getSmartActions = (input: string): SmartResult[] => {
        const results: SmartResult[] = [];
        const cleanInput = input.trim();
        if (!cleanInput) return [];

        // 1. Math Calculator
        // Safe regex for basic math
        if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(cleanInput) && /\d/.test(cleanInput)) {
            try {
                // eslint-disable-next-line no-new-func
                const result = new Function('return ' + cleanInput)();
                if (Number.isFinite(result)) {
                    results.push({
                        id: 'calc-result',
                        type: 'calc',
                        label: `= ${Number(result).toLocaleString()}`,
                        description: `Calculate "${cleanInput}"`,
                        icon: Calculator,
                        group: 'Smart Actions',
                        action: () => copyToClipboard(String(result), 'calc-result')
                    });
                }
            } catch (e) { /* ignore invalid math */ }
        }

        // 2. Color Converter (Hex to RGB)
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(cleanInput)) {
            const hex = cleanInput.replace('#', '');
            const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
            const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
            const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
            const rgb = `rgb(${r}, ${g}, ${b})`;

            results.push({
                id: 'color-result',
                type: 'copy',
                label: rgb,
                description: 'Convert Hex to RGB',
                icon: Palette,
                group: 'Smart Actions',
                action: () => copyToClipboard(rgb, 'color-result')
            });
        }

        // 3. UUID Generator
        if (['uuid', 'guid', 'id'].includes(cleanInput.toLowerCase())) {
            const uuid = crypto.randomUUID();
            results.push({
                id: 'uuid-result',
                type: 'copy',
                label: uuid,
                description: 'Generate UUID v4',
                icon: Hash,
                group: 'Smart Actions',
                action: () => copyToClipboard(uuid, 'uuid-result')
            });
        }

        // 4. Time/Now
        if (['time', 'now', 'date'].includes(cleanInput.toLowerCase())) {
            const now = new Date();
            results.push({
                id: 'time-iso',
                type: 'copy',
                label: now.toISOString(),
                description: 'Current ISO Timestamp',
                icon: Clock,
                group: 'Smart Actions',
                action: () => copyToClipboard(now.toISOString(), 'time-iso')
            });
        }

        return results;
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        notify('success', 'Copied', 'Result copied to clipboard');
        setTimeout(() => {
            setCopiedId(null);
            onClose();
        }, 800);
    };

    // Filtered Tools
    const filteredTools = useMemo(() => {
        const toolResults: SmartResult[] = tools
            .filter(t =>
                t.label.toLowerCase().includes(query.toLowerCase()) ||
                t.description.toLowerCase().includes(query.toLowerCase())
            )
            .map(t => ({
                id: t.id,
                type: 'tool',
                label: t.label,
                description: t.description,
                icon: t.icon,
                group: 'Tools',
                action: () => onSelect(t.id)
            }));

        const smartActions = getSmartActions(query);

        return [...smartActions, ...toolResults];
    }, [query, tools, onSelect]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredTools.length);
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredTools.length) % filteredTools.length);
        }

        if (e.key === 'Enter' && filteredTools[selectedIndex]) {
            e.preventDefault();
            const item = filteredTools[selectedIndex];
            if (item.action) item.action();
            else onClose();
        }
    }, [filteredTools, selectedIndex, onClose]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            setSelectedIndex(0);
            setQuery('');
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={e => e.stopPropagation()}>
                <div className="command-input-wrapper">
                    <Search size={20} className="search-icon" />
                    <input
                        autoFocus
                        placeholder="Type a command, calculation, or search..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                    />
                    <div className="esc-hint">ESC</div>
                </div>

                <div className="command-results">
                    {filteredTools.length > 0 ? (
                        filteredTools.map((item, idx) => (
                            <div
                                key={item.id}
                                className={`command-item ${idx === selectedIndex ? 'active' : ''} ${item.group === 'Smart Actions' ? 'smart-item' : ''}`}
                                onClick={() => { if (item.action) item.action(); }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <div className={`item-icon ${item.group === 'Smart Actions' ? 'smart-icon' : ''}`}>
                                    {copiedId === item.id ? <Check size={18} /> : <item.icon size={18} />}
                                </div>
                                <div className="item-info">
                                    <div className="item-label">
                                        {item.label}
                                        {item.group === 'Smart Actions' && <span className="smart-badge">Smart Action</span>}
                                    </div>
                                    <div className="item-desc">{item.description}</div>
                                </div>
                                {idx === selectedIndex && (
                                    <div className="enter-hint">
                                        {item.type === 'calc' || item.type === 'copy' ? 'COPY' : 'OPEN'}
                                        <ArrowRight size={10} style={{ marginLeft: 4 }} />
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="no-results">
                            <Zap size={24} style={{ marginBottom: 12, opacity: 0.5 }} />
                            <p>No matches found</p>
                            <span style={{ fontSize: 12, opacity: 0.5 }}>Try "calc 100/5", "uuid", or "hex color"</span>
                        </div>
                    )}
                </div>

                <div className="command-footer">
                    <div className="footer-tip">
                        <Command size={12} /> <span className="key">K</span> or <span className="key">/</span> to open anytime
                    </div>
                </div>
            </div>

            <style>{`
                .smart-item {
                    background: linear-gradient(to right, rgba(99, 102, 241, 0.1), transparent);
                    border-left: 2px solid #6366f1;
                }
                .smart-icon {
                    color: #6366f1;
                }
                .smart-badge {
                    font-size: 10px;
                    background: #6366f1;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-left: 8px;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                }
                .key {
                    background: rgba(255,255,255,0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    margin: 0 4px;
                }
            `}</style>
        </div>
    );
}
