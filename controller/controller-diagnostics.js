export class ControllerDiagnostics {
  constructor() { this.reset(); }
  reset() {
    this.device = null; this.axes = [0, 0, 0, 0]; this.values = [];
    this.buttons = []; this.travel = [{ min: 1, max: 0 }, { min: 1, max: 0 }];
    this.measurement = null; this.center = null;
    this.sweeping = false;
    this.ranges = Array.from({ length: 2 }, () => new Array(48).fill(0));
  }
  cancelMeasure() { this.measurement = null; }
  startSweep() {
    if (!this.device) return false;
    this.ranges.forEach(range => range.fill(0)); this.sweeping = true; return true;
  }
  stopSweep() { this.sweeping = false; }
  circularity(side) {
    const values = this.ranges[side], count = values.filter(value => value > 0).length;
    return {
      coverage: count / values.length,
      // A partial arc cannot describe the whole stick. No score until every sector is visited.
      error: count === values.length ? Math.sqrt(values.reduce((sum, value) => sum + (value - 1) ** 2, 0) / values.length) * 100 : null,
    };
  }
  measure(time) {
    if (!this.device) return false;
    this.center = null; this.measurement = { start: time, sums: [0, 0, 0, 0], peaks: [0, 0], count: 0 }; return true;
  }
  sample(pad, time) {
    if (!pad || pad.connected === false) { if (this.device) this.reset(); return; }
    const identity = `${pad.index}:${pad.id}`;
    if (identity !== this.device) { this.reset(); this.device = identity; }
    this.axes = Array.from({ length: 4 }, (_, i) => Number.isFinite(pad.axes[i]) ? Math.max(-1, Math.min(1, pad.axes[i])) : 0);
    if (this.sweeping) for (let side = 0; side < 2; side++) {
      const x = this.axes[side * 2], y = this.axes[side * 2 + 1], radius = Math.hypot(x, y);
      if (radius < .3) continue;
      const sector = Math.floor(((Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 48) % 48;
      this.ranges[side][sector] = Math.max(this.ranges[side][sector], radius);
    }
    this.values = pad.buttons.map(button => Number.isFinite(button.value) ? Math.max(0, Math.min(1, button.value)) : 0);
    this.values.forEach((value, i) => {
      const state = this.buttons[i] ??= { presses: 0, down: false, released: false };
      const down = value > .5;
      if (down && !state.down) state.presses++;
      if (!down && state.down) state.released = true;
      state.down = down;
    });
    if (pad.mapping === 'standard') [6, 7].forEach((index, side) => {
      const value = this.values[index]; if (value === undefined) return;
      this.travel[side].min = Math.min(this.travel[side].min, value);
      this.travel[side].max = Math.max(this.travel[side].max, value);
    });
    if (this.measurement) {
      const sample = this.measurement; sample.count++;
      this.axes.forEach((value, i) => { sample.sums[i] += value; });
      for (let side = 0; side < 2; side++) sample.peaks[side] = Math.max(sample.peaks[side], Math.hypot(this.axes[side * 2], this.axes[side * 2 + 1]));
      if (time - sample.start >= 2000) {
        this.center = { axes: sample.sums.map(value => value / sample.count), peaks: sample.peaks };
        this.measurement = null;
      }
    }
  }
}
