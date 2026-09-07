import { mazeLevels, MazeTilt } from './marble-maze.js';
import { MarbleMazeSession } from './marble-maze-session.js';
import { ControllerInput } from './input-state.js';
import { ControllerDeviceInput } from './controller-device-input.js';
import { GyroInput } from './gyro-input.js';
import { AppEvents } from './app-events.js';

const $ = id => document.getElementById(id);
const analytics = new AppEvents();
const track = action => analytics.featureAction('marble_maze', action);
let storage;
try { storage = localStorage; } catch { /* The game works without saved times. */ }
const session = new MarbleMazeSession(storage), game = session.game;
const tilt = new MazeTilt(), input = new ControllerInput();
const keys = new Set(), pointers = new Map();
let renderer, frame, previousTime = null, lastMotion = -Infinity, connecting = false, disposed = false;
let availability = null, lastState, lastFalls = 0;

const gyro = new GyroInput(sample => {
  lastMotion = performance.now();
  if (session.mode === 'gyro') tilt.sample(sample.acceleration, sample.dt);
});
const source = new ControllerDeviceInput(input, {
  hid: navigator.hid, getGamepads: () => navigator.getGamepads?.() || [],
  onStatus: () => {
    if (gyro.device !== (source.device ?? null)) { gyro.attach(source.device ?? null); lastMotion = -Infinity; tilt.reset(); }
  },
});

function canPlay() {
  if (!renderer || connecting) return false;
  if (session.mode === 'keyboard') return true;
  if (session.mode === 'stick') return ['gamepad', 'direct'].includes(source.state);
  return gyro.enabled && !!gyro.device && performance.now() - lastMotion < 700;
}

function renderConnection() {
  const ready = canPlay(), mode = session.mode;
  $('maze-start').disabled = !ready;
  $('maze-connect').hidden = mode !== 'gyro';
  $('maze-connect').disabled = connecting || !navigator.hid || !isSecureContext;
  $('maze-connect').textContent = connecting ? 'Connecting…' : gyro.enabled && gyro.device ? 'Reconnect gyro' : 'Connect gyro';
  $('maze-center').hidden = mode !== 'gyro'; $('maze-center').disabled = !ready;
  $('maze-pad').hidden = mode !== 'keyboard';
  $('maze-status').textContent = connecting ? 'Select your DualSense in the controller picker.'
    : mode === 'keyboard' ? 'Use arrow keys or the direction buttons below.'
      : mode === 'stick' ? ready ? 'Left stick tilts the board. Cross starts or resumes.' : 'Connect a controller and press a button. You can also choose arrow keys.'
        : !navigator.hid || !isSecureContext ? 'Gyro needs desktop Chrome or Edge on HTTPS or localhost. Arrow keys and sticks are available.'
          : ready ? 'Tilt gently. Hold a comfortable neutral pose and choose Set level position.'
            : gyro.device ? 'Waiting for motion. Move the controller, or reconnect with a USB data cable.' : 'Connect a DualSense to roll with motion.';
  availability = ready;
}

function renderLevels() {
  const nodes = mazeLevels.map((level, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'maze-level';
    button.setAttribute('aria-pressed', String(index === session.levelIndex));
    const name = document.createElement('span'); name.textContent = `${String(index + 1).padStart(2, '0')} · ${level.name}`;
    const best = document.createElement('small'); best.textContent = session.best(index) === null ? '—' : session.best(index).toFixed(2) + 's';
    button.append(name, best); button.addEventListener('click', () => load(index)); return button;
  });
  $('maze-levels').replaceChildren(...nodes);
  $('maze-best').textContent = session.best() === null ? '—' : session.best().toFixed(2) + 's';
}

