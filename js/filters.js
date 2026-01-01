/**
 * Filter management module for CIP Map
 * Handles filter initialization, state, and filtering logic
 */

import { getConfig } from './config.js';
import { cloneTemplate } from './templates.js';
import { getProjects, setFilteredProjects } from './data.js';

// Filter state
let filters = {
    search: '',
    types: [],
    statuses: [],
    priorities: [],
    fundingYearRange: null,
    timelineRange: null
};

// Range slider bounds
let fundingYearBounds = null;
let timelineBounds = null;

// Callbacks for filter changes
let onFiltersChanged = null;

/**
 * Pure function to filter a single project against filter criteria
 * This is exported for testing purposes
 * @param {Object} project - The project to test
 * @param {Object} filterCriteria - The filter criteria
 * @param {Object} config - App configuration
 * @returns {boolean} Whether the project matches all filters
 */
export function matchesFilters(project, filterCriteria, config) {
    // Search filter
    if (filterCriteria.search) {
        const searchStr = filterCriteria.search.toLowerCase();
        const matchesSearch = 
            project.name.toLowerCase().includes(searchStr) ||
            (project.description && project.description.toLowerCase().includes(searchStr)) ||
            (project.locationName && project.locationName.toLowerCase().includes(searchStr));
        if (!matchesSearch) return false;
    }

    // Type filter
    if (filterCriteria.types.length > 0 && !filterCriteria.types.includes(project.type)) {
        return false;
    }

    // Status filter
    if (filterCriteria.statuses.length > 0 && !filterCriteria.statuses.includes(project.status)) {
        return false;
    }

    // Priority filter
    if (filterCriteria.priorities.length > 0 && !filterCriteria.priorities.includes(project.priority)) {
        return false;
    }

    // Funding year range filter
    if (filterCriteria.fundingYearRange) {
        const { min, max } = filterCriteria.fundingYearRange;
        const hasFundingInRange = config.fundingYears.some(fy => {
            if (fy === 'Future') {
                // Future is included when max is at the "Future" position (9999)
                return max >= 9999 && (project.fundingYears['Future'] || 0) > 0;
            }
            const match = fy.match(/\d+/);
            if (!match) return false;
            const year = parseInt(match[0]) + 2000;
            return year >= min && year <= max && (project.fundingYears[fy] || 0) > 0;
        });
        if (!hasFundingInRange && project.totalFunding > 0) return false;
    }

    // Timeline range filter
    // Ongoing projects always pass the timeline filter
    if (filterCriteria.timelineRange && !project.isOngoing) {
        const { min, max } = filterCriteria.timelineRange;
        const projectStart = project.startDate ? new Date(project.startDate).getFullYear() : null;
        const projectEnd = project.endDate ? new Date(project.endDate).getFullYear() : null;
        
        if (projectStart && projectEnd) {
            if (projectEnd < min || projectStart > max) return false;
        } else if (projectStart) {
            if (projectStart > max) return false;
        } else if (projectEnd) {
            if (projectEnd < min) return false;
        }
    }

    return true;
}

/**
 * Get current filter state
 */
export function getFilters() {
    return filters;
}

/**
 * Get range slider bounds
 */
export function getRangeBounds() {
    return { fundingYearBounds, timelineBounds };
}

/**
 * Set callback for when filters change
 */
export function setOnFiltersChanged(callback) {
    onFiltersChanged = callback;
}

/**
 * Initialize filter chips for type, status, and priority
 */
export function initFilters() {
    const config = getConfig();

    // Type filters
    const typeContainer = document.getElementById('typeFilters');
    Object.entries(config.projectTypes).forEach(([type, settings]) => {
        const chip = createFilterChip(type, settings.color, 'type');
        typeContainer.appendChild(chip);
    });

    // Status filters
    const statusContainer = document.getElementById('statusFilters');
    config.statusOptions.forEach(status => {
        const chip = createFilterChip(status, null, 'status');
        statusContainer.appendChild(chip);
    });

    // Priority filters
    const priorityContainer = document.getElementById('priorityFilters');
    config.priorityLevels.forEach(priority => {
        const chip = createFilterChip(priority, null, 'priority');
        priorityContainer.appendChild(chip);
    });
}

