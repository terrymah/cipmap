/**
 * Map module for CIP Map
 * Handles Leaflet map initialization, markers, and legend
 */

import { getConfig, getTypeDisplayName } from './config.js';
import { getProjects, getFilteredProjects } from './data.js';
import { cloneTemplate } from './templates.js';

// Map instance and state
let map = null;
let markerLayer = null;
let markers = [];

// Callback for marker clicks
let onMarkerClick = null;

// Callback for map clicks (used for location assignment)
let onMapClick = null;

/**
 * Get the map instance
 */
export function getMap() {
    return map;
}

/**
 * Set callback for marker click events
 */
export function setOnMarkerClick(callback) {
    onMarkerClick = callback;
}

/**
 * Set callback for map click events (for location assignment)
 */
export function setOnMapClick(callback) {
    onMapClick = callback;
}

/**
 * Initialize the Leaflet map
 */
export function initMap() {
    const config = getConfig();

    map = L.map('map').setView(
        [config.mapCenter.lat, config.mapCenter.lng],
        config.defaultZoom
    );

    // CartoDB Positron - clean, minimal style that's easier on the eyes
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: config.maxZoom,
        minZoom: config.minZoom,
        subdomains: 'abcd'
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);

    // Handle map clicks for location assignment
    map.on('click', (e) => {
        if (onMapClick) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        }
    });
}

/**
 * Invalidate map size (call after container resize)
 */
export function invalidateMapSize() {
    if (map) {
        map.invalidateSize({ pan: false });
    }
}

/**
 * Pan map to a specific location
 */
export function panTo(lat, lng) {
    if (map) {
        map.panTo([lat, lng]);
    }
}

/**
 * Set map view to a specific location and zoom
 */
export function setMapView(lat, lng, zoom) {
    if (map) {
        map.setView([lat, lng], zoom);
    }
}

/**
 * Render markers for filtered projects
 * @param {boolean} fitToMarkers - Whether to fit the map bounds to markers (default: false)
 * @param {boolean} animate - Whether to animate the bounds change (default: true)
 */
export function renderMarkers(fitToMarkers = false, animate = true) {
    const config = getConfig();
    const projects = getProjects();
    const filteredProjects = getFilteredProjects();

    markerLayer.clearLayers();
    markers = [];

    const projectsWithLocation = filteredProjects.filter(p => p.hasLocation);
    const maxFunding = Math.max(...projects.map(p => p.totalFunding));

    projectsWithLocation.forEach(project => {
        const marker = createMarker(project, maxFunding, config);
        markers.push({ project, marker });
        marker.addTo(markerLayer);
    });

    // Fit bounds only if explicitly requested and there are markers
    if (fitToMarkers && markers.length > 1) {
        const group = L.featureGroup(markers.map(m => m.marker));
        map.fitBounds(group.getBounds().pad(0.1), { animate });
    }
}

/**
 * Create a map marker for a project
 */
function createMarker(project, maxFunding, config) {
    const typeConfig = config.projectTypes[project.type] || { color: '#95a5a6', icon: 'folder' };
    
    // Calculate marker size based on funding (min 30, max 60)
    const minSize = 30;
    const maxSize = 60;
    const size = minSize + ((project.totalFunding / maxFunding) * (maxSize - minSize));

    // Clone and populate marker template
    const fragment = cloneTemplate('map-marker');
    const markerDiv = fragment.querySelector('.custom-marker');
    markerDiv.style.width = `${size}px`;
    markerDiv.style.height = `${size}px`;
    markerDiv.style.backgroundColor = typeConfig.color;
    markerDiv.querySelector('i').classList.add(`fa-${typeConfig.icon}`);

    // Create a temporary container to get the HTML
    const temp = document.createElement('div');
    temp.appendChild(fragment);

    const icon = L.divIcon({
        className: 'custom-marker-wrapper',
        html: temp.innerHTML,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([project.lat, project.lng], { icon });

    // Tooltip
    marker.bindTooltip(project.name, {
        direction: 'top',
        offset: [0, -size / 2]
    });

    // Click handler
    marker.on('click', () => {
        if (onMarkerClick) {
            onMarkerClick(project);
        }
    });

    return marker;
}

// Callback for legend filter changes
let onLegendFilterChange = null;

/**
 * Set callback for when legend filters change
 */
export function setOnLegendFilterChange(callback) {
    onLegendFilterChange = callback;
}

/**
 * Render the map legend
 * Only shows project types that exist in the loaded data
 */
export function renderLegend() {
    const config = getConfig();
    const container = document.getElementById('legendContent');
    container.innerHTML = '';

    // Get unique types from loaded projects
    const projects = getProjects();
    const typesInData = new Set(projects.map(p => p.type));

    Object.entries(config.projectTypes).forEach(([type, settings]) => {
        // Skip types not present in the data
        if (!typesInData.has(type)) {
            return;
        }
        
        const fragment = cloneTemplate('legend-item');
        const item = fragment.querySelector('.legend-item');
        
        item.querySelector('.legend-color').style.backgroundColor = settings.color;
        item.querySelector('.legend-label').textContent = getTypeDisplayName(type);
        item.dataset.type = type;
        item.style.cursor = 'pointer';
        item.title = 'Click to toggle filter';
        
        item.addEventListener('click', () => {
            if (onLegendFilterChange) {
                onLegendFilterChange(type);
            }
        });
        
        container.appendChild(fragment);
    });
}
