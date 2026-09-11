// Run with python serve.py. Every browser context uses its own temporary storage.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const runtime = path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(require.resolve('playwright', { paths: [__dirname, runtime] }));
const base = process.env.GAME_REVIEW_URL || 'http://127.0.0.1:8741';
const output = path.join(__dirname, '../tmp/settings-menu');
fs.mkdirSync(output, { recursive: true });
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  async function makePage(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/\/js\/game\.js(?:\?|$)/, async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('    init, newGame, loadGame,',
        '    __menuQA:{input:()=>({mouse:{...mouse},ground:!!groundHold,target:!!heldTarget,touch:{...touch}})},\n    init, newGame, loadGame,');
      await route.fulfill({ response, body });
    });
    return page;
  }
  async function load(page) {
    await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 120000 });
    await page.locator('#titleMenu button').first().waitFor({ timeout: 120000 });
  }
  const tab = (page, name) => page.getByRole('tab', { name, exact: true }).click();
  const titleSettings = page => page.getByRole('button', { name: 'SETTINGS & CONTROLS', exact: true });
  const close = page => page.getByRole('button', { name: 'Close menu', exact: true }).click();
  async function geometry(page, label) {
    const result = await page.evaluate(() => {
      const box = document.querySelector('.menu-shell'), body = document.querySelector('.settings-body');
      const r = box.getBoundingClientRect();
      const chrome = [...box.querySelectorAll('.menu-header button,.settings-tabs button,.menu-footer button')];
      const bad = chrome.filter(el => { const b = el.getBoundingClientRect(); return b.width < 43 || b.height < 43 || b.left < 0 || b.top < 0 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1; });
      const overflow = [...box.querySelectorAll('*')].filter(el => el.getClientRects().length && el.getBoundingClientRect().right > r.right + 1);
      return { fits: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        width: r.width, bad: bad.map(el => el.textContent), overflow: overflow.map(el => el.className),
        scrollWidth: body.scrollWidth, clientWidth: body.clientWidth, height: body.clientHeight };
    });
    ok(result.fits && result.width <= 960 && result.height >= 70, label + ': window/body does not fit');
    equal(result.bad, [], label + ': header or footer targets clipped or undersized');
    equal(result.overflow, [], label + ': content overflows horizontally');
    ok(result.scrollWidth <= result.clientWidth + 1, label + ': horizontal scrolling');
  }
  async function capture(page, label) {
    await geometry(page, label);
    await page.screenshot({ path: path.join(output, label + '.png') });
  }
  try {
    const page = await makePage();
    await page.addInitScript(() => {
      if (localStorage.getItem('menu_qa_seeded')) return;
      localStorage.setItem('menu_qa_seeded', '1');
      localStorage.setItem('embergrave_options', JSON.stringify({ vol: { master: .4, sfx: .25, music: 0 }, leftClickMove: true,
        dmgNumbers: false, minionDamage: true, monResist: true, screenShake: false, minionBars: 'always', alwaysLabels: true, lootFilter: 2 }));
    });
    await load(page);
    ok(await page.evaluate(() => Game.state === null), 'title settings require a hero');
    await titleSettings(page).click();
    ok(await page.evaluate(() => document.querySelector('#title').inert && !document.querySelector('#escmenu').inert), 'title modal is inert or underlying title is interactive');
    equal(await page.locator('#setting-master').inputValue(), '40', 'stored master volume not loaded');
    equal(await page.locator('.setting-value').allTextContents(), ['40%', '25%', '0%'], 'percentages do not match stored audio');
    await capture(page, 'desktop-audio');
    // Native keyboard slider operation must update the actual audio bus and storage.
    for (const [key, value] of [['master', 61], ['sfx', 37], ['music', 12]]) {
      const slider = page.locator('#setting-' + key);
      await slider.focus(); await page.keyboard.press('Home');
      for (let i = 0; i < value; i++) await page.keyboard.press('ArrowRight');
      equal(await page.evaluate(k => Sfx.vol[k], key), value / 100, key + ' audio channel did not update');
      equal(await slider.getAttribute('aria-valuetext'), value + '%', key + ' accessible value stale');
    }
    await tab(page, 'Gameplay');
    ok(await page.locator('#setting-leftClickMove').isChecked(), 'stored movement option not loaded');
    await page.locator('#setting-leftClickMove').uncheck();
    await capture(page, 'desktop-gameplay');
    await tab(page, 'Display');
    equal(await page.locator('#setting-minionBars').inputValue(), 'always', 'stored minion-bar option not loaded');
    await page.locator('#setting-dmgNumbers').check();
    ok(await page.locator('#setting-minionDamage').isChecked(), 'player toggle changed minion damage setting');
    await page.locator('#setting-minionDamage').uncheck();
    ok(await page.locator('#setting-dmgNumbers').isChecked(), 'minion toggle changed player damage setting');
    await page.locator('#setting-monResist').uncheck();
    await page.locator('#setting-screenShake').check();
    for (const mode of ['hit', 'always', 'never']) {
      await page.locator('#setting-minionBars').selectOption(mode);
      equal(await page.evaluate(() => Game.options.minionBars), mode, 'minion-bar mode did not apply');
    }
    await capture(page, 'desktop-display');
    await tab(page, 'Controls');
    let guide = await page.locator('.settings-body').innerText();
    for (const text of ['Space', 'Jump toward the cursor', 'Toggle the loot filter', 'F1', 'F4', 'Talents', 'Temporarily reveal']) ok(guide.includes(text), 'guide missing ' + text);
    equal(await page.locator('[data-device="keyboard"]').getAttribute('aria-pressed'), 'true', 'desktop guide not selected');
    await capture(page, 'desktop-controls');
    await page.getByRole('button', { name: 'Touch', exact: true }).click();
    ok((await page.locator('.settings-body').innerText()).includes('Thumbstick'), 'touch guide unavailable on desktop');
    ok(await page.evaluate(() => !MobileControls.enabled), 'guide selection changed input mode');
    await tab(page, 'Audio'); await tab(page, 'Controls');
    equal(await page.locator('[data-device="touch"]').getAttribute('aria-pressed'), 'true', 'guide selection lost between tabs');
    await page.locator('#settingsTab-controls').focus(); await page.keyboard.press('Home');
    equal(await page.locator('[role=tab][aria-selected=true]').innerText(), 'Audio', 'Home tab navigation');
    await page.keyboard.press('ArrowRight');
    equal(await page.locator('[role=tab][aria-selected=true]').innerText(), 'Gameplay', 'ArrowRight tab navigation');
    await page.keyboard.press('End');
    equal(await page.locator('[role=tab][aria-selected=true]').innerText(), 'Controls', 'End tab navigation');
    await page.keyboard.press('ArrowLeft');
    equal(await page.locator('[role=tab][aria-selected=true]').innerText(), 'Display', 'ArrowLeft tab navigation');
    await page.getByRole('button', { name: 'Back', exact: true }).focus(); await page.keyboard.press('Tab');
    equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close menu', 'forward focus trap');
    await page.keyboard.press('Shift+Tab');
    equal(await page.evaluate(() => document.activeElement.textContent), 'Back', 'reverse focus trap');
    await page.keyboard.press('Escape');
    ok(await page.locator('#escmenu').isHidden(), 'Escape did not return to title');
    ok(await titleSettings(page).evaluate(el => el === document.activeElement && !el.closest('[inert]')), 'title focus/inert state not restored');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('embergrave_options')));
    equal(stored, { leftClickMove: false, dmgNumbers: true, minionDamage: false, monResist: false, screenShake: true, minionBars: 'never', alwaysLabels: true, lootFilter: 2, vol: { master: .61, sfx: .37, music: .12 } }, 'options changed or lost during save');
    await page.reload({ waitUntil: 'load' }); await titleSettings(page).click();
    equal(await page.locator('.setting-value').allTextContents(), ['61%', '37%', '12%'], 'audio did not survive reload');
    equal(await page.evaluate(() => ({ ...Game.options, vol: { ...Sfx.vol } })), stored, 'options did not survive reload');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    ok(await titleSettings(page).evaluate(el => el === document.activeElement), 'Back title focus');
    await titleSettings(page).click(); await close(page);
    ok(await titleSettings(page).evaluate(el => el === document.activeElement), 'Close title focus');
    console.log('PASS title access, settings persistence, device guides and keyboard navigation.');

    await page.evaluate(async () => {
      Sfx.setVol('master', 0); await Game.newGame('Menu QA', 'vanguard', false); await Game.skipOpening();
      Game.debugFlags.god = true; Game.state.monsters = []; UI.closeAll();
      const p = Game.state.player;
      window.menuCalls = { potion: 0, skill: 0 };
      const quaff = p.quaff, performSkill = p.performSkill;
      p.quaff = function (...a) { menuCalls.potion++; return quaff.apply(this, a); };
      p.performSkill = function (...a) { menuCalls.skill++; return performSkill.apply(this, a); };
    });
    await page.locator('#view').focus(); await page.keyboard.press('Escape');
    await page.screenshot({ path: path.join(output, 'pause.png') });
    const pausedTime = await page.evaluate(() => Game.state.time);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    equal(await page.locator('[role=tab][aria-selected=true]').innerText(), 'Audio', 'pause Settings shortcut');
    await page.locator('#settingsPanel').focus();
    for (const key of ['1', '2', '3', '4', 'F1', 'F2', 'F3', 'F4', 'Space', 'i', 'c', 't', 's', 'q', 'm', 'l', 'Alt', 'Shift']) await page.keyboard.press(key);
    await page.waitForTimeout(200);
    equal(await page.evaluate(() => window.menuCalls), { potion: 0, skill: 0 }, 'menu keys triggered gameplay');
    equal(await page.evaluate(() => Game.state.time), pausedTime, 'settings did not pause the simulation');
    ok(await page.evaluate(() => !Game.state.player.jumping && !UI.anyOpen()), 'menu input jumped or opened a panel');
    await page.keyboard.press('Escape');
    equal(await page.evaluate(() => document.activeElement.dataset.menuAction), 'Settings', 'Back to pause did not restore Settings focus');
    await page.getByRole('button', { name: 'Controls', exact: true }).click();
    equal(await page.locator('[role=tab][aria-selected=true]').innerText(), 'Controls', 'pause Controls shortcut');
    await tab(page, 'Gameplay'); await page.locator('#setting-leftClickMove').check();
    await page.evaluate(() => LootFilter.setRevealKey('z')); await tab(page, 'Controls');
    guide = await page.locator('.settings-body').innerText();
    ok(guide.includes('Move-only is on') && guide.includes('Hold Shift and left-click an enemy') && guide.includes('Z') && guide.includes('Alt'), 'guide ignores movement setting or configured reveal key');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    equal(await page.evaluate(() => document.activeElement.dataset.menuAction), 'Controls', 'Back to pause did not restore Controls focus');
    await page.keyboard.press('Escape');
    ok(await page.locator('#escmenu').isHidden(), 'pause Escape did not resume');
    equal(await page.evaluate(() => document.activeElement.id), 'view', 'game focus not restored');
    await page.keyboard.down('Escape');
    await page.keyboard.down('Escape');
    ok(await page.locator('.pause-menu').isVisible(), 'repeated Escape dismissed pause menu');
    await page.keyboard.up('Escape'); await page.keyboard.press('Escape');
    // A real held mouse gesture and charged shot must be cleared without firing.
    await page.mouse.move(1000, 300); await page.mouse.down();
    ok(await page.evaluate(() => Game.__menuQA.input().mouse.l), 'mouse fixture did not hold a button');
    await page.evaluate(() => { Game.state.player.drawing = { time: 1 }; Game.state.player._pendingClick = { rightBtn: true }; });
    await page.keyboard.press('Escape');
    const clean = await page.evaluate(() => {
      const input = Game.__menuQA.input(), p = Game.state.player;
      return !input.mouse.l && !input.mouse.r && !input.mouse.shift && !input.mouse.alt && !input.ground && !input.target && !input.touch.side && !input.touch.x && !input.touch.y && !p.command && !p.drawing && !p._pendingClick;
    });
    ok(clean, 'opening menu retained mouse/touch/charged input');
    const calls = await page.evaluate(() => ({ ...menuCalls })); await page.mouse.up();
    await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.waitForTimeout(200);
    equal(await page.evaluate(() => menuCalls), calls, 'resuming replayed a held attack');
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Loot Filter', exact: true }).click();
    ok(await page.getByRole('dialog', { name: 'Loot filter', exact: true }).isVisible(), 'loot workshop did not open');
    const preset = await page.evaluate(() => LootFilter.config.preset);
    await page.keyboard.press('Escape');
    equal(await page.evaluate(() => LootFilter.config.preset), preset, 'menu navigation changed filter');
    equal(await page.evaluate(() => document.activeElement.dataset.menuAction), 'Loot Filter', 'loot workshop Back did not restore focus');
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await close(page);
    ok(await page.locator('#escmenu').isHidden(), 'Close settings did not resume directly');
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Save and Quit to Title', exact: true }).click();
    await titleSettings(page).waitFor(); await titleSettings(page).click();
    ok(await page.getByRole('dialog', { name: 'Settings & Controls', exact: true }).isVisible(), 'settings broken after save and quit');
    await page.setViewportSize({ width: 3840, height: 2160 }); await tab(page, 'Display'); await capture(page, '4k-display');
    console.log('PASS pause navigation, input isolation, held-input cancellation and loot workshop compatibility.');
    await page.context().close();

    const phone = await makePage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await load(phone); await titleSettings(phone).tap();
    await tab(phone, 'Controls');
    equal(await phone.locator('[data-device="touch"]').getAttribute('aria-pressed'), 'true', 'touch guide not selected on touch device');
    await phone.getByRole('button', { name: 'Keyboard & Mouse', exact: true }).tap();
    ok(await phone.evaluate(() => MobileControls.enabled), 'keyboard guide disabled touch');
    await phone.getByRole('button', { name: 'Touch', exact: true }).tap();
    for (const [label, width, height] of [['phone', 390, 844], ['small-phone', 320, 568], ['landscape', 844, 390]]) {
      await phone.setViewportSize({ width, height });
      for (const name of ['Audio', 'Gameplay', 'Display', 'Controls']) {
        await tab(phone, name); await capture(phone, label + '-' + name.toLowerCase());
        // Scrolling must keep Back visible and reveal the entire last row.
        await phone.locator('#settingsPanel').evaluate(el => { el.scrollTop = el.scrollHeight; });
        const fits = await phone.evaluate(() => {
          const body = document.querySelector('#settingsPanel'), last = body.lastElementChild;
          return last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 1;
        });
        ok(fits, label + ': last setting/guide row cannot be reached');
      }
    }
    await phone.getByRole('button', { name: 'Back', exact: true }).tap();
    ok(await phone.locator('#escmenu').isHidden(), 'touch Back did not close title settings');
    await phone.context().close();
    equal(errors, [], 'browser page errors');
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', checks, errors }, null, 2));
    console.log(`PASS ${checks} settings-menu browser checks. Screenshots: tmp/settings-menu/`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
