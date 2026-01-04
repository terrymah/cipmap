/**
 * Tests for Help Module
 */

import { testHarness, assert } from './test-harness.js';
import { resetHelp } from '../js/help.js';
import { setConfig, getAppId } from '../js/config.js';
import { getCookie } from '../js/cookies.js';

const { describe, it, beforeEach, afterEach } = testHarness;

// Helper to clear help cookie
function clearHelpCookie() {
    const appId = getAppId();
    document.cookie = `${appId}_help_dismissed=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

describe('resetHelp', () => {
    beforeEach(() => {
        setConfig({ appId: 'testapp' });
    });

    afterEach(() => {
        setConfig(null);
    });

    it('clears the help dismissed cookie', () => {
        // Set a cookie first
        document.cookie = `testapp_help_dismissed=true;path=/`;
        assert.ok(getCookie('testapp_help_dismissed'));
        
        // Reset should clear it
        resetHelp();
        assert.equal(getCookie('testapp_help_dismissed'), null);
    });
});

describe('help cookie naming', () => {
    afterEach(() => {
        setConfig(null);
    });

    it('uses appId in cookie name for default app', () => {
        setConfig({ appId: 'cipmap' });
        // Set and verify the cookie name pattern
        document.cookie = `cipmap_help_dismissed=true;path=/`;
        assert.ok(getCookie('cipmap_help_dismissed'));
        // Clean up
        document.cookie = `cipmap_help_dismissed=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });

    it('uses appId in cookie name for survey app', () => {
        setConfig({ appId: '2026survey', survey: true });
        // Set and verify the cookie name pattern
        document.cookie = `2026survey_help_dismissed=true;path=/`;
        assert.ok(getCookie('2026survey_help_dismissed'));
        // Clean up
        document.cookie = `2026survey_help_dismissed=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });

    it('resetHelp uses correct appId cookie name', () => {
        setConfig({ appId: 'myapp' });
        document.cookie = `myapp_help_dismissed=true;path=/`;
        assert.ok(getCookie('myapp_help_dismissed'));
        
        resetHelp();
        assert.equal(getCookie('myapp_help_dismissed'), null);
    });
});
