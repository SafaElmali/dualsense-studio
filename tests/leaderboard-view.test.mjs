import test from 'node:test';
import assert from 'node:assert/strict';
import { LeaderboardView } from '../controller/leaderboard.js';
import { ControllerAnalytics } from '../controller/analytics-service.js';

function setup(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  t.after(() => original ? Object.defineProperty(globalThis, 'document', original) : delete globalThis.document);
  class Element extends EventTarget {
    constructor() { super(); this.children = []; this.attributes = {}; this.dataset = {}; this.style = {}; this.open = false; this.value = 'previous'; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
    click() { this.dispatchEvent(new Event('click')); }
    focus() { document.activeElement = this; }
    querySelectorAll() { return tabs; }
  }
  const elements = new Map(), element = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const tabs = ['current', 'previous'].map(board => { const tab = element('leaderboard-tab-' + board); tab.dataset.board = board; return tab; });
  globalThis.document = { getElementById: element, createElement: () => new Element(), createTextNode: text => text };
  const pending = [], events = [];
  const analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const view = new LeaderboardView({ client: { list: board => new Promise((resolve, reject) => pending.push({ board, resolve, reject })) }, onOpen() {}, onClose() {}, onAction: (...args) => analytics.featureAction(...args) });
  view.open();
  return { view, pending, events, tabs, element };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('switching boards ignores a late response from the earlier board and preserves selected tab semantics', async t => {
  const { pending, events, tabs, element } = setup(t);
  tabs[1].click(); assert.deepEqual(pending.map(call => call.board), ['current', 'previous']);
  pending[1].resolve({ entries: [] }); await settle();
  pending[0].resolve({ entries: [{ nickname: 'Stale', score: 6000, accuracy: 100, weapons: ['shooting'], rank: 1 }] }); await settle();
  assert.equal(element('leaderboard-state-heading').textContent, 'No scores in this archive.');
  assert.equal(element('leaderboard-rows').children.length, 0);
  assert.equal(tabs[1].attributes['aria-selected'], 'true'); assert.equal(tabs[0].tabIndex, -1);
  assert.equal(element('leaderboard-board-panel').attributes['aria-labelledby'], 'leaderboard-tab-previous');
  assert.deepEqual(events.filter(event => event.name === 'controller_leaderboard_loaded'), [{ name: 'controller_leaderboard_loaded', board: 'previous' }]);
});

test('keyboard tabs wrap, original archive stays separate, and closing prevents late errors', async t => {
  const { view, pending, tabs, element, events } = setup(t);
  const key = Object.assign(new Event('keydown', { cancelable: true }), { key: 'ArrowLeft' });
  tabs[0].dispatchEvent(key); assert.equal(document.activeElement, tabs[1]); assert.equal(key.defaultPrevented, true);
  element('leaderboard-archive').value = 'original'; element('leaderboard-archive').dispatchEvent(new Event('change'));
  assert.equal(pending.at(-1).board, 'original');
  pending.at(-1).resolve({ entries: [] }); await settle();
  assert.match(element('leaderboard-board-note').textContent, /original leaderboard/);
  const status = element('leaderboard-status').textContent;
  view.dialog.close(); pending[0].reject(new Error('stale error')); pending[1].reject(new Error('stale error')); await settle();
  assert.equal(element('leaderboard-status').textContent, status);
  assert.equal(events.some(event => event.name === 'controller_leaderboard_load_failed'), false);
});

test('leaderboard analytics allow only known board values and never forward identifiers', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  analytics.featureAction('leaderboard', 'board_selected', { board: 'previous', nickname: 'private', player: 'private' });
  analytics.featureAction('leaderboard', 'board_selected', { board: 'private-value' });
  assert.deepEqual(events.filter(event => event.name === 'controller_leaderboard_board_selected'), [{ name: 'controller_leaderboard_board_selected', board: 'previous' }, { name: 'controller_leaderboard_board_selected' }]);
  assert.equal(JSON.stringify(events).includes('private'), false);
});
