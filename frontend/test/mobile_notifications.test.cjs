const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require(name) { assert.ok(name in mocks, name); return mocks[name]; }, Date, Promise, Set, Map, Error, setTimeout, clearTimeout, setInterval, clearInterval });
  return exports;
}
const item = (id, type = 'task_assigned', read = false) => ({ notification_id: id, user_id: 'worker', content: 'Bạn có công việc mới', type, is_read: read, created_at: '2026-11-01T01:00:00Z' });
function helpers(listNotifications) {
  return load('src/sevices/mobile_notifications.ts', {
    './notification_api': { listNotifications },
    './farming_log.service': { decodeTaskContent: content => JSON.parse(content.slice('AGRITRACE_TASK_V1:'.length)) },
    '@/constants/task_types': { getTaskTypeLabel: title => title },
  });
}
test('mobile inbox loads all pages with the selected backend type and deduplicates ids', async () => {
  const calls = [];
  const helper = helpers(async (token, filters) => {
    calls.push({ token, filters });
    return filters.offset === 0 ? Array.from({ length: 200 }, (_, i) => item(String(i), 'log_note')) : [item('200', 'log_note')];
  });
  const result = await helper.loadAllNotifications('leader-token', 'log_note');
  assert.equal(result.length, 201);
  assert.deepEqual(calls.map(call => call.filters.offset), [0, 200]);
  assert.ok(calls.every(call => call.token === 'leader-token' && call.filters.type === 'log_note' && call.filters.limit === 200));
});
test('both roles map backend types and read state without inventing entity ids', () => {
  const helper = helpers(async () => []);
  for (const role of ['worker', 'leader']) {
    for (const type of ['task_assigned', 'log_note', 'reminder', 'error_report', 'error_report_response', 'future_type', null]) {
      const mapped = helper.mapApiNotification(item('id-1', type, true), role);
      assert.equal(mapped.id, 'id-1');
      assert.equal(mapped.read, true);
      assert.equal(mapped.type, type);
      if (type === 'error_report_response') assert.equal(mapped.target, '/account/issues');
      if (type === 'future_type' || type === null) assert.equal(mapped.target, null);
      assert.ok(!JSON.stringify(mapped.target).includes('id-1'));
    }
  }
  const task = helper.mapApiNotification({ ...item('task'), content: 'Bạn có nhiệm vụ mới: AGRITRACE_TASK_V1:' + JSON.stringify({ title: 'Tưới nước', instructions: 'Tưới buổi sáng' }) }, 'worker');
  assert.equal(task.text, 'Tưới nước · Tưới buổi sáng');
  assert.ok(!task.text.includes('AGRITRACE_TASK_V1'));
});
function harness() {
  let auth = { accessToken: 'worker-token', user: { role: 'worker' } };
  const stores = { 'worker-token': [item('w-1'), item('w-2', 'log_note')], 'leader-token': [item('l-1', 'reminder')] };
  const calls = [];
  let rejectWrites = false;
  let deferNextList = false;
  let release;
  const api = {
    async getUnreadNotificationCount(token) { return { unread_count: stores[token].filter(item => !item.is_read).length }; },
    async markNotificationRead(token, id) {
      calls.push(['read', token, id]);
      if (rejectWrites) throw new Error('Không cập nhật được');
      const selected = stores[token].find(item => item.notification_id === id);
      selected.is_read = true;
      return { ...selected };
    },
    async markAllNotificationsRead(token) {
      calls.push(['all', token]);
      if (rejectWrites) throw new Error('Không cập nhật được');
      stores[token].forEach(item => { item.is_read = true; });
      return { updated_count: stores[token].length };
    },
  };
  const helper = helpers(async (token, filters) => {
    calls.push(['list', token, filters.type]);
    const snapshot = stores[token].filter(item => !filters.type || item.type === filters.type).map(item => ({ ...item }));
    if (deferNextList) { deferNextList = false; return new Promise(resolve => { release = () => resolve(snapshot); }); }
    return snapshot;
  });
  const states = [], refs = []; let cursor = 0, refCursor = 0;
  const react = {
    createContext: () => ({}),
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial }; },
    useCallback(fn) { return fn; }, useMemo(fn) { return fn(); }, useEffect() {}, useLayoutEffect(fn) { fn(); },
  };
  const module = load('src/contexts/notification_context.tsx', {
    react, 'react/jsx-runtime': {}, 'react-native': { AppState: {} },
    './auth_context': { useAuth: () => auth }, '@/utils/task_dates': { localDateKey: () => '2026-11-01' },
    '@/sevices/notification_api': api, '@/sevices/mobile_notifications': helper,
  });
  return {
    render() { cursor = 0; refCursor = 0; return module.useNotificationState(); },
    signIn(role) { auth = { accessToken: role + '-token', user: { role } }; },
    rejectWrites() { rejectWrites = true; }, calls,
    defer() { deferNextList = true; }, release() { assert.ok(release); release(); },
  };
}
test('Worker and Leader use their own API inbox and global unread count across filters', async () => {
  for (const role of ['worker', 'leader']) {
    const h = harness(); h.signIn(role);
    await h.render().refresh();
    assert.equal(h.render().notices.length, role === 'worker' ? 2 : 1);
    assert.equal(h.render().unread, role === 'worker' ? 2 : 1);
    h.render().setFilter('log_note');
    assert.equal(h.render().notices.length, 0);
    await h.render().refresh();
    assert.equal(h.render().notices.length, role === 'worker' ? 1 : 0);
    assert.equal(h.render().unread, role === 'worker' ? 2 : 1);
    assert.ok(h.calls.some(call => call[0] === 'list' && call[1] === role + '-token' && call[2] === 'log_note'));
  }
});
test('read and read-all persist through API and update both inbox and badge', async () => {
  const h = harness(); await h.render().refresh();
  assert.equal(await h.render().markRead('w-1'), true);
  assert.equal(h.render().unread, 1);
  assert.ok(h.render().readIds.includes('w-1'));
  assert.equal(await h.render().markAllRead(), true);
  assert.equal(h.render().unread, 0);
  assert.equal(h.render().readIds.length, 2);
  assert.ok(h.calls.some(call => call[0] === 'read'));
  assert.ok(h.calls.some(call => call[0] === 'all'));
});
test('failed read writes never falsely mark notices read or reduce the badge', async () => {
  const h = harness(); await h.render().refresh(); h.rejectWrites();
  assert.equal(await h.render().markRead('w-1'), false);
  assert.equal(await h.render().markAllRead(), false);
  assert.equal(h.render().unread, 2);
  assert.equal(h.render().readIds.length, 0);
  assert.match(h.render().actionError, /Không cập nhật/);
});
test('switching accounts discards pending results and hides the previous account immediately', async () => {
  const h = harness(); await h.render().refresh();
  h.defer(); const oldRequest = h.render().refresh();
  h.signIn('leader');
  assert.equal(h.render().notices.length, 0);
  assert.equal(h.render().unread, 0);
  await h.render().refresh();
  h.release(); await oldRequest;
  assert.equal(h.render().notices[0].id, 'l-1');
  assert.equal(h.render().unread, 1);
});
test('a stale list response cannot undo a successful read', async () => {
  const h = harness(); await h.render().refresh();
  h.defer(); const stale = h.render().refresh();
  await h.render().markRead('w-1');
  h.release(); await stale;
  assert.ok(h.render().readIds.includes('w-1'));
  assert.equal(h.render().unread, 1);
});
test('repeated taps submit a single read mutation', async () => {
  const h = harness(); await h.render().refresh();
  const context = h.render();
  await Promise.all([context.markRead('w-1'), context.markRead('w-1')]);
  assert.equal(h.calls.filter(call => call[0] === 'read').length, 1);
});
test('mobile notification transport uses authenticated GET and PATCH endpoints', async () => {
  const calls = [];
  const api = load('src/sevices/notification_api.ts', {
    './api_client': {
      apiQuery: filters => '?' + Object.entries(filters).map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&'),
      apiRequest: async (token, route, options = {}) => { calls.push({ token, route, method: options.method ?? 'GET' }); return {}; },
    },
  });
  await api.listNotifications('worker-token', { type: 'log_note', is_read: false, limit: 200, offset: 0 });
  await api.getUnreadNotificationCount('leader-token');
  await api.markNotificationRead('worker-token', 'id / test');
  await api.markAllNotificationsRead('leader-token');
  assert.equal(calls[0].route, '/notifications?type=log_note&is_read=false&limit=200&offset=0');
  assert.equal(calls[1].route, '/notifications/unread-count');
  assert.equal(calls[2].route, '/notifications/id%20%2F%20test/read');
  assert.equal(calls[2].method, 'PATCH');
  assert.equal(calls[3].route, '/notifications/read-all');
  assert.equal(calls[3].method, 'PATCH');
  assert.equal(calls[3].token, 'leader-token');
});
