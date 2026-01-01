/**
 * Tests for data.js
 */

import { testHarness, assert } from './test-harness.js';
import { parseProject } from '../js/data.js';
import { sampleConfig, sampleCsvRows } from './fixtures.js';

const { describe, it } = testHarness;

describe('parseProject', () => {
    it('parses basic project fields correctly', () => {
        const row = sampleCsvRows[0];
        const project = parseProject(row, sampleConfig);
        
        assert.equal(project.id, 'proj-001');
        assert.equal(project.name, 'Main Street Improvement');
        assert.equal(project.type, 'Transportation');
        assert.equal(project.status, 'Design');
        assert.equal(project.priority, 'High');
    });

    it('parses location coordinates as numbers', () => {
        const row = sampleCsvRows[0];
        const project = parseProject(row, sampleConfig);
        
        assert.equal(typeof project.lat, 'number');
        assert.equal(typeof project.lng, 'number');
        assert.approximately(project.lat, 35.7350, 0.0001);
        assert.approximately(project.lng, -78.8520, 0.0001);
        assert.equal(project.hasLocation, true);
    });

    it('handles missing location correctly', () => {
        const row = sampleCsvRows[3]; // City Hall Renovation - no location
        const project = parseProject(row, sampleConfig);
        
        assert.isNull(project.lat);
        assert.isNull(project.lng);
        assert.equal(project.hasLocation, false);
    });

    it('calculates total funding correctly', () => {
        const row = sampleCsvRows[0]; // $500K + $1.5M = $2M
        const project = parseProject(row, sampleConfig);
        
        assert.equal(project.totalFunding, 2000000);
    });

    it('parses individual funding years', () => {
        const row = sampleCsvRows[0];
        const project = parseProject(row, sampleConfig);
        
        assert.equal(project.fundingYears['FY25'], 500000);
        assert.equal(project.fundingYears['FY26'], 1500000);
        assert.equal(project.fundingYears['FY27'], 0);
    });

    it('handles future funding', () => {
        const row = sampleCsvRows[4]; // Future Greenway - has future funding
        const project = parseProject(row, sampleConfig);
        
        assert.equal(project.fundingYears['Future'], 5000000);
        assert.equal(project.totalFunding, 5100000); // 100K FY29 + 5M Future
    });

    it('uses explicit total_cost when provided', () => {
        const row = { ...sampleCsvRows[0], total_cost: '10000000' };
        const project = parseProject(row, sampleConfig);
        
        // Should use explicit total_cost instead of sum of funding columns
        assert.equal(project.totalFunding, 10000000);
        assert.equal(project.hasExplicitTotalCost, true);
    });

    it('falls back to calculated sum when total_cost is empty', () => {
        const row = { ...sampleCsvRows[0], total_cost: '' };
        const project = parseProject(row, sampleConfig);
        
        // Should use sum of funding columns (500K + 1.5M = 2M)
        assert.equal(project.totalFunding, 2000000);
        assert.equal(project.hasExplicitTotalCost, false);
    });

    it('converts empty strings to null for optional fields', () => {
        const row = sampleCsvRows[1]; // Central Park - missing constructionStart and link
        const project = parseProject(row, sampleConfig);
        
        assert.isNull(project.constructionStart);
        assert.isNull(project.link);
    });

    it('preserves valid dates', () => {
        const row = sampleCsvRows[0];
        const project = parseProject(row, sampleConfig);
        
        assert.equal(project.startDate, '2025-03-01');
        assert.equal(project.constructionStart, '2025-09-01');
        assert.equal(project.endDate, '2026-12-31');
    });

    it('preserves valid links', () => {
        const row = sampleCsvRows[0];
        const project = parseProject(row, sampleConfig);
        
        assert.equal(project.link, 'https://example.com/project1');
    });

    it('handles zero total funding', () => {
        const row = sampleCsvRows[3]; // City Hall - all zeros
        const project = parseProject(row, sampleConfig);
        
        assert.equal(project.totalFunding, 0);
    });
});

describe('parseProject - edge cases', () => {
    it('handles malformed numeric values', () => {
        const row = {
            ...sampleCsvRows[0],
            lat: 'invalid',
            lng: '',
            funding_fy25: 'not a number'
        };
        const project = parseProject(row, sampleConfig);
        
        // Should gracefully handle NaN
        assert.equal(project.fundingYears['FY25'], 0);
    });

    it('handles missing location_name', () => {
        const row = {
            ...sampleCsvRows[0],
            location_name: ''
        };
        const project = parseProject(row, sampleConfig);
        
        assert.isNull(project.locationName);
    });
});

