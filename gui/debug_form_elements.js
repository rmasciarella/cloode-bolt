const { chromium } = require('playwright');

async function debugFormElements() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔍 Debugging Sequence Resources Form Elements...');

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Navigate to sequence resources
    await page.click('button:has-text("Resources")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Sequence Resources")');
    await page.waitForTimeout(1000);

    // Get all form elements
    console.log('\n🔍 All input elements:');
    const inputs = await page.locator('input').allInnerTexts();
    const inputInfo = await page.locator('input').all();
    for (let i = 0; i < inputInfo.length; i++) {
      const id = await inputInfo[i].getAttribute('id');
      const type = await inputInfo[i].getAttribute('type');
      const placeholder = await inputInfo[i].getAttribute('placeholder');
      console.log(`Input ${i}: id="${id}" type="${type}" placeholder="${placeholder}"`);
    }

    console.log('\n🔍 All select elements:');
    const selects = await page.locator('select').all();
    for (let i = 0; i < selects.length; i++) {
      const id = await selects[i].getAttribute('id');
      console.log(`Select ${i}: id="${id}"`);
    }

    console.log('\n🔍 All textarea elements:');
    const textareas = await page.locator('textarea').all();
    for (let i = 0; i < textareas.length; i++) {
      const id = await textareas[i].getAttribute('id');
      console.log(`Textarea ${i}: id="${id}"`);
    }

    console.log('\n🔍 All checkbox elements:');
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (let i = 0; i < checkboxes.length; i++) {
      const id = await checkboxes[i].getAttribute('id');
      console.log(`Checkbox ${i}: id="${id}"`);
    }

    console.log('\n🔍 Elements with specific IDs we expect:');
    const expectedIds = ['department_id', 'resource_type', 'is_active', 'capacity', 'utilization_target_percent', 'calendar_id'];
    for (const id of expectedIds) {
      const element = page.locator(`[id="${id}"]`);
      const exists = await element.count() > 0;
      console.log(`${id}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      if (exists) {
        const tagName = await element.first().tagName();
        console.log(`  Tag: <${tagName.toLowerCase()}>`);
      }
    }

    console.log('\n🔍 All elements with role="combobox" (likely Select components):');
    const comboboxes = await page.locator('[role="combobox"]').all();
    for (let i = 0; i < comboboxes.length; i++) {
      const ariaLabel = await comboboxes[i].getAttribute('aria-label');
      const value = await comboboxes[i].getAttribute('data-placeholder') || await comboboxes[i].textContent();
      console.log(`Combobox ${i}: aria-label="${ariaLabel}" content="${value}"`);
    }

    console.log('\n🔍 All button elements with text content:');
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      if (text && text.trim() && !text.includes('▶')) {
        console.log(`Button: "${text.trim()}"`);
      }
    }

    await page.screenshot({ path: 'form_debug_detailed.png' });

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugFormElements();