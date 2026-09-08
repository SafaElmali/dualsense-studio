import test from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveTriggers } from '../controller/adaptive-triggers.js';
import { DiagnosticHardware } from '../controller/diagnostic-hardware.js';

const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const firmware = () => {
  const bytes = new Uint8Array(64), view = new DataView(bytes.buffer); bytes[0] = 0x20;
  bytes.set(new TextEncoder().encode('Aug 29 2026'), 1); bytes.set(new TextEncoder().encode('12:30:00'), 12);
  view.setUint32(24, 0x0500, true); view.setUint32(28, 0x12345678, true); return view;
};
const serial = (code = '02') => {
  const bytes = new Uint8Array(64); bytes.set([0x81, 1, 19, 2]);
  bytes.set(new TextEncoder().encode('ABCD' + code + '12345678901'), 4); return new DataView(bytes.buffer);
};
async function setup(bluetooth = false) {
  const reports = [], features = [], listeners = new Set(), hidListeners = {};
  const device = {
    vendorId: 0x054c, productId: 0x0ce6, opened: false, productName: 'Test DualSense',
    collections: [{ children: [{ outputReports: [{ reportId: bluetooth ? 0x31 : 2, items: [{ reportSize: 8, reportCount: bluetooth ? 77 : 47 }] }], featureReports: [{ reportId: 0x80, items: [{ reportSize: 8, reportCount: 63 }] }] }] }],
    async open() { this.opened = true; }, async close() { this.opened = false; },
    addEventListener(name, fn) { if (name === 'inputreport') listeners.add(fn); }, removeEventListener(name, fn) { listeners.delete(fn); },
    async sendReport(id, bytes) { reports.push({ id, bytes }); },
    async sendFeatureReport(id, bytes) { features.push({ id, bytes }); },
    async receiveFeatureReport(id) { return id === 0x20 ? firmware() : serial(); },
  };
  const shared = new AdaptiveTriggers({ requestDevice: async () => [device], addEventListener(name, fn) { hidListeners[name] = fn; } });
  await shared.connect({ enableEffects: false });
  const hardware = new DiagnosticHardware(shared, { getLightColor: () => '#123456' }); hardware.attach(device);
  return { hardware, shared, device, reports, features, listeners, hidListeners };
}

test('firmware decoding respects framing and DataView offsets, keeps board and factory color separate', () => {
  const data = firmware(), bytes = new Uint8Array(70); bytes.set(new Uint8Array(data.buffer), 3);
  assert.deepEqual(DiagnosticHardware.firmware(new DataView(bytes.buffer, 3, 64)), {
    model: 'DualSense', board: 'BDM-030', firmware: '0x12345678', built: 'Aug 29 2026 12:30:00', finish: null,
  });
  assert.equal(DiagnosticHardware.firmware(new DataView(data.buffer, 1, 63)).board, 'BDM-030');
  assert.equal(DiagnosticHardware.firmware(data, true).board, 'DualSense Edge');
  assert.throws(() => DiagnosticHardware.firmware(new DataView(new ArrayBuffer(12))), /unavailable/);
  assert.equal(DiagnosticHardware.finish(serial()).name, 'Cosmic Red');
  assert.equal(DiagnosticHardware.finish(serial('QQ')), null);
  const invalid = serial(); invalid.setUint8(3, 0); assert.equal(DiagnosticHardware.finish(invalid), null);
});

test('USB details read only firmware and serial lookup, discard identifiers, and never issue calibration writes', async () => {
  const { hardware, features } = await setup(); const info = await hardware.readDetails();
  assert.equal(info.finish.preset, 'red'); assert.equal(JSON.stringify(info).includes('ABCD'), false);
  assert.deepEqual(features.map(({ id, bytes }) => [id, ...bytes.slice(0, 2)]), [[0x80, 1, 19]]);
  assert.equal(features[0].bytes.length, 63);
  assert.ok(features[0].bytes.slice(2).every(byte => byte === 0));
});

