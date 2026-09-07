import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamerSettings } from '../controller/streamer-settings.js';
import { StreamerInput } from '../controller/streamer-input.js';
import { StreamerDemo } from '../controller/streamer-demo.js';
import { StreamerRotation } from '../controller/streamer-rotation.js';
import { ControllerInput } from '../controller/input-state.js';
import { InputCamera } from '../controller/input-camera.js';
import { ControllerAnalytics } from '../controller/analytics-service.js';

test('overlay links round-trip the entire look and omit unrelated query data', () => {
  const look = { ...StreamerSettings.defaults, camera: 'triggers', triggerMeters: 'hide', body: '#ff55aa', light: '#667788', highlight: '#abcdef', highlightOpacity: 42, background: 'solid', color: '#112233', scale: 87, slot: '2' };
  for (const base of ['https://example.com/streamer.html?secret=private#old', 'https://example.com/streamer', 'http://localhost:5173/streamer.html']) {
    const link = new URL(StreamerSettings.url(base, look));
    assert.equal(link.pathname, '/overlay.html');
    assert.equal(link.hash, '');
    assert.equal(link.searchParams.has('secret'), false);
    assert.deepEqual(StreamerSettings.read(link.search), look);
    assert.equal(new URL(StreamerSettings.url(base, look, { setup: true })).hash, '#setup');
  }
});

test('Auto camera survives copying, reopening, and editing an OBS link', () => {
  const link = new URL(StreamerSettings.url('https://example.com/streamer.html', { camera: 'auto' }));
  const captureSettings = StreamerSettings.read(link.search);
  assert.equal(captureSettings.camera, 'auto');
  assert.equal(StreamerSettings.read(StreamerSettings.query({ ...captureSettings, scale: 80 })).camera, 'auto');
  assert.equal(StreamerSettings.read('').camera, 'angle');
});

test('custom camera preserves all three angles through OBS and back to the editor', () => {
  const custom = StreamerSettings.normalize({ camera: 'custom', pitch: 72.4, yaw: -151.6, roll: 18, scale: 83 });
  const link = new URL(StreamerSettings.url('http://localhost:5173/streamer.html', custom));
  const capture = StreamerSettings.read(link.search);
  assert.deepEqual(capture, custom);
  assert.deepEqual(StreamerSettings.read(StreamerSettings.query({ ...capture, body: '#aabbcc' })), { ...custom, body: '#aabbcc' });
  for (const camera of ['front', 'auto', 'triggers']) {
    const fixed = new URL(StreamerSettings.url(link.href, { ...custom, camera }));
    assert.equal(fixed.searchParams.has('pitch'), false);
    assert.equal(StreamerSettings.read(fixed.search).camera, camera);
  }
});

test('custom angles reject invalid values and bound untrusted links', () => {
  for (const value of ['', ' ', 'NaN', 'Infinity', '1;alert(1)']) {
    const settings = StreamerSettings.normalize({ camera: 'custom', pitch: value, yaw: value, roll: value });
    assert.deepEqual(StreamerRotation.toPose(settings), { x: 0, y: 0, z: 0 });
  }
  const settings = StreamerSettings.read('?camera=custom&pitch=10000&yaw=-10000&roll=23.456');
  assert.equal(settings.pitch, 180);
  assert.equal(settings.yaw, -180);
  assert.equal(settings.roll, 23.5);
});

test('rotation ignores clicks and secondary pointers, and commits each drag only once', () => {
  const changes = [], commits = [];
  const rotation = new StreamerRotation({ onChange: angles => changes.push(angles), onCommit: () => commits.push(true) });
  const pose = { x: 0, y: 0, z: 0 };
  rotation.start(1, 100, 100, pose, 400);
  rotation.move(1, 102, 100); rotation.end(1);
  assert.equal(changes.length, 0); assert.equal(commits.length, 0);
  rotation.start(1, 100, 100, pose, 400);
  assert.equal(rotation.start(2, 100, 100, pose, 400), false);
  rotation.move(2, 200, 200); rotation.end(2);
  assert.equal(changes.length, 0);
  rotation.move(1, 200, 250);
  assert.deepEqual(changes.at(-1), { pitch: 67.5, yaw: 45, roll: 0 });
  rotation.end(1); rotation.end(1); rotation.move(1, 300, 300);
  assert.equal(commits.length, 1); assert.equal(changes.length, 1);
  assert.equal(rotation.gesture, null);
});

