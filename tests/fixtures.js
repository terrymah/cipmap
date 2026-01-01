/**
 * Test Fixtures for CIP Map Tests
 * Sample data for testing
 */

/**
 * Sample configuration matching config.json structure
 */
export const sampleConfig = {
    title: "Test CIP Map",
    subtitle: "Test Projects",
    dataFile: "projects.csv",
    mapCenter: { lat: 35.7327, lng: -78.8503 },
    defaultZoom: 13,
    minZoom: 10,
    maxZoom: 18,
    projectTypes: {
        "Transportation": { color: "#3498db", icon: "road" },
        "Parks": { color: "#27ae60", icon: "tree" },
        "Water": { color: "#2980b9", icon: "tint" },
        "Facilities": { color: "#9b59b6", icon: "building" }
    },
    statusOptions: ["Not Started", "Ongoing", "Planning", "Design", "Bid/Award", "Aquisition", "Construction", "Completed"],
    priorityLevels: ["High", "Medium", "Low"],
    fundingYears: ["FY25", "FY26", "FY27", "FY28", "FY29", "Future"]
};

/**
 * Sample CSV row data (as would come from PapaParse)
 */
export const sampleCsvRows = [
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
        status: "Construction",
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
        status: "Completed",
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

/**
 * Parsed projects (as they would appear after parseProject)
 */
export const sampleProjects = [
    {
        id: "proj-001",
        name: "Main Street Improvement",
        type: "Transportation",
        status: "Design",
        priority: "High",
        description: "Widening and resurfacing of Main Street",
        locationName: "Main Street, Downtown",
        lat: 35.7350,
        lng: -78.8520,
        hasLocation: true,
        fundingYears: {
            "FY25": 500000,
            "FY26": 1500000,
            "FY27": 0,
            "FY28": 0,
            "FY29": 0,
            "Future": 0
        },
        totalFunding: 2000000,
        fundingSource: ["Municipal Bonds"],
        department: "Public Works",
        startDate: "2025-03-01",
        constructionStart: "2025-09-01",
        endDate: "2026-12-31",
        link: "https://example.com/project1"
    },
    {
        id: "proj-002",
        name: "Central Park Expansion",
        type: "Parks",
        status: "Planning",
        priority: "Medium",
        description: "Adding 10 acres to Central Park",
        locationName: "Central Park",
        lat: 35.7400,
        lng: -78.8450,
        hasLocation: true,
        fundingYears: {
            "FY25": 0,
            "FY26": 200000,
            "FY27": 800000,
            "FY28": 500000,
            "FY29": 0,
            "Future": 0
        },
        totalFunding: 1500000,
        fundingSource: ["Parks Bond"],
        department: "Parks & Recreation",
        startDate: "2026-01-01",
        constructionStart: null,
        endDate: "2028-06-30",
        link: null
    },
    {
        id: "proj-003",
        name: "Water Treatment Upgrade",
        type: "Water",
        status: "Construction",
        priority: "High",
        description: "Upgrading water treatment capacity",
        locationName: "Water Treatment Plant",
        lat: 35.7280,
        lng: -78.8600,
        hasLocation: true,
        fundingYears: {
            "FY25": 2000000,
            "FY26": 3000000,
            "FY27": 1000000,
            "FY28": 0,
            "FY29": 0,
            "Future": 0
        },
        totalFunding: 6000000,
        fundingSource: ["Utility Fees"],
        department: "Utilities",
        startDate: "2024-06-01",
        constructionStart: "2025-01-15",
        endDate: "2027-03-31",
        link: "https://example.com/water"
    },
    {
        id: "proj-004",
        name: "City Hall Renovation",
        type: "Facilities",
        status: "Completed",
        priority: "Low",
        description: "Interior renovation of City Hall",
        locationName: null,
        lat: null,
        lng: null,
        hasLocation: false,
        fundingYears: {
            "FY25": 0,
            "FY26": 0,
            "FY27": 0,
            "FY28": 0,
            "FY29": 0,
            "Future": 0
        },
        totalFunding: 0,
        fundingSource: ["General Fund"],
        department: "Facilities",
        startDate: "2023-01-01",
        constructionStart: "2023-03-01",
        endDate: "2024-01-15",
        link: null
    },
    {
        id: "proj-005",
        name: "Future Greenway",
        type: "Parks",
        status: "Planning",
        priority: "Low",
        description: "Long-term greenway project",
        locationName: "North District",
        lat: 35.7500,
        lng: -78.8400,
        hasLocation: true,
        fundingYears: {
            "FY25": 0,
            "FY26": 0,
            "FY27": 0,
            "FY28": 0,
            "FY29": 100000,
            "Future": 5000000
        },
        totalFunding: 5100000,
        fundingSource: ["Future Bond"],
        department: "Parks & Recreation",
        startDate: "2029-01-01",
        constructionStart: null,
        endDate: "2032-12-31",
        link: null
    }
];
