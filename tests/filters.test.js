/**
 * Tests for filters.js
 */

import { testHarness, assert } from './test-harness.js';
import { matchesFilters } from '../js/filters.js';
import { sampleConfig, sampleProjects } from './fixtures.js';

const { describe, it } = testHarness;

// Helper to create empty filter criteria
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

describe('matchesFilters - search', () => {
    it('matches project name (case insensitive)', () => {
        const filters = { ...emptyFilters(), search: 'main street' };
        const project = sampleProjects[0]; // Main Street Improvement
        
        assert.equal(matchesFilters(project, filters, sampleConfig), true);
    });

    it('matches project description', () => {
        const filters = { ...emptyFilters(), search: 'widening' };
        const project = sampleProjects[0];
        
        assert.equal(matchesFilters(project, filters, sampleConfig), true);
    });

    it('matches location name', () => {
        const filters = { ...emptyFilters(), search: 'downtown' };
        const project = sampleProjects[0];
        
        assert.equal(matchesFilters(project, filters, sampleConfig), true);
    });

    it('does not match unrelated search term', () => {
        const filters = { ...emptyFilters(), search: 'xyz123' };
        const project = sampleProjects[0];
        
        assert.equal(matchesFilters(project, filters, sampleConfig), false);
    });

    it('empty search matches all', () => {
        const filters = emptyFilters();
        
        sampleProjects.forEach(project => {
            assert.equal(matchesFilters(project, filters, sampleConfig), true);
        });
    });
});

describe('matchesFilters - type filter', () => {
    it('matches when type is in filter list', () => {
        const filters = { ...emptyFilters(), types: ['Transportation'] };
        const project = sampleProjects[0]; // Transportation type
        
        assert.equal(matchesFilters(project, filters, sampleConfig), true);
    });

    it('does not match when type is not in filter list', () => {
        const filters = { ...emptyFilters(), types: ['Parks'] };
        const project = sampleProjects[0]; // Transportation type
        
        assert.equal(matchesFilters(project, filters, sampleConfig), false);
    });

    it('matches with multiple types selected', () => {
        const filters = { ...emptyFilters(), types: ['Transportation', 'Parks'] };
        
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true); // Transportation
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), true); // Parks
        assert.equal(matchesFilters(sampleProjects[2], filters, sampleConfig), false); // Water
    });

    it('empty type filter matches all', () => {
        const filters = emptyFilters();
        
        sampleProjects.forEach(project => {
            assert.equal(matchesFilters(project, filters, sampleConfig), true);
        });
    });
});

describe('matchesFilters - status filter', () => {
    it('matches when status is in filter list', () => {
        const filters = { ...emptyFilters(), statuses: ['Design'] };
        const project = sampleProjects[0]; // Design status
        
        assert.equal(matchesFilters(project, filters, sampleConfig), true);
    });

    it('does not match when status is not in filter list', () => {
        const filters = { ...emptyFilters(), statuses: ['Completed'] };
        const project = sampleProjects[0]; // Design status
        
        assert.equal(matchesFilters(project, filters, sampleConfig), false);
    });

    it('matches with multiple statuses selected', () => {
        const filters = { ...emptyFilters(), statuses: ['Planning', 'Design'] };
        
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true); // Design
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), true); // Planning
        assert.equal(matchesFilters(sampleProjects[2], filters, sampleConfig), false); // Under Construction
    });
});

describe('matchesFilters - priority filter', () => {
    it('matches when priority is in filter list', () => {
        const filters = { ...emptyFilters(), priorities: ['High'] };
        
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true); // High
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), false); // Medium
    });

    it('matches multiple priorities', () => {
        const filters = { ...emptyFilters(), priorities: ['High', 'Medium'] };
        
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true); // High
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), true); // Medium
        assert.equal(matchesFilters(sampleProjects[3], filters, sampleConfig), false); // Low
    });
});

describe('matchesFilters - funding year range', () => {
    it('matches project with funding in range', () => {
        const filters = { ...emptyFilters(), fundingYearRange: { min: 2025, max: 2025 } };
        
        // proj-001 has FY25 funding
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match project without funding in range', () => {
        const filters = { ...emptyFilters(), fundingYearRange: { min: 2025, max: 2025 } };
        
        // proj-002 has no FY25 funding (starts FY26)
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), false);
    });

    it('matches project with funding across range', () => {
        const filters = { ...emptyFilters(), fundingYearRange: { min: 2026, max: 2028 } };
        
        // proj-002 has funding in FY26, FY27, FY28
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), true);
    });

    it('allows zero-funding projects through', () => {
        const filters = { ...emptyFilters(), fundingYearRange: { min: 2025, max: 2025 } };
        
        // proj-004 has zero total funding - should pass through
        assert.equal(matchesFilters(sampleProjects[3], filters, sampleConfig), true);
    });
});

