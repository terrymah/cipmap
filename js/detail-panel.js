/**
 * Detail Panel module for CIP Map
 * Handles project selection and detail panel display
 */

import { getConfig } from './config.js';
import { getProjects } from './data.js';
import { cloneTemplate } from './templates.js';
import { formatCurrency, formatDate, isPastDate } from './utils.js';
import { panTo, setMapView } from './map.js';
import { assignLink } from './location-editor.js';
import { hasUser, showUserDialog } from './user.js';
import { getVote, upvote, downvote, hasComments } from './votes.js';

// Currently selected project
let selectedProject = null;

// Callback for when project is modified
let onProjectModified = null;

// Callback for showing comment dialog (set by main.js)
let onShowCommentDialog = null;

/**
 * Set callback for project modifications
 */
export function setOnProjectModified(callback) {
    onProjectModified = callback;
}

/**
 * Set callback for showing comment dialog
 */
export function setOnShowCommentDialog(callback) {
    onShowCommentDialog = callback;
}

/**
 * Get currently selected project
 */
export function getSelectedProject() {
    return selectedProject;
}

/**
 * Select a project and show its detail panel
 */
export function selectProject(project) {
    selectedProject = project;
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('project', project.id);
    window.history.pushState({}, '', url);

    // Highlight card
    document.querySelectorAll('.project-card').forEach(card => {
        card.classList.toggle('active', card.dataset.projectId === project.id);
    });

    // Pan map if project has location
    if (project.hasLocation) {
        panTo(project.lat, project.lng);
    }

    // Show detail panel
    showDetailPanel(project);

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

/**
 * Show the detail panel for a project
 */
export function showDetailPanel(project) {
    const config = getConfig();
    const typeConfig = config.projectTypes[project.type] || { color: '#95a5a6', icon: 'folder' };
    const statusClass = 'status-' + project.status.toLowerCase().replace(/[^a-z]/g, '-');
    const priorityClass = 'priority-' + project.priority.toLowerCase();

    const fragment = cloneTemplate('project-detail');

    // Type badge
    const typeBadge = fragment.querySelector('.detail-type-badge');
    typeBadge.style.backgroundColor = typeConfig.color;
    typeBadge.querySelector('i').classList.add(`fa-${typeConfig.icon}`);
    typeBadge.querySelector('.type-label').textContent = project.type;

    // Project name
    fragment.querySelector('.project-name').textContent = project.name;

    // Status badge
    const statusBadge = fragment.querySelector('.status-badge');
    statusBadge.textContent = project.status;
    statusBadge.classList.add(statusClass);

    // Priority badge
    const priorityBadge = fragment.querySelector('.priority-badge');
    priorityBadge.textContent = `${project.priority} Priority`;
    priorityBadge.classList.add(priorityClass);

    // Description
    fragment.querySelector('.detail-description').textContent = project.description;

    // Location (conditional)
    if (project.locationName) {
        const locationSection = fragment.querySelector('.location-section');
        locationSection.hidden = false;
        locationSection.querySelector('.location-name').textContent = project.locationName;
    }

    // Funding table
    const fundingBody = fragment.querySelector('.funding-body');
    config.fundingYears.forEach(year => {
        const rowFragment = cloneTemplate('funding-row');
        rowFragment.querySelector('.fiscal-year').textContent = year;
        rowFragment.querySelector('.fiscal-amount').textContent = 
            formatCurrency(project.fundingYears[year] || 0);
        fundingBody.appendChild(rowFragment);
    });

    // Funding total row
    const totalFragment = cloneTemplate('funding-total');
    totalFragment.querySelector('.total-amount').textContent = formatCurrency(project.totalFunding);
    fundingBody.appendChild(totalFragment);

    // Funding source (now an array)
    if (project.fundingSource && project.fundingSource.length > 0) {
        const sourceText = fragment.querySelector('.funding-source-text');
        sourceText.hidden = false;
        sourceText.querySelector('.funding-source').textContent = project.fundingSource.join(', ');
    }

    // Timeline (conditional)
    const timelineData = [
        { date: project.startDate, label: 'Project Start' },
        { date: project.constructionStart, label: 'Construction Start' },
        { date: project.endDate, label: 'Completion' }
    ].filter(item => item.date);

    if (timelineData.length > 0) {
        const timelineSection = fragment.querySelector('.timeline-section');
        timelineSection.hidden = false;
        const timeline = timelineSection.querySelector('.timeline');

        timelineData.forEach(item => {
            const itemFragment = cloneTemplate('timeline-item');
            const dot = itemFragment.querySelector('.timeline-dot');
            dot.classList.add(isPastDate(item.date) ? 'active' : 'future');
            itemFragment.querySelector('.timeline-label').textContent = item.label;
            itemFragment.querySelector('.timeline-date').textContent = formatDate(item.date);
            timeline.appendChild(itemFragment);
        });
    }

    // Department (conditional)
    if (project.department) {
        const deptSection = fragment.querySelector('.department-section');
        deptSection.hidden = false;
        deptSection.querySelector('.department-name').textContent = project.department;
    }

    // Learn more link (conditional)
    if (project.link) {
        const learnMoreBtn = fragment.querySelector('.learn-more-btn');
        learnMoreBtn.hidden = false;
        learnMoreBtn.href = project.link;
    } else {
        // Show "Add Link" button if no link exists
        const addLinkBtn = fragment.querySelector('.add-link-btn');
        addLinkBtn.hidden = false;
        addLinkBtn.addEventListener('click', () => {
            const url = prompt('Enter the project URL:', 'https://');
            if (url && url.trim() && url !== 'https://') {
                assignLink(project, url.trim());
                // Refresh the detail panel to show the new link
                showDetailPanel(project);
                if (onProjectModified) onProjectModified();
            }
        });
    }

    // View on map button (conditional)
    if (project.hasLocation) {
        const viewMapBtn = fragment.querySelector('.view-map-btn');
        viewMapBtn.hidden = false;
        viewMapBtn.addEventListener('click', () => zoomToProject(project.id));
    }

    // Vote buttons
    const upvoteBtn = fragment.querySelector('.upvote-btn');
    const downvoteBtn = fragment.querySelector('.downvote-btn');
    const commentBtn = fragment.querySelector('.comment-btn');

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
        if (onShowCommentDialog) {
            onShowCommentDialog(project);
        }
    });

    // Replace content
    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = '';
    detailContent.appendChild(fragment);

    document.getElementById('detailOverlay').classList.add('open');
}

/**
 * Close the detail panel
 */
export function closeDetailPanel() {
    document.getElementById('detailOverlay').classList.remove('open');
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.delete('project');
    window.history.pushState({}, '', url);

    selectedProject = null;
    document.querySelectorAll('.project-card').forEach(card => {
        card.classList.remove('active');
    });
}

/**
 * Zoom to a project on the map
 */
export function zoomToProject(projectId) {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project && project.hasLocation) {
        setMapView(project.lat, project.lng, 16);
        closeDetailPanel();
    }
}

/**
 * Check URL parameters for project selection
 */
export function checkUrlParams() {
    const projects = getProjects();
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    
    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            selectProject(project);
        }
    }
}
