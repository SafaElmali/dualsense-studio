import { RangeRenderer } from './range-renderer.js';
import { Scorecard } from './scorecard.js';
import { TargetPractice } from './target-practice.js';
import { TargetPracticeInput } from './target-practice-input.js';

export class TargetPracticeView {
  constructor({ leaderboardClient, getPad, onWeapon, onEnableEffects, onStopEffects, effectsActive, onShot, onOpen, onClose, onAction = () => {} }) {
    this.leaderboardClient = leaderboardClient; this.roundRequest = 0; this.roundId = null; this.starting = false; this.submitting = false;
    this.onAction = onAction;
    this.controller = new TargetPracticeInput(getPad); this.onWeapon = onWeapon; this.onEnableEffects = onEnableEffects;
    this.onStopEffects = onStopEffects; this.effectsActive = effectsActive; this.onOpen = onOpen; this.onClose = onClose;
    this.dialog = document.getElementById('range');
    this.canvas = document.getElementById('range-canvas'); this.ctx = this.canvas.getContext('2d');
    this.renderer = new RangeRenderer();
    this.impacts = []; this.previousTime = 0; this.frame = 0;
    this.game = new TargetPractice({ onShot: shot => {
      this.impacts.push({ ...shot, at: this.game.elapsed }); onShot?.();
    } });
    this.best = 0;
    try { this.best = Number(localStorage.getItem('dualsense-range-best-20s')) || 0; } catch { /* Storage is optional. */ }
    this.$('range-weapon').replaceChildren(...Object.entries(TargetPractice.weapons).map(([key, weapon]) => new Option(weapon.label, key)));
    this.$('range-weapon').addEventListener('change', event => this.selectWeapon(event.target.value));
    this.$('range-save-card').addEventListener('click', async () => {
      const result = this.lastResult;
      try { await Scorecard.save(result); this.$('range-download-status').textContent = 'Your scorecard is ready to save.'; this.onAction('scorecard', 'exported', result); }
      catch (error) { this.$('range-download-status').textContent = error.message; this.onAction('scorecard', 'export_failed'); }
    });
    try { this.$('range-nickname').value = localStorage.getItem('dualsense-nickname') || ''; } catch { /* Optional convenience. */ }
    this.$('range-submit-form').addEventListener('submit', event => { event.preventDefault(); void this.submitScore(); });
    this.$('range-start').addEventListener('click', () => this.start());
    this.$('range-pause').addEventListener('click', () => this.pause());
    this.$('range-close').addEventListener('click', () => this.close());
    this.$('range-effects').addEventListener('click', async () => {
      this.connecting = true; this.effectsError = null;
      this.onAction('trigger_effects', 'connect_requested', { surface: 'target_practice' });
      try { const enabled = await this.onEnableEffects(); this.onAction('trigger_effects', enabled ? 'enabled' : 'connect_cancelled', { surface: 'target_practice' }); }
      catch (error) { this.effectsError = error.message; this.onAction('trigger_effects', error.name === 'NotAllowedError' ? 'connect_cancelled' : 'connect_failed', { surface: 'target_practice' }); }
      finally { this.connecting = false; }
    });
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    this.dialog.addEventListener('close', () => this.cleanup());
    window.addEventListener('blur', () => this.pause('page_blur'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause('page_hidden'); });
    this.dialog.querySelector('.range-setup').addEventListener('toggle', event => { if (event.target.open && this.isOpen) this.onAction('target_practice', 'setup_opened'); });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(this.canvas);
  }

  $(id) { return document.getElementById(id); }
  get isOpen() { return this.dialog.open; }

  open(mode) {
    this.onOpen();
    this.connected = this.controller.connected;
    this.onAction('target_practice', 'opened', { connected: this.connected });
    if (!this.connected) this.onAction('target_practice', 'controller_required');
    this.game.setWeapon(Object.hasOwn(TargetPractice.weapons, mode) ? mode : 'shooting');
    this.game.start(); this.game.stop(); this.impacts = []; this.lastResult = null; this.roundId = null;
    this.$('range-submit-status').textContent = ''; this.$('range-ranking-status').textContent = '';
    this.$('range-download-status').textContent = '';
    this.$('range-weapon').value = this.game.weapon;
    this.onWeapon(this.game.weapon);
    this.dialog.showModal(); this.dialog.scrollTop = 0; this.resize(); this.update();
    this.previousTime = 0; this.frame = requestAnimationFrame(time => this.animate(time));
  }

  close() { this.dialog.close(); }
  dispose() { if (this.isOpen) this.cleanup(); cancelAnimationFrame(this.frame); this.observer.disconnect(); }
  cleanup() { this.onAction('target_practice', 'closed', { state: this.game.state }); this.roundRequest++; this.starting = false; cancelAnimationFrame(this.frame); this.release(); this.game.stop(); this.onStopEffects(); this.onClose(); }
  release() { this.controller.reset(); }

