import { CommunityShareView } from './community-share-view.js';
import { StickArrowControls } from './stick-arrow-controls.js';
import { SupportView } from './support-view.js?v=support-2';
import { supportUrls } from './support-config.js?v=coffee-only-1';
import { DualSenseView } from './controller-view.js?v=performance-1';
import { ControllerInput } from './input-state.js';
import { InputCamera } from './input-camera.js';
import { StreamerInput } from './streamer-input.js';
import { StreamerDemo } from './streamer-demo.js?v=feature-events-1';
import { StreamerSettings } from './streamer-settings.js?v=arrow-controls-2';
import { StreamerRotation } from './streamer-rotation.js';
import { AppEvents } from './app-events.js';
import { StreamerShowcaseView } from './streamer-showcase.js?v=channel-profiles-1';
import { StreamerBuilderView } from './streamer-builder-view.js?v=builder-2';

const $ = id => document.getElementById(id);
const capture = document.body.classList.contains('streamer-overlay');
const surface = capture ? 'capture' : 'builder';
const analytics = new AppEvents();
analytics.trackPage(document, surface);
if (!capture) new StreamerShowcaseView($('streamer-showcase'), {
  trackLink: (link, onOpen) => analytics.trackLink(link, onOpen),
  onAction: (action, properties) => analytics.featureAction('streamer_showcase', action, { ...properties, surface }),
});
document.querySelectorAll('[data-support]').forEach(root => {
  new SupportView(root, { urls: supportUrls, onOpen: provider => analytics.featureAction('support', 'clicked', { surface, provider }) });
});
const track = (action, properties = {}) => analytics.featureAction('streamer', action, { ...properties, surface });
const form = $('streamer-settings');
let arrowControls, builder;
let settings = StreamerSettings.read(location.search);
if (!capture) new CommunityShareView(document, { getSettings: () => settings, onAction: action => analytics.featureAction('community_gallery', action) });
let view, frame, disposed = false;
const inputCamera = new InputCamera(angle => {
  if (view?.ready) view.setView(angle, { resetZoom: false });
});
const stage = $(capture ? 'capture-stage' : 'preview-stage');
const canvas = $('streamer-canvas');
const rotation = new StreamerRotation({
  onChange: angles => {
    settings = StreamerSettings.normalize({ ...settings, ...angles, camera: 'custom' });
    inputCamera.setEnabled(false);
    view.pose = StreamerRotation.toPose(settings);
    if (form) { fillSettings(); renderCameraControls(); }
    updateLinks();
  },
  onCommit: () => {
    saveSettings();
    builder?.render(settings);
    track('camera_rotated');
  },
});
canvas.addEventListener('pointerdown', event => {
  if (!view?.ready || event.button !== 0 || event.isPrimary === false) return;
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  if (!rotation.start(event.pointerId, event.clientX, event.clientY, view.pose, size, event.shiftKey)) return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('rotating');
});
canvas.addEventListener('pointermove', event => rotation.move(event.pointerId, event.clientX, event.clientY));
function finishRotation(event) {
  if (event && rotation.gesture?.id !== event.pointerId) return;
  const id = rotation.gesture?.id;
  rotation.end(id);
  if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  canvas.classList.remove('rotating');
}
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, finishRotation);
window.addEventListener('blur', () => finishRotation());
const triggerDisplay = document.createElement('div');
triggerDisplay.className = 'overlay-triggers';
triggerDisplay.setAttribute('aria-label', 'Live trigger pressure');
triggerDisplay.innerHTML = ['l2', 'r2'].map(id => `<div class="overlay-trigger" data-trigger="${id}"><span>${id.toUpperCase()}</span><meter min="0" max="1" value="0" aria-label="${id === 'l2' ? 'Left' : 'Right'} trigger pressure"></meter><output aria-live="off">0%</output></div>`).join('');
$(capture ? 'capture-stage' : 'preview-controller').append(triggerDisplay);
const triggerDisplays = new Map([...triggerDisplay.children].map(element => [element.dataset.trigger, element]));
const input = new ControllerInput(event => {
  inputCamera.observe(event);
  if (event.type === 'button' && triggerDisplays.has(event.id)) {
    const display = triggerDisplays.get(event.id);
    display.querySelector('meter').value = event.value;
    display.querySelector('output').textContent = `${Math.round(event.value * 100)}%`;
    display.classList.toggle('active', event.value > .05);
  }
  if (capture) return;
  if (event.type === 'button') {
    $('preview-l2').value = input.button('l2');
    $('preview-r2').value = input.button('r2');
  }
  const pressed = [...input.buttons.keys()].filter(id => input.button(id) > .05);
  const moving = ['left', 'right'].find(side => Math.hypot(input.axis(side).x, input.axis(side).y) > .1);
  $('preview-input').textContent = pressed.length ? pressed.slice(0, 3).join(' + ').toUpperCase() : moving ? `${moving === 'left' ? 'Left' : 'Right'} stick` : 'Waiting for input';
});

