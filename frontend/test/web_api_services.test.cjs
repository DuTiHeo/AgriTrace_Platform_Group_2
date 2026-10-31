const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/sevices/webApi_wb.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const calls = [];
let fail = false;
const failure = new Error('API unavailable');
const httpClient = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, async (...args) => {
  calls.push({ method, args });
  if (fail) throw failure;
  return { received: true };
}]));
const exportsObject = {};
vm.runInNewContext(code, {
  exports: exportsObject, require: () => ({ httpClient }), URLSearchParams, FormData, Blob,
});
const { webApi } = exportsObject;
const catalog = fs.readFileSync(path.join(root, 'src/sevices/WEB_API_CATALOG.md'), 'utf8');
const operations = [...catalog.matchAll(/\| `webApi\.(\w+)\.(\w+)` \| (GET|POST|PUT|PATCH|DELETE) \| `([^`]+)` \| (Có|Không) \|/g)]
  .map(([, group, name, method, route, auth]) => ({ group, name, method, route, authenticated: auth === 'Có' }));

test('import does not send requests; catalog includes every backend router operation', () => {
  assert.equal(calls.length, 0);
  // Read Python syntax only: do not import the backend, connect to DB, or run it.
  const script = `
import ast, json, pathlib
root = pathlib.Path(${JSON.stringify(path.join(root, '..', 'backend', 'app'))})
routes = []
main = ast.parse((root / 'main.py').read_text(encoding='utf-8-sig'))
for node in ast.walk(main):
 if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute): continue
 if node.func.attr != 'include_router': continue
 module = node.args[0].value.id
 prefix = next(k.value.value for k in node.keywords if k.arg == 'prefix')
 tree = ast.parse((root / 'routers' / (module + '.py')).read_text(encoding='utf-8-sig'))
 for fn in ast.walk(tree):
  if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)): continue
  for dec in fn.decorator_list:
   if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.func.attr in ('get','post','put','patch','delete'):
    routes.append(dec.func.attr.upper() + ' ' + prefix + dec.args[0].value)
for node in ast.walk(main):
 if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)): continue
 for dec in node.decorator_list:
  if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and isinstance(dec.func.value, ast.Name) and dec.func.value.id == 'app' and dec.func.attr == 'get':
   routes.append('GET ' + dec.args[0].value)
print(json.dumps(sorted(routes)))
`;
  const result = spawnSync('python', ['-c', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(operations.map(op => `${op.method} ${op.route}`).sort(), JSON.parse(result.stdout));
  assert.equal(Object.values(webApi).reduce((count, group) => count + Object.keys(group).length, 0), operations.length);
});

test('all operations use the expected HTTP verb, encoded path, body, and auth setting', async () => {
  for (const operation of operations) {
    calls.length = 0;
    const pathArgs = Object.fromEntries([...operation.route.matchAll(/\{([^}]+)\}/g)].map(([, key]) => [key, 'id /?&']));
    const args = {
      path: pathArgs,
      query: { keyword: 'cà phê & trà', include_cancelled: false, offset: 0, skip: undefined, from_time: null },
      body: operation.name === 'uploadLogPhotos' ? { files: [new Blob(['photo'])] } : { description: 'Báo lỗi thử' },
      cacheTtl: 0,
    };
    await webApi[operation.group][operation.name](args);
    assert.equal(calls.length, 1, operation.name);
    const call = calls[0];
    assert.equal(call.method, operation.method.toLowerCase());
    const expected = operation.route.replace(/\{[^}]+\}/g, encodeURIComponent('id /?&'));
    const url = new URL(call.args[0], 'http://test');
    assert.equal(url.pathname, expected);
    const options = call.args.at(-1);
    assert.equal(options.authenticated, operation.authenticated);
    assert.equal(options.cacheTtl, 0);
    if (url.search) {
      assert.equal(url.searchParams.get('keyword'), 'cà phê & trà');
      assert.equal(url.searchParams.get('include_cancelled'), 'false');
      assert.equal(url.searchParams.get('offset'), '0');
      assert.equal(url.searchParams.has('skip'), false);
      assert.equal(url.searchParams.has('from_time'), false);
    }
    if (operation.name === 'uploadLogPhotos') {
      assert.ok(call.args[1] instanceof FormData);
      assert.equal(call.args[1].getAll('files').length, 1);
      assert.equal(await call.args[1].get('files').text(), 'photo');
    }
  }
});

test('optional arguments work and backend failures propagate', async () => {
  calls.length = 0;
  await webApi.notifications.listMyNotifications();
  assert.equal(calls[0].args[0], '/notifications');
  fail = true;
  await assert.rejects(webApi.errorReports.listErrorReports(), error => error === failure);
  fail = false;
});

test('JSON payloads, query aliases and cancellation pass through unchanged', async () => {
  calls.length = 0;
  const body = { error_type: 'bug', description: 'Không lưu được công việc' };
  const controller = new AbortController();
  await webApi.errorReports.createErrorReport({ body, query: { org_id: 'farm-1' }, signal: controller.signal });
  assert.equal(calls[0].args[1], body);
  assert.equal(calls[0].args[2].signal, controller.signal);
  assert.equal(new URL(calls[0].args[0], 'http://test').searchParams.get('org_id'), 'farm-1');
  await webApi.errorReports.listErrorReports({ query: { status: 'new', limit: 10, offset: 0 } });
  assert.equal(calls[1].args[0], '/error-reports?status=new&limit=10&offset=0');
});
