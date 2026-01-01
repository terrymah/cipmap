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
    setOnProjectModified,
    setOnShowCommentDialog
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
import {
    loadUser,
    showUserDialog,
    hideUserDialog,
    handleUserDialogOk,
    validateDialogForm,
    updateUserIcon,
    setOnUserChanged,
    hasUser
} from './user.js';
import {
    loadVotesAndComments,
    getVote,
    upvote,
    downvote,
    getComments,
    addComment,
    hasComments
} from './votes.js';

// Current project for comment dialog
let commentProjectId = null;

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

        // Set up comment dialog callback for detail panel
        setOnShowCommentDialog(showCommentDialog);

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
            hideUserDialog();
            hideCommentDialog();
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

    // User button and dialog
    document.getElementById('userBtn').addEventListener('click', () => {
        showUserDialog();
    });

    document.getElementById('userDialogCancel').addEventListener('click', () => {
        hideUserDialog();
    });

    document.getElementById('userDialogOk').addEventListener('click', () => {
        handleUserDialogOk();
    });

    document.getElementById('userDialogOverlay').addEventListener('click', () => {
        hideUserDialog();
    });

    // Validate user form on input
    ['userFirstName', 'userLastName', 'userEmail'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            validateDialogForm();
        });
    });

    // Comment dialog handlers
    document.getElementById('commentDialogCancel').addEventListener('click', () => {
        hideCommentDialog();
    });

    document.getElementById('commentDialogOverlay').addEventListener('click', () => {
        hideCommentDialog();
    });

    document.getElementById('commentDialogOk').addEventListener('click', () => {
        handleCommentDialogOk();
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

    // Vote and comment buttons
    const upvoteBtn = card.querySelector('.upvote-btn');
    const downvoteBtn = card.querySelector('.downvote-btn');
    const commentBtn = card.querySelector('.comment-btn');

    // Set initial vote state
    const currentVote = getVote(project.id);
    if (currentVote === 'up') {
        upvoteBtn.classList.add('active');
    } else if (currentVote === 'down') {
        downvoteBtn.classList.add('active');
    }

    // Set initial comment state
    if (hasComments(project.id)) {
        commentBtn.classList.add('has-comments');
    }

    // Upvote handler
    upvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        const newVote = upvote(project.id);
        upvoteBtn.classList.toggle('active', newVote === 'up');
        downvoteBtn.classList.remove('active');
    });

    // Downvote handler
    downvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        const newVote = downvote(project.id);
        downvoteBtn.classList.toggle('active', newVote === 'down');
        upvoteBtn.classList.remove('active');
    });

    // Comment handler
    commentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        showCommentDialog(project);
    });

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

/**
 * Show the comment dialog for a project
 */
function showCommentDialog(project) {
    commentProjectId = project.id;
    
    const dialog = document.getElementById('commentDialog');
    const overlay = document.getElementById('commentDialogOverlay');
    
    // Set project name
    document.getElementById('commentProjectName').textContent = project.name;
    
    // Clear input
    document.getElementById('commentInput').value = '';
    
    // Render previous comments
    const previousCommentsContainer = document.getElementById('previousComments');
    previousCommentsContainer.innerHTML = '';
    
    const comments = getComments(project.id);
    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        
        const textEl = document.createElement('div');
        textEl.className = 'comment-text';
        textEl.textContent = comment.text;
        
        const timeEl = document.createElement('div');
        timeEl.className = 'comment-time';
        timeEl.textContent = formatCommentTime(comment.timestamp);
        
        commentEl.appendChild(textEl);
        commentEl.appendChild(timeEl);
        previousCommentsContainer.appendChild(commentEl);
    });
    
    // Show dialog
    dialog.hidden = false;
    overlay.hidden = false;
    
    // Focus input
    document.getElementById('commentInput').focus();
}

/**
 * Hide the comment dialog
 */
function hideCommentDialog() {
    const dialog = document.getElementById('commentDialog');
    const overlay = document.getElementById('commentDialogOverlay');
    
    dialog.hidden = true;
    overlay.hidden = true;
    commentProjectId = null;
}

/**
 * Handle OK button on comment dialog
 */
function handleCommentDialogOk() {
    const input = document.getElementById('commentInput');
    const commentText = input.value.trim();
    
    if (commentText && commentProjectId) {
        addComment(commentProjectId, commentText);
        
        // Update the comment button state in the project list
        const card = document.querySelector(`.project-card[data-project-id="${commentProjectId}"]`);
        if (card) {
            card.querySelector('.comment-btn').classList.add('has-comments');
        }
    }
    
    hideCommentDialog();
}

/**
 * Format comment timestamp for display
 */
function formatCommentTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
