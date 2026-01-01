/**
 * Node.js Test Runner for CIP Map
 * Runs tests in Node.js environment so output is visible in terminal
 */

// Simple test harness for Node.js
class TestHarness {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
        this.results = { passed: 0, failed: 0, errors: [] };
        
        this.describe = this.describe.bind(this);
        this.it = this.it.bind(this);
    }

    describe(name, fn) {
        this.currentSuite = { name, tests: [] };
        fn();
        this.suites.push(this.currentSuite);
        this.currentSuite = null;
    }

    it(name, fn) {
        this.currentSuite.tests.push({ name, fn });
    }

    async run() {
        console.log('\n🧪 CIP Map Test Suite\n' + '='.repeat(50) + '\n');

        for (const suite of this.suites) {
            console.log(`\n📦 ${suite.name}`);
            
            for (const test of suite.tests) {
                try {
                    await test.fn();
                    console.log(`   ✅ ${test.name}`);
                    this.results.passed++;
                } catch (error) {
                    console.log(`   ❌ ${test.name}`);
                    console.log(`      Error: ${error.message}`);
                    this.results.failed++;
                    this.results.errors.push({ suite: suite.name, test: test.name, error });
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`\n📊 Results: ${this.results.passed} passed, ${this.results.failed} failed\n`);
        
        if (this.results.failed > 0) {
            console.log('❌ FAILURES:\n');
            for (const { suite, test, error } of this.results.errors) {
                console.log(`  ${suite} > ${test}`);
                console.log(`    ${error.message}\n`);
            }
            process.exit(1);
        } else {
            console.log('✅ All tests passed!\n');
            process.exit(0);
        }
    }
}

// Assertion library
const assert = {
    ok(value, message = 'Expected value to be truthy') {
        if (!value) throw new Error(message);
    },
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    },
    deepEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    },
    isNull(value, message = 'Expected value to be null') {
        if (value != null) throw new Error(message);
    },
    isNotNull(value, message = 'Expected value to not be null') {
        if (value == null) throw new Error(message);
    },
    isType(value, type, message) {
        if (typeof value !== type) {
            throw new Error(message || `Expected type ${type}, got ${typeof value}`);
        }
    },
    approximately(actual, expected, delta = 0.001, message) {
        if (Math.abs(actual - expected) > delta) {
            throw new Error(message || `Expected ${expected} ± ${delta}, got ${actual}`);
        }
    },
    lengthOf(array, length, message) {
        if (array.length !== length) {
            throw new Error(message || `Expected length ${length}, got ${array.length}`);
        }
    }
};

const harness = new TestHarness();
const { describe, it } = harness;

// ============================================
// UTILITY FUNCTIONS (copied for Node.js)
// ============================================

