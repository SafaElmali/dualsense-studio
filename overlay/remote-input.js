// Code-driven input for the OBS overlay. Shared by the bridge (validation) and the page (applying).
import { ControllerDeviceInput } from '../controller/controller-device-input.js';

export const REMOTE_SOURCE = 'remote';
const BUTTONS = new Set(ControllerDeviceInput.buttons);
const MAX_COMMANDS = 64;

const unit = (value, label, min) => {
  if (!Number.isFinite(value) || value < min || value > 1) throw new TypeError(`${label} must be a number from ${min} to 1`);
  return value;
};
const holdOf = ({ hold }) => {
  if (hold === undefined) return undefined;
  if (!Number.isFinite(hold) || hold <= 0) throw new TypeError('hold must be a positive number of milliseconds');
  return hold;
};

function parseCommand(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) throw new TypeError('each command must be an object');
  if (message.release !== undefined) {
    if (message.release !== 'all') throw new TypeError('release only accepts "all"');
    return { type: 'release' };
  }
  if (message.button !== undefined) {
    if (!BUTTONS.has(message.button)) throw new TypeError(`unknown button "${message.button}"; use one of: ${[...BUTTONS].join(', ')}`);
    return { type: 'button', id: message.button, value: unit(message.value ?? 1, 'value', 0), hold: holdOf(message) };
  }
  if (message.stick !== undefined) {
    if (message.stick !== 'left' && message.stick !== 'right') throw new TypeError('stick must be "left" or "right"');
    return { type: 'stick', side: message.stick, x: unit(message.x ?? 0, 'x', -1), y: unit(message.y ?? 0, 'y', -1), hold: holdOf(message) };
  }
  throw new TypeError('a command needs "button", "stick" or "release"');
}

// Accepts one command or an array of commands. Throws TypeError with a sender-facing message.
export function parseCommands(payload) {
  const list = Array.isArray(payload) ? payload : [payload];
  if (list.length > MAX_COMMANDS) throw new TypeError(`at most ${MAX_COMMANDS} commands per message`);
  return list.map(parseCommand);
}

export class RemoteInput {
  // safetyMs releases a press whose release never arrives; 0 disables it. Re-sending a press restarts the timer.
  constructor(input, { safetyMs = 10000 } = {}) {
    Object.assign(this, { input, safetyMs });
    this.timers = new Map();
  }

  schedule(key, hold, release) {
    this.cancel(key);
    const delay = hold ?? this.safetyMs;
    if (delay > 0) this.timers.set(key, setTimeout(() => { this.timers.delete(key); release(); }, delay));
  }

  cancel(key) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }

  apply(command) {
    if (command.type === 'release') return this.releaseAll();
    if (command.type === 'button') {
      const key = 'button:' + command.id;
      this.input.setButton(command.id, REMOTE_SOURCE, command.value);
      if (command.value > 0) this.schedule(key, command.hold, () => this.input.setButton(command.id, REMOTE_SOURCE, 0));
      else this.cancel(key);
      return;
    }
    const key = 'stick:' + command.side;
    if (command.x || command.y) {
      this.input.setAxis(command.side, REMOTE_SOURCE, command.x, command.y);
      this.schedule(key, command.hold, () => this.input.releaseAxis(command.side, REMOTE_SOURCE));
    } else {
      this.input.releaseAxis(command.side, REMOTE_SOURCE);
      this.cancel(key);
    }
  }

  releaseAll() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.input.releaseSource(REMOTE_SOURCE);
  }
}
