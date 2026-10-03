// Real Edge + Vite + the group backend. GETs and login only; no database mutations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const webRoot = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:15173';
const apiOrigin = process.env.OWNER_BROWSER_API_URL || 'http://127.0.0.1:8000';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let server, browser, socket, cdp;
const pending = new Map();
let sequence = 0;
const errors = [], requests = [], failedRequests = [];

async function waitFor(callback, label, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await callback()) return;
    await sleep(150);
  }
  throw new Error('Timeout: ' + label);
}
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function navigate(route) {
  await command('Page.navigate', { url: origin + route });
  await waitFor(async () => await evaluate(`location.pathname === ${JSON.stringify(route)} && !!document.querySelector('#root')?.firstElementChild`), route);
}
async function login(phone) {
  await waitFor(() => evaluate('!!document.querySelector("input[type=tel]")'), 'login form');
  await evaluate(`(() => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [selector, value] of [['input[type=tel]', ${JSON.stringify(phone)}], ['input[type=password]', 'Test@1234']]) {
      const input = document.querySelector(selector); set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await evaluate('document.querySelector("form").requestSubmit()');
}
async function main() {
  const edge = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  assert.ok(fs.existsSync(edge), 'Set EDGE_PATH to Microsoft Edge executable');
  server = spawn(process.execPath, [path.join(webRoot, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '15173', '--strictPort'], {
    cwd: webRoot, env: { ...process.env, VITE_API_BASE_URL: '/api', VITE_API_PROXY_TARGET: apiOrigin },
    windowsHide: true, stdio: 'ignore',
  });
  await waitFor(async () => { try { return (await fetch(origin)).ok; } catch { return false; } }, 'Vite');
  browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=19223',
    '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'agritrace-owner-browser-')), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let targets;
  await waitFor(async () => { try { targets = await (await fetch('http://127.0.0.1:19223/json/list')).json(); return targets.some((t) => t.type === 'page'); } catch { return false; } }, 'Edge debugger');
  socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const waiter = pending.get(message.id); pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(message.error.message)); else waiter?.resolve(message.result);
    } else if (message.method === 'Page.javascriptDialogOpening') void command('Page.handleJavaScriptDialog', { accept: true });
    else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failedRequests.push(message.params.response.url + ': ' + message.params.response.status);
    else if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  cdp = command;
  await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
  await command('Page.addScriptToEvaluateOnNewDocument', { source: "window.__ownerErrors=[];window.addEventListener('unhandledrejection',e=>window.__ownerErrors.push(String(e.reason)));" });

  await navigate('/login');
  await sleep(500);
  assert.equal(requests.filter((url) => url.includes('/api/')).length, 0, 'Public login must not fetch protected data');
  console.log('PASS: Login page does not fetch protected farm data');
  if (process.env.OWNER_BROWSER_ACCESS_TOKEN) {
    // An existing test session can exercise GET routes without changing account credentials.
    await evaluate('sessionStorage.setItem("farmer_quicklog_access_token", ' + JSON.stringify(process.env.OWNER_BROWSER_ACCESS_TOKEN) + ')');
    await navigate('/');
  } else {
    await login(process.env.OWNER_BROWSER_PHONE || '0901000001');
  }
  await waitFor(() => evaluate('!!document.querySelector(".header-farm-selector select option[value^=\\"20000000\\"]")'), 'farms after login');
  await waitFor(() => evaluate('!!document.querySelector(".dashboard-page") && !document.body.innerText.includes("Đang tải dữ liệu")'), 'dashboard');
  assert.ok(await evaluate('document.querySelector(".header-farm-selector select").options.length >= 3'));
  await waitFor(() => evaluate('document.body.innerText.includes("Nguyễn Văn An")'), 'intact Vietnamese owner name');
  console.log('PASS: Owner session loads farms and dashboard');
  console.log('PASS: Vietnamese owner name renders correctly');

  for (const route of ['/farms', '/plots', '/seasons', '/personnel', '/teams', '/tasks', '/farming-logs', '/harvests', '/notifications', '/support', '/account']) {
    await navigate(route);
    await waitFor(async () => {
      if (await evaluate('!!document.querySelector(".app-error-page")')) throw new Error(route + ': React error boundary');
      return evaluate('!!document.querySelector(".app-content")');
    }, route + ': owner layout');
    assert.ok(await evaluate('!!document.querySelector(".app-content")'), route + ': page rendered');
    assert.equal(await evaluate('window.__ownerErrors.length'), 0, route + ': unhandled rejection');
  }
  console.log('PASS: Eleven owner routes render without unhandled rejections');
  await navigate('/teams/new');
  await waitFor(() => evaluate('!!document.querySelector(".personnel-form-grid")'), 'team creation form');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".personnel-form-grid")).display'), 'grid');
  await navigate('/tasks');
  await waitFor(() => evaluate('!!document.querySelector(".tasks-heading .btn-primary:not(:disabled)")'), 'task creation button');
  await evaluate('document.querySelector(".tasks-heading .btn-primary").click()');
  await waitFor(() => evaluate('!!document.querySelector(".modal-backdrop")'), 'task dialog');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".modal-backdrop")).position'), 'fixed');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".app-modal")).backgroundColor'), 'rgb(255, 255, 255)');
  console.log('PASS: Forms and dialogs retain shared styles after splitting page CSS');
  const detailRoutes = await evaluate(`(async () => {
    const headers = { Authorization: 'Bearer ' + sessionStorage.getItem('farmer_quicklog_access_token') };
    const resources = [
      ['/organizations/mine', '/farms/', 'org_id', 'farm-detail'],
      ['/plots', '/plots/', 'plot_id', 'plot-detail'],
      ['/seasons', '/seasons/', 'season_id', 'season-detail'],
      ['/teams', '/teams/', 'team_id', 'team-detail'],
      ['/farming-logs', '/farming-logs/', 'log_id', 'farming-log-detail'],
      ['/harvest-batches', '/harvests/', 'batch_id', 'harvest-detail'],
    ];
    const routes = [];
    for (const [api, prefix, id, selector] of resources) {
      const rows = await fetch('/api' + api, { headers }).then(r => r.json());
      if (rows.length) routes.push({ path: prefix + rows[0][id], selector });
    }
    const org = await fetch('/api/organizations/mine', { headers }).then(r => r.json());
    const users = await fetch('/api/users?org_id=' + org[0].org_id, { headers }).then(r => r.json());
    const staff = users.find(u => ['worker','leader'].includes(u.role));
    if (staff) routes.push({path:'/personnel/' + staff.user_id, selector:'personnel-detail'});
    return routes;
  })()`);
  for (const route of detailRoutes) {
    await navigate(route.path);
    await waitFor(() => evaluate('!!document.querySelector(".page[class*=' + route.selector + ']")'), route.path);
    assert.equal(await evaluate('window.__ownerErrors.length'), 0, route.path);
  }
  for (const route of ['/farms/new','/plots/new','/seasons/new','/personnel/new','/harvests/new']) {
    await navigate(route);
    await waitFor(() => evaluate('!!document.querySelector(".page form, .page .farm-form-card")'), route);
    assert.equal(await evaluate('window.__ownerErrors.length'), 0, route);
  }
  console.log('PASS: Seven detail pages and creation forms read baseline API data');
  const seasonNotes = await evaluate(`(async () => {
    const headers = { Authorization: 'Bearer ' + sessionStorage.getItem('farmer_quicklog_access_token') };
    const logs = await fetch('/api/farming-logs', { headers }).then(r => r.json());
    let target;
    for (const log of logs) {
      const detail = await fetch('/api/farming-logs/' + log.log_id, { headers }).then(r => r.json());
      if (detail.notes?.length) { target = log.season_id; break; }
    }
    if (!target) return null;
    const summaries = await fetch('/api/farming-logs?season_id=' + target, { headers }).then(r => r.json());
    const details = await Promise.all(summaries.map(log => fetch('/api/farming-logs/' + log.log_id, { headers }).then(r => r.json())));
    const notes = details.flatMap(log => log.notes ?? []);
    return { seasonId:target, count:new Set(notes.map(n => n.note_id)).size, contents:notes.map(n => n.content) };
  })()`);
  assert.ok(seasonNotes, 'Existing data contains cultivation notes');
  await navigate('/seasons/' + seasonNotes.seasonId);
  await waitFor(() => evaluate('document.querySelectorAll(".season-note-list li").length === ' + seasonNotes.count), 'season cultivation notes');
  assert.equal(await evaluate('document.querySelectorAll(".season-detail-summary-card").length'), 3);
  assert.equal(await evaluate('document.body.innerText.includes("Tiến độ")'), false);
  assert.ok(await evaluate('(' + JSON.stringify(seasonNotes.contents) + ').every(text => document.querySelector(".season-cultivation-notes").innerText.includes(text))'));
  assert.ok(await evaluate('Array.from(document.querySelectorAll(".season-note-list a")).every(link => link.pathname.startsWith("/farming-logs/"))'));
  const refreshStart = requests.length;
  await evaluate('document.querySelector(".season-cultivation-notes button").click()');
  await waitFor(() => evaluate('document.querySelectorAll(".season-note-list li").length === ' + seasonNotes.count + ' && !document.querySelector(".season-cultivation-notes button").disabled'), 'season notes refresh');
  assert.ok(requests.slice(refreshStart).some(url => url.includes('/farming-logs?season_id=')));
  console.log('PASS: Season displays real journal notes and refreshes them; season progress is removed');
  await navigate('/plots');
  await waitFor(() => evaluate('!!document.querySelector(".header-farm-selector select:not(:disabled)") && document.querySelector(".header-farm-selector select").options.length >= 3'), 'loaded plot farm selector');
  await evaluate(`(async () => {
    const headers = { Authorization: 'Bearer ' + sessionStorage.getItem('farmer_quicklog_access_token') };
    const farms = await fetch('/api/organizations/mine', { headers }).then(r => r.json());
    const [first, second] = farms;
    window.__oldPlots = await fetch('/api/plots?org_id=' + first.org_id, { headers }).then(r => r.json());
    window.__expectedPlots = await fetch('/api/plots?org_id=' + second.org_id, { headers }).then(r => r.json());
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      if (String(args[0]).includes('/plots?') && String(args[0]).includes(first.org_id))
        await new Promise(resolve => setTimeout(resolve, 1200));
      return response;
    };
    const select = document.querySelector('.header-farm-selector select');
    select.value = first.org_id; select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 75));
    select.value = second.org_id; select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const selectedPlotIds = `Array.from(document.querySelectorAll('.plots-table a.table-action-button')).map(link => link.pathname.split('/').at(-1)).sort()`;
  await waitFor(() => evaluate('JSON.stringify(' + selectedPlotIds + ') === JSON.stringify(window.__expectedPlots.map(p => p.plot_id).sort())'), 'selected farm plot IDs');
  await sleep(1600);
  assert.ok(await evaluate('JSON.stringify(' + selectedPlotIds + ') === JSON.stringify(window.__expectedPlots.map(p => p.plot_id).sort())'));
  assert.ok(await evaluate('window.__oldPlots.every(p => !(' + selectedPlotIds + ').includes(p.plot_id))'));
  assert.equal(await evaluate('window.__ownerErrors.length'), 0);
  console.log('PASS: A delayed previous farm response cannot overwrite the selected farm');
  await navigate('/account');
  await waitFor(() => evaluate('!!document.querySelector(".account-profile-form input")'), 'profile');
  assert.equal(await evaluate('document.querySelector(".account-profile-form input").readOnly'), true);
  assert.equal(await evaluate('document.querySelector(".account-profile-form button[type=submit]").disabled'), true);
  console.log('PASS: Account reads a full baseline profile and disables unsupported self edits');
  for (const [route, text] of [['/notifications','Thông báo chưa khả dụng'],['/support','Gửi báo cáo chưa khả dụng']]) {
    await navigate(route);
    await waitFor(() => evaluate('document.body.innerText.includes(' + JSON.stringify(text) + ')'), text);
  }
  // Discard this temporary browser's token locally without invoking server logout.
  await evaluate('sessionStorage.clear()');
  await navigate('/login');
  await login('0901000003');
  await waitFor(() => evaluate('!!document.querySelector(".form-error-block")'), 'worker rejection');
  assert.equal(await evaluate('Boolean(sessionStorage.getItem("farmer_quicklog_access_token"))'), false);
  console.log('PASS: Worker login is rejected');
  const requestStart = requests.length;
  await navigate('/trace/AGT-EXAMPLE');
  await waitFor(() => evaluate('document.body.innerText.includes("Truy xuất công khai chưa khả dụng")'), 'public trace state');
  assert.equal(requests.slice(requestStart).filter(url=>url.includes('/api/')).length,0);
  console.log('PASS: Unsupported public trace does not request private data');
  assert.deepEqual(failedRequests, [], 'HTTP errors: '+failedRequests.join('; '));
  assert.equal(errors.length, 0, 'Browser runtime exceptions: ' + errors.join('; '));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (cdp) await cdp('Browser.close').catch(() => {});
  socket?.close(); server?.kill(); browser?.kill();
});
