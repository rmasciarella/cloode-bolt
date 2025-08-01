const { chromium } = require('playwright');

async function testMaintenanceTypesForm() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Testing Maintenance Types Form...');
    
    // Navigate to the maintenance types page
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // Look for navigation or maintenance types form
    const maintenanceTypesButton = page.locator('text=Maintenance Types').first();
    if (await maintenanceTypesButton.isVisible()) {
      await maintenanceTypesButton.click();
      console.log('✅ Clicked Maintenance Types navigation');
    }

    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('✅ Form is visible');

    // Test form fields
    console.log('\n🔍 Testing form fields...');
    
    // Test name field (required)
    const nameField = page.locator('input[id="name"]');
    await nameField.fill('Test Maintenance Type');
    console.log('✅ Name field populated');

    // Test description field
    const descriptionField = page.locator('textarea[id="description"]');
    await descriptionField.fill('This is a test maintenance type description');
    console.log('✅ Description field populated');

    // Test typical duration field
    const durationField = page.locator('input[id="typical_duration_hours"]');
    await durationField.fill('4.5');
    console.log('✅ Duration field populated');

    // Test skill level dropdown
    const skillDropdown = page.locator('[data-testid="skill-level-select"], button:has-text("Select skill level")').first();
    if (await skillDropdown.isVisible()) {
      await skillDropdown.click();
      await page.waitForSelector('text=Competent', { timeout: 5000 });
      await page.locator('text=Competent').click();
      console.log('✅ Skill level selected');
    }

    // Test checkboxes
    const checkboxes = [
      { id: 'is_preventive', label: 'Preventive Maintenance' },
      { id: 'is_emergency', label: 'Emergency Maintenance' },
      { id: 'blocks_production', label: 'Blocks Production' },
      { id: 'allows_emergency_override', label: 'Allows Emergency Override' },
      { id: 'requires_shutdown', label: 'Requires Shutdown' },
      { id: 'requires_external_vendor', label: 'Requires External Vendor' }
    ];

    for (const checkbox of checkboxes) {
      const checkboxElement = page.locator(`input[id="${checkbox.id}"]`);
      if (await checkboxElement.isVisible()) {
        await checkboxElement.check();
        console.log(`✅ ${checkbox.label} checkbox checked`);
      } else {
        console.log(`⚠️  ${checkbox.label} checkbox not found`);
      }
    }

    // Take screenshot before submission
    await page.screenshot({ path: 'maintenance_types_form_filled.png', fullPage: true });
    console.log('📸 Screenshot taken: maintenance_types_form_filled.png');

    // Test form submission
    console.log('\n🔍 Testing form submission...');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    console.log('✅ Submit button clicked');

    // Wait for either success or error message
    try {
      await page.waitForSelector('[data-sonner-toast]', { timeout: 10000 });
      const toastMessage = await page.locator('[data-sonner-toast]').textContent();
      console.log(`📝 Toast message: ${toastMessage}`);
    } catch (error) {
      console.log('⚠️  No toast message appeared - checking for other feedback');
    }

    // Take screenshot after submission
    await page.screenshot({ path: 'maintenance_types_form_submitted.png', fullPage: true });
    console.log('📸 Screenshot taken: maintenance_types_form_submitted.png');

    // Check if form was reset (indicates successful submission)
    const nameFieldValue = await nameField.inputValue();
    if (nameFieldValue === '') {
      console.log('✅ Form was reset - likely successful submission');
    } else {
      console.log('⚠️  Form was not reset - may indicate validation errors');
    }

    // Check if maintenance types list updated
    console.log('\n🔍 Checking maintenance types list...');
    const maintenanceTypesList = page.locator('table tbody tr');
    const count = await maintenanceTypesList.count();
    console.log(`📊 Found ${count} maintenance types in the list`);

    if (count > 0) {
      console.log('✅ Maintenance types are displayed');
      
      // Test edit functionality
      const editButton = page.locator('button:has(svg)').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        console.log('✅ Edit button clicked');
        
        // Check if form is pre-populated
        const editedNameValue = await nameField.inputValue();
        if (editedNameValue !== '') {
          console.log(`✅ Form pre-populated for editing: ${editedNameValue}`);
        }
      }
    }

    console.log('\n✅ Maintenance Types form testing completed');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    await page.screenshot({ path: 'maintenance_types_error.png', fullPage: true });
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

testMaintenanceTypesForm().catch(console.error);