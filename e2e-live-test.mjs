import { chromium } from 'playwright';

const LIVE_URL = 'https://nbv-lyart.vercel.app';

async function runLiveE2ETest() {
  console.log(`\n==================================================`);
  console.log(`🚀 STARTING LIVE BLACK-BOX & E2E TEST`);
  console.log(`🎯 Target URL: ${LIVE_URL}`);
  console.log(`==================================================\n`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });
  page.on('pageerror', err => console.log('[BROWSER UNCAUGHT]:', err.message));

  const testResults = [];

  function recordResult(testName, passed, details = '') {
    testResults.push({ testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} - ${testName} ${details ? `(${details})` : ''}`);
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Page Load, Meta & Title
    // ----------------------------------------------------
    console.log(`\n--- Test 1: Production Site Accessibility & Branding ---`);
    const response = await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    const status = response.status();
    recordResult('HTTP 200 OK', status === 200, `Status: ${status}`);

    const title = await page.title();
    recordResult('Page Title Contains Brand', title.includes('Nails By Vril'), `Title: "${title}"`);

    const logoVisible = await page.locator('img[alt="Nails by Vril"]').first().isVisible();
    recordResult('Official Brand Logo Visible', logoVisible);

    const heroHeading = await page.locator('h1').first().textContent();
    recordResult('Hero Heading Rendered', heroHeading.includes('Nail Artistry') || heroHeading.includes('Elevated'), `Heading: "${heroHeading.trim()}"`);

    await page.screenshot({ path: 'live-home.png' });
    recordResult('Screenshot Captured: live-home.png', true);

    // ----------------------------------------------------
    // TEST 2: Navigation Security & Role Visibility Audit (Black Box)
    // ----------------------------------------------------
    console.log(`\n--- Test 2: Role Visibility & Auth Guards Audit ---`);
    const navbarText = await page.locator('nav').textContent();

    const hasHome = navbarText.includes('Home');
    const hasServices = navbarText.includes('Services');
    const hasBook = navbarText.includes('Book');
    const hasSignIn = navbarText.includes('Sign In');
    recordResult('Public Nav Items Rendered (Home, Services, Book, Sign In)', hasHome && hasServices && hasBook && hasSignIn);

    const hasOwnerPortalInNav = navbarText.includes('Owner Portal');
    const hasMyBookingsInNav = navbarText.includes('My Bookings');
    recordResult('Owner Portal Hidden for Public Guests', !hasOwnerPortalInNav, hasOwnerPortalInNav ? 'LEAKED' : 'Properly Hidden');
    recordResult('My Bookings Hidden for Public Guests', !hasMyBookingsInNav, hasMyBookingsInNav ? 'LEAKED' : 'Properly Hidden');

    // ----------------------------------------------------
    // TEST 3: Services & Price List Page
    // ----------------------------------------------------
    console.log(`\n--- Test 3: Services Catalog & Category Filtering ---`);
    await page.locator('nav button:has-text("Services & Pricing")').click();
    await page.waitForTimeout(600);

    const servicesPageHeading = await page.locator('h1').textContent();
    recordResult('Navigated to Services & Price List Page', servicesPageHeading.includes('Services & Price List'));

    const priceListCards = await page.locator('h3:has-text("Hardgel, BIAB & Short Extensions")').isVisible();
    recordResult('Official Visual Price List Card Rendered', priceListCards);

    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Removal');
      await page.waitForTimeout(400);
      const filteredCount = await page.locator('h3:has-text("Nail Removal")').count();
      recordResult('Services Search Filter Works', filteredCount > 0, `Found ${filteredCount} matching services`);
      await searchInput.fill('');
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: 'live-services.png' });
    recordResult('Screenshot Captured: live-services.png', true);

    // ----------------------------------------------------
    // TEST 4: Full 6-Step Booking Wizard E2E
    // ----------------------------------------------------
    console.log(`\n--- Test 4: Full 6-Step Appointment Booking Flow ---`);
    await page.locator('nav button:has-text("Book Appointment")').first().click();
    await page.waitForTimeout(800);

    // Step 1: Select In-Studio Service
    const inStudioCard = page.locator('h4:has-text("In-Studio")');
    await inStudioCard.click();
    await page.waitForTimeout(400);

    // Select Nail Style Option (Hardgel & BIAB)
    const nailStyleCard = page.locator('h5:has-text("Hardgel & BIAB Overlay")').first();
    await nailStyleCard.click();
    await page.waitForTimeout(400);
    recordResult('Wizard Step 1: Service & Style Selected (In-Studio + Hardgel & BIAB)', true);

    // Click "Continue to Date"
    const continueToDateBtn = page.locator('button:has-text("Continue to Date")');
    await continueToDateBtn.click();
    await page.waitForTimeout(800);

    // Step 2: Date Picker
    console.log('Wizard Step 2: Selecting Sunday/Monday date...');
    const quickDateBtn = page.locator('button:has(span:has-text("Sunday")), button:has(span:has-text("Monday"))').first();
    if (await quickDateBtn.isVisible()) {
      await quickDateBtn.click();
      await page.waitForTimeout(400);
      recordResult('Wizard Step 2: Sunday/Monday Date Selected', true);
    }

    // Click "Check Time Slots"
    const checkTimeSlotsBtn = page.locator('button:has-text("Check Time Slots")');
    await checkTimeSlotsBtn.click();
    await page.waitForTimeout(800);

    // Step 3: Time Slot
    console.log('Wizard Step 3: Selecting Time Slot...');
    const slotBtn = page.locator('button:has-text("Available"):not([disabled]), button:not([disabled]):has-text("AM"), button:not([disabled]):has-text("PM")').first();
    await slotBtn.waitFor({ state: 'visible', timeout: 15000 });
    const slotText = await slotBtn.textContent();
    await slotBtn.click();
    await page.waitForTimeout(400);
    recordResult('Wizard Step 3: Available Time Slot Selected', true, slotText.replace(/\s+/g, ' ').trim());

    // Click "Enter Contact Details"
    const continueToContactBtn = page.locator('button:has-text("Enter Contact Details"), button:has-text("Contact Details")').first();
    await continueToContactBtn.click();
    await page.waitForTimeout(800);

    // Step 4: Contact Form
    console.log('Wizard Step 4: Filling Contact Details...');
    const nameInput = page.locator('input[placeholder*="Maria" i], input[placeholder*="Santos" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('Playwright Live Tester');

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('tester@nailsbyvril.com');

    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.fill('09170001234');
    recordResult('Wizard Step 4: Contact Form Filled (Name, Phone, Email)', true);

    // Click "Review Details"
    const reviewBtn = page.locator('button:has-text("Review Details")').first();
    await reviewBtn.click();
    await page.waitForTimeout(1000);

    // Step 5: Review Summary
    console.log('Wizard Step 5: Reviewing Booking Summary...');
    const reviewContent = await page.locator('main').textContent();
    const hasService = reviewContent.includes('In-Studio');
    const hasPrice = reviewContent.includes('₱');
    const hasCustomer = reviewContent.includes('Playwright Live Tester');
    recordResult('Wizard Step 5: Order Summary Validated (Service, Price, Customer)', hasService && hasPrice && hasCustomer);

    // Submit Booking Request
    console.log('Wizard Step 5: Submitting Request...');
    const submitBtn = page.locator('button:has-text("Confirm & Submit Request")');
    await submitBtn.click();
    
    // Wait for Step 6 Voucher to appear
    console.log('Wizard Step 6: Waiting for Confirmation Voucher...');
    try {
      const voucherHeading = page.locator('h2:has-text("Appointment Reserved Successfully"), :has-text("Official Booking Voucher")').first();
      await voucherHeading.waitFor({ state: 'visible', timeout: 15000 });
      const isVoucherVisible = await voucherHeading.isVisible();
      recordResult('Wizard Step 6: Confirmation Voucher Generated Successfully!', isVoucherVisible);
    } catch (e) {
      const mainText = await page.locator('main').innerText();
      console.log('--- SCREEN CONTENT ON TIMEOUT ---:\n', mainText.slice(0, 1000));
      await page.screenshot({ path: 'live-submit-error.png' });
      throw e;
    }

    await page.screenshot({ path: 'live-voucher.png' });
    recordResult('Screenshot Captured: live-voucher.png', true);

    // ----------------------------------------------------
    // TEST 5: Mobile Viewport & Responsiveness
    // ----------------------------------------------------
    console.log(`\n--- Test 5: Mobile Viewport & Responsiveness ---`);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const hamburgerBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    const isHamburgerVisible = await hamburgerBtn.isVisible();
    recordResult('Mobile Hamburger Menu Icon Rendered', isHamburgerVisible);

    if (isHamburgerVisible) {
      await hamburgerBtn.click();
      await page.waitForTimeout(500);
      const mobileMenuVisible = await page.locator('div.lg\\:hidden button:has-text("Services & Pricing")').isVisible();
      recordResult('Mobile Menu Opens with Navigation Links', mobileMenuVisible);
    }

    await page.screenshot({ path: 'live-mobile.png' });
    recordResult('Screenshot Captured: live-mobile.png', true);

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log(`\n==================================================`);
    console.log(`📊 LIVE PRODUCTION E2E TEST SUMMARY`);
    console.log(`==================================================`);
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`Total Checks: ${total}`);
    console.log(`Passed:       ${passed}`);
    console.log(`Failed:       ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      console.log('Failed checks:');
      testResults.filter((r) => !r.passed).forEach((r) => console.log(`  - ${r.testName}: ${r.details}`));
    }
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await browser.close();
  }
}

runLiveE2ETest();