function formatCurrency(amount) {
    if (amount >= 1000000) {
        return '$' + (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return '$' + (amount / 1000).toFixed(0) + 'K';
    }
    return '$' + amount.toLocaleString();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function isPastDate(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

// ============================================
// DATA PARSING (copied for Node.js)
// ============================================

function generateId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function inferDateFromFiscalYear(fiscalYear, type) {
    if (!fiscalYear || fiscalYear === 'Future') return null;
    
    const match = fiscalYear.match(/FY(\d{2})/i);
    if (!match) return null;
    
    const shortYear = parseInt(match[1], 10);
    const fullYear = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
    
    if (type === 'start') {
        return `${fullYear - 1}-07-01`;
    } else {
        return `${fullYear}-06-30`;
    }
}

function parseCurrency(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function parseProject(row, config) {
    if (!row.name || !row.name.trim()) {
        return null;
    }

    const fundingYears = {};
    let totalFunding = 0;
    let firstFundedYear = null;
    let lastFundedYear = null;
    
    config.fundingYears.forEach(year => {
        if (year === 'Future') return;
        const key = `funding_${year.toLowerCase().replace('/', '')}`;
        const value = parseCurrency(row[key]);
        fundingYears[year] = value;
        totalFunding += value;
        
        if (value > 0) {
            if (!firstFundedYear) firstFundedYear = year;
            lastFundedYear = year;
        }
    });

    const futureFunding = parseCurrency(row.funding_future);
    fundingYears['Future'] = futureFunding;
    totalFunding += futureFunding;
    
    if (futureFunding > 0 && !lastFundedYear) {
        lastFundedYear = 'Future';
    }

    const fundingSource = row.funding_source 
        ? row.funding_source.split(',').map(s => s.trim()).filter(s => s)
        : [];

    // Check for ongoing project (marked with * in date fields)
    const isOngoing = row.start_date === '*' || row.construction_start === '*' || row.end_date === '*';

    const inferredStartDate = inferDateFromFiscalYear(firstFundedYear, 'start');
    const inferredEndDate = inferDateFromFiscalYear(lastFundedYear, 'end');

    // Parse dates, treating * as null but flagging as ongoing
    const parseDate = (value, fallback) => {
        if (!value || value === '*') return fallback;
        return value;
    };

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
        fundingSource,
        department: row.department || null,
        startDate: parseDate(row.start_date, inferredStartDate),
        constructionStart: parseDate(row.construction_start, null),
        endDate: parseDate(row.end_date, inferredEndDate),
        isOngoing,
        link: row.link || null
    };
}

// ============================================
// FILTER LOGIC (copied for Node.js)
// ============================================

function matchesFilters(project, filterCriteria, config) {
    if (filterCriteria.search) {
        const searchStr = filterCriteria.search.toLowerCase();
        const matchesSearch = 
            project.name.toLowerCase().includes(searchStr) ||
            project.description.toLowerCase().includes(searchStr) ||
            (project.locationName && project.locationName.toLowerCase().includes(searchStr));
        if (!matchesSearch) return false;
    }

    if (filterCriteria.types.length > 0 && !filterCriteria.types.includes(project.type)) {
        return false;
    }

    if (filterCriteria.statuses.length > 0 && !filterCriteria.statuses.includes(project.status)) {
        return false;
    }

    if (filterCriteria.priorities.length > 0 && !filterCriteria.priorities.includes(project.priority)) {
        return false;
    }

    if (filterCriteria.fundingYearRange) {
        const { min, max } = filterCriteria.fundingYearRange;
        const hasFundingInRange = config.fundingYears.some(fy => {
            if (fy === 'Future') {
                // Future is included when max is at the "Future" position (9999)
                return max >= 9999 && (project.fundingYears['Future'] || 0) > 0;
            }
            const match = fy.match(/\d+/);
            if (!match) return false;
            const year = parseInt(match[0]) + 2000;
            return year >= min && year <= max && (project.fundingYears[fy] || 0) > 0;
        });
        if (!hasFundingInRange && project.totalFunding > 0) return false;
    }

    if (filterCriteria.timelineRange && !project.isOngoing) {
        const { min, max } = filterCriteria.timelineRange;
        const projectStart = project.startDate ? new Date(project.startDate).getFullYear() : null;
        const projectEnd = project.endDate ? new Date(project.endDate).getFullYear() : null;
        
        if (projectStart && projectEnd) {
            if (projectEnd < min || projectStart > max) return false;
        } else if (projectStart) {
            if (projectStart > max) return false;
        } else if (projectEnd) {
            if (projectEnd < min) return false;
        }
    }

    return true;
}

// ============================================
// TEST FIXTURES
// ============================================

const sampleConfig = {
    title: "Test CIP Map",
    fundingYears: ["FY25", "FY26", "FY27", "FY28", "FY29", "Future"],
    projectTypes: {
        "Transportation": { color: "#3498db", icon: "road" },
        "Parks": { color: "#27ae60", icon: "tree" },
        "Water": { color: "#2980b9", icon: "tint" },
        "Facilities": { color: "#9b59b6", icon: "building" }
    },
    statusOptions: ["Planning", "Design", "Under Construction", "Complete"],
    priorityLevels: ["High", "Medium", "Low"]
};

const sampleCsvRows = [
    {
        id: "proj-001",
        name: "Main Street Improvement",
        type: "Transportation",
        status: "Design",
        priority: "High",
        description: "Widening and resurfacing of Main Street",
        location_name: "Main Street, Downtown",
        lat: "35.7350",
        lng: "-78.8520",
        funding_fy25: "500000",
        funding_fy26: "1500000",
        funding_fy27: "0",
        funding_fy28: "0",
        funding_fy29: "0",
        funding_future: "0",
        funding_source: "Municipal Bonds",
        department: "Public Works",
        start_date: "2025-03-01",
        construction_start: "2025-09-01",
        end_date: "2026-12-31",
        link: "https://example.com/project1"
    },
    {
        id: "proj-002",
        name: "Central Park Expansion",
        type: "Parks",
        status: "Planning",
        priority: "Medium",
        description: "Adding 10 acres to Central Park",
        location_name: "Central Park",
        lat: "35.7400",
        lng: "-78.8450",
        funding_fy25: "0",
        funding_fy26: "200000",
        funding_fy27: "800000",
        funding_fy28: "500000",
        funding_fy29: "0",
        funding_future: "0",
        funding_source: "Parks Bond",
        department: "Parks & Recreation",
        start_date: "2026-01-01",
        construction_start: "",
        end_date: "2028-06-30",
        link: ""
    },
    {
        id: "proj-003",
        name: "Water Treatment Upgrade",
        type: "Water",
        status: "Under Construction",
        priority: "High",
        description: "Upgrading water treatment capacity",
        location_name: "Water Treatment Plant",
        lat: "35.7280",
        lng: "-78.8600",
        funding_fy25: "2000000",
        funding_fy26: "3000000",
        funding_fy27: "1000000",
        funding_fy28: "0",
        funding_fy29: "0",
        funding_future: "0",
        funding_source: "Utility Fees",
        department: "Utilities",
        start_date: "2024-06-01",
        construction_start: "2025-01-15",
        end_date: "2027-03-31",
        link: "https://example.com/water"
    },
    {
        id: "proj-004",
        name: "City Hall Renovation",
        type: "Facilities",
        status: "Complete",
        priority: "Low",
        description: "Interior renovation of City Hall",
        location_name: "",
        lat: "",
        lng: "",
        funding_fy25: "0",
        funding_fy26: "0",
        funding_fy27: "0",
        funding_fy28: "0",
        funding_fy29: "0",
        funding_future: "0",
        funding_source: "General Fund",
        department: "Facilities",
        start_date: "2023-01-01",
        construction_start: "2023-03-01",
        end_date: "2024-01-15",
        link: ""
    },
    {
        id: "proj-005",
        name: "Future Greenway",
        type: "Parks",
        status: "Planning",
        priority: "Low",
        description: "Long-term greenway project",
        location_name: "North District",
        lat: "35.7500",
        lng: "-78.8400",
        funding_fy25: "0",
        funding_fy26: "0",
        funding_fy27: "0",
        funding_fy28: "0",
        funding_fy29: "100000",
        funding_future: "5000000",
        funding_source: "Future Bond",
        department: "Parks & Recreation",
        start_date: "2029-01-01",
        construction_start: "",
        end_date: "2032-12-31",
        link: ""
    }
];

// Parse projects for use in tests
const sampleProjects = sampleCsvRows.map(row => parseProject(row, sampleConfig));

// Helper for empty filters
function emptyFilters() {
    return {
        search: '',
        types: [],
        statuses: [],
        priorities: [],
        fundingYearRange: null,
        timelineRange: null
    };
}

// ============================================
// TESTS: formatCurrency
// ============================================

describe('formatCurrency', () => {
    it('formats millions with M suffix', () => {
        assert.equal(formatCurrency(1000000), '$1.0M');
        assert.equal(formatCurrency(2500000), '$2.5M');
        assert.equal(formatCurrency(16000000), '$16.0M');
    });

    it('formats thousands with K suffix', () => {
        assert.equal(formatCurrency(1000), '$1K');
        assert.equal(formatCurrency(500000), '$500K');
        assert.equal(formatCurrency(999999), '$1000K');
    });

    it('formats small amounts with dollar sign', () => {
        assert.equal(formatCurrency(0), '$0');
        assert.equal(formatCurrency(500), '$500');
        assert.equal(formatCurrency(999), '$999');
    });

    it('handles decimal values in millions', () => {
        assert.equal(formatCurrency(1100000), '$1.1M');
        assert.equal(formatCurrency(1050000), '$1.1M');
    });
});

// ============================================
// TESTS: formatDate
// ============================================

describe('formatDate', () => {
    it('formats dates in human-readable format', () => {
        const result = formatDate('2025-03-15');
        assert.ok(result.includes('Mar'), 'Should include month');
        assert.ok(result.includes('15'), 'Should include day');
        assert.ok(result.includes('2025'), 'Should include year');
    });

    it('returns empty string for null/undefined', () => {
        assert.equal(formatDate(null), '');
        assert.equal(formatDate(undefined), '');
        assert.equal(formatDate(''), '');
    });
});

// ============================================
// TESTS: isPastDate
// ============================================

describe('isPastDate', () => {
    it('returns true for dates in the past', () => {
        assert.equal(isPastDate('2020-01-01'), true);
        assert.equal(isPastDate('2023-06-15'), true);
    });

    it('returns false for dates in the future', () => {
        assert.equal(isPastDate('2030-01-01'), false);
        assert.equal(isPastDate('2028-12-31'), false);
    });

    it('returns false for null/undefined', () => {
        assert.equal(isPastDate(null), false);
        assert.equal(isPastDate(undefined), false);
        assert.equal(isPastDate(''), false);
    });
});

// ============================================
// TESTS: parseProject
// ============================================

describe('parseProject', () => {
    it('parses basic project fields correctly', () => {
        const project = sampleProjects[0];
        assert.equal(project.id, 'proj-001');
        assert.equal(project.name, 'Main Street Improvement');
        assert.equal(project.type, 'Transportation');
        assert.equal(project.status, 'Design');
        assert.equal(project.priority, 'High');
    });

    it('parses location coordinates as numbers', () => {
        const project = sampleProjects[0];
        assert.isType(project.lat, 'number');
        assert.isType(project.lng, 'number');
        assert.approximately(project.lat, 35.7350, 0.0001);
        assert.approximately(project.lng, -78.8520, 0.0001);
        assert.equal(project.hasLocation, true);
    });

    it('handles missing location correctly', () => {
        const project = sampleProjects[3]; // City Hall - no location
        assert.isNull(project.lat);
        assert.isNull(project.lng);
        assert.equal(project.hasLocation, false);
    });

    it('calculates total funding correctly', () => {
        const project = sampleProjects[0]; // $500K + $1.5M = $2M
        assert.equal(project.totalFunding, 2000000);
    });

    it('parses individual funding years', () => {
        const project = sampleProjects[0];
        assert.equal(project.fundingYears['FY25'], 500000);
        assert.equal(project.fundingYears['FY26'], 1500000);
        assert.equal(project.fundingYears['FY27'], 0);
    });

    it('handles future funding', () => {
        const project = sampleProjects[4]; // Future Greenway
        assert.equal(project.fundingYears['Future'], 5000000);
        assert.equal(project.totalFunding, 5100000); // 100K FY29 + 5M Future
    });

    it('converts empty strings to null for optional fields', () => {
        const project = sampleProjects[1]; // Central Park
        assert.isNull(project.constructionStart);
        assert.isNull(project.link);
    });
});

// ============================================
// TESTS: matchesFilters - search
// ============================================

describe('matchesFilters - search', () => {
    it('matches project name (case insensitive)', () => {
        const filters = { ...emptyFilters(), search: 'main street' };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('matches project description', () => {
        const filters = { ...emptyFilters(), search: 'widening' };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('matches location name', () => {
        const filters = { ...emptyFilters(), search: 'downtown' };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match unrelated search term', () => {
        const filters = { ...emptyFilters(), search: 'xyz123' };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), false);
    });

    it('empty search matches all', () => {
        const filters = emptyFilters();
        sampleProjects.forEach(project => {
            assert.equal(matchesFilters(project, filters, sampleConfig), true);
        });
    });
});

// ============================================
// TESTS: matchesFilters - type filter
// ============================================

describe('matchesFilters - type filter', () => {
    it('matches when type is in filter list', () => {
        const filters = { ...emptyFilters(), types: ['Transportation'] };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match when type is not in filter list', () => {
        const filters = { ...emptyFilters(), types: ['Parks'] };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), false);
    });

    it('matches with multiple types selected', () => {
        const filters = { ...emptyFilters(), types: ['Transportation', 'Parks'] };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), true);
        assert.equal(matchesFilters(sampleProjects[2], filters, sampleConfig), false);
    });
});

// ============================================
// TESTS: matchesFilters - status filter
// ============================================

describe('matchesFilters - status filter', () => {
    it('matches when status is in filter list', () => {
        const filters = { ...emptyFilters(), statuses: ['Design'] };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match when status is not in filter list', () => {
        const filters = { ...emptyFilters(), statuses: ['Complete'] };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), false);
    });
});