/**
 * Create a filter chip element
 */
function createFilterChip(value, color, filterType) {
    const fragment = cloneTemplate('filter-chip');
    const chip = fragment.querySelector('.filter-chip');
    
    chip.dataset.value = value;
    chip.dataset.filterType = filterType;
    
    const colorDot = chip.querySelector('.color-dot');
    const label = chip.querySelector('.chip-label');
    
    if (color) {
        colorDot.hidden = false;
        colorDot.style.backgroundColor = color;
    }
    label.textContent = value;

    chip.addEventListener('click', () => toggleFilter(filterType, value, chip));
    return fragment;
}

/**
 * Toggle a filter chip on/off
 */
export function toggleFilter(filterType, value, chipElement) {
    const filterKeyMap = {
        'type': 'types',
        'status': 'statuses', 
        'priority': 'priorities'
    };
    const filterKey = filterKeyMap[filterType];
    
    if (!filterKey) {
        console.error('Unknown filter type:', filterType);
        return;
    }
    
    const index = filters[filterKey].indexOf(value);

    if (index === -1) {
        filters[filterKey].push(value);
        chipElement.classList.add('active');
    } else {
        filters[filterKey].splice(index, 1);
        chipElement.classList.remove('active');
    }

    applyFilters();
}

/**
 * Initialize dual-range sliders for funding years and timeline
 */
export function initRangeSliders() {
    const config = getConfig();
    const projects = getProjects();

    // Determine funding year bounds from config (include Future as last notch)
    const fundingYears = config.fundingYears.filter(y => y !== 'Future');
    const fyNumbers = fundingYears.map(fy => {
        const match = fy.match(/\d+/);
        return match ? parseInt(match[0]) + 2000 : null;
    }).filter(Boolean);
    
    // Add 9999 to represent "Future" as the last notch
    const hasFuture = config.fundingYears.includes('Future');
    
    fundingYearBounds = {
        min: Math.min(...fyNumbers),
        max: hasFuture ? 9999 : Math.max(...fyNumbers)
    };

    // Determine timeline bounds from projects
    const allYears = [];
    projects.forEach(p => {
        if (p.startDate) allYears.push(new Date(p.startDate).getFullYear());
        if (p.endDate) allYears.push(new Date(p.endDate).getFullYear());
    });
    
    if (allYears.length > 0) {
        timelineBounds = {
            min: Math.min(...allYears),
            max: Math.max(...allYears)
        };
    } else {
        const currentYear = new Date().getFullYear();
        timelineBounds = { min: currentYear, max: currentYear + 5 };
    }

    // Initialize funding year slider
    initDualRangeSlider(
        'fundingYearMin',
        'fundingYearMax',
        'fundingYearSlider',
        'fundingYearMinLabel',
        'fundingYearMaxLabel',
        fundingYearBounds,
        (min, max) => {
            filters.fundingYearRange = { min, max };
            applyFilters();
        },
        (val) => val >= 9999 ? 'Future' : `FY${String(val).slice(-2)}`
    );

    // Initialize timeline slider
    initDualRangeSlider(
        'timelineMin',
        'timelineMax',
        'timelineSlider',
        'timelineMinLabel',
        'timelineMaxLabel',
        timelineBounds,
        (min, max) => {
            filters.timelineRange = { min, max };
            applyFilters();
        },
        (val) => String(val)
    );
}

/**
 * Initialize a dual-range slider
 */
