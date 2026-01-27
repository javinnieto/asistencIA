/**
 * Normalize a string by removing accents/diacritics and converting to lowercase
 * Useful for accent-insensitive search
 */
export const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

/**
 * Check if a string contains another string (accent-insensitive)
 */
export const includesNormalized = (text: string, search: string): boolean => {
    return normalizeString(text).includes(normalizeString(search));
};
