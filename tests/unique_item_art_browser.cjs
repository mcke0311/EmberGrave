/* Exercise the shared item renderer with isolated production UI and file://. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'tests/qa/unique_item_art');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.otf': 'font/otf' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  });
});

async function waitForCatalog(page) {
  await page.waitForFunction(() => /^(PASS|FAIL)/.test(document.getElementById('result').textContent));
  assert.match(await page.locator('#result').innerText(), /^PASS/);
}

async function catalog(page, url, name, pixelCheck) {
  await page.goto(url);
  await waitForCatalog(page);
  const counts = await page.evaluate(async pixelCheck => {
    const uniqueRows = ItemCatalog.filter(row => row.item.rarity === 'unique');
    const fingerprints = [];
    if (pixelCheck) for (const { item } of uniqueRows) {
      const canvas = SpriteAssets.itemIcon(item, 64);
      const bytes = canvas.getContext('2d').getImageData(0, 0, 64, 64).data;
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      fingerprints.push(Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''));
    }
    return { total: ItemCatalog.length, unique: uniqueRows.length, distinctPixels: new Set(fingerprints).size,
      countLabel: document.getElementById('page').textContent,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
  }, pixelCheck);
  assert.equal(counts.unique, 163);
  assert.match(counts.countLabel, /163 items/);
  assert.equal(counts.overflow, false, name + ': horizontal overflow');
  if (pixelCheck) assert.equal(counts.distinctPixels, counts.unique, name + ': duplicated rendered icons');
  for (let n = 1; ; n++) {
    await page.screenshot({ path: path.join(out, name + '-catalog-' + n + '.png'), fullPage: true });
    if (await page.locator('#next').isDisabled() || name !== 'desktop') break;
    await page.locator('#next').click();
  }
  return counts;
}

async function production(page, base, name, viewport) {
  await page.goto(base + '/tests/unique_review.html');
  await page.waitForFunction(() => window.uniqueQA || document.getElementById('status').textContent.startsWith('FAIL'), null, { timeout: 120000 });
  const setup = await page.evaluate(async viewport => {
    const q = window.uniqueQA;
    if (!q) throw Error(document.getElementById('status').textContent);
    q.frame.style.width = viewport.width + 'px'; q.frame.style.height = viewport.height + 'px';
    document.documentElement.style.overflowX = 'hidden';
    const win = q.frame.contentWindow, { Items: I, UI, Game: G } = q.api;
    win.dispatchEvent(new win.Event('resize'));
    UI.closeAll(); UI.setCursorItem(null);
    const p = G.state.player; p.inv.items = []; p.stash.items = []; p.equip = {};
    p.equip.main = q.make('u_gravebite');
    for (const id of ['u_cinder', 'uc_hunt', 'uj_rainbow', 'g_void']) if (!I.autoPlace(p.inv, q.make(id))) throw Error('Pack fixture placement failed');
    for (const id of ['u_gen_4_12', 'u_gen_7_9', 'uj_oak', 'uc_wyrm']) if (!I.autoPlace(p.stash, q.make(id))) throw Error('Stash fixture placement failed');
    p.computeStats();
    const prepared = await G.preparePlayerEquipment(p.equip); G.commitPlayerEquipment(prepared);
    G.__uniqueReview.render(); UI.togglePanel('inv');
    return { expectedPack: p.inv.items.map(it => it.name), expectedStash: p.stash.items.map(it => it.name), equipped: p.equip.main.name };
  }, viewport);
  await page.screenshot({ path: path.join(out, name + '-inventory.png'), fullPage: true });
  const checks = await page.evaluate(async setup => {
    const q = window.uniqueQA, win = q.frame.contentWindow, doc = q.frame.contentDocument;
    const { UI, Game: G } = q.api, S = win.eval('SpriteAssets');
    const fingerprint = async canvas => {
      const digest = await crypto.subtle.digest('SHA-256', canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
      return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    };
    async function checkGrid(selector, items) {
      for (const it of items) {
        const actual = Array.from(doc.querySelectorAll(selector + ' .item-icon')).find(c => c.getAttribute('aria-label') === it.name);
        if (!actual) throw Error(selector + ': missing ' + it.name);
        if (await fingerprint(actual) !== await fingerprint(S.itemIcon(it, actual.width))) throw Error(selector + ': wrong art for ' + it.name);
      }
      return items.length;
    }
    const p = G.state.player;
    const pack = await checkGrid('#panelRight', p.inv.items);
    await checkGrid('#panelRight', [p.equip.main]);
    const unidentified = q.make('u_widow'); unidentified.identified = false;
    UI.showItemTooltip(unidentified, 180, 250);
    const tip = doc.querySelector('#tooltip .item-icon');
    if (tip.getAttribute('aria-label') !== unidentified.baseName) throw Error('Unidentified tooltip exposed item name');
    if (await fingerprint(tip) !== await fingerprint(S.itemIcon({ ...unidentified, identified: true }, tip.width))) throw Error('Identification changed tooltip artwork');
    UI.hideTooltip(); UI.setCursorItem(q.make('uj_rainbow'));
    await checkGrid('#cursorItem', [UI.cursorItem]); UI.setCursorItem(null);
    UI.openStorage();
    const stash = await checkGrid('#panelLeft', p.stash.items);
    return { pack, stash, equipment: 1, tooltip: 1, held: 1, expected: setup };
  }, setup);
  await page.screenshot({ path: path.join(out, name + '-inventory-stash.png'), fullPage: true });
  await page.evaluate(() => {
    const q = window.uniqueQA, { Game: G, UI } = q.api;
    UI.closeAll(); G.state.vendorStock.hewn = ['u_gen_0_0', 'u_gen_3_1', 'uj_seer', 'uc_ember'].map(q.make);
    UI.openVendor('hewn');
  });
  const shop = await page.evaluate(() => {
    const q = window.uniqueQA, doc = q.frame.contentDocument;
    const expected = q.api.Game.state.vendorStock.hewn.map(it => it.name);
    const actual = Array.from(doc.querySelectorAll('.shop-entry .item-icon'), c => c.getAttribute('aria-label'));
    if (expected.some(name => !actual.includes(name))) throw Error('Shop omitted unique art: ' + JSON.stringify({ expected, actual }));
    return actual.length;
  });
  await page.screenshot({ path: path.join(out, name + '-shop.png'), fullPage: true });
  await page.evaluate(() => {
    const q = window.uniqueQA; q.api.UI.closeAll();
    for (const id of ['u_gravebite', 'uc_ember', 'g_doom']) q.api.Game.dropAtFeet(q.make(id));
    q.api.Game.__uniqueReview.render(); q.show('uc_warlord');
  });
  await page.screenshot({ path: path.join(out, name + '-ground-tooltip.png'), fullPage: true });
  return { ...checks, shop, groundLoot: 3 };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const report = { errors: [], missing: [], catalog: {}, production: {} };
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const [name, viewport] of [['desktop', { width: 1366, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      page.on('pageerror', error => report.errors.push(name + ': ' + error.message));
      page.on('response', response => { if (response.status() === 404 && !response.url().endsWith('favicon.ico')) report.missing.push(response.url()); });
      report.catalog[name] = await catalog(page, base + '/tests/item_catalog.html?group=uniques', name, true);
      report.production[name] = await production(page, base, name, viewport);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on('pageerror', error => report.errors.push('file: ' + error.message));
    report.catalog.file = await catalog(page, pathToFileURL(path.join(root, 'tests/item_catalog.html')).href + '?group=uniques', 'file', false);
    assert.deepEqual(report.errors, [], 'Browser runtime errors');
    assert.deepEqual(report.missing, [], 'Missing browser assets');
    console.log('PASS: all 163 unique icons paint distinctly on desktop/mobile; production pack, equipment, stash, held item, tooltip, shop, ground loot and file:// rendering');
  } finally {
    fs.writeFileSync(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
