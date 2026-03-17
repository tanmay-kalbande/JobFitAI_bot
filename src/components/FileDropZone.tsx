import { useState, useCallback, useRef } from 'react';

interface FileDropZoneProps {
    onFileContent: (content: string) => void;
    children: React.ReactNode;
    accept?: string;
}

export function FileDropZone({
    onFileContent,
    children,
    accept = '.txt,.md,.doc,.docx,.pdf',
}: FileDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            dragCounter.current = 0;

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                readFile(file, onFileContent);
            }
        },
        [onFileContent]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                readFile(file, onFileContent);
            }
        },
        [onFileContent]
    );

    return (
        <div
            className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {children}
            {isDragging && (
                <div className="drop-overlay">
                    <div className="drop-message">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                        <span>Drop your resume file here</span>
                    </div>
                </div>
            )}
            <input
                type="file"
                id="file-upload"
                className="file-input-hidden"
                accept={accept}
                onChange={handleFileInput}
            />
        </div>
    );
}

function readFile(file: File, onContent: (content: string) => void) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
            onContent(content);
        }
    };
    reader.readAsText(file);
}
