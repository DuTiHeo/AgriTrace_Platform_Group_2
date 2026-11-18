const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function loadService(name, handler, relationships = new Map()) {
  const calls = [];
  const events = [];
  const httpClient = Object.fromEntries(['get', 'post', 'patch', 'delete'].map(method => [method, async (...args) => {
    calls.push({ method, args });
    return handler(method, ...args);
  }]));
  const exports = {};
  const source = fs.readFileSync(path.resolve(__dirname, `../src/sevices/${name}.ts`), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dependencies = {
    './httpClient_wb': { httpClient },
    '../features/owner/relationshipService_wb': { async getPlotRelationships() { return relationships; } },
  };
  vm.runInNewContext(code, {
    exports, Error, URLSearchParams, Event,
    require(name) { assert.ok(name in dependencies, name); return dependencies[name]; },
    window: { dispatchEvent(event) { events.push(event.type); } },
  });
  return { ...exports, calls, events };
}

const plot = {
  plot_id: 'p1', org_id: 'f1', code: 'DL-04', area: 1.5, status: 'active',
  current_season_id: 's1', current_crop_name: 'Bắp cải', boundary_geojson: null,
};

test('plot detail displays the active season returned by the server', async () => {
  const service = loadService('plotService_wb', () => plot, new Map([
    ['p1', { seasons: 2, tasks: 5, cultivationLogs: 8 }],
  ]));
  const result = await service.plotService.getById('p1');
  assert.equal(result.currentSeasonId, 's1');
  assert.equal(result.currentSeasonName, 'Bắp cải · DL-04');
  assert.equal(result.currentSeasonStatus, 'active');
  assert.equal(result.linkedData.seasons, 2);
  assert.deepEqual(service.calls.map(call => call.args[0]), ['/plots/p1']);
});

test('plot season display follows the current season ID and has a missing-name fallback', async () => {
  const service = loadService('plotService_wb', (_, route) => route.endsWith('/p1')
    ? { ...plot, current_season_id: null }
    : { ...plot, plot_id: 'p2', current_crop_name: '  ' });
  const completed = await service.plotService.getById('p1');
  assert.equal(completed.currentSeasonId, null);
  assert.equal(completed.currentSeasonName, null);
  assert.equal(completed.currentSeasonStatus, 'none');
  const reopened = await service.plotService.getById('p2');
  assert.equal(reopened.currentSeasonName, 'Mùa vụ · DL-04');
  assert.equal(reopened.currentSeasonStatus, 'active');
});

const seasonDto = (id = 's1', overrides = {}) => ({
  season_id: id, org_id: 'f1', plot_id: id === 's1' ? 'p1' : `p-${id}`, plot_code: 'DL-04',
  crop_id: 'c1', crop_name: 'Bắp cải', status: 'ready_to_harvest', planting_date: '2026-07-10',
  expected_harvest_date: '2026-09-23', actual_harvest_date: null, ...overrides,
});
const batchDto = (id = 'b1', overrides = {}) => ({
  batch_id: id, batch_code: `BATCH-${id}`, org_id: 'f1', quantity: 25,
  harvest_date: '2026-11-18', status: 'pending', qr_url: null,
  created_at: '2026-11-18T07:00:00Z', updated_at: '2026-11-18T07:00:00Z', ...overrides,
});
const contribution = (batchId = 'b1', seasonId = 's1', overrides = {}) => ({
  batch_id: batchId, season_id: seasonId, contributed_quantity: 25, status: 'active', ...overrides,
});
const createInput = (overrides = {}) => ({
  farmId: 'f1', harvestDate: '2026-11-18', contributions: [{ seasonId: 's1', quantityKg: 25 }], ...overrides,
});
const changedEvents = ['harvest-batches-updated', 'seasons-updated', 'plots-updated'];

// Stateful API double checks saved state across calls without reaching a real API.
function fixture(options = {}) {
  const seasons = new Map((options.seasons ?? [seasonDto()]).map(item => [item.season_id, { ...item }]));
  const batches = new Map((options.batches ?? [batchDto()]).map(item => [item.batch_id, { ...item }]));
  const links = (options.links ?? [contribution()]).map(item => ({ ...item }));
  const state = { seasons, batches, links, failSeasonPatch: false, failSeasonPatchFor: null, failMutation: false, failDetailAfterLinkMutation: false, detailFailures: 0 };
  function detail(id) {
    assert.ok(batches.has(id), `Unknown batch ${id}`);
    return { ...batches.get(id), seasons: links.filter(link => link.batch_id === id && link.status !== 'cancelled').map(link => ({
      ...seasons.get(link.season_id), ...link, season_status: seasons.get(link.season_id)?.status,
    })) };
  }
  const api = loadService('harvestService_wb', async (method, route, body) => {
    const url = new URL(route, 'https://test.invalid');
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (method !== 'get' && state.failMutation) throw new Error('Mutation rejected');
    if (parts[0] === 'seasons') {
      if (method === 'get' && parts.length === 1) return [...seasons.values()].filter(item =>
        (!url.searchParams.has('plot_id') || item.plot_id === url.searchParams.get('plot_id')) &&
        (!url.searchParams.has('org_id') || item.org_id === url.searchParams.get('org_id'))).map(item => ({ ...item }));
      const season = seasons.get(parts[1]);
      assert.ok(season, `Unknown season ${parts[1]}`);
      if (method === 'get') return { ...season };
      if (method === 'patch') {
        if (state.failSeasonPatch || state.failSeasonPatchFor === parts[1]) throw new Error('Season update unavailable');
        Object.assign(season, body);
        return { ...season };
      }
    }
    if (parts[0] === 'harvest-batches') {
      if (method === 'post' && parts.length === 1) {
        const id = `new-${batches.size + 1}`;
        batches.set(id, batchDto(id, { org_id: body.org_id, harvest_date: body.harvest_date, quantity: body.initial_seasons.reduce((sum, item) => sum + item.contributed_quantity, 0), status: body.status ?? 'pending' }));
        for (const item of body.initial_seasons) links.push(contribution(id, item.season_id, { contributed_quantity: item.contributed_quantity }));
        return detail(id);
      }
      if (method === 'get' && parts.length === 1) return [...batches.values()].filter(item => !url.searchParams.has('org_id') || item.org_id === url.searchParams.get('org_id')).map(item => ({ ...item }));
      if (method === 'get') {
        if (state.detailFailures > 0) { state.detailFailures -= 1; throw new Error('Saved lot detail unavailable'); }
        return detail(parts[1]);
      }
      const batch = batches.get(parts[1]);
      assert.ok(batch, `Unknown batch ${parts[1]}`);
      if (method === 'delete') batch.status = 'cancelled';
      else if (method === 'patch') Object.assign(batch, body);
      else if (parts[2] === 'generate-qr') Object.assign(batch, { status: 'ready', qr_url: `https://trace.invalid/${batch.batch_code}` });
      else throw new Error(`Unexpected harvest mutation ${method} ${route}`);
      return detail(parts[1]);
    }
    if (parts[0] === 'batch-seasons') {
      if (method === 'get' && parts[1] === 'by-season') return links.filter(link => link.season_id === parts[2] && (url.searchParams.get('include_cancelled') === 'true' || link.status !== 'cancelled')).map(link => ({
        ...link, batch_status: batches.get(link.batch_id).status, harvest_date: batches.get(link.batch_id).harvest_date, batch_code: batches.get(link.batch_id).batch_code,
      }));
      if (method === 'get' && parts[1] === 'by-batch') return links.filter(link => link.batch_id === parts[2] && (url.searchParams.get('include_cancelled') === 'true' || link.status !== 'cancelled')).map(link => ({ ...seasons.get(link.season_id), ...link }));
      if (method === 'post') {
        let link = links.find(item => item.batch_id === body.batch_id && item.season_id === body.season_id);
        if (link) Object.assign(link, body, { status: 'active' });
        else { link = contribution(body.batch_id, body.season_id, body); links.push(link); }
        if (state.failDetailAfterLinkMutation) state.detailFailures = 1;
        return { ...link };
      }
      const link = links.find(item => item.batch_id === parts[1] && item.season_id === parts[2]);
      assert.ok(link, `Unknown contribution ${route}`);
      if (method === 'delete') {
        link.status = 'cancelled';
        if (state.failDetailAfterLinkMutation) state.detailFailures = 1;
      }
      else if (method === 'patch') Object.assign(link, body);
      else if (method !== 'get') throw new Error(`Unexpected contribution mutation ${method} ${route}`);
      return { ...link };
    }
    throw new Error(`Unexpected request ${method} ${route}`);
  });
  return { ...api, state, detail };
}
function assertRefreshed(api) { for (const event of changedEvents) assert.ok(api.events.includes(event), event); }
function requests(api, method, route) { return api.calls.filter(call => call.method === method && call.args[0].split('?')[0] === route); }

test('creating a pending lot completes its season using the selected harvest date', async () => {
  const api = fixture({ batches: [], links: [] });
  const result = await api.harvestService.create(createInput());
  assert.equal(result.status, 'pending');
  assert.equal(api.state.seasons.get('s1').status, 'completed');
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, '2026-11-18');
  assert.equal(requests(api, 'post', '/harvest-batches').length, 1);
  assertRefreshed(api);
  for (const call of api.calls.filter(call => call.method === 'get')) assert.equal(call.args[1]?.cacheTtl, 0, call.args[0]);
});

