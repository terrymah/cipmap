/**
 * Configuration loading and management
 */

let config = null;

/**
 * Load configuration from config.json
 * @returns {Promise<Object>} Configuration object
 */
export async function loadConfig() {
    const response = await fetch('config.json');
    config = await response.json();
    
    // Update UI with config values
    document.getElementById('app-title').textContent = config.title;
    document.getElementById('app-subtitle').textContent = config.subtitle;
    document.title = config.title;
    
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
            
            // Position legend above logo after image loads
            logoImg.onload = () => {
                if (mapLegend) {
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
