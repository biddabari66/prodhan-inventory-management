const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  await page.goto('http://localhost:4300/auth');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  // We need to login
  await page.waitForSelector('input[type="email"]', { timeout: 10000 }).catch(() => console.log('no email input'));
  try {
    await page.type('input[type="email"]', 'admin@prodhan.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
  } catch (e) {}
  
  // Wait for login to complete
  await new Promise(r => setTimeout(r, 3000));
  
  // Go to Sales page
  await page.goto('http://localhost:4300/sales-orders');
  
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