test('one new lot completes every contributing season', async () => {
  const api = fixture({ seasons: [seasonDto(), seasonDto('s2')], batches: [], links: [] });
  await api.harvestService.create(createInput({ contributions: [{ seasonId: 's1', quantityKg: 5 }, { seasonId: 's2', quantityKg: 20 }] }));
  for (const season of api.state.seasons.values()) {
    assert.equal(season.status, 'completed');
    assert.equal(season.actual_harvest_date, '2026-11-18');
  }
});

test('invalid create inputs are rejected before saving a lot', async t => {
  for (const [name, input] of [
    ['empty selection', createInput({ contributions: [] })],
    ['duplicate season', createInput({ contributions: [{ seasonId: 's1', quantityKg: 2 }, { seasonId: 's1', quantityKg: 3 }] })],
    ['zero quantity', createInput({ contributions: [{ seasonId: 's1', quantityKg: 0 }] })],
    ['missing date', createInput({ harvestDate: '' })],
  ]) await t.test(name, async () => {
    const api = fixture({ batches: [], links: [] });
    await assert.rejects(api.harvestService.create(input));
    assert.equal(requests(api, 'post', '/harvest-batches').length, 0);
    assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
    assert.deepEqual(api.events, []);
  });
});

test('all seasons are checked for crop, farm and readiness before creating a lot', async t => {
  for (const [name, overrides] of [
    ['mixed crops', { crop_id: 'c2' }], ['different farm', { org_id: 'f2' }], ['still growing', { status: 'growing' }],
  ]) await t.test(name, async () => {
    const api = fixture({ seasons: [seasonDto(), seasonDto('s2', overrides)], batches: [], links: [] });
    await assert.rejects(api.harvestService.create(createInput({ contributions: [{ seasonId: 's1', quantityKg: 1 }, { seasonId: 's2', quantityKg: 2 }] })));
    assert.equal(requests(api, 'post', '/harvest-batches').length, 0);
    assert.equal(requests(api, 'patch', '/seasons/s1').length, 0);
  });
});

