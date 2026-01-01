/**
 * Data loading and parsing for CIP projects
 */

import { getConfig } from './config.js';

let projects = [];
let filteredProjects = [];

/**
 * Load projects from CSV file
 * @returns {Promise<Array>} Array of parsed projects
 */
export async function loadProjects() {
    const config = getConfig();
    
    return new Promise((resolve, reject) => {
        Papa.parse(config.dataFile, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                projects = results.data
                    .map(row => parseProject(row, config))
                    .filter(p => p !== null); // Filter out invalid rows
                filteredProjects = [...projects];
                resolve(projects);
            },
            error: (error) => reject(error)
        });
    });
}

/**
 * Parse a currency/number value that may contain commas, $ signs, etc.
 * @param {string|number} value - The value to parse
 * @returns {number} Parsed number or 0
 */
function parseCurrency(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    // Remove $, commas, spaces and parse
    const cleaned = String(value).replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Parse a CSV row into a project object
 * Only 'name' is required. All other fields have sensible defaults.
 * @param {Object} row - CSV row data
 * @param {Object} config - App configuration
 * @returns {Object} Parsed project object
 */
export function parseProject(row, config) {
    // Skip rows without a name
    if (!row.name || !row.name.trim()) {
        return null;
    }

    // Parse funding values
    const fundingYears = {};
    let totalFunding = 0;
    let firstFundedYear = null;
    let lastFundedYear = null;
    
    config.fundingYears.forEach(year => {
        // Skip 'Future' in the loop - we handle it specially below
        if (year === 'Future') return;
        
        const key = `funding_${year.toLowerCase().replace('/', '')}`;
        const value = parseCurrency(row[key]);
        fundingYears[year] = value;
        totalFunding += value;
        
        // Track first and last funded years for date inference
        if (value > 0) {
            if (!firstFundedYear) firstFundedYear = year;
            lastFundedYear = year;
        }
    });

    // Handle 'future' funding specially
    const futureFunding = parseCurrency(row.funding_future);
    fundingYears['Future'] = futureFunding;
    totalFunding += futureFunding;

    // Use explicit total_cost if provided, otherwise use calculated sum
    const explicitTotalCost = parseCurrency(row.total_cost);
    let hasExplicitTotalCost = false;
    if (explicitTotalCost > 0) {
        totalFunding = explicitTotalCost;
        hasExplicitTotalCost = true;
    }
    
    // If only future funding, note that
    if (futureFunding > 0 && !lastFundedYear) {
        lastFundedYear = 'Future';
    }

    // Parse funding sources as array (comma-separated)
    const fundingSource = row.funding_source 
        ? row.funding_source.split(',').map(s => s.trim()).filter(s => s)
        : [];

    // Check for ongoing project (marked with * in date fields)
    const isOngoing = row.start_date === '*' || row.construction_start === '*' || row.end_date === '*';

    // Infer dates from funding years if not provided (and not ongoing)
    const inferredStartDate = inferDateFromFiscalYear(firstFundedYear, 'start');
    const inferredEndDate = inferDateFromFiscalYear(lastFundedYear, 'end');

    // Parse dates, treating * as null but flagging as ongoing
    const parseDate = (value, fallback) => {
        if (!value || value === '*') return fallback;
        return value;
    };

    // Default values for optional fields
    const defaultType = Object.keys(config.projectTypes || {})[0] || 'Other';
    const defaultStatus = (config.statusOptions || [])[0] || 'Planning';
    const defaultPriority = (config.priorityLevels || [])[2] || 'Medium';

    return {
        id: row.id || generateId(row.name),
        name: row.name.trim(),
        type: row.type || defaultType,
        status: row.status || defaultStatus,
        priority: row.priority || defaultPriority,
        description: row.description || null,
        locationName: row.location_name || null,
        lat: row.lat ? parseFloat(row.lat) : null,
        lng: row.lng ? parseFloat(row.lng) : null,
        hasLocation: !!(row.lat && row.lng),
        fundingYears,
        totalFunding,
        hasExplicitTotalCost,
        fundingSource,
        department: row.department || null,
        startDate: parseDate(row.start_date, inferredStartDate),
        constructionStart: parseDate(row.construction_start, null),
        endDate: parseDate(row.end_date, inferredEndDate),
        isOngoing,
        link: row.link || null
    };
}

/**
 * Generate a simple ID from a name
 * @param {string} name - Project name
 * @returns {string} Generated ID
 */
function generateId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Infer a date from a fiscal year string (e.g., "FY25" -> 2024-07-01 for start, 2025-06-30 for end)
 * @param {string} fiscalYear - Fiscal year string like "FY25" or "Future"
 * @param {string} type - 'start' or 'end'
 * @returns {string|null} ISO date string or null
 */
function inferDateFromFiscalYear(fiscalYear, type) {
    if (!fiscalYear || fiscalYear === 'Future') return null;
    
    // Extract year number from "FY25" format
    const match = fiscalYear.match(/FY(\d{2})/i);
    if (!match) return null;
    
    const shortYear = parseInt(match[1], 10);
    // Assume 20xx for years, FY25 = fiscal year ending June 2025
    const fullYear = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
    
    if (type === 'start') {
        // Fiscal year starts July 1 of previous calendar year
        return `${fullYear - 1}-07-01`;
    } else {
        // Fiscal year ends June 30
        return `${fullYear}-06-30`;
    }
}

/**
 * Get all projects
 * @returns {Array} All projects
 */
export function getProjects() {
    return projects;
}

/**
 * Get filtered projects
 * @returns {Array} Filtered projects
 */
export function getFilteredProjects() {
    return filteredProjects;
}

/**
 * Set filtered projects
 * @param {Array} newFiltered - New filtered projects array
 */
export function setFilteredProjects(newFiltered) {
    filteredProjects = newFiltered;
}

/**
 * Find a project by ID
 * @param {string} id - Project ID
 * @returns {Object|undefined} Project or undefined
 */
export function findProjectById(id) {
    return projects.find(p => p.id === id);
}

/**
 * Get the maximum total funding across all projects
 * @returns {number} Maximum funding amount
 */
export function getMaxFunding() {
    return Math.max(...projects.map(p => p.totalFunding));
}
