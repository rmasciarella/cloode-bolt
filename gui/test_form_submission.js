const { chromium } = require('playwright');

async function testFormSubmission() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Navigate to sequence resources
    await page.click('button:has-text("Resources")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Sequence Resources")');
    await page.waitForTimeout(1000);

    console.log('🔍 Testing form submission with valid data...');

    // Fill out the form
    await page.fill('#sequence_id', 'TEST_SEQUENCE');
    await page.fill('#name', 'Test Sequence Resource');
    await page.fill('#description', 'Test description for validation');
    
    // Select department using the combobox
    await page.click('[role="combobox"]:near(label:has-text("Department"))');
    await page.waitForTimeout(500);
    await page.click('text=Fiber Holder (FH)');
    
    // Select resource type using the combobox  
    await page.click('[role="combobox"]:near(label:has-text("Resource Type"))');
    await page.waitForTimeout(500);
    await page.click('text=Shared');
    
    await page.fill('#setup_time_minutes', '15');
    await page.fill('#teardown_time_minutes', '10');
    await page.fill('#max_concurrent_jobs', '2');
    await page.fill('#priority', '5');
    
    // is_active checkbox should be checked by default, so leave it
    
    await page.screenshot({ path: 'form_filled_complete.png' });

    // Submit the form
    await page.click('button[type="submit"]');
    console.log('✅ Form submitted');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for success/error messages
    const toastElements = await page.locator('[data-sonner-toast]').all();
    console.log(`Found ${toastElements.length} toast messages`);
    
    for (let i = 0; i < toastElements.length; i++) {
      const toastText = await toastElements[i].textContent();
      console.log(`Toast ${i + 1}: ${toastText}`);
    }

    await page.screenshot({ path: 'form_submitted_complete.png' });

    // Check if the new resource appears in the list
    const resourceRows = await page.locator('table tbody tr').count();
    console.log(`📊 Resources in table: ${resourceRows}`);

    if (resourceRows > 0) {
      console.log('✅ Resources found in table');
      // Try to find our test resource
      const testRow = page.locator('table tbody tr', { hasText: 'TEST_SEQUENCE' });
      if (await testRow.count() > 0) {
        console.log('✅ Test resource found in table');
        const rowText = await testRow.textContent();
        console.log(`Row data: ${rowText}`);
      } else {
        console.log('❌ Test resource not found in table');
      }
    }

  } catch (error) {
    console.error('❌ Error during form submission test:', error);
    await page.screenshot({ path: 'form_submission_error.png' });
  } finally {
    console.log('\n📋 Console logs during test:');
    logs.forEach(log => console.log(log));
    await browser.close();
  }
}

testFormSubmission();