import test from 'node:test';
import assert from 'node:assert/strict';
import { ControllerDiagnostics } from '../controller/controller-diagnostics.js';
import { ControllerCheckup } from '../controller/controller-checkup.js';

const pad = (axes = [0, 0, 0, 0], values = []) => ({ id: 'Test controller', index: 0, connected: true, mapping: 'standard', axes, buttons: Array.from({ length: 18 }, (_, i) => ({ value: values[i] || 0 })) });
const sweep = (model, count = 48, radius = .8) => {
  for (let i = 0; i < count; i++) {
    const angle = (i + .5) / 48 * Math.PI * 2;
    model.sample(pad([Math.cos(angle) * radius, Math.sin(angle) * radius, Math.cos(angle) * radius, Math.sin(angle) * radius]), i);
  }
};

test('circularity requires a complete outer sweep and reports RMS radial error', () => {
  const model = new ControllerDiagnostics();
  assert.equal(model.startSweep(), false);
  model.sample(pad(), 0); model.startSweep();
  sweep(model, 47);
  assert.equal(model.circularity(0).error, null);
  assert.equal(model.circularity(0).coverage, 47 / 48);
  sweep(model);
  assert.equal(model.circularity(0).coverage, 1);
  assert.ok(Math.abs(model.circularity(0).error - 20) < 1e-10);
  assert.deepEqual(model.circularity(0), model.circularity(1));
});

test('a sweep keeps outer maxima, rejects center noise, stops collecting and resets per controller', () => {
  const model = new ControllerDiagnostics(); model.sample(pad(), 0);
  sweep(model); assert.equal(model.circularity(0).coverage, 0);
  model.startSweep(); sweep(model, 48, .01); assert.equal(model.circularity(0).coverage, 0);
  sweep(model, 48, .8); sweep(model, 48, .5);
  assert.ok(Math.abs(model.circularity(0).error - 20) < 1e-10);
  model.stopSweep(); sweep(model, 48, 1);
  assert.ok(Math.abs(model.circularity(0).error - 20) < 1e-10);
  model.startSweep(); assert.equal(model.circularity(0).error, null);
  sweep(model); model.sample({ ...pad(), id: 'Second controller' }, 100);
  assert.equal(model.circularity(0).coverage, 0); assert.equal(model.sweeping, false);
});

test('checkup observes releases and full trigger travel, never inventing a hardware verdict', () => {
  const model = new ControllerDiagnostics(), checkup = new ControllerCheckup();
  model.sample(pad(), 0); checkup.sample(model, pad(), null);
  assert.deepEqual(checkup.results, {});
  const pressed = pad(undefined, Array(18).fill(1)); model.sample(pressed, 1); checkup.sample(model, pressed, null);
  assert.equal(checkup.results.buttons, undefined); assert.equal(checkup.results.triggers, undefined);
  model.sample(pad(), 2); checkup.sample(model, pad(), null);
  assert.equal(checkup.results.buttons, 'observed'); assert.equal(checkup.results.triggers, 'observed');
  assert.equal(checkup.results.vibration, undefined);
  checkup.select(7); checkup.mark('issue'); checkup.sample(model, pad(), null);
  assert.equal(checkup.results.vibration, 'issue');
});

test('Home can remain untested without blocking standard buttons or claiming it was observed', () => {
  const model = new ControllerDiagnostics(), checkup = new ControllerCheckup();
  const values = Array(18).fill(1); values[16] = 0;
  const pressed = pad(undefined, values);
  model.sample(pressed, 0); checkup.sample(model, pressed, null);
  assert.equal(checkup.results.buttons, undefined);
  const released = pad(); model.sample(released, 1); checkup.sample(model, released, null);
  assert.equal(checkup.results.buttons, 'observed');
  assert.equal(model.buttons[16].released, false); assert.equal(model.buttons[16].presses, 0);
  assert.equal(checkup.snapshot(model, released)[0].note, 'Home not tested (optional)');
  values.fill(0); values[16] = 1;
  model.sample(pad(undefined, values), 2); model.sample(released, 3); checkup.sample(model, released, null);
  assert.equal(checkup.snapshot(model, released)[0].note, 'Home observed (optional)');
});

test('optional Home does not waive another standard button or an unknown button mapping', () => {
  for (const [mapping, missing] of [['standard', 4], ['', 16]]) {
    const model = new ControllerDiagnostics(), checkup = new ControllerCheckup();
    const values = Array(18).fill(1); values[missing] = 0;
    const pressed = { ...pad(undefined, values), mapping }, released = { ...pad(), mapping };
    model.sample(pressed, 0); model.sample(released, 1); checkup.sample(model, released, null);
    assert.equal(checkup.results.buttons, undefined);
    if (!mapping) assert.equal(checkup.snapshot(model, released)[0].note, undefined);
    values.fill(0); values[missing] = 1;
    model.sample({ ...pad(undefined, values), mapping }, 2); model.sample(released, 3); checkup.sample(model, released, null);
    assert.equal(checkup.results.buttons, 'observed');
  }
});

