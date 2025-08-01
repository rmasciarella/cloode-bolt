import { test, expect } from '@playwright/test';

/**
 * Quick Bug Scan - Check what's actually available and working
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Quick Bug Scan', () => {
  test('Discover available navigation and check for bugs', async ({ page }) => {
    let consoleErrors = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to home page
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    console.log('📍 Page loaded, checking available navigation...');
    
    // Find all clickable navigation elements
    const navLinks = await page.locator('a, button').evaluateAll(elements => 
      elements
        .filter(el => el.textContent && el.textContent.trim().length > 0)
        .map(el => ({
          text: el.textContent.trim(),
          tagName: el.tagName,
          className: el.className
        }))
        .filter(item => 
          item.text.length < 50 && // Reasonable length
          !item.text.includes('undefined') &&
          !item.text.includes('null')
        )
    );
    
    console.log('🔍 Available navigation items:');
    navLinks.forEach(link => console.log(`  - ${link.text} (${link.tagName})`));
    
    // Test clicking on first few available items
    const testableItems = navLinks
      .filter(link => 
        link.text.match(/Business|Department|Machine|Operator|Skill|Template|Job|Work|Maintenance|Setup|Sequence/i)
      )
      .slice(0, 5);
    
    console.log('🧪 Testing navigation items:');
    
    for (const item of testableItems) {
      try {
        console.log(`  Testing: ${item.text}`);
        
        const errorsBefore = consoleErrors.length;
        
        // Try to click the item
        await page.click(`text=${item.text}`, { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        const errorsAfter = consoleErrors.length;
        
        if (errorsAfter > errorsBefore) {
          console.log(`    ❌ ${item.text} caused ${errorsAfter - errorsBefore} console errors`);
          const newErrors = consoleErrors.slice(errorsBefore);
          newErrors.forEach(err => console.log(`      - ${err}`));
        } else {
          console.log(`    ✅ ${item.text} loaded without critical errors`);
        }
        
        // Check if form elements are present
        const formPresent = await page.locator('form, [data-testid="form"], .space-y-6').isVisible();
        console.log(`    📝 Form present: ${formPresent}`);
        
      } catch (error) {
        console.log(`    ⚠️  ${item.text} failed to load: ${error.message}`);
      }
    }
    
    // Summary
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || 
      err.includes('ReferenceError') ||
      err.includes('Cannot read properties') ||
      err.includes('null is not an object')
    );
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total console errors: ${consoleErrors.length}`);
    console.log(`  Critical errors: ${criticalErrors.length}`);
    console.log(`  Testable navigation items: ${testableItems.length}`);
    
    if (criticalErrors.length > 0) {
      console.log(`\n🚨 Critical errors found:`);
      criticalErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'gui/test-results/bug-scan-summary.png',
      fullPage: true 
    });
    
    // Test should pass if no critical JavaScript errors
    expect(criticalErrors.length).toBe(0);
  });
});