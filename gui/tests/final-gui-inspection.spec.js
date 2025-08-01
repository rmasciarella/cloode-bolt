const { test, expect } = require('@playwright/test');

test.describe('Final GUI Inspection', () => {
  const baseURL = 'http://localhost:3002';
  
  test('Complete GUI inspection and documentation', async ({ page }) => {
    // Navigate to the home page
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Take initial homepage screenshot
    await page.screenshot({ 
      path: 'gui/test-results/final-inspection-homepage.png',
      fullPage: true 
    });
    
    // Get all navigation sections
    const sections = [
      'Departments',
      'Work Cells', 
      'Machines',
      'Operators',
      'Skills',
      'Business Calendars',
      'Maintenance Types',
      'Job Templates',
      'Template Tasks',
      'Job Instances',
      'Setup Times',
      'Template Precedences',
      'Sequence Resources'
    ];
    
    console.log('🔍 Starting comprehensive GUI inspection...');
    
    for (const section of sections) {
      try {
        console.log(`📋 Inspecting ${section} section...`);
        
        // Click on the section
        await page.click(`text=${section}`);
        await page.waitForTimeout(2000); // Wait for form to load
        
        // Take screenshot of the section
        await page.screenshot({ 
          path: `gui/test-results/final-inspection-${section.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
        
        // Check if form exists and get form elements
        const formExists = await page.locator('form').count() > 0;
        
        if (formExists) {
          // Count input fields
          const inputCount = await page.locator('input').count();
          const selectCount = await page.locator('select').count();
          const textareaCount = await page.locator('textarea').count();
          
          console.log(`   ✅ ${section}: ${inputCount} inputs, ${selectCount} selects, ${textareaCount} textareas`);
          
          // Try to fill out the form with test data
          const inputs = await page.locator('input[type="text"], input[type="number"], input[type="date"], input[type="time"]').all();
          
          for (let i = 0; i < Math.min(inputs.length, 3); i++) {
            const input = inputs[i];
            const inputType = await input.getAttribute('type');
            const inputName = await input.getAttribute('name') || await input.getAttribute('id') || `field_${i}`;
            
            try {
              switch (inputType) {
                case 'text':
                  await input.fill(`Test ${section} ${i + 1}`);
                  break;
                case 'number':
                  await input.fill('100');
                  break;
                case 'date':
                  await input.fill('2024-12-01');
                  break;
                case 'time':
                  await input.fill('09:00');
                  break;
                default:
                  await input.fill('Test Value');
              }
            } catch (e) {
              console.log(`   ⚠️  Could not fill ${inputName}: ${e.message}`);
            }
          }
          
          // Fill selects if any
          const selects = await page.locator('select').all();
          for (let i = 0; i < Math.min(selects.length, 2); i++) {
            try {
              const options = await selects[i].locator('option').all();
              if (options.length > 1) {
                await selects[i].selectOption({ index: 1 });
              }
            } catch (e) {
              console.log(`   ⚠️  Could not select option: ${e.message}`);
            }
          }
          
          // Take filled form screenshot
          await page.screenshot({ 
            path: `gui/test-results/final-inspection-${section.toLowerCase().replace(/\s+/g, '-')}-filled.png`,
            fullPage: true 
          });
          
          // Try to submit if submit button exists
          const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create"), button:has-text("Save")');
          const submitExists = await submitButton.count() > 0;
          
          if (submitExists) {
            console.log(`   🚀 Attempting to submit ${section} form...`);
            await submitButton.first().click();
            await page.waitForTimeout(3000);
            
            // Take post-submission screenshot
            await page.screenshot({ 
              path: `gui/test-results/final-inspection-${section.toLowerCase().replace(/\s+/g, '-')}-submitted.png`,
              fullPage: true 
            });
          }
        } else {
          console.log(`   ❌ No form found for ${section}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error inspecting ${section}: ${error.message}`);
        await page.screenshot({ 
          path: `gui/test-results/final-inspection-${section.toLowerCase().replace(/\s+/g, '-')}-error.png`,
          fullPage: true 
        });
      }
    }
    
    // Final overview screenshot
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'gui/test-results/final-inspection-complete.png',
      fullPage: true 
    });
    
    console.log('✨ GUI inspection complete! Check gui/test-results/ for screenshots.');
  });
  
  test('GUI performance and accessibility check', async ({ page }) => {
    await page.goto(baseURL);
    
    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate through all sections to collect errors
    const sections = ['Departments', 'Work Cells', 'Machines', 'Operators'];
    
    for (const section of sections) {
      await page.click(`text=${section}`);
      await page.waitForTimeout(1000);
    }
    
    // Report errors
    if (errors.length > 0) {
      console.log('🚨 Console errors found:');
      errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Check page performance
    const navigation = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        totalTime: perfData.loadEventEnd - perfData.fetchStart
      };
    });
    
    console.log('📊 Performance metrics:');
    console.log(`   Load time: ${navigation.loadTime}ms`);
    console.log(`   DOM ready: ${navigation.domContentLoaded}ms`);  
    console.log(`   Total time: ${navigation.totalTime}ms`);
  });
});