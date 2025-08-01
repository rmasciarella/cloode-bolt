const { chromium } = require('playwright');

async function testWorkCellForm() {
  console.log('🔍 Testing Work Cell Form Specific Issues...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  
  const issues = [];
  
  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
      issues.push({
        type: 'console_error',
        message: msg.text()
      });
    }
  });

  try {
    // Navigate to GUI
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Navigate to Work Cells
    console.log('🏭 Navigating to Work Cells...');
    
    // Expand Organization section
    const orgSection = page.locator('button:has-text("Organization")');
    await orgSection.click();
    await page.waitForTimeout(500);
    
    // Click Work Cells
    const workCellsNav = page.locator('button:has-text("Work Cells")');
    await workCellsNav.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'workcell_debug_initial.png', fullPage: true });
    
    console.log('📝 Testing form fields...');
    
    // Test form field presence
    const formFields = {
      'name': 'input[id="name"]',
      'cell_type': '[role="combobox"]',  // First combobox should be cell type
      'department_id': null, // We'll find the second combobox
      'floor_location': 'input[id="floor_location"]',
      'capacity': 'input[id="capacity"]',
      'wip_limit': 'input[id="wip_limit"]',
      'utilization_target_percent': 'input[id="utilization_target_percent"]',
      'flow_priority': 'input[id="flow_priority"]',
      'is_active': 'input[type="checkbox"]'
    };
    
    for (const [fieldName, selector] of Object.entries(formFields)) {
      if (selector) {
        const fieldExists = await page.locator(selector).count() > 0;
        console.log(`  - ${fieldName}: ${fieldExists ? '✅ EXISTS' : '❌ MISSING'}`);
        if (!fieldExists) {
          issues.push({
            type: 'missing_field',
            field: fieldName,
            selector: selector
          });
        }
      }
    }
    
    // Test filling the form
    console.log('✏️ Testing form filling...');
    
    try {
      // Fill name field
      await page.fill('input[id="name"]', 'TEST_WORKCELL_DEBUG');
      console.log('  ✅ Name field filled');
      
      // Test cell type dropdown
      const cellTypeDropdown = page.locator('[role="combobox"]').first();
      await cellTypeDropdown.click();
      await page.waitForTimeout(500);
      
      // Check if options are visible
      const optionsVisible = await page.locator('[role="option"]').count();
      console.log(`  📋 Cell type options found: ${optionsVisible}`);
      
      if (optionsVisible > 0) {
        await page.locator('[role="option"]').first().click();
        console.log('  ✅ Cell type selected');
      } else {
        issues.push({
          type: 'dropdown_no_options',
          field: 'cell_type'
        });
      }
      
      // Fill numeric fields
      await page.fill('input[id="capacity"]', '5');
      await page.fill('input[id="wip_limit"]', '10');
      await page.fill('input[id="utilization_target_percent"]', '85');
      await page.fill('input[id="flow_priority"]', '1');
      console.log('  ✅ Numeric fields filled');
      
      // Test department dropdown (second combobox)
      const departmentDropdown = page.locator('[role="combobox"]').nth(1);
      if (await departmentDropdown.count() > 0) {
        await departmentDropdown.click();
        await page.waitForTimeout(500);
        
        const deptOptionsVisible = await page.locator('[role="option"]').count();
        console.log(`  📋 Department options found: ${deptOptionsVisible}`);
        
        if (deptOptionsVisible > 0) {
          // Select first option or "No Department"
          const noDeptOption = page.locator('[role="option"]:has-text("No Department")');
          if (await noDeptOption.count() > 0) {
            await noDeptOption.click();
            console.log('  ✅ "No Department" selected');
          } else {
            await page.locator('[role="option"]').first().click();
            console.log('  ✅ First department selected');
          }
        }
      }
      
      // Take screenshot before submission
      await page.screenshot({ path: 'workcell_debug_filled.png', fullPage: true });
      
      // Test form submission
      console.log('📤 Testing form submission...');
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Check for success/error messages
      const toastMessages = await page.locator('[class*="toast"], [role="alert"], .text-green-600, .text-red-600').count();
      console.log(`  📢 Toast/alert messages found: ${toastMessages}`);
      
      if (toastMessages > 0) {
        const messageText = await page.locator('[class*="toast"], [role="alert"], .text-green-600, .text-red-600').first().textContent();
        console.log(`  📝 Message: ${messageText}`);
        
        if (messageText && messageText.toLowerCase().includes('error')) {
          issues.push({
            type: 'submission_error',
            message: messageText
          });
        }
      }
      
      // Take screenshot after submission
      await page.screenshot({ path: 'workcell_debug_submitted.png', fullPage: true });
      
    } catch (formError) {
      console.log(`❌ Form interaction failed: ${formError.message}`);
      issues.push({
        type: 'form_interaction_error',
        message: formError.message
      });
    }
    
    // Check if work cells list loaded
    console.log('📊 Checking work cells list...');
    const tableExists = await page.locator('table').count() > 0;
    const tableRows = await page.locator('tbody tr').count();
    console.log(`  📋 Table exists: ${tableExists}`);
    console.log(`  📊 Table rows: ${tableRows}`);
    
    // Generate report
    console.log('\n' + '='.repeat(50));
    console.log('📋 WORK CELL FORM DEBUG REPORT');
    console.log('='.repeat(50));
    
    if (issues.length === 0) {
      console.log('✅ No issues found! Work Cell form appears to be working correctly.');
    } else {
      console.log(`❌ Issues found (${issues.length}):`);
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.type.toUpperCase()}] ${issue.message || issue.field || 'Unknown'}`);
        if (issue.selector) console.log(`     Selector: ${issue.selector}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    await page.screenshot({ path: 'workcell_debug_error.png', fullPage: true });
    issues.push({
      type: 'critical_error',
      message: error.message
    });
  } finally {
    await browser.close();
    console.log('👋 Browser closed');
  }
  
  return issues;
}

// Run the test
testWorkCellForm().then(issues => {
  if (issues.length > 0) {
    process.exit(1);
  }
}).catch(error => {
  console.error('Critical test failure:', error);
  process.exit(1);
});