const demo = new StreamerDemo(input, {
  onChange: (active, reason) => {
    track(active ? 'demo_started' : 'demo_stopped', { reason });
    $('demo').setAttribute('aria-pressed', String(active));
    if (capture) {
      $('demo').textContent = active ? '■ Stop preview' : 'Preview without a controller';
      $('stop-demo').hidden = !active;
    } else {
      $('demo-label').textContent = active ? 'Stop demo' : 'Try demo';
      $('demo-symbol').textContent = active ? '■' : '▷';
    }
  },
});

const source = new StreamerInput(input, {
  hid: navigator.hid,
  getGamepads: () => navigator.getGamepads?.() || [],
  onTouch: contacts => view?.setTouchContacts('hardware', contacts),
  onStatus: state => {
    const connected = ['gamepad', 'direct'].includes(state);
    $('input-status').dataset.connected = String(connected);
    $('input-status').textContent = {
      waiting: 'Press a button on your controller', gamepad: 'Controller input is live', direct: 'Direct input is live',
      'waiting-direct': 'Connected · waiting for input', blocked: 'Controller access is unavailable here', unsupported: 'Choose a controller with a standard layout',
    }[state];
    track('input_state_changed', { status: state });
    if (connected) track('input_connected', { input_mode: state });
    $('demo').disabled = connected || state === 'waiting-direct';
    if ($('demo').disabled) demo.stop('live_input');
    if (!capture) $('demo-note').textContent = $('demo').disabled ? 'Controller connected' : 'No controller needed';
    builder?.setInputState(state);
    if (capture) {
      $('connect-direct').textContent = source.device ? 'Disconnect direct input' : 'Connect DualSense';
      $('touch-capability').textContent = state === 'direct' ? 'Touchpad finger tracking is connected. Slide a finger without pressing down.' : 'Normal controller input includes the touchpad click. For finger tracking, use Connect DualSense in a Chrome or Edge capture window.';
    }
  },
});

function applySettings() {
  source.slot = settings.slot;
  triggerDisplay.hidden = settings.triggerMeters === 'hide';
  $('trigger-meters').checked = settings.triggerMeters === 'show';
  inputCamera.setEnabled(settings.camera === 'auto');
  if (view?.ready) {
    if (settings.camera === 'custom') view.pose = StreamerRotation.toPose(settings);
    // Streamers need both face inputs and the trigger caps visible at rest.
    else if (settings.camera === 'angle') view.pose = StreamerRotation.toPose({ pitch: 40, yaw: -4, roll: 0 });
    else if (!inputCamera.enabled) view.setView(settings.camera, { resetZoom: false });
    view.zoom = .88 * settings.scale / 100;
    view.resize();
    view.setBodyColor(settings.body);
    view.setLightColor(settings.light);
    view.setHighlight({ color: settings.highlight, opacity: settings.highlightOpacity });
    view.setStickArrows(settings);
  }
  stage.style.backgroundColor = StreamerSettings.background(settings);
  stage.style.setProperty('--input-highlight', settings.highlight);
  updateLinks();
  if (capture) return;
  document.querySelectorAll('.preview-trigger').forEach(element => { element.hidden = settings.triggerMeters === 'show'; });
  arrowControls.render(settings);
  renderCameraControls();
  stage.classList.toggle('checker', settings.background === 'transparent');
  if (settings.background === 'transparent') stage.style.removeProperty('background-color');
  $('scale-value').value = `${settings.scale}%`;
  $('highlight-opacity-value').value = `${settings.highlightOpacity}%`;
  $('background-label').textContent = { transparent: 'TRANSPARENT BACKGROUND', green: 'GREEN CHROMA KEY', blue: 'BLUE CHROMA KEY', solid: 'CUSTOM BACKGROUND' }[settings.background];
  $('custom-background').hidden = settings.background !== 'solid';
  $('custom-background-swatch').style.background = settings.color;
  builder?.render(settings);
}

