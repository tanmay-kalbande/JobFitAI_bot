/**
 * Shared UI utilities for score display and formatting
 */

// Score color thresholds
export const SCORE_COLORS = {
    EXCELLENT: '#22c55e', // green
    GOOD: '#eab308',      // yellow
    FAIR: '#f97316',      // orange
    POOR: '#ef4444',      // red
} as const;

/**
 * Get color based on score value
 * @param score - Score value (0-100)
 * @param includeFair - Include fair/orange threshold (for more granular display)
 */
export function getScoreColor(score: number, includeFair: boolean = false): string {
    if (score >= 80) return SCORE_COLORS.EXCELLENT;
    if (score >= 60) return SCORE_COLORS.GOOD;
    if (includeFair && score >= 40) return SCORE_COLORS.FAIR;
    return SCORE_COLORS.POOR;
}

/**
 * Get human-readable label for score
 * @param score - Score value (0-100)
 */
export function getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent Match';
    if (score >= 70) return 'Strong Match';
    if (score >= 50) return 'Moderate Match';
    return 'Needs Improvement';
}
