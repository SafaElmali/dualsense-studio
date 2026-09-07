// Counts feature reach once per page visit and deliberate actions as they happen.
// Never sends raw input streams.
export class ControllerAnalytics {
  static featureActions = {
help: { opened: ['surface', 'topic'] },
navigation: { clicked: ['surface', 'destination', 'placement'] },
support: { clicked: ['surface', 'provider'] },
touchpad_drawing: { color_changed: [], connect_requested: [], connect_succeeded: [], connect_cancelled: [], connect_failed: [], opened: [], started: ['input_source'], cleared: [], exported: [], export_failed: [] },
trigger_presets: { opened: [], changed: ['mode', 'strength', 'speed_hz'], reset: ['mode'], link_created: ['mode', 'strength', 'speed_hz'], link_copied: ['mode', 'strength', 'speed_hz'], copy_failed: ['mode'], loaded: ['mode', 'strength', 'speed_hz'] },
diagnostics: { opened: [], connected: [], measurement_started: [], measurement_completed: [], reset: [] },
target_practice: { opened: ['connected'], controller_required: [], controller_connection_changed: ['connected'], start_requested: ['mode'], ranking_unavailable: [], started: ['mode'], paused: ['reason'], resumed: [], closed: ['state'], weapon_changed: ['mode'], setup_opened: [], gyro_used: [], completed: ['score', 'hits', 'shots', 'weapons'] },
trigger_effects: { connect_requested: ['surface'], enabled: ['surface'], connect_cancelled: ['surface'], connect_failed: ['surface'], disabled: ['surface'] },
viewer: { camera_selected: ['camera'], auto_changed: ['enabled'], sound_changed: ['enabled'], reset: [], controls_opened: [], model_failed: [] },
touchpad: { connect_requested: [], connect_cancelled: [], connect_failed: [], enabled: [], disabled: [], tracking_started: ['input_source'], highlighted: ['source'], reconnected: [], reconnect_failed: [] },
gyro: { connect_requested: [], connect_cancelled: [], connect_failed: [], enabled: [], disabled: [], recenter_started: [], recentered: [], recenter_failed: [], recenter_cancelled: [] },
battery: { details_opened: [], connect_requested: [], connect_succeeded: [], connect_cancelled: [], connect_failed: [], reading_available: [] },
appearance: { arrows_changed: ['setting', 'enabled', 'size', 'color_mode'], arrows_previewed: [], opened: ['target'], tab_selected: ['target'], changed: ['target', 'method'], opacity_changed: ['target', 'opacity'], previewed: ['target'], reset: ['target'], sync_requested: [], sync_enabled: [], sync_disabled: [], sync_cancelled: [], sync_failed: ['stage'] },
leaderboard: { opened: [], refreshed: [], loaded: [], load_failed: [], personal_rank_clicked: [], submit_requested: [], submitted: ['score'], submit_failed: [] },
scorecard: { exported: ['score', 'hits', 'shots', 'weapons'], export_failed: [] }
};
  // Background discoveries and asynchronous outcomes do not extend active time.
  // User-initiated connection attempts are counted by their requested events.
  static passiveEvents = new Set(['controller_target_practice_controller_required', 'controller_target_practice_controller_connection_changed', 'controller_target_practice_ranking_unavailable', 'controller_target_practice_closed', 'controller_leaderboard_loaded', 'controller_leaderboard_load_failed', 'controller_leaderboard_submitted', 'controller_leaderboard_submit_failed', 'controller_touchpad_drawing_connect_succeeded', 'controller_touchpad_drawing_connect_cancelled', 'controller_touchpad_drawing_connect_failed', 'controller_touchpad_connect_cancelled', 'controller_touchpad_connect_failed', 'controller_gyro_connect_cancelled', 'controller_gyro_connect_failed', 'controller_gyro_recentered', 'controller_gyro_recenter_failed', 'controller_gyro_recenter_cancelled', 'controller_trigger_effects_enabled', 'controller_trigger_effects_connect_cancelled', 'controller_trigger_effects_connect_failed', 'controller_viewer_model_failed', 'controller_trigger_presets_loaded', 'controller_touchpad_reconnected', 'controller_touchpad_reconnect_failed', 'controller_battery_reading_available', 'controller_battery_connect_succeeded', 'controller_battery_connect_cancelled', 'controller_battery_connect_failed', 'controller_appearance_sync_enabled', 'controller_appearance_sync_cancelled', 'controller_appearance_sync_failed']);
  static onceEvents = new Set(['controller_target_practice_gyro_used', 'controller_diagnostics_connected', 'controller_battery_reading_available', 'controller_touchpad_reconnected', 'controller_touchpad_reconnect_failed']);

