const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(relative, mocks = {}, extra = '') {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Date, Set, Map, Promise, Error, JSON, setTimeout, clearTimeout,
    require(name) { assert.ok(name in mocks, `Unexpected dependency: ${name}`); return mocks[name]; },
  });
  return exports;
}

function hooks() {
  const states = [], refs = [];
  let stateIndex = 0, refIndex = 0;
  return {
    react: {
      createContext: () => ({}),
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useCallback: callback => callback,
      useMemo: callback => callback(),
      useEffect() {},
      useLayoutEffect(callback) { callback(); },
    },
    render(callback) { stateIndex = 0; refIndex = 0; return callback(); },
  };
}

const dates = load('src/utils/task_dates.ts');
const execution = load('src/sevices/journal_filter.ts');
const makeTask = role => ({
  task_id: 'task-1', worker_id: `${role}-1`, worker_name: 'Người thực hiện', worker_phone: null,
  team_id: 'team-1', team_name: 'Tổ 1', org_id: 'farm-1', org_name: 'Nông trại',
  plot_id: 'plot-1', plot_code: 'DL-01', content: 'Tưới nước', status: 'in_progress',
  start_at: '2020-01-01T08:00:00+07:00', due_at: '2099-12-31T17:00:00+07:00',
  created_at: '2020-01-01T00:00:00Z', updated_at: '2026-11-18T08:00:00Z',
});

function formHarness(role) {
  const hookState = hooks();
  const events = [];
  let failUpload = false, failCompletion = false;
  let task = { id: 'task-1', taskIds: ['task-1'], plotId: 'plot-1', startDate: '2020-01-01', due: '2099-12-31', status: 'doing', owner: role === 'leader' };
  let draft = {
    taskId: 'task-1', taskTitle: 'Tưới nước', plotId: 'plot-1', area: 'DL-01', seasonId: 'season-1',
    note: 'Đã tưới đủ nước', gps: { latitude: 21, longitude: 105.84 }, photos: ['file:///photo-1.jpg', 'file:///photo-2.jpg'],
  };
  const detail = { log_id: 'log-1', photos: [], notes: [] };
  const module = load('src/hooks/use_farming_log_form.ts', {
    react: hookState.react,
    '@/contexts/auth_context': { useAuth: () => ({ accessToken: `${role}-token`, user: { role } }) },
    '@/contexts/report_context': { useReports: () => ({
      seasons: [{ season_id: 'season-1', plot_id: 'plot-1', status: 'growing' }],
      async createReport(input) { events.push('create journal'); assert.equal(input.taskId, draft.taskId); return detail; },
      storeDetail(value) { events.push('store photos'); assert.equal(value.log_id, 'log-1'); },
    }) },
    '@/sevices/log_media': {
      async getLogLocation() { throw new Error('A valid saved GPS should be reused'); },
      prepareLogPhoto: async uri => uri,
      async uploadDraftPhotos(token, logId, photos) {
        events.push('upload photos');
        assert.equal(token, `${role}-token`);
        assert.equal(logId, 'log-1');
        assert.equal(photos.length, 2);
        if (failUpload) throw new Error('Tải ảnh thất bại');
        return { ...detail, photos: photos.map(url => ({ url })) };
      },
    },
    '@/sevices/farming_log.service': {
      async updateTaskStatus() { assert.fail('Completion must update the shared schedule cache'); },
      async locatePlot() { throw new Error('No live location lookup expected'); },
    },
    '@/contexts/work_schedule_context': { useWorkSchedule: () => ({
      workerTasks: role === 'worker' ? [task] : [], leaderTasks: role === 'leader' ? [task] : [],
      async completeTask(id) {
        events.push('complete task'); assert.equal(id, 'task-1');
        if (failCompletion) throw new Error('Cập nhật công việc thất bại');
        task = { ...task, status: 'done' };
        return { ...makeTask(role), status: 'completed' };
      },
      async loadWorkerTasks() { assert.fail('The shared completion action owns refreshing'); },
    }) },
    '@/sevices/journal_filter': execution,
  });
  return {
    render: () => hookState.render(() => module.useFarmingLogForm(draft, update => { draft = update(draft); })),
    events,
    draft: () => draft,
    setDraft(update) { draft = { ...draft, ...update }; },
    rejectUploads(value) { failUpload = value; },
    rejectCompletion(value) { failCompletion = value; },
  };
}

