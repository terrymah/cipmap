/**
 * User Module
 * Handles user identity (first name, last name, email, location)
 * Stored in a cookie, no authentication required
 */

import { getConfig } from './config.js';

const COOKIE_NAME = 'cipmap_user';
const COOKIE_DAYS = 365;

// Current user state
let currentUser = null;

// Callbacks
let onUserChanged = null;

/**
 * User object structure:
 * {
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   location: { lat: number, lng: number }
 * }
 */

/**
 * Set callback for user changes
 */
export function setOnUserChanged(callback) {
    onUserChanged = callback;
}

/**
 * Get the current user
 */
export function getUser() {
    return currentUser;
}

/**
 * Check if a user is set
 */
export function hasUser() {
    return currentUser !== null;
}

/**
 * Set the current user and save to cookie
 */
export function setUser(user) {
    currentUser = user;
    saveToCookie(user);
    if (onUserChanged) onUserChanged(user);
}

/**
 * Clear the current user
 */
export function clearUser() {
    currentUser = null;
    deleteCookie();
    if (onUserChanged) onUserChanged(null);
}

/**
 * Load user from cookie on init
 */
export function loadUser() {
    const cookieValue = getCookie(COOKIE_NAME);
    if (cookieValue) {
        try {
            currentUser = JSON.parse(cookieValue);
        } catch (e) {
            console.error('Failed to parse user cookie:', e);
            currentUser = null;
        }
    }
    return currentUser;
}

/**
 * Validate user data
 */
