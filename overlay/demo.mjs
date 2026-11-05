// Presses every button and moves both sticks through the bridge, so you can check the overlay.
import { setTimeout as sleep } from 'node:timers/promises';
import { ControllerDeviceInput } from '../controller/controller-device-input.js';

const url = `http://127.0.0.1:${process.env.PORT || 8765}/input`;
const send = async command => {
  const response = await fetch(url, { method: 'POST', body: JSON.stringify(command) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
};

const { overlays } = await send({ release: 'all' });
if (!overlays) console.warn('No overlay page is connected. Open it first, or nothing will light up.');
for (const button of ControllerDeviceInput.buttons) {
  console.log(button);
  await send({ button, hold: 300 });
  await sleep(450);
}
for (const stick of ['left', 'right']) {
  console.log(stick + ' stick');
  await send({ stick, x: 1, y: 0, hold: 500 });
  await sleep(650);
}