describe('matchesFilters - timeline range', () => {
    it('matches project within timeline range', () => {
        const filters = { ...emptyFilters(), timelineRange: { min: 2025, max: 2027 } };
        
        // proj-001: 2025-03-01 to 2026-12-31
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('matches project that overlaps timeline range', () => {
        const filters = { ...emptyFilters(), timelineRange: { min: 2026, max: 2026 } };
        
        // proj-001: 2025 to 2026 - overlaps
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), true);
    });

    it('does not match project entirely outside range', () => {
        const filters = { ...emptyFilters(), timelineRange: { min: 2030, max: 2035 } };
        
        // proj-001: 2025 to 2026 - outside
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), false);
    });

    it('matches project that spans the range', () => {
        const filters = { ...emptyFilters(), timelineRange: { min: 2025, max: 2025 } };
        
        // proj-003: 2024-06-01 to 2027-03-31 - spans 2025
        assert.equal(matchesFilters(sampleProjects[2], filters, sampleConfig), true);
    });

    it('handles project with only start date', () => {
        // Create a project with only start date
        const projectOnlyStart = {
            ...sampleProjects[0],
            startDate: '2026-01-01',
            endDate: null
        };
        
        const filters1 = { ...emptyFilters(), timelineRange: { min: 2025, max: 2027 } };
        assert.equal(matchesFilters(projectOnlyStart, filters1, sampleConfig), true);
        
        const filters2 = { ...emptyFilters(), timelineRange: { min: 2020, max: 2024 } };
        assert.equal(matchesFilters(projectOnlyStart, filters2, sampleConfig), false);
    });

    it('handles project with only end date', () => {
        const projectOnlyEnd = {
            ...sampleProjects[0],
            startDate: null,
            endDate: '2025-12-31'
        };
        
        const filters1 = { ...emptyFilters(), timelineRange: { min: 2025, max: 2027 } };
        assert.equal(matchesFilters(projectOnlyEnd, filters1, sampleConfig), true);
        
        const filters2 = { ...emptyFilters(), timelineRange: { min: 2027, max: 2030 } };
        assert.equal(matchesFilters(projectOnlyEnd, filters2, sampleConfig), false);
    });
});

describe('matchesFilters - ongoing projects', () => {
    it('always matches ongoing projects regardless of timeline filter', () => {
        const ongoingProject = {
            ...sampleProjects[0],
            startDate: '2020-01-01',
            endDate: '2021-12-31',
            isOngoing: true
        };
        
        // This would normally be filtered out (2020-2021 vs 2030-2035 range)
        const filters = { ...emptyFilters(), timelineRange: { min: 2030, max: 2035 } };
        assert.equal(matchesFilters(ongoingProject, filters, sampleConfig), true);
    });

    it('still filters ongoing projects by other criteria', () => {
        const ongoingProject = {
            ...sampleProjects[0],
            isOngoing: true
        };
        
        // Wrong type filter should still exclude it
        const filters = { ...emptyFilters(), types: ['Parks'] };
        assert.equal(matchesFilters(ongoingProject, filters, sampleConfig), false);
    });

    it('non-ongoing projects are still filtered by timeline', () => {
        const normalProject = {
            ...sampleProjects[0],
            startDate: '2020-01-01',
            endDate: '2021-12-31',
            isOngoing: false
        };
        
        const filters = { ...emptyFilters(), timelineRange: { min: 2030, max: 2035 } };
        assert.equal(matchesFilters(normalProject, filters, sampleConfig), false);
    });
});

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

    it('filters correctly with all criteria active', () => {
        const filters = {
            search: '',
            types: ['Parks'],
            statuses: ['Planning'],
            priorities: ['Medium', 'Low'],
            fundingYearRange: { min: 2026, max: 2029 },
            timelineRange: { min: 2026, max: 2030 }
        };
        
        // proj-002 (Central Park) and proj-005 (Future Greenway) should match
        assert.equal(matchesFilters(sampleProjects[0], filters, sampleConfig), false); // Transportation - wrong type
        assert.equal(matchesFilters(sampleProjects[1], filters, sampleConfig), true);  // Parks, Planning, Medium - matches
        // Future Greenway: Parks, Planning, Low, has FY29 funding, timeline 2029-2032 overlaps 2026-2030
        assert.equal(matchesFilters(sampleProjects[4], filters, sampleConfig), true);
    });
});
