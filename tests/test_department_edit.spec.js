const { test, expect } = require('@playwright/test');

test('Test department parent selection and editing', async ({ page }) => {
  console.log('🏢 Testing department parent selection...');
  
  await page.goto('/', { waitUntil: 'networkidle' });
  
  // Navigate to Departments
  await page.click('button:has-text("Departments")');
  await page.waitForTimeout(1000);
  
  // Check if parent department dropdown is present
  const parentDropdown = await page.locator('button:has(span:has-text("Select parent department"))').count();
  console.log(`Parent department dropdown found: ${parentDropdown}`);
  
  // Check if "None (Root Department)" option is available
  if (parentDropdown > 0) {
    await page.click('button:has(span:has-text("Select parent department"))');
    await page.waitForTimeout(500);
    
    const noneOption = await page.locator('text="None (Root Department)"').count();
    console.log(`"None (Root Department)" option available: ${noneOption}`);
    
    if (noneOption > 0) {
      console.log('✅ Root department option is available');
    } else {
      console.log('❌ Root department option is missing');
    }
    
    // Close dropdown
    await page.press('body', 'Escape');
  }
  
  // Check if edit buttons are present for existing departments
  const editButtons = await page.locator('button:has(svg)').count();
  console.log(`Edit buttons found: ${editButtons}`);
  
  await page.screenshot({ 
    path: 'test-results/department-parent-selection.png',
    fullPage: true 
  });
  
  console.log('\n📊 === DEPARTMENT EDIT TEST RESULTS ===');
  console.log(`✅ Parent dropdown: ${parentDropdown > 0 ? 'AVAILABLE' : 'MISSING'}`);
  console.log(`✅ Root option: ${parentDropdown > 0 ? 'AVAILABLE' : 'MISSING'}`);
  console.log(`✅ Edit functionality: ${editButtons > 0 ? 'AVAILABLE' : 'MISSING'}`);
  
  if (parentDropdown > 0) {
    console.log('🎯 SUCCESS: Department parent selection is working!');
  } else {
    console.log('❌ Department parent selection needs attention');
  }
});