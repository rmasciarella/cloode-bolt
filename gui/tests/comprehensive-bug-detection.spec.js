import { test, expect } from '@playwright/test';

/**
 * Comprehensive Bug Detection Test Suite
 * Tests each page/form for runtime errors, UI issues, and functionality problems
 */

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 30000;

// Forms to test with their navigation selectors
const FORMS_TO_TEST = [
  { name: 'Business Calendars', selector: 'text=Business Calendars' },
  { name: 'Departments', selector: 'text=Departments' },
  { name: 'Job Instances', selector: 'text=Job Instances' },
  { name: 'Job Tasks', selector: 'text=Job Tasks' },
  { name: 'Job Templates', selector: 'text=Job Templates' },
  { name: 'Machines', selector: 'text=Machines' },
  { name: 'Maintenance Types', selector: 'text=Maintenance Types' },
  { name: 'Operators', selector: 'text=Operators' },
  { name: 'Sequence Resources', selector: 'text=Sequence Resources' },
  { name: 'Setup Times', selector: 'text=Setup Times' },
  { name: 'Skills', selector: 'text=Skills' },
  { name: 'Template Precedences', selector: 'text=Template Precedences' },
  { name: 'Template Tasks', selector: 'text=Template Tasks' },
  { name: 'Work Cells', selector: 'text=Work Cells' }
];

test.describe('Comprehensive Bug Detection', () => {
  let consoleErrors = [];
  let networkErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    consoleErrors = [];
    networkErrors = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Listen for network failures
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Navigate to home page
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test('Home page loads without errors', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Solver/i);
    
    // Verify main navigation is present
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for critical console errors
    expect(consoleErrors.filter(err => 
      err.text.includes('TypeError') || 
      err.text.includes('ReferenceError') ||
      err.text.includes('Cannot read properties')
    )).toHaveLength(0);

    // Check for network errors
    expect(networkErrors.filter(err => err.status >= 500)).toHaveLength(0);
  });

  FORMS_TO_TEST.forEach(({ name, selector }) => {
    test(`${name} form - Bug detection`, async ({ page }) => {
      console.log(`Testing ${name} form...`);
      
      try {
        // Navigate to the form
        await page.click(selector, { timeout: TIMEOUT });
        await page.waitForLoadState('networkidle');

        // Wait for form to be visible
        await page.waitForSelector('form, [data-testid="form"], .space-y-6', { timeout: TIMEOUT });

        // Test 1: Check for JavaScript errors
        const criticalErrors = consoleErrors.filter(err => 
          err.text.includes('TypeError') || 
          err.text.includes('ReferenceError') ||
          err.text.includes('Cannot read properties') ||
          err.text.includes('null is not an object') ||
          err.text.includes('undefined is not a function')
        );
        
        if (criticalErrors.length > 0) {
          console.error(`${name} - Critical JavaScript errors:`, criticalErrors);
        }
        expect(criticalErrors).toHaveLength(0);

        // Test 2: Check for database/network errors
        const serverErrors = networkErrors.filter(err => err.status >= 500);
        if (serverErrors.length > 0) {
          console.error(`${name} - Server errors:`, serverErrors);
        }
        expect(serverErrors).toHaveLength(0);

        // Test 3: Check form structure
        const formElements = await page.locator('form, [data-testid="form"]').count();
        expect(formElements).toBeGreaterThan(0);

        // Test 4: Check for broken UI elements
        const loadingSpinners = await page.locator('.animate-spin').count();
        // Should not have loading spinners stuck after page load
        if (loadingSpinners > 0) {
          await page.waitForTimeout(2000); // Wait to see if spinners disappear
          const stillLoading = await page.locator('.animate-spin').count();
          expect(stillLoading).toBe(0);
        }

        // Test 5: Check for accessibility issues
        const requiredFields = await page.locator('input[required], select[required]').count();
        const labeledFields = await page.locator('input:has(+ label), label + input, label:has(+ input)').count();
        
        // Basic accessibility check: required fields should have labels
        if (requiredFields > 0) {
          expect(labeledFields).toBeGreaterThan(0);
        }

        // Test 6: Check form submission button exists and is not broken
        const submitButtons = await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Update"), button:has-text("Submit")').count();
        expect(submitButtons).toBeGreaterThan(0);

        // Test 7: Check for 404 errors on resource loading
        const notFoundErrors = networkErrors.filter(err => err.status === 404);
        if (notFoundErrors.length > 0) {
          console.warn(`${name} - 404 errors (may be expected):`, notFoundErrors);
        }

        // Test 8: Check for data loading issues
        const noDataMessages = await page.locator('text=/no.*found/i, text=/loading/i').count();
        // This is informational - we just log it
        if (noDataMessages > 0) {
          console.log(`${name} - Data loading status detected`);
        }

        console.log(`✅ ${name} form passed bug detection`);

      } catch (error) {
        console.error(`❌ ${name} form failed:`, error.message);
        
        // Take screenshot on failure
        await page.screenshot({ 
          path: `gui/test-results/bug-detection-${name.toLowerCase().replace(/\s+/g, '-')}-error.png`,
          fullPage: true 
        });
        
        throw error;
      }
    });
  });

  test('Critical functionality - Form submission validation', async ({ page }) => {
    // Test the simplest form (Departments) for submission validation
    await page.click('text=Departments');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation errors, not crash
      await page.waitForTimeout(1000);
      
      const criticalErrors = consoleErrors.filter(err => 
        err.text.includes('TypeError') || 
        err.text.includes('ReferenceError')
      );
      expect(criticalErrors).toHaveLength(0);
    }
  });

  test('Navigation stability test', async ({ page }) => {
    // Rapidly navigate through different forms to test stability
    const formsToTest = FORMS_TO_TEST.slice(0, 5); // Test first 5 for speed
    
    for (const { name, selector } of formsToTest) {
      await page.click(selector);
      await page.waitForTimeout(500); // Brief wait between navigation
      
      // Check no critical errors occurred during navigation
      const criticalErrors = consoleErrors.filter(err => 
        err.text.includes('TypeError') || 
        err.text.includes('ReferenceError')
      );
      
      if (criticalErrors.length > 0) {
        console.error(`Navigation to ${name} caused errors:`, criticalErrors);
        expect(criticalErrors).toHaveLength(0);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Report summary of errors found
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors.length);
      consoleErrors.forEach(err => console.log(`- ${err.text}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('Network errors detected:', networkErrors.length);
      networkErrors.forEach(err => console.log(`- ${err.status} ${err.url}`));
    }
  });
});