test('Bluetooth and Edge retain useful details without unsupported finish queries', async () => {
  const bluetooth = await setup(true); assert.equal((await bluetooth.hardware.readDetails()).finish, null); assert.equal(bluetooth.features.length, 0);
  const edge = await setup(); edge.device.productId = 0x0df2;
  assert.equal((await edge.hardware.readDetails()).model, 'DualSense Edge'); assert.equal(edge.features.length, 0);
});

test('a delayed details read cannot populate a disconnected session or send a late serial query', async () => {
  const { hardware, device, features } = await setup(); let resolve;
  device.receiveFeatureReport = () => new Promise(done => { resolve = done; });
  const reading = hardware.readDetails(); await flush(); hardware.attach(null); resolve(firmware());
  assert.equal(await reading, null); assert.equal(hardware.details, null); assert.equal(features.length, 0);
});

test('a stalled firmware read times out and releases the shared queue for later effects', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { hardware, device, shared } = await setup(); device.receiveFeatureReport = () => new Promise(() => {});
  const reading = hardware.readDetails(); const rejected = assert.rejects(reading, /timed out/);
  await flush(); t.mock.timers.tick(2500); await rejected;
  await shared.setEnabled(false); assert.equal(shared.active, false);
});

test('raw USB and Bluetooth input decoding exposes analog travel, diagonal d-pad, mute and sensor contacts', async () => {
  for (const bluetooth of [false, true]) {
    const { hardware, device, listeners } = await setup(bluetooth), offset = bluetooth ? 1 : 0;
    const data = new DataView(new ArrayBuffer(bluetooth ? 77 : 63));
    [0, 128, 255, 64].forEach((value, i) => data.setUint8(offset + i, value));
    data.setUint8(offset + 4, 128); data.setUint8(offset + 5, 255); data.setUint8(offset + 7, 0x21); data.setUint8(offset + 9, 4);
    data.setUint8(offset + 32, 128); data.setUint8(offset + 36, 128);
    for (const listener of listeners) listener({ device, reportId: bluetooth ? 0x31 : 1, data });
    assert.equal(hardware.pad.axes[0], -1); assert.equal(hardware.pad.axes[2], 1);
    assert.equal(hardware.pad.buttons[6].value, 128 / 255); assert.equal(hardware.pad.buttons[7].value, 1);
    for (const index of [0, 12, 15, 18]) assert.equal(hardware.pad.buttons[index].value, 1);
    assert.equal(hardware.pad.buttons[13].value, 0); assert.deepEqual(hardware.sensors.contacts, []);
    assert.equal(DiagnosticHardware.decodePad(1, new DataView(new ArrayBuffer(9))), null);
    hardware.attach(null); assert.equal(listeners.size, 0); assert.equal(hardware.pad, null);
  }
});

test('vibration runs left then right with an explicit final stop, sharing Bluetooth sequence and preserving triggers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { hardware, shared, reports } = await setup(true);
  const pending = hardware.play('vibration'); await flush();
  assert.deepEqual([...reports.at(-1).bytes.slice(2, 6)], [3, 0, 0, 150]);
  t.mock.timers.tick(400); await flush(); t.mock.timers.tick(150); await flush();
  assert.deepEqual([...reports.at(-1).bytes.slice(2, 6)], [3, 0, 150, 0]);
  t.mock.timers.tick(400); assert.equal(await pending, true);
  assert.deepEqual([...reports.at(-1).bytes.slice(2, 6)], [3, 0, 0, 0]);
  assert.deepEqual(reports.map(report => report.bytes[0] >> 4), [0, 1, 2, 3, 4]);
  assert.equal(shared.mode, 'shooting'); assert.equal(shared.active, false);
});

