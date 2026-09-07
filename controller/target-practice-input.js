// Gameplay reads the physical gamepad directly, independently of the virtual viewer.
export class TargetPracticeInput {
  constructor(getPad) { this.getPad = getPad; this.reset(); }

  pad() {
    try {
      const pad = this.getPad();
      return pad?.connected && pad.mapping === 'standard' && pad.axes.length >= 4 && pad.buttons.length >= 8 ? pad : null;
    } catch { return null; }
  }

  get connected() { return this.pad() !== null; }
  reset() { this.previous = null; }

  sample() {
    const pad = this.pad();
    if (!pad) { this.reset(); return { connected: false, x: 0, y: 0, pressure: 0, start: false, cycleWeapon: false }; }
    const axis = value => Number.isFinite(value) && Math.abs(value) > .075 ? Math.max(-1, Math.min(1, value)) : 0;
    const x = axis(pad.axes[2]), y = axis(pad.axes[3]), length = Math.max(1, Math.hypot(x, y));
    const cross = !!pad.buttons[0].pressed, triangle = !!pad.buttons[3].pressed;
    const previous = this.previous?.id === pad.id && this.previous.index === pad.index ? this.previous : null;
    this.previous = { id: pad.id, index: pad.index, cross, triangle };
    return {
      connected: true, x: x / length, y: y / length,
      pressure: Number.isFinite(pad.buttons[7].value) ? Math.max(0, Math.min(1, pad.buttons[7].value)) : 0,
      // Connecting or resuming with a held button must not start another round.
      start: !!previous && cross && !previous.cross,
      cycleWeapon: !!previous && triangle && !previous.triangle,
    };
  }
}
