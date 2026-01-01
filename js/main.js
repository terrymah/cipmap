/**
 * Apex CIP Map Application - Main Entry Point
 * A client-side web application for displaying Capital Improvement Projects
 */

// Import modules
import { loadConfig, getConfig } from './config.js';
import { loadProjects, getProjects, getFilteredProjects, setFilteredProjects } from './data.js';
import { cacheTemplates, cloneTemplate } from './templates.js';
import { formatCurrency } from './utils.js';
import { 
    initFilters, 
    initRangeSliders, 
    setOnFiltersChanged, 
    applyFilters, 
    clearAllFilters,
    setSearchFilter
} from './filters.js';
import { 
    initMap, 
    renderMarkers, 
    renderLegend, 
    invalidateMapSize,
    setOnMarkerClick,
    setOnMapClick
} from './map.js';
import { 
    selectProject, 
    closeDetailPanel, 
    getSelectedProject,
    checkUrlParams,
    setOnProjectModified
} from './detail-panel.js';
import {
    isNoLocationFilterActive,
    toggleNoLocationFilter,
    isInLocationEditMode,
    getProjectToAssign,
    enterLocationAssignMode,
    exitLocationAssignMode,
    assignLocation,
    hasModifiedProjects,
    getModifiedCount,
    applyNoLocationFilter,
    downloadUpdatedCsv,
    setOnLocationEditorStateChanged
} from './location-editor.js';

/**
 * Initialize the application
 */
async function init() {
    try {
        // Cache template references
        cacheTemplates();

        // Load configuration
        await loadConfig();

        // Load project data
        await loadProjects();

        // Initialize map
        initMap();

        // Set up marker click handler
        setOnMarkerClick((project) => {
            selectProject(project);
        });

        // Set up map click handler for location assignment
        setOnMapClick((lat, lng) => {
            if (isInLocationEditMode()) {
                assignLocation(lat, lng);
                // Re-render to show the new marker
                renderProjects();
                renderMarkers();
            }
        });

        // Set up location editor state change handler
        setOnLocationEditorStateChanged(() => {
            updateLocationEditorUI();
            renderProjects();
            // Don't call renderMarkers here - it would reset map view
        });

        // Set up project modified callback (for link additions, etc.)
        setOnProjectModified(() => {
            updateLocationEditorUI();
        });

        // Initialize filters
        initFilters();
        initRangeSliders();

        // Set up filter change handler
        setOnFiltersChanged(() => {
            renderProjects();
            renderMarkers();
        });

        // Initialize event listeners
        initEventListeners();

        // Initial render
        renderProjects();
        renderMarkers(true, false);  // Fit bounds on initial load, no animation
        renderLegend();

        // Check URL for project selection
        checkUrlParams();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load application data.');
    }
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Sidebar toggle (desktop)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        sidebarToggle.classList.toggle('active');
        // Invalidate map size after transition
        setTimeout(() => invalidateMapSize(), 350);
    });

    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    searchInput.addEventListener('input', (e) => {
        setSearchFilter(e.target.value);
        clearSearch.classList.toggle('visible', e.target.value.length > 0);
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        setSearchFilter('');
        clearSearch.classList.remove('visible');
    });

    // Filter toggle
    document.getElementById('filterToggle').addEventListener('click', () => {
        document.getElementById('filtersPanel').classList.toggle('open');
    });

    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', () => {
        clearAllFilters();
    });

    // Legend toggle
    document.getElementById('legendToggle').addEventListener('click', () => {
        const content = document.getElementById('legendContent');
        const icon = document.querySelector('#legendToggle i');
        content.classList.toggle('collapsed');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    });

    // Close detail panel
    document.getElementById('closeDetail').addEventListener('click', () => {
        closeDetailPanel();
    });

    document.getElementById('detailOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeDetailPanel();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailPanel();
            exitLocationAssignMode();
            document.getElementById('sidebar').classList.remove('open');
        }
    });

    // No location filter checkbox
    const noLocationCheckbox = document.getElementById('noLocationCheckbox');
    const noLocationFilter = document.getElementById('noLocationFilter');
    
    noLocationCheckbox.addEventListener('change', () => {
        toggleNoLocationFilter();
        noLocationFilter.classList.toggle('active', noLocationCheckbox.checked);
        document.getElementById('sidebar').classList.toggle('no-location-mode', noLocationCheckbox.checked);
        renderProjects();
        renderMarkers();
    });

    // Download CSV button
    document.getElementById('downloadCsvBtn').addEventListener('click', () => {
        downloadUpdatedCsv();
    });

    // Cancel location assignment
    document.getElementById('cancelLocationAssign').addEventListener('click', () => {
        exitLocationAssignMode();
    });
}