for (const role of ['leader', 'worker']) {
  test(`${role}: a completion journal saves evidence before completing the task`, async () => {
    const harness = formHarness(role);
    const result = await harness.render().submit();
    assert.equal(result.log_id, 'log-1');
    assert.equal(harness.draft().savedLogId, 'log-1');
    assert.deepEqual(harness.events, ['create journal', 'upload photos', 'store photos', 'complete task']);
  });

  test(`${role}: retry after an upload error reuses the saved journal`, async () => {
    const harness = formHarness(role);
    harness.rejectUploads(true);
    await assert.rejects(harness.render().submit(), /Tải ảnh thất bại/);
    assert.equal(harness.draft().savedLogId, 'log-1');
    assert.equal(harness.events.includes('complete task'), false);
    harness.rejectUploads(false);
    await harness.render().submit();
    assert.equal(harness.events.filter(event => event === 'create journal').length, 1);
    assert.equal(harness.events.filter(event => event === 'complete task').length, 1);
  });

  test(`${role}: retry after a failed task update never creates another journal`, async () => {
    const harness = formHarness(role);
    harness.rejectCompletion(true);
    await assert.rejects(harness.render().submit(), /Cập nhật công việc thất bại/);
    assert.equal(harness.draft().savedLogId, 'log-1');
    harness.rejectCompletion(false);
    await harness.render().submit();
    assert.equal(harness.events.filter(event => event === 'create journal').length, 1);
    assert.equal(harness.events.filter(event => event === 'complete task').length, 2);
  });

  test(`${role}: a journal without a linked task does not complete an unrelated task`, async () => {
    const harness = formHarness(role);
    harness.setDraft({ taskId: undefined });
    await harness.render().submit();
    assert.equal(harness.events.includes('complete task'), false);
  });
}

function screenNodes(tree, predicate) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => screenNodes(child, predicate));
  if (typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...screenNodes(tree.props?.children, predicate)];
}

function screenText(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return '';
  if (Array.isArray(tree)) return tree.map(screenText).join('');
  return typeof tree === 'object' ? screenText(tree.props?.children) : String(tree);
}

