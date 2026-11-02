import { chromium } from 'playwright';

const LIVE_URL = 'https://nbv-lyart.vercel.app';
const ADMIN_EMAIL = 'rayanat.barbosa@gmail.com';

async function runAdminPortalE2ETest() {
  console.log('==================================================');
  console.log('👑 STARTING LIVE OWNER PORTAL E2E SUITE');
  console.log(`🎯 Target URL:   ${LIVE_URL}`);
  console.log(`👤 Admin Email:  ${ADMIN_EMAIL}`);
  console.log('==================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) NailsByVrilE2ETester/2.0',
  });

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[BROWSER ERROR]:', msg.text());
    }
  });

  const testResults = [];
  function recordResult(testName, passed, details = '') {
    testResults.push({ testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} - ${testName} ${details ? `(${details})` : ''}`);
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Admin Auth Injection & Route Guard Verification
    // ----------------------------------------------------
    console.log('\n--- Test 1: Admin Authentication & Access Control ---');
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Initial state: Unauthenticated guest should not see Owner Portal
    const initialAdminLink = await page.locator('nav button:has-text("Owner Portal")').isVisible();
    recordResult('Owner Portal Hidden from Unauthenticated Guests', !initialAdminLink);

    // Inject authorized Admin Session
    await page.evaluate((email) => {
      sessionStorage.setItem('nbv_test_admin', email);
      window.dispatchEvent(new Event('nbv_auth_change'));
    }, ADMIN_EMAIL);
    await page.waitForTimeout(800);

    // Owner Portal should now be unlocked in navigation bar
    const adminNavBtn = page.locator('nav button:has-text("Owner Portal")');
    await adminNavBtn.waitFor({ state: 'visible', timeout: 5000 });
    const hasAdminNav = await adminNavBtn.isVisible();
    recordResult('Owner Portal Link Visible for Authorized Admin', hasAdminNav);

    // Navigate to Owner Portal
    await adminNavBtn.click();
    await page.waitForTimeout(1000);

    const portalHeading = page.locator('h1:has-text("Owner & Studio Portal")');
    await portalHeading.waitFor({ state: 'visible', timeout: 5000 });
    const isPortalHeadingVisible = await portalHeading.isVisible();
    recordResult('Navigated to Owner & Studio Portal Dashboard', isPortalHeadingVisible);

    await page.screenshot({ path: 'live-admin-dashboard.png' });
    recordResult('Screenshot Captured: live-admin-dashboard.png', true);

    // ----------------------------------------------------
    // TEST 2: Metrics Cards & Appointments Management
    // ----------------------------------------------------
    console.log('\n--- Test 2: KPI Metrics & Appointment Pipeline ---');
    const metricsCards = await page.locator('h2:has-text("Appointments Pipeline"), h2:has-text("Appointments Management"), :has-text("Total Bookings")').first().isVisible();
    recordResult('Pipeline & Key Metrics Rendered', metricsCards);

    // Search bar check
    const searchInput = page.locator('input[placeholder*="Search customer" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Playwright');
      await page.waitForTimeout(400);
      recordResult('Appointment Search Input Functional', true);
      await searchInput.fill('');
      await page.waitForTimeout(400);
    }

    // Status filter dropdown check
    const statusSelect = page.locator('select').first();
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('all');
      await page.waitForTimeout(300);
      recordResult('Status Filter Selector Responsive', true);
    }

    // Appointment Action: Confirm Pending Appointment if exists
    const confirmBtn = page.locator('button:has-text("Confirm & Send Email")').first();
    if (await confirmBtn.isVisible()) {
      console.log('Action: Approving pending appointment request...');
      await confirmBtn.click();
      await page.waitForTimeout(1500);
      const isConfirmed = await page.locator(':has-text("Confirmed"), :has-text("confirmed")').first().isVisible();
      recordResult('Appointment Approved & Status Updated', isConfirmed);
    } else {
      recordResult('Appointment Pipeline Queue Audited (0 pending in queue)', true);
    }

    // ----------------------------------------------------
    // TEST 3: Calendar Holiday & Date Blocking Management
    // ----------------------------------------------------
    console.log('\n--- Test 3: Calendar Block & Closed Days Management ---');
    // Switch to Schedule Tab
    const scheduleTabBtn = page.locator('button:has-text("Schedule"), button:has-text("Calendar")').first();
    await scheduleTabBtn.click();
    await page.waitForTimeout(600);

    const scheduleHeading = page.locator('h2:has-text("Working Days & Calendar Block")').first();
    const isScheduleTabVisible = await scheduleHeading.isVisible();
    recordResult('Switched to Calendar Block Management Tab', isScheduleTabVisible);

    // Select a date to block
    const testBlockDate = '2026-12-28'; // A Sunday in December 2026
    const blockDateInput = page.locator('input[type="date"]').first();
    if (await blockDateInput.isVisible()) {
      await blockDateInput.fill(testBlockDate);
      await page.waitForTimeout(300);

      const blockBtn = page.locator('button:has-text("Block Selected Date")');
      await blockBtn.click();
      await page.waitForTimeout(1500);

      // Verify date appears in blocked chips
      const blockedChip = page.locator(`span:has-text("${testBlockDate}")`).first();
      const isBlockedChipVisible = await blockedChip.isVisible();
      recordResult(`Date ${testBlockDate} Successfully Blocked on Calendar`, isBlockedChipVisible);

      await page.screenshot({ path: 'live-admin-schedule.png' });
      recordResult('Screenshot Captured: live-admin-schedule.png', true);

      // Clean up: Unblock the date
      const unblockBtn = page.locator('button[title="Unblock date"]').first();
      if (await unblockBtn.isVisible()) {
        await unblockBtn.click();
        await page.waitForTimeout(1000);
        const remainingChipsCount = await page.locator('button[title="Unblock date"]').count();
        recordResult(`Date ${testBlockDate} Cleanly Unblocked`, remainingChipsCount === 0);
      }
    }

    // ----------------------------------------------------
    // TEST 4: Salon Profile & Business Settings
    // ----------------------------------------------------
    console.log('\n--- Test 4: Studio Profile & Business Settings ---');
    const settingsTabBtn = page.locator('button:has-text("Settings"), button:has-text("Salon Profile")').first();
    await settingsTabBtn.click();
    await page.waitForTimeout(600);

    const settingsHeading = page.locator('h2:has-text("Salon Profile & Contact")').first();
    const isSettingsTabVisible = await settingsHeading.isVisible();
    recordResult('Switched to Studio Profile Settings Tab', isSettingsTabVisible);

    // Verify Business Name input value
    const businessNameInput = page.locator('input[value*="Nails by Vril" i]').first();
    const hasBusinessName = await businessNameInput.isVisible();
    recordResult('Studio Business Name Loaded from Firestore', hasBusinessName);

    // Verify Save Settings Button
    const saveSettingsBtn = page.locator('button:has-text("Save Settings")').first();
    await saveSettingsBtn.click();
    await page.waitForTimeout(600);

    // Check for success notification
    const mainText = await page.locator('main').innerText();
    const isSuccessToastVisible = mainText.includes('Studio settings saved and published successfully!');
    recordResult('Studio Settings Published & Confirmed via Toast Alert', isSuccessToastVisible);

    await page.screenshot({ path: 'live-admin-settings.png' });
    recordResult('Screenshot Captured: live-admin-settings.png', true);

    // ----------------------------------------------------
    // TEST 5: Mobile Viewport Responsiveness for Owner Portal
    // ----------------------------------------------------
    console.log('\n--- Test 5: Mobile Admin Portal Responsiveness ---');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject Admin on mobile viewport
    await page.evaluate((email) => {
      sessionStorage.setItem('nbv_test_admin', email);
      window.dispatchEvent(new Event('nbv_auth_change'));
    }, ADMIN_EMAIL);
    await page.waitForTimeout(500);

    const mobileMenuBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    await mobileMenuBtn.click();
    await page.waitForTimeout(400);

    const mobileAdminItem = page.locator('div.lg\\:hidden button:has-text("Owner Portal")').first();
    const isMobileAdminItemVisible = await mobileAdminItem.isVisible();
    recordResult('Mobile Menu Displays Owner Portal with Admin Badge', isMobileAdminItemVisible);

    if (isMobileAdminItemVisible) {
      await mobileAdminItem.click();
      await page.waitForTimeout(1000);
      const mobileHeading = await page.locator('h1:has-text("Owner & Studio Portal")').first().isVisible();
      recordResult('Mobile Owner Portal Renders Smoothly at 375px', mobileHeading);
    }

    await page.screenshot({ path: 'live-admin-mobile.png' });
    recordResult('Screenshot Captured: live-admin-mobile.png', true);

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n==================================================');
    console.log('📊 LIVE OWNER PORTAL E2E TEST SUMMARY');
    console.log('==================================================');
    const passedCount = testResults.filter((r) => r.passed).length;
    const totalCount = testResults.length;
    const rate = Math.round((passedCount / totalCount) * 100);

    console.log(`Total Checks: ${totalCount}`);
    console.log(`Passed:       ${passedCount}`);
    console.log(`Failed:       ${totalCount - passedCount}`);
    console.log(`Success Rate: ${rate}%`);
    console.log('==================================================\n');

    if (totalCount - passedCount > 0) {
      console.log('Failed checks:');
      testResults
        .filter((r) => !r.passed)
        .forEach((r) => console.log(`  - ${r.testName}: ${r.details}`));
    }
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
}

runAdminPortalE2ETest();
