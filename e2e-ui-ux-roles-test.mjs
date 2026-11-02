import { createServer } from 'vite';
import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Running UI/UX Role Separation & Walk-In Booking E2E Test...');
  const server = await createServer({
    server: { port: 0 },
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`📡 Local Vite Server listening on ${baseUrl}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.error(`[BROWSER UNCAUGHT]: ${err.message}`);
  });

  let passed = 0;
  let total = 0;
  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(message);
    }
  }

  try {
    // === SCENARIO 1: Guest / Customer View ===
    console.log('\n--- Scenario 1: Guest / Customer UI/UX ---');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 1. Guest Navbar has "Book Appointment"
    const guestBookBtn = page.locator('nav button:has-text("Book Appointment")');
    assert(await guestBookBtn.isVisible(), 'Guest Navbar shows "Book Appointment" highlight button');

    // 2. Guest Navbar does NOT show "Owner Portal"
    const guestOwnerPortal = page.locator('nav button:has-text("Owner Portal")');
    assert((await guestOwnerPortal.count()) === 0, 'Guest Navbar does NOT show "Owner Portal"');

    // 3. Guest Homepage Hero has "Book Appointment"
    const heroBookBtn = page.locator('section button:has-text("Book Appointment")');
    assert(await heroBookBtn.isVisible(), 'Homepage Hero shows "Book Appointment" for customers');

    // 4. Guest Top Admin Preview Banner is NOT visible
    const adminBanner = page.locator('text=Viewing Live Studio Website');
    assert((await adminBanner.count()) === 0, 'Admin Preview Banner is hidden for guests');

    // === SCENARIO 2: Main Admin View ===
    console.log('\n--- Scenario 2: Main Admin UI/UX ---');
    await page.evaluate(() => {
      sessionStorage.setItem('nbv_test_admin', 'ruelchristianumel@gmail.com');
      window.dispatchEvent(new Event('nbv_auth_change'));
    });
    await page.waitForTimeout(1000);

    // 5. Admin Navbar shows "Owner Portal" as prominent highlighted button
    const adminOwnerPortal = page.locator('nav button:has-text("Owner Portal")');
    assert(await adminOwnerPortal.isVisible(), 'Admin Navbar shows "Owner Portal" with Admin badge');

    // 6. Admin Navbar DOES NOT have "Book Appointment"
    const adminBookBtn = page.locator('nav button:has-text("Book Appointment")');
    assert((await adminBookBtn.count()) === 0, 'Admin Navbar REMOVED "Book Appointment" CTA');

    // 7. Check Studio Site Preview mode: click "Studio Site"
    const studioSiteLink = page.locator('nav button:has-text("Studio Site")');
    if (await studioSiteLink.isVisible()) {
      await studioSiteLink.click();
      await page.waitForTimeout(600);

      // 8. Top Admin Preview Banner is visible
      const adminPreviewTop = page.locator('text=Viewing Live Studio Website');
      assert(await adminPreviewTop.isVisible(), 'Admin Preview Banner is visible when viewing public site');

      // 9. Homepage Hero shows "Open Owner Portal" instead of forcing booking
      const heroAdminBtn = page.locator('section button:has-text("Open Owner Portal")');
      assert(await heroAdminBtn.isVisible(), 'Homepage Hero shows "Open Owner Portal" for logged-in Admin');

      // 10. Click Return to Owner Portal
      const returnBtn = page.getByRole('button', { name: /Return to Owner Portal/i });
      await returnBtn.click();
      await page.waitForTimeout(800);
    } else {
      await adminOwnerPortal.click();
      await page.waitForTimeout(800);
    }

    // 11. Now in Owner Portal: Verify "+ Walk-In Booking" button on Appointments tab
    const walkInBtnAppts = page.locator('button:has-text("+ Walk-In Booking")');
    assert(await walkInBtnAppts.isVisible(), 'Appointments tab has "+ Walk-In Booking" button');

    // 12. Open Walk-In Modal
    await walkInBtnAppts.click();
    await page.waitForTimeout(500);

    const walkInModalHeader = page.locator('h3:has-text("Add Walk-In / Direct Reservation")');
    assert(await walkInModalHeader.isVisible(), 'Walk-In Booking Modal successfully opened');

    // 13. Fill in Walk-In details
    const uniqueClientName = `Jessica Walkin ${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder="e.g. Maria Santos"]', uniqueClientName);
    await page.fill('input[placeholder="e.g. 0917 123 4567"]', '09179998888');
    
    // Pick next Sunday dynamically based on timestamp
    const daysOffset = 14 + (Math.floor(Date.now() / 1000) % 20) * 7;
    const futureDate = new Date(Date.now() + daysOffset * 86400000);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);

    const times = ['10:00 AM', '11:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM', '07:00 PM'];
    const randomTime = times[Math.floor(Math.random() * times.length)];
    await page.selectOption('select:has-text("10:00 AM")', randomTime);
    await page.fill('textarea[placeholder*="chrome french tips"]', 'Walk-in requested almond shape and builder gel');

    // 14. Submit Walk-In Booking
    const submitWalkInBtn = page.locator('button:has-text("Confirm & Log Booking")');
    await submitWalkInBtn.click();
    await page.waitForTimeout(1500);

    // 15. Verify toast message
    const toast = page.locator(`text=Walk-in appointment recorded for ${uniqueClientName}!`);
    assert(await toast.isVisible(), 'Success toast displayed confirming walk-in booking');

    // 16. Verify newly added walk-in appointment appears in the list
    const newWalkInCard = page.getByRole('heading', { name: uniqueClientName });
    assert(await newWalkInCard.isVisible(), 'New walk-in client is listed in the appointments pipeline');

    // 17. Verify Calendar tab has "+ Walk-In" button
    const calendarTabBtn = page.locator('button:has-text("Calendar")').first();
    await calendarTabBtn.click();
    await page.waitForTimeout(600);

    const walkInBtnCal = page.locator('button:has-text("+ Walk-In")');
    assert(await walkInBtnCal.isVisible(), 'Calendar tab has "+ Walk-In" button');

    await page.screenshot({ path: 'verify-ui-ux-roles.png', fullPage: true });
    console.log('✅ Screenshot Saved: verify-ui-ux-roles.png');

    console.log('\n==================================================');
    console.log('📊 UI/UX ROLES & WALK-IN BOOKING SUMMARY');
    console.log('==================================================');
    console.log(`Total Checks: ${total}`);
    console.log(`Passed:       ${passed}`);
    console.log(`Failed:       0`);
    console.log('==================================================\n');
  } finally {
    await browser.close();
    await server.close();
  }
}

runTest().catch((err) => {
  console.error('Fatal error in test:', err);
  process.exit(1);
});