  async start() {
    if (!this.controller.connected || this.game.state === 'playing' || this.starting || this.submitting || document.getElementById('leaderboard')?.open) return;
    this.release(); this.impacts = []; this.previousTime = 0;
    this.$('range-result').textContent = ''; this.$('range-download-status').textContent = '';
    if (this.game.state === 'paused') { this.game.resume(); this.onAction('target_practice', 'resumed'); }
    else {
      this.onAction('target_practice', 'start_requested', { mode: this.game.weapon });
      const request = ++this.roundRequest;
      this.starting = true; this.roundId = null; this.lastResult = null; this.submitted = false;
      this.$('range-submit-status').textContent = ''; this.$('range-ranking-status').textContent = 'Getting your round ready…'; this.update();
      try {
        const ticket = await this.leaderboardClient.start();
        if (request === this.roundRequest) { this.roundId = ticket.roundId; this.$('range-ranking-status').textContent = 'Finish your round to submit to the leaderboard.'; }
      } catch (error) { if (request === this.roundRequest) { this.$('range-ranking-status').textContent = error.message; this.onAction('target_practice', 'ranking_unavailable'); } }
      if (request !== this.roundRequest || !this.isOpen) return;
      this.starting = false;
      if (!this.controller.connected) { this.roundId = null; this.$('range-ranking-status').textContent = ''; this.update(); return; }
      this.dialog.querySelector('.range-setup').open = false; this.dialog.scrollTop = 0;
      this.game.start(); this.gyroUsed = false; this.onAction('target_practice', 'started', { mode: this.game.weapon });
      if (document.hidden || !document.hasFocus() || document.getElementById('leaderboard')?.open) this.pause(document.hidden ? 'page_hidden' : !document.hasFocus() ? 'page_blur' : 'leaderboard');
    }
    this.game.trigger(this.controller.sample().pressure);
    if (this.game.state === 'playing') this.canvas.focus(); this.update();
  }

  async submitScore() {
    if (this.submitting || this.submitted || !this.roundId || !this.lastResult || this.game.state !== 'finished') return;
    this.submitting = true; this.update(); this.onAction('leaderboard', 'submit_requested');
    const request = this.roundRequest, nickname = this.$('range-nickname').value.trim();
    this.$('range-submit-status').textContent = 'Submitting your score…';
    try {
      const result = await this.leaderboardClient.submit(this.roundId, nickname, this.lastResult);
      if (request !== this.roundRequest) return;
      this.submitted = true;
      try { localStorage.setItem('dualsense-nickname', nickname); } catch { /* Optional convenience. */ }
      const placement = result.rank && result.rank <= 50 ? `You’re #${result.rank} on the leaderboard.` : 'Keep aiming for the top 50.';
      this.$('range-submit-status').textContent = (!result.rank ? 'Round submitted. ' : result.improved ? 'Score saved! ' : 'Your best score is already saved. ') + placement;
      this.$('range-ranking-status').textContent = '';
      this.onAction('leaderboard', 'submitted', { score: this.lastResult.score });
    } catch (error) { if (request === this.roundRequest) { this.$('range-submit-status').textContent = error.message; this.onAction('leaderboard', 'submit_failed'); } }
    finally { this.submitting = false; this.update(); }
  }

  pause(reason = 'user') {
    if (!this.isOpen || this.game.state !== 'playing') return;
    this.game.pause(); this.onAction('target_practice', 'paused', { reason }); this.release(); this.onStopEffects(); this.update();
  }

  selectWeapon(mode) {
    if (mode !== this.game.weapon) this.onAction('target_practice', 'weapon_changed', { mode });
    this.game.setWeapon(mode); this.$('range-weapon').value = mode;
    this.onWeapon(mode); this.canvas.focus();
  }

  handleController(sample) {
    if (sample.cycleWeapon) {
      const modes = Object.keys(TargetPractice.weapons);
      this.selectWeapon(modes[(modes.indexOf(this.game.weapon) + 1) % modes.length]);
    }
    if (sample.start && this.game.state !== 'playing' && !document.activeElement?.closest('#range-submit-form')) void this.start();
  }

