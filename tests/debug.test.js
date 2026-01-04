/**
 * Tests for Debug Module
 */

import { testHarness, assert } from './test-harness.js';
import { initDebugMode, isDebugMode, showApiError, debugLog, setDebugMode } from '../js/debug.js';

const { describe, it, beforeEach, afterEach } = testHarness;

describe('setDebugMode', () => {
    afterEach(() => {
        setDebugMode(false);
    });

    it('enables debug mode when true', () => {
        setDebugMode(true);
        assert.ok(isDebugMode());
    });

    it('disables debug mode when false', () => {
        setDebugMode(true);
        setDebugMode(false);
        assert.ok(!isDebugMode());
    });

    it('adds debug-mode class to body when enabled', () => {
        setDebugMode(true);
        assert.ok(document.body.classList.contains('debug-mode'));
    });

    it('removes debug-mode class from body when disabled', () => {
        setDebugMode(true);
        setDebugMode(false);
        assert.ok(!document.body.classList.contains('debug-mode'));
    });
});

describe('isDebugMode', () => {
    afterEach(() => {
        setDebugMode(false);
    });

    it('returns false when debug mode is off', () => {
        setDebugMode(false);
        assert.ok(!isDebugMode());
    });

    it('returns true when debug mode is on', () => {
        setDebugMode(true);
        assert.ok(isDebugMode());
    });
});

describe('showApiError', () => {
    let alertCalled = false;
    let alertMessage = '';
    const originalAlert = window.alert;

    beforeEach(() => {
        alertCalled = false;
        alertMessage = '';
        window.alert = (msg) => {
            alertCalled = true;
            alertMessage = msg;
        };
    });

    afterEach(() => {
        window.alert = originalAlert;
        setDebugMode(false);
    });

    it('does not show alert when debug mode is off', () => {
        setDebugMode(false);
        showApiError('/api/test', new Error('Test error'));
        assert.ok(!alertCalled);
    });

    it('shows alert when debug mode is on', () => {
        setDebugMode(true);
        showApiError('/api/test', new Error('Test error'));
        assert.ok(alertCalled);
    });

    it('includes endpoint in error message', () => {
        setDebugMode(true);
        showApiError('/api/users', new Error('Network failed'));
        assert.ok(alertMessage.includes('/api/users'));
    });

    it('includes error message from Error object', () => {
        setDebugMode(true);
        showApiError('/api/test', new Error('Connection refused'));
        assert.ok(alertMessage.includes('Connection refused'));
    });

    it('handles string error', () => {
        setDebugMode(true);
        showApiError('/api/test', 'String error message');
        assert.ok(alertMessage.includes('String error message'));
    });
});

describe('debugLog', () => {
    let consoleLogs = [];
    const originalConsoleLog = console.log;

    beforeEach(() => {
        consoleLogs = [];
        console.log = (...args) => {
            consoleLogs.push(args);
        };
    });

    afterEach(() => {
        console.log = originalConsoleLog;
        setDebugMode(false);
    });

    it('does not log when debug mode is off', () => {
        setDebugMode(false);
        debugLog('test message');
        const testLogs = consoleLogs.filter(log => 
            log.some(arg => typeof arg === 'string' && arg.includes('test message'))
        );
        assert.equal(testLogs.length, 0);
    });

    it('logs when debug mode is on', () => {
        setDebugMode(true);
        debugLog('debug test message');
        assert.ok(consoleLogs.length > 0);
    });

    it('prefixes log with [Debug]', () => {
        setDebugMode(true);
        debugLog('prefixed message');
        assert.equal(consoleLogs[0][0], '[Debug]');
    });
});
