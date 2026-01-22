import { useState, useEffect, useCallback } from 'react';
import { Search, Command } from 'lucide-react';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string) => void;
    tools: any[];
}

export default function CommandPalette({ isOpen, onClose, onSelect, tools }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredTools = tools.filter(t =>
        t.label.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase())
    );

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
            onSelect(filteredTools[selectedIndex].id);
            onClose();
        }
    }, [filteredTools, selectedIndex, onClose, onSelect]);

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
                        placeholder="Search tools, actions, or help..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <div className="esc-hint">ESC</div>
                </div>

                <div className="command-results">
                    {filteredTools.length > 0 ? (
                        filteredTools.map((tool, idx) => (
                            <div
                                key={tool.id}
                                className={`command-item ${idx === selectedIndex ? 'active' : ''}`}
                                onClick={() => { onSelect(tool.id); onClose(); }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <div className="item-icon">
                                    <tool.icon size={18} />
                                </div>
                                <div className="item-info">
                                    <div className="item-label">{tool.label}</div>
                                    <div className="item-desc">{tool.description}</div>
                                </div>
                                {idx === selectedIndex && <div className="enter-hint">ENTER</div>}
                            </div>
                        ))
                    ) : (
                        <div className="no-results">No tools found for "{query}"</div>
                    )}
                </div>

                <div className="command-footer">
                    <div className="footer-tip">
                        <Command size={12} /> + K to search anywhere
                    </div>
                    <div className="footer-links">
                        <span>Help</span>
                        <span>Feedback</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
