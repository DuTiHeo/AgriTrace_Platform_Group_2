// Read-only review checks. No real HTTP requests or database writes.
// Run from frontend/owner: node review/check-api.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const webRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(webRoot, '../..');
const inventoryProgram = String.raw`
import ast, json, subprocess, sys
from pathlib import Path
root=Path(sys.argv[1])
def source(filename, remote):
    if not remote: return (root/filename).read_text(encoding='utf-8')
    result=subprocess.run(['git','show','origin/master:'+filename],cwd=root,capture_output=True,encoding='utf-8')
    if result.returncode: raise RuntimeError('Cannot read '+filename+' at origin/master')
    return result.stdout
def inventory(remote):
    prefixes={}
    for n in ast.walk(ast.parse(source('backend/app/main.py',remote))):
        if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='include_router':
            prefixes[n.args[0].value.id]=next(k.value.value for k in n.keywords if k.arg=='prefix')
    routes=[]
    for module,prefix in prefixes.items():
        for n in ast.walk(ast.parse(source('backend/app/routers/'+module+'.py',remote))):
            if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)):
                for d in n.decorator_list:
                    if isinstance(d,ast.Call) and isinstance(d.func,ast.Attribute) and isinstance(d.func.value,ast.Name) and d.func.value.id=='router':
                        routes.append({'method':d.func.attr.upper(),'path':prefix+d.args[0].value})
    return routes
print(json.dumps({'local':inventory(False),'github':inventory(True)}))
`;
const inventoryResult = spawnSync('python', ['-c', inventoryProgram, backendRoot], { encoding: 'utf8' });
if (inventoryResult.status !== 0) throw new Error(inventoryResult.stderr);
const inventory = JSON.parse(inventoryResult.stdout);
const normalize = (value) => value.replace(/\{[^}]*\}/g, '{}');
const signature = ({ method, path: route }) => `${method} ${normalize(route)}`;
const localRoutes = new Set(inventory.local.map(signature));
const githubRoutes = new Set(inventory.github.map(signature));
const calls = new Map();
const unresolved = [];
for (const name of fs.readdirSync(path.join(webRoot, 'src/services')).filter((name) => name.endsWith('.ts'))) {
  const filename = path.join(webRoot, 'src/services', name);
  const tree = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(tree) === 'httpClient'
      && ['get', 'post', 'patch', 'put', 'delete'].includes(node.expression.name.text)) {
      const argument = node.arguments[0];
      const method = node.expression.name.text.toUpperCase();
      let routes = [];
      if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) routes = [argument.text];
      else if (ts.isTemplateExpression(argument)) {
        let route = argument.head.text;
        for (const span of argument.templateSpans) {
          const optionalQuery = ['query', 'params'].includes(span.expression.getText(tree))
            || (ts.isConditionalExpression(span.expression) && span.expression.getText(tree).startsWith('query ?'));
          route += optionalQuery ? '' : '{}';
          route += span.literal.text;
        }
        routes = [route];
      } else if (argument.getText(tree) === 'organizationPath') routes = ['/organizations/mine', '/organizations'];
      else unresolved.push(`${name}:${tree.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      for (const route of routes) {
        const key = `${method} ${route.split('?')[0]}`;
        if (!calls.has(key)) calls.set(key, []);
        calls.get(key).push(`${name}:${tree.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
const missingLocal = [...calls.keys()].filter((key) => !localRoutes.has(key));
const missingGithub = [...calls.keys()].filter((key) => !githubRoutes.has(key));
console.log(JSON.stringify({
  endpointAudit: {
    uniqueServiceEndpoints: calls.size,
    localBackendEndpoints: localRoutes.size,
    githubBackendEndpoints: githubRoutes.size,
    missingLocal,
    missingGithub: missingGithub.map((endpoint) => ({ endpoint, sites: calls.get(endpoint) })),
    unresolved,
    backendRoutesWithoutServiceCalls: [...localRoutes].filter((key) => !calls.has(key)),
  },
}, null, 2));

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
const owner = { user_id: 'owner-1', full_name: 'Owner', phone: '0901000001', role: 'owner', created_at: '2026-01-01' };
const season = { season_id: 'season-1', org_id: 'farm-1', plot_id: 'plot-1', plot_code: 'A1', crop_id: 'crop-1', crop_name: 'Coffee', planting_date: '2026-01-01', status: 'growing', teams: [] };
function harness(responder, env = {}) {
  const requests = [];
  const browserWindow = new EventTarget();
  browserWindow.setTimeout = setTimeout;
  browserWindow.clearTimeout = clearTimeout;
  const sandbox = vm.createContext({
    console, URL, URLSearchParams, Headers, FormData, Event, DOMException, structuredClone, crypto, atob, setTimeout, clearTimeout,
    localStorage: storage(), sessionStorage: storage(), window: browserWindow, __auditEnv: env,
    fetch: async (url, options) => {
      const parsed = new URL(url, 'http://localhost:5173');
      const request = { url, route: parsed.pathname.replace(/^\/api/, ''), options, body: options.body && typeof options.body === 'string' ? JSON.parse(options.body) : options.body };
      requests.push(request);
      const result = await responder(request);
      return { status: result.status ?? 200, ok: (result.status ?? 200) < 400, json: async () => result.payload };
    },
  });
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(webRoot, filename);
    if (!path.extname(filename)) filename += '.ts';
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', '__auditEnv');
    const code = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const localRequire = (request) => request.startsWith('.') ? load(path.resolve(path.dirname(filename), request)) : require(request);
    new vm.Script(`(function(require,module,exports){${code}\n})`, { filename }).runInContext(sandbox)(localRequire, module, module.exports);
    return module.exports;
  }
  return { load, requests, sandbox };
}
let passed = 0;
let issues = 0;
async function check(label, callback) {
  try { await callback(); console.log(`PASS: ${label}`); passed += 1; }
  catch (error) { console.log(`ISSUE: ${label}\n  ${error.message}`); issues += 1; }
}
async function main() {
  await check('All service endpoint paths and methods exist in local backend', () => {
    assert.deepEqual(missingLocal, []);
    assert.deepEqual(unresolved, []);
  });
  if (process.argv.includes('--github')) await check('All service endpoints exist on fetched GitHub', () => assert.deepEqual(missingGithub, []));
  else await check('All endpoints also exist in the clean GitHub baseline', () => assert.deepEqual(missingGithub, []));
  await check('Protected backend/database and compose files match the GitHub baseline', () => {
    const result = spawnSync('git', ['diff', '--exit-code', 'origin/master', '--', 'backend', 'database', 'docker-compose.yml'], { cwd: backendRoot, encoding:'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    for (const name of fs.readdirSync(path.join(webRoot,'src/services')).filter(n=>n.endsWith('.ts'))) {
      assert.ok(!fs.readFileSync(path.join(webRoot,'src/services',name),'utf8').includes('include_details'), name + ': unsupported query parameter');
    }
  });
  await check('Owner login sends phone and stores a bearer token', async () => {
    const app = harness(({ route }) => ({ payload: route === '/auth/login' ? { access_token: 'owner-token' } : owner }));
    const account = app.load('src/services/accountService').accountService;
    await account.login(owner.phone, 'Test@1234');
    assert.equal(app.requests[0].body.phone, owner.phone);
    assert.equal(app.requests[1].options.headers.get('Authorization'), 'Bearer owner-token');
    assert.equal(account.isAuthenticated(), true);
  });
  await check('HTTP 401 clears the expired session', async () => {
    const app = harness(() => ({ status: 401, payload: { detail: 'Expired token' } }));
    const client = app.load('src/services/httpClient').httpClient;
    client.setAccessToken('expired-token');
    await assert.rejects(client.get('/auth/me'));
    assert.equal(client.hasAccessToken(), false, 'Token is still stored after HTTP 401');
  });
  await check('Owner web rejects a worker login', async () => {
    const app = harness(({ route }) => ({ payload: route === '/auth/login' ? { access_token: 'worker-token' } : { ...owner, role: 'worker' } }));
    const account = app.load('src/services/accountService').accountService;
    await assert.rejects(account.login(owner.phone, 'Test@1234'), undefined, 'Worker login was accepted');
    assert.equal(account.isAuthenticated(), false);
  });
  await check('Password change clears the current session', async () => {
    const app = harness(() => ({ payload: { message: 'Changed' } }));
    app.load('src/services/httpClient').httpClient.setAccessToken('token');
    const account = app.load('src/services/accountService').accountService;
    await account.changePassword('Test@1234', 'Test@5678');
    assert.equal(account.isAuthenticated(), false);
  });
  await check('Missing features do not call nonexistent APIs', async () => {
    const app = harness(() => { throw new Error('Unexpected request'); });
    assert.equal(await app.load('src/services/notificationService').notificationService.getUnreadCount(), 0);
    await assert.rejects(app.load('src/services/accountService').accountService.updateAccount({}), /chưa hỗ trợ/);
    assert.equal(app.requests.length, 0);
    assert.ok(!app.load('src/services/harvestService').harvestService.getPublicTraceByCode);
  });
  await check('Baseline auth/me without ID resolves self profile using JWT sub', async () => {
    const token = 'header.' + Buffer.from(JSON.stringify({ sub: owner.user_id })).toString('base64url') + '.signature';
    const { user_id, ...me } = owner;
    const app = harness(({ route }) => ({ payload: route === '/auth/login' ? { access_token: token } : route === '/auth/me' ? me : owner }));
    const result = await app.load('src/services/accountService').accountService.login(owner.phone, 'Test@1234');
    assert.equal(result.id, user_id);
    assert.equal(app.requests.at(-1).route, '/users/' + user_id);
  });
  await check('Staff creation sends only baseline worker fields; assignment is separate', async () => {
    const app = harness(() => ({ payload: { ...owner, user_id:'worker-1', role:'worker', status:'active', org_id:'farm-1' } }));
    const service = app.load('src/services/personnelService');
    await service.createPersonnel({ farmId:'farm-1', fullName:'Worker', phone:'0901234567', initialPassword:'Test@1234', autoGeneratePassword:false, role:'worker' });
    assert.equal(app.requests.length, 1);
    assert.equal(app.requests[0].route, '/users');
    assert.equal('role' in app.requests[0].body, false);
    assert.equal('team_id' in app.requests[0].body, false);
    await assert.rejects(service.createPersonnel({ role:'leader', teamId:'team-1' }), /Tạo công nhân trước/);
    assert.equal(app.requests.length, 1);
  });
  await check('Failed transfer never removes the previous membership first', async () => {
    const app = harness(({route}) => route === '/users/worker-1' ? { payload: { ...owner, user_id:'worker-1', role:'worker', status:'active', org_id:'farm-1', team_id:'old-team' } }
      : route === '/teams/new-team' ? { payload:{org_id:'farm-1'} } : { status:400, payload:{detail:'Transfer rejected'} });
    await assert.rejects(app.load('src/services/personnelService').transferPersonnel('worker-1',{teamId:'new-team'}), /Transfer rejected/);
    assert.equal(app.requests.some(r=>r.options.method === 'DELETE'), false);
    assert.equal(app.requests.at(-1).route, '/teams/new-team/members');
  });
  await check('Tasks use plot/team/worker payload without unsupported metadata', async () => {
    const member={ ...owner, user_id:'worker-1', role:'worker', status:'active', org_id:'farm-1', team_id:'team-1' };
    const app=harness(({route,options})=>({payload:
      route==='/auth/me' || route==='/users/owner-1' ? owner : route==='/users/worker-1' ? member :
      route==='/users' ? [member] : route==='/seasons' || route==='/farming-logs' || (route==='/tasks' && options.method==='GET') ? [] :
      route==='/teams/team-1' ? {team_id:'team-1',org_id:'farm-1',name:'Team',members:[member]} :
      route==='/plots/plot-1' ? {plot_id:'plot-1',org_id:'farm-1',status:'active',code:'A1',area:1} :
      { task_id:'task-1',org_id:'farm-1',plot_id:'plot-1',team_id:'team-1',worker_id:'worker-1',status:'in_progress' }
    }));
    await app.load('src/services/taskService').taskService.create({ farmId:'farm-1',plotId:'plot-1',teamId:'team-1',assigneeId:'worker-1',content:'Task',startAt:'2026-10-03T08:00:00+07:00',dueAt:'2026-10-03T09:00:00+07:00' });
    const body=app.requests.find(r=>r.route==='/tasks' && r.options.method==='POST').body;
    assert.equal(body.plot_id,'plot-1'); assert.equal(body.worker_id,'worker-1');
    assert.equal('season_id' in body,false); assert.equal('assigned_by_id' in body,false);
  });
  await check('Photo URLs target the configured API origin', async () => {
    const app = harness(({ route }) => ({ payload: route === '/auth/me' || route === '/users/owner-1' ? owner : route.startsWith('/seasons/') ? season : {
      log_id: 'log-1', season_id: 'season-1', org_id: 'farm-1', gps: { latitude: 12, longitude: 108 },
      photos: [{ photo_id: 'photo-1', url: '/uploads/photo.jpg' }],
    } }), { VITE_API_BASE_URL: 'https://api.example.test' });
    const log = await app.load('src/services/farmingLogService').farmingLogService.getById('log-1');
    assert.equal(log.photos[0].url, 'https://api.example.test/uploads/photo.jpg');
  });
  await check('Baseline log summaries hydrate photos/notes and join plots from one season collection', async () => {
    const logs = [1, 2, 3].map((id) => ({ log_id: `log-${id}`, season_id: 'season-1', org_id: 'farm-1', logged_at: '2026-10-01', photos: [], notes: [] }));
    const app = harness(({ route }) => ({ payload: route === '/auth/me' || route === '/users/owner-1' ? owner : route === '/farming-logs' ? logs : route === '/seasons' ? [season] : route.startsWith('/seasons/') ? season : logs.find((log) => route.endsWith(log.log_id)) }));
    await app.load('src/services/farmingLogService').farmingLogService.getAll('farm-1');
    const seasonRequests = app.requests.filter(({ route }) => route === '/seasons/season-1').length;
    assert.equal(seasonRequests, 0);
    assert.equal(app.requests.length, 7);
  });
  await check('Concurrent GETs share transport and return independent values', async () => {
    let release;
    const app = harness(() => new Promise((resolve) => { release = resolve; }));
    const client = app.load('src/services/httpClient').httpClient;
    const first = client.get('/cache'), second = client.get('/cache');
    release({ payload: { nested: { value: 1 } } });
    const [a, b] = await Promise.all([first, second]);
    a.nested.value = 9;
    assert.equal(b.nested.value, 1);
    assert.equal((await client.get('/cache')).nested.value, 1);
    assert.equal(app.requests.length, 1);
  });
  await check('Mutations invalidate cache and older in-flight reads', async () => {
    let release, reads = 0;
    const app = harness(({ options }) => options.method !== 'GET' ? { payload: {} } :
      ++reads === 1 ? new Promise((resolve) => { release = resolve; }) : { payload: { version: reads } });
    const client = app.load('src/services/httpClient').httpClient;
    const old = client.get('/items');
    await client.post('/items', {});
    release({ payload: { version: 1 } });
    await old;
    assert.equal((await client.get('/items')).version, 2);
  });
  await check('A late 401 from the previous session does not log out the new session', async () => {
    let release;
    const app = harness(() => new Promise((resolve) => { release = resolve; }));
    const client = app.load('src/services/httpClient').httpClient;
    client.setAccessToken('old');
    const previous = client.get('/auth/me');
    client.setAccessToken('new');
    release({ status: 401, payload: { detail: 'Expired' } });
    await assert.rejects(previous);
    assert.equal(app.sandbox.sessionStorage.getItem('farmer_quicklog_access_token'), 'new');
  });
  await check('HTTP transport limits concurrent requests to six', async () => {
    const releases = []; let active = 0, peak = 0;
    const app = harness(() => new Promise((resolve) => {
      active++; peak = Math.max(peak, active);
      releases.push(() => { active--; resolve({ payload: {} }); });
    }));
    const client = app.load('src/services/httpClient').httpClient;
    const requests = Array.from({ length: 19 }, (_, i) => client.get(`/items/${i}`));
    let completed = 0;
    while (completed < 19) {
      const release = releases.shift();
      assert.ok(release, 'Request queue stalled');
      release(); completed++;
      await new Promise((resolve) => setImmediate(resolve));
    }
    await Promise.all(requests);
    assert.equal(peak, 6);
  });
  await check('The actual QR component decodes to its complete trace URL', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const jsQR = require('jsqr');
    const app = harness(() => { throw new Error('QR should not fetch'); });
    const Component = app.load('src/components/harvests/TraceabilityCode.tsx').default;
    for (const value of ['https://farm.example.test/trace/AGT-AB12-20261002-FF01', '/trace/AGT-AB12-20261002-FF01']) {
      const svg = renderToStaticMarkup(React.createElement(Component, { value }));
      const cells = Number(svg.match(/viewBox="0 0 (\d+) /)[1]);
      const scale = 8, size = cells * scale;
      const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
      const path = [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].at(-1)[1];
      let runs = 0;
      for (const match of path.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g)) {
        const x = Number(match[1]), y = Number(match[2]), width = Number(match[3]); runs++;
        for (let py = y * scale; py < (y + 1) * scale; py++) {
          for (let px = x * scale; px < (x + width) * scale; px++) {
            const offset = (py * size + px) * 4;
            pixels[offset] = 16; pixels[offset + 1] = 44; pixels[offset + 2] = 29;
          }
        }
      }
      assert.ok(runs > 0);
      assert.equal(jsQR(pixels, size, size)?.data, value);
    }
  });
  console.log(JSON.stringify({ passed, issues, note: 'Mocked transport and source inventory only; no live API or browser test.' }));
  if (issues) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
