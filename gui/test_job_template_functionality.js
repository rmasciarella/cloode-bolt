const { chromium } = require('playwright');

async function testJobTemplateFormFunctionality() {
  console.log('🧪 Testing Job Template Form Functionality...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  const consoleErrors = [];
  const networkErrors = [];
  const networkRequests = [];
  const responses = [];

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
      consoleErrors.push({
        message: msg.text(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Monitor network activity
  page.on('request', request => {
    if (request.url().includes('supabase') || request.url().includes('job_optimized_patterns')) {
      networkRequests.push({
        method: request.method(),
        url: request.url(),
        payload: request.postData()
      });
      console.log(`📡 Request: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('supabase') || response.url().includes('job_optimized_patterns')) {
      responses.push({
        status: response.status(),
        url: response.url(),
        timestamp: new Date().toISOString()
      });
      console.log(`📬 Response: ${response.status()} ${response.url()}`);
      
      if (response.status() >= 400) {
        networkErrors.push({
          status: response.status(),
          url: response.url(),
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  try {
    // Navigate to the GUI
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Expand Templates section
    console.log('📂 Expanding Templates section...');
    const templatesButton = await page.locator('button:has-text("Templates")').first();
    await templatesButton.click();
    await page.waitForTimeout(500);

    // Click on Job Templates
    console.log('🔗 Clicking Job Templates...');
    const jobTemplatesButton = await page.locator('button:has-text("Job Templates")').first();
    await jobTemplatesButton.click();
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'job_template_functionality_initial.png', fullPage: true });

    // Check form elements
    console.log('🔍 Analyzing form elements...');
    const nameField = await page.$('input[id="name"]');
    const descriptionField = await page.$('textarea[id="description"]');
    const taskCountField = await page.$('input[id="task_count"]');
    const totalDurationField = await page.$('input[id="total_min_duration_minutes"]');
    const criticalPathField = await page.$('input[id="critical_path_length_minutes"]');
    const solverParamsField = await page.$('textarea[id="solver_parameters"]');
    const submitButton = await page.$('button[type="submit"]');

    console.log('📋 Form Field Analysis:');
    console.log(`  ✅ Name field: ${!!nameField}`);
    console.log(`  ✅ Description field: ${!!descriptionField}`);
    console.log(`  ✅ Task count field: ${!!taskCountField}`);
    console.log(`  ✅ Total duration field: ${!!totalDurationField}`);
    console.log(`  ✅ Critical path field: ${!!criticalPathField}`);
    console.log(`  ✅ Solver parameters field: ${!!solverParamsField}`);
    console.log(`  ✅ Submit button: ${!!submitButton}`);

    // Test form filling
    if (nameField && taskCountField && submitButton) {
      console.log('📝 Testing form data entry...');
      
      await page.fill('input[id="name"]', 'Functionality Test Pattern');
      await page.fill('textarea[id="description"]', 'Testing Job Template form functionality');
      await page.fill('input[id="task_count"]', '3');
      await page.fill('input[id="total_min_duration_minutes"]', '120');
      await page.fill('input[id="critical_path_length_minutes"]', '90');
      
      // Check if solver parameters field has default content
      const solverParamsValue = await page.inputValue('textarea[id="solver_parameters"]');
      console.log('⚙️ Solver parameters field has content:', !!solverParamsValue);

      await page.screenshot({ path: 'job_template_functionality_filled.png', fullPage: true });

      // Test form submission
      console.log('🚀 Testing form submission...');
      await submitButton.click();
      await page.waitForTimeout(3000);

      // Check for success/error messages
      const toastMessages = await page.$$eval('[role="status"], .toast, .alert, [data-sonner-toast]', 
        elements => elements.map(el => el.textContent?.trim()).filter(Boolean));

      console.log('📢 Toast messages:', toastMessages);

      // Check if form was reset (indicates success)
      const nameAfterSubmit = await page.inputValue('input[id="name"]');
      console.log('🔄 Form reset check - name field after submit:', nameAfterSubmit || '[empty - form was reset]');

      await page.screenshot({ path: 'job_template_functionality_submitted.png', fullPage: true });

      // Check if data appears in the list
      console.log('📋 Checking if submitted data appears in list...');
      const tableRows = await page.$$('table tbody tr');
      console.log(`📊 Table rows found: ${tableRows.length}`);

      if (tableRows.length > 0) {
        const tableData = await page.$$eval('table tbody tr', rows => 
          rows.map(row => {
            const cells = row.querySelectorAll('td');
            return Array.from(cells).map(cell => cell.textContent?.trim());
          })
        );
        console.log('📋 Table data:', tableData);
      }

    } else {
      console.log('❌ Critical form elements missing!');
    }

    // Final analysis
    console.log('\n' + '='.repeat(80));
    console.log('📊 FUNCTIONALITY TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n🔍 Form Elements:`);
    console.log(`  • Name field: ${nameField ? '✅' : '❌'}`);
    console.log(`  • Description field: ${descriptionField ? '✅' : '❌'}`);
    console.log(`  • Task count field: ${taskCountField ? '✅' : '❌'}`);
    console.log(`  • Total duration field: ${totalDurationField ? '✅' : '❌'}`);
    console.log(`  • Critical path field: ${criticalPathField ? '✅' : '❌'}`);
    console.log(`  • Solver parameters field: ${solverParamsField ? '✅' : '❌'}`);
    console.log(`  • Submit button: ${submitButton ? '✅' : '❌'}`);

    console.log(`\n🌐 Network Activity:`);
    console.log(`  • Requests made: ${networkRequests.length}`);
    console.log(`  • Responses received: ${responses.length}`);
    console.log(`  • Network errors: ${networkErrors.length}`);
    
    if (networkRequests.length > 0) {
      console.log(`\n📡 Request Details:`);
      networkRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url}`);
        if (req.payload) {
          console.log(`     Payload: ${req.payload.substring(0, 100)}...`);
        }
      });
    }

    if (networkErrors.length > 0) {
      console.log(`\n❌ Network Errors:`);
      networkErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.status} ${err.url}`);
      });
    }

    console.log(`\n🔴 Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message}`);
      });
    }

  } catch (error) {
    console.error('❌ Critical test failure:', error.message);
    await page.screenshot({ path: 'job_template_functionality_error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
    console.log('👋 Browser closed');
  }
}

// Run the test
testJobTemplateFormFunctionality().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});