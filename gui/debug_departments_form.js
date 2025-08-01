const { chromium } = require('playwright');

async function debugDepartmentsForm() {
  console.log('🔍 Debugging Departments Form...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  const consoleErrors = [];
  const networkErrors = [];

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
      consoleErrors.push({
        message: msg.text(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Monitor network errors  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`🔴 Network Error: ${response.status()} ${response.url()}`);
      networkErrors.push({
        status: response.status(),
        url: response.url(),
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    // Navigate to the GUI
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' }).catch(e => {
      throw new Error(`Failed to navigate to localhost:3000. Make sure the GUI server is running: ${e.message}`);
    });

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Look for Departments button
    console.log('🔍 Looking for Departments button...');
    const departmentsButton = page.locator('button:has-text("Departments")').first();
    
    if (await departmentsButton.count() === 0) {
      throw new Error('Departments button not found on page');
    }

    // Click Departments
    console.log('🖱️ Clicking Departments button...');
    await departmentsButton.click();
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({ path: 'departments_debug_initial.png', fullPage: true });

    // Analyze form structure
    console.log('📋 Analyzing form structure...');
    
    // Check for form presence
    const formsCount = await page.locator('form').count();
    console.log(`Forms found: ${formsCount}`);

    // Check for inputs
    const codeInput = page.locator('input[id="code"]');
    const nameInput = page.locator('input[id="name"]');
    const descriptionInput = page.locator('textarea[id="description"]');
    const parentSelect = page.locator('[role="combobox"]').first(); // Parent department select
    const costCenterInput = page.locator('input[id="cost_center"]');
    const overtimeCheckbox = page.locator('input[id="overtime_allowed"]');
    const activeCheckbox = page.locator('input[id="is_active"]');

    console.log('📝 Form Fields Analysis:');
    console.log(`  - Code input: ${await codeInput.count() > 0 ? '✅' : '❌'}`);
    console.log(`  - Name input: ${await nameInput.count() > 0 ? '✅' : '❌'}`);
    console.log(`  - Description textarea: ${await descriptionInput.count() > 0 ? '✅' : '❌'}`);
    console.log(`  - Parent department select: ${await parentSelect.count() > 0 ? '✅' : '❌'}`);
    console.log(`  - Cost center input: ${await costCenterInput.count() > 0 ? '✅' : '❌'}`);
    console.log(`  - Overtime checkbox: ${await overtimeCheckbox.count() > 0 ? '✅' : '❌'}`);
    console.log(`  - Active checkbox: ${await activeCheckbox.count() > 0 ? '✅' : '❌'}`);

    // Check for TimeInput components
    const timeInputs = page.locator('[role="combobox"]').filter({ hasText: /AM|PM/ });
    console.log(`  - Time inputs: ${await timeInputs.count()}`);

    // Test form filling
    console.log('📝 Testing form filling...');
    
    if (await codeInput.count() > 0) {
      await codeInput.fill('TEST_DEPT_001');
      console.log('  - Code input filled ✅');
    }

    if (await nameInput.count() > 0) {
      await nameInput.fill('Test Department');
      console.log('  - Name input filled ✅');
    }

    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill('This is a test department for debugging');
      console.log('  - Description filled ✅');
    }

    if (await costCenterInput.count() > 0) {
      await costCenterInput.fill('CC-TEST-001');
      console.log('  - Cost center filled ✅');
    }

    // Take screenshot after filling
    await page.screenshot({ path: 'departments_debug_filled.png', fullPage: true });

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    const submitButtonCount = await submitButton.count();
    console.log(`Submit buttons found: ${submitButtonCount}`);

    if (submitButtonCount > 0) {
      const submitButtonText = await submitButton.textContent();
      console.log(`Submit button text: "${submitButtonText}"`);

      // Test validation first by submitting empty form
      console.log('🧪 Testing form validation...');
      await codeInput.fill('');
      await nameInput.fill('');
      
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check for validation errors
      const errorMessages = page.locator('.text-red-600, [class*="error"], .text-red-500');
      const errorCount = await errorMessages.count();
      console.log(`Validation errors found: ${errorCount}`);

      if (errorCount > 0) {
        for (let i = 0; i < Math.min(errorCount, 3); i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.log(`  - Error ${i + 1}: "${errorText}"`);
        }
      }

      // Fill form again for successful submission
      await codeInput.fill('TEST_DEPT_002');
      await nameInput.fill('Test Department 2');
      
      console.log('🚀 Attempting form submission...');
      await submitButton.click();
      await page.waitForTimeout(3000);

      // Check for success/error toasts
      const toasts = page.locator('[data-sonner-toast]');
      const toastCount = await toasts.count();
      
      if (toastCount > 0) {
        console.log(`Toast notifications: ${toastCount}`);
        for (let i = 0; i < toastCount; i++) {
          const toastText = await toasts.nth(i).textContent();
          console.log(`  - Toast ${i + 1}: "${toastText}"`);
        }
      }
    }

    // Check for departments list/table
    console.log('📊 Checking departments list...');
    const tables = page.locator('table');
    const tableCount = await tables.count();
    console.log(`Tables found: ${tableCount}`);

    if (tableCount > 0) {
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();
      console.log(`Department rows: ${rowCount}`);

      if (rowCount > 0) {
        // Test edit functionality
        console.log('🖊️ Testing edit functionality...');
        const editButton = page.locator('button').filter({ hasText: /edit/i }).first();
        
        if (await editButton.count() > 0) {
          await editButton.click();
          await page.waitForTimeout(1000);
          
          const formTitle = await page.locator('h2, h3').filter({ hasText: /edit/i }).textContent();
          console.log(`Edit form title: "${formTitle}"`);
        }
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'departments_debug_final.png', fullPage: true });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎯 DEPARTMENTS FORM DEBUG SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Forms found: ${formsCount}`);
    console.log(`✅ Submit buttons: ${submitButtonCount}`);
    console.log(`✅ Data tables: ${tableCount}`);
    console.log(`🔴 Console errors: ${consoleErrors.length}`);
    console.log(`🔴 Network errors: ${networkErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n🔴 Console Errors:');
      consoleErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message}`);
      });
    }

    if (networkErrors.length > 0) {
      console.log('\n🌐 Network Errors:');
      networkErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.status} - ${error.url}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    await page.screenshot({ path: 'departments_debug_error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
    console.log('👋 Browser closed');
  }
}

// Run the debug
debugDepartmentsForm().catch(error => {
  console.error('Debug execution failed:', error);
  process.exit(1);
});