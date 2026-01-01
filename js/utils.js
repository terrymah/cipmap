/**
 * Utility functions for formatting and data manipulation
 */

/**
 * Format a number as currency with smart abbreviations
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
    if (amount >= 1000000) {
        return '$' + (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return '$' + (amount / 1000).toFixed(0) + 'K';
    }
    return '$' + amount.toLocaleString();
}

/**
 * Format a date string to a readable format
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Check if a date is in the past
 * @param {string} dateStr - ISO date string
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

/**
 * Get URL search parameters
 * @returns {URLSearchParams} Current URL search params
 */
export function getUrlParams() {
    return new URLSearchParams(window.location.search);
}

/**
 * Update URL with a parameter without page reload
 * @param {string} key - Parameter key
 * @param {string|null} value - Parameter value (null to remove)
 */
export function updateUrlParam(key, value) {
    const url = new URL(window.location);
    if (value === null) {
        url.searchParams.delete(key);
    } else {
        url.searchParams.set(key, value);
    }
    window.history.pushState({}, '', url);
}

/**
 * Generate a CSS class from a string (lowercase, replace non-alpha with dashes)
 * @param {string} prefix - Class prefix
 * @param {string} value - Value to convert
 * @returns {string} CSS class name
 */
export function toClassName(prefix, value) {
    return prefix + value.toLowerCase().replace(/[^a-z]/g, '-');
}
