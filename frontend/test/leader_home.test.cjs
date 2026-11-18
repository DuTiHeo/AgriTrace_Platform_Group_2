const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function homeHarness(initialTasks, taskId = '') {
  let tasks = initialTasks;
  const exports = {};
  const element = (type, props) => ({ type, props });
  const uiNames = ['Avatar', 'Button', 'Card', 'Screen', 'Section', 'Status'];
  const modules = {
    '@/constants/task_types': { getTaskTypeLabel: value => value },
    'expo-router': { useLocalSearchParams: () => ({ taskId }), useFocusEffect() {}, router: { setParams() {}, push() {}, navigate() {} } },
    react: { useCallback: fn => fn, useState: value => [typeof value === 'function' ? value() : value, () => {}] },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': { AppState: {}, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    '@/contexts/leader_context': { useLeader: () => ({ members: [], tasks, draft: { photos: [] }, loadMembers: async () => {} }) },
    '@/contexts/work_schedule_context': { useWorkSchedule: () => ({ leaderTasks: tasks, startTask() {}, loadTasks: async () => {}, error: '' }) },
    '@/styles/theme': { colors: {} },
    '@/contexts/auth_context': { useAuth: () => ({ accessToken: 'leader-token' }) },
    '@/contexts/notification_context': { localToday: () => '2026-11-18' },
    '@/sevices/farming_log.service': { listLogs: async () => { throw new Error('Rendering must not write or send requests'); } },
    '@/sevices/journal_filter': { inJournalPeriod: value => value.startsWith('2026-11-18') },
    '@/components/leader/ui': { ...Object.fromEntries(uiNames.map(name => [name, name])), dateText: value => value, go() {}, s: {} },
  };
  const file = path.resolve(__dirname, '../src/(mobile)/leader/index.tsx');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) { assert.ok(name in modules, name); return modules[name]; }, Date, Map });
  return { render: () => exports.default(), setTasks: value => { tasks = value; } };
}

function nodes(tree, predicate) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (tree === null || tree === undefined || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? textOf(tree.props?.children) : String(tree);
}

function task(id, extra = {}) {
  return { id, title: id, status: 'doing', displayStatus: 'pending', owner: true, started: false,
    due: '2026-11-18', startDate: '2026-11-18', updatedAt: '2026-11-18T08:00:00+07:00', area: 'DL-01', instructions: '', ...extra };
}

function taskCards(tree) {
  return nodes(tree, node => node.type === 'Card').map(textOf);
}

test('Leader home lists only unfinished personal tasks and keeps late tasks actionable', () => {
  const harness = homeHarness([
    task('Chưa bắt đầu'), task('Đang làm', { started: true, displayStatus: 'in_progress' }),
    task('Trễ hạn', { displayStatus: 'incomplete' }),
    task('Đã xong', { status: 'done', displayStatus: 'completed' }),
    task('Xong trễ', { status: 'done', displayStatus: 'completed_late' }),
    task('Của công nhân', { owner: false }),
  ]);
  const tree = harness.render();
  const cards = taskCards(tree);
  assert.equal(cards.length, 4); // Three task cards and the independent members card.
  for (const title of ['Chưa bắt đầu', 'Đang làm', 'Trễ hạn']) assert.ok(cards.some(card => card.startsWith(title)), title);
  for (const title of ['Đã xong', 'Xong trễ', 'Của công nhân']) assert.ok(!cards.some(card => card.startsWith(title)), title);
  assert.ok(cards.find(card => card.startsWith('Trễ hạn')).includes('Gửi nhật ký hoàn thành'));
  const completedStat = nodes(tree, node => node.type === 'Pressable').find(node => textOf(node).startsWith('Đã hoàn thành'));
  assert.equal(textOf(completedStat), 'Đã hoàn thành2Hoàn thành hôm nay');
  assert.ok(textOf(tree).includes('3 nhiệm vụ'));
});

test('a newly completed task leaves Leader home while remaining available to the completion statistic', () => {
  const pending = task('Công việc vừa hoàn thành', { started: true });
  const harness = homeHarness([pending]);
  assert.ok(taskCards(harness.render()).some(card => card.startsWith(pending.title)));
  harness.setTasks([{ ...pending, status: 'done', displayStatus: 'completed' }]);
  const tree = harness.render();
  assert.ok(!taskCards(tree).some(card => card.startsWith(pending.title)));
  assert.ok(textOf(tree).includes('Chưa có công việc được giao.'));
  const completedStat = nodes(tree, node => node.type === 'Pressable').find(node => textOf(node).startsWith('Đã hoàn thành'));
  assert.equal(textOf(completedStat), 'Đã hoàn thành1Hoàn thành hôm nay');
});

test('a notification selecting a completed task does not bring it back to the actionable home list', () => {
  const harness = homeHarness([task('Đã hoàn thành', { status: 'done', displayStatus: 'completed' }), task('Việc khác')], 'Đã hoàn thành');
  const tree = harness.render();
  assert.ok(textOf(tree).includes('Công việc không còn trong danh sách.'));
  assert.ok(textOf(tree).includes('0 nhiệm vụ'));
  assert.ok(!taskCards(tree).some(card => card.includes('Việc khác')));
});
