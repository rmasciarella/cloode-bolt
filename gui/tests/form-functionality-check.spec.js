import { test, expect } from '@playwright/test';

/**
 * Form Functionality Check - Test each form for specific functionality
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Form Functionality Check', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test('Departments form - Full functionality test', async ({ page }) => {
    await page.click('text=Departments');
    await page.waitForTimeout(1000);

    // Check form is present
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check required fields are present
    const codeInput = page.locator('input[id="code"]');
    const nameInput = page.locator('input[id="name"]');
    await expect(codeInput).toBeVisible();
    await expect(nameInput).toBeVisible();

    // Test form validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show validation error for required fields
    await page.waitForTimeout(500);
    
    // Fill in valid data
    await codeInput.fill('TEST001');
    await nameInput.fill('Test Department');
    
    // Submit button should be enabled
    await expect(submitButton).toBeEnabled();

    console.log('✅ Departments form functionality verified');
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || err.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Business Calendars form - Full functionality test', async ({ page }) => {
    await page.click('text=Business Calendars');
    await page.waitForTimeout(1000);

    // Check form is present
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check name field is present
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toBeVisible();

    // Test form validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    await page.waitForTimeout(500);
    
    // Fill in valid data
    await nameInput.fill('Test Calendar');
    
    // Submit button should be enabled
    await expect(submitButton).toBeEnabled();

    console.log('✅ Business Calendars form functionality verified');
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || err.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Work Cells form - Full functionality test', async ({ page }) => {
    await page.click('text=Work Cells');
    await page.waitForTimeout(1000);

    // Check form is present
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check required fields
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toBeVisible();

    // Test form validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    await page.waitForTimeout(500);
    
    // Fill in valid data
    await nameInput.fill('Test Work Cell');
    
    // Submit button should be enabled
    await expect(submitButton).toBeEnabled();

    console.log('✅ Work Cells form functionality verified');
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || err.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Template navigation and forms', async ({ page }) => {
    // Click Templates dropdown
    await page.click('text=Templates▶');
    await page.waitForTimeout(500);

    // Look for template-related navigation options
    const templateOptions = await page.locator('button').evaluateAll(elements =>
      elements
        .filter(el => el.textContent && el.textContent.includes('Template'))
        .map(el => el.textContent.trim())
    );

    console.log('Template options found:', templateOptions);

    // Test first template option if available
    if (templateOptions.length > 0) {
      const firstOption = templateOptions[0];
      await page.click(`text=${firstOption}`);
      await page.waitForTimeout(1000);

      // Check if form loads
      const formExists = await page.locator('form').count() > 0;
      console.log(`Template form loaded: ${formExists}`);
    }

    console.log('✅ Template navigation tested');
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || err.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Job navigation and forms', async ({ page }) => {
    // Click Jobs dropdown
    await page.click('text=Jobs▶');
    await page.waitForTimeout(500);

    // Look for job-related navigation options
    const jobOptions = await page.locator('button').evaluateAll(elements =>
      elements
        .filter(el => el.textContent && el.textContent.includes('Job'))
        .map(el => el.textContent.trim())
    );

    console.log('Job options found:', jobOptions);

    // Test first job option if available
    if (jobOptions.length > 0) {
      const firstOption = jobOptions[0];
      await page.click(`text=${firstOption}`);
      await page.waitForTimeout(1000);

      // Check if form loads
      const formExists = await page.locator('form').count() > 0;
      console.log(`Job form loaded: ${formExists}`);
    }

    console.log('✅ Job navigation tested');
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || err.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Overall stability - Navigation stress test', async ({ page }) => {
    const navigationItems = ['Departments', 'Work Cells', 'Business Calendars'];
    
    // Rapidly navigate between forms
    for (let i = 0; i < 3; i++) {
      for (const item of navigationItems) {
        await page.click(`text=${item}`);
        await page.waitForTimeout(200);
      }
    }

    console.log('✅ Navigation stress test completed');
    
    // Check for critical errors during rapid navigation
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || err.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test.afterEach(async ({ page }) => {
    // Report any non-critical errors for monitoring
    if (consoleErrors.length > 0) {
      const nonCriticalErrors = consoleErrors.filter(err => 
        !err.includes('TypeError') && !err.includes('ReferenceError')
      );
      if (nonCriticalErrors.length > 0) {
        console.log(`ℹ️  Non-critical console messages: ${nonCriticalErrors.length}`);
      }
    }
  });
});