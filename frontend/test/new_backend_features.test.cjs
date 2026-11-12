const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const storage = { removeItem() {}, getItem() { return null; }, setItem() {} };
  vm.runInNewContext(code, { exports, require(name) { assert.ok(name in mocks, name); return mocks[name]; }, Date, Error, JSON, URLSearchParams, FormData, Blob, Event, localStorage: storage, sessionStorage: storage, window: { dispatchEvent() {} } });
  return exports;
}
const season = { season_id: 's1', plot_id: 'p1', plot_code: 'DL-01', crop_id: 'c1', crop_name: 'Cà chua', planting_date: '2026-11-01', expected_harvest_date: '2027-01-01', actual_harvest_date: null, status: 'growing', org_id: 'o1', notes: 'Theo dõi sâu bệnh' };
test('Owner season creation, editing and retrieval preserve server notes', async () => {
  const calls = [];
  const httpClient = {
    async post(route, payload) { calls.push({ route, payload }); return { ...season, notes: payload.notes }; },
    async patch(route, payload) { calls.push({ route, payload }); return { ...season, notes: payload.notes }; },
    async get(route) { return route.startsWith('/batch-seasons') ? [] : season; },
  };
  const { seasonService } = load('src/sevices/seasonService_wb.ts', { './httpClient_wb': { httpClient } });
  const created = await seasonService.create({ plotId: 'p1', varietyId: 'c1', sowingDate: '2026-11-01', expectedHarvestDate: '2027-01-01', notes: '  Ghi chú từ form  ' });
  assert.equal(created.notes, 'Ghi chú từ form');
  assert.equal(calls[0].payload.notes, 'Ghi chú từ form');
  const edited = await seasonService.update('s1', { notes: '  Bổ sung  ' });
  assert.equal(edited.notes, 'Bổ sung');
  await seasonService.update('s1', { notes: '' });
  assert.equal(calls.at(-1).payload.notes, null);
  assert.equal((await seasonService.getById('s1')).notes, season.notes);
});
test('Owner profile uses the expanded auth/me payload without requiring users/{id}', async () => {
  const calls = [];
  const profile = { user_id: 'owner-1', full_name: 'Chủ nông trại', phone: '0900000001', role: 'owner', status: 'active', created_at: '2026-01-01T00:00:00Z', date_of_birth: '1990-02-01', national_id: '123', address: 'Hà Nội' };
  const { accountService } = load('src/sevices/accountService_wb.ts', { './httpClient_wb': { httpClient: { async get(route) { calls.push(route); return profile; } } } });
  const account = await accountService.getAccount();
  assert.deepEqual(calls, ['/auth/me']);
  assert.equal(account.joinedAt, profile.created_at);
  assert.equal(account.dateOfBirth, profile.date_of_birth);
  assert.equal(account.nationalId, '123');
  assert.equal(account.status, 'active');
});
test('VN-2000 conversion keeps Northing/Easting order and applies backend WGS84 vertices', async () => {
  const calls = [];
  const response = { boundary_geojson: { type: 'Polygon', coordinates: [[[105.84, 21], [105.841, 21], [105.841, 21.001], [105.84, 21]]] }, wgs84_vertices: [], central_meridian: 105, zone_width: 3 };
  const api = load('src/sevices/vn2000Service_wb.ts', { './httpClient_wb': { httpClient: { async post(route, payload) { calls.push({ route, payload }); return response; } } } });
  const points = api.parseVN2000Coordinates('X,Y\n2323000,585000\n2323000,585100\n2323100,585100');
  for (const scope of ['organizations', 'plots']) {
    const result = await api.convertVN2000(scope, { points, central_meridian: "105°00'", zone_width: 3 });
    assert.equal(result.points.length, 3);
    assert.equal(result.points[0].latitude, 21);
    assert.equal(result.points[0].longitude, 105.84);
    assert.equal(calls.at(-1).route, `/${scope}/convert-vn2000`);
    assert.equal(calls.at(-1).payload.points[0].x, 2323000);
    assert.equal(calls.at(-1).payload.points[0].y, 585000);
  }
  assert.throws(() => api.parseVN2000Coordinates('1,2\n3,4\nwrong,row'), /dòng 3/);
  assert.throws(() => api.parseVN2000Coordinates('1,2\n3,4'), /3 điểm/);
});
test('Owner screenshot upload uses multipart file and the returned URL in the report', async () => {
  const calls = [];
  const { supportService } = load('src/sevices/supportService_wb.ts', { './httpClient_wb': { httpClient: { async post(route, payload) { calls.push({ route, payload }); return route.endsWith('upload-screenshot') ? { screenshot_url: '/uploads/error-reports/screen.jpg' } : { report_id: 'r1', ...payload }; } } } });
  const file = new File(['image'], 'screen.jpg', { type: 'image/jpeg' });
  const uploaded = await supportService.uploadScreenshot(file);
  assert.equal(calls[0].route, '/error-reports/upload-screenshot');
  assert.equal(calls[0].payload.get('file').name, 'screen.jpg');
  const report = await supportService.create('o1', { error_type: 'bug', description: 'Lỗi giao diện', screenshot_url: uploaded.screenshot_url });
  assert.equal(report.screenshot_url, '/uploads/error-reports/screen.jpg');
  await assert.rejects(supportService.uploadScreenshot(new File(['x'], 'fake.txt', { type: 'text/plain' })), /5 MB/);
});
test('Mobile screenshot upload uses its dedicated endpoint and accepts only uploaded paths', async () => {
  const calls = [];
  const fetcher = async () => {};
  const api = load('src/sevices/error_report.service.ts', { './api_client': {
    apiQuery: () => '', apiJson: (method, body) => ({ method, body: JSON.stringify(body) }),
    async apiRequest(...args) { calls.push(args); return { screenshot_url: '/uploads/error-reports/screen.jpg' }; },
  } });
  const body = new FormData(); body.append('file', new Blob(['image'], { type: 'image/jpeg' }), 'screen.jpg');
  const uploaded = await api.uploadErrorScreenshot('worker-token', body, fetcher);
  assert.equal(calls[0][1], '/error-reports/upload-screenshot');
  assert.equal(calls[0][2].body.get('file').name, 'screen.jpg');
  assert.equal(calls[0][4], fetcher);
  const payload = api.buildErrorReportPayload({ kind: 'Lỗi chức năng', text: 'Không gửi được nhật ký', photo: uploaded.screenshot_url });
  assert.equal(payload.screenshot_url, uploaded.screenshot_url);
  assert.throws(() => api.buildErrorReportPayload({ kind: 'Khác', text: 'Lỗi giao diện', photo: 'file:///local.jpg' }), /đường dẫn không hợp lệ/);
});
