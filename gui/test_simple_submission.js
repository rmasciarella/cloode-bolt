const { chromium } = require('playwright');

async function testSimpleSubmission() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console logs and network requests
  const logs = [];
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      logs.push(`Network Error: ${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Navigate to sequence resources
    await page.click('button:has-text("Resources")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Sequence Resources")');
    await page.waitForTimeout(1000);

    console.log('🔍 Testing simple form submission...');

    // Fill required fields only
    await page.fill('#sequence_id', 'SIMPLE_TEST');
    await page.fill('#name', 'Simple Test Resource');
    await page.fill('#setup_time_minutes', '5');
    await page.fill('#teardown_time_minutes', '5');
    await page.fill('#max_concurrent_jobs', '1');
    await page.fill('#priority', '1');

    await page.screenshot({ path: 'simple_form_filled.png' });

    // Submit the form
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for response and check for any error messages
    await page.waitForTimeout(5000);
    
    // Look for any toast messages
    const toastElements = await page.locator('[role="status"]').all();
    console.log(`Found ${toastElements.length} status messages`);
    
    for (let i = 0; i < toastElements.length; i++) {
      const toastText = await toastElements[i].textContent();
      console.log(`Status ${i + 1}: ${toastText}`);
    }

    // Also check for data-sonner-toast elements
    const sonnerToasts = await page.locator('[data-sonner-toast]').all();
    console.log(`Found ${sonnerToasts.length} sonner toasts`);
    
    for (let i = 0; i < sonnerToasts.length; i++) {
      const toastText = await sonnerToasts[i].textContent();
      console.log(`Sonner Toast ${i + 1}: ${toastText}`);
    }

    await page.screenshot({ path: 'simple_form_submitted.png' });

  } catch (error) {
    console.error('❌ Error during simple submission test:', error);
    await page.screenshot({ path: 'simple_submission_error.png' });
  } finally {
    console.log('\n📋 Console logs during test:');
    logs.forEach(log => console.log(log));
    await browser.close();
  }
}

testSimpleSubmission();