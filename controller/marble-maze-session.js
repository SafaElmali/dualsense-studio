import { MarbleMaze, mazeLevels } from './marble-maze.js';

// Session and personal times are independent of rendering and device permission.
export class MarbleMazeSession {
  static storageKey = 'dualsense-maze-best-v1';
  constructor(storage) { this.storage = storage; this.mode = 'keyboard'; this.levelIndex = 0; this.game = new MarbleMaze(); this.resetInput(); }
  resetInput() { this.previousCross = null; }
  sampleStart(cross, connected) {
    if (this.mode === 'keyboard' || !connected) { this.resetInput(); return false; }
    const pressed = this.previousCross === false && cross;
    this.previousCross = cross;
    return pressed;
  }
  chooseLevel(index) {
    if (!Number.isInteger(index) || !mazeLevels[index]) return;
    this.levelIndex = index; this.game.load(mazeLevels[index]); this.resetInput();
  }
  chooseMode(mode) {
    if (!['keyboard', 'stick', 'gyro'].includes(mode) || this.mode === mode) return;
    this.mode = mode; this.game.reset(); this.resetInput();
  }
  records() {
    try { const data = JSON.parse(this.storage?.getItem(MarbleMazeSession.storageKey) || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; }
    catch { return {}; }
  }
  best(index = this.levelIndex) {
    const record = this.records()[`${mazeLevels[index].id}:${this.mode}`];
    return Number.isFinite(record) && record > 0 ? record : null;
  }
  saveBest() {
    if (this.game.state !== 'finished' || this.game.elapsed <= 0) return false;
    const best = this.best();
    if (best !== null && best <= this.game.elapsed) return false;
    try {
      if (!this.storage) return false;
      this.storage.setItem(MarbleMazeSession.storageKey, JSON.stringify({ ...this.records(), [`${this.game.level.id}:${this.mode}`]: this.game.elapsed }));
      return true;
    } catch { return false; }
  }
}