test('cancelling the last lot reopens its season and clears actual harvest date', async () => {
  const api = fixture({ seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' })] });
  assert.equal((await api.harvestService.cancel('b1')).status, 'cancelled');
  assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, null);
  assertRefreshed(api);
});

test('other pending and ready lots keep a season completed until the final cancellation', async () => {
  const api = fixture({
    seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-19' })],
    batches: [batchDto('b1', { status: 'ready', harvest_date: '2026-11-19' }), batchDto('b2', { status: 'pending', harvest_date: '2026-11-18' })],
    links: [contribution(), contribution('b2')],
  });
  await api.harvestService.cancel('b1');
  assert.equal(api.state.seasons.get('s1').status, 'completed');
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, '2026-11-18');
  await api.harvestService.cancel('b2');
  assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
});

test('cancelled batches and cancelled contribution links do not prevent reopening', async () => {
  const api = fixture({
    seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' })],
    batches: [batchDto(), batchDto('b2', { status: 'cancelled' }), batchDto('b3', { status: 'ready' })],
    links: [contribution(), contribution('b2'), contribution('b3', 's1', { status: 'cancelled' })],
  });
  await api.harvestService.cancel('b1');
  assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
});

test('restoring a cancelled lot completes its reopened season again', async () => {
  const api = fixture({ batches: [batchDto('b1', { status: 'cancelled' })] });
  await api.harvestService.update('b1', { status: 'pending' });
  assert.equal(api.state.seasons.get('s1').status, 'completed');
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, '2026-11-18');
});

test('editing harvest date recalculates the latest effective harvest date', async () => {
  const api = fixture({
    seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-20' })],
    batches: [batchDto(), batchDto('b2', { harvest_date: '2026-11-20' })], links: [contribution(), contribution('b2')],
  });
  await api.harvestService.update('b1', { harvestDate: '2026-11-21' });
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, '2026-11-21');
  await api.harvestService.update('b1', { harvestDate: '2026-11-17' });
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, '2026-11-20');
});

