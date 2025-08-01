const { test, expect } = require('@playwright/test');

test('Test department deletion and deactivation functionality', async ({ page }) => {
  console.log('🗑️ Testing department deletion and deactivation...');
  
  await page.goto('/', { waitUntil: 'networkidle' });
  
  // Navigate to Departments
  await page.click('button:has-text("Departments")');
  await page.waitForTimeout(1000);
  
  // Check if department table is loaded
  const departmentRows = await page.locator('table tbody tr').count();
  console.log(`Found ${departmentRows} departments in table`);
  
  if (departmentRows > 0) {
    // Check for action buttons
    const editButtons = await page.locator('button:has(svg):has-text("")').count();
    const deactivateButtons = await page.locator('button:has-text("Deactivate")').count();
    const reactivateButtons = await page.locator('button:has-text("Reactivate")').count();
    const deleteButtons = await page.locator('button:has(svg[class*="lucide-trash"])').count();
    
    console.log(`Edit buttons: ${editButtons}`);
    console.log(`Deactivate buttons: ${deactivateButtons}`);
    console.log(`Reactivate buttons: ${reactivateButtons}`);
    console.log(`Delete buttons: ${deleteButtons}`);
    
    // Test deletion error handling by trying to delete first department
    if (deleteButtons > 0) {
      console.log('\n🧪 Testing deletion error handling...');
      
      // Listen for console errors and toasts
      const consoleMessages = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });
      
      // Try to delete first department
      await page.locator('button:has(svg[class*="lucide-trash"])').first().click();
      await page.waitForTimeout(500);
      
      // Check if confirmation dialog appears
      const confirmDialog = await page.locator('text="Are you sure"').count();
      if (confirmDialog > 0) {
        console.log('✅ Confirmation dialog appeared');
        
        // Cancel first
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // Try again and confirm
        await page.locator('button:has(svg[class*="lucide-trash"])').first().click();
        await page.waitForTimeout(500);
        
        // Click OK/Yes in confirmation
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        // Check for error toast or console messages
        console.log(`Console errors captured: ${consoleMessages.length}`);
        if (consoleMessages.length > 0) {
          console.log('Error messages:', consoleMessages);
        }
      }
    }
    
    // Test deactivation functionality
    if (deactivateButtons > 0) {
      console.log('\n🔄 Testing deactivation functionality...');
      
      await page.locator('button:has-text("Deactivate")').first().click();
      await page.waitForTimeout(500);
      
      // Handle confirmation dialog
      const confirmDialog = await page.locator('text="Are you sure"').count();
      if (confirmDialog > 0) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        // Check if status changed
        const inactiveStatuses = await page.locator('.bg-red-100').count();
        console.log(`Departments with inactive status: ${inactiveStatuses}`);
      }
    }
  }
  
  await page.screenshot({ 
    path: 'test-results/department-deletion-test.png',
    fullPage: true 
  });
  
  console.log('\n📊 === DEPARTMENT DELETION TEST RESULTS ===');
  console.log(`✅ Department table loaded: ${departmentRows > 0 ? 'YES' : 'NO'}`);
  console.log(`✅ Deactivate buttons present: ${deactivateButtons > 0 ? 'YES' : 'NO'}`);
  console.log(`✅ Delete buttons present: ${deleteButtons > 0 ? 'YES' : 'NO'}`);
  
  if (departmentRows > 0 && deactivateButtons > 0) {
    console.log('🎯 SUCCESS: Deletion and deactivation functionality is available!');
    console.log('💡 TIP: Use "Deactivate" for departments that cannot be deleted due to foreign key constraints');
  }
});