function renderState() {
  const state = game.state;
  $('maze-overlay').hidden = state === 'playing';
  $('maze-pause').disabled = state !== 'playing';
  $('maze-next').hidden = state !== 'finished' || session.levelIndex === mazeLevels.length - 1;
  $('maze-start').textContent = state === 'paused' ? 'Resume course' : state === 'finished' ? 'Play again' : 'Start rolling';
  $('maze-overlay-label').textContent = `COURSE ${String(session.levelIndex + 1).padStart(2, '0')} / 03`;
  $('maze-overlay-title').textContent = { ready: 'Find your balance.', paused: 'Take a breath.', finished: 'Nicely balanced.' }[state] || '';
  $('maze-overlay-text').textContent = state === 'finished' ? `${game.elapsed.toFixed(2)} seconds · ${game.falls} ${game.falls === 1 ? 'fall' : 'falls'}. Try again to beat your time.`
    : state === 'paused' ? 'Your run is paused. Resume when you are ready.' : 'Roll the marble into the gold ring. Small movements give you more control.';
  lastState = state; renderConnection();
}

function clearControls() { keys.clear(); pointers.clear(); session.resetInput(); }
function load(index) {
  clearControls(); session.chooseLevel(index); renderer?.load(game.level); previousTime = null; lastFalls = 0;
  $('maze-course').textContent = game.level.name; $('maze-hint').textContent = game.level.hint;
  $('maze-announcement').textContent = ''; renderLevels(); renderState();
}
function pause(message = '') {
  const playing = game.state === 'playing'; game.pause(); clearControls(); previousTime = null;
  if (playing) { renderState(); track('paused'); }
  if (message && playing) $('maze-announcement').textContent = message;
}
function start() {
  if (!canPlay() || document.hidden || !document.hasFocus()) return;
  if (game.state === 'finished') game.reset();
  const resumed = game.state === 'paused';
  game.start(); previousTime = null; lastFalls = game.falls;
  $('maze-announcement').textContent = ''; renderState(); $('maze-canvas').focus({ preventScroll: true });
  track(resumed ? 'resumed' : 'started');
}

async function connect() {
  if (connecting || !navigator.hid || !isSecureContext) return;
  pause(); connecting = true; renderConnection(); track('connect_requested');
  let timer;
  try {
    if (source.device) await source.disconnect();
    const connected = await Promise.race([
      source.connect(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Connection timed out. Try a USB data cable.')), 15000); }),
    ]);
    clearTimeout(timer);
    if (!connected || disposed) { if (!disposed) $('maze-announcement').textContent = 'No controller selected. You can try again or use arrow keys.'; return; }
    gyro.attach(source.device); tilt.reset(); lastMotion = -Infinity;
    if (session.mode === 'gyro') { await gyro.enable(); gyro.setPaused(document.hidden || !document.hasFocus()); }
    if (!disposed) $('maze-announcement').textContent = 'Hold the controller face up, then choose Set level position.';
  } catch (error) {
    await source.disconnect();
    if (!disposed) $('maze-announcement').textContent = error.name === 'NotAllowedError' ? 'Controller access was not granted. Try again or choose arrow keys.' : 'Could not connect gyro. Close other controller tools and try a USB data cable.';
  } finally { clearTimeout(timer); connecting = false; if (!disposed) renderConnection(); }
}

$('maze-start').addEventListener('click', start);
$('maze-pause').addEventListener('click', () => pause());
$('maze-restart').addEventListener('click', () => { load(session.levelIndex); track('restarted'); });
$('maze-next').addEventListener('click', () => load(session.levelIndex + 1));
$('maze-connect').addEventListener('click', connect);
$('maze-center').addEventListener('click', () => {
  if (!canPlay()) return;
  pause(); tilt.recenter(); $('maze-announcement').textContent = 'Level position set. Resume when you are ready.'; track('centered');
});
$('maze-input').addEventListener('change', async event => {
  session.chooseMode(event.target.value); clearControls(); tilt.reset(); lastMotion = -Infinity;
  gyro.setEnabled(false); previousTime = null; renderLevels(); renderState(); track('input_changed');
  if (session.mode === 'gyro' && source.device) await gyro.enable();
  if (!disposed) renderConnection();
});

const directions = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
window.addEventListener('keydown', event => {
  if (event.target.closest?.('input,select,textarea,button,a,summary,nav') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Escape') { event.preventDefault(); pause(); return; }
  if (session.mode !== 'keyboard' || !directions[event.code]) return;
  event.preventDefault(); keys.add(directions[event.code]);
});
window.addEventListener('keyup', event => { if (directions[event.code]) keys.delete(directions[event.code]); });
for (const button of document.querySelectorAll('[data-direction]')) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || session.mode !== 'keyboard') return;
    event.preventDefault(); button.setPointerCapture(event.pointerId); pointers.set(event.pointerId, button.dataset.direction);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, event => pointers.delete(event.pointerId));
  button.addEventListener('keydown', event => {
    if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); keys.add(button.dataset.direction); }
  });
  button.addEventListener('keyup', event => { if (['Space', 'Enter'].includes(event.code)) keys.delete(button.dataset.direction); });
  button.addEventListener('blur', () => keys.delete(button.dataset.direction));
}

