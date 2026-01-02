/**
 * User Module
 * Handles user identity (first name, last name, email, location)
 * Stored in a cookie, no authentication required
 */

import { getConfig } from './config.js';
import { getCookie, setCookie, deleteCookie } from './cookies.js';

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
 *   location: { lat: number, lng: number, hexId: string },
 *   userId: string (from API, if available)
 * }
 */

/**
 * Register user with API server
 * @param {Object} user - User data
 * @returns {Promise<string|null>} - User ID from server, or null if API not configured/failed
 */
async function registerUserWithApi(user) {
    const config = getConfig();
    if (!config.apiServer) {
        return null;
    }
    
    try {
        const response = await fetch(`${config.apiServer}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                first_name: user.firstName,
                last_name: user.lastName,
                email: user.email,
                hex_location: user.location?.hexId || null,
                appid: 'cipmap'
            })
        });
        
        if (!response.ok) {
            console.error('API registration failed:', response.status);
            return null;
        }
        
        const data = await response.json();
        return data.userid || data.userId || data.id || null;
    } catch (error) {
        console.error('API registration error:', error);
        return null;
    }
}

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
    deleteCookie(COOKIE_NAME);
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
    setCookie(COOKIE_NAME, JSON.stringify(user), COOKIE_DAYS);
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
    
    // Initialize wizard step (step 1 on mobile)
    initWizardStep(1);
    
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
export async function handleUserDialogOk() {
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
        // Register with API if configured
        const userId = await registerUserWithApi(user);
        if (userId) {
            user.userId = userId;
        }
        
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

// Wizard state
let currentWizardStep = 1;

/**
 * Check if we're in mobile wizard mode
 */
function isMobileWizard() {
    return window.innerWidth <= 768;
}

/**
 * Initialize wizard step display
 */
export function initWizardStep(step = 1) {
    currentWizardStep = step;
    
    if (!isMobileWizard()) {
        // Desktop: show all panels, hide wizard nav
        document.getElementById('wizardStep1').classList.add('active');
        document.getElementById('wizardStep2').classList.add('active');
        document.getElementById('userDialogOk').hidden = false;
        document.getElementById('userDialogNext').hidden = true;
        document.getElementById('userDialogBack').hidden = true;
        return;
    }
    
    // Mobile: show wizard navigation
    updateWizardStep(step);
}

/**
 * Update wizard to show a specific step
 */
function updateWizardStep(step) {
    currentWizardStep = step;
    
    const step1Panel = document.getElementById('wizardStep1');
    const step2Panel = document.getElementById('wizardStep2');
    const step1Indicator = document.querySelector('.wizard-step[data-step="1"]');
    const step2Indicator = document.querySelector('.wizard-step[data-step="2"]');
    const backBtn = document.getElementById('userDialogBack');
    const nextBtn = document.getElementById('userDialogNext');
    const okBtn = document.getElementById('userDialogOk');
    
    // Update panels
    step1Panel.classList.toggle('active', step === 1);
    step2Panel.classList.toggle('active', step === 2);
    
    // Update indicators
    step1Indicator.classList.toggle('active', step === 1);
    step1Indicator.classList.toggle('completed', step > 1);
    step2Indicator.classList.toggle('active', step === 2);
    
    // Update buttons
    if (step === 1) {
        backBtn.hidden = true;
        nextBtn.hidden = false;
        okBtn.hidden = true;
    } else {
        backBtn.hidden = false;
        nextBtn.hidden = true;
        okBtn.hidden = false;
        // Re-validate to update OK button state
        validateDialogForm();
        // Refresh map when entering step 2 (container may have changed size)
        if (dialogMap) {
            setTimeout(() => dialogMap.invalidateSize(), 100);
        }
    }
}

/**
 * Handle Next button click
 */
export function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Validate step 1 fields before proceeding
        const firstName = document.getElementById('userFirstName').value.trim();
        const lastName = document.getElementById('userLastName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        
        if (!firstName || !lastName || !email) {
            // Could show validation messages here
            return;
        }
        
        updateWizardStep(2);
    }
}

/**
 * Handle Back button click
 */
export function handleWizardBack() {
    if (currentWizardStep === 2) {
        updateWizardStep(1);
    }
}