function updateLinks() {
  if (capture) $('edit-overlay').href = new URL(`streamer.html?${StreamerSettings.query(settings)}`, location.href).href;
  else {
    const exported = builder?.exportSettings() ?? settings;
    $('overlay-url').value = builder?.exportURL(location.href) ?? StreamerSettings.url(location.href, exported);
    $('open-capture').href = StreamerSettings.url(location.href, exported, { setup: true });
  }
}

function saveSettings() {
  history.replaceState(null, '', '?' + StreamerSettings.query(settings) + location.hash);
}

function renderCameraControls() {
  $('custom-camera').hidden = settings.camera !== 'custom';
  for (const axis of ['pitch', 'yaw', 'roll']) $(axis + '-value').value = `${settings[axis]}°`;
}

function fillSettings() {
  for (const element of form.elements) {
    if (!element.name || !(element.name in settings)) continue;
    if (element.type === 'radio') element.checked = element.value === settings[element.name];
    else if (element.type === 'checkbox') element.checked = settings[element.name] === 'show';
    else element.value = settings[element.name];
  }
}

if (capture) {
  track('capture_loaded');
  $('trigger-meters').addEventListener('change', () => {
    settings = StreamerSettings.normalize({ ...settings, triggerMeters: $('trigger-meters').checked ? 'show' : 'hide' });
    applySettings();
    saveSettings();
    analytics.streamerSettingChanged('triggerMeters', settings.triggerMeters, surface);
  });
  const panel = $('capture-setup');
  const showSetup = show => {
    if (panel.hidden === !show) return;
    track(show ? 'setup_opened' : 'setup_closed');
    panel.hidden = !show;
    if (show) $('hide-capture-setup').focus();
    else $('streamer-canvas').focus({ preventScroll: true });
  };
  panel.hidden = location.hash !== '#setup';
  analytics.trackLink($('edit-overlay'), () => track('editor_opened'));
  $('hide-capture-setup').addEventListener('click', () => showSetup(false));
  $('stop-demo').addEventListener('click', () => demo.stop());
  $('streamer-canvas').addEventListener('dblclick', () => showSetup(true));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); showSetup(panel.hidden); } });
  if (!navigator.hid || !isSecureContext) {
    $('connect-direct').disabled = true;
    $('direct-status').textContent = 'Direct connection needs desktop Chrome or Edge on HTTPS or localhost. OBS Browser Source uses normal controller input instead.';
  } else {
    $('connect-direct').addEventListener('click', async () => {
      const button = $('connect-direct');
      button.disabled = true;
      try {
        if (source.device) { await source.disconnect(); track('disconnected'); $('direct-status').textContent = 'Direct connection closed. Normal browser input is available.'; return; }
        track('connect_requested');
        const connected = await source.connect();
        track(connected ? 'connect_succeeded' : 'connect_cancelled');
        $('direct-status').textContent = connected ? 'Move the sticks to check live input, then hide setup. If input stays unavailable over Bluetooth, use a USB data cable.' : 'No direct connection was made. If no device picker appeared, copy this page’s address into desktop Chrome or Edge and try again. Normal controller input may still work.';
      } catch (error) {
        track(error.name === 'NotAllowedError' ? 'connect_cancelled' : 'connect_failed');
        $('direct-status').textContent = 'Could not open the controller. Close other controller tools, check the cable, and try again.';
      } finally { button.disabled = false; button.textContent = source.device ? 'Disconnect direct input' : 'Connect DualSense'; }
    });
    const reconnect = () => {
      if (!disposed && !source.device) void source.connect({ automatic: true })
        .then(connected => { if (connected && !disposed) track('reconnect_succeeded'); })
        .catch(() => { if (!disposed) track('reconnect_failed'); });
    };
    navigator.hid.addEventListener('connect', reconnect);
    window.addEventListener('pagehide', () => navigator.hid.removeEventListener('connect', reconnect), { once: true });
    reconnect();
  }
} else {
  track('opened');
  const tabs = [...form.querySelectorAll('[role="tab"]')];
  const selectTab = tab => {
    if (tab.getAttribute('aria-selected') === 'true') return;
    for (const button of tabs) {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      $(button.getAttribute('aria-controls')).hidden = !selected;
    }
    track('tab_selected', { tab: tab.dataset.settingsTab });
  };
  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next);
      next.focus();
    });
  }
  const applyArrows = values => {
    settings = StreamerSettings.normalize({ ...settings, ...values });
    applySettings();
    if (settings.stickArrows === 'show') view?.previewStickArrows();
  };
  arrowControls = new StickArrowControls($('streamer-arrows'), {
    onInput: applyArrows,
    onChange: (values, setting) => { applyArrows(values); saveSettings(); analytics.streamerSettingChanged(setting, settings[setting], surface); },
    onPreview: () => { stage.scrollIntoView({ block: 'center', behavior: 'instant' }); view?.previewStickArrows(); track('arrows_previewed'); },
  });
  fillSettings();
  builder = new StreamerBuilderView(document, {
    getSettings: () => settings,
    onApply: next => { settings = StreamerSettings.normalize(next); fillSettings(); applySettings(); saveSettings(); },
    onExportChange: updateLinks,
    onAction: track,
  });
  builder.setInputState(source.state);
  updateLinks();
  const autoCamera = form.querySelector('.camera-auto');
  for (const event of ['pointerenter', 'focusin']) autoCamera.addEventListener(event, () => {
    autoCamera.removeAttribute('data-tooltip-dismissed');
    track('camera_help_viewed');
  });
  document.addEventListener('pointerdown', event => {
    if (!autoCamera.contains(event.target)) autoCamera.setAttribute('data-tooltip-dismissed', '');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') autoCamera.setAttribute('data-tooltip-dismissed', '');
  });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    const next = StreamerSettings.normalize({ ...settings, ...Object.fromEntries(new FormData(form)), triggerMeters: $('trigger-meters').checked ? 'show' : 'hide' });
    if (next.camera === 'custom' && settings.camera !== 'custom' && view?.ready) Object.assign(next, StreamerRotation.fromPose(view.pose));
    settings = next;
    fillSettings();
    applySettings();
    if (['highlight', 'highlightOpacity'].includes(event.target.name)) view?.previewHighlights();
  });
  $('preview-highlight').addEventListener('click', () => {
    stage.scrollIntoView({ block: 'center', behavior: 'instant' });
    view?.previewHighlights();
    track('highlight_previewed');
  });
  form.addEventListener('change', event => {
    saveSettings();
    analytics.streamerSettingChanged(event.target.name, settings[event.target.name], surface);
  });
  $('reset-settings').addEventListener('click', () => builder.reset());
  $('overlay-url').addEventListener('copy', () => track('link_copied', { method: 'manual' }));
  // Use normal page navigation: embedded popup windows can suppress the HID picker.
  analytics.trackLink($('open-capture'), () => track('capture_opened'));
}

