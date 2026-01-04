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
    toggleFilter,
    getFilters,
    syncLegendWithFilters
} from './filters.js';
import { 
    initMap, 
    renderMarkers, 
    renderLegend, 
    setOnMarkerClick,
    setOnMapClick,
    setOnLegendFilterChange
} from './map.js';
import { 
    selectProject, 
    closeDetailPanel, 
    getSelectedProject,
    checkUrlParams,
    setOnProjectModified,
    setOnShowCommentDialog
} from './detail-panel.js';
import {
    isNoLocationFilterActive,
    isInLocationEditMode,
    getProjectToAssign,
    enterLocationAssignMode,
    assignLocation,
    hasModifiedProjects,
    getModifiedCount,
    applyNoLocationFilter,
    setOnLocationEditorStateChanged
} from './location-editor.js';
import {
    loadUser,
    updateUserIcon,
    setOnUserChanged
} from './user.js';
import {
    loadVotesAndComments
} from './votes.js';
import { wireVoteButtons } from './vote-buttons.js';
import { initEventListeners } from './event-listeners.js';
import { showCommentDialog, hideCommentDialog, handleCommentDialogOk } from './comment-dialog.js';
import { initDebugMode, isDebugMode } from './debug.js';

/**
 * Initialize the application
 */
async function init() {
    try {
        // Initialize debug mode from URL
        initDebugMode();
        
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

        // Set up comment dialog callback for detail panel
        setOnShowCommentDialog(showCommentDialog);

        // Initialize filters
        initFilters();
        initRangeSliders();

        // Set up filter change handler
        setOnFiltersChanged(() => {
            renderProjects();
            renderMarkers();
            syncLegendWithFilters();
        });

        // Initialize event listeners
        initEventListeners({
            renderProjects,
            renderMarkers,
            hideCommentDialog,
            handleCommentDialogOk
        });

        // Load user from cookie and update icon
        loadUser();
        updateUserIcon();
        setOnUserChanged(() => {
            updateUserIcon();
        });

        // Load votes and comments from cookies
        loadVotesAndComments();

        // Initial render
        renderProjects();
        renderMarkers(true, false);  // Fit bounds on initial load, no animation
        renderLegend();

        // Set up legend click to toggle filters
        // On first click (no filters active), hide the clicked type
        // On subsequent clicks, toggle that type
        setOnLegendFilterChange((type) => {
            const filters = getFilters();
            const currentConfig = getConfig();
            const allTypes = Object.keys(currentConfig.projectTypes);
            
            if (filters.types.length === 0) {
                // First click: add all types EXCEPT the clicked one (to hide it)
                allTypes.filter(t => t !== type).forEach(t => {
                    const chip = document.querySelector(`.filter-chip[data-filter-type="type"][data-value="${t}"]`);
                    if (chip && !chip.classList.contains('active')) {
                        toggleFilter('type', t, chip);
                    }
                });
            } else {
                // Toggle the clicked type
                const chip = document.querySelector(`.filter-chip[data-filter-type="type"][data-value="${type}"]`);
                if (chip) {
                    toggleFilter('type', type, chip);
                }
            }
            // Sync legend visual state with filters
            syncLegendWithFilters();
        });

        // Collapse legend on mobile by default
        if (window.innerWidth <= 768) {
            const legendContent = document.getElementById('legendContent');
            const legendIcon = document.querySelector('#legendToggle i');
            legendContent.classList.add('collapsed');
            legendIcon.classList.remove('fa-chevron-down');
            legendIcon.classList.add('fa-chevron-up');
        }

        // Check URL for project selection
        checkUrlParams();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load application data.');
    }
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

    // Wire up vote buttons
    wireVoteButtons(card, project, showCommentDialog);

    // Click handler - shift+click for location assignment mode (debug mode only)
    card.addEventListener('click', (e) => {
        if (isDebugMode() && e.shiftKey && isNoLocationFilterActive() && !project.hasLocation) {
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
