import test from 'node:test';
import assert from 'node:assert/strict';
import { ControllerAnalytics } from '../controller/analytics-service.js';
import { TargetPracticeInput } from '../controller/target-practice-input.js';
import { TargetPracticeView } from '../controller/target-practice-view.js';

const pad = () => ({ connected: true, mapping: 'standard', id: 'test-pad', index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });

function range(t, getPad, leaderboardClient = { start: async () => ({ roundId: 'round' }) }) {
  const originals = new Map(['document', 'window', 'Option', 'ResizeObserver', 'requestAnimationFrame', 'matchMedia'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  const elements = new Map();
  class Element extends EventTarget {
    constructor() { super(); this.open = false; this.hidden = false; this.width = 0; this.value = ''; this.style = {}; this.dataset = {}; this.classList = { toggle() {} }; }
    replaceChildren() {}
    showModal() { this.open = true; }
    getContext() { return null; }
    getBoundingClientRect() { return { width: 0 }; }
    querySelector() { return element('setup'); }
    focus() { document.activeElement = this; }
    closest() { return this === element('range-nickname') ? element('range-submit-form') : null; }
  }
  const element = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  globalThis.document = Object.assign(new EventTarget(), { getElementById: element, hidden: false, hasFocus: () => true });
  globalThis.window = new EventTarget();
  globalThis.Option = class {};
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.matchMedia = () => ({ matches: false });
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const view = new TargetPracticeView({ onAction: (...args) => analytics.featureAction(...args), onOpen() {}, getPad, leaderboardClient, onWeapon() {}, onStopEffects() {}, effectsActive: () => false });
  view.events = events; view.dialog.open = true;
  return view;
}

test('only a connected standard gamepad provides gameplay input', () => {
  let device = null;
  const input = new TargetPracticeInput(() => device);
  assert.equal(input.connected, false);
  assert.deepEqual(input.sample(), { connected: false, x: 0, y: 0, pressure: 0, start: false, cycleWeapon: false });
  device = pad(); device.connected = false; assert.equal(input.connected, false);
  device.connected = true; device.mapping = ''; assert.equal(input.connected, false);
  device.mapping = 'standard'; device.axes = [0, 0]; assert.equal(input.connected, false);
  assert.equal(new TargetPracticeInput(() => { throw new Error('Unavailable'); }).connected, false);
  device = pad(); device.axes[2] = .04; device.axes[3] = NaN; device.buttons[7].value = Infinity;
  assert.deepEqual(input.sample(), { connected: true, x: 0, y: 0, pressure: 0, start: false, cycleWeapon: false });
  device.axes[2] = 2; device.axes[3] = -2; device.buttons[7].value = 2;
  const sample = input.sample(); assert.ok(Math.abs(Math.hypot(sample.x, sample.y) - 1) < 1e-9); assert.equal(sample.pressure, 1);
});

test('controller buttons act once per press and held buttons on reconnect do not start a round', () => {
  let device = pad(); const input = new TargetPracticeInput(() => device);
  device.buttons[0].pressed = true; device.buttons[3].pressed = true;
  assert.equal(input.sample().start, false);
  device.buttons[0].pressed = false; device.buttons[3].pressed = false; input.sample();
  device.buttons[0].pressed = true; device.buttons[3].pressed = true;
  const press = input.sample(); assert.equal(press.start, true); assert.equal(press.cycleWeapon, true);
  assert.equal(input.sample().cycleWeapon, false);
  device = null; input.sample(); device = pad(); device.buttons[0].pressed = true;
  assert.equal(input.sample().start, false);
});

test('no controller blocks starting and never requests a leaderboard round', async t => {
  const view = range(t, () => null, { start() { assert.fail('Requested a round without a controller'); } });
  await view.start(); view.update();
  assert.equal(view.game.state, 'ready');
  assert.equal(view.$('range-start').disabled, true);
  assert.equal(view.$('range-title').textContent, 'Connect your controller.');
});

test('mouse, touch, and keyboard events cannot aim or fire while a controller round is active', async t => {
  const device = pad(), view = range(t, () => device); await view.start();
  view.animate(100); view.animate(150);
  const aim = { ...view.game.aim };
  for (const type of ['pointermove', 'pointerdown', 'touchstart']) {
    const event = Object.assign(new Event(type, { cancelable: true }), { button: 0, pointerId: 1, clientX: 240, clientY: 150 });
    view.canvas.dispatchEvent(event);
  }
  for (const code of ['KeyW', 'ArrowLeft', 'Space', 'Digit2']) {
    for (const type of ['keydown', 'keyup']) window.dispatchEvent(Object.assign(new Event(type), { code }));
  }
  view.animate(200);
  assert.deepEqual(view.game.aim, aim); assert.equal(view.game.shots, 0); assert.equal(view.game.weapon, 'shooting');
  device.axes[2] = 1; device.buttons[7].value = 1; view.animate(250);
  assert.ok(view.game.aim.x > aim.x); assert.equal(view.game.shots, 1);
  device.buttons[3].pressed = true; view.animate(300); assert.equal(view.game.weapon, 'shotgun');
});

test('disconnect pauses gameplay, keeps the score and time, and requires explicit resume', async t => {
  let device = pad(); const view = range(t, () => device); await view.start();
  view.animate(100); view.animate(150);
  device.buttons[7].value = 1; view.animate(200);
  const elapsed = view.game.elapsed, score = view.game.score, shots = view.game.shots;
  device = null; view.animate(250); view.animate(1000);
  assert.equal(view.game.state, 'paused'); assert.equal(view.game.elapsed, elapsed); assert.equal(view.game.score, score); assert.equal(view.game.shots, shots);
  assert.equal(view.$('range-start').disabled, true); assert.equal(view.$('range-title').textContent, 'Controller disconnected.');
  device = pad(); device.buttons[0].pressed = true; device.buttons[7].value = 1;
  view.animate(1050); view.animate(1100); assert.equal(view.game.state, 'paused');
  device.buttons[0].pressed = false; view.animate(1150); device.buttons[0].pressed = true; view.animate(1200);
  assert.equal(view.game.state, 'playing'); assert.equal(view.game.shots, shots);
  device.buttons[7].value = 0; view.animate(1250); view.animate(1300); device.buttons[7].value = 1; view.animate(1550);
  assert.equal(view.game.shots, shots + 1);
});

test('disconnect while fetching a round cannot start from a late response, even after reconnecting', async t => {
  let device = pad(), resolve;
  const view = range(t, () => device, { start: () => new Promise(done => { resolve = done; }) });
  const pending = view.start(); assert.equal(view.starting, true);
  device = null; view.animate(100); device = pad(); view.animate(150);
  resolve({ roundId: 'late' }); await pending;
  assert.equal(view.game.state, 'ready'); assert.equal(view.starting, false); assert.equal(view.roundId, null);
});

test('controller loss before the next animation frame also blocks a pending round', async t => {
  let device = pad(), resolve;
  const view = range(t, () => device, { start: () => new Promise(done => { resolve = done; }) });
  const pending = view.start(); device = null; resolve({ roundId: 'late' }); await pending;
  assert.equal(view.game.state, 'ready'); assert.equal(view.roundId, null);
});

test('finished scores can still be submitted after unplugging the controller', async t => {
  let submitted;
  const view = range(t, () => null, { submit: async (...args) => { submitted = args; return { rank: 1, improved: true }; } });
  view.game.start(); view.game.step(20); view.roundId = 'finished';
  view.lastResult = { score: 100, shots: 1, hits: 1, weapons: ['shooting'] }; view.$('range-nickname').value = 'Player';
  view.update(); assert.equal(view.$('range-submit-form').hidden, false);
  await view.submitScore(); assert.deepEqual(submitted, ['finished', 'Player', view.lastResult]); assert.equal(view.submitted, true);
});


test('controller-required and disconnect analytics report transitions once, with resume separate from new rounds', async t => {
  let device = null;
  const view = range(t, () => device); view.open('shooting');
  view.animate(100); view.animate(150);
  assert.equal(view.events.filter(e => e.name === 'controller_target_practice_controller_required').length, 1);
  assert.deepEqual(view.events.find(e => e.name === 'controller_target_practice_opened'), { name: 'controller_target_practice_opened', connected: false });
  device = pad(); view.animate(200); await view.start(); view.animate(250); view.animate(300);
  device = null; view.animate(350); view.animate(400);
  assert.deepEqual(view.events.filter(e => e.name === 'controller_target_practice_paused'), [{ name: 'controller_target_practice_paused', reason: 'disconnected' }]);
  device = pad(); view.animate(450); await view.start();
  assert.equal(view.events.filter(e => e.name === 'controller_target_practice_started').length, 1);
  assert.equal(view.events.filter(e => e.name === 'controller_target_practice_resumed').length, 1);
  assert.deepEqual(view.events.filter(e => e.name === 'controller_target_practice_controller_connection_changed').map(e => e.connected), [true, false, true]);
});

test('ranking and submission failures are recorded separately without player names or error text', async t => {
  const device = pad();
  const view = range(t, () => device, { start: async () => { throw new Error('private connection info'); }, submit: async () => { throw new Error('private player info'); } });
  await view.start();
  assert.equal(view.events.filter(e => e.name === 'controller_target_practice_ranking_unavailable').length, 1);
  assert.equal(view.game.state, 'playing');
  view.game.step(20); view.lastResult = { score: 100, shots: 1, hits: 1, weapons: ['shooting'] }; view.roundId = 'private'; view.$('range-nickname').value = 'private';
  await view.submitScore();
  assert.deepEqual(view.events.filter(e => e.name.startsWith('controller_leaderboard_')), [{ name: 'controller_leaderboard_submit_requested' }, { name: 'controller_leaderboard_submit_failed' }]);
  assert.equal(JSON.stringify(view.events).includes('private'), false);
});
