#!/usr/bin/env python3
"""
Test runner for CIP Map using Playwright
Runs the browser-based tests and captures the output
"""

import subprocess
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

# Change to project directory
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_server(port=8081):
    """Run a simple HTTP server"""
    handler = SimpleHTTPRequestHandler
    handler.log_message = lambda *args: None  # Suppress logs
    httpd = HTTPServer(('', port), handler)
    httpd.serve_forever()

def run_tests():
    """Run tests using Playwright"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Error: Playwright not installed. Run: pip3 install playwright")
        sys.exit(1)
    
    port = 8081
    
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()
    time.sleep(0.5)  # Give server time to start
    
    print("\n🧪 CIP Map Test Suite (Playwright)\n" + "=" * 50)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Collect console messages
        results = []
        def handle_console(msg):
            results.append(msg.text)
        page.on("console", handle_console)
        
        # Navigate to test page
        page.goto(f"http://localhost:{port}/tests/")
        
        # Wait for tests to complete (look for summary)
        try:
            page.wait_for_selector(".test-summary", timeout=10000)
        except:
            print("Timeout waiting for tests to complete")
        
        # Give a moment for final console messages
        time.sleep(0.5)
        
        # Get the summary text
        summary = page.query_selector(".test-summary")
        summary_text = summary.inner_text() if summary else "No summary found"
        
        # Get all test results
        suites = page.query_selector_all(".test-suite")
        
        for suite in suites:
            suite_name = suite.query_selector("h2").inner_text()
            print(f"\n📦 {suite_name}")
            
            tests = suite.query_selector_all(".test-case")
            for test in tests:
                is_passed = "passed" in test.get_attribute("class")
                test_name = test.inner_text().split("\n")[0].strip()
                # Remove leading checkmark or x
                if test_name.startswith("✓") or test_name.startswith("✗"):
                    test_name = test_name[1:].strip()
                
                if is_passed:
                    print(f"   ✅ {test_name}")
                else:
                    print(f"   ❌ {test_name}")
                    # Get error message if present
                    error = test.query_selector(".error-message")
                    if error:
                        error_text = error.inner_text()[:200]  # Truncate long errors
                        print(f"      {error_text}")
        
        print("\n" + "=" * 50)
        print(f"\n📊 {summary_text}\n")
        
        # Determine exit code
        has_failures = "failed" in summary_text and not summary_text.startswith("0 failed")
        
        browser.close()
        
        if "0 failed" in summary_text:
            print("✅ All tests passed!\n")
            return 0
        else:
            print("❌ Some tests failed\n")
            return 1

if __name__ == "__main__":
    sys.exit(run_tests())