function background() { pause('Paused while you were away.'); gyro.setPaused(true); lastMotion = -Infinity; }
window.addEventListener('blur', background);
window.addEventListener('focus', () => { gyro.setPaused(document.hidden); previousTime = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) background(); else { gyro.setPaused(!document.hasFocus()); previousTime = null; } });
$('maze-canvas').addEventListener('webglcontextlost', event => {
  event.preventDefault(); pause(); $('maze-start').disabled = true;
  $('maze-announcement').textContent = 'The 3D view was interrupted. Reload the page to play again.';
  cancelAnimationFrame(frame);
});

function tick(time) {
  if (disposed) return;
  frame = requestAnimationFrame(tick);
  if (document.hidden || !document.hasFocus()) { previousTime = null; return; }
  source.poll();
  const ready = canPlay();
  if (ready !== availability) renderConnection();
  if (!ready && game.state === 'playing') pause('Controller input stopped. Reconnect or change controls, then start when you are ready.');
  const cross = input.button('cross') > .5;
  if (session.sampleStart(cross, ready) && game.state !== 'playing') start();
  const held = new Set([...keys, ...pointers.values()]);
  const movement = session.mode === 'gyro' ? tilt.value : session.mode === 'stick' ? input.axis('left') : { x: Number(held.has('right')) - Number(held.has('left')), y: Number(held.has('down')) - Number(held.has('up')) };
  const before = game.state;
  game.update(previousTime === null ? 0 : (time - previousTime) / 1000, movement); previousTime = time;
  if (game.falls !== lastFalls) { lastFalls = game.falls; $('maze-announcement').textContent = `Back to the start. ${game.falls} ${game.falls === 1 ? 'fall' : 'falls'} so far.`; }
  if (game.state === 'finished' && before !== 'finished') {
    const saved = session.saveBest(); renderLevels();
    $('maze-announcement').textContent = saved ? `New best: ${game.elapsed.toFixed(2)} seconds!` : `Course complete in ${game.elapsed.toFixed(2)} seconds.`;
    track('completed');
    $('maze-start').focus({ preventScroll: true });
  }
  if (game.state !== lastState) renderState();
  $('maze-time').textContent = game.elapsed.toFixed(2) + 's'; $('maze-falls').textContent = String(game.falls);
  renderer?.render(game, game.state === 'playing' ? movement : { x: 0, y: 0 });
}

load(0); track('opened');
window.addEventListener('pagehide', () => { disposed = true; pause(); cancelAnimationFrame(frame); gyro.attach(null); void source.dispose(); renderer?.dispose(); }, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
try {
  const { MarbleMazeRenderer } = await import('./marble-maze-renderer.js');
  if (!disposed) { renderer = new MarbleMazeRenderer($('maze-canvas')); renderer.load(game.level); renderConnection(); frame = requestAnimationFrame(tick); }
} catch {
  $('maze-overlay-title').textContent = '3D is unavailable.';
  $('maze-overlay-text').textContent = 'Enable WebGL in your browser and reload to play the maze.';
  $('maze-start').disabled = true; $('maze-start').textContent = 'Reload to play';
}