test('dragging starts at the chosen angle, while Shift-drag only changes roll', () => {
  let angles;
  const rotation = new StreamerRotation({ onChange: value => { angles = value; } });
  const pose = StreamerRotation.toPose({ pitch: 50, yaw: 120, roll: 15 });
  rotation.start(1, 0, 0, pose, 360);
  rotation.move(1, 20, 40);
  assert.deepEqual(angles, { pitch: 70, yaw: 130, roll: 15 });
  rotation.end();
  rotation.start(1, 0, 0, StreamerRotation.toPose(angles), 360, true);
  rotation.move(1, 60, 100);
  assert.deepEqual(angles, { pitch: 70, yaw: 130, roll: -15 });
  assert.deepEqual(pose, StreamerRotation.toPose({ pitch: 50, yaw: 120, roll: 15 }));
});

test('full rotations wrap to portable angles without clamping a continuing drag', () => {
  let angles;
  const rotation = new StreamerRotation({ onChange: value => { angles = value; } });
  rotation.start(1, 0, 0, { x: 0, y: 0, z: 0 }, 360);
  rotation.move(1, 740, -740);
  assert.deepEqual(angles, { pitch: -10, yaw: 10, roll: 0 });
  assert.deepEqual(StreamerRotation.fromPose(StreamerRotation.toPose(angles)), angles);
});

test('streamer demo turns Auto toward triggers and face controls, and fixed views pause following', () => {
  const angles = [];
  const camera = new InputCamera(angle => angles.push(angle));
  const input = new ControllerInput(event => camera.observe(event));
  const demo = new StreamerDemo(input, { now: () => 0 });
  demo.start({ loop: true });
  demo.update(0);
  assert.equal(angles.at(-1), 'triggers');
  demo.update(1200); // Both triggers are released while sticks and face controls remain active.
  assert.equal(angles.at(-1), 'front');
  camera.setEnabled(false);
  const fixedCount = angles.length;
  demo.update(2400);
  assert.equal(angles.length, fixedCount);
  camera.setEnabled(true);
  assert.equal(angles.at(-1), 'triggers');
  demo.stop();
  assert.equal(camera.held.size, 0);
});

test('highlight opacity preserves old links, accepts fully hidden glow, and bounds shared values', () => {
  assert.equal(StreamerSettings.read('?highlight=%23ff00ff').highlightOpacity, 100);
  for (const value of ['', ' ', 'NaN', 'Infinity', 'nope']) {
    assert.equal(StreamerSettings.normalize({ highlightOpacity: value }).highlightOpacity, 100);
  }
  assert.equal(StreamerSettings.normalize({ highlightOpacity: -12 }).highlightOpacity, 0);
  assert.equal(StreamerSettings.normalize({ highlightOpacity: 300 }).highlightOpacity, 100);
  assert.equal(StreamerSettings.normalize({ highlightOpacity: 42.6 }).highlightOpacity, 43);
  for (const highlightOpacity of [0, 50, 100]) {
    const link = new URL(StreamerSettings.url('https://example.com/streamer.html', { highlightOpacity }));
    assert.equal(StreamerSettings.read(link.search).highlightOpacity, highlightOpacity);
  }
});

test('untrusted overlay parameters are bounded and cannot become arbitrary CSS', () => {
  assert.equal(StreamerSettings.read('').triggerMeters, 'show');
  assert.equal(StreamerSettings.read('?triggerMeters=invalid').triggerMeters, 'show');
  assert.equal(StreamerSettings.read(StreamerSettings.query({ triggerMeters: 'show' })).triggerMeters, 'show');
  const clean = StreamerSettings.read('?body=red&light=%23fff&camera=spin&scale=Infinity&slot=-1&background=url(evil)&color=%23abcdef');
  assert.equal(clean.body, StreamerSettings.defaults.body);
  assert.equal(clean.camera, 'angle'); assert.equal(clean.scale, 100); assert.equal(clean.slot, 'auto');
  assert.equal(StreamerSettings.background(clean), 'transparent');
  assert.equal(StreamerSettings.normalize({ scale: 10000 }).scale, 120);
  assert.equal(StreamerSettings.normalize({ scale: -50 }).scale, 60);
  assert.equal(StreamerSettings.normalize({ scale: '' }).scale, 100);
  assert.equal(StreamerSettings.background({ background: 'solid', color: '#abcdef' }), '#abcdef');
  assert.equal(StreamerSettings.background({ background: 'green' }), '#00ff00');
});