test('removing and re-adding a contribution updates its season lifecycle', async () => {
  const api = fixture({ seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' })] });
  await api.harvestService.removeContribution('b1', 's1');
  assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
  await api.harvestService.addContribution('b1', { seasonId: 's1', quantityKg: 25 });
  assert.equal(api.state.seasons.get('s1').status, 'completed');
});

test('last-lot cancellation is blocked before saving when a newer season occupies its plot', async () => {
  const api = fixture({ seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' }), seasonDto('s2', { plot_id: 'p1', status: 'growing' })] });
  await assert.rejects(api.harvestService.cancel('b1'));
  assert.equal(api.state.batches.get('b1').status, 'pending');
  assert.equal(requests(api, 'delete', '/harvest-batches/b1').length, 0);
  assert.deepEqual(api.events, []);
});

test('last-contribution removal is blocked before saving when a newer season occupies its plot', async () => {
  const api = fixture({ seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' }), seasonDto('s2', { plot_id: 'p1', status: 'ready_to_harvest' })] });
  await assert.rejects(api.harvestService.removeContribution('b1', 's1'));
  assert.equal(api.state.links[0].status, 'active');
  assert.equal(requests(api, 'delete', '/batch-seasons/b1/s1').length, 0);
});

test('a saved-lot synchronization failure can retry without creating a duplicate', async () => {
  const api = fixture({ batches: [], links: [] });
  api.state.failSeasonPatch = true;
  let savedError;
  await assert.rejects(api.harvestService.create(createInput()), error => {
    assert.ok(error instanceof api.HarvestSeasonSyncError);
    savedError = error;
    assert.ok(error.batch.id);
    assert.ok(error.seasonIds.includes('s1'));
    return true;
  });
  assert.equal(api.state.batches.size, 1);
  assertRefreshed(api);
  api.state.failSeasonPatch = false;
  await api.harvestService.syncSeasonStatuses(savedError.batch.id, savedError.seasonIds);
  assert.equal(api.state.seasons.get('s1').status, 'completed');
  assert.equal(requests(api, 'post', '/harvest-batches').length, 1);
});

test('a failed synchronization after cancellation retries the already cancelled lot', async () => {
  const api = fixture({ seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' })] });
  api.state.failSeasonPatch = true;
  let savedError;
  await assert.rejects(api.harvestService.cancel('b1'), error => {
    assert.ok(error instanceof api.HarvestSeasonSyncError);
    assert.equal(error.batch.status, 'cancelled');
    savedError = error;
    return true;
  });
  api.state.failSeasonPatch = false;
  await api.harvestService.syncSeasonStatuses('b1', savedError.seasonIds);
  assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
  assert.equal(requests(api, 'delete', '/harvest-batches/b1').length, 1);
});

test('retry after a contribution is removed retains that season ID', async () => {
  const api = fixture({ seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' })] });
  api.state.failSeasonPatch = true;
  let savedError;
  await assert.rejects(api.harvestService.removeContribution('b1', 's1'), error => {
    assert.ok(error instanceof api.HarvestSeasonSyncError);
    assert.ok(error.seasonIds.includes('s1'));
    savedError = error;
    return true;
  });
  assert.equal(api.detail('b1').seasons.length, 0);
  api.state.failSeasonPatch = false;
  await api.harvestService.syncSeasonStatuses('b1', savedError.seasonIds);
  assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
  assert.equal(requests(api, 'delete', '/batch-seasons/b1/s1').length, 1);
});

test('explicit synchronization repairs an existing lot and is idempotent', async () => {
  const api = fixture();
  await api.harvestService.syncSeasonStatuses('b1');
  assert.equal(api.state.seasons.get('s1').status, 'completed');
  assert.equal(requests(api, 'post', '/harvest-batches').length, 0);
  const patchCount = requests(api, 'patch', '/seasons/s1').length;
  await api.harvestService.syncSeasonStatuses('b1');
  assert.equal(requests(api, 'patch', '/seasons/s1').length, patchCount);
});

test('ordinary quantity, metadata and QR changes preserve the API contracts', async () => {
  const api = fixture();
  await api.harvestService.update('b1', { code: ' BATCH-updated ' });
  assert.equal(api.state.batches.get('b1').batch_code, 'BATCH-updated');
  await api.harvestService.updateContribution('b1', { seasonId: 's1', quantityKg: 30 });
  assert.equal(api.state.links[0].contributed_quantity, 30);
  const result = await api.harvestService.generateTraceCode('b1');
  assert.equal(result.status, 'ready');
  assert.ok(result.traceUrl);
  assertRefreshed(api);
});

test('rejected lot mutations do not change seasons or report successful changes', async () => {
  const api = fixture();
  api.state.failMutation = true;
  await assert.rejects(api.harvestService.create(createInput()), /Mutation rejected/);
  assert.equal(api.state.seasons.get('s1').status, 'ready_to_harvest');
  assert.equal(requests(api, 'patch', '/seasons/s1').length, 0);
  assert.deepEqual(api.events, []);
});

test('the fallback harvest date uses the business timezone at a UTC date boundary', async () => {
  const api = fixture({ batches: [batchDto('b1', { harvest_date: null, created_at: '2026-11-17T18:30:00Z' })] });
  await api.harvestService.syncSeasonStatuses('b1');
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, '2026-11-18');
});

test('a partial multi-season update retries every affected season without recreating the lot', async () => {
  const api = fixture({ seasons: [seasonDto(), seasonDto('s2')], batches: [], links: [] });
  api.state.failSeasonPatchFor = 's2';
  let savedError;
  await assert.rejects(api.harvestService.create(createInput({ contributions: [{ seasonId: 's1', quantityKg: 1 }, { seasonId: 's2', quantityKg: 2 }] })), error => {
    assert.ok(error instanceof api.HarvestSeasonSyncError);
    assert.ok(error.seasonIds.includes('s1') && error.seasonIds.includes('s2'));
    savedError = error;
    return true;
  });
  assert.equal(api.state.seasons.get('s1').status, 'completed');
  assert.equal(api.state.seasons.get('s2').status, 'ready_to_harvest');
  api.state.failSeasonPatchFor = null;
  await api.harvestService.syncSeasonStatuses(savedError.batch.id, savedError.seasonIds);
  assert.equal(api.state.seasons.get('s2').status, 'completed');
  assert.equal(requests(api, 'post', '/harvest-batches').length, 1);
});

test('a saved contribution change remains retryable if fetching the new detail fails', async t => {
  for (const operation of ['add', 'remove']) await t.test(operation, async () => {
    const api = fixture({
      seasons: [seasonDto('s1', { status: operation === 'remove' ? 'completed' : 'ready_to_harvest', actual_harvest_date: operation === 'remove' ? '2026-11-18' : null })],
      links: [contribution('b1', 's1', { status: operation === 'add' ? 'cancelled' : 'active' })],
    });
    api.state.failDetailAfterLinkMutation = true;
    let savedError;
    await assert.rejects(operation === 'add'
      ? api.harvestService.addContribution('b1', { seasonId: 's1', quantityKg: 25 })
      : api.harvestService.removeContribution('b1', 's1'), error => {
      assert.ok(error instanceof api.HarvestSeasonSyncError);
      assert.equal(error.batch.id, 'b1');
      assert.ok(error.seasonIds.includes('s1'));
      savedError = error;
      return true;
    });
    assert.equal(api.state.links[0].status, operation === 'add' ? 'active' : 'cancelled');
    assertRefreshed(api);
    await api.harvestService.syncSeasonStatuses('b1', savedError.seasonIds);
    assert.equal(api.state.seasons.get('s1').status, operation === 'add' ? 'completed' : 'ready_to_harvest');
  });
});

test('retry clears an actual harvest date left on a reopened ready season', async () => {
  const api = fixture({
    seasons: [seasonDto('s1', { status: 'ready_to_harvest', actual_harvest_date: '2026-11-18' })],
    batches: [batchDto('b1', { status: 'cancelled' })],
  });
  await api.harvestService.syncSeasonStatuses('b1');
  assert.equal(api.state.seasons.get('s1').actual_harvest_date, null);
});

test('a retry cannot reopen an older completed season under a newly active season', async () => {
  const api = fixture({
    seasons: [seasonDto('s1', { status: 'completed', actual_harvest_date: '2026-11-18' }), seasonDto('s2', { plot_id: 'p1', status: 'growing' })],
    batches: [batchDto('b1', { status: 'cancelled' })],
  });
  await assert.rejects(api.harvestService.syncSeasonStatuses('b1'), error => error instanceof api.HarvestSeasonSyncError);
  assert.equal(api.state.seasons.get('s1').status, 'completed');
  assert.equal(requests(api, 'patch', '/seasons/s1').length, 0);
});
