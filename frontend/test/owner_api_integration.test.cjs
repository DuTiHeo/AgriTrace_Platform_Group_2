const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const serviceRoot = path.resolve(__dirname, '../src/sevices');
function loadService(file, handler) {
  const calls = [], events = [];
  const httpClient = Object.fromEntries(['get', 'post', 'patch', 'delete', 'put'].map(method => [method, async (...args) => { calls.push({ method, args }); return handler(method, ...args); }]));
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const exports = {};
    cache.set(name, exports);
    const source = fs.readFileSync(path.join(serviceRoot, `${name}.ts`), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(code, { exports, require: dependency => dependency === './httpClient_wb' ? { httpClient } : load(dependency.replace('./', '')), URLSearchParams, Event, window: { dispatchEvent: event => events.push(event.type) } });
    return exports;
  }
  return { module: load(file), calls, events };
}
test('notifications load every API page and map category, read state and support target', async () => {
  const dto = { notification_id: 'n-1', content: 'Phản hồi thật', type: 'error_report_response', is_read: false, created_at: '2026-11-01T01:00:00Z' };
  const { module, calls } = loadService('notificationService_wb', (_, url) => url.includes('offset=0') ? Array.from({ length: 200 }, (_, i) => ({ ...dto, notification_id: String(i) })) : [dto]);
  const items = await module.notificationService.getAll();
  assert.equal(items.length, 201);
  assert.equal(items[200].target, '/support');
  assert.equal(items[200].readAt, null);
  assert.equal(items[200].message, 'Phản hồi thật');
  assert.equal(calls[1].args[0], '/notifications?limit=200&offset=200');
});
test('notification read/count/delete use real routes and failed changes do not emit success events', async () => {
  let fail = false;
  const { module, calls, events } = loadService('notificationService_wb', (_, url) => { if (fail) throw new Error('Forbidden'); return url.endsWith('unread-count') ? { unread_count: 4 } : { notification_id: 'n', content: '', is_read: true }; });
  assert.equal(await module.notificationService.getUnreadCount(), 4);
  await module.notificationService.markRead('n /');
  assert.equal(calls.at(-1).args[0], '/notifications/n%20%2F/read');
  await module.notificationService.markAllRead();
  assert.equal(calls.at(-1).args[0], '/notifications/read-all');
  await module.notificationService.delete('n');
  assert.equal(calls.at(-1).method, 'delete');
  const count = events.length; fail = true;
  await assert.rejects(module.notificationService.markRead('n'), /Forbidden/);
  assert.equal(events.length, count);
});
test('system error reports paginate, scope by farm and submit API fields without a client author/status', async () => {
  const { module, calls } = loadService('supportService_wb', (method, url, body) => method === 'get' ? (url.includes('offset=0') ? Array(100).fill({ report_id: 'r' }) : []) : body);
  assert.equal((await module.supportService.getAll('farm /')).length, 100);
  assert.equal(new URL(calls[1].args[0], 'http://test').searchParams.get('org_id'), 'farm /');
  await module.supportService.create('f-1', { error_type: 'bug', description: 'Không lưu được nông trại', screenshot_url: null });
  assert.equal(calls.at(-1).args[0], '/error-reports?org_id=f-1');
  assert.equal(calls.at(-1).args[1].user_id, undefined);
  assert.equal(calls.at(-1).args[1].status, undefined);
  await module.supportService.delete('r /');
  assert.equal(calls.at(-1).args[0], '/error-reports/r%20%2F');
});
test('harvest metadata and season quantity use separate APIs; QR uses generator endpoint', async () => {
  const dto = { batch_id: 'b-1', batch_code: 'BATCH-1', org_id: 'f-1', quantity: 10, harvest_date: '2026-11-01', status: 'ready', qr_url: 'https://trace.example/BATCH-1', seasons: [] };
  const { module, calls } = loadService('harvestService_wb', () => dto);
  await module.harvestService.update('b-1', { code: ' BATCH-2 ', harvestDate: '2026-10-31', status: 'pending' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).args[1])), { batch_code: 'BATCH-2', harvest_date: '2026-10-31', status: 'pending' });
  await module.harvestService.updateContribution('b-1', { seasonId: 's-1', quantityKg: 12.5 });
  assert.equal(calls.at(-2).args[0], '/batch-seasons/b-1/s-1');
  assert.equal(calls.at(-2).args[1].contributed_quantity, 12.5);
  const result = await module.harvestService.generateTraceCode('b-1');
  assert.equal(calls.at(-1).args[0], '/harvest-batches/b-1/generate-qr');
  assert.equal(result.traceUrl, dto.qr_url);
});
test('reminder CRUD and seen state use generated API with encoded IDs', async () => {
  const { module, calls } = loadService('reminderService_wb', () => ({}));
  await module.reminderService.getAll('s /');
  assert.equal(new URL(calls.at(-1).args[0], 'http://test').searchParams.get('season_id'), 's /');
  await module.reminderService.create({ season_id: 's', milestone_type: 'harvest', remind_date: '2026-11-02', channel: 'push' });
  assert.equal(calls.at(-1).method, 'post');
  await module.reminderService.update('r /', { remind_date: '2026-11-03' });
  assert.equal(calls.at(-1).args[0], '/reminders/r%20%2F');
  await module.reminderService.markSeen('r');
  assert.equal(calls.at(-1).args[1].status, 'seen');
  await module.reminderService.delete('r');
  assert.equal(calls.at(-1).method, 'delete');
  await module.reminderService.dispatch('s');
  assert.equal(calls.at(-1).args[0], '/reminders/dispatch?season_id=s');
});
test('expected harvest dates retain the chosen date across business timezone and month boundaries', () => {
  const { module } = loadService('seasonService_wb', () => ({}));
  assert.equal(module.calculateExpectedHarvestDate('2026-11-01', 100), '2027-02-09');
  assert.equal(module.calculateExpectedHarvestDate('2028-02-28', 1), '2028-02-29');
});
