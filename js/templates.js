/**
 * HTML Template handling
 */

const templates = {};

/**
 * Cache all template references from the DOM
 */
export function cacheTemplates() {
    const templateIds = [
        'project-card',
        'empty-state',
        'error-state',
        'map-marker',
        'legend-item',
        'filter-chip',
        'project-detail',
        'funding-row',
        'funding-total',
        'timeline-item'
    ];

    templateIds.forEach(id => {
        const template = document.getElementById(`template-${id}`);
        if (template) {
            templates[id] = template;
        }
    });
}

/**
 * Clone a template by ID
 * @param {string} templateId - Template ID (without 'template-' prefix)
 * @returns {DocumentFragment|null} Cloned template content
 */
export function cloneTemplate(templateId) {
    const template = templates[templateId];
    if (!template) {
        console.error(`Template not found: ${templateId}`);
        return null;
    }
    return template.content.cloneNode(true);
}

/**
 * Show an error message in the project list
 * @param {string} message - Error message to display
 */
export function showError(message) {
    const container = document.getElementById('projectList');
    const fragment = cloneTemplate('error-state');
    fragment.querySelector('.error-message').textContent = message;
    container.innerHTML = '';
    container.appendChild(fragment);
}
