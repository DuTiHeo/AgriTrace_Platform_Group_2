const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const hookPath = path.join(root, 'node_modules/expo-router/build/standard-navigation/useVisibleTabsWithRedirect.js');

function screenDeclarations(role) {
  const filename = path.join(root, `src/(mobile)/${role}/_layout.tsx`);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const screens = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'Tabs.Screen') {
      const name = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'name')?.initializer?.text;
      const options = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'options');
      const hidden = options && /href\s*:\s*null|hidden\s*:\s*true/.test(options.getText(source));
      if (name) screens.push({ name, hidden: Boolean(hidden) });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return screens;
}
function resolveFocusedRoute(screens, focused) {
  const redirects = [];
  const exports = {};
  const mocks = {
    react: { useMemo: callback => callback(), useEffect: callback => callback() },
    '../Route': { useRouteNode: () => ({ contextKey: 'test-layout' }) },
    '../constants': { NOT_FOUND_ROUTE_NAME: '+not-found' },
    '../global-state/useRouterActions': { useRouterActions: () => ({ replace: href => redirects.push(href) }) },
    '../layouts/GuardContext': { useGuardRedirect: () => undefined },
    '../link/preview/PreviewRouteContext': { useIsPreview: () => false },
    '../react-navigation/native': { useIsFocused: () => true },
    '../routeNode': { getValidInitialRouteName: () => 'index' },
    '../utils/orderRoutesByRouteNames': { orderRoutesByRouteNames: routes => routes },
    './useBuildHref': { useBuildHref: () => route => '/' + route.name },
  };
  vm.runInNewContext(fs.readFileSync(hookPath, 'utf8'), { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; }, __DEV__: false });
  const routes = screens.map(screen => ({ key: screen.name, name: screen.name }));
  const descriptors = Object.fromEntries(screens.map(screen => [screen.name, { routeSource: 'layout', options: { hidden: screen.hidden } }]));
  const result = exports.useVisibleTabsWithRedirect({ routes, routeNames: routes.map(route => route.name), focusedRouteKey: focused, descriptors });
  return { redirects, result };
}
test('reproduces Expo Router redirect for a focused hidden form route', () => {
  const { redirects } = resolveFocusedRoute([{ name: 'index', hidden: false }, { name: 'report_note', hidden: true }], 'report_note');
  assert.deepEqual(redirects, ['/index']);
});
for (const role of ['worker', 'leader']) {
  test(`${role}: every declared screen exists and can be focused without redirecting home`, () => {
    const screens = screenDeclarations(role);
    assert.ok(screens.length > 5);
    const files = fs.readdirSync(path.join(root, `src/(mobile)/${role}`)).filter(file => file.endsWith('.tsx') && file !== '_layout.tsx');
    for (const file of files) assert.ok(screens.some(screen => screen.name === file.slice(0, -4)), `Undeclared ${role}/${file}`);
    for (const screen of screens) {
      assert.ok(fs.existsSync(path.join(root, `src/(mobile)/${role}/${screen.name}.tsx`)), screen.name);
      const { redirects, result } = resolveFocusedRoute(screens, screen.name);
      assert.deepEqual(redirects, [], screen.name);
      assert.ok(result.focusedIndex >= 0, screen.name);
    }
  });
}
