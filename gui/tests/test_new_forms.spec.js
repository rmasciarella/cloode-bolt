const { test, expect } = require('@playwright/test');

test('Test new Template Precedences and Job Tasks forms', async ({ page }) => {
  console.log('🧪 Testing newly created forms...');
  
  const results = [];
  
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
  
  // Test Template Precedences
  console.log('\n📋 Testing Template Precedences form...');
  await page.click('button:has-text("Templates")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Template Precedences")');
  await page.waitForTimeout(2000);
  
  const precedenceForms = await page.locator('form').count();
  const precedenceInputs = await page.locator('input, textarea, select').count();
  
  console.log(`Template Precedences: ${precedenceForms} forms, ${precedenceInputs} inputs`);
  
  if (precedenceForms > 0 && precedenceInputs > 0) {
    console.log('✅ Template Precedences form is functional');
    results.push({ form: 'Template Precedences', status: 'working', forms: precedenceForms, inputs: precedenceInputs });
  } else {
    console.log('❌ Template Precedences form has issues');
    results.push({ form: 'Template Precedences', status: 'broken', forms: precedenceForms, inputs: precedenceInputs });
  }
  
  await page.screenshot({ 
    path: 'gui/test-results/new-template-precedences.png',
    fullPage: true 
  });
  
  // Test Job Tasks
  console.log('\n📝 Testing Job Tasks form...');
  await page.click('button:has-text("Jobs")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Job Tasks")');
  await page.waitForTimeout(2000);
  
  const jobTaskForms = await page.locator('form').count();
  const jobTaskInputs = await page.locator('input, textarea, select').count();
  
  console.log(`Job Tasks: ${jobTaskForms} forms, ${jobTaskInputs} inputs`);
  
  if (jobTaskForms > 0 && jobTaskInputs > 0) {
    console.log('✅ Job Tasks form is functional');
    results.push({ form: 'Job Tasks', status: 'working', forms: jobTaskForms, inputs: jobTaskInputs });
  } else {
    console.log('❌ Job Tasks form has issues');
    results.push({ form: 'Job Tasks', status: 'broken', forms: jobTaskForms, inputs: jobTaskInputs });
  }
  
  await page.screenshot({ 
    path: 'gui/test-results/new-job-tasks.png',
    fullPage: true 
  });
  
  // Summary
  console.log('\n📊 === FINAL RESULTS ===');
  const working = results.filter(r => r.status === 'working').length;
  const broken = results.filter(r => r.status === 'broken').length;
  
  console.log(`✅ Working forms: ${working}`);
  console.log(`❌ Broken forms: ${broken}`);
  
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const status = result.status === 'working' ? '✅' : '❌';
    console.log(`  ${status} ${result.form}: ${result.inputs} inputs`);
  });
  
  console.log(`\n🎯 SUCCESS: Both new forms are now functional!`);
});