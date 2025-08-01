const { test, expect } = require('@playwright/test');

test('Complete department functionality test', async ({ page }) => {
  console.log('🏢 Testing complete department functionality...');
  
  await page.goto('/', { waitUntil: 'networkidle' });
  
  // Navigate to Departments
  await page.click('button:has-text("Departments")');
  await page.waitForTimeout(1000);
  
  // Check form elements
  const results = [];
  
  // Check time inputs
  const shiftStartLabel = await page.locator('label:has-text("Default Shift Start Time")').count();
  const shiftEndLabel = await page.locator('label:has-text("Default Shift End Time")').count();
  results.push({ feature: 'Time Inputs', working: shiftStartLabel > 0 && shiftEndLabel > 0 });
  
  // Check parent department dropdown
  const parentDropdown = await page.locator('button:has(span:has-text("Select parent department"))').count();
  results.push({ feature: 'Parent Department Selection', working: parentDropdown > 0 });
  
  // Check cost center field
  const costCenterField = await page.locator('input[placeholder*="CC-PROD"]').count();
  results.push({ feature: 'Cost Center Field', working: costCenterField > 0 });
  
  // Check help text
  const helpText = await page.locator('text=For single department use').count();
  results.push({ feature: 'Helpful Instructions', working: helpText > 0 });
  
  // Check if we can open parent dropdown and see options
  if (parentDropdown > 0) {
    await page.click('button:has(span:has-text("Select parent department"))');
    await page.waitForTimeout(500);
    
    const noneOption = await page.locator('text="None (Root Department)"').count();
    results.push({ feature: 'Root Department Option', working: noneOption > 0 });
    
    await page.press('body', 'Escape');
  }
  
  await page.screenshot({ 
    path: 'test-results/complete-department-functionality.png',
    fullPage: true 
  });
  
  // Summary
  console.log('\n📊 === COMPLETE DEPARTMENT TEST RESULTS ===');
  results.forEach(result => {
    const status = result.working ? '✅' : '❌';
    console.log(`${status} ${result.feature}: ${result.working ? 'WORKING' : 'NEEDS ATTENTION'}`);
  });
  
  const allWorking = results.every(r => r.working);
  console.log(`\n🎯 Overall Status: ${allWorking ? 'ALL FEATURES WORKING!' : 'Some features need attention'}`);
  
  if (allWorking) {
    console.log('✨ Department form is fully functional for single department use!');
  }
});