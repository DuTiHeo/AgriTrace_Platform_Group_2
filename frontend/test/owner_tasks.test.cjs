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
  vm.runInNewContext(code, { exports, require(name) { assert.ok(name in mocks, name); return mocks[name]; }, Date, Error, JSON, URLSearchParams, Event, window: { dispatchEvent() {} } });
  return exports;
}
const content = load('src/utils/task_content.ts');
const labels = load('src/constants/task_types.ts');
const dto = { task_id: 't1', team_id: 'team', worker_id: 'worker', worker_name: 'Người nhận', plot_id: 'plot', org_id: 'farm', status: 'pending', start_at: '2026-11-03T08:00:00+07:00', due_at: '2026-11-03T17:00:00+07:00' };
function service(httpClient, actor = { user_id: 'owner', full_name: 'Chủ nông trại', role: 'owner' }) {
  return load('src/sevices/taskService_wb.ts', {
    '../utils/task_content': content, '../constants/task_types': labels,
    './accountService_wb': { accountService: { getCurrentUser: async () => actor } },
    './plotService_wb': { plotService: { getById: async () => ({ id: 'plot', farmId: 'farm', status: 'active' }) } },
    './teamService_wb': { getTeamById: async () => ({ id: 'team', farmId: 'farm' }) },
    './personnelService_wb': { getPersonnelByTeam: async () => [{ id: 'worker', role: 'worker', status: 'active' }] },
    './httpClient_wb': { httpClient },
  }).taskService;
}
test('Owner tasks decode human titles and distinguish explicit origin from unlabelled history', async () => {
  const tasks = [
    { ...dto, content: content.encodeTaskContent({ title: 'lam_co', instructions: 'Làm sạch cỏ', tools: 'Liềm', assignedByRole: 'owner', assignedById: 'owner', assignedByName: 'Chủ nông trại' }) },
    { ...dto, task_id: 't2', content: content.encodeTaskContent({ title: 'bon_phan', assignedByRole: 'leader', assignedById: 'leader' }) },
    { ...dto, task_id: 't3', content: 'Việc cũ chưa có thông tin nguồn' },
  ];
  const mapped = await service({ get: async () => tasks }).getAll('farm');
  assert.equal(mapped[0].content, 'Làm cỏ');
  assert.equal(mapped[0].instructions, 'Làm sạch cỏ');
  assert.equal(mapped[0].tools, 'Liềm');
  assert.equal(mapped.filter(task => task.assignedByRole === 'owner').length, 1);
  assert.equal(mapped[2].assignedByRole, null);
  assert.ok(mapped.every(task => !task.content.includes('AGRITRACE_TASK_V1')));
});
test('new Owner assignment persists creator metadata inside the existing content contract', async () => {
  let payload;
  const api = service({ post: async (_url, body) => { payload = body; return { ...dto, content: body.content }; } });
  const created = await api.create({ farmId: 'farm', plotId: 'plot', teamId: 'team', assigneeId: 'worker', content: 'Tưới nước', startAt: dto.start_at, dueAt: dto.due_at });
  const saved = content.decodeTaskContent(payload.content);
  assert.equal(saved.assignedByRole, 'owner');
  assert.equal(saved.assignedById, 'owner');
  assert.equal(created.assignedByRole, 'owner');
  assert.equal(created.content, 'Tưới nước');
});
test('editing task content retains original actor metadata and malformed content does not leak JSON', async () => {
  let payload;
  const api = service({
    get: async () => ({ ...dto, content: content.encodeTaskContent({ title: 'lam_co', assignedByRole: 'owner', assignedById: 'owner', tools: 'Liềm' }) }),
    patch: async (_url, body) => { payload = body; return { ...dto, content: body.content }; },
  });
  await api.update('t1', { content: 'Làm cỏ luống số 2' });
  assert.equal(content.decodeTaskContent(payload.content).assignedById, 'owner');
  assert.equal(content.decodeTaskContent(payload.content).tools, 'Liềm');
  assert.ok(!content.decodeTaskContent('AGRITRACE_TASK_V1:{bad').title.includes('AGRITRACE_TASK_V1'));
});

test('multi-recipient assignments form one row while preserving individual task states', () => {
  const { groupTaskAssignments } = load('src/features/owner/task_wb.ts');
  const base = { farmId: 'farm', plotId: 'plot', teamId: 'team', assignmentId: 'batch-1', content: 'Làm cỏ', instructions: '', tools: 'Liềm', startAt: '2026-11-03', dueAt: '2026-11-04', createdAt: '2026-11-03T01:00:00Z' };
  const tasks = [{ ...base, id: 'a', assigneeId: 'u1', status: 'completed' }, { ...base, id: 'b', assigneeId: 'u2', status: 'pending' }];
  const groups = groupTaskAssignments(tasks);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].members.length, 2);
  assert.equal(groups[0].status, 'completed');
  assert.equal(groups[0].members[0].status, 'completed');
  assert.equal(groups[0].members[1].status, 'pending');
  assert.equal(groupTaskAssignments([{ ...tasks[0], assignmentId: undefined }, { ...tasks[1], assignmentId: undefined }]).length, 2);
  assert.equal(groupTaskAssignments([tasks[0], { ...tasks[1], assignmentId: 'batch-2' }]).length, 2);
});
test('assignment completion, cancellation and overdue states account for every recipient', () => {
  const { assignmentStatus } = load('src/features/owner/task_wb.ts');
  assert.equal(assignmentStatus([{ status: 'completed' }, { status: 'completed' }]), 'completed');
  assert.equal(assignmentStatus([{ status: 'pending' }, { status: 'incomplete' }]), 'incomplete');
  assert.equal(assignmentStatus([{ status: 'cancelled' }, { status: 'pending' }]), 'pending');
  assert.equal(assignmentStatus([{ status: 'cancelled' }, { status: 'cancelled' }]), 'cancelled');
});
