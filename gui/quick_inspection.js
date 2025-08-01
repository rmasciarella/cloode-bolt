const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Starting GUI inspection...');
    
    // Navigate to the GUI
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Take homepage screenshot
    await page.screenshot({ 
      path: 'final-inspection-homepage.png',
      fullPage: true 
    });
    console.log('📸 Homepage screenshot taken');
    
    // Test a few key sections
    const sections = ['Departments', 'Work Cells', 'Machines', 'Job Templates'];
    
    for (const section of sections) {
      try {
        console.log(`📋 Inspecting ${section}...`);
        
        // Click section
        await page.click(`text=${section}`, { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // Take screenshot
        await page.screenshot({ 
          path: `final-inspection-${section.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
        
        console.log(`✅ ${section} captured`);
        
      } catch (error) {
        console.log(`❌ Error with ${section}: ${error.message}`);
      }
    }
    
    // Check console logs
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log('📊 Console messages:', logs.length);
    if (logs.length > 0) {
      logs.slice(0, 5).forEach(log => console.log(`   - ${log}`));
    }
    
    console.log('✨ Inspection complete!');
    
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
  } finally {
    await browser.close();
  }
})();