test('stick check needs both a resting sample and complete sweeps', () => {
  const model = new ControllerDiagnostics(), checkup = new ControllerCheckup();
  model.sample(pad(), 0); model.startSweep(); sweep(model); checkup.sample(model, pad(), null);
  assert.equal(checkup.results.sticks, undefined);
  model.stopSweep(); model.measure(100); model.sample(pad(), 2100); checkup.sample(model, pad(), null);
  assert.equal(checkup.results.sticks, 'observed');
});

test('touchpad and motion check actual sensor evidence, require all checks, and preserve noted issues', () => {
  const model = new ControllerDiagnostics(), checkup = new ControllerCheckup();
  const sample = (contacts, rates, click = false) => {
    const values = []; values[17] = Number(click); const p = pad(undefined, values); model.sample(p, 0); checkup.sample(model, p, { contacts, rates });
  };
  sample([{ id: 1, x: .1, y: .1 }], [20, 0, 0]);
  assert.equal(checkup.results.touchpad, undefined); assert.equal(checkup.results.motion, undefined);
  sample([{ id: 1, x: .2, y: .1 }, { id: 2, x: .7, y: .7 }], [0, 20, 20], true);
  assert.equal(checkup.results.touchpad, 'observed'); assert.equal(checkup.results.motion, 'observed');
  checkup.select(3); checkup.mark('issue'); sample([], [0, 0, 0]);
  assert.equal(checkup.results.touchpad, 'issue');
  checkup.reset(); assert.deepEqual(checkup.results, {}); assert.equal(checkup.previousTouch, null); assert.deepEqual(checkup.motion, [false, false, false]);
});

test('checkup snapshots preserve partial, skipped and self-confirmed outcomes after reset', () => {
  const checkup = new ControllerCheckup(); checkup.mark('skipped'); checkup.select(8); checkup.mark('confirmed');
  const snapshot = checkup.snapshot(); checkup.reset();
  assert.equal(snapshot.length, 9); assert.equal(snapshot[0].result, 'skipped'); assert.equal(snapshot[1].result, 'untested'); assert.equal(snapshot[8].result, 'confirmed');
  assert.equal(checkup.complete, false); checkup.select(999); assert.equal(checkup.index, 0);
});

test('a silent HID connection preserves completed checkup evidence while stopping live measurements', async t => {
  const { DiagnosticsView } = await import('../controller/diagnostics-view.js');
  const previousDocument = globalThis.document, previousFrame = globalThis.requestAnimationFrame;
  globalThis.document = { hidden: false, hasFocus: () => true }; globalThis.requestAnimationFrame = () => 1;
  t.after(() => { globalThis.document = previousDocument; globalThis.requestAnimationFrame = previousFrame; });
  const model = new ControllerDiagnostics(), checkup = new ControllerCheckup(), p = pad();
  model.sample(p, 0); model.measure(0); model.sample(p, 2000);
  model.startSweep(); sweep(model); checkup.sample(model, p, null);
  assert.equal(checkup.results.sticks, 'observed'); model.measure(2100);
  let stops = 0, rendered;
  const view = {
    isOpen: true, syncHardware() {}, model, checkup, hardware: { device: {}, pad: p, lastReport: 2100, sensors: null },
    running: true, stopTest() { stops++; this.running = false; }, onAction() {}, render(value) { rendered = value; }, animate() {},
  };
  DiagnosticsView.prototype.animate.call(view, 5000);
  assert.equal(rendered, null); assert.equal(stops, 1); assert.equal(model.measurement, null); assert.equal(model.sweeping, false);
  assert.equal(checkup.results.sticks, 'observed');
  view.hardware.lastReport = 5050;
  DiagnosticsView.prototype.animate.call(view, 5060);
  assert.equal(rendered, p); assert.equal(checkup.results.sticks, 'observed');
});

test('a real gamepad disconnect resets diagnostics and checkup evidence together', async t => {
  const { DiagnosticsView } = await import('../controller/diagnostics-view.js');
  const previousDocument = globalThis.document, previousFrame = globalThis.requestAnimationFrame;
  globalThis.document = { hidden: false, hasFocus: () => true }; globalThis.requestAnimationFrame = () => 1;
  t.after(() => { globalThis.document = previousDocument; globalThis.requestAnimationFrame = previousFrame; });
  const model = new ControllerDiagnostics(), checkup = new ControllerCheckup(); model.sample(pad(), 0); checkup.mark('skipped');
  const view = { isOpen: true, syncHardware() {}, model, checkup, hardware: { device: null, lastReport: null, sensors: null }, getPad: () => null, stopTest() {}, onAction() {}, render() {}, animate() {} };
  DiagnosticsView.prototype.animate.call(view, 100);
  assert.equal(model.device, null); assert.deepEqual(checkup.results, {});
});