function packet(bluetooth = false) {
  const offset = bluetooth ? 1 : 0;
  const data = new DataView(new ArrayBuffer(bluetooth ? 77 : 63));
  [128, 128, 128, 128].forEach((value, index) => data.setUint8(offset + index, value));
  data.setUint8(offset + 7, 8);
  data.setUint8(offset + 32, 128); data.setUint8(offset + 36, 128);
  return { reportId: bluetooth ? 0x31 : 1, data, offset };
}

test('USB and Bluetooth raw reports preserve analog trigger travel, axes, buttons, and diagonal D-pad', () => {
  for (const bluetooth of [false, true]) {
    const { reportId, data, offset } = packet(bluetooth);
    data.setUint8(offset, 255); data.setUint8(offset + 1, 0);
    data.setUint8(offset + 4, 64); data.setUint8(offset + 5, 255);
    data.setUint8(offset + 7, 1 | 32 | 128); // up-right, cross, triangle
    data.setUint8(offset + 8, 1 | 16 | 128); // L1, create, R3
    data.setUint8(offset + 9, 7); // PS, touchpad, mute
    const result = StreamerInput.decode(reportId, data);
    const button = id => result.buttons[StreamerInput.buttons.indexOf(id)];
    for (const id of ['cross', 'triangle', 'l1', 'create', 'r3', 'up', 'right', 'ps', 'touchpad', 'mute']) assert.equal(button(id), 1, id);
    for (const id of ['circle', 'square', 'down', 'left']) assert.equal(button(id), 0, id);
    assert.equal(button('l2'), 64 / 255); assert.equal(button('r2'), 1);
    assert.equal(result.axes[0], 1); assert.equal(result.axes[1], -1);
  }
  assert.equal(StreamerInput.decode(1, new DataView(new ArrayBuffer(9))), null);
  assert.equal(StreamerInput.decode(0x31, new DataView(new ArrayBuffer(63))), null);
  assert.equal(StreamerInput.decode(1, {}), null);
});

function hardware() {
  return {
    vendorId: 0x054c, productId: 0x0ce6, opened: false, listeners: new Set(),
    async open() { this.opened = true; }, async close() { this.opened = false; },
    async receiveFeatureReport(id) { assert.equal(id, 5); },
    async sendReport() { assert.fail('A streamer must not override game output effects'); },
    async sendFeatureReport() { assert.fail('A streamer must not write calibration'); },
    addEventListener(name, fn) { this.listeners.add(fn); }, removeEventListener(name, fn) { this.listeners.delete(fn); },
    report(report = packet()) { for (const listener of this.listeners) listener({ device: this, ...report }); },
  };
}

test('direct capture receives touch and button events without polling/focus and clears stale or disconnected input', async () => {
  const pad = hardware(), input = new ControllerInput(), touches = [];
  let time = 0, disconnect;
  const source = new StreamerInput(input, {
    hid: { getDevices: async () => [pad], addEventListener(name, fn) { disconnect = fn; }, removeEventListener() {} },
    onTouch: points => touches.push(points), now: () => time,
  });
  assert.equal(await source.connect({ automatic: true }), true);
  assert.equal(source.state, 'waiting-direct');
  const report = packet(); report.data.setUint8(7, 40); report.data.setUint8(32, 1); report.data.setUint8(33, 255);
  pad.report(report);
  assert.equal(input.button('cross'), 1); assert.equal(source.state, 'direct');
  assert.equal(touches.at(-1)[0].x, 255 / 1919);
  time = 2000; source.poll(); assert.equal(input.button('cross'), 0); assert.deepEqual(touches.at(-1), []);
  pad.report(report); assert.equal(input.button('cross'), 1);
  disconnect({ device: pad }); assert.equal(input.button('cross'), 0); assert.equal(pad.listeners.size, 0);
  await source.dispose();
});

