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
 * Load configuration from config.json
 * @returns {Promise<Object>} Configuration object
 */
export async function loadConfig() {
    const response = await fetch('config.json');
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
        const mapLegend = document.getElementById('mapLegend');
        
        if (logoLink && logoImg) {
            logoImg.src = config.logo.image;
            logoImg.alt = config.logo.alt || '';
            logoLink.href = config.logo.link || '#';
            logoLink.hidden = false;
            
            // On desktop, position legend above logo after image loads
            // On mobile, CSS handles positioning (don't override with inline styles)
            logoImg.onload = () => {
                if (mapLegend && !isMobile()) {
                    const logoHeight = logoImg.offsetHeight;
                    // Logo is 20px from bottom, add 10px gap between logo and legend
                    mapLegend.style.bottom = (20 + logoHeight + 10) + 'px';
                }
            };
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
 * Get project type configuration
 * @param {string} type - Project type name
 * @returns {Object} Type configuration with color and icon
 */
export function getTypeConfig(type) {
    return config?.projectTypes?.[type] || { color: '#95a5a6', icon: 'folder' };
}
