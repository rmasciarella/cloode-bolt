const { chromium } = require('playwright');

async function simpleFormDebug() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Navigate to sequence resources
    await page.click('button:has-text("Resources")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Sequence Resources")');
    await page.waitForTimeout(1000);

    // Print the HTML content of the form
    const formHTML = await page.locator('form').innerHTML();
    console.log('=== FORM HTML ===');
    console.log(formHTML);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

simpleFormDebug();