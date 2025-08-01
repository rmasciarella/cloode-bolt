const { chromium } = require('playwright');

async function testMaintenanceWindowsForm() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Testing Maintenance Windows Form (MaintenanceTypeForm)...');
    
    // Navigate to the GUI
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // First expand the "Scheduling" section
    console.log('\n🔍 Expanding Scheduling section...');
    const schedulingSection = page.locator('button:has-text("Scheduling")');
    await schedulingSection.click();
    console.log('✅ Scheduling section expanded');

    // Now click on "Maintenance Windows"
    console.log('\n🔍 Clicking Maintenance Windows...');
    const maintenanceWindowsButton = page.locator('button:has-text("Maintenance Windows")');
    await maintenanceWindowsButton.click();
    console.log('✅ Maintenance Windows clicked');

    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('✅ Form is visible');

    // Check the page title
    const pageTitle = await page.locator('h2').textContent();
    console.log(`📝 Page title: ${pageTitle}`);

    // Test form fields
    console.log('\n🔍 Testing form fields...');
    
    // Test name field (required)
    const nameField = page.locator('input[id="name"]');
    if (await nameField.isVisible()) {
      await nameField.fill('Test Maintenance Type');
      console.log('✅ Name field populated');
    } else {
      console.log('❌ Name field not found');
    }

    // Test description field
    const descriptionField = page.locator('textarea[id="description"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('This is a test maintenance type description');
      console.log('✅ Description field populated');
    }

    // Test typical duration field
    const durationField = page.locator('input[id="typical_duration_hours"]');
    if (await durationField.isVisible()) {
      await durationField.fill('4.5');
      console.log('✅ Duration field populated');
    } else {
      console.log('❌ Duration field not found');
    }

    // List all input fields to debug
    console.log('\n🔍 All input fields:');
    const allInputs = await page.locator('input').all();
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      console.log(`Input ${i}: id="${id}", type="${type}", name="${name}"`);
    }

    // List all labels
    console.log('\n🔍 All labels:');
    const allLabels = await page.locator('label').all();
    for (let i = 0; i < allLabels.length; i++) {
      const label = allLabels[i];
      const htmlFor = await label.getAttribute('for');
      const text = await label.textContent();
      console.log(`Label ${i}: for="${htmlFor}", text="${text}"`);
    }

    // Take screenshot
    await page.screenshot({ path: 'maintenance_windows_form_debug.png', fullPage: true });
    console.log('📸 Screenshot taken: maintenance_windows_form_debug.png');

    // Test checkboxes if they exist
    console.log('\n🔍 Testing checkboxes...');
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`Found ${checkboxes.length} checkboxes`);

    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i];
      const id = await checkbox.getAttribute('id');
      console.log(`Checkbox ${i}: id="${id}"`);
    }

    // Test form submission if possible
    console.log('\n🔍 Testing form submission...');
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      console.log('✅ Submit button found');
      
      // Only click if we have required fields filled
      if (await nameField.isVisible() && await nameField.inputValue() !== '') {
        await submitButton.click();
        console.log('✅ Submit button clicked');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check for toast messages
        const toast = page.locator('[data-sonner-toast]');
        if (await toast.isVisible()) {
          const toastText = await toast.textContent();
          console.log(`📝 Toast message: ${toastText}`);
        }
      }
    }

    console.log('\n✅ Maintenance Windows form testing completed');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    await page.screenshot({ path: 'maintenance_windows_error.png', fullPage: true });
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

testMaintenanceWindowsForm().catch(console.error);