test('normal capture selects a specific player and releases missing controls and disconnected gamepads', () => {
  const input = new ControllerInput();
  const pad = index => ({ index, mapping: 'standard', connected: true, buttons: [{ value: 1 }], axes: [.6, 0, 0, 0] });
  let pads = [null, pad(1), pad(2)]; pads[2].buttons[0].value = .3;
  const source = new StreamerInput(input, { getGamepads: () => pads });
  source.poll(); assert.equal(input.button('cross'), 1); assert.equal(input.axis('left').x, .6);
  source.slot = '2'; source.poll(); assert.equal(input.button('cross'), .3);
  pads = []; source.poll(); assert.equal(input.button('cross'), 0); assert.equal(input.axis('left').x, 0);
  pads = [{ ...pad(2), mapping: '' }]; source.poll(); assert.equal(source.state, 'unsupported');
  source.getGamepads = () => { throw new Error('Denied'); }; source.poll(); assert.equal(source.state, 'blocked');
});

test('automatic HID reconnect never prompts or selects an ambiguous controller', async () => {
  for (const devices of [[], [hardware(), hardware()], [{ ...hardware(), vendorId: 1 }]]) {
    const source = new StreamerInput(new ControllerInput(), { hid: { getDevices: async () => devices, requestDevice() { assert.fail('No permission prompt'); }, addEventListener() {}, removeEventListener() {} } });
    assert.equal(await source.connect({ automatic: true }), false);
    assert.ok(devices.every(pad => !pad.opened)); await source.dispose();
  }
});

test('disposing during a pending device open closes it without adding report listeners', async () => {
  const pad = hardware(); let finish, started;
  const opening = new Promise(resolve => { started = resolve; });
  pad.open = () => new Promise(resolve => { finish = () => { pad.opened = true; resolve(); }; started(); });
  const source = new StreamerInput(new ControllerInput(), { hid: { requestDevice: async () => [pad], addEventListener() {}, removeEventListener() {} } });
  const pending = source.connect(); await opening; await source.dispose(); finish();
  assert.equal(await pending, false); assert.equal(pad.opened, false); assert.equal(pad.listeners.size, 0);
});

test('streamer analytics count deliberate setup actions without sending input or URL data', () => {
  const events = []; let now = 0;
  const analytics = new ControllerAnalytics((name, data) => events.push({ name, data }), () => now);
  analytics.featureAction('streamer', 'settings_changed', { url: 'private', button: 'cross', x: .7 });
  assert.deepEqual(events.at(-1), { name: 'controller_streamer_settings_changed', data: {} });
  now = 10000;
  analytics.featureAction('streamer', 'input_connected'); analytics.featureAction('streamer', 'input_connected');
  analytics.featureAction('streamer', 'capture_loaded'); analytics.flush();
  assert.equal(events.filter(event => event.name === 'controller_streamer_input_connected').length, 1);
  assert.equal(events.find(event => event.name === 'controller_active_time').data.seconds, 5);
});

test('the setup demo shows input and releases every simulated control after six seconds', () => {
  const input = new ControllerInput(), states = [];
  const demo = new StreamerDemo(input, { now: () => 1000, onChange: active => states.push(active) });
  assert.equal(demo.active, false);
  demo.start(); demo.update(1250);
  assert.equal(input.button('cross'), 1);
  assert.ok(input.button('l2') > 0 && input.button('l2') < 1);
  assert.ok(Math.hypot(input.axis('left').x, input.axis('left').y) > 0);
  demo.update(5800); assert.equal(input.button('touchpad'), 1);
  demo.update(7000);
  assert.equal(demo.active, false); assert.equal(input.buttons.size, 0);
  assert.deepEqual(input.axis('left'), { x: 0, y: 0 });
  assert.deepEqual(input.axis('right'), { x: 0, y: 0 });
  assert.deepEqual(states, [true, false]);
});

test('the OBS demo keeps moving across cycles and stops without leaving held inputs', () => {
  const input = new ControllerInput();
  const demo = new StreamerDemo(input, { now: () => 0 });
  demo.start({ loop: true }); demo.update(12500);
  assert.equal(demo.active, true); assert.equal(input.button('square'), 1);
  demo.update(13400);
  assert.equal(input.button('square'), 0); assert.equal(input.button('triangle'), 1);
  demo.stop(); demo.update(20000);
  assert.equal(demo.active, false); assert.equal(input.buttons.size, 0);
  for (const side of ['left', 'right']) assert.deepEqual(input.axis(side), { x: 0, y: 0 });
});

