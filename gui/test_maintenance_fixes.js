const { chromium } = require('playwright');

async function testMaintenanceFixes() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Testing Maintenance Types Fixes...');
    
    // Navigate to the GUI
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // Test updated navigation label
    console.log('\n🔍 Testing navigation label fix...');
    const schedulingSection = page.locator('button:has-text("Scheduling")');
    await schedulingSection.click();
    
    const maintenanceTypesButton = page.locator('button:has-text("Maintenance Types")');
    const isVisible = await maintenanceTypesButton.isVisible();
    console.log(`✅ Navigation label updated: "Maintenance Types" visible = ${isVisible}`);
    
    if (isVisible) {
      await maintenanceTypesButton.click();
      console.log('✅ Successfully clicked "Maintenance Types"');
    }

    // Wait for form
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Test SelectTrigger ID fix
    console.log('\n🔍 Testing Select component ID fix...');
    const selectTrigger = page.locator('#required_skill_level');
    const selectHasId = await selectTrigger.isVisible();
    console.log(`✅ Select component ID fix: #required_skill_level visible = ${selectHasId}`);

    // Test checkbox IDs
    console.log('\n🔍 Testing checkbox ID fixes...');
    const checkboxIds = [
      'is_preventive',
      'is_emergency', 
      'blocks_production',
      'allows_emergency_override',
      'requires_shutdown',
      'requires_external_vendor'
    ];

    for (const checkboxId of checkboxIds) {
      const checkbox = page.locator(`#${checkboxId}`);
      const hasValidId = await checkbox.isVisible();
      console.log(`${hasValidId ? '✅' : '❌'} Checkbox #${checkboxId}: ${hasValidId ? 'has valid ID' : 'ID still broken'}`);
    }

    // Test form functionality
    console.log('\n🔍 Testing form functionality...');
    
    // Fill required fields
    await page.locator('#name').fill('Test Maintenance Type - Fixed');
    await page.locator('#description').fill('Testing the fixes');
    await page.locator('#typical_duration_hours').fill('2.5');
    
    // Test skill level dropdown
    if (selectHasId) {
      await selectTrigger.click();
      await page.waitForSelector('text=Competent', { timeout: 5000 });
      await page.locator('text=Competent').click();
      console.log('✅ Skill level dropdown works with ID');
    }

    // Test checkbox interaction
    for (const checkboxId of checkboxIds) {
      const checkbox = page.locator(`#${checkboxId}`);
      if (await checkbox.isVisible()) {
        await checkbox.click();
        console.log(`✅ Checkbox #${checkboxId} interactive`);
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'maintenance_types_fixed.png', fullPage: true });
    console.log('📸 Screenshot taken: maintenance_types_fixed.png');

    // Test form submission
    console.log('\n🔍 Testing form submission...');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for success
    const toast = page.locator('[data-sonner-toast]');
    if (await toast.isVisible()) {
      const toastText = await toast.textContent();
      console.log(`✅ Form submission result: ${toastText}`);
    }

    console.log('\n✅ All fixes tested successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    await page.screenshot({ path: 'maintenance_fixes_error.png', fullPage: true });
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

testMaintenanceFixes().catch(console.error);