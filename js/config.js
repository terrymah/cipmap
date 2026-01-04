/**
 * Configuration loading and management
 */

let config = null;

/**
 * Check if we're on mobile
 */
export function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * Get the config file path from URL query parameter or default
 * @returns {string} Config file path
 */
function getConfigPath() {
    const urlParams = new URLSearchParams(window.location.search);
    const configParam = urlParams.get('config');
    
    if (configParam) {
        // Sanitize: only allow alphanumeric, dash, underscore, and .json extension
        const sanitized = configParam.replace(/[^a-zA-Z0-9_-]/g, '');
        return `${sanitized}.json`;
    }
    
    return 'config.json';
}

/**
 * Load configuration from config.json or custom config file via ?config= query param
 * @returns {Promise<Object>} Configuration object
 * @throws {Error} If config file not found (404)
 */
export async function loadConfig() {
    const configPath = getConfigPath();
    const response = await fetch(configPath);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }
        throw new Error(`Failed to load configuration: ${response.status}`);
    }
    
    config = await response.json();
    
    // Update UI with config values (use mobile title if available and on mobile)
    updateTitle();
    document.getElementById('app-subtitle').textContent = config.subtitle;
    
    // Listen for resize to update title
    window.addEventListener('resize', updateTitle);
    
    // Initialize floating logo if configured
    if (config.logo && config.logo.image) {
        const logoLink = document.getElementById('floatingLogo');
        const logoImg = document.getElementById('logoImage');
        
        if (logoLink && logoImg) {
            logoImg.src = config.logo.image;
            logoImg.alt = config.logo.alt || '';
            logoLink.href = config.logo.link || '#';
            logoLink.hidden = false;
        }
    }
    
    return config;
}

/**
 * Update title based on screen size
 */
function updateTitle() {
    const titleEl = document.getElementById('app-title');
    const title = isMobile() && config.mobileTitle ? config.mobileTitle : config.title;
    titleEl.textContent = title;
    titleEl.classList.remove('title-loading'); // Reveal after setting
    document.title = config.title; // Browser tab always uses full title
}

/**
 * Get display name for a project type (mobile-aware)
 */
export function getTypeDisplayName(type) {
    const typeConfig = config?.projectTypes?.[type];
    if (typeConfig && isMobile() && typeConfig.mobileLabel) {
        return typeConfig.mobileLabel;
    }
    return type;
}

/**
 * Get the current configuration
 * @returns {Object} Configuration object
 */
export function getConfig() {
    return config;
}

/**
 * Get the application ID for API calls
 * @returns {string} The appId from config, defaults to 'cipmap'
 */
export function getAppId() {
    return config?.appId || 'cipmap';
}

/**
 * Check if survey mode is enabled
 * @returns {boolean} True if survey mode is enabled
 */
export function isSurveyMode() {
    return config?.survey === true;
}

/**
 * Get project type configuration
 * @param {string} type - Project type name
 * @returns {Object} Type configuration with color and icon
 */
export function getTypeConfig(type) {
    return config?.projectTypes?.[type] || { color: '#95a5a6', icon: 'folder' };
}