describe('parseProject - defaults and inference', () => {
    it('returns null for rows without a name', () => {
        const row = { ...sampleCsvRows[0], name: '' };
        const project = parseProject(row, sampleConfig);
        assert.isNull(project);
    });

    it('returns null for rows with only whitespace name', () => {
        const row = { ...sampleCsvRows[0], name: '   ' };
        const project = parseProject(row, sampleConfig);
        assert.isNull(project);
    });

    it('generates an ID from name if missing', () => {
        const row = { ...sampleCsvRows[0], id: '' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.id, 'main-street-improvement');
    });

    it('uses default type when missing', () => {
        const row = { ...sampleCsvRows[0], type: '' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.type, 'Transportation'); // First in config
    });

    it('uses default status when missing', () => {
        const row = { ...sampleCsvRows[0], status: '' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.status, 'Not Started'); // First in config
    });

    it('uses default priority when missing', () => {
        const row = { ...sampleCsvRows[0], priority: '' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.priority, 'Low'); // Third (index 2) in test config
    });

    it('infers start date from first funded year', () => {
        const row = {
            name: 'Test Project',
            funding_fy26: '1000000', // First funded year is FY26
            funding_fy27: '500000'
        };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.startDate, '2025-07-01'); // FY26 starts July 2025
    });

    it('infers end date from last funded year', () => {
        const row = {
            name: 'Test Project',
            funding_fy26: '1000000',
            funding_fy28: '500000' // Last funded year is FY28
        };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.endDate, '2028-06-30'); // FY28 ends June 2028
    });

    it('uses explicit dates over inferred dates', () => {
        const row = {
            ...sampleCsvRows[0],
            start_date: '2025-03-01',
            end_date: '2026-12-31'
        };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.startDate, '2025-03-01');
        assert.equal(project.endDate, '2026-12-31');
    });

    it('returns null for inferred dates when only Future funding', () => {
        const row = {
            name: 'Future Only Project',
            funding_future: '1000000'
        };
        const project = parseProject(row, sampleConfig);
        assert.isNull(project.startDate);
        assert.isNull(project.endDate);
    });
});

describe('parseProject - funding sources', () => {
    it('parses single funding source as array', () => {
        const row = { ...sampleCsvRows[0], funding_source: 'Municipal Bonds' };
        const project = parseProject(row, sampleConfig);
        assert.equal(Array.isArray(project.fundingSource), true);
        assert.equal(project.fundingSource.length, 1);
        assert.equal(project.fundingSource[0], 'Municipal Bonds');
    });

    it('parses multiple comma-separated funding sources', () => {
        const row = { ...sampleCsvRows[0], funding_source: 'Bonds, Grants, General Fund' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.fundingSource.length, 3);
        assert.equal(project.fundingSource[0], 'Bonds');
        assert.equal(project.fundingSource[1], 'Grants');
        assert.equal(project.fundingSource[2], 'General Fund');
    });

    it('trims whitespace from funding sources', () => {
        const row = { ...sampleCsvRows[0], funding_source: '  Bonds  ,  Grants  ' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.fundingSource[0], 'Bonds');
        assert.equal(project.fundingSource[1], 'Grants');
    });

    it('returns empty array when no funding source', () => {
        const row = { ...sampleCsvRows[0], funding_source: '' };
        const project = parseProject(row, sampleConfig);
        assert.equal(Array.isArray(project.fundingSource), true);
        assert.equal(project.fundingSource.length, 0);
    });
});

describe('parseProject - ongoing projects', () => {
    it('marks project as ongoing when start_date is *', () => {
        const row = { ...sampleCsvRows[0], start_date: '*' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.isOngoing, true);
    });

    it('marks project as ongoing when end_date is *', () => {
        const row = { ...sampleCsvRows[0], end_date: '*' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.isOngoing, true);
    });

    it('marks project as ongoing when construction_start is *', () => {
        const row = { ...sampleCsvRows[0], construction_start: '*' };
        const project = parseProject(row, sampleConfig);
        assert.equal(project.isOngoing, true);
    });

    it('sets date fields to inferred values when * is used', () => {
        const row = { ...sampleCsvRows[0], start_date: '*', end_date: '*' };
        const project = parseProject(row, sampleConfig);
        // Should use inferred dates from funding years
        assert.equal(project.startDate, '2024-07-01'); // FY25 start
        assert.equal(project.endDate, '2026-06-30'); // FY26 end
    });

    it('is not ongoing for normal projects', () => {
        const row = sampleCsvRows[0];
        const project = parseProject(row, sampleConfig);
        assert.equal(project.isOngoing, false);
    });
});