  motion({ pitch, yaw, dt }) {
    if (!this.controller.connected || this.game.state !== 'playing') return;
    if (!this.gyroUsed && (pitch || yaw)) { this.gyroUsed = true; this.onAction('target_practice', 'gyro_used'); }
    this.game.setAim(this.game.aim.x - yaw * dt * 12, this.game.aim.y - pitch * dt * 12);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect(); if (!rect.width) return;
    const ratio = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio);
    this.draw();
  }

  update() {
    const game = this.game, connected = this.controller.connected;
    this.$('range-score').textContent = game.score.toLocaleString();
    this.$('range-time').textContent = Math.ceil(game.remaining).toString().padStart(2, '0') + 's';
    this.$('range-time-bar').style.transform = `scaleX(${game.remaining / 20})`;
    this.dialog.dataset.state = game.state;
    this.dialog.classList.toggle('time-critical', game.state === 'playing' && game.remaining <= 5);
    this.$('range-final-score').hidden = game.state !== 'finished';
    this.$('range-final-points').textContent = game.score.toLocaleString();
    this.$('range-card-eyebrow').textContent = game.state === 'finished' ? 'SESSION COMPLETE / BAY 01' : game.state === 'paused' ? 'SESSION ON HOLD' : '20 SECONDS. JUST YOU AND THE TARGETS.';
    this.$('range-controller-start').hidden = game.state === 'finished' && connected;
    this.$('range-controller-start').textContent = connected ? 'Or press × on your controller' : 'Connect via USB or Bluetooth, then press any controller button.';
    this.$('range-weapon-note').textContent = ({ shooting: 'PRECISION / SINGLE SHOT', shotgun: 'WIDE SPREAD / HEAVY IMPACT', lmg: 'SUSTAINED FIRE / HEAVY', smg: 'RAPID FIRE / LIGHT' })[game.weapon];
    this.$('range-accuracy').textContent = game.accuracy + '%';
    this.$('range-streak').textContent = game.streak;
    this.$('range-best').textContent = this.best.toLocaleString();
    this.$('range-start').disabled = !connected || this.starting || this.submitting;
    this.$('range-weapon').disabled = game.state === 'playing';
    this.$('range-submit-form').hidden = game.state !== 'finished' || !this.roundId || !this.lastResult?.shots || this.starting;
    this.$('range-submit-form').dataset.submitted = String(!!this.submitted);
    this.$('range-submit').disabled = this.submitting || this.submitted;
    this.$('range-submit').textContent = this.submitted ? 'Score submitted' : this.submitting ? 'Submitting…' : 'Submit score';
    this.$('range-nickname').disabled = this.submitting || this.submitted;
    this.$('range-save-card').hidden = game.state !== 'finished';
    this.$('range-overlay').hidden = game.state === 'playing';
    this.$('range-pause').disabled = game.state !== 'playing';
    this.$('range-effects').disabled = this.connecting || this.effectsActive() || game.state === 'playing';
    this.$('range-effects').textContent = this.effectsActive() ? 'Adaptive triggers enabled' : 'Enable adaptive triggers';
    const title = game.state === 'finished' ? (game.hits ? 'Nice shooting.' : 'Round complete.') : !connected ? (game.state === 'paused' ? 'Controller disconnected.' : 'Connect your controller.') : game.state === 'paused' ? 'Take a breath.' : 'Find your focus.';
    const summary = game.state === 'finished' ? `${game.hits} ${game.hits === 1 ? 'hit' : 'hits'} / ${game.shots} ${game.shots === 1 ? 'shot' : 'shots'}  ·  ${game.accuracy}% accuracy`
      : !connected ? (game.state === 'paused' ? 'Your score and timer are safe. Reconnect your controller to resume.' : 'A controller is required for target practice. Aim with the right stick or gyro and fire with R2.') : game.state === 'paused' ? 'Your timer is paused. Resume when you’re ready.' : 'Three moving targets. Four weapons. Make every shot count.';
    this.$('range-title').textContent = title; this.$('range-summary').textContent = summary;
    this.$('range-start').textContent = !connected ? 'Controller required' : this.starting ? 'Starting…' : game.state === 'paused' ? 'Resume round' : game.state === 'finished' ? 'Play again' : 'Start round';
    this.$('range-feedback').textContent = this.effectsError || (this.effectsActive() ? 'Adaptive triggers active · feel your selected weapon' : 'To feel adaptive triggers, enable them before starting or while paused.');
  }

  animate(time) {
    if (!this.isOpen) return;
    this.frame = requestAnimationFrame(next => this.animate(next));
    const dt = this.previousTime ? (time - this.previousTime) / 1000 : 0; this.previousTime = time;
    const wasPlaying = this.game.state === 'playing';
    const sample = this.controller.sample();
    if (sample.connected !== this.connected) { this.connected = sample.connected; this.onAction('target_practice', 'controller_connection_changed', { connected: sample.connected }); }
    if (!sample.connected) {
      this.pause('disconnected');
      if (this.starting) {
        this.roundRequest++; this.starting = false; this.roundId = null;
        this.$('range-ranking-status').textContent = '';
      }
    } else if (!document.hidden && document.hasFocus() && !this.$('leaderboard')?.open) {
      this.handleController(sample);
      this.game.step(dt, sample);
    }
    if (wasPlaying && this.game.state === 'finished') {
      this.lastResult = this.game.result();
      if (this.roundId) this.$('range-ranking-status').textContent = this.lastResult.shots ? '' : 'Take at least one shot in your next round to join the leaderboard.';
      this.onAction('target_practice', 'completed', this.lastResult);
      this.release(); this.onStopEffects();
      this.best = Math.max(this.best, this.game.score);
      try { localStorage.setItem('dualsense-range-best-20s', String(this.best)); } catch { /* Storage is optional. */ }
      this.$('range-result').textContent = `Round complete: ${this.game.score} points and ${this.game.accuracy}% accuracy.`;
      this.update();
      if (!this.$('range-submit-form').hidden && document.activeElement === this.canvas) this.$('range-nickname').focus({ preventScroll: true });
    }
    this.impacts = this.impacts.filter(impact => this.game.elapsed - impact.at < .6);
    this.update(); this.draw();
  }

  draw() {
    if (this.ctx && this.canvas.width) this.renderer.draw(this.ctx, this.game, this.impacts, this.canvas.width, this.canvas.height);
  }
}
