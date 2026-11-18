const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { TabRouter } = require('expo-router/build/react-navigation/routers/TabRouter');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/hooks/use_finish_tab_flow.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness(role, { visitDiary = false, fromDiary = false, seeded = false } = {}) {
  const names = [...fs.readFileSync(path.join(root, `src/(mobile)/${role}/_layout.tsx`), 'utf8').matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map(match => match[1]);
  const formName = role === 'leader' ? 'capture' : 'report_note';
  const home = { key: `${role}-home`, name: 'index', params: { taskId: '' } };
  const diary = { key: `${role}-diary`, name: 'diary', params: { period: 'week', plotId: 'plot-1' } };
  const form = { key: `${role}-form`, name: formName, params: { taskId: 'task-1', taskTitle: 'Tưới nước' } };
  const routes = [home, ...(visitDiary ? [diary] : []), form];
  let state = {
    stale: false, key: `${role}-tabs`, routeKeySeq: 4,
    routeNames: names, routes, index: routes.length - 1,
    ...(seeded ? {} : { type: 'tab', history: [
      { type: 'route', key: home.key, params: home.params },
      ...(fromDiary ? [{ type: 'route', key: diary.key, params: diary.params }] : []),
      { type: 'route', key: form.key, params: form.params },
    ] }),
  };
  const actions = [];
  const router = TabRouter({ backBehavior: 'fullHistory', initialRouteName: 'index' });
  const navigation = {
    getState: () => state,
    dispatch(action) {
      actions.push(action);
      const result = router.getStateForAction(state, action, { routeNames: state.routeNames, routeGetIdList: {} });
      assert.equal(typeof result, 'object', `Unhandled ${action.type}`);
      state = result.state;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require(name) {
    assert.equal(name, 'expo-router');
    return { useNavigation: () => navigation };
  } });
  return { finish: exports.useFinishTabFlow(), state: () => state, actions, home, diary, form, navigation };
}

for (const role of ['leader', 'worker']) {
  test(`${role}: seeded tab state can finish into a diary that has never been visited`, () => {
    const value = harness(role, { seeded: true });
    assert.equal(value.state().type, undefined);
    assert.equal(value.state().routes.some(route => route.name === 'diary'), false);
    assert.doesNotThrow(() => value.finish('diary'));
    assert.equal(value.actions[0].type, 'REPLACE');
    const state = value.state();
    assert.equal(state.routes[state.index].name, 'diary');
    assert.equal(state.history.some(entry => entry.key === value.form.key), false);
  });

  test(`${role}: replacing a completed form preserves the opener and an existing diary filter`, () => {
    const value = harness(role, { visitDiary: true });
    value.finish('diary');
    const state = value.state();
    const focused = state.routes[state.index];
    assert.equal(focused.name, 'diary');
    assert.deepEqual(focused.params, value.diary.params);
    assert.deepEqual(state.routes.find(route => route.key === value.home.key), value.home);
    assert.deepEqual(state.history.map(entry => entry.key), [value.home.key, value.diary.key]);
    value.navigation.dispatch({ type: 'GO_BACK', target: state.key });
    assert.equal(value.state().routes[value.state().index].name, 'index');
  });

  test(`${role}: an unvisited declared diary can replace the form without losing its opener`, () => {
    const value = harness(role);
    value.finish('diary');
    const state = value.state();
    const focused = state.routes[state.index];
    assert.equal(focused.name, 'diary');
    assert.deepEqual(state.history.map(entry => entry.key), [value.home.key, focused.key]);
    value.navigation.dispatch({ type: 'GO_BACK', target: state.key });
    assert.equal(value.state().routes[value.state().index].name, 'index');
  });

  test(`${role}: a form opened from diary returns without adding a duplicate diary Back entry`, () => {
    const value = harness(role, { visitDiary: true, fromDiary: true });
    value.finish('diary');
    assert.equal(value.actions[0].type, 'GO_BACK');
    assert.deepEqual(value.state().history.map(entry => entry.key), [value.home.key, value.diary.key]);
    assert.deepEqual(value.state().routes[value.state().index].params, value.diary.params);
  });
}

test('an undeclared destination fails before dispatch instead of resetting unrelated routes', () => {
  const value = harness('leader');
  assert.throws(() => value.finish('does-not-exist'), /sibling tab/);
  assert.equal(value.actions.length, 0);
});