/**
 * Update location editor UI elements based on state
 */
function updateLocationEditorUI() {
    const banner = document.getElementById('locationAssignBanner');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const projectToAssign = getProjectToAssign();
    
    // Update banner visibility
    if (isInLocationEditMode() && projectToAssign) {
        banner.hidden = false;
        document.getElementById('bannerProjectName').textContent = projectToAssign.name;
    } else {
        banner.hidden = true;
    }
    
    // Update download button visibility - show if any projects modified (locations OR links)
    downloadBtn.hidden = !hasModifiedProjects();
    if (hasModifiedProjects()) {
        downloadBtn.querySelector('span').textContent = `Download CSV (${getModifiedCount()} updated)`;
    }
}

/**
 * Render the project list
 */
function renderProjects() {
    const config = getConfig();
    let filteredProjects = getFilteredProjects();
    
    // Apply no-location filter if active
    if (isNoLocationFilterActive()) {
        filteredProjects = applyNoLocationFilter(filteredProjects);
    }
    
    const container = document.getElementById('projectList');
    const totalFunding = filteredProjects.reduce((sum, p) => sum + p.totalFunding, 0);

    // Update counts
    document.getElementById('projectCount').textContent = 
        `${filteredProjects.length} Project${filteredProjects.length !== 1 ? 's' : ''}`;
    document.getElementById('totalFunding').textContent = formatCurrency(totalFunding) + ' Total';

    // Clear container
    container.innerHTML = '';

    if (filteredProjects.length === 0) {
        container.appendChild(cloneTemplate('empty-state'));
        return;
    }

    // Render each project card
    filteredProjects.forEach(project => {
        const card = createProjectCard(project, config);
        container.appendChild(card);
    });
}

/**
 * Create a project card element
 */
function createProjectCard(project, config) {
    const fragment = cloneTemplate('project-card');
    const card = fragment.querySelector('.project-card');
    
    const typeConfig = config.projectTypes[project.type] || { color: '#95a5a6', icon: 'folder' };
    const statusClass = 'status-' + project.status.toLowerCase().replace(/[^a-z]/g, '-');
    const priorityClass = 'priority-' + project.priority.toLowerCase();

    // Set data attribute
    card.dataset.projectId = project.id;
    
    // Set active state if selected
    const selected = getSelectedProject();
    if (selected?.id === project.id) {
        card.classList.add('active');
    }

    // Type icon
    const typeIcon = card.querySelector('.project-type-icon');
    typeIcon.style.backgroundColor = typeConfig.color;
    typeIcon.querySelector('i').classList.add(`fa-${typeConfig.icon}`);

    // Project name
    card.querySelector('.project-name').textContent = project.name;

    // Status badge
    const statusBadge = card.querySelector('.status-badge');
    statusBadge.textContent = project.status;
    statusBadge.classList.add(statusClass);

    // Priority badge
    const priorityBadge = card.querySelector('.priority-badge');
    priorityBadge.textContent = project.priority;
    priorityBadge.classList.add(priorityClass);

    // Funding amount
    card.querySelector('.funding-amount').textContent = formatCurrency(project.totalFunding);

    // No location badge
    if (!project.hasLocation) {
        card.querySelector('.no-location-badge').hidden = false;
    }

    // Highlight if this is the project being assigned a location
    const projectToAssign = getProjectToAssign();
    if (projectToAssign?.id === project.id) {
        card.classList.add('assigning-location');
    }

    // Click handler - shift+click for location assignment mode
    card.addEventListener('click', (e) => {
        if (e.shiftKey && isNoLocationFilterActive() && !project.hasLocation) {
            e.preventDefault();
            enterLocationAssignMode(project);
        } else if (!isInLocationEditMode()) {
            selectProject(project);
        }
    });

    return fragment;
}

/**
 * Show an error message
 */
function showError(message) {
    const container = document.getElementById('projectList');
    const fragment = cloneTemplate('error-state');
    fragment.querySelector('.error-message').textContent = message;
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
