import { useState, useEffect, useRef } from 'react';

interface TypeWriterProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
    enabled?: boolean;
}

export function TypeWriter({
    text,
    speed = 5,
    onComplete,
    enabled = true
}: TypeWriterProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const indexRef = useRef<number>(0);

    useEffect(() => {
        // If animation is disabled, show full text immediately
        if (!enabled) {
            setDisplayedText(text);
            setIsComplete(true);
            return;
        }

        // Reset when text changes
        setDisplayedText('');
        setIsComplete(false);
        indexRef.current = 0;
        lastTimeRef.current = 0;

        const animate = (timestamp: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const elapsed = timestamp - lastTimeRef.current;

            // Update every ~5ms (configurable via speed)
            if (elapsed >= speed) {
                lastTimeRef.current = timestamp;

                if (indexRef.current < text.length) {
                    // Add multiple characters per frame for faster streaming
                    const charsToAdd = Math.min(3, text.length - indexRef.current);
                    indexRef.current += charsToAdd;
                    setDisplayedText(text.slice(0, indexRef.current));
                } else {
                    setIsComplete(true);
                    onComplete?.();
                    return; // Stop animation
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [text, speed, enabled, onComplete]);

    return (
        <span className="typewriter-text">
            {displayedText}
            {!isComplete && <span className="typing-cursor" />}
        </span>
    );
}

// Hook for streaming sections of the resume
export function useStreamingResume() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamKey, setStreamKey] = useState(0);

    const startStreaming = () => {
        setIsStreaming(true);
        setStreamKey(prev => prev + 1);
    };

    const stopStreaming = () => {
        setIsStreaming(false);
    };

    return {
        isStreaming,
        streamKey,
        startStreaming,
        stopStreaming
    };
}
