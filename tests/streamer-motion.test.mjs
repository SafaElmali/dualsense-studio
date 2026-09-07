import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Quaternion, Vector3 } from '../controller/vendor/three/three.module.min.js';
import { StreamerMotion } from '../controller/streamer-motion.js';
import { StreamerInput } from '../controller/streamer-input.js';
import { StreamerSettings } from '../controller/streamer-settings.js';
import { ControllerInput } from '../controller/input-state.js';
import { ControllerAnalytics } from '../controller/analytics-service.js';

const pose = { x: .7, y: -.4, z: .1 };
const base = () => new Quaternion().setFromEuler(new Euler(pose.x, pose.y, pose.z));
const turn = (axis, degrees) => new Quaternion().setFromAxisAngle(new Vector3(...axis), degrees * Math.PI / 180);
const sample = quaternion => ({ orientation: quaternion.toArray() });
const close = (actual, expected) => assert.ok(new Quaternion().fromArray(actual).angleTo(expected) < 1e-6, `${actual} != ${expected.toArray()}`);

test('full motion follows all three local axes relative to any holding position and custom camera', () => {
  for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    const motion = new StreamerMotion(), neutral = turn([1, 0, 0], -55);
    motion.configure('full', pose);
    close(motion.update(sample(neutral)), base());
    close(motion.update(sample(neutral.clone().multiply(turn(axis, 60)))), base().multiply(turn(axis, 60)));
    close(motion.update(sample(neutral)), base());
  }
});

test('subtle motion scales small turns and caps compound movement at 25 degrees', () => {
  const motion = new StreamerMotion(); motion.configure('subtle', pose);
  motion.update(sample(new Quaternion()));
  close(motion.update(sample(turn([0, 0, 1], 20))), base().multiply(turn([0, 0, 1], 7)));
  close(motion.update(sample(turn([0, 1, 0], -150))), base().multiply(turn([0, 1, 0], -25)));
  const compound = new Quaternion().setFromEuler(new Euler(1.5, -1.2, 1.3));
  const output = new Quaternion().fromArray(motion.update(sample(compound)));
  assert.ok(Math.abs(base().angleTo(output) - 25 * Math.PI / 180) < 1e-6);
  close(motion.update(sample(new Quaternion())), base());
});

test('recenter immediately uses the current holding position without altering the chosen angle', () => {
  const motion = new StreamerMotion(); motion.configure('full', pose);
  assert.equal(motion.recenter(), null);
  motion.update(sample(new Quaternion()));
  const held = turn([0, 0, 1], 70);
  motion.update(sample(held));
  close(motion.recenter(), base());
  close(motion.update(sample(held)), base());
  close(motion.update(sample(held.clone().multiply(turn([1, 0, 0], 10)))), base().multiply(turn([1, 0, 0], 10)));
  motion.configure('full', pose); // An unrelated appearance update must not recenter.
  close(motion.update(sample(held.clone().multiply(turn([1, 0, 0], 10)))), base().multiply(turn([1, 0, 0], 10)));
  motion.configure('off', pose);
  assert.equal(motion.update(sample(held)), null); assert.equal(motion.recenter(), null);
  motion.configure('subtle', pose);
  close(motion.update(sample(held)), base());
});

test('invalid samples cannot set a neutral pose or poison subsequent motion', () => {
  const motion = new StreamerMotion(); motion.configure('subtle', pose);
  for (const orientation of [undefined, [], [NaN, 0, 0, 1], [0, 0, 0, Infinity], [0, 0, 0, 0]]) {
    assert.equal(motion.update({ orientation }), null); assert.equal(motion.recenter(), null);
  }
  close(motion.update(sample(new Quaternion())), base());
  motion.reset(); assert.equal(motion.recenter(), null);
  close(motion.update(sample(turn([0, 1, 0], 50))), base());
});

function hardware() {
  const pad = new EventTarget();
  Object.assign(pad, {
    vendorId: 0x054c, productId: 0x0ce6, opened: false,
    async open() { this.opened = true; }, async close() { this.opened = false; },
    async receiveFeatureReport(id) {
      assert.equal(id, 5);
      const data = new DataView(new ArrayBuffer(40));
      data.setInt16(18, 500, true); data.setInt16(20, 500, true);
      for (let i = 0; i < 3; i++) { data.setInt16(6 + i * 4, 8000, true); data.setInt16(8 + i * 4, -8000, true); }
      return data;
    },
    sendReport() { assert.fail('Motion must not send hardware output'); },
    sendFeatureReport() { assert.fail('Motion must not write calibration'); },
    report(time, rates = [0, 0, 0], reportId = 1, gravity = [0, 0, -1]) {
      const offset = reportId === 1 ? 0 : 1, data = new DataView(new ArrayBuffer(reportId === 1 ? 63 : 77));
      [128, 128, 128, 128].forEach((value, i) => data.setUint8(offset + i, value));
      data.setUint8(offset + 7, 40); // Cross, neutral D-pad.
      data.setUint8(offset + 5, 128); // Half R2.
      data.setUint8(offset + 32, 0x80); data.setUint8(offset + 36, 0x80);
      rates.forEach((value, i) => data.setInt16(offset + 15 + i * 2, value * 16, true));
      gravity.forEach((value, i) => data.setInt16(offset + 21 + i * 2, value * 8192, true));
      data.setUint32(offset + 27, time * 3000, true);
      this.dispatchEvent(Object.assign(new Event('inputreport'), { device: this, data, reportId }));
    },
  });
  return pad;
}

