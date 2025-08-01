const { test, expect } = require('@playwright/test');

test('Test improved time input functionality', async ({ page }) => {
  console.log('🕒 Testing new time input components...');
  
  await page.goto('/', { waitUntil: 'networkidle' });
  
  // Test Department form time inputs
  console.log('\n🏢 Testing Department form time inputs...');
  await page.click('button:has-text("Departments")');
  await page.waitForTimeout(1000);
  
  // Check if TimeInput components are present
  const shiftStartLabel = await page.locator('label:has-text("Default Shift Start Time")').count();
  const shiftEndLabel = await page.locator('label:has-text("Default Shift End Time")').count();
  
  console.log(`Department form - Shift Start Time label: ${shiftStartLabel}`);
  console.log(`Department form - Shift End Time label: ${shiftEndLabel}`);
  
  if (shiftStartLabel > 0 && shiftEndLabel > 0) {
    console.log('✅ Department form has new time input labels');
  } else {
    console.log('❌ Department form missing new time input labels');
  }
  
  await page.screenshot({ 
    path: 'test-results/department-time-inputs.png',
    fullPage: true 
  });
  
  // Test Business Calendar form time inputs  
  console.log('\n📅 Testing Business Calendar form time inputs...');
  await page.click('button:has-text("Business Calendars")');
  await page.waitForTimeout(1000);
  
  const defaultStartLabel = await page.locator('label:has-text("Default Start Time")').count();
  const defaultEndLabel = await page.locator('label:has-text("Default End Time")').count();
  
  console.log(`Business Calendar form - Default Start Time label: ${defaultStartLabel}`);
  console.log(`Business Calendar form - Default End Time label: ${defaultEndLabel}`);
  
  if (defaultStartLabel > 0 && defaultEndLabel > 0) {
    console.log('✅ Business Calendar form has new time input labels');
  } else {
    console.log('❌ Business Calendar form missing new time input labels');
  }
  
  await page.screenshot({ 
    path: 'test-results/calendar-time-inputs.png',
    fullPage: true 
  });
  
  // Summary
  console.log('\n📊 === TIME INPUT TEST RESULTS ===');
  const departmentSuccess = (shiftStartLabel > 0 && shiftEndLabel > 0);
  const calendarSuccess = (defaultStartLabel > 0 && defaultEndLabel > 0);
  
  console.log(`✅ Department form: ${departmentSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Business Calendar form: ${calendarSuccess ? 'PASS' : 'FAIL'}`);
  
  if (departmentSuccess && calendarSuccess) {
    console.log('🎯 SUCCESS: All time input improvements implemented!');
  } else {
    console.log('❌ Some time input improvements failed');
  }
});