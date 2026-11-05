import { ControllerInput } from '../controller/input-state.js';
import { DualSenseView } from '../controller/controller-view.js';
import { ControllerDeviceInput } from '../controller/controller-device-input.js';
import { RemoteInput } from './remote-input.js';

const params = new URLSearchParams(location.search);
const hex = name => { const value = params.get(name); return /^[\da-f]{6}$/i.test(value || '') ? '#' + value : null; };
const number = (name, fallback) => { const value = Number(params.get(name) ?? NaN); return Number.isFinite(value) ? value : fallback; };

const status = document.getElementById('status');
status.hidden = params.get('debug') !== '1';
const report = text => { status.textContent = text; console.info('[overlay]', text); };

const input = new ControllerInput();
const remote = new RemoteInput(input, { safetyMs: number('safety', 10000) });
const view = new DualSenseView(document.getElementById('controller'), input);

function connectBridge() {
  const socket = new WebSocket(`ws://${location.host}/ws?role=overlay`);
  socket.addEventListener('open', () => report('bridge connected'));
  socket.addEventListener('message', event => { for (const command of JSON.parse(event.data)) remote.apply(command); });
  socket.addEventListener('close', () => {
    report('bridge offline, retrying');
    remote.releaseAll();
    setTimeout(connectBridge, 1000);
  });
}

function connectController() {
  const device = new ControllerDeviceInput(input, { hid: navigator.hid, getGamepads: () => navigator.getGamepads?.() || [] });
  device.connect({ automatic: true }).catch(error => console.info('[overlay] direct controller access unavailable', error));
  view.onRender = () => device.poll();
}

try {
  await view.load();
  view.setFinish(params.get('finish') || 'white');
  view.setView(params.get('view') || 'front');
  view.setZoom(number('zoom', 1));
  view.setHighlight({ color: hex('color'), opacity: params.get('opacity') });
  const light = hex('light');
  if (light) view.setLightColor(light);
  connectBridge();
  if (params.get('physical') !== '0') connectController();
} catch (error) {
  status.hidden = false;
  report('failed to load: ' + error.message);
  console.error(error);
}
