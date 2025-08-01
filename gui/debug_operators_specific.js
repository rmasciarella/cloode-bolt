const { chromium } = require('playwright');

async function debugOperatorsForm() {
  console.log('🔍 Debug: Testing Operators Form Specifically...');
  
  const browser = await chromium.launch({ 
    headless: false,  // Keep browser open to see errors
    devtools: true    // Open devtools to see console errors
  });
  
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
        location: msg.location(),
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
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('📍 Taking initial screenshot...');
    await page.screenshot({ path: 'debug_operators_initial.png', fullPage: true });

    console.log('📍 Expanding Resources section...');
    await page.locator('button:has-text("Resources")').click({ force: true });
    await page.waitForTimeout(1000);

    console.log('📍 Taking screenshot after expanding Resources...');
    await page.screenshot({ path: 'debug_operators_resources_expanded.png', fullPage: true });

    console.log('📍 Clicking Operators button...');
    // Try to click the operators button and wait for any errors
    await page.locator('button:has-text("Operators")').click({ force: true });
    
    // Wait a bit to see if any errors occur
    await page.waitForTimeout(3000);

    console.log('📍 Taking screenshot after clicking Operators...');
    await page.screenshot({ path: 'debug_operators_after_click.png', fullPage: true });

    // Check page content
    const pageContent = await page.textContent('body');
    const has404 = pageContent.includes('404') || pageContent.includes('This page could not be found');
    const hasOperatorForm = pageContent.includes('Create New Operator') || pageContent.includes('Operator Name');
    
    console.log('📊 Page Analysis:');
    console.log(`  Has 404 error: ${has404}`);
    console.log(`  Has Operator Form: ${hasOperatorForm}`);
    console.log(`  Console errors: ${consoleErrors.length}`);
    console.log(`  Network errors: ${networkErrors.length}`);

    // Try to get page title and URL
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log(`  Page title: ${pageTitle}`);
    console.log(`  Page URL: ${pageUrl}`);

    // If there's a form, try to interact with it
    if (hasOperatorForm && !has404) {
      console.log('📝 Form detected, testing basic interaction...');
      
      const nameInput = page.locator('input[placeholder*="John Smith"], input#name');
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Operator');
        console.log('  ✅ Name input works');
      }
      
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        console.log('  ✅ Submit button found');
      }
    }

    // Log all errors found
    if (consoleErrors.length > 0) {
      console.log('\n🔴 CONSOLE ERRORS:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message}`);
        if (error.location) {
          console.log(`     Location: ${error.location.url}:${error.location.lineNumber}:${error.location.columnNumber}`);
        }
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 NETWORK ERRORS:');
      networkErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.status} - ${error.url}`);
      });
    }

  } catch (error) {
    console.error('❌ Critical test failure:', error.message);
    await page.screenshot({ path: 'debug_operators_critical_failure.png', fullPage: true });
    throw error;
  } finally {
    console.log('⏱️  Keeping browser open for manual inspection...');
    console.log('📍 Press Ctrl+C when done inspecting');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(60000); // Wait 1 minute
    await browser.close();
  }
}

// Run the test
debugOperatorsForm().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});