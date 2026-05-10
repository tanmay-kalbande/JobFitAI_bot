import { useCallback, useEffect } from 'react';

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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (!isLoading && hasResume) {
          onGenerate();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        if (!isLoading && hasResume && hasJobDescription) {
          onTailor();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        onPrint();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        onSettings();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        onHistory();
      }
    },
    [onGenerate, onTailor, onSettings, onHistory, onPrint, isLoading, hasResume, hasJobDescription],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
