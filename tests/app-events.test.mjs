import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AppEvents } from '../controller/app-events.js';
import { PageAnalytics } from '../controller/page-analytics.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
const blocked = () => Promise.reject(new Error('net::ERR_BLOCKED_BY_CLIENT'));

test('blocked analytics and page tracking cannot reject startup or intercept ordinary links', async () => {
  let attempts = 0;
  const events = new AppEvents({ loadAnalytics: () => { attempts++; return blocked(); }, loadPage: blocked });
  const link = new EventTarget();
  events.trackPage({ querySelectorAll() { assert.fail('Blocked page module installed handlers'); } }, 'studio');
  events.trackLink(link, () => assert.fail('Blocked tracking ran'));
  events.once('controller_loaded'); events.featureAction('viewer', 'camera_selected', { camera: 'front' });
  await events.ready; await events.pageReady; await settle();
  for (let i = 0; i < 120; i++) {
    events.interact('button'); events.finish('white'); events.streamerSettingChanged('scale', 100, 'builder');
  }
  assert.equal(events.state, 'disabled'); assert.equal(events.pending.length, 0); assert.equal(attempts, 1);
  assert.equal(link.dispatchEvent(new Event('click', { cancelable: true })), true);
});

test('slow optional imports do not block calls; early event buffering is bounded and drains once', async () => {
  let resolve;
  const received = [];
  const events = new AppEvents({ loadAnalytics: () => new Promise(done => { resolve = done; }), loadPage: () => new Promise(() => {}) });
  for (let i = 0; i < 110; i++) events.interact(i);
  assert.equal(events.pending.length, 100);
  await settle(); resolve({ analytics: { interact: value => received.push(value) } }); await events.ready;
  assert.deepEqual(received, Array.from({ length: 100 }, (_, i) => i)); assert.equal(events.pending.length, 0);
  events.interact('next'); assert.equal(received.at(-1), 'next');
});

test('a blocked page helper does not prevent allowed analytics from loading', async () => {
  const received = [];
  const events = new AppEvents({ loadAnalytics: async () => ({ analytics: { once: (...args) => received.push(args) } }), loadPage: blocked });
  events.once('controller_loaded'); await events.ready; await events.pageReady;
  assert.deepEqual(received, [['controller_loaded']]);
});

test('allowed page tracking still records navigation and preserves native link activation', async () => {
  const received = [], link = Object.assign(new EventTarget(), { dataset: { analyticsDestination: 'github', analyticsPlacement: 'header' } });
  const root = { querySelectorAll: selector => selector === '[data-analytics-destination]' ? [link] : [] };
  const events = new AppEvents({ loadAnalytics: async () => ({ analytics: { featureAction: (...args) => received.push(args) } }), loadPage: async () => ({ PageAnalytics }) });
  events.trackPage(root, 'studio');
  const customLink = new EventTarget(); let opened = 0;
  events.trackLink(customLink, () => opened++);
  await events.ready; await events.pageReady; await settle();
  assert.equal(link.dispatchEvent(new Event('click', { cancelable: true })), true);
  assert.deepEqual(received, [['navigation', 'clicked', { surface: 'studio', destination: 'github', placement: 'header' }]]);
  customLink.dispatchEvent(Object.assign(new Event('auxclick'), { button: 1 }));
  customLink.dispatchEvent(Object.assign(new Event('auxclick'), { button: 2 }));
  assert.equal(opened, 1);
});

test('optional initialization and reporting errors stay isolated from caller actions', async () => {
  const events = new AppEvents({ loadAnalytics: async () => ({ analytics: { interact() { throw new Error('Reporting failed'); } } }), loadPage() { throw new Error('Import failed'); } });
  await events.ready; await events.pageReady;
  assert.doesNotThrow(() => events.interact('button'));
  events.trackLink(new EventTarget(), () => {}); await settle();
});

test('controller and Streamer dependency graphs have no required analytics modules, including showcase dependencies', async () => {
  const seen = new Set();
  async function visit(url) {
    url.search = ''; if (seen.has(url.href)) return; seen.add(url.href);
    assert.doesNotMatch(url.pathname, /\/(?:analytics|analytics-service|page-analytics)\.js$/);
    const source = await readFile(url, 'utf8');
    for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('.')) await visit(new URL(match[1], url));
    }
  }
  await visit(new URL('../controller/controller-app.js', import.meta.url));
  await visit(new URL('../controller/streamer-app.js', import.meta.url));
  assert.ok([...seen].some(url => url.endsWith('/streamer-showcase.js')));
});
