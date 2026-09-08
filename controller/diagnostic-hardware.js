// Protocol commands, board IDs and factory finish codes adapted from DualShock
// Calibration GUI (MIT). See DIAGNOSTICS-NOTICES.md. No calibration/NVS commands.
import { AdaptiveTriggers } from './adaptive-triggers.js';
import { TouchpadInput } from './touchpad-input.js';
import { GyroInput } from './gyro-input.js';

export class DiagnosticHardware {
  static finishes = {
    '00': { name: 'White', preset: 'white' }, '01': { name: 'Midnight Black', preset: 'black' },
    '02': { name: 'Cosmic Red', preset: 'red' }, '03': { name: 'Nova Pink', color: '#e67cbe' },
    '04': { name: 'Galactic Purple', color: '#6754ae' }, '05': { name: 'Starlight Blue', color: '#65b9e5' },
    '06': { name: 'Grey Camouflage' }, '07': { name: 'Volcanic Red', color: '#bf3f45' },
    '08': { name: 'Sterling Silver', color: '#bfc2c8' }, '09': { name: 'Cobalt Blue', color: '#3659b7' },
    '10': { name: 'Chroma Teal', color: '#78b9ae' }, '11': { name: 'Chroma Indigo', color: '#837bc3' },
    '12': { name: 'Chroma Pearl', color: '#e8ddd7' }, '13': { name: 'HyperPop Techno Red', color: '#ed4562' },
    '14': { name: 'HyperPop Remix Green', color: '#a3ed52' }, '15': { name: 'HyperPop Rhythm Blue', color: '#398bf0' },
    '30': { name: '30th Anniversary', color: '#b0b2b7' },
    Z1: { name: 'God of War Ragnarök' }, Z2: { name: 'Spider-Man 2' }, Z3: { name: 'Astro Bot' },
    Z4: { name: 'Fortnite' }, Z6: { name: 'The Last of Us' }, ZA: { name: 'God of War 20th Anniversary' },
    ZB: { name: 'Icon Blue Limited Edition' }, ZC: { name: 'Ghost of Yōtei Limited Edition' },
    ZD: { name: 'Marathon Limited Edition' }, ZE: { name: 'Genshin Impact Limited Edition' }, ZF: { name: '007 First Light Limited Edition' },
  };
  constructor(shared, { getLightColor = () => '#0046ff' } = {}) {
    this.shared = shared; this.getLightColor = getLightColor;
    this.device = null; this.pad = null; this.sensors = null; this.details = null;
    this.generation = 0; this.effect = null; this.paused = false;
    this.onReport = event => {
      if (event.device !== this.device || this.paused) return;
      const pad = DiagnosticHardware.decodePad(event.reportId, event.data);
      if (!pad) return;
      this.pad = { ...pad, id: this.device.productName || 'DualSense', index: -1, connected: true, mapping: 'standard' };
      this.sensors = { contacts: TouchpadInput.decode(event.reportId, event.data) || [], ...GyroInput.decode(event.reportId, event.data) };
      this.lastReport = performance.now();
    };
  }
  attach(device) {
    if (device === this.device) return;
    void this.stop().catch(() => {});
    this.device?.removeEventListener('inputreport', this.onReport);
    this.device = device; this.pad = null; this.sensors = null; this.details = null;
    this.lastReport = null;
    device?.addEventListener('inputreport', this.onReport);
  }
  static decodePad(reportId, data) {
    const start = reportId === 1 && data.byteLength === 63 ? 0 : reportId === 0x31 && data.byteLength === 77 ? 1 : null;
    if (start === null) return null;
    const byte = i => data.getUint8(start + i), hat = byte(7) & 15;
    const values = [byte(7) & 32, byte(7) & 64, byte(7) & 16, byte(7) & 128,
      byte(8) & 1, byte(8) & 2, byte(4) / 255, byte(5) / 255,
      byte(8) & 16, byte(8) & 32, byte(8) & 64, byte(8) & 128,
      [0, 1, 7].includes(hat), [3, 4, 5].includes(hat), [5, 6, 7].includes(hat), [1, 2, 3].includes(hat),
      byte(9) & 1, byte(9) & 2, byte(9) & 4];
    return {
      axes: [0, 1, 2, 3].map(i => byte(i) / 127.5 - 1),
      buttons: values.map((value, i) => ({ value: [6, 7].includes(i) ? value : Number(!!value) })),
    };
  }
  static firmware(data, edge = false) {
    // WebHID receiveFeatureReport includes the report ID. Also accept payload-only fixtures.
    const start = data?.byteLength === 64 && data.getUint8(0) === 0x20 ? 1 : data?.byteLength === 63 ? 0 : null;
    if (start === null) throw new Error('Controller firmware details were unavailable. Try USB.');
    const text = (offset, length) => new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset + start + offset, length)).replace(/\0/g, '').trim();
    const hardware = data.getUint32(start + 23, true);
    const boards = { 3: 'BDM-010', 4: 'BDM-020', 5: 'BDM-030', 6: 'BDM-040', 7: 'BDM-050', 8: 'BDM-050', 9: 'BDM-060R', 17: 'BDM-060M', 19: 'BDM-060X' };
    return {
      model: edge ? 'DualSense Edge' : 'DualSense', board: edge ? 'DualSense Edge' : boards[(hardware >> 8) & 255] || 'Unknown revision',
      firmware: '0x' + data.getUint32(start + 27, true).toString(16).toUpperCase(),
      built: `${text(0, 11)} ${text(11, 8)}`.trim(), finish: null,
    };
  }
  static finish(data) {
    if (data?.byteLength < 21 || data.getUint8(0) !== 0x81 || data.getUint8(1) !== 1 || data.getUint8(2) !== 19 || data.getUint8(3) !== 2) return null;
    const serial = new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset + 4, 17)).replace(/\0/g, '').trim();
    if (!/^[A-Z0-9]{10,17}$/.test(serial)) return null;
    // Retain only the finish; serial numbers never enter UI, downloads, storage, or analytics.
    return DiagnosticHardware.finishes[serial.slice(4, 6)] || null;
  }
  static featurePayload(device, bytes) {
    const reports = [];
    const visit = collection => { reports.push(...(collection.featureReports || [])); (collection.children || []).forEach(visit); };
    (device.collections || []).forEach(visit);
    const report = reports.find(report => report.reportId === 0x80);
    const length = report?.items?.reduce((sum, item) => sum + item.reportSize * item.reportCount, 0) / 8;
    if (!Number.isInteger(length) || length < bytes.length || length > 1024) throw new Error('This connection does not expose the controller test commands. Try USB.');
    const payload = new Uint8Array(length); payload.set(bytes); return payload;
  }
  enqueue(operation) {
    const pending = this.shared.queue.then(operation);
    this.shared.queue = pending.catch(() => {}); return pending;
  }
  async receive(device, id) {
    let timer;
    try {
      return await Promise.race([device.receiveFeatureReport(id), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Reading controller details timed out. Reconnect with USB and try again.')), 2500);
      })]);
    } finally { clearTimeout(timer); }
  }
  async readDetails() {
    const device = this.device, generation = this.generation;
    if (!device) throw new Error('Connect your DualSense to read its details.');
    return this.enqueue(async () => {
      const current = () => this.device === device && this.shared.device === device && generation === this.generation;
      if (!current()) return null;
      const details = DiagnosticHardware.firmware(await this.receive(device, 0x20), device.productId === 0x0df2);
      if (!current()) return null;
      // 0x80 [1,19] queries the serial; it does not alter calibration or storage.
      if (device.productId !== 0x0df2 && this.shared.transport?.name === 'USB') {
        try {
          await device.sendFeatureReport(0x80, DiagnosticHardware.featurePayload(device, [1, 19]));
          if (!current()) return null;
          details.finish = DiagnosticHardware.finish(await this.receive(device, 0x81));
        } catch { /* Firmware details are still useful when finish lookup is unavailable. */ }
      }
      if (!current()) return null;
      this.details = details; return details;
    });
  }
  static motorPacket(transport, left, right, sequence) {
    const bytes = new Uint8Array(transport.length), start = transport.offset;
    bytes[start] = 0x03; bytes[start + 2] = right; bytes[start + 3] = left;
    return AdaptiveTriggers.frame(transport, bytes, sequence);
  }
  static speakerPacket(transport, enabled, sequence) {
    const bytes = new Uint8Array(transport.length), start = transport.offset;
    bytes[start] = 0xa0; bytes[start + 5] = enabled ? 55 : 0;
    return AdaptiveTriggers.frame(transport, bytes, sequence);
  }
  async play(kind) {
    if (!['vibration', 'speaker', 'lights', 'resistance'].includes(kind)) throw new Error('Unknown controller test.');
    const stopped = this.stop(), generation = this.generation, device = this.device, transport = this.shared.transport;
    await stopped;
    const current = () => generation === this.generation && device && device === this.device && device === this.shared.device && device.opened && !this.paused;
    if (!current()) return false;
    if (kind === 'speaker' && transport.name !== 'USB') throw new Error('The speaker test needs a USB data cable.');
    if (kind === 'speaker') DiagnosticHardware.featurePayload(device, [6, 2, 0, 1, 0]);
    const effect = { kind, device, transport, color: this.getLightColor() };
    this.effect = effect;
    const output = packet => this.enqueue(async () => {
      if (!current()) return;
      await device.sendReport(transport.reportId, packet(this.shared.sequence++));
    });
    const feature = bytes => this.enqueue(async () => {
      if (current()) await device.sendFeatureReport(0x80, DiagnosticHardware.featurePayload(device, bytes));
    });
    const wait = milliseconds => new Promise(resolve => {
      this.wake = resolve; this.timer = setTimeout(() => { this.wake = null; resolve(); }, milliseconds);
    });
    try {
      if (kind === 'vibration') {
        await output(sequence => DiagnosticHardware.motorPacket(transport, 150, 0, sequence));
        if (current()) await wait(400);
        await output(sequence => DiagnosticHardware.motorPacket(transport, 0, 0, sequence));
        if (current()) await wait(150);
        await output(sequence => DiagnosticHardware.motorPacket(transport, 0, 150, sequence));
        if (current()) await wait(400);
      } else if (kind === 'resistance') {
        await output(sequence => AdaptiveTriggers.packet(transport, true, sequence, 'resistance'));
        if (current()) await wait(3000);
      } else if (kind === 'lights') {
        await output(sequence => AdaptiveTriggers.lightPacket(transport, '#ff0000', sequence, true));
        for (const color of ['#ff0000', '#00ff00', '#0000ff']) {
          await output(sequence => AdaptiveTriggers.lightPacket(transport, color, sequence));
          if (current()) await wait(500);
        }
      } else {
        await output(sequence => DiagnosticHardware.speakerPacket(transport, true, sequence));
        await feature([6, 4, 0, 0, 8]);
        await feature([6, 2, 1, 1, 0]);
        if (current()) await wait(700);
      }
      return current();
    } finally {
      if (this.effect === effect) await this.stop();
    }
  }
  stop() {
    this.generation++; clearTimeout(this.timer); this.wake?.(); this.wake = null;
    const effect = this.effect; this.effect = null;
    if (!effect) return this.stopping || Promise.resolve();
    const pending = this.enqueue(async () => {
      const { device, transport, kind, color } = effect;
      if (device !== this.shared.device || !device.opened) return;
      const output = packet => device.sendReport(transport.reportId, packet);
      if (kind === 'vibration') await output(DiagnosticHardware.motorPacket(transport, 0, 0, this.shared.sequence++));
      if (kind === 'resistance') await output(AdaptiveTriggers.packet(transport, false, this.shared.sequence++));
      if (kind === 'lights') await output(AdaptiveTriggers.lightPacket(transport, color, this.shared.sequence++));
      if (kind === 'speaker') {
        try { await device.sendFeatureReport(0x80, DiagnosticHardware.featurePayload(device, [6, 2, 0, 1, 0])); }
        finally { await output(DiagnosticHardware.speakerPacket(transport, false, this.shared.sequence++)); }
      }
    });
    this.stopping = pending;
    void pending.finally(() => { if (this.stopping === pending) this.stopping = null; }).catch(() => {});
    return pending;
  }
}