// ============================================
// TESTS: matchesFilters - priority filter
// ============================================

describe('matchesFilters - priority filter', () => {
    it('matches when priority is in filter list', () => {
        const filters = { ...emptyFilters(), priorities: ['High'] };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), false);
    });
});

// ============================================
// TESTS: matchesFilters - funding year range
// ============================================

describe('matchesFilters - funding year range', () => {
    it('matches project with funding in range', () => {
        const filters = { ...emptyFilters(), fundingYearRange: { min: 2025, max: 2025 } };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match project without funding in range', () => {
        const filters = { ...emptyFilters(), fundingYearRange: { min: 2025, max: 2025 } };
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), false);
    });

    it('allows zero-funding projects through', () => {
        const filters = { ...emptyFilters(), fundingYearRange: { min: 2025, max: 2025 } };
        assert.equal(matchesFilters(sampleProjects[3], filters, sampleConfig), true);
    });
});

// ============================================
// TESTS: matchesFilters - timeline range
// ============================================

describe('matchesFilters - timeline range', () => {
    it('matches project within timeline range', () => {
        const filters = { ...emptyFilters(), timelineRange: { min: 2025, max: 2027 } };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('matches project that overlaps timeline range', () => {
        const filters = { ...emptyFilters(), timelineRange: { min: 2026, max: 2026 } };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match project entirely outside range', () => {
        const filters = { ...emptyFilters(), timelineRange: { min: 2030, max: 2035 } };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), false);
    });
});

// ============================================
// TESTS: matchesFilters - combined filters
// ============================================

describe('matchesFilters - combined filters', () => {
    it('matches when all criteria are met', () => {
        const filters = {
            search: 'main',
            types: ['Transportation'],
            statuses: ['Design'],
            priorities: ['High'],
            fundingYearRange: null,
            timelineRange: null
        };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match when any criterion fails', () => {
        const filters = {
            search: 'main',
            types: ['Parks'], // Wrong type
            statuses: ['Design'],
            priorities: ['High'],
            fundingYearRange: null,
            timelineRange: null
        };
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), false);
    });
});

// Run tests
harness.run();