test('closing or pausing an in-flight vibration prevents its next phase and drains stop before device close', async () => {
  const { hardware, shared, device, reports } = await setup(); let unblock;
  const send = device.sendReport;
  device.sendReport = async (id, bytes) => { await send(id, bytes); if (bytes[3] === 150) await new Promise(resolve => { unblock = resolve; }); };
  const pending = hardware.play('vibration'); await flush();
  const stopped = hardware.stop(); const secondStop = hardware.stop(); assert.equal(stopped, secondStop);
  hardware.attach(null); unblock(); await stopped; await shared.disconnect();
  assert.equal(await pending, false); assert.equal(device.opened, false);
  assert.equal(reports.some(report => report.bytes[2] === 150), false);
  assert.ok(reports.some(report => report.bytes[0] === 3 && report.bytes[2] === 0 && report.bytes[3] === 0));
});

test('speaker test is USB only, padded to the descriptor and always disables the factory tone', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { hardware, features, reports } = await setup();
  const pending = hardware.play('speaker'); await flush();
  assert.deepEqual(features.map(report => [...report.bytes.slice(0, 5)]), [[6, 4, 0, 0, 8], [6, 2, 1, 1, 0]]);
  t.mock.timers.tick(700); assert.equal(await pending, true);
  assert.deepEqual([...features.at(-1).bytes.slice(0, 5)], [6, 2, 0, 1, 0]);
  assert.equal(reports.at(-1).bytes[0], 0xa0); assert.equal(reports.at(-1).bytes[5], 0);
  const bluetooth = await setup(true); await assert.rejects(bluetooth.hardware.play('speaker'), /USB/); assert.equal(bluetooth.features.length, 0);
});

test('cancelled speaker setup cannot enable a late tone and still emits explicit off', async () => {
  const { hardware, device, features } = await setup(); let unblock;
  const send = device.sendFeatureReport;
  device.sendFeatureReport = async (id, bytes) => { await send(id, bytes); if (bytes[1] === 4) await new Promise(resolve => { unblock = resolve; }); };
  const pending = hardware.play('speaker'); await flush(); const stopped = hardware.stop(); unblock(); await stopped;
  assert.equal(await pending, false);
  assert.equal(features.some(report => report.bytes[1] === 2 && report.bytes[2] === 1), false);
  assert.deepEqual([...features.at(-1).bytes.slice(0, 5)], [6, 2, 0, 1, 0]);
});

test('speaker start errors attempt tone-off and volume-off, and future queued commands still work', async () => {
  const { hardware, device, features, reports, shared } = await setup();
  const send = device.sendFeatureReport;
  device.sendFeatureReport = async (id, bytes) => { await send(id, bytes); if (bytes[1] === 2 && bytes[2] === 1) throw new Error('Write failed'); };
  await assert.rejects(hardware.play('speaker'), /Write failed/);
  assert.deepEqual([...features.at(-1).bytes.slice(0, 5)], [6, 2, 0, 1, 0]); assert.equal(reports.at(-1).bytes[5], 0);
  await shared.setEnabled(false); assert.equal(shared.active, false);
});

test('lights restore the selected color and trigger tests leave the existing preset unchanged', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { hardware, shared, reports } = await setup();
  const lights = hardware.play('lights'); await flush();
  for (let i = 0; i < 3; i++) { t.mock.timers.tick(500); await flush(); }
  assert.equal(await lights, true); assert.deepEqual([...reports.at(-1).bytes.slice(44, 47)], [0x12, 0x34, 0x56]);
  const resistance = hardware.play('resistance'); await flush();
  assert.equal(reports.at(-1).bytes[10], 0x21); assert.equal(reports.at(-1).bytes[21], 0x21);
  t.mock.timers.tick(3000); assert.equal(await resistance, true);
  assert.equal(reports.at(-1).bytes[10], 5); assert.equal(reports.at(-1).bytes[21], 5); assert.equal(shared.mode, 'shooting');
});

test('unknown effects and unsupported feature layouts are rejected before output writes', async () => {
  const { hardware, device, reports } = await setup();
  await assert.rejects(hardware.play('unknown'), /Unknown/);
  device.collections[0].children[0].featureReports = [];
  await assert.rejects(hardware.play('speaker'), /does not expose/);
  assert.equal(reports.length, 1);
});
