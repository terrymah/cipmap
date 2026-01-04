/**
 * Help Dialog Module
 * Shows a help/welcome dialog on first visit based on config
 */

import { getConfig, getAppId } from './config.js';
import { getCookie, setCookie } from './cookies.js';

function getHelpCookieName() {
    return `${getAppId()}_help_dismissed`;
}
const COOKIE_DAYS = 365;

/**
 * Initialize help dialog and show if needed
 */
export function initHelp() {
    const config = getConfig();
    
    // Check if help text is configured
    if (!config.help) {
        return;
    }
    
    // Check if already dismissed
    if (getCookie(getHelpCookieName())) {
        return;
    }
    
    // Set up event listeners
    document.getElementById('helpDialogOk').addEventListener('click', hideHelpDialog);
    document.getElementById('helpDialogClose').addEventListener('click', hideHelpDialog);
    document.getElementById('helpDialogOverlay').addEventListener('click', hideHelpDialog);
    
    // Show the dialog
    showHelpDialog(config.help);
}

/**
 * Show the help dialog with the given text
 * @param {string} helpText - The help text to display (can contain HTML)
 */
function showHelpDialog(helpText) {
    const dialog = document.getElementById('helpDialog');
    const overlay = document.getElementById('helpDialogOverlay');
    const content = document.getElementById('helpContent');
    
    // Set the content (support simple HTML for formatting)
    content.innerHTML = helpText;
    
    // Show dialog
    dialog.hidden = false;
    overlay.hidden = false;
}

/**
 * Hide the help dialog and remember dismissal
 */
function hideHelpDialog() {
    const dialog = document.getElementById('helpDialog');
    const overlay = document.getElementById('helpDialogOverlay');
    
    dialog.hidden = true;
    overlay.hidden = true;
    
    // Remember that help was dismissed
    setCookie(getHelpCookieName(), 'true', COOKIE_DAYS);
}

/**
 * Reset help dialog (for testing - clears the cookie)
 */
export function resetHelp() {
    document.cookie = `${getHelpCookieName()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}
