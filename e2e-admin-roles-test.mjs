import { chromium } from 'playwright';
import { createServer } from 'vite';

async function runRolesTest() {
  console.log('🚀 Starting Admin Roles & Permissions E2E Test...');
  const server = await createServer({
    server: { port: 3456 },
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const LOCAL_URL = `http://localhost:${port}`;
  console.log(`📡 Local Vite Server listening on ${LOCAL_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Automatically accept confirmation dialogs
  page.on('dialog', async (dialog) => {
    console.log(`[DIALOG ACCEPTED]: ${dialog.message()}`);
    await dialog.accept();
  });

  const results = [];
  function record(name, pass, details = '') {
    results.push({ name, pass, details });
    console.log(`${pass ? '✅' : '❌'} ${name} ${details ? `(${details})` : ''}`);
  }

  try {
    // ----------------------------------------------------
    // SCENARIO 1: Main Admin (Ruel) Access & Controls
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Main Admin (ruelchristianumel@gmail.com) ---');
    await page.goto(LOCAL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject Ruel as Main Admin
    await page.evaluate(() => {
      sessionStorage.setItem('nbv_test_admin', 'ruelchristianumel@gmail.com');
      window.dispatchEvent(new Event('nbv_auth_change'));
    });
    await page.waitForTimeout(800);

    // Navigate to Owner Portal
    const ownerPortalBtn = page.locator('nav button:has-text("Owner Portal")');
    await ownerPortalBtn.waitFor({ state: 'visible', timeout: 5000 });
    await ownerPortalBtn.click();
    await page.waitForTimeout(1000);

    // Verify Main Admin badge in header
    const mainAdminBadge = await page.locator('span:has-text("Main Admin")').first().isVisible();
    record('Main Admin has Crown Badge in Header', mainAdminBadge);

    // Navigate to Settings Tab
    const settingsTabBtn = page.locator('button:has-text("Settings"), button:has-text("Salon Profile")').first();
    await settingsTabBtn.click();
    await page.waitForTimeout(800);

    // Check Authorized Accounts Section
    const accountsHeading = await page.locator('h2:has-text("Authorized Owner & Sub-Admin Accounts")').isVisible();
    record('Authorized Owner & Sub-Admin Accounts Section Visible', accountsHeading);

    // Verify Main Admin CAN see Add Sub-Admin Form
    const addSubAdminInput = page.locator('input[placeholder*="subadmin@gmail.com" i]');
    const isAddInputVisible = await addSubAdminInput.isVisible();
    record('Main Admin Can See Add Sub-Admin Input Form', isAddInputVisible);

    const grantSubAdminBtn = page.locator('button:has-text("Grant Sub-Admin Access")');
    const isGrantBtnVisible = await grantSubAdminBtn.isVisible();
    record('Main Admin Can See Grant Sub-Admin Access Button', isGrantBtnVisible);

    // Check Main Admin account row has "Main Admin" & "(Permanent)"
    const ruelRow = page.locator('div:has-text("ruelchristianumel@gmail.com")').first();
    const isRuelRowVisible = await ruelRow.isVisible();
    record('Main Admin Listed as Active Administrator', isRuelRowVisible);

    const hasPermanentLabel = await page.locator(':has-text("(Permanent)")').first().isVisible();
    record('Main Admin Marked as Permanent', hasPermanentLabel);

    // Verify Main Admin CANNOT be removed (no Trash icon for Main Admin)
    const ruelTrashBtn = page.locator('button[title*="ruelchristianumel@gmail.com"]');
    const hasTrashForRuel = await ruelTrashBtn.isVisible();
    record('Main Admin Cannot Be Removed (No Revoke Button)', !hasTrashForRuel);

    // ----------------------------------------------------
    // SCENARIO 2: Add Sub-Admin & Remove Sub-Admin by Main Admin
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Main Admin Adds and Removes Sub-Admin ---');
    const testSubAdminEmail = 'assistant.test@gmail.com';
    await addSubAdminInput.fill(testSubAdminEmail);
    await grantSubAdminBtn.click();
    await page.waitForTimeout(1500);

    // Check that sub-admin appears in active administrators list
    const newSubAdminCard = page.locator(`p:has-text("${testSubAdminEmail}")`);
    const isNewSubAdminInList = await newSubAdminCard.isVisible();
    record(`Sub-Admin ${testSubAdminEmail} Successfully Added to List`, isNewSubAdminInList);

    // Verify newly added sub-admin has Sub-Admin badge
    const subAdminBadgeText = page.locator(`div:has(p:has-text("${testSubAdminEmail}")) span:has-text("Sub-Admin")`).first();
    const hasSubBadge = await subAdminBadgeText.isVisible();
    record('New Admin Given "Sub-Admin" Role Badge', hasSubBadge);

    // Verify Sub-Admin CAN be removed (Revoke button exists)
    const subAdminTrashBtn = page.locator(`button[title*="Revoke Sub-Admin Access for ${testSubAdminEmail}" i]`);
    const canBeRemoved = await subAdminTrashBtn.isVisible();
    record('Sub-Admin Can Be Removed (Trash/Revoke Button Visible to Main Admin)', canBeRemoved);

    // Main Admin removes the Sub-Admin
    await subAdminTrashBtn.click();
    await page.waitForTimeout(1500);

    // Verify Sub-Admin is removed from the active list
    const isSubAdminStillThere = await page.locator(`p:has-text("${testSubAdminEmail}")`).isVisible();
    record(`Sub-Admin ${testSubAdminEmail} Cleanly Revoked & Removed from List`, !isSubAdminStillThere);

    await page.screenshot({ path: 'admin-roles-main-admin.png' });
    record('Screenshot Saved: admin-roles-main-admin.png', true);

    // ----------------------------------------------------
    // SCENARIO 3: Sub-Admin Restrictions (Cannot Add Another Sub-Admin)
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Sub-Admin Restrictions ---');
    await page.evaluate(() => {
      sessionStorage.setItem('nbv_test_admin', 'staff.member@gmail.com');
      window.dispatchEvent(new Event('nbv_auth_change'));
    });
    await page.waitForTimeout(800);

    // Verify Sub-Admin badge in header
    const headerSubAdminBadge = await page.locator('div:has(h1:has-text("Studio Management & Analytics")) span:has-text("Sub-Admin")').first().isVisible();
    record('Sub-Admin has Sub-Admin Badge in Header', headerSubAdminBadge);

    // Go to Settings tab
    await settingsTabBtn.click();
    await page.waitForTimeout(800);

    // Verify Sub-Admin CANNOT see Add Sub-Admin Form
    const subAdminAddInput = await page.locator('input[placeholder*="subadmin@gmail.com" i]').isVisible();
    record('Sub-Admin CANNOT See Add Sub-Admin Form', !subAdminAddInput);

    const subAdminGrantBtn = await page.locator('button:has-text("Grant Sub-Admin Access")').isVisible();
    record('Sub-Admin CANNOT See Grant Sub-Admin Access Button', !subAdminGrantBtn);

    // Verify Sub-Admin sees Restriction Notice
    const restrictionNotice = page.locator('text=Sub-Admin Restriction');
    const hasNotice = await restrictionNotice.isVisible();
    record('Sub-Admin Restriction Notice Displayed', hasNotice);

    // Verify Sub-Admin CANNOT remove other admins (no trash buttons)
    const anyTrashBtn = await page.locator('button[title*="Revoke Sub-Admin Access" i]').count();
    record('Sub-Admin Cannot Remove Other Administrators (0 Revoke Buttons)', anyTrashBtn === 0);

    await page.screenshot({ path: 'admin-roles-sub-admin.png' });
    record('Screenshot Saved: admin-roles-sub-admin.png', true);

    console.log('\n==================================================');
    console.log('📊 ADMIN ROLES E2E TEST SUMMARY');
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

runRolesTest();
