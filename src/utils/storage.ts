/**
 * Safe localStorage wrapper with error handling
 */

export const STORAGE_KEYS = {
    RESUME_DATA: 'resume_builder_user_data',
    JOB_DESCRIPTION: 'resume_builder_job_description',
    SETTINGS: 'resume_builder_settings',
    VERSIONS: 'resume_builder_versions',
    EDIT_LOGS: 'resume_builder_edit_logs',
    RESUME_COLLAPSED: 'resume_builder_collapsed',
    RESUME_FORMAT: 'resume_builder_format',
    APP_STATE: 'resume_builder_app_state',
    APP_STATE_BACKUP: 'resume_builder_app_state_backup',
    VISITED: 'jobfit_visited',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export type StorageWriteReason = 'ok' | 'quota_exceeded' | 'unavailable' | 'error';

export interface StorageWriteResult {
    ok: boolean;
    key: StorageKey;
    reason: StorageWriteReason;
    error?: unknown;
}

function normalizeStorageWriteError(key: StorageKey, error: unknown): StorageWriteResult {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Consider clearing old data.');
        return {
            ok: false,
            key,
            reason: 'quota_exceeded',
            error,
        };
    }

    return {
        ok: false,
        key,
        reason: isStorageAvailable() ? 'error' : 'unavailable',
        error,
    };
}

/**
 * Safely get an item from localStorage
 */
export function getStorageItem<T>(key: StorageKey, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue;
        }
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`Failed to get item "${key}" from localStorage:`, error);
        return defaultValue;
    }
}

/**
 * Safely get a string item from localStorage (no JSON parsing)
 */
export function getStorageString(key: StorageKey, defaultValue: string = ''): string {
    try {
        return localStorage.getItem(key) ?? defaultValue;
    } catch (error) {
        console.error(`Failed to get string "${key}" from localStorage:`, error);
        return defaultValue;
    }
}

/**
 * Safely set an item in localStorage
 */
export function setStorageItem<T>(key: StorageKey, value: T): boolean {
    return setStorageItemDetailed(key, value).ok;
}

/**
 * Safely set an item in localStorage with structured result metadata
 */
export function setStorageItemDetailed<T>(key: StorageKey, value: T): StorageWriteResult {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return {
            ok: true,
            key,
            reason: 'ok',
        };
    } catch (error) {
        console.error(`Failed to set item "${key}" in localStorage:`, error);
        return normalizeStorageWriteError(key, error);
    }
}

/**
 * Safely set a string item in localStorage (no JSON stringification)
 */
export function setStorageString(key: StorageKey, value: string): boolean {
    return setStorageStringDetailed(key, value).ok;
}

/**
 * Safely set a string item in localStorage (no JSON stringification) with structured result metadata
 */
export function setStorageStringDetailed(key: StorageKey, value: string): StorageWriteResult {
    try {
        localStorage.setItem(key, value);
        return {
            ok: true,
            key,
            reason: 'ok',
        };
    } catch (error) {
        console.error(`Failed to set string "${key}" in localStorage:`, error);
        return normalizeStorageWriteError(key, error);
    }
}

/**
 * Safely remove an item from localStorage
 */
export function removeStorageItem(key: StorageKey): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Failed to remove item "${key}" from localStorage:`, error);
        return false;
    }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}
