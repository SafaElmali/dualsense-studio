import test from 'node:test';
import assert from 'node:assert/strict';
import { MarbleMaze, MazeTilt, mazeLevels } from '../controller/marble-maze.js';
import { MarbleMazeSession } from '../controller/marble-maze-session.js';
import { GyroInput } from '../controller/gyro-input.js';

const empty = { id: 'test', start: { x: 0, y: 0 }, goal: { x: 4, y: -3 }, walls: [], pits: [] };
function step(game, frames, movement, dt = 1 / 120) { for (let i = 0; i < frames; i++) game.update(dt, movement); }
const near = (actual, expected, tolerance = .001) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('ready, pause, resume and reset preserve the intended timer and ball lifecycle', () => {
  const game = new MarbleMaze(empty);
  step(game, 120, { x: 1, y: 0 }); assert.equal(game.elapsed, 0);
  game.start(); step(game, 120, { x: .3, y: 0 }); near(game.elapsed, 1); assert.ok(game.ball.x > 0);
  game.pause(); const position = game.ball.x; step(game, 120, { x: 1, y: 1 });
  near(game.elapsed, 1); assert.equal(game.ball.x, position); assert.equal(game.ball.vx, 0);
  game.start(); step(game, 120, { x: 0, y: 0 }); near(game.elapsed, 2);
  game.reset(); assert.equal(game.elapsed, 0); assert.equal(game.state, 'ready'); assert.deepEqual(game.ball, { x: 0, y: 0, vx: 0, vy: 0 });
});

test('frame rate does not change physics and long or invalid frames cannot teleport the ball', () => {
  const slow = new MarbleMaze(empty), fast = new MarbleMaze(empty); slow.start(); fast.start();
  step(slow, 60, { x: .2, y: .1 }, 1 / 30); step(fast, 240, { x: .2, y: .1 });
  near(slow.ball.x, fast.ball.x); near(slow.ball.y, fast.ball.y); near(slow.elapsed, fast.elapsed);
  const before = structuredClone(fast.ball), elapsed = fast.elapsed;
  for (const dt of [NaN, Infinity, -1, 0]) fast.update(dt, { x: 1, y: 1 });
  assert.deepEqual(fast.ball, before);
  fast.update(5, { x: 1, y: 1 }); assert.equal(fast.state, 'paused'); assert.equal(fast.elapsed, elapsed); assert.equal(fast.ball.x, before.x);
});

test('ball cannot cross walls or the board edge under sustained maximum tilt', () => {
  const game = new MarbleMaze({ ...empty, walls: [{ x: 1, y: 0, w: .3, h: 8 }] }); game.start();
  step(game, 1200, { x: 1, y: 0 }); assert.ok(game.ball.x <= 1 - .15 - MarbleMaze.radius + .00001);
  game.ball = { x: -4, y: 0, vx: -5, vy: 0 };
  step(game, 1200, { x: -1, y: 0 }); assert.ok(game.ball.x >= -5 + MarbleMaze.radius);
  assert.ok([game.ball.x, game.ball.y, game.ball.vx, game.ball.vy].every(Number.isFinite));
});

test('pit falls return to the start while preserving elapsed time; finish freezes the result', () => {
  const game = new MarbleMaze({ ...empty, pits: [{ x: 1, y: 1, r: .5 }] }); game.start();
  game.elapsed = 5; game.ball.x = 1; game.ball.y = 1; game.update(1 / 120);
  assert.equal(game.falls, 1); assert.equal(game.ball.x, 0); assert.ok(game.elapsed > 5);
  game.ball.x = 4; game.ball.y = -3; game.update(1 / 120); assert.equal(game.state, 'finished');
  const elapsed = game.elapsed; step(game, 120, { x: 1, y: 1 }); assert.equal(game.elapsed, elapsed);
});

test('each shipped course can be completed through its real walls and pits with continuous movement', () => {
  const routes = [
    [[3.3, 3], [3.3, .1], [-3.3, .1], [-3.3, -3], [4, -3]],
    [[2.7, 3], [2.7, .5], [-2.7, .5], [-2.7, -1.45], [2.7, -1.45], [2.7, -3.2], [4, -3]],
    [[-4, -3.3], [-1.25, -3.3], [-1.25, -2.3], [-.7, -2.3], [-.7, 3.3], [1.8, 3.3], [1.8, -3.3], [4, -3]],
  ];
  for (let index = 0; index < mazeLevels.length; index++) {
    const game = new MarbleMaze(mazeLevels[index]); game.start();
    for (const [x, y] of routes[index]) {
      let frames = 0;
      while (game.state === 'playing' && Math.hypot(game.ball.x - x, game.ball.y - y) > .1 && frames++ < 4000) {
        game.update(1 / 120, { x: (x - game.ball.x) * .65 - game.ball.vx * .5, y: (y - game.ball.y) * .65 - game.ball.vy * .5 });
      }
      assert.ok(frames < 4000, `${game.level.name}: unreachable waypoint ${x}, ${y}`);
    }
    assert.equal(game.state, 'finished', game.level.name); assert.equal(game.falls, 0, game.level.name);
  }
});

