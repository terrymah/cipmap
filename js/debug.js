/**
 * Debug Module
 * Handles debug mode functionality enabled via ?debug=on query parameter
 */

let debugMode = false;

/**
 * Initialize debug mode from URL query string
 */
export function initDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    debugMode = urlParams.get('debug') === 'on';
    
    if (debugMode) {
        console.log('🔧 Debug mode enabled');
        document.body.classList.add('debug-mode');
    }
    
    return debugMode;
}

/**
 * Set debug mode directly (for testing purposes)
 * @param {boolean} enabled - Whether debug mode should be enabled
 */
export function setDebugMode(enabled) {
    debugMode = enabled;
    if (enabled) {
        document.body.classList.add('debug-mode');
    } else {
        document.body.classList.remove('debug-mode');
    }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode() {
    return debugMode;
}

/**
 * Show an error dialog when in debug mode
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {any} details - Optional additional details
 */
export function showDebugError(title, message, details = null) {
    if (!debugMode) {
        return;
    }
    
    let fullMessage = `${title}\n\n${message}`;
    if (details) {
        fullMessage += `\n\nDetails:\n${JSON.stringify(details, null, 2)}`;
    }
    
    alert(fullMessage);
    console.error(`[Debug] ${title}:`, message, details);
}

/**
 * Log debug info (only when debug mode is on)
 */
export function debugLog(...args) {
    if (debugMode) {
        console.log('[Debug]', ...args);
    }
}

/**
 * Show API error alert when in debug mode
 * @param {string} endpoint - The API endpoint that failed
 * @param {Error|string} error - The error that occurred
 */
export function showApiError(endpoint, error) {
    if (!debugMode) {
        return;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    alert(`API Error\n\nEndpoint: ${endpoint}\nError: ${message}`);
    console.error(`[Debug API Error] ${endpoint}:`, error);
}
