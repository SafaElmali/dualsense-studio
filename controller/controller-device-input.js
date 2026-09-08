import { TouchpadInput } from './touchpad-input.js';
import { GyroInput } from './gyro-input.js';

// Shared read-only controller input for interactive pages. Never changes trigger effects, rumble, LEDs or calibration.
// Raw packet fields follow Sony's Linux hid-playstation driver (TRIGGER-NOTICES.md).
export class ControllerDeviceInput {
  static buttons = ['cross', 'circle', 'square', 'triangle', 'l1', 'r1', 'l2', 'r2', 'create', 'options', 'l3', 'r3', 'up', 'down', 'left', 'right', 'ps', 'touchpad', 'mute'];
  static filters = [{ vendorId: 0x054c, productId: 0x0ce6 }, { vendorId: 0x054c, productId: 0x0df2 }];

  constructor(input, { hid, getGamepads = () => [], onStatus = () => {}, onTouch = () => {}, onMotion = () => {}, now = () => performance.now() } = {}) {
    Object.assign(this, { input, hid, getGamepads, onStatus, onTouch, now });
    this.gyro = new GyroInput(onMotion, () => {}, now);
    this.slot = 'auto';
    this.generation = 0;
    this.lastReport = -Infinity;
    this.onReport = event => {
      if (event.device !== this.device) return;
      const frame = ControllerDeviceInput.decode(event.reportId, event.data);
      if (!frame) return;
      this.lastReport = this.now();
      this.gyro.setPaused(false);
      this.apply(frame);
      this.onTouch(TouchpadInput.decode(event.reportId, event.data) || []);
      this.status('direct');
    };
    this.onDisconnect = event => { if (event.device === this.device) void this.disconnect(); };
    hid?.addEventListener('disconnect', this.onDisconnect);
  }

  static supported(device) { return this.filters.some(filter => filter.vendorId === device.vendorId && filter.productId === device.productId); }

  static decode(reportId, data) {
    if (!(data instanceof DataView)) return null;
    const offset = reportId === 1 && data.byteLength === 63 ? 0 : reportId === 0x31 && data.byteLength === 77 ? 1 : null;
    if (offset === null) return null;
    const byte = index => data.getUint8(offset + index);
    const hat = byte(7) & 15;
    const bit = (index, mask) => Number(!!(byte(index) & mask));
    const buttons = [bit(7, 32), bit(7, 64), bit(7, 16), bit(7, 128), bit(8, 1), bit(8, 2), byte(4) / 255, byte(5) / 255,
      bit(8, 16), bit(8, 32), bit(8, 64), bit(8, 128), Number([0, 1, 7].includes(hat)), Number([3, 4, 5].includes(hat)), Number([5, 6, 7].includes(hat)), Number([1, 2, 3].includes(hat)), bit(9, 1), bit(9, 2), bit(9, 4)];
    return { buttons, axes: [0, 1, 2, 3].map(index => (byte(index) - 127.5) / 127.5) };
  }

  status(value) {
    if (this.state === value) return;
    this.state = value;
    this.onStatus(value);
  }

  apply({ buttons, axes }) {
    ControllerDeviceInput.buttons.forEach((id, index) => this.input.setButton(id, 'gamepad', buttons[index] || 0));
    const axis = value => Number.isFinite(value) && Math.abs(value) >= .075 ? value : 0;
    this.input.setAxis('left', 'gamepad', axis(axes[0]), axis(axes[1]));
    this.input.setAxis('right', 'gamepad', axis(axes[2]), axis(axes[3]));
  }

  poll() {
    if (this.disposed) return;
    // HID input events continue when the browser window loses focus. If the
    // device stops reporting, clear held input instead of freezing a press.
    if (this.device) {
      if (this.now() - this.lastReport > 1500) { this.gyro.setPaused(true); this.clear(); this.status('waiting-direct'); }
      return;
    }
    let pads;
    try { pads = Array.from(this.getGamepads() || []); }
    catch { this.clear(); this.status('blocked'); return; }
    const pad = this.slot === 'auto' ? pads.find(pad => pad?.connected !== false && pad?.mapping === 'standard') : pads.find(pad => pad && String(pad.index) === this.slot && pad.connected !== false);
    if (!pad || pad.mapping !== 'standard') { this.clear(); this.status(pad ? 'unsupported' : 'waiting'); return; }
    this.apply({ buttons: pad.buttons.map(button => button.value), axes: pad.axes });
    this.status('gamepad');
  }

  clear() { this.input.releaseSource('gamepad'); this.onTouch([]); }

  setGyroEnabled(enabled) {
    enabled = enabled && !!this.device;
    if (enabled !== this.gyro.enabled) this.gyro.setEnabled(enabled);
  }

  async connect({ automatic = false } = {}) {
    if (!this.hid || this.disposed || this.busy) return false;
    if (this.device) return true;
    this.busy = true;
    const generation = ++this.generation;
    let device;
    try {
      const devices = automatic ? (await this.hid.getDevices()).filter(device => ControllerDeviceInput.supported(device)) : await this.hid.requestDevice({ filters: ControllerDeviceInput.filters });
      if (generation !== this.generation || devices.length !== 1 || !ControllerDeviceInput.supported(devices[0])) return false;
      device = devices[0];
      await device.open();
      if (generation !== this.generation) { await device.close(); return false; }
      this.clear();
      this.lastReport = -Infinity;
      this.device = device;
      device.addEventListener('inputreport', this.onReport);
      this.gyro.attach(device);
      this.status('waiting-direct');
      // Reading calibration switches Bluetooth devices to full input reports.
      // This is a feature READ, with no output or calibration writes.
      let timeout;
      try {
        const data = await Promise.race([device.receiveFeatureReport(0x05), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 2500); })]);
        if (this.device === device && generation === this.generation) this.gyro.scale = GyroInput.calibration(data);
      } catch { /* USB and nominal gyro sensitivity work without calibration. */ }
      finally { clearTimeout(timeout); }
      return this.device === device;
    } catch (error) {
      if (device && device !== this.device) { try { await device.close(); } catch { /* Device may have unplugged. */ } }
      throw error;
    } finally { this.busy = false; }
  }

  async disconnect() {
    ++this.generation;
    const device = this.device;
    this.device = null;
    this.gyro.attach(null);
    device?.removeEventListener('inputreport', this.onReport);
    this.clear(); this.status('waiting');
    try { await device?.close(); } catch { /* An unplugged controller is already closed. */ }
  }

  dispose() {
    this.disposed = true;
    this.hid?.removeEventListener('disconnect', this.onDisconnect);
    return this.disconnect();
  }
}
