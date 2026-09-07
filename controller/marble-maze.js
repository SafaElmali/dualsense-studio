export const mazeLevels = [
  { id: 'first-light', name: 'First light', hint: 'Follow the turns. Gentle tilts go a long way.',
    start: { x: -4, y: 3 }, goal: { x: 4, y: -3 },
    walls: [{ x: -1.7, y: 1.2, w: 6.6, h: .3 }, { x: 1.7, y: -1.2, w: 6.6, h: .3 }], pits: [] },
  { id: 'switchback', name: 'Switchback', hint: 'Thread the gaps and steer around the dark pockets.',
    start: { x: -4, y: 3 }, goal: { x: 4, y: -3 },
    walls: [{ x: -1.8, y: 1.5, w: 6.4, h: .3 }, { x: 1.8, y: -.5, w: 6.4, h: .3 }, { x: -1.8, y: -2.4, w: 6.4, h: .3 }],
    pits: [{ x: 3.8, y: .65, r: .48 }, { x: -3.8, y: -1.5, r: .48 }] },
  { id: 'fine-line', name: 'Fine line', hint: 'Four chambers. Slow down before every corner.',
    start: { x: -4, y: 3 }, goal: { x: 4, y: -3 },
    walls: [{ x: -2.5, y: .75, w: .3, h: 6.5 }, { x: 0, y: -.75, w: .3, h: 6.5 }, { x: 2.5, y: .75, w: .3, h: 6.5 }],
    pits: [{ x: -1.2, y: -1.4, r: .46 }, { x: 1.2, y: 1.5, r: .46 }, { x: 3.8, y: -.2, r: .46 }] },
];

export class MarbleMaze {
  static radius = .23;
  constructor(level = mazeLevels[0]) { this.load(level); }
  load(level) { this.level = level; this.reset(); }
  reset() { this.state = 'ready'; this.elapsed = 0; this.falls = 0; this.resetBall(); }
  resetBall() { this.ball = { ...this.level.start, vx: 0, vy: 0 }; }
  start() { if (['ready', 'paused'].includes(this.state)) this.state = 'playing'; }
  pause() { if (this.state === 'playing') { this.state = 'paused'; this.ball.vx = 0; this.ball.vy = 0; } }

  update(dt, tilt = { x: 0, y: 0 }) {
    if (this.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    // A stalled/background frame must never leap through a wall or charge time.
    if (dt > .25) { this.pause(); return; }
    const steps = Math.ceil(dt / (1 / 120)), step = dt / steps;
    const x = Number.isFinite(tilt.x) ? Math.max(-1, Math.min(1, tilt.x)) : 0;
    const y = Number.isFinite(tilt.y) ? Math.max(-1, Math.min(1, tilt.y)) : 0;
    const length = Math.max(1, Math.hypot(x, y));
    for (let i = 0; i < steps && this.state === 'playing'; i++) {
      this.elapsed += step;
      const ball = this.ball;
      ball.vx = (ball.vx + x / length * 12 * step) * Math.exp(-1.35 * step);
      ball.vy = (ball.vy + y / length * 12 * step) * Math.exp(-1.35 * step);
      const speed = Math.max(1, Math.hypot(ball.vx, ball.vy) / 5);
      ball.vx /= speed; ball.vy /= speed;
      ball.x += ball.vx * step; this.collide();
      ball.y += ball.vy * step; this.collide();
      if (this.level.pits.some(pit => Math.hypot(ball.x - pit.x, ball.y - pit.y) < pit.r * .8)) { this.falls++; this.resetBall(); continue; }
      if (Math.hypot(ball.x - this.level.goal.x, ball.y - this.level.goal.y) < .42) this.state = 'finished';
    }
  }

  collide() {
    const b = this.ball, r = MarbleMaze.radius;
    for (const [axis, limit, velocity] of [['x', 5 - r, 'vx'], ['y', 4 - r, 'vy']]) {
      if (Math.abs(b[axis]) > limit) { b[axis] = Math.sign(b[axis]) * limit; b[velocity] *= -.18; }
    }
    for (const wall of this.level.walls) {
      const dx = b.x - Math.max(wall.x - wall.w / 2, Math.min(wall.x + wall.w / 2, b.x));
      const dy = b.y - Math.max(wall.y - wall.h / 2, Math.min(wall.y + wall.h / 2, b.y));
      const distance = Math.hypot(dx, dy);
      if (distance >= r) continue;
      let nx, ny, depth;
      if (distance > 0) { nx = dx / distance; ny = dy / distance; depth = r - distance; }
      else {
        const px = wall.w / 2 - Math.abs(b.x - wall.x), py = wall.h / 2 - Math.abs(b.y - wall.y);
        nx = px < py ? Math.sign(b.x - wall.x) || 1 : 0;
        ny = px < py ? 0 : Math.sign(b.y - wall.y) || 1;
        depth = Math.min(px, py) + r;
      }
      b.x += nx * depth; b.y += ny * depth;
      const impact = b.vx * nx + b.vy * ny;
      if (impact < 0) { b.vx -= 1.18 * impact * nx; b.vy -= 1.18 * impact * ny; }
    }
  }
}

// Accelerometer gravity gives absolute tilt, so holding an angle keeps rolling.
// DualSense axes: X right, Y out of its face, Z toward its handles.
export class MazeTilt {
  constructor() { this.reset(); }
  reset() { this.value = { x: 0, y: 0 }; this.neutral = { x: 0, y: 0 }; this.lastSample = null; }
  recenter() { if (this.lastSample) this.neutral = { ...this.lastSample }; this.value = { x: 0, y: 0 }; }
  sample(acceleration, dt) {
    if (!Array.isArray(acceleration) || acceleration.length !== 3 || !acceleration.every(Number.isFinite) || !Number.isFinite(dt) || dt <= 0 || dt > .1) return this.value;
    const magnitude = Math.hypot(...acceleration);
    if (magnitude < .75 || magnitude > 1.25) return this.value;
    // Specific force points uphill: a raised right handle reports positive X.
    // The marble accelerates downhill, opposite those horizontal components.
    this.lastSample = { x: -acceleration[0] / magnitude, y: -acceleration[2] / magnitude };
    const blend = 1 - Math.exp(-12 * dt);
    for (const axis of ['x', 'y']) {
      const target = Math.max(-1, Math.min(1, (this.lastSample[axis] - this.neutral[axis]) / .45));
      this.value[axis] += ((Math.abs(target) < .035 ? 0 : target) - this.value[axis]) * blend;
    }
    return this.value;
  }
}
