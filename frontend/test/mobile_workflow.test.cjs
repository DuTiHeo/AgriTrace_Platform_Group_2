const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative, mocks = {}, extra = '') {
  const exports = {};
  const source = fs.readFileSync(path.join(root, relative), 'utf8') + extra;
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, require(name) { if (!(name in mocks)) throw new Error(name); return mocks[name]; }, Date, Set, Map, Promise, Error, JSON, globalThis, setTimeout, clearTimeout, Headers, AbortController });
  return exports;
}
const dates = load('src/utils/task_dates.ts');
const service = load('src/sevices/farming_log.service.ts', {
  '@/constants/api': { API_BASE_URL: 'https://test.invalid' },
  'expo/fetch': { fetch: async () => { throw new Error('No real HTTP allowed'); } },
  './api_client': { apiRequest: async () => [], apiJson: (method, body) => ({ method, body: JSON.stringify(body) }), apiQuery: () => '' },
});
const base = { task_id: 'task-1', worker_id: 'worker-1', worker_phone: '0900000001', worker_name: 'Worker', team_id: 'team-1', org_id: 'farm-1', plot_id: 'plot-1', plot_code: 'DD-01', content: service.encodeTaskContent({ title: 'Tưới nước', assignmentId: 'assignment-1' }), start_at: '2099-11-05T08:00:00+07:00', due_at: '2099-11-05T17:00:00+07:00', status: 'pending', created_at: '2099-11-01T00:00:00Z' };
function schedule(react = {}, overrides = {}, extra = '') {
  return load('src/contexts/work_schedule_context.tsx', {
    '@/utils/task_dates': dates,
    react: { createContext: () => ({}), ...react },
    'react/jsx-runtime': {},
    './auth_context': { useAuth: () => ({ user: { role: 'worker', phone: '0900000001' }, accessToken: 'worker-token' }) },
    '@/sevices/farming_log.service': { ...service, listMyTasks: async () => [base], ...overrides },
    '@/sevices/session_user': { sessionUserId: () => 'worker-1' },
    '@/sevices/journal_filter': { taskExecutionError: () => '' },
  }, extra);
}
test('future assignment returned by Worker API remains in schedule on its assigned day', () => {
  const task = schedule().mapTask(base);
  assert.equal(task.memberIds[0], 'worker-1');
  assert.equal(task.title, 'Tưới nước');
  assert.equal(dates.taskOccursOn(task, '2099-11-01'), false);
  assert.equal(dates.taskOccursOn(task, '2099-11-05'), true);
  assert.equal(task.displayStatus, 'pending');
});
test('Vietnam dates are identical for UTC and +07 timestamps including midnight', () => {
  assert.equal(dates.localDateKey('2026-11-01T18:00:00Z'), '2026-11-02');
  assert.equal(dates.localDateKey('2026-11-02T01:00:00+07:00'), '2026-11-02');
  assert.equal(dates.localDateKey('2026-11-02'), '2026-11-02');
  assert.equal(dates.isValidDateKey('2026-02-30'), false);
});
test('late completion is compared to the deadline time, not just the calendar date', () => {
  const { mapTask } = schedule();
  assert.equal(mapTask({ ...base, status: 'completed', due_at: '2026-11-01T17:00:00+07:00', updated_at: '2026-11-01T17:01:00+07:00' }).displayStatus, 'completed_late');
  assert.equal(mapTask({ ...base, status: 'completed', due_at: '2026-11-01T17:00:00+07:00', updated_at: '2026-11-01T16:59:00+07:00' }).displayStatus, 'completed');
});
test('Worker loading does not depend on cached started tasks and status follows server', async () => {
  const states = [], refs = []; let cursor = 0, refCursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial }; },
    useCallback(fn) { return fn; }, useEffect() {}, useLayoutEffect() {},
  };
  const module = schedule(react, {}, '\nexport { useScheduleState };');
  const render = () => { cursor = 0; refCursor = 0; return module.useScheduleState(); };
  await render().loadTasks();
  const value = render();
  assert.equal(value.ready, true);
  assert.equal(value.error, '');
  assert.equal(value.workerTasks.length, 1);
  assert.equal(value.workerTasks[0].started, false);
});
test('multi-worker requests retain successful results and identify failed recipients', async () => {
  const { settleTaskRequests } = load('src/sevices/task_batch.ts');
  const calls = [];
  const result = await settleTaskRequests(['a', 'b', 'a'], async id => { calls.push(id); if (id === 'b') throw new Error('Không kết nối'); return { task_id: id }; });
  assert.equal(calls.length, 2);
  assert.equal(result.succeeded[0].id, 'a');
  assert.equal(result.failed[0].id, 'b');
  assert.equal(result.failed[0].message, 'Không kết nối');
});
function reportHarness() {
  const states = [], refs = []; let cursor = 0, refCursor = 0;
  const react = {
    createContext: () => ({}),
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial }; },
    useCallback(fn) { return fn; }, useMemo(fn) { return fn(); }, useEffect() {}, useLayoutEffect() {},
  };
  const oldLog = { log_id: 'old', season_id: 'season-1', user_id: 'worker-1', user_name: 'Worker', activity_type: 'Tưới nước', content: 'Đã tưới', logged_at: '2026-11-01T01:00:00Z', photos: [], notes: [] };
  let detailCalls = 0;
  const module = load('src/contexts/report_context.tsx', {
    react, 'react/jsx-runtime': {},
    '@/contexts/auth_context': { useAuth: () => ({ accessToken: 'token', user: { role: 'worker', team_id: 'team-1' } }) },
    '@/contexts/work_schedule_context': { useWorkSchedule: () => ({ workerTasks: [], leaderTasks: [], ready: true }) },
    '@/sevices/farming_log.service': { listSeasons: async () => [{ season_id: 'season-1', plot_id: 'plot-1', status: 'completed' }], listLogs: async () => [oldLog], getLog: async () => { detailCalls++; return oldLog; }, createLog: async () => ({ ...oldLog, log_id: 'new' }), seasonLabel: () => 'DD-01' },
    '@/sevices/log_review': { latestReview: () => ({}), reviewContent: () => '' },
    '@/sevices/session_user': { sessionUserId: () => 'worker-1' },
    '@/sevices/notification_events': { notificationLogs: logs => logs },
  }, '\nexport { useReportState };');
  return { render() { cursor = 0; refCursor = 0; return module.useReportState(); }, calls: () => detailCalls };
}
test('Worker history includes closed seasons even without a current task', async () => {
  const harness = reportHarness();
  await harness.render().refresh();
  const value = harness.render();
  assert.equal(value.seasons.length, 1);
  assert.equal(value.reports.length, 1);
  assert.equal(value.reports[0].id, 'old');
});
test('creating a journal preserves existing history and all-area selection', async () => {
  const harness = reportHarness();
  await harness.render().refresh();
  await harness.render().createReport({ seasonId: 'season-1', taskTitle: 'Tưới nước', area: 'DD-01', note: 'Đã tưới', gps: { latitude: 11, longitude: 108 }, photos: [] });
  const value = harness.render();
  assert.equal(value.selectedSeasonId, 'all');
  assert.equal(value.reports.length, 2);
});
test('reopening journal details fetches fresh comments instead of serving stale cache', async () => {
  const harness = reportHarness();
  await harness.render().loadReport('old');
  await harness.render().loadReport('old');
  assert.equal(harness.calls(), 2);
});
test('Leader groups only identical assignment payloads and preserves per-worker statuses', () => {
  const { mapTask, groupLeaderTasks } = schedule();
  const first = mapTask(base);
  const second = mapTask({ ...base, task_id: 'task-2', worker_id: 'worker-2', status: 'in_progress' });
  const grouped = groupLeaderTasks([first, second]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].memberIds.length, 2);
  assert.equal(grouped[0].assigneeStatuses['worker-1'].status, 'pending');
  assert.equal(grouped[0].assigneeStatuses['worker-2'].status, 'in_progress');
  assert.equal(groupLeaderTasks([first, { ...second, due: '2099-11-06' }]).length, 2);
});
test('mobile error reports send API categories, description and remote screenshot without client identity', async () => {
  const calls = [];
  const api = load('src/sevices/error_report.service.ts', {
    './api_client': {
      apiJson: (method, body) => ({ method, body: JSON.stringify(body) }),
      apiQuery: filters => '?' + new URLSearchParams(filters),
      apiRequest: async (token, route, options) => { calls.push({ token, route, options }); return { report_id: 'report-1', status: 'new' }; },
    },
  });
  const payload = api.buildErrorReportPayload({ kind: 'Lỗi hiển thị', text: '  Màn hình bị trắng  ', photo: 'https://example.test/error.jpg' });
  const result = await api.createErrorReport('worker-token', payload);
  assert.equal(result.status, 'new');
  assert.equal(calls[0].route, '/error-reports');
  assert.equal(calls[0].token, 'worker-token');
  assert.deepEqual(JSON.parse(calls[0].options.body), { error_type: 'interface', description: 'Màn hình bị trắng', screenshot_url: 'https://example.test/error.jpg' });
  await api.listErrorReports('leader-token', { limit: 50, offset: 50 });
  assert.equal(calls[1].route, '/error-reports?limit=50&offset=50');
});
test('error report rejects local photo URIs and short descriptions before sending', () => {
  const api = load('src/sevices/error_report.service.ts', { './api_client': {} });
  assert.throws(() => api.buildErrorReportPayload({ kind: 'Khác', text: 'abc' }), /5 ký tự/);
  assert.throws(() => api.buildErrorReportPayload({ kind: 'Khác', text: 'Không mở được', photo: 'file:///phone/error.jpg' }), /URL/);
  assert.equal('screenshot_url' in api.buildErrorReportPayload({ kind: 'Khác', text: 'Không mở được' }), false);
});
