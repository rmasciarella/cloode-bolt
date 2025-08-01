const { chromium } = require('playwright');

async function testSequenceResourcesForm() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔍 Testing Sequence Resources Form...');

  try {
    // Navigate to the GUI
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'sequence_resources_initial.png' });

    // First expand the Resources section
    const resourcesSection = page.locator('button:has-text("Resources")');
    if (await resourcesSection.isVisible()) {
      console.log('✅ Found Resources dropdown');
      await resourcesSection.click();
      await page.waitForTimeout(500);
    } else {
      console.log('❌ Resources dropdown not found');
    }

    // Look for navigation to sequence resources
    const sequenceResourcesSection = page.locator('button:has-text("Sequence Resources")');
    if (await sequenceResourcesSection.isVisible()) {
      console.log('✅ Found Sequence Resources section');
      await sequenceResourcesSection.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('❌ Sequence Resources section not found');
      const allButtons = await page.locator('button').allTextContents();
      console.log('Available buttons:', allButtons);
    }

    await page.screenshot({ path: 'sequence_resources_form.png' });

    // Check for form fields that should exist according to database schema
    const expectedFields = [
      'sequence_id',
      'name', 
      'description',
      'department_id',
      'setup_time_minutes',
      'teardown_time_minutes',
      'max_concurrent_jobs',
      'resource_type',
      'priority',
      'is_active'
    ];

    console.log('\n🔍 Checking for expected form fields...');
    const missingFields = [];
    const presentFields = [];

    for (const field of expectedFields) {
      const fieldElement = page.locator(`input[id="${field}"], select[id="${field}"], textarea[id="${field}"]`);
      if (await fieldElement.isVisible()) {
        presentFields.push(field);
        console.log(`✅ Field found: ${field}`);
      } else {
        missingFields.push(field);
        console.log(`❌ Field missing: ${field}`);
      }
    }

    // Test form submission with valid data
    console.log('\n🔍 Testing form submission...');
    
    if (presentFields.includes('sequence_id')) {
      await page.fill('#sequence_id', 'TEST_SEQ');
    }
    if (presentFields.includes('name')) {
      await page.fill('#name', 'Test Sequence Resource');
    }
    if (presentFields.includes('description')) {
      await page.fill('#description', 'Test description for debugging');
    }
    if (presentFields.includes('setup_time_minutes')) {
      await page.fill('#setup_time_minutes', '15');
    }
    if (presentFields.includes('teardown_time_minutes')) {
      await page.fill('#teardown_time_minutes', '10');
    }
    if (presentFields.includes('max_concurrent_jobs')) {
      await page.fill('#max_concurrent_jobs', '1');
    }
    if (presentFields.includes('priority')) {
      await page.fill('#priority', '1');
    }

    await page.screenshot({ path: 'sequence_resources_filled.png' });

    // Try to submit the form
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      console.log('✅ Submit button found');
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Check for success/error messages
      const toastMessages = await page.locator('[data-sonner-toast]').allTextContents();
      console.log('Toast messages after submission:', toastMessages);
      
      await page.screenshot({ path: 'sequence_resources_submitted.png' });
    } else {
      console.log('❌ Submit button not found');
    }

    // Check console for errors
    const logs = [];
    page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
    
    console.log('\n📋 Summary:');
    console.log(`Present fields: ${presentFields.join(', ')}`);
    console.log(`Missing fields: ${missingFields.join(', ')}`);
    
    if (logs.length > 0) {
      console.log('\n🔍 Console logs:');
      logs.forEach(log => console.log(log));
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
    await page.screenshot({ path: 'sequence_resources_error.png' });
  } finally {
    await browser.close();
  }
}

testSequenceResourcesForm();