test('live input takes over a demo without clearing real buttons or stick positions', () => {
  const input = new ControllerInput();
  const demo = new StreamerDemo(input, { now: () => 0 });
  demo.start({ loop: true }); demo.update(250);
  input.setButton('cross', 'gamepad', 1); input.setButton('r2', 'gamepad', .42);
  input.setAxis('left', 'gamepad', .3, -.5); input.setAxis('right', 'gamepad', -.2, .4);
  demo.update(300, { liveInput: true });
  assert.equal(demo.active, false);
  assert.equal(input.button('cross'), 1); assert.equal(input.button('r2'), .42);
  assert.equal(input.button('l2'), 0);
  assert.deepEqual(input.axis('left'), { x: .3, y: -.5 });
  assert.deepEqual(input.axis('right'), { x: -.2, y: .4 });
  input.releaseSource('gamepad'); demo.update(8000);
  assert.equal(input.buttons.size, 0); assert.equal(demo.active, false);
});

test('normal exported links do not accidentally enable a capture demo', () => {
  const link = new URL(StreamerSettings.url('https://example.com/streamer.html?demo=true', { demo: true }));
  assert.equal(link.searchParams.has('demo'), false);
  assert.equal(link.hash, '');
});

test('stick arrow preferences survive OBS links, reopening and unrelated settings changes', () => {
  for (const stickArrows of ['show', 'hide']) for (const arrowColor of ['auto', '#12abef']) {
    const look = StreamerSettings.normalize({ stickArrows, arrowColor, arrowSize: 145 });
    const url = new URL(StreamerSettings.url('https://example.test/streamer.html', look));
    const reopened = StreamerSettings.read(url.search);
    assert.equal(reopened.stickArrows, stickArrows);
    assert.equal(reopened.arrowColor, arrowColor);
    assert.equal(reopened.arrowSize, 145);
    const edited = StreamerSettings.read(StreamerSettings.query({ ...reopened, camera: 'back', body: '#222222' }));
    assert.equal(edited.stickArrows, stickArrows);
    assert.equal(edited.arrowColor, arrowColor);
    assert.equal(edited.arrowSize, 145);
  }
});

test('old OBS links keep automatic arrows and malformed arrow settings are bounded', () => {
  const old = StreamerSettings.read('?camera=front&body=%23e9eaf0');
  assert.equal(old.stickArrows, 'show'); assert.equal(old.arrowSize, 100); assert.equal(old.arrowColor, 'auto');
  for (const value of ['', ' ', 'Infinity', 'NaN', 'nope']) assert.equal(StreamerSettings.normalize({ arrowSize: value }).arrowSize, 100);
  assert.equal(StreamerSettings.normalize({ arrowSize: -20 }).arrowSize, 50);
  assert.equal(StreamerSettings.normalize({ arrowSize: 9000 }).arrowSize, 150);
  const invalid = StreamerSettings.read('?stickArrows=false&arrowColor=url(evil)&arrowSize=72.6');
  assert.equal(invalid.stickArrows, 'show'); assert.equal(invalid.arrowColor, 'auto'); assert.equal(invalid.arrowSize, 73);
  assert.equal(StreamerSettings.normalize({ arrowColor: '#ABCDEF' }).arrowColor, '#abcdef');
});

test('arrow analytics report intentional settings without collecting exact colors', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  analytics.streamerSettingChanged('stickArrows', 'hide', 'builder');
  analytics.streamerSettingChanged('arrowSize', 150, 'builder');
  analytics.streamerSettingChanged('arrowColor', '#123456', 'builder');
  analytics.streamerSettingChanged('arrowColor', 'auto', 'builder');
  assert.deepEqual(events.filter(e => e.name === 'controller_streamer_settings_changed').map(({name, ...properties}) => properties), [
    { surface: 'builder', setting: 'stickArrows', enabled: false },
    { surface: 'builder', setting: 'arrowSize', size: 150 },
    { surface: 'builder', setting: 'arrowColor', color_mode: 'custom' },
    { surface: 'builder', setting: 'arrowColor', color_mode: 'auto' },
  ]);
  analytics.featureAction('appearance', 'arrows_changed', { setting: 'arrowColor', color_mode: 'custom', size: 999, color: '#123456' });
  assert.deepEqual(events.at(-1), { name: 'controller_appearance_arrows_changed', setting: 'arrowColor', color_mode: 'custom' });
});
