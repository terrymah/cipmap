/**
 * Lightweight Test Harness for CIP Map
 * A simple, dependency-free testing framework
 */

class TestHarness {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };

        // Bind methods so they can be destructured
        this.describe = this.describe.bind(this);
        this.it = this.it.bind(this);
        this.beforeEach = this.beforeEach.bind(this);
        this.afterEach = this.afterEach.bind(this);
    }

    /**
     * Define a test suite
     */
    describe(name, fn) {
        this.currentSuite = {
            name,
            tests: [],
            beforeEach: null,
            afterEach: null
        };
        fn();
        this.suites.push(this.currentSuite);
        this.currentSuite = null;
    }

    /**
     * Define a test case
     */
    it(name, fn) {
        if (!this.currentSuite) {
            throw new Error('it() must be called within describe()');
        }
        this.currentSuite.tests.push({ name, fn });
    }

    /**
     * Setup before each test
     */
    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = fn;
        }
    }

    /**
     * Cleanup after each test
     */
    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = fn;
        }
    }

    /**
     * Run all test suites
     */
    async run() {
        const container = document.getElementById('test-results');
        container.innerHTML = '';

        for (const suite of this.suites) {
            const suiteEl = document.createElement('div');
            suiteEl.className = 'test-suite';
            
            const suiteHeader = document.createElement('h2');
            suiteHeader.textContent = suite.name;
            suiteEl.appendChild(suiteHeader);

            for (const test of suite.tests) {
                const testEl = document.createElement('div');
                testEl.className = 'test-case';

                try {
                    if (suite.beforeEach) await suite.beforeEach();
                    await test.fn();
                    if (suite.afterEach) await suite.afterEach();

                    testEl.classList.add('passed');
                    testEl.innerHTML = `<span class="icon">✓</span> ${test.name}`;
                    this.results.passed++;
                } catch (error) {
                    testEl.classList.add('failed');
                    testEl.innerHTML = `
                        <span class="icon">✗</span> ${test.name}
                        <pre class="error-message">${error.message}\n${error.stack || ''}</pre>
                    `;
                    this.results.failed++;
                    this.results.errors.push({
                        suite: suite.name,
                        test: test.name,
                        error
                    });
                }

                suiteEl.appendChild(testEl);
            }

            container.appendChild(suiteEl);
        }

        this.renderSummary();
    }

    /**
     * Render test summary
     */
    renderSummary() {
        const summary = document.getElementById('test-summary');
        const total = this.results.passed + this.results.failed;
        const status = this.results.failed === 0 ? 'all-passed' : 'has-failures';
        
        summary.className = `test-summary ${status}`;
        summary.innerHTML = `
            <strong>${this.results.passed}</strong> passed, 
            <strong>${this.results.failed}</strong> failed 
            of <strong>${total}</strong> tests
        `;
    }
}

/**
 * Assertion library
 */
const assert = {
    /**
     * Assert that a value is truthy
     */
    ok(value, message = 'Expected value to be truthy') {
        if (!value) {
            throw new Error(message);
        }
    },

    /**
     * Assert strict equality
     */
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    },

    /**
     * Assert deep equality for objects/arrays
     */
    deepEqual(actual, expected, message) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
        }
    },

    /**
     * Assert that a value is null or undefined
     */
    isNull(value, message = 'Expected value to be null or undefined') {
        if (value != null) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a value is not null or undefined
     */
    isNotNull(value, message = 'Expected value to not be null or undefined') {
        if (value == null) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a function throws an error
     */
    throws(fn, message = 'Expected function to throw') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message);
        }
    },

    /**
     * Assert that a value is of a specific type
     */
    isType(value, type, message) {
        const actualType = typeof value;
        if (actualType !== type) {
            throw new Error(message || `Expected type ${type}, got ${actualType}`);
        }
    },

    /**
     * Assert that an array contains a value
     */
    contains(array, value, message) {
        if (!array.includes(value)) {
            throw new Error(message || `Expected array to contain ${JSON.stringify(value)}`);
        }
    },

    /**
     * Assert that an array has a specific length
     */
    lengthOf(array, length, message) {
        if (array.length !== length) {
            throw new Error(message || `Expected length ${length}, got ${array.length}`);
        }
    },

    /**
     * Assert approximate equality for floating point
     */
    approximately(actual, expected, delta = 0.001, message) {
        if (Math.abs(actual - expected) > delta) {
            throw new Error(message || `Expected ${expected} ± ${delta}, got ${actual}`);
        }
    }
};

// Create global test harness instance
const testHarness = new TestHarness();

// Export for ES6 modules
export { testHarness, assert };