export function validateUser(user) {
    const errors = {};
    
    if (!user.firstName || !user.firstName.trim()) {
        errors.firstName = 'First name is required';
    }
    
    if (!user.lastName || !user.lastName.trim()) {
        errors.lastName = 'Last name is required';
    }
    
    if (!user.email || !user.email.trim()) {
        errors.email = 'Email is required';
    } else if (!isValidEmail(user.email)) {
        errors.email = 'Please enter a valid email address';
    }
    
    if (!user.location || !user.location.hexId) {
        errors.location = 'Please select your area on the map';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Email validation helper
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Save user to cookie
 */
function saveToCookie(user) {
    const expires = new Date();
    expires.setTime(expires.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
    const cookieValue = encodeURIComponent(JSON.stringify(user));
    document.cookie = `${COOKIE_NAME}=${cookieValue};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get cookie value
 */
function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
}

/**
 * Delete cookie
 */
function deleteCookie() {
    document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Show the user dialog
 * @param {string} bannerMessage - Optional message to show in a banner
 */
export function showUserDialog(bannerMessage = null) {
    const dialog = document.getElementById('userDialog');
    const overlay = document.getElementById('userDialogOverlay');
    const banner = document.getElementById('userDialogBanner');
    
    // Show/hide banner
    if (bannerMessage) {
        banner.textContent = bannerMessage;
        banner.hidden = false;
    } else {
        banner.hidden = true;
    }
    
    // Pre-fill form if user exists
    const firstNameInput = document.getElementById('userFirstName');
    const lastNameInput = document.getElementById('userLastName');
    const emailInput = document.getElementById('userEmail');
    const okBtn = document.getElementById('userDialogOk');
    const locationHint = document.getElementById('userLocationHint');
    
    if (currentUser) {
        firstNameInput.value = currentUser.firstName || '';
        lastNameInput.value = currentUser.lastName || '';
        emailInput.value = currentUser.email || '';
    } else {
        firstNameInput.value = '';
        lastNameInput.value = '';
        emailInput.value = '';
    }
    
    // Show dialog first (so map container has dimensions)
    dialog.hidden = false;
    overlay.hidden = false;
    
    // Initialize the dialog map (after dialog is visible)
    initDialogMap();
    
    // Restore selected hex if user has one
    if (currentUser && currentUser.location) {
        setDialogLocationFromStored(currentUser.location);
    } else {
        clearDialogLocation();
    }
    
    // Validate initially
    validateDialogForm();
    
    // Focus first field
    firstNameInput.focus();
}

/**
 * Hide the user dialog
 */
export function hideUserDialog() {
    const dialog = document.getElementById('userDialog');
    const overlay = document.getElementById('userDialogOverlay');
    
    dialog.hidden = true;
    overlay.hidden = true;
    
    // Cleanup dialog map
    destroyDialogMap();
}

// Dialog map state
let dialogMap = null;
let dialogHexLayer = null;
let selectedHex = null;
let hexagons = [];

/**
 * Initialize the dialog map with hex grid
 */
function initDialogMap() {
    const config = getConfig();
    const mapContainer = document.getElementById('userLocationMap');
    const pickerConfig = config.userLocationPicker || {
        center: config.mapCenter,
        zoom: 11,
        hexSize: 0.008,
        gridCols: 11,
        gridRows: 9
    };
    
    // Create map - no zoom, no pan
    dialogMap = L.map(mapContainer, {
        center: [pickerConfig.center.lat, pickerConfig.center.lng],
        zoom: pickerConfig.zoom,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    });
    
    // Add standard OSM tile layer (more visible under transparent hexes)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(dialogMap);
    
    // Create hex grid layer
    dialogHexLayer = L.layerGroup().addTo(dialogMap);
    
    // Generate and render hex grid using config
    generateHexGrid(
        pickerConfig.center.lat, 
        pickerConfig.center.lng, 
        pickerConfig.hexSize,
        pickerConfig.gridCols,
        pickerConfig.gridRows
    );
}

/**
 * Generate hexagonal grid centered on a point
 * Uses pointy-top hexagons (point facing up and down)
 */
function generateHexGrid(centerLat, centerLng, hexSize, cols, rows) {
    hexagons = [];
    
    // Latitude correction factor (approximate for this region ~35.7°N)
    const lngCorrection = 1.0 / Math.cos(centerLat * Math.PI / 180);
    
    // For pointy-top hexagons:
    // Vertical distance from center to point = size
    // Horizontal distance from center to edge = size * sqrt(3)/2
    
    // Vertical spacing between row centers = 1.5 * size
    const vertSpacing = hexSize * 1.5;
    // Horizontal spacing between column centers = sqrt(3) * size (corrected for longitude)
    const horizSpacing = hexSize * Math.sqrt(3) * lngCorrection;
    
    for (let row = -Math.floor(rows/2); row <= Math.floor(rows/2); row++) {
        for (let col = -Math.floor(cols/2); col <= Math.floor(cols/2); col++) {
            // For pointy-top, offset every other row horizontally by half the width
            const xOffset = (Math.abs(row) % 2 === 1) ? horizSpacing / 2 : 0;
            
            const hexCenterLng = centerLng + (col * horizSpacing) + xOffset;
            const hexCenterLat = centerLat + (row * vertSpacing);
            
            const hexId = `hex_${row}_${col}`;
            const hexPoints = generateHexPoints(hexCenterLat, hexCenterLng, hexSize, lngCorrection);
            
            const polygon = L.polygon(hexPoints, {
                color: 'rgba(150, 150, 150, 0.5)',
                weight: 1,
                fillColor: '#3498db',
                fillOpacity: 0.05,
                className: 'hex-cell'
            });
            
            // Store hex data
            const hexData = {
                id: hexId,
                center: { lat: hexCenterLat, lng: hexCenterLng },
                polygon: polygon
            };
            hexagons.push(hexData);
            
            // Add click handler
            polygon.on('click', () => selectHex(hexData));
            polygon.on('mouseover', () => {
                if (selectedHex !== hexData) {
                    polygon.setStyle({ fillOpacity: 0.3 });
                }
            });
            polygon.on('mouseout', () => {
                if (selectedHex !== hexData) {
                    polygon.setStyle({ fillOpacity: 0.05 });
                }
            });
            
            polygon.addTo(dialogHexLayer);
        }
    }
}

/**
 * Generate the 6 corner points of a pointy-top hexagon
 */
function generateHexPoints(centerLat, centerLng, size, lngCorrection) {
    const points = [];
    
    for (let i = 0; i < 6; i++) {
        // Pointy-top: start at 90 degrees (point up), go clockwise
        const angleDeg = 60 * i + 90;
        const angleRad = (Math.PI / 180) * angleDeg;
        points.push([
            centerLat + size * Math.sin(angleRad),
            centerLng + size * Math.cos(angleRad) * lngCorrection
        ]);
    }
    return points;
}

/**
 * Select a hexagon
 */
function selectHex(hexData) {
    // Deselect previous
    if (selectedHex) {
        selectedHex.polygon.setStyle({
            color: 'rgba(150, 150, 150, 0.5)',
            fillColor: '#3498db',
            fillOpacity: 0.05,
            weight: 1
        });
    }
    
    // Select new
    selectedHex = hexData;
    hexData.polygon.setStyle({
        color: '#27ae60',
        fillColor: '#27ae60',
        fillOpacity: 0.4,
        weight: 2
    });
    
    // Update hint
    const hint = document.getElementById('userLocationHint');
    hint.textContent = 'Area selected';
    hint.classList.add('location-set');
    
    validateDialogForm();
}

/**
 * Destroy the dialog map
 */
function destroyDialogMap() {
    if (dialogMap) {
        dialogMap.remove();
        dialogMap = null;
        dialogHexLayer = null;
        selectedHex = null;
        hexagons = [];
    }
}

/**
 * Set selected hex by stored location (when reopening dialog)
 */
function setDialogLocationFromStored(storedLocation) {
    if (!storedLocation || !storedLocation.hexId) return;
    
    // Find the hex with matching ID
    const hex = hexagons.find(h => h.id === storedLocation.hexId);
    if (hex) {
        selectHex(hex);
    }
}

/**
 * Clear location on dialog map
 */
function clearDialogLocation() {
    if (selectedHex) {
        selectedHex.polygon.setStyle({
            color: 'rgba(150, 150, 150, 0.5)',
            fillColor: '#3498db',
            fillOpacity: 0.05,
            weight: 1
        });
        selectedHex = null;
    }
    
    const hint = document.getElementById('userLocationHint');
    hint.textContent = 'Click on a hexagon to select your area';
    hint.classList.remove('location-set');
}

/**
 * Get current dialog location (hex-based)
 */
export function getDialogLocation() {
    if (!selectedHex) return null;
    return {
        hexId: selectedHex.id,
        center: selectedHex.center
    };
}

/**
 * Validate the dialog form and update OK button state
 */
export function validateDialogForm() {
    const firstName = document.getElementById('userFirstName').value;
    const lastName = document.getElementById('userLastName').value;
    const email = document.getElementById('userEmail').value;
    const okBtn = document.getElementById('userDialogOk');
    
    const user = {
        firstName,
        lastName,
        email,
        location: getDialogLocation()
    };
    
    const { isValid } = validateUser(user);
    okBtn.disabled = !isValid;
    
    return isValid;
}

/**
 * Handle OK button click
 */
export function handleUserDialogOk() {
    const firstName = document.getElementById('userFirstName').value.trim();
    const lastName = document.getElementById('userLastName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    
    const user = {
        firstName,
        lastName,
        email,
        location: getDialogLocation()
    };
    
    const { isValid } = validateUser(user);
    
    if (isValid) {
        setUser(user);
        hideUserDialog();
    }
}

/**
 * Update the user icon in the header based on current state
 */
export function updateUserIcon() {
    const userBtn = document.getElementById('userBtn');
    const icon = userBtn.querySelector('i');
    
    if (hasUser()) {
        icon.className = 'fas fa-user';
        userBtn.title = `${currentUser.firstName} ${currentUser.lastName}`;
        userBtn.classList.add('has-user');
    } else {
        icon.className = 'fas fa-question';
        userBtn.title = 'Set your identity';
        userBtn.classList.remove('has-user');
    }
}
