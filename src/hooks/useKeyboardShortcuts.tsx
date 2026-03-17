import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
    onGenerate: () => void;
    onTailor: () => void;
    onSettings: () => void;
    onHistory: () => void;
    onPrint: () => void;
    isLoading: boolean;
    hasResume: boolean;
    hasJobDescription: boolean;
}

export function useKeyboardShortcuts({
    onGenerate,
    onTailor,
    onSettings,
    onHistory,
    onPrint,
    isLoading,
    hasResume,
    hasJobDescription,
}: KeyboardShortcutsProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs/textareas
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Ctrl/Cmd + G: Generate Resume
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault();
                if (!isLoading && hasResume) {
                    onGenerate();
                }
            }

            // Ctrl/Cmd + T: Tailor for Job
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                if (!isLoading && hasResume && hasJobDescription) {
                    onTailor();
                }
            }

            // Ctrl/Cmd + P: Print/Download PDF
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                onPrint();
            }

            // Ctrl/Cmd + ,: Open Settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                onSettings();
            }

            // Ctrl/Cmd + H: Version History
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                onHistory();
            }
        },
        [onGenerate, onTailor, onSettings, onHistory, onPrint, isLoading, hasResume, hasJobDescription]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

// Component to show keyboard shortcut hints
export function KeyboardShortcutHints() {
    return (
        <div className="keyboard-hints">
            <span className="hint-label">Shortcuts:</span>
            <kbd>Ctrl+G</kbd> Generate
            <kbd>Ctrl+T</kbd> Tailor
            <kbd>Ctrl+P</kbd> Print
            <kbd>Ctrl+,</kbd> Settings
        </div>
    );
}