function renderedFormHarness(role) {
  const hookState = hooks();
  const element = (type, props) => ({ type, props });
  const events = [];
  let navigationFails = true, saveFails = false, deferSave = false, releaseSave;
  const initialDraft = {
    taskId: 'task-1', taskTitle: 'Tưới nước', plotId: 'plot-1', area: 'DL-01', seasonId: 'season-1',
    note: 'Đã tưới đủ nước', gps: { latitude: 21, longitude: 105.84 },
    photos: ['file:///photo-1.jpg', 'file:///photo-2.jpg'],
  };
  let drafts = { 'task:task-1': initialDraft }, leaveBypass;
  const nativeComponents = ['Image', 'KeyboardAvoidingView', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'TouchableWithoutFeedback', 'View'];
  const module = load('src/components/common/farming_log_form_screen.tsx', {
    react: hookState.react,
    'react/jsx-runtime': { jsx: element, jsxs: element },
    '@/constants/task_types': { getTaskTypeLabel: title => title },
    '@/hooks/use_finish_tab_flow': { useFinishTabFlow: () => name => {
      events.push('navigate ' + name);
      if (navigationFails) throw new Error('Navigation failed after persistence');
    } },
    '@/styles/theme': { colors: {} },
    '@/styles/role_styles': { sharedStyles: {} },
    'expo-router': {
      router: { replace() {} }, useFocusEffect() {},
      useLocalSearchParams: () => ({ taskId: 'task-1', taskTitle: 'Tưới nước', plotId: 'plot-1', area: 'DL-01' }),
    },
    'expo-image-picker': {},
    'react-native': {
      ...Object.fromEntries(nativeComponents.map(name => [name, name])),
      Keyboard: { dismiss() {} }, Platform: { OS: 'android' }, StyleSheet: { create: styles => styles },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/common/primary_button': { PrimaryButton: 'PrimaryButton' },
    '@/components/common/full_screen_image_viewer': { FullScreenImageViewer: 'FullScreenImageViewer' },
    '@/components/common/remove_photo_button': { RemovePhotoButton: 'RemovePhotoButton' },
    '@/components/common/report_dictation': { ReportDictation: 'ReportDictation' },
    '@/contexts/report_context': { useReports: () => ({
      drafts,
      setDrafts(update) { drafts = typeof update === 'function' ? update(drafts) : update; },
    }) },
    '@/hooks/use_farming_log_form': { useFarmingLogForm: () => ({
      gpsStatus: 'Đã định vị', locationError: null, isLocating: false, activeSeasons: [{ season_id: 'season-1' }],
      locate() {}, preparePhoto: async uri => uri,
      async submit() {
        events.push('submit journal');
        if (deferSave) {
          deferSave = false;
          await new Promise(resolve => { releaseSave = resolve; });
        }
        if (saveFails) throw new Error('Tải ảnh thất bại');
        return { log_id: 'log-1' };
      },
    }) },
    '@/hooks/use_discard_warning': { useDiscardWarning: ({ bypassRef }) => { leaveBypass = bypassRef; return () => {}; } },
    '@/contexts/auth_context': { useAuth: () => ({ accessToken: `${role}-token`, user: { role } }) },
    '@/sevices/farming_log.service': { listTaskTypes: async () => ['Tưới nước'] },
  });
  return {
    render: () => hookState.render(() => module.FarmingLogFormScreen()), events,
    drafts: () => drafts,
    allowNavigation() { navigationFails = false; },
    rejectSave() { saveFails = true; },
    deferNextSave() { deferSave = true; },
    releaseSave() { assert.ok(releaseSave); releaseSave(); },
    canBypassDiscard: () => leaveBypass.current,
  };
}

function screenButton(tree, title) {
  const [button] = screenNodes(tree, node => node.type === 'PrimaryButton' && node.props.title === title);
  assert.ok(button, `Missing button: ${title}`);
  return button;
}

for (const role of ['leader', 'worker']) {
  test(`${role}: a navigation error after saving shows confirmation and retries navigation only`, async () => {
    const harness = renderedFormHarness(role);
    await screenButton(harness.render(), 'Gửi báo cáo hoàn thành').props.onPress();
    const confirmation = harness.render();
    assert.ok(screenText(confirmation).includes('Đã gửi nhật ký'));
    assert.ok(screenText(confirmation).includes('Nhật ký của bạn đã được lưu thành công.'));
    assert.ok(!screenText(confirmation).includes('Navigation failed after persistence'));
    assert.equal(screenNodes(confirmation, node => node.props?.title === 'Gửi báo cáo hoàn thành').length, 0);
    assert.ok(harness.drafts()['task:task-1']);
    assert.equal(harness.canBypassDiscard(), true);
    harness.allowNavigation();
    await screenButton(confirmation, 'Xem nhật ký').props.onPress();
    assert.equal(harness.events.filter(event => event === 'submit journal').length, 1);
    assert.equal(harness.events.filter(event => event === 'navigate diary').length, 2);
    assert.equal(Object.keys(harness.drafts()).length, 0);
  });

  test(`${role}: a failed journal submission preserves the form and draft without showing success`, async () => {
    const harness = renderedFormHarness(role);
    harness.rejectSave();
    await screenButton(harness.render(), 'Gửi báo cáo hoàn thành').props.onPress();
    const form = harness.render();
    assert.ok(screenButton(form, 'Gửi báo cáo hoàn thành'));
    assert.ok(screenText(form).includes('Tải ảnh thất bại'));
    assert.ok(!screenText(form).includes('Đã gửi nhật ký'));
    assert.equal(harness.drafts()['task:task-1'].note, 'Đã tưới đủ nước');
    assert.equal(harness.drafts()['task:task-1'].photos.length, 2);
    assert.equal(harness.events.some(event => event.startsWith('navigate ')), false);
    assert.equal(harness.canBypassDiscard(), false);
  });
}

test('a submission in flight prevents duplicate submits and does not bypass unsaved-draft protection', async () => {
  const harness = renderedFormHarness('leader');
  harness.deferNextSave();
  const button = screenButton(harness.render(), 'Gửi báo cáo hoàn thành');
  const firstSubmit = button.props.onPress();
  assert.equal(harness.canBypassDiscard(), false);
  await button.props.onPress();
  assert.equal(harness.events.filter(event => event === 'submit journal').length, 1);
  harness.releaseSave();
  await firstSubmit;
  assert.ok(screenText(harness.render()).includes('Đã gửi nhật ký'));
});

function scheduleHarness(role) {
  const hookState = hooks();
  let row = makeTask(role), failRead = false, failPatch = false, deferRead = false, release;
  const events = [];
  const module = load('src/contexts/work_schedule_context.tsx', {
    react: hookState.react, 'react/jsx-runtime': {},
    './auth_context': { useAuth: () => ({ user: { role, user_id: `${role}-1` }, accessToken: `${role}-token` }) },
    '@/utils/task_dates': dates,
    '@/sevices/session_user': { sessionUserId: () => `${role}-1` },
    '@/sevices/journal_filter': execution,
    '@/sevices/farming_log.service': {
      decodeTaskContent: content => ({ title: content }),
      async listMyTasks() {
        events.push('load tasks');
        if (failRead) throw new Error('Không tải được lịch');
        const snapshot = [{ ...row }];
        if (deferRead) {
          deferRead = false;
          return new Promise(resolve => { release = () => resolve(snapshot); });
        }
        return snapshot;
      },
      async updateTaskStatus(token, taskId, status) {
        events.push('PATCH ' + status);
        assert.equal(token, `${role}-token`); assert.equal(taskId, 'task-1');
        if (failPatch) throw new Error('Không lưu được hoàn thành');
        row = { ...row, status, updated_at: '2026-11-18T08:01:00Z' };
        return { ...row };
      },
    },
  }, '\nexport { useScheduleState };');
  return {
    render: () => hookState.render(() => module.useScheduleState()),
    tasks() { const state = this.render(); return role === 'leader' ? state.leaderTasks : state.workerTasks; },
    rejectReads(value) { failRead = value; },
    rejectPatch(value) { failPatch = value; },
    deferNextRead() { deferRead = true; },
    releaseRead() { assert.ok(release); release(); },
    events,
  };
}

for (const role of ['leader', 'worker']) {
  test(`${role}: confirmed completion resolves before a stalled background refresh`, async () => {
    const harness = scheduleHarness(role);
    await harness.render().loadTasks();
    harness.deferNextRead();
    let resolved = false;
    const completion = harness.render().completeTask('task-1').then(result => {
      resolved = true;
      return result;
    });
    // Flush the PATCH promise and its continuation without resolving the GET.
    await new Promise(resolve => setImmediate(resolve));
    try {
      assert.equal(resolved, true, 'Saving must not wait for a background list request');
      assert.equal(harness.tasks()[0].status, 'done');
      assert.equal(harness.events.filter(event => event === 'load tasks').length, 2);
    } finally {
      harness.releaseRead();
      await completion;
    }
  });

  test(`${role}: a refresh failure cannot undo a confirmed task completion`, async () => {
    const harness = scheduleHarness(role);
    await harness.render().loadTasks();
    harness.rejectReads(true);
    await harness.render().completeTask('task-1');
    const [task] = harness.tasks();
    assert.equal(task.status, 'done');
    assert.equal(task.displayStatus, 'completed');
    assert.equal(task.assigneeStatuses[`${role}-1`].completed, true);
    assert.equal(harness.events.filter(event => event === 'PATCH completed').length, 1);
  });

  test(`${role}: an older task-list response cannot overwrite confirmed completion`, async () => {
    const harness = scheduleHarness(role);
    await harness.render().loadTasks();
    harness.deferNextRead();
    const oldLoad = harness.render().loadTasks();
    await harness.render().completeTask('task-1');
    assert.equal(harness.tasks()[0].status, 'done');
    harness.releaseRead();
    await oldLoad;
    assert.equal(harness.tasks()[0].status, 'done');
  });

  test(`${role}: a rejected completion leaves the task unfinished`, async () => {
    const harness = scheduleHarness(role);
    await harness.render().loadTasks();
    harness.rejectPatch(true);
    await assert.rejects(harness.render().completeTask('task-1'), /Không lưu được hoàn thành/);
    assert.equal(harness.tasks()[0].status, 'doing');
    assert.equal(harness.tasks()[0].assigneeStatuses[`${role}-1`].completed, false);
  });
}