test('gravity tilt rolls downhill, holds its direction, rejects jolts, and supports a neutral pose', () => {
  const tilt = new MazeTilt();
  for (let i = 0; i < 100; i++) tilt.sample([-.3, Math.sqrt(.91), 0], .01);
  assert.ok(tilt.value.x > .6, 'Right handle lowered should roll right'); near(tilt.value.y, 0);
  tilt.recenter();
  for (let i = 0; i < 100; i++) tilt.sample([-.3, Math.sqrt(.91), 0], .01);
  near(tilt.value.x, 0);
  tilt.reset();
  for (let i = 0; i < 100; i++) tilt.sample([0, Math.sqrt(.91), -.3], .01);
  assert.ok(tilt.value.y > .6, 'Handles lowered should roll toward the bottom of the board');
  const before = { ...tilt.value };
  for (const acceleration of [[0, 0, 0], [2, 0, 0], [NaN, 1, 0], []]) tilt.sample(acceleration, .01);
  assert.deepEqual(tilt.value, before);
});

test('actual USB and Bluetooth motion packets drive maze tilt without output writes and pause cleanly', async () => {
  for (const reportId of [1, 0x31]) {
    const tilt = new MazeTilt(); let outputs = 0;
    const gyro = new GyroInput(sample => tilt.sample(sample.acceleration, sample.dt));
    const device = { addEventListener() {}, removeEventListener() {}, receiveFeatureReport: async () => new DataView(new ArrayBuffer(0)), sendReport: () => outputs++ };
    gyro.attach(device); await gyro.enable();
    const data = new DataView(new ArrayBuffer(reportId === 1 ? 63 : 77)), offset = reportId === 1 ? 0 : 1;
    data.setInt16(offset + 21, -2458, true); data.setInt16(offset + 23, 7815, true);
    for (let i = 0; i < 100; i++) { data.setUint32(offset + 27, i * 30000, true); gyro.onReport({ device, reportId, data }); }
    assert.ok(tilt.value.x > .6); assert.equal(outputs, 0);
    const before = { ...tilt.value }; gyro.setPaused(true); data.setInt16(offset + 21, 2458, true); gyro.onReport({ device, reportId, data });
    assert.deepEqual(tilt.value, before); gyro.attach(null); assert.equal(gyro.enabled, false);
  }
});

test('personal times persist per course and input mode, only improve, and tolerate unavailable storage', () => {
  let stored = '{}'; const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const session = new MarbleMazeSession(storage);
  assert.equal(session.saveBest(), false); session.game.state = 'finished'; session.game.elapsed = 12.4; assert.equal(session.saveBest(), true);
  const next = new MarbleMazeSession(storage); assert.equal(next.best(), 12.4);
  next.game.state = 'finished'; next.game.elapsed = 15; assert.equal(next.saveBest(), false); assert.equal(next.best(), 12.4);
  next.chooseMode('gyro'); assert.equal(next.best(), null); assert.equal(next.game.state, 'ready');
  next.game.state = 'finished'; next.game.elapsed = 11; next.saveBest(); next.chooseLevel(1); assert.equal(next.best(), null);
  next.chooseLevel(0); next.chooseMode('keyboard'); assert.equal(next.best(), 12.4);
  const blocked = new MarbleMazeSession({ getItem() { throw new Error(); }, setItem() { throw new Error(); } });
  blocked.game.state = 'finished'; blocked.game.elapsed = 5; assert.equal(blocked.best(), null); assert.equal(blocked.saveBest(), false);
});

test('held Cross cannot start after connect, reconnect, changing courses, or a focus pause', () => {
  const session = new MarbleMazeSession(); session.chooseMode('stick');
  assert.equal(session.sampleStart(false, false), false);
  assert.equal(session.sampleStart(true, true), false);
  assert.equal(session.sampleStart(true, true), false);
  assert.equal(session.sampleStart(false, true), false);
  assert.equal(session.sampleStart(true, true), true);
  session.sampleStart(false, false); assert.equal(session.sampleStart(true, true), false);
  session.resetInput(); assert.equal(session.sampleStart(true, true), false);
  session.sampleStart(false, true); session.chooseLevel(1); assert.equal(session.sampleStart(true, true), false);
  session.chooseMode('keyboard'); session.sampleStart(false, true); assert.equal(session.sampleStart(true, true), false);
});
