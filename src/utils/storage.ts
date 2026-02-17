/**
 * Safe localStorage wrapper with error handling
 */

export const STORAGE_KEYS = {
    RESUME_DATA: 'resume_builder_user_data',
    SETTINGS: 'resume_builder_settings',
    VERSIONS: 'resume_builder_versions',
    RESUME_COLLAPSED: 'resume_builder_collapsed',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

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
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Failed to set item "${key}" in localStorage:`, error);
        // Handle quota exceeded error
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded. Consider clearing old data.');
        }
        return false;
    }
}

/**
 * Safely set a string item in localStorage (no JSON stringification)
 */
export function setStorageString(key: StorageKey, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Failed to set string "${key}" in localStorage:`, error);
        return false;
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
