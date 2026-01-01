/**
 * Location Editor Module
 * Handles assigning locations to projects via map clicks
 * Also handles other project modifications like links
 */

import { getProjects, getFilteredProjects } from './data.js';
import { getConfig } from './config.js';

// State
let isLocationEditMode = false;
let showOnlyNoLocation = false;
let projectToAssign = null;
let modifiedLocations = new Map(); // projectId -> { lat, lng }
let modifiedLinks = new Map(); // projectId -> link
let onStateChanged = null;

/**
 * Check if we're showing only projects without locations
 */
export function isNoLocationFilterActive() {
    return showOnlyNoLocation;
}

/**
 * Toggle the "no location" filter
 */
export function toggleNoLocationFilter() {
    showOnlyNoLocation = !showOnlyNoLocation;
    if (onStateChanged) onStateChanged();
    return showOnlyNoLocation;
}

/**
 * Set callback for state changes
 */
export function setOnLocationEditorStateChanged(callback) {
    onStateChanged = callback;
}

/**
 * Check if location edit mode is active
 */
export function isInLocationEditMode() {
    return isLocationEditMode;
}

/**
 * Get the project currently being assigned
 */
export function getProjectToAssign() {
    return projectToAssign;
}

/**
 * Enter location assignment mode for a project
 */
export function enterLocationAssignMode(project) {
    projectToAssign = project;
    isLocationEditMode = true;
    document.body.classList.add('location-assign-mode');
    if (onStateChanged) onStateChanged();
}

/**
 * Exit location assignment mode
 */
export function exitLocationAssignMode() {
    projectToAssign = null;
    isLocationEditMode = false;
    document.body.classList.remove('location-assign-mode');
    if (onStateChanged) onStateChanged();
}

/**
 * Assign a location to the current project
 */
export function assignLocation(lat, lng) {
    if (!projectToAssign) return false;
    
    // Update the project in memory
    projectToAssign.lat = lat;
    projectToAssign.lng = lng;
    projectToAssign.hasLocation = true;
    
    // Track this modification
    modifiedLocations.set(projectToAssign.id, { lat, lng });
    
    // Exit assignment mode
    exitLocationAssignMode();
    
    return true;
}

/**
 * Assign a link to a project
 */
export function assignLink(project, link) {
    if (!project || !link) return false;
    
    // Update the project in memory
    project.link = link;
    
    // Track this modification
    modifiedLinks.set(project.id, link);
    
    if (onStateChanged) onStateChanged();
    
    return true;
}

/**
 * Check if any projects have been modified (locations or links)
 */
export function hasModifiedProjects() {
    return modifiedLocations.size > 0 || modifiedLinks.size > 0;
}

/**
 * Check if any locations have been modified
 */
export function hasModifiedLocations() {
    return modifiedLocations.size > 0;
}

/**
 * Get count of modified locations
 */
export function getModifiedLocationCount() {
    return modifiedLocations.size;
}

/**
 * Get count of modified links
 */
export function getModifiedLinkCount() {
    return modifiedLinks.size;
}

/**
 * Get total count of modified projects
 */
export function getModifiedCount() {
    // Count unique project IDs that have been modified
    const allModifiedIds = new Set([...modifiedLocations.keys(), ...modifiedLinks.keys()]);
    return allModifiedIds.size;
}

/**
 * Apply the "no location" filter to a project list
 * This is meant to be called after other filters
 */
export function applyNoLocationFilter(projects) {
    if (!showOnlyNoLocation) return projects;
    return projects.filter(p => !p.hasLocation);
}

/**
 * Generate CSV content with updated locations
 */
export function generateUpdatedCsv() {
    const config = getConfig();
    const projects = getProjects();
    
    // Build header row
    const headers = [
        'id', 'name', 'type', 'status', 'priority', 'description',
        'location_name', 'lat', 'lng'
    ];
    
    // Add funding year columns
    config.fundingYears.forEach(fy => {
        if (fy === 'Future') {
            headers.push('funding_future');
        } else {
            headers.push(`funding_${fy.toLowerCase().replace('/', '')}`);
        }
    });
    
    // Add remaining columns
    headers.push('funding_source', 'department', 'start_date', 'construction_start', 'end_date', 'link');
    
    // Build rows
    const rows = [headers.join(',')];
    
    projects.forEach(project => {
        const values = [
            escapeCsvValue(project.id),
            escapeCsvValue(project.name),
            escapeCsvValue(project.type),
            escapeCsvValue(project.status),
            escapeCsvValue(project.priority),
            escapeCsvValue(project.description || ''),
            escapeCsvValue(project.locationName || ''),
            project.lat !== null ? project.lat : '',
            project.lng !== null ? project.lng : ''
        ];
        
        // Add funding years
        config.fundingYears.forEach(fy => {
            values.push(project.fundingYears[fy] || 0);
        });
        
        // Add remaining fields
        values.push(
            escapeCsvValue(Array.isArray(project.fundingSource) ? project.fundingSource.join(', ') : (project.fundingSource || '')),
            escapeCsvValue(project.department || ''),
            escapeCsvValue(project.isOngoing && !project.startDate ? '*' : (project.startDate || '')),
            escapeCsvValue(project.isOngoing && !project.constructionStart ? '*' : (project.constructionStart || '')),
            escapeCsvValue(project.isOngoing && !project.endDate ? '*' : (project.endDate || '')),
            escapeCsvValue(project.link || '')
        );
        
        rows.push(values.join(','));
    });
    
    return rows.join('\n');
}

/**
 * Download the updated CSV file
 */
export function downloadUpdatedCsv() {
    const csvContent = generateUpdatedCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'projects_updated.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}
