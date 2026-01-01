/**
 * Event Listeners Module
 * Centralizes all DOM event listener setup for the application
 */

import { invalidateMapSize } from './map.js';
import { closeDetailPanel } from './detail-panel.js';
import { setSearchFilter, clearAllFilters } from './filters.js';
import {
    toggleNoLocationFilter,
    exitLocationAssignMode,
    downloadUpdatedCsv
} from './location-editor.js';
import {
    showUserDialog,
    hideUserDialog,
    handleUserDialogOk,
    validateDialogForm
} from './user.js';

/**
 * Initialize all event listeners
 * @param {Object} callbacks - Callback functions from main.js
 * @param {Function} callbacks.renderProjects - Function to render project list
 * @param {Function} callbacks.renderMarkers - Function to render map markers
 * @param {Function} callbacks.hideCommentDialog - Function to hide comment dialog
 * @param {Function} callbacks.handleCommentDialogOk - Function to handle comment OK
 */
export function initEventListeners(callbacks) {
    const { renderProjects, renderMarkers, hideCommentDialog, handleCommentDialogOk } = callbacks;

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