test('USB and Bluetooth gyro reach the overlay without polling or focus, alongside buttons and triggers', async () => {
  for (const id of [1, 0x31]) {
    const pad = hardware(), input = new ControllerInput(), motion = new StreamerMotion(), outputs = [];
    motion.configure('full', pose);
    const hid = Object.assign(new EventTarget(), { requestDevice: async () => [pad] });
    const source = new StreamerInput(input, { hid, onMotion: reading => outputs.push(motion.update(reading)) });
    await source.connect();
    pad.report(0, undefined, id); pad.report(10, undefined, id);
    assert.equal(outputs.length, 0, 'Motion starts only when enabled');
    source.setGyroEnabled(true);
    pad.report(20, undefined, id); pad.report(30, undefined, id);
    close(outputs.at(-1), base());
    for (let i = 4; i <= 103; i++) pad.report(i * 10, [90, 0, 0], id);
    close(outputs.at(-1), base().multiply(turn([1, 0, 0], 90)));
    assert.equal(input.button('cross'), 1); assert.equal(input.button('r2'), 128 / 255);
    assert.deepEqual(source.gyro.scale, [.0625, .0625, .0625]);
    source.setGyroEnabled(false);
    const count = outputs.length; pad.report(1040, [90, 0, 0], id);
    assert.equal(outputs.length, count); assert.equal(input.button('cross'), 1);
    await source.dispose();
    assert.equal(pad.opened, false); assert.equal(source.gyro.device, null);
    pad.report(1050, [90, 0, 0], id); assert.equal(outputs.length, count);
  }
});

test('stale input resets the neutral reference and disconnect/reconnect cannot replay old rotations', async () => {
  const pad = hardware(), motion = new StreamerMotion(), outputs = []; let now = 0;
  const hid = Object.assign(new EventTarget(), { requestDevice: async () => [pad], getDevices: async () => [pad] });
  const source = new StreamerInput(new ControllerInput(), {
    hid, now: () => now, onMotion: reading => outputs.push(motion.update(reading)),
    onStatus: () => { motion.reset(); source.setGyroEnabled(true); motion.configure(source.gyro.enabled ? 'full' : 'off', pose); },
  });
  await source.connect();
  pad.report(0); pad.report(10); pad.report(20, [100, 0, 0]);
  assert.ok(new Quaternion().fromArray(outputs.at(-1)).angleTo(base()) > .01);
  now = 2000; source.poll();
  assert.equal(source.state, 'waiting-direct'); assert.equal(motion.recenter(), null);
  const count = outputs.length;
  pad.report(2000, [100, 0, 0]); assert.equal(outputs.length, count);
  pad.report(2010, [100, 0, 0]); close(outputs.at(-1), base());
  hid.dispatchEvent(Object.assign(new Event('disconnect'), { device: pad }));
  assert.equal(source.gyro.enabled, false); assert.equal(motion.recenter(), null);
  await source.connect({ automatic: true });
  pad.report(2020); pad.report(2030); close(outputs.at(-1), base());
  await source.dispose();
});

test('disconnect during factory calibration cannot attach stale sensitivity to a later connection', async () => {
  const pad = hardware(); let finish, started;
  const reading = new Promise(resolve => { started = resolve; });
  pad.receiveFeatureReport = () => new Promise(resolve => { finish = resolve; started(); });
  const hid = Object.assign(new EventTarget(), { requestDevice: async () => [pad] });
  const source = new StreamerInput(new ControllerInput(), { hid });
  const pending = source.connect(); await reading;
  source.setGyroEnabled(true); await source.disconnect();
  finish(new DataView(new ArrayBuffer(40)));
  assert.equal(await pending, false); assert.equal(source.gyro.scale, null); assert.equal(source.gyro.enabled, false);
  assert.equal(pad.opened, false); await source.dispose();
});

test('gyro settings travel in overlay links and invalid or old links default to off', () => {
  for (const gyro of ['off', 'subtle', 'full']) {
    const link = new URL(StreamerSettings.url('https://example.test/streamer.html', { gyro }));
    assert.equal(StreamerSettings.read(link.search).gyro, gyro);
  }
  for (const query of ['', '?gyro=true', '?gyro=NaN', '?gyro=spin']) assert.equal(StreamerSettings.read(query).gyro, 'off');
});

test('gyro analytics include only mode and surface, never sensor readings or holding position', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, properties }));
  analytics.streamerSettingChanged('gyro', 'subtle', 'capture');
  analytics.featureAction('streamer', 'gyro_recentered', { surface: 'capture', orientation: [0, 0, 0, 1], device: 'private' });
  assert.deepEqual(events.find(event => event.name === 'controller_streamer_settings_changed').properties, { setting: 'gyro', surface: 'capture', gyro: 'subtle' });
  assert.deepEqual(events.at(-1), { name: 'controller_streamer_gyro_recentered', properties: { surface: 'capture' } });
});
