import { useEffect, useState } from 'react';

interface ConfettiPiece {
    id: number;
    x: number;
    y: number;
    rotation: number;
    color: string;
    size: number;
    velocityX: number;
    velocityY: number;
}

interface ConfettiProps {
    trigger: boolean;
    duration?: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export function Confetti({ trigger, duration = 3000 }: ConfettiProps) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (trigger && !isActive) {
            setIsActive(true);

            // Generate confetti pieces
            const newPieces: ConfettiPiece[] = [];
            for (let i = 0; i < 100; i++) {
                newPieces.push({
                    id: i,
                    x: Math.random() * 100,
                    y: -10 - Math.random() * 20,
                    rotation: Math.random() * 360,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    size: 8 + Math.random() * 8,
                    velocityX: (Math.random() - 0.5) * 4,
                    velocityY: 2 + Math.random() * 3,
                });
            }
            setPieces(newPieces);

            // Clear after duration
            setTimeout(() => {
                setPieces([]);
                setIsActive(false);
            }, duration);
        }
    }, [trigger, duration, isActive]);

    if (pieces.length === 0) return null;

    return (
        <div className="confetti-container">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="confetti-piece"
                    style={{
                        left: `${piece.x}%`,
                        backgroundColor: piece.color,
                        width: `${piece.size}px`,
                        height: `${piece.size}px`,
                        transform: `rotate(${piece.rotation}deg)`,
                        animationDelay: `${Math.random() * 0.5}s`,
                    }}
                />
            ))}
        </div>
    );
}