const copyToast = $('copy-toast');
let copyToastTimeout;
function clearCopyToast() {
  clearTimeout(copyToastTimeout);
  copyToast.textContent = '';
}
window.addEventListener('pagehide', clearCopyToast);
$('obs-dialog')?.addEventListener('close', clearCopyToast);

$('copy-overlay').addEventListener('click', async () => {
  clearCopyToast();
  $('export-status').textContent = '';
  const link = builder?.exportURL(location.href) ?? StreamerSettings.url(location.href, settings);
  try {
    await navigator.clipboard.writeText(link);
    copyToast.textContent = builder?.obsMethod === 'window' ? 'Capture link copied' : 'OBS link copied';
    copyToastTimeout = setTimeout(clearCopyToast, 4000);
    track('link_copied', { method: 'clipboard' });
  } catch {
    if (capture) $('export-status').textContent = `Copy this OBS link: ${link}`;
    else {
      $('overlay-url').focus(); $('overlay-url').select();
      $('export-status').textContent = 'Select and copy the overlay link below.';
    }
    track('copy_failed');
  }
});

$('demo').addEventListener('click', () => {
  if (demo.active) { demo.stop(); return; }
  source.poll();
  if ($('demo').disabled) return;
  demo.start({ loop: capture });
  if (capture) {
    $('capture-setup').hidden = true;
    $('streamer-canvas').focus({ preventScroll: true });
  }
});

applySettings();
try {
  view = new DualSenseView($('streamer-canvas'), input);
  await view.load();
  if (!disposed) { applySettings(); $('model-status').hidden = true; track('model_loaded'); }
} catch {
  track('model_failed');
  $('model-status').textContent = 'The 3D model could not load. Reload this page with WebGL enabled.';
  if (capture) $('capture-setup').hidden = false;
}

function tick(time) {
  if (disposed) return;
  source.poll();
  demo.update(time, { liveInput: ['gamepad', 'direct', 'waiting-direct'].includes(source.state) });
  frame = requestAnimationFrame(tick);
}
frame = requestAnimationFrame(tick);
window.addEventListener('gamepaddisconnected', () => { source.clear(); source.poll(); });
window.addEventListener('pagehide', () => { finishRotation(); disposed = true; demo.stop('closed'); cancelAnimationFrame(frame); void source.dispose(); view?.dispose(); }, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
