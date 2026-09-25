const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name, mocks = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/sevices', `${name}.ts`), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: id => mocks[id] ?? (() => { throw new Error(`Unexpected dependency ${id}`); })(), Headers, FormData, Blob, AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const service = fetch => load('farming-log.service', { '@/constants/api': { API_BASE_URL: 'http://backend.test:8000' }, 'expo/fetch': { fetch } }, { fetch });

test('farming-log API uses backend paths and bearer authentication', async () => {
  const calls = [];
  const api = service(async (url, options) => { calls.push({ url, options }); return response({}); });
  await api.listLogs('token');
  await api.getLog('token', 'log');
  await api.createLog('token', { season_id: 'season', activity_type: 'Tưới nước', gps: { latitude: 1, longitude: 2 } });
  await api.createNote('token', 'log', 'Đánh giá: Đạt');
  await api.resolveNote('token', 'note', true);
  await api.updateTaskStatus('token', 'task', 'completed');
  assert.deepEqual(calls.map(call => call.url.replace('http://backend.test:8000', '')), ['/farming-logs', '/farming-logs/log', '/farming-logs', '/log-notes', '/log-notes/note', '/tasks/task/status']);
  calls.forEach(call => assert.equal(call.options.headers.get('Authorization'), 'Bearer token'));
});

test('network and server errors become safe user messages', async () => {
  await assert.rejects(service(async () => { throw new TypeError('network'); }).listLogs('token'), /Không thể kết nối/);
  await assert.rejects(service(async () => response({ detail: 'SQL internals' }, 500)).listLogs('token'), error => !error.message.includes('SQL'));
});

test('member activity counts only backend logs and completed tasks for that worker', async () => {
  const calls = [];
  const api = service(async url => {
    calls.push(url);
    if (url.includes('/tasks?')) return response([
      { task_id: '1', worker_id: 'worker-1', status: 'completed' },
      { task_id: '2', worker_id: 'worker-1', status: 'in_progress' },
      { task_id: '3', worker_id: 'worker-2', status: 'completed' },
    ]);
    return response([
      { log_id: '1', user_id: 'worker-1' },
      { log_id: '2', user_id: 'worker-1' },
      { log_id: '3', user_id: 'worker-2' },
    ]);
  });
  const activity = await api.getMemberActivity('token', 'worker-1');
  assert.equal(activity.totalLogs, 2);
  assert.equal(activity.completedTasks, 1);
  assert.ok(calls.some(url => url.endsWith('/farming-logs')));
  assert.ok(calls.some(url => url.endsWith('/tasks?worker_id=worker-1&include_cancelled=true')));
});

test('latest assessment note determines Đạt or Không đạt', () => {
  const review = load('log-review');
  const result = review.latestReview([
    { content: 'Đánh giá: Đạt', created_at: '2026-01-01T00:00:00Z', leader_name: 'A' },
    { content: 'Đánh giá: Không đạt', created_at: '2026-01-02T00:00:00Z', leader_name: 'B' },
  ]);
  assert.equal(result.review, 'rejected');
  assert.equal(result.reviewedBy, 'B');
});

test('photo retry reconciles a committed upload instead of duplicating it', async () => {
  let stored = [];
  let uploads = 0;
  const media = load('log-media', {
    'expo-location': {}, 'expo-image-manipulator': {},
    'expo-file-system': { File: class { constructor(uri) { this.uri = uri; } } },
    'expo-file-system/legacy': {},
    'react-native': { Platform: { OS: 'android' } },
    './farming-log.service': {
      getLog: async () => ({ log_id: 'log', photos: stored }),
      uploadPhotos: async () => { uploads++; stored = [{}, {}]; throw new Error('lost response'); },
    },
  }, { FormData: class { append() {} } });
  await assert.rejects(media.uploadDraftPhotos('token', 'log', ['a', 'b']));
  const result = await media.uploadDraftPhotos('token', 'log', ['a', 'b']);
  assert.equal(uploads, 1);
  assert.equal(result.photos.length, 2);
});

test('native upload sends every photo in one multipart request with Expo File objects', async () => {
  const requests = [];
  class TestFile { constructor(uri) { this.uri = uri; } }
  class TestFormData {
    constructor() { this.parts = []; }
    append(name, value) { this.parts.push({ name, value }); }
  }
  const media = load('log-media', {
    'expo-location': {}, 'expo-image-manipulator': {},
    'expo-file-system': { File: TestFile }, 'expo-file-system/legacy': {},
    'react-native': { Platform: { OS: 'android' } },
    './farming-log.service': {
      getLog: async () => ({ log_id: 'log', photos: [] }),
      uploadPhotos: async (_token, _logId, body) => {
        requests.push(body);
        return body.parts.map((_, index) => ({ photo_id: String(index) }));
      },
    },
  }, { FormData: TestFormData });
  const result = await media.uploadDraftPhotos('token', 'log', ['file:///a.jpg', 'file:///b.jpg', 'file:///c.jpg']);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].parts.length, 3);
  assert.ok(requests[0].parts.every(part => part.name === 'files' && part.value instanceof TestFile));
  assert.equal(result.photos.length, 3);
});
