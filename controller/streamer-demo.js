// Visual input simulation shared by the setup preview and OBS capture.
// The streamer has no keyboard bindings, so this source can be released
// independently without clearing a real controller's contribution.
export class StreamerDemo {
  constructor(input, { now = () => performance.now(), onChange = () => {} } = {}) {
    Object.assign(this, { input, now, onChange });
    this.startedAt = null;
  }

  get active() { return this.startedAt !== null; }

  start({ loop = false } = {}) {
    this.stop('restarted');
    this.loop = loop;
    this.startedAt = this.now();
    this.onChange(true);
  }

  stop(reason = 'user') {
    if (!this.active) return;
    this.startedAt = null;
    this.input.releaseSource('keyboard');
    this.onChange(false, reason);
  }

  update(time, { liveInput = false } = {}) {
    if (liveInput) { this.stop('live_input'); return; }
    if (!this.active) return;
    const elapsed = Math.max(0, (time - this.startedAt) / 1000);
    if (!this.loop && elapsed >= 6) { this.stop('completed'); return; }
    const phase = elapsed % 6;
    const buttons = ['cross', 'square', 'triangle', 'circle', 'l1', 'r1', 'up', 'right', 'down', 'left', 'l3', 'r3'];
    buttons.forEach((id, index) => this.input.setButton(id, 'keyboard', Math.floor(phase * 2) === index ? 1 : 0));
    this.input.setButton('touchpad', 'keyboard', phase >= 4.5 && phase < 5.5 ? 1 : 0);
    this.input.setButton('l2', 'keyboard', Math.max(0, Math.sin(elapsed * 3)));
    this.input.setButton('r2', 'keyboard', Math.max(0, Math.sin(elapsed * 3 + 2)));
    this.input.setAxis('left', 'keyboard', Math.sin(elapsed * 2) * .8, Math.cos(elapsed * 2) * .8);
    this.input.setAxis('right', 'keyboard', Math.cos(elapsed * 3) * .8, Math.sin(elapsed * 3) * .8);
  }
}
