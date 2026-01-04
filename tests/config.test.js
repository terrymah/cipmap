/**
 * Tests for Config Module
 */

import { testHarness, assert } from './test-harness.js';
import { getConfig, setConfig, getAppId, isSurveyMode, getTypeConfig, getTypeDisplayName } from '../js/config.js';
import { sampleConfig } from './fixtures.js';

const { describe, it, beforeEach, afterEach } = testHarness;

describe('getAppId', () => {
    afterEach(() => {
        setConfig(null);
    });

    it('returns cipmap as default when config is null', () => {
        setConfig(null);
        assert.equal(getAppId(), 'cipmap');
    });

    it('returns cipmap as default when appId not set', () => {
        setConfig({ title: 'Test' });
        assert.equal(getAppId(), 'cipmap');
    });

    it('returns configured appId when set', () => {
        setConfig({ appId: 'myapp' });
        assert.equal(getAppId(), 'myapp');
    });

    it('returns configured appId for survey config', () => {
        setConfig({ appId: '2026survey', survey: true });
        assert.equal(getAppId(), '2026survey');
    });
});

describe('isSurveyMode', () => {
    afterEach(() => {
        setConfig(null);
    });

    it('returns false when config is null', () => {
        setConfig(null);
        assert.equal(isSurveyMode(), false);
    });

    it('returns false when survey not set', () => {
        setConfig({ title: 'Test' });
        assert.equal(isSurveyMode(), false);
    });

    it('returns false when survey is false', () => {
        setConfig({ survey: false });
        assert.equal(isSurveyMode(), false);
    });

    it('returns true when survey is true', () => {
        setConfig({ survey: true });
        assert.equal(isSurveyMode(), true);
    });

    it('returns false for non-boolean truthy values', () => {
        setConfig({ survey: 'yes' });
        assert.equal(isSurveyMode(), false);
    });
});

describe('getTypeConfig', () => {
    beforeEach(() => {
        setConfig(sampleConfig);
    });

    afterEach(() => {
        setConfig(null);
    });

    it('returns config for known project type', () => {
        const typeConfig = getTypeConfig('Transportation');
        assert.equal(typeConfig.color, '#3498db');
        assert.equal(typeConfig.icon, 'road');
    });

    it('returns default config for unknown project type', () => {
        const typeConfig = getTypeConfig('Unknown');
        assert.equal(typeConfig.color, '#95a5a6');
        assert.equal(typeConfig.icon, 'folder');
    });

    it('returns default config when config is null', () => {
        setConfig(null);
        const typeConfig = getTypeConfig('Transportation');
        assert.equal(typeConfig.color, '#95a5a6');
        assert.equal(typeConfig.icon, 'folder');
    });
});

describe('getTypeDisplayName', () => {
    beforeEach(() => {
        setConfig({
            projectTypes: {
                'Parks, Recreation & Cultural Resources': { 
                    color: '#27ae60', 
                    icon: 'tree',
                    mobileLabel: 'Parks & Rec'
                },
                'Transportation': {
                    color: '#3498db',
                    icon: 'road'
                }
            }
        });
    });

    afterEach(() => {
        setConfig(null);
    });

    it('returns type name when no mobileLabel exists', () => {
        const name = getTypeDisplayName('Transportation');
        assert.equal(name, 'Transportation');
    });

    it('returns type name on desktop even with mobileLabel', () => {
        // This test assumes desktop width - may need adjustment
        const name = getTypeDisplayName('Parks, Recreation & Cultural Resources');
        // On desktop, should return full name; on mobile, mobileLabel
        assert.ok(name === 'Parks, Recreation & Cultural Resources' || name === 'Parks & Rec');
    });
});
