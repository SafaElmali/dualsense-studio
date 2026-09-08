import { ControllerDiagnostics } from './controller-diagnostics.js';
import { ControllerCheckup } from './controller-checkup.js';
import { DiagnosticHardware } from './diagnostic-hardware.js';
import { CanvasDownload } from './canvas-download.js';

export class DiagnosticsView {
  constructor({ getPad, onOpen, onClose, labels, controller, onConnect, onMatchFinish, getLightColor, onAction = () => {} }) {
    Object.assign(this, { getPad, onOpen, onClose, labels, controller, onConnect, onMatchFinish, onAction });
    this.model = new ControllerDiagnostics(); this.checkup = new ControllerCheckup();
    this.hardware = new DiagnosticHardware(controller, { getLightColor });
    this.dialog = document.getElementById('diagnostics');
    this.frame = 0; this.tab = 'sticks'; this.session = 0; this.testRun = 0; this.running = false; this.connecting = false; this.reading = false;
    this.$('diagnostics-close').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('close', () => {
      this.session++; cancelAnimationFrame(this.frame); this.model.cancelMeasure(); this.model.stopSweep();
      this.stopTest(); this.hardware.attach(null); this.onClose();
    });
    this.$('diagnostics-reset').addEventListener('click', () => this.reset());
    this.$('checkup-reset').addEventListener('click', () => this.reset());
    this.$('diagnostics-measure').addEventListener('click', () => {
      if (this.model.measure(performance.now())) {
        if (this.checkup.results.sticks === 'observed') delete this.checkup.results.sticks;
        this.onAction('diagnostics', 'measurement_started');
      }
    });
    this.$('diagnostics-sweep').addEventListener('click', () => {
      if (this.model.sweeping) this.model.stopSweep();
      else if (this.model.startSweep() && this.checkup.results.sticks === 'observed') delete this.checkup.results.sticks;
    });
    this.$('diagnostics-connect').addEventListener('click', () => { void this.connect(); });
    this.$('diagnostics-read-details').addEventListener('click', () => { void this.readDetails(); });
    this.$('diagnostics-match-finish').addEventListener('click', () => {
      const finish = this.hardware.details?.finish;
      if (finish && this.onMatchFinish(finish)) {
        this.$('diagnostics-details-status').textContent = `${finish.name} applied to the 3D controller. Close this panel to see it.`;
      } else this.$('diagnostics-details-status').textContent = 'The 3D preview is still loading or unavailable. Try matching the finish once the preview is ready.';
    });
    const tabs = [...this.dialog.querySelectorAll('[data-diagnostics-tab]')];
    for (const tab of tabs) {
      tab.addEventListener('click', () => this.selectTab(tab.dataset.diagnosticsTab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        this.selectTab(tabs[index].dataset.diagnosticsTab); tabs[index].focus();
      });
    }
    this.$('checkup-steps').replaceChildren(...ControllerCheckup.steps.map((step, index) => {
      const button = document.createElement('button'); button.type = 'button';
      const name = document.createElement('span'), result = document.createElement('span');
      name.textContent = step.title; button.append(name, result);
      button.addEventListener('click', () => this.selectStep(index)); return button;
    }));
    this.$('checkup-next').addEventListener('click', () => this.selectStep(this.checkup.index + 1));
    this.$('checkup-previous').addEventListener('click', () => this.selectStep(this.checkup.index - 1));
    this.$('checkup-stick-lab').addEventListener('click', () => { this.selectTab('sticks'); this.$('diagnostics-measure').focus(); });
    this.$('checkup-run').addEventListener('click', () => { void this.runTest(); });
    this.$('checkup-stop').addEventListener('click', () => this.stopTest());
    for (const [id, result] of [['confirm', 'confirmed'], ['issue', 'issue'], ['skip', 'skipped']]) {
      this.$('checkup-' + id).addEventListener('click', () => { this.stopTest(); this.checkup.mark(result); this.renderCheckup(); });
    }
    this.$('checkup-save').addEventListener('click', () => { void this.saveCard(); });
    this.onPause = () => {
      if (!this.isOpen) return;
      this.hardware.paused = document.hidden || !document.hasFocus();
      if (this.hardware.paused) { this.model.cancelMeasure(); this.model.stopSweep(); this.checkup.previousTouch = null; this.stopTest(); }
    };
    window.addEventListener('blur', this.onPause); window.addEventListener('focus', this.onPause);
    document.addEventListener('visibilitychange', this.onPause);
    this.onPageHide = () => { this.stopTest(); this.hardware.attach(null); };
    window.addEventListener('pagehide', this.onPageHide);
  }
  $(id) { return document.getElementById(id); }
  text(id, value) { const node = this.$(id); if (node.textContent !== value) node.textContent = value; }
  get isOpen() { return this.dialog.open; }
  open() {
    if (this.isOpen) return;
    this.session++; this.reset(); this.onOpen(); this.dialog.showModal();
    this.hardware.paused = false; this.syncHardware(); this.selectTab('sticks');
    if (!navigator.hid) this.$('diagnostics-hardware-status').textContent = 'Use desktop Chrome or Edge for controller details and hardware tests. Buttons and sticks still work here.';
    this.onAction('diagnostics', 'opened'); this.animate(performance.now());
  }
  reset() {
    this.stopTest(); this.model.reset(); this.checkup.reset();
    this.$('checkup-status').textContent = '';
    this.onAction('diagnostics', 'reset');
  }
  syncHardware() {
    if (this.hardware.device === this.controller.device) return;
    this.reset(); this.hardware.attach(this.controller.device);
    this.$('diagnostics-details').replaceChildren(); this.$('diagnostics-match-finish').hidden = true;
    this.$('diagnostics-details-status').textContent = 'Use USB for original-finish lookup. Details stay in this tab.';
    this.$('diagnostics-hardware-status').textContent = this.hardware.device
      ? `${this.controller.transport.name} connected. Hardware tests are ready.`
      : 'DualSense disconnected. Connect again to start a new checkup.';
  }
  selectTab(name) {
    if (!['sticks', 'checkup', 'details'].includes(name)) return;
    if (this.tab !== name) this.stopTest();
    this.tab = name;
    for (const tab of this.dialog.querySelectorAll('[data-diagnostics-tab]')) {
      const selected = tab.dataset.diagnosticsTab === name;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      this.$('diagnostics-panel-' + tab.dataset.diagnosticsTab).hidden = !selected;
    }
    this.renderCheckup();
  }
  selectStep(index) { this.stopTest(); this.checkup.select(index); this.$('checkup-status').textContent = ''; this.renderCheckup(); }
  async connect() {
    if (this.connecting) return false;
    this.connecting = true; const session = this.session;
    this.$('diagnostics-hardware-status').textContent = 'Choose your DualSense in the browser’s device picker.';
    try {
      await this.onConnect();
      if (!this.isOpen || session !== this.session) return false;
      this.syncHardware();
      this.$('diagnostics-hardware-status').textContent = this.hardware.device
        ? `${this.controller.transport.name} connected. Hardware tests are ready; effects start only when you choose Start test.`
        : 'No controller selected. You can still check browser-reported buttons and sticks.';
      return !!this.hardware.device;
    } catch (error) {
      if (this.isOpen && session === this.session) this.$('diagnostics-hardware-status').textContent = error.name === 'NotAllowedError' ? 'Controller access was not granted. Connect again when ready.' : error.message;
      return false;
    } finally { this.connecting = false; }
  }
  async readDetails() {
    if (this.reading) return;
    this.reading = true; const session = this.session;
    this.$('diagnostics-read-details').disabled = true;
    try {
      if (!this.hardware.device && !await this.connect()) return;
      if (!this.isOpen || session !== this.session) return;
      this.$('diagnostics-details-status').textContent = 'Reading controller details…';
      const details = await this.hardware.readDetails();
      if (!this.isOpen || session !== this.session) return;
      if (!details) { this.$('diagnostics-details-status').textContent = 'Reading stopped. Choose Read controller details to try again.'; return; }
      const fields = { Model: details.model, Connection: this.controller.transport.name, 'Board revision': details.board, Firmware: details.firmware, 'Firmware built': details.built || 'Unavailable', 'Original finish': details.finish?.name || 'Unavailable' };
      this.$('diagnostics-details').replaceChildren(...Object.entries(fields).map(([label, value]) => {
        const item = document.createElement('div'), term = document.createElement('dt'), description = document.createElement('dd');
        term.textContent = label; description.textContent = value; item.append(term, description); return item;
      }));
      this.$('diagnostics-match-finish').hidden = !(details.finish?.preset || details.finish?.color);
      this.$('diagnostics-details-status').textContent = details.finish ? 'Controller details ready. Finish matching changes only the 3D preview.' : 'Firmware details ready. Original-finish lookup may need USB or may be unavailable for this model.';
    } catch (error) {
      if (this.isOpen && session === this.session) this.$('diagnostics-details-status').textContent = error.message;
    } finally { this.reading = false; this.$('diagnostics-read-details').disabled = false; }
  }
  async runTest() {
    if (this.running || !this.hardware.device) return;
    const id = this.checkup.step.id, run = ++this.testRun, session = this.session;
    this.running = true; this.checkup.attempted.delete(id); delete this.checkup.results[id];
    this.$('checkup-status').textContent = 'Test running…'; this.renderCheckup();
    try {
      const completed = await this.hardware.play(id);
      if (run !== this.testRun || session !== this.session || !this.isOpen) return;
      if (completed) this.checkup.attempted.add(id);
      this.$('checkup-status').textContent = completed ? 'Test finished. Confirm what you felt or heard.' : 'Test stopped. Start it again when ready.';
    } catch (error) {
      if (run === this.testRun && session === this.session) this.$('checkup-status').textContent = `${error.message} If an effect continues, disconnect the controller.`;
    } finally { if (run === this.testRun) { this.running = false; this.renderCheckup(); } }
  }
  stopTest() {
    if (this.running) this.$('checkup-status').textContent = 'Test stopped. Start it again when ready.';
    this.testRun++; this.running = false;
    return this.hardware.stop().catch(() => { this.$('checkup-status').textContent = 'Could not stop the test. Disconnect the controller to clear the effect.'; });
  }
  animate(time) {
    if (!this.isOpen) return;
    this.syncHardware();
    if (!document.hidden && document.hasFocus()) {
      const fresh = this.hardware.lastReport !== null && time - this.hardware.lastReport < 1500;
      const candidate = this.hardware.device ? (fresh ? this.hardware.pad : null) : this.getPad();
      const pad = candidate?.connected === false ? null : candidate;
      const measuring = !!this.model.measurement, previousDevice = this.model.device;
      // A pause or temporarily silent HID connection must not erase completed checks.
      // Actual HID disconnects/switches are handled by syncHardware().
      if (pad || !this.hardware.device) this.model.sample(pad, time);
      else {
        this.model.cancelMeasure(); this.model.stopSweep();
        if (this.running) this.stopTest();
      }
      if (previousDevice && previousDevice !== this.model.device) { this.checkup.reset(); this.stopTest(); }
      if (this.model.device && this.model.device !== previousDevice) this.onAction('diagnostics', 'connected');
      if (measuring && this.model.center && !this.model.measurement) this.onAction('diagnostics', 'measurement_completed');
      this.checkup.sample(this.model, pad, this.hardware.sensors);
      this.render(pad, time);
    }
    this.frame = requestAnimationFrame(next => this.animate(next));
  }
  render(pad, time) {
    const model = this.model;
    this.text('diagnostics-device', pad ? pad.id : this.hardware.device ? 'Connected. Waiting for controller input…' : 'Connect a controller and press any button to begin.');
    this.$('diagnostics-connect').disabled = this.connecting || !!this.hardware.device || !navigator.hid;
    this.text('diagnostics-connect', this.hardware.device ? 'DualSense connected' : this.connecting ? 'Connecting…' : 'Connect DualSense');
    this.$('diagnostics-read-details').disabled = this.reading || this.connecting || !navigator.hid;
    this.$('diagnostics-measure').disabled = !pad || !!model.measurement;
    this.text('diagnostics-measure', model.measurement ? 'Measuring…' : 'Measure resting sticks');
    this.$('diagnostics-sweep').disabled = !pad;
    this.text('diagnostics-sweep', model.sweeping ? 'Stop range sweep' : model.ranges.some(range => range.some(Boolean)) ? 'Start a new sweep' : 'Start range sweep');
    this.text('diagnostics-measure-status', model.measurement ? 'Let go of both sticks… ' + Math.max(0, 2 - (time - model.measurement.start) / 1000).toFixed(1) + 's'
      : model.sweeping ? 'Slowly rotate both sticks along the outer edge until each sweep reaches 100%.'
      : model.center ? 'Resting sample captured. A small offset alone does not establish a fault.' : 'Let go of both sticks, then measure for two seconds. Readings have no added deadzone.');
    for (const [side, offset] of [['left', 0], ['right', 2]]) {
      const x = model.axes[offset], y = model.axes[offset + 1], circle = model.circularity(offset / 2), center = model.center;
      this.text('diagnostics-' + side + '-values', pad ? `X ${x.toFixed(4)} · Y ${y.toFixed(4)}` : 'Waiting for controller');
      this.text('diagnostics-' + side + '-center', center ? `Resting offset ${(Math.hypot(center.axes[offset], center.axes[offset + 1]) * 100).toFixed(2)}% · peak ${(center.peaks[offset / 2] * 100).toFixed(2)}%` : 'No resting sample yet');
      this.text('diagnostics-' + side + '-range', circle.error === null ? `Sweep ${Math.round(circle.coverage * 100)}% · ${circle.coverage ? 'keep rotating' : 'not measured'}` : `Circularity error ${circle.error.toFixed(1)}% · full sweep`);
      if (this.tab === 'sticks') this.renderStick(this.$('diagnostics-' + side + '-canvas'), offset / 2, !!pad);
    }
    for (let i = 0; i < 2; i++) {
      const prefix = 'diagnostics-' + (i ? 'r2' : 'l2'), available = pad?.mapping === 'standard' && pad.buttons.length > i + 6;
      this.$(prefix).value = available ? model.values[i + 6] : 0;
      this.text(prefix + '-value', available ? Math.round(model.values[i + 6] * 100) + '%' : 'Unavailable');
      const travel = model.travel[i];
      this.text(prefix + '-travel', available ? `Observed ${Math.round(travel.min * 100)}% → ${Math.round(travel.max * 100)}%` : 'Requires a standard controller layout');
    }
    const container = this.$('diagnostics-buttons');
    if (container.children.length !== model.buttons.length) container.replaceChildren(...model.buttons.map(() => document.createElement('span')));
    model.buttons.forEach((button, i) => {
      const node = container.children[i], label = this.buttonLabel(pad, i);
      const text = `${label} · ${pad ? button.down ? 'pressed' : button.released ? 'released' : 'untested' : 'waiting'} · ${button.presses}`;
      if (node.textContent !== text) node.textContent = text;
      node.className = pad && button.down ? 'down' : button.released ? 'tested' : '';
    });
    this.renderCheckup(pad);
  }
  buttonLabel(pad, index) { return pad?.mapping === 'standard' ? this.labels[index] || (index === 18 && this.hardware.device ? 'Mute' : `Button ${index + 1}`) : `Button ${index + 1}`; }
  renderStick(canvas, side, connected) {
    const ctx = canvas.getContext('2d'), center = 200, radius = 125;
    ctx.clearRect(0, 0, 400, 400); ctx.save(); ctx.translate(center, center);
    ctx.strokeStyle = '#4a5b7280'; ctx.lineWidth = 1;
    for (const scale of [.25, .5, 1]) { ctx.beginPath(); ctx.arc(0, 0, radius * scale, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-180, 0); ctx.lineTo(180, 0); ctx.moveTo(0, -180); ctx.lineTo(0, 180); ctx.stroke();
    for (let i = 0; i < 48; i++) {
      const distance = this.model.ranges[side][i]; if (!distance) continue;
      const angle = (i + .5) / 48 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.lineTo(Math.cos(angle) * distance * radius, Math.sin(angle) * distance * radius);
      ctx.strokeStyle = distance >= 1 ? '#85c8af' : '#e6ad7b'; ctx.lineWidth = 7; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, distance * radius, i / 48 * Math.PI * 2, (i + 1) / 48 * Math.PI * 2);
      ctx.strokeStyle = '#f4d878bb'; ctx.lineWidth = 2; ctx.stroke();
    }
    if (connected) {
      const [x, y] = this.model.axes.slice(side * 2, side * 2 + 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x * radius, y * radius); ctx.strokeStyle = '#f4d87866'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(x * radius, y * radius, 7, 0, Math.PI * 2); ctx.fillStyle = '#f4d878'; ctx.fill();
    }
    ctx.restore();
  }
  renderCheckup(pad = this.hardware.device ? this.hardware.pad : this.getPad()) {
    const checkup = this.checkup, { id, title, instruction } = checkup.step;
    const effect = ['resistance', 'lights', 'vibration', 'speaker'].includes(id);
    const statusNames = { observed: 'Observed', confirmed: 'Confirmed', issue: 'Issue noted', skipped: 'Skipped' };
    [...this.$('checkup-steps').children].forEach((button, index) => {
      const result = checkup.results[ControllerCheckup.steps[index].id];
      button.setAttribute('aria-current', index === checkup.index ? 'step' : 'false');
      button.dataset.result = result || '';
      const label = statusNames[result] || 'Untested';
      if (button.lastElementChild.textContent !== label) button.lastElementChild.textContent = label;
    });
    this.text('checkup-progress', `${Object.keys(checkup.results).length} / 9 checked${checkup.complete ? ' · complete' : ''}`);
    this.text('checkup-step-number', `CHECK ${String(checkup.index + 1).padStart(2, '0')} / 09`);
    this.text('checkup-title', title); this.text('checkup-instruction', instruction);
    this.$('checkup-home-note').hidden = id !== 'buttons' || !pad?.buttons[16] || !ControllerCheckup.isOptionalButton(pad, 16);
    this.$('checkup-previous').disabled = checkup.index === 0;
    this.$('checkup-next').disabled = checkup.index === ControllerCheckup.steps.length - 1;
    this.$('checkup-run').hidden = !effect; this.$('checkup-run').disabled = this.running || !this.hardware.device || this.hardware.paused;
    this.$('checkup-stop').hidden = !this.running;
    this.$('checkup-confirm').hidden = !effect; this.$('checkup-confirm').disabled = this.running || !checkup.attempted.has(id);
    this.$('checkup-issue').disabled = !pad && !this.hardware.device;
    this.$('checkup-stick-lab').hidden = !['sticks', 'triggers'].includes(id);
    this.$('checkup-motion').hidden = id !== 'motion';
    const feedback = [];
    if (id === 'buttons') this.model.buttons.forEach((button, index) => {
      const label = this.buttonLabel(pad, index) + (ControllerCheckup.isOptionalButton(pad, index) ? ' · optional' : '');
      feedback.push([label, button.released]);
    });
    if (id === 'sticks') {
      feedback.push(['Resting sample', !!this.model.center]);
      [0, 1].forEach(side => { const coverage = this.model.circularity(side).coverage; feedback.push([`${side ? 'Right' : 'Left'} sweep ${Math.round(coverage * 100)}%`, coverage === 1]); });
    }
    if (id === 'triggers') this.model.travel.forEach((travel, i) => feedback.push([`${i ? 'R2' : 'L2'} full travel & release`, pad?.mapping === 'standard' && travel.min <= .05 && travel.max >= .95 && this.model.values[6 + i] <= .05]));
    if (id === 'touchpad') feedback.push(['Movement', checkup.touch.moved], ['Two fingers', checkup.touch.two], ['Click', checkup.touch.click]);
    if (id === 'motion') ['Pitch', 'Yaw', 'Roll'].forEach((axis, index) => {
      feedback.push([axis + ' response', checkup.motion[index]]);
      this.$('checkup-' + axis.toLowerCase()).value = pad ? Math.abs(this.hardware.sensors?.rates[index] || 0) : 0;
    });
    if (effect) feedback.push([this.running ? 'Test running' : checkup.attempted.has(id) ? 'Test played' : 'Ready when you are', checkup.attempted.has(id)]);
    if (['touchpad', 'motion', 'resistance', 'lights', 'vibration', 'speaker'].includes(id) && !this.hardware.device) feedback.push(['Connect DualSense above to use this check', false]);
    if (id === 'buttons' && !pad) feedback.push(['Connect a controller and press a button', false]);
    const key = JSON.stringify(feedback);
    if (key !== this.feedbackKey) {
      this.feedbackKey = key;
      this.$('checkup-feedback').replaceChildren(...feedback.map(([label, done]) => { const item = document.createElement('span'); item.textContent = (done ? '✓ ' : '') + label; item.dataset.done = String(done); return item; }));
    }
  }
  async saveCard() {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900;
    const pad = this.hardware.device ? this.hardware.pad : this.getPad();
    const ctx = canvas.getContext('2d'), results = this.checkup.snapshot(this.model, pad), details = this.hardware.details, center = this.model.center;
    ctx.fillStyle = '#111923'; ctx.fillRect(0, 0, 1200, 900);
    ctx.fillStyle = '#f4d878'; ctx.font = '18px system-ui'; ctx.fillText('DUALSENSE STUDIO / CONTROLLER CHECKUP', 60, 65);
    ctx.fillStyle = '#ecf2fb'; ctx.font = 'bold 44px system-ui'; ctx.fillText('Know your controller.', 60, 130);
    ctx.fillStyle = '#a7b7cc'; ctx.font = '20px system-ui';
    ctx.fillText(`${details?.model || 'Controller'} · ${new Date().toLocaleDateString()} · ${this.checkup.complete ? 'Checkup complete' : 'Partial checkup'}`, 60, 174);
    const names = { observed: 'INPUT OBSERVED', confirmed: 'USER CONFIRMED', issue: 'ISSUE NOTED', skipped: 'SKIPPED', untested: 'UNTESTED' };
    results.forEach((step, i) => {
      const y = 216 + i * 48;
      ctx.fillStyle = i % 2 ? '#172231' : '#1b2838'; ctx.fillRect(60, y, 1080, 42);
      ctx.fillStyle = '#dde8f6'; ctx.font = '19px system-ui'; ctx.fillText(step.title, 78, y + 28);
      if (step.note) { ctx.fillStyle = '#97a8bc'; ctx.font = '16px system-ui'; ctx.fillText(step.note, 360, y + 28); }
      ctx.fillStyle = ['observed', 'confirmed'].includes(step.result) ? '#9cd2b2' : step.result === 'issue' ? '#efb494' : '#97a8bc';
      ctx.font = '16px system-ui'; ctx.fillText(names[step.result], 850, y + 28);
    });
    ctx.fillStyle = '#f4d878'; ctx.font = '18px system-ui';
    [0, 1].forEach(side => {
      const circularity = this.model.circularity(side), offset = side * 2;
      const rest = center ? (Math.hypot(center.axes[offset], center.axes[offset + 1]) * 100).toFixed(2) + '%' : 'not measured';
      ctx.fillText(`${side ? 'Right' : 'Left'} stick · rest ${rest} · circularity ${circularity.error === null ? 'incomplete' : circularity.error.toFixed(1) + '%'}`, 60, 690 + side * 30);
    });
    ctx.fillStyle = '#a7b7cc'; ctx.font = '17px system-ui';
    ctx.fillText('Observed inputs and personal confirmations. This is not a repair diagnosis.', 60, 792);
    ctx.fillText('No controller identifiers included. No calibration changed.', 60, 822);
    ctx.fillStyle = '#f4d878'; ctx.fillText('dualsense.studio', 60, 860);
    try { await CanvasDownload.save(canvas, 'dualsense-checkup.png'); this.$('checkup-status').textContent = 'Checkup card downloaded.'; }
    catch (error) { this.$('checkup-status').textContent = error.message; }
  }
  dispose() {
    cancelAnimationFrame(this.frame); this.stopTest(); this.hardware.attach(null);
    window.removeEventListener('blur', this.onPause); window.removeEventListener('focus', this.onPause);
    document.removeEventListener('visibilitychange', this.onPause); window.removeEventListener('pagehide', this.onPageHide);
  }
}
