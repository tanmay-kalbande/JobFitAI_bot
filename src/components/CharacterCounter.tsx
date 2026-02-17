interface CharacterCounterProps {
    value: string;
    maxLength?: number;
    warningThreshold?: number;
}

export function CharacterCounter({
    value,
    maxLength = 5000,
    warningThreshold = 0.9,
}: CharacterCounterProps) {
    const length = value.length;
    const percentage = length / maxLength;

    const getColorClass = () => {
        if (percentage >= 1) return 'counter-danger';
        if (percentage >= warningThreshold) return 'counter-warning';
        return 'counter-normal';
    };

    return (
        <div className={`character-counter ${getColorClass()}`}>
            <span className="counter-text">
                {length.toLocaleString()} / {maxLength.toLocaleString()}
            </span>
            <div className="counter-bar">
                <div
                    className="counter-bar-fill"
                    style={{ width: `${Math.min(percentage * 100, 100)}%` }}
                />
            </div>
        </div>
    );
}