  static propertyValues = {
topic: ["connection","stick_drift","device_access","virtual_controller","compatibility","independence","pricing","stick_arrows"],
destination: ['studio', 'streamer', 'obs_setup', 'x'],
placement: ['brand', 'header', 'intro', 'help'],
provider: ['patreon', 'buymeacoffee'],
surface: ["studio","target_practice"],
setting: ["stickArrows","arrowSize","arrowColor"],
camera: ["auto","front","angle","back"],
color_mode: ['auto', 'custom'],
state: ['ready', 'playing', 'paused', 'finished'],
reason: ['user', 'completed', 'live_input', 'page_hidden', 'page_blur', 'disconnected', 'closed', 'leaderboard', 'gyro_recenter', 'restarted']
};

  constructor(capture = () => {}, now = () => performance.now()) {
    this.capture = capture;
    this.now = now;
    this.seen = new Set();
    this.lastActivity = null;
    this.lastSample = now();
    this.activeMilliseconds = 0;
  }

  send(event, properties = {}) {
    try { this.capture(event, properties); } catch { /* Analytics must not interrupt the controller. */ }
  }

  once(event, properties = {}, key = event) {
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.send(event, properties);
  }

  interact(kind) {
    this.sample();
    this.lastActivity = this.now();
    this.once('controller_interacted', { interaction: kind });
    this.once('controller_feature_used', { feature: kind }, 'feature:' + kind);
  }

  finish(value) {
    this.interact('finish');
    this.once('controller_finish_selected', { finish: value }, 'finish:' + value);
  }

  featureAction(feature, action, properties = {}) {
    if (!Object.hasOwn(ControllerAnalytics.featureActions, feature)) return;
    const actions = ControllerAnalytics.featureActions[feature];
    if (!Object.hasOwn(actions, action)) return;
    // Only the explicitly listed properties leave the browser. Do not forward
    // model objects, device IDs, URLs, artwork, or input coordinates.
    const payload = {};
    for (const key of actions[action]) {
      const value = properties[key];
      if (key === 'weapons' && Array.isArray(value)) payload.weapons = value.filter(mode => ['shooting', 'shotgun', 'lmg', 'smg'].includes(mode));
      else if (key === 'mode' && ['shooting', 'shotgun', 'lmg', 'smg', 'resistance'].includes(value)) payload.mode = value;
      else if (key === 'input_source' && ['hardware', 'pointer'].includes(value)) payload.input_source = value;
      else if (key === 'target' && ['picker', 'light', 'body', 'highlight'].includes(value)) payload.target = value;
      else if (key === 'method' && ['preset', 'picker', 'hex', 'clipboard', 'manual'].includes(value)) payload.method = value;
      else if (key === 'source' && ['toolbar', 'button'].includes(value)) payload.source = value;
      else if (key === 'stage' && ['connection', 'write'].includes(value)) payload.stage = value;
      else if (ControllerAnalytics.propertyValues[key]?.includes(value)) payload[key] = value;
      else if (['enabled', 'connected'].includes(key) && typeof value === 'boolean') payload[key] = value;
      else if (key === 'opacity' && Number.isInteger(value) && value >= 0 && value <= 100) payload[key] = value;
      else if (key === 'size' && Number.isInteger(value) && value >= 50 && value <= 150) payload[key] = value;
      else if (key === 'scale' && Number.isInteger(value) && value >= 60 && value <= 120) payload[key] = value;
      else if (['score', 'hits', 'shots', 'strength', 'speed_hz'].includes(key) && Number.isFinite(value)) payload[key] = value;
    }
    if (Number.isFinite(payload.hits) && Number.isFinite(payload.shots)) payload.accuracy = payload.shots ? Math.round(payload.hits / payload.shots * 100) : 0;
    const event = `controller_${feature}_${action}`;
    const automaticStop = feature === 'target_practice' && action === 'paused';
    if (!ControllerAnalytics.passiveEvents.has(event) && !(automaticStop && payload.reason !== 'user')) this.interact(feature);
    if ((feature === 'touchpad_drawing' && action === 'started') || (feature === 'touchpad' && action === 'tracking_started')) this.once(event, payload, event + ':' + payload.input_source);
    else if (feature === 'touchpad' && action === 'highlighted') this.once(event, payload, event + ':' + payload.source);
    else if (ControllerAnalytics.onceEvents.has(event)) this.once(event, payload);
    else this.send(event, payload);
  }

  

  sample() {
    const now = this.now();
    if (this.lastActivity !== null) {
      // Stop counting after five seconds without input, including background time.
      this.activeMilliseconds += Math.max(0, Math.min(now, this.lastActivity + 5000) - this.lastSample);
    }
    this.lastSample = now;
  }

  flush() {
    this.sample();
    const seconds = Math.floor(this.activeMilliseconds / 1000);
    if (seconds) {
      this.send('controller_active_time', { seconds });
      this.activeMilliseconds -= seconds * 1000;
    }
  }

  pause() {
    this.flush();
    this.lastActivity = null;
  }
}
