const { chromium } = require('playwright');

async function debugMaintenanceTypesDom() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Debugging Maintenance Types DOM structure...');
    
    // Navigate to the maintenance types page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check if we need to navigate to maintenance types
    const maintenanceTypesButton = page.locator('text=Maintenance Types').first();
    if (await maintenanceTypesButton.isVisible()) {
      await maintenanceTypesButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to Maintenance Types');
    }

    // Wait for form
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Check console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Get all form inputs and their IDs
    console.log('\n🔍 Analyzing all form inputs...');
    const allInputs = await page.locator('input').all();
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      console.log(`Input ${i}: id="${id}", type="${type}", name="${name}"`);
    }

    // Check for the specific duration field
    console.log('\n🔍 Looking for duration field specifically...');
    const durationFieldByID = page.locator('input[id="typical_duration_hours"]');
    const durationFieldByName = page.locator('input[name="typical_duration_hours"]');
    const durationFieldByType = page.locator('input[type="number"]');
    
    console.log(`Duration field by ID visible: ${await durationFieldByID.isVisible().catch(() => false)}`);
    console.log(`Duration field by name visible: ${await durationFieldByName.isVisible().catch(() => false)}`);
    
    const numberInputs = await durationFieldByType.all();
    console.log(`Number inputs found: ${numberInputs.length}`);
    
    for (let i = 0; i < numberInputs.length; i++) {
      const input = numberInputs[i];
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Number input ${i}: id="${id}", placeholder="${placeholder}"`);
    }

    // Check all labels to see field structure
    console.log('\n🔍 Analyzing form labels...');
    const allLabels = await page.locator('label').all();
    for (let i = 0; i < allLabels.length; i++) {
      const label = allLabels[i];
      const htmlFor = await label.getAttribute('for');
      const text = await label.textContent();
      console.log(`Label ${i}: for="${htmlFor}", text="${text}"`);
    }

    // Take a screenshot of the form
    await page.screenshot({ path: 'maintenance_types_dom_debug.png', fullPage: true });
    console.log('📸 Screenshot taken: maintenance_types_dom_debug.png');

    // Try to get the form HTML
    const formHTML = await page.locator('form').innerHTML();
    console.log('\n🔍 Form HTML structure (first 1000 chars):');
    console.log(formHTML.substring(0, 1000));

    // Check for any React hydration issues
    await page.waitForTimeout(2000);
    console.log('\n🔍 Checking after hydration delay...');
    
    const durationFieldAfterDelay = page.locator('input[id="typical_duration_hours"]');
    console.log(`Duration field visible after delay: ${await durationFieldAfterDelay.isVisible().catch(() => false)}`);

    // Check console errors
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console errors found:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('\n✅ No console errors found');
    }

  } catch (error) {
    console.error('❌ Error during DOM debugging:', error);
    await page.screenshot({ path: 'maintenance_types_dom_debug_error.png', fullPage: true });
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

debugMaintenanceTypesDom().catch(console.error);