function initDualRangeSlider(minId, maxId, sliderId, minLabelId, maxLabelId, bounds, onChange, formatLabel) {
    const minInput = document.getElementById(minId);
    const maxInput = document.getElementById(maxId);
    const slider = document.getElementById(sliderId);
    const minLabel = document.getElementById(minLabelId);
    const maxLabel = document.getElementById(maxLabelId);
    const fill = slider.querySelector('.range-fill');

    // Set input attributes
    minInput.min = bounds.min;
    minInput.max = bounds.max;
    minInput.value = bounds.min;

    maxInput.min = bounds.min;
    maxInput.max = bounds.max;
    maxInput.value = bounds.max;

    const updateSlider = () => {
        const minVal = parseInt(minInput.value);
        const maxVal = parseInt(maxInput.value);
        const range = bounds.max - bounds.min;
        
        const minPercent = ((minVal - bounds.min) / range) * 100;
        const maxPercent = ((maxVal - bounds.min) / range) * 100;

        fill.style.left = minPercent + '%';
        fill.style.width = (maxPercent - minPercent) + '%';

        minLabel.textContent = formatLabel(minVal);
        maxLabel.textContent = formatLabel(maxVal);
    };

    minInput.addEventListener('input', () => {
        const minVal = parseInt(minInput.value);
        const maxVal = parseInt(maxInput.value);
        if (minVal > maxVal) {
            minInput.value = maxVal;
        }
        updateSlider();
        onChange(parseInt(minInput.value), parseInt(maxInput.value));
    });

    maxInput.addEventListener('input', () => {
        const minVal = parseInt(minInput.value);
        const maxVal = parseInt(maxInput.value);
        if (maxVal < minVal) {
            maxInput.value = minVal;
        }
        updateSlider();
        onChange(parseInt(minInput.value), parseInt(maxInput.value));
    });

    // Initial update
    updateSlider();
}

/**
 * Update range slider UI
 */
function updateRangeSliderUI(sliderId, minLabelId, maxLabelId, minVal, maxVal, bounds, formatLabel) {
    const slider = document.getElementById(sliderId);
    const minLabel = document.getElementById(minLabelId);
    const maxLabel = document.getElementById(maxLabelId);
    const fill = slider.querySelector('.range-fill');
    
    const range = bounds.max - bounds.min;
    const minPercent = range > 0 ? ((minVal - bounds.min) / range) * 100 : 0;
    const maxPercent = range > 0 ? ((maxVal - bounds.min) / range) * 100 : 100;

    fill.style.left = minPercent + '%';
    fill.style.width = (maxPercent - minPercent) + '%';

    minLabel.textContent = formatLabel(minVal);
    maxLabel.textContent = formatLabel(maxVal);
}

/**
 * Apply all active filters to the project list
 */
export function applyFilters() {
    const config = getConfig();
    const projects = getProjects();

    const filtered = projects.filter(project => matchesFilters(project, filters, config));

    setFilteredProjects(filtered);

    if (onFiltersChanged) {
        onFiltersChanged();
    }
}

/**
 * Clear all active filters
 */
export function clearAllFilters() {
    filters = {
        search: '',
        types: [],
        statuses: [],
        priorities: [],
        fundingYearRange: null,
        timelineRange: null
    };

    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').classList.remove('visible');
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));

    // Reset range sliders
    if (fundingYearBounds) {
        document.getElementById('fundingYearMin').value = fundingYearBounds.min;
        document.getElementById('fundingYearMax').value = fundingYearBounds.max;
        updateRangeSliderUI('fundingYearSlider', 'fundingYearMinLabel', 'fundingYearMaxLabel', 
            fundingYearBounds.min, fundingYearBounds.max, fundingYearBounds,
            (val) => `FY${String(val).slice(-2)}`);
    }
    if (timelineBounds) {
        document.getElementById('timelineMin').value = timelineBounds.min;
        document.getElementById('timelineMax').value = timelineBounds.max;
        updateRangeSliderUI('timelineSlider', 'timelineMinLabel', 'timelineMaxLabel',
            timelineBounds.min, timelineBounds.max, timelineBounds,
            (val) => String(val));
    }

    applyFilters();
}

/**
 * Set search filter value
 */
export function setSearchFilter(value) {
    filters.search = value.toLowerCase();
    applyFilters();
}
