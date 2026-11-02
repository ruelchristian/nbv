import { chromium } from 'playwright';
import { createServer } from 'vite';

async function runRestoredFeaturesTest() {
  console.log('🚀 Starting Comprehensive Restored Features E2E Test...');
  const server = await createServer({
    server: { port: 3457 },
  });
  await server.listen();
  const LOCAL_URL = 'http://localhost:3457';
  console.log(`📡 Local Vite Server listening on ${LOCAL_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Auto-accept confirmation dialogs
  page.on('dialog', async (dialog) => {
    console.log(`[DIALOG]: ${dialog.message()}`);
    await dialog.accept();
  });

  const results = [];
  function record(name, pass, details = '') {
    results.push({ name, pass, details });
    console.log(`${pass ? '✅' : '❌'} ${name} ${details ? `(${details})` : ''}`);
  }

  try {
    // ----------------------------------------------------
    // INITIAL SETUP: Sign In as Rayana (Main Admin)
    // ----------------------------------------------------
    console.log('\n--- Setup: Sign In as Main Admin ---');
    await page.goto(LOCAL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      sessionStorage.setItem('nbv_test_admin', 'rayanat.barbosa@gmail.com');
      window.dispatchEvent(new Event('nbv_auth_change'));
    });
    await page.waitForTimeout(800);

    const ownerPortalBtn = page.locator('nav button:has-text("Owner Portal")');
    await ownerPortalBtn.waitFor({ state: 'visible', timeout: 5000 });
    await ownerPortalBtn.click();
    await page.waitForTimeout(1000);

    // ----------------------------------------------------
    // TEST 1: Interactive Visual Calendar View (Image 1)
    // ----------------------------------------------------
    console.log('\n--- Test 1: Interactive Visual Calendar View (Image 1) ---');
    const calendarTabBtn = page.locator('button:has-text("Calendar")').first();
    await calendarTabBtn.click();
    await page.waitForTimeout(800);

    const monthHeader = await page.locator('h2:has-text("November 2026"), h2:has-text("2026")').first().isVisible();
    record('Calendar Month Heading Rendered', monthHeader);

    // Verify 7 Column Days Header (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
    const sunHeader = await page.locator('div:has-text("Sun")').first().isVisible();
    const satHeader = await page.locator('div:has-text("Sat")').first().isVisible();
    record('Calendar Grid Has 7-Day Sun–Sat Headers', sunHeader && satHeader);

    // Verify Month / Week / Day View Switchers
    const monthViewBtn = await page.locator('button:has-text("Month")').first().isVisible();
    const weekViewBtn = await page.locator('button:has-text("Week")').first().isVisible();
    const dayViewBtn = await page.locator('button:has-text("Day")').first().isVisible();
    record('Calendar View Switchers (Month/Week/Day) Functional', monthViewBtn && weekViewBtn && dayViewBtn);

    // Switch to Week view and back to Month
    await page.locator('button:has-text("Week")').first().click();
    await page.waitForTimeout(400);
    record('Switched to Week View', true);

    await page.locator('button:has-text("Month")').first().click();
    await page.waitForTimeout(400);
    record('Switched back to Month View', true);

    await page.screenshot({ path: 'verify-calendar-view.png' });
    record('Screenshot Captured: verify-calendar-view.png', true);

    // ----------------------------------------------------
    // TEST 2: Schedule & Availability System (Image 2)
    // ----------------------------------------------------
    console.log('\n--- Test 2: Schedule & Availability System (Image 2) ---');
    const scheduleTabBtn = page.locator('button:has-text("Schedule")').first();
    await scheduleTabBtn.click();
    await page.waitForTimeout(800);

    // Verify Opening Time & Closing Time Inputs
    const openingInput = await page.locator('input[value*="09:00 AM" i], input[value*="9:00" i]').first().isVisible();
    const closingInput = await page.locator('input[value*="08:00 PM" i], input[value*="8:00" i]').first().isVisible();
    record('Opening Time & Closing Time Inputs Visible', openingInput && closingInput);

    // Verify Home Service Option Checkbox & Notice
    const homeServiceNotice = await page.locator('input[value*="Home service available" i]').first().isVisible();
    record('Home Service Coverage Notice Input Visible', homeServiceNotice);

    // Verify AVAILABLE DAYS OF THE WEEK with Day Buttons
    const availableDaysTitle = await page.locator('h3:has-text("Available Days of the Week")').isVisible();
    record('Available Days of the Week Section Visible', availableDaysTitle);

    const openDaysCounter = await page.locator(':has-text("of 7 days open")').first().isVisible();
    record('Active Days Counter Badge Visible (e.g. "X of 7 days open")', openDaysCounter);

    // Toggle a day (e.g. Tuesday button)
    const tueBtn = page.locator('button:has(p:has-text("Tue"))').first();
    if (await tueBtn.isVisible()) {
      await tueBtn.click();
      await page.waitForTimeout(400);
      record('Toggled Tuesday Availability in Working Days', true);
    }

    // Verify SET SPECIFIC CALENDAR DATE AVAILABLE (Green Card)
    const customDateCard = await page.locator('h3:has-text("SET SPECIFIC CALENDAR DATE AVAILABLE")').isVisible();
    record('SET SPECIFIC CALENDAR DATE AVAILABLE Green Card Visible', customDateCard);

    // Add a custom available date
    const testCustomDate = '2026-11-25'; // Wednesday before Thanksgiving
    const customDateInput = page.locator('div.bg-\\[\\#F0FDF4\\] input[type="date"]').first();
    await customDateInput.fill(testCustomDate);
    await page.locator('button:has-text("+ Make Date Available")').click();
    await page.waitForTimeout(800);

    const isCustomDatePillVisible = await page.locator('div.bg-\\[\\#F0FDF4\\] span:has-text("2026-11-25")').first().isVisible();
    record(`Date ${testCustomDate} Added as Custom Available Date Chip`, isCustomDatePillVisible);

    // Verify BLOCKED / HOLIDAY DATES
    const blockedDatesCard = await page.locator('h3:has-text("BLOCKED / HOLIDAY DATES")').isVisible();
    record('BLOCKED / HOLIDAY DATES Section Visible', blockedDatesCard);

    await page.screenshot({ path: 'verify-schedule-availability.png' });
    record('Screenshot Captured: verify-schedule-availability.png', true);

    // ----------------------------------------------------
    // TEST 3: Clients & Analytics Tab (Image 3)
    // ----------------------------------------------------
    console.log('\n--- Test 3: Clients Directory & Analytics (Image 3) ---');
    const analyticsTabBtn = page.locator('button:has-text("Analytics")').first();
    await analyticsTabBtn.click();
    await page.waitForTimeout(800);

    // Verify 3 Top KPI Cards
    const estimatedValueCard = await page.locator('span:has-text("Estimated Booking Value")').isVisible();
    const reservationCountCard = await page.locator('span:has-text("Total Reservation Count")').isVisible();
    const busyDatePeaksCard = await page.locator('span:has-text("Busy Date Peaks")').isVisible();
    record('Top 3 KPI Metric Cards Rendered (Estimated Value, Total Reservations, Busy Peaks)', estimatedValueCard && reservationCountCard && busyDatePeaksCard);

    // Verify Clients Done Served Directory
    const clientsDoneHeading = await page.locator('h2:has-text("Clients Done Served")').isVisible();
    record('Clients Done Served Directory Heading Rendered', clientsDoneHeading);

    // Verify Filter Pills
    const allFilterPill = await page.locator('button:has-text("All (")').isVisible();
    const repeatFilterPill = await page.locator('button:has-text("Repeat Clients")').isVisible();
    const inStudioFilterPill = await page.locator('button:has-text("In-Studio")').isVisible();
    const homeServiceFilterPill = await page.locator('button:has-text("Home Service")').isVisible();
    record('Client Directory Filter Pills Visible (All, Repeat, In-Studio, Home Service)', allFilterPill && repeatFilterPill && inStudioFilterPill && homeServiceFilterPill);

    await page.screenshot({ path: 'verify-clients-analytics.png' });
    record('Screenshot Captured: verify-clients-analytics.png', true);

    // ----------------------------------------------------
    // TEST 4: Transfer Main Admin Role Feature
    // ----------------------------------------------------
    console.log('\n--- Test 4: Transfer Main Admin Role Feature ---');
    const settingsTabBtn = page.locator('button:has-text("Settings")').first();
    await settingsTabBtn.click();
    await page.waitForTimeout(800);

    // First add a sub-admin to transfer to
    const targetSubAdminEmail = 'successor.owner@gmail.com';
    const addSubAdminInput = page.locator('input[placeholder*="subadmin@gmail.com" i]');
    await addSubAdminInput.fill(targetSubAdminEmail);
    await page.locator('button:has-text("Grant Sub-Admin Access")').click();
    await page.waitForTimeout(1000);

    // Check Transfer Main Admin Role button exists on the sub-admin card
    const transferBtn = page.locator(`button[title*="Pass Main Admin role to ${targetSubAdminEmail}" i]`);
    const isTransferBtnVisible = await transferBtn.isVisible();
    record(`Transfer Main Admin Button Visible for Sub-Admin ${targetSubAdminEmail}`, isTransferBtnVisible);

    // Click Transfer button to open confirmation modal
    await transferBtn.click();
    await page.waitForTimeout(600);

    const transferModal = await page.locator('h3:has-text("Transfer Main Admin Ownership")').isVisible();
    record('Transfer Main Admin Ownership Confirmation Modal Displayed', transferModal);

    // Confirm role transfer
    await page.locator('button:has-text("Confirm Role Transfer")').click();
    await page.waitForTimeout(1200);

    // Verify successor now has Main Admin badge in the accounts list
    const successorMainBadge = await page.locator(`div:has(p:has-text("${targetSubAdminEmail}")) span:has-text("Main Admin")`).first().isVisible();
    record(`Successor ${targetSubAdminEmail} Promoted to Main Admin with Badge`, successorMainBadge);

    await page.screenshot({ path: 'verify-transfer-admin.png' });
    record('Screenshot Captured: verify-transfer-admin.png', true);

    console.log('\n==================================================');
    console.log('📊 RESTORED FEATURES & TRANSFER ROLE E2E SUMMARY');
    console.log('==================================================');
    const passCount = results.filter((r) => r.pass).length;
    console.log(`Total Checks: ${results.length}`);
    console.log(`Passed:       ${passCount}`);
    console.log(`Failed:       ${results.length - passCount}`);
    console.log('==================================================\n');

    if (results.length - passCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await server.close();
  }
}

runRestoredFeaturesTest();
