/**
 * Tests for utils.js
 */

import { testHarness, assert } from './test-harness.js';
import { formatCurrency, formatDate, isPastDate } from '../js/utils.js';

const { describe, it } = testHarness;

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
        assert.equal(formatCurrency(1050000), '$1.1M'); // rounds
    });

    it('handles zero', () => {
        assert.equal(formatCurrency(0), '$0');
    });
});

describe('formatDate', () => {
    it('formats dates in human-readable format', () => {
        const result = formatDate('2025-03-15');
        assert.ok(result.includes('Mar'), 'Should include month abbreviation');
        // Note: day might be 14 or 15 depending on timezone
        assert.ok(result.includes('14') || result.includes('15'), 'Should include day');
        assert.ok(result.includes('2025'), 'Should include year');
    });

    it('handles different date formats', () => {
        const result = formatDate('2026-12-31');
        assert.ok(result.includes('Dec'), 'Should parse Dec correctly');
        // Note: day might be 30 or 31 depending on timezone
        assert.ok(result.includes('30') || result.includes('31'), 'Should include day 30 or 31');
    });

    it('returns empty string for null/undefined', () => {
        assert.equal(formatDate(null), '');
        assert.equal(formatDate(undefined), '');
        assert.equal(formatDate(''), '');
    });
});

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
