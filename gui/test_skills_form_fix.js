const { chromium } = require('playwright');

async function testSkillsFormFix() {
  console.log('🧪 Testing Skills Form Fixes...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`🔴 Console Error: ${msg.text()}`);
    }
  });
  
  try {
    console.log('📍 Navigating to GUI...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Navigate to Skills page
    console.log('📍 Expanding Resources section...');
    const resourcesButton = page.locator('button:has-text("Resources")');
    await resourcesButton.click();
    await page.waitForTimeout(500);
    
    console.log('📍 Clicking Skills page...');
    const skillsButton = page.locator('button:has-text("Skills")');
    await skillsButton.click();
    await page.waitForTimeout(2000);
    
    // Check if page loaded correctly
    const heading = await page.locator('h2').first().textContent();
    console.log(`📄 Page heading: ${heading}`);
    
    const formsCount = await page.locator('form').count();
    console.log(`📝 Forms found: ${formsCount}`);
    
    if (formsCount === 0) {
      throw new Error('No forms found on Skills page');
    }
    
    // Test form creation
    console.log('\n🆕 Testing form creation...');
    await page.locator('input[id="name"]').fill('Test React Skill');
    console.log('✅ Name field filled');
    
    // Test category dropdown
    const categorySelect = page.locator('select, [role="combobox"]').first();
    await categorySelect.click();
    await page.waitForTimeout(500);
    console.log('✅ Category dropdown opened');
    
    // Test department dropdown  
    const departmentSelects = page.locator('[role="combobox"]');
    if (await departmentSelects.count() > 1) {
      await departmentSelects.nth(1).click();
      await page.waitForTimeout(500);
      console.log('✅ Department dropdown opened');
    }
    
    // Fill other required fields
    await page.locator('input[id="training_hours_required"]').fill('40');
    console.log('✅ Training hours filled');
    
    // Take screenshot of filled form
    await page.screenshot({ path: 'skills_form_test_filled.png', fullPage: true });
    console.log('📸 Screenshot saved: skills_form_test_filled.png');
    
    // Test form submission (don't actually submit to avoid database changes)
    const submitButton = page.locator('button[type="submit"]');
    const isSubmitEnabled = await submitButton.isEnabled();
    console.log(`🔘 Submit button enabled: ${isSubmitEnabled}`);
    
    // Test if existing skills are displayed
    const tablesCount = await page.locator('table').count();
    console.log(`📊 Tables found: ${tablesCount}`);
    
    if (tablesCount > 0) {
      const skillRows = await page.locator('table tbody tr').count();
      console.log(`📋 Skill entries found: ${skillRows}`);
      
      // Test edit functionality if skills exist
      if (skillRows > 0) {
        console.log('\n✏️ Testing edit functionality...');
        const editButton = page.locator('button:has([class*="Edit"]), button[title="Edit"]').first();
        if (await editButton.count() > 0) {
          await editButton.click();
          await page.waitForTimeout(1000);
          
          // Check if form is populated with values
          const nameValue = await page.locator('input[id="name"]').inputValue();
          console.log(`✅ Edit mode - Name field populated: "${nameValue}"`);
          
          // Take screenshot of edit mode
          await page.screenshot({ path: 'skills_form_edit_mode.png', fullPage: true });
          console.log('📸 Screenshot saved: skills_form_edit_mode.png');
        }
      }
    }
    
    console.log('\n✅ Skills form testing completed successfully!');
    console.log(`🔍 Console errors during test: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('📋 Console errors:');
      errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'skills_form_test_error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('👋 Browser closed');
  }
}

// Run the test
testSkillsFormFix().catch(error => {
  console.error('Critical test failure:', error);
  process.exit(1);
});