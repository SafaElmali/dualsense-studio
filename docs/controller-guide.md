# Controller guide

[Back to DualSense Studio](../README.md)

Controls, hardware access, feature behavior, and technical limits. For storage and ranking details, see the [leaderboard documentation](development.md#community-leaderboard).

[Interactions](#interactions) · [Real adaptive triggers](#real-adaptive-triggers) · [Custom trigger presets](#custom-trigger-presets) · [Controller colors](#controller-colors) · [Controller battery](#controller-battery) · [Touchpad finger tracking](#touchpad-finger-tracking) · [Gyro](#gyro) · [Target practice](#target-practice) · [Firing-line presentation](#firing-line-presentation) · [Touchpad drawing](#touchpad-drawing) · [Controller diagnostics](#controller-diagnostics) · [Shareable scorecards](#shareable-scorecards)

## Interactions

- Click or tap the buttons.
- Drag either analog stick; release to center. A short tap clicks L3 or R3.
- Hold a trigger and drag upward to vary its pressure.
- **Auto** follows your inputs: L2/R2 show a tilted rear view, L1/R1 show the shoulders, and face buttons or sticks show the front. Held triggers take priority so aiming and firing do not flip the camera back and forth. The last angle stays after release. Buttons use the selected highlight color and opacity while pressed; trigger caps also light up, with live L2/R2 pressure labels in the automatic rear view.
- Drag the shell to rotate the controller; scroll to zoom. Dragging or choosing a fixed angle pauses Auto. Choose Auto to resume, or Reset to restore the front and Auto. Camera movement respects reduced-motion preferences.
- Choose Front, Angle, or Back, and switch between White, Midnight Black, and Cosmic Red finishes.
- Enable optional button sounds or connect a standard-mapped gamepad to mirror its inputs.

| Control | Keyboard |
| --- | --- |
| Left stick | W, A, S, D |
| Right stick | I, J, K, L |
| D-pad | Arrow keys |
| Triangle / Circle / Cross / Square | 4 / 2 / X / Z |
| L1 / R1 | Q / E |
| L2 / R2 | 1 / 3 |
| L3 / R3 | F / H |
| Home / Mute / Touchpad | Space / M / T |
| Create / Options | C / Escape |

Home toggles the simulated light bars. Microphone mute remains a visual simulation. A connected DualSense can produce real adaptive trigger resistance through the optional hardware controls below.

## Real adaptive triggers

In desktop Chrome or Edge, connect a Sony DualSense or DualSense Edge using USB or Bluetooth, then click **Enable trigger effects** and select it in the browser device picker. **Pistol** (default, previously Shooting) creates a crisp resistance wall and release. **Shotgun** has a heavier, longer pull before the break. Release to rearm either single-shot effect. **LMG** cycles strong trigger pulses at 10 Hz while held past the first third of travel. **SMG** uses lighter, faster pulses at 18 Hz. Release the physical trigger to stop the pulses. **Resistance** provides the original gentle, steady force. These are stylized presets, not replicas of real weapons or a specific game. You can switch effects while enabled; changing modes while Off leaves them off. Squeeze the physical L2/R2 triggers to feel it; the Gamepad API continues to mirror your inputs.

**Off**, **Reset**, opening Controls, and leaving the tab send the explicit Off effect. Returning to the tab requires enabling effects again. Closing the page attempts to release and close the device; abrupt browser termination cannot guarantee a final hardware message. Disconnect the controller if resistance persists.

Safari, Firefox, and browsers without WebHID keep the virtual controls but disable hardware effects. HTTPS or localhost is required. If Bluetooth is unavailable or another controller app has exclusive access, try a USB data cable and close that app.

The feature sends only adaptive-trigger output fields, with no audio, rumble, light, or microphone commands. It does not recreate a particular game's trigger patterns. Software checks cover packet encoding, Bluetooth CRC, unsupported devices, canceled selection, all gun presets and mode switching, concurrent Off, failed writes, and disconnect cleanup. Physical hardware feel requires manual verification.

Protocol references and the adapted trigger encoder's license are in [controller/TRIGGER-NOTICES.md](../controller/TRIGGER-NOTICES.md).

## Custom trigger presets

Expand **Customize & share this preset** under **Feel the triggers**. Strength runs from 1 to 8. LMG and SMG also support pulse speeds from 1 to 30 Hz; single-shot and steady-resistance modes do not use a pulse speed. Slider changes apply when released, using the existing serialized hardware writes. **Reset preset** restores the selected mode's defaults. Changing the mode also restores its defaults.

**Copy preset link** puts the mode, strength, and speed in the URL fragment. A visible link is provided if clipboard access is unavailable. Loading a link validates all settings and never requests controller access or enables effects. The recipient must choose **Enable trigger effects**. Customization while Off stays off. Target practice selects each weapon's default physical preset to keep its established firing cadence.

## Controller colors

Click the colored circle beside the 3D controller to open **Make it yours**. The **Light** tab changes the glow around the touchpad; **Body** changes the 3D shell, including the touchpad surface. Each has six quick colors, a native custom color picker, a six-digit hex field, and its own reset. The two colors are independent. The existing finish swatches still apply their full shell/button palette and update the Body picker. Colors last for this page visit.

**Sync controller light** connects a physical DualSense through WebHID (desktop Chrome or Edge) and sends the chosen RGB light color without enabling trigger effects. Subsequent Light changes sync after a short debounce. **Stop light sync** stops sending new colors; the physical LEDs keep their last color. Disconnecting clears sync, so reconnecting requires enabling it again. Body coloring is visual only. Changing the shell never prompts for hardware permission.

LED setup and color reports share the controller's existing serialized output queue and Bluetooth sequence/CRC. They enable only lightbar fields; trigger, audio, microphone, rumble, and player-indicator fields remain untouched. A failed LED write stops light sync without changing the trigger state. PostHog counts picker opens, committed light/body color changes, resets, and sync on/off; it receives neither RGB values nor device identifiers.

## Controller battery

The header has a beveled Three.js battery, charge percentage, USB/Bluetooth icon, and a lightning bolt while the controller reports charging. A single previously authorized DualSense reconnects automatically on page load, controller detection, or returning to the tab, without waiting for the 3D model. Battery access is independent of the touchpad toggle. It also starts reading when touchpad, gyro, light sync, or adaptive triggers establish the shared WebHID connection. Reading the battery does not enable trigger effects. Hover, focus, or tap the badge for connection and charging details.

The Gamepad API's connected status covers buttons and sticks; it does not grant WebHID battery access. When those inputs are connected but battery access is missing, the badge says **Allow battery access**. Click it and select your DualSense to grant access in desktop Chrome or Edge. Permissions belong to the site and browser: localhost and the production site need separate grants. Revoked permissions or several authorized controllers may require selecting a controller again. The app never opens the device picker automatically.

This is the controller's battery, not the computer's. DualSense reports coarse 10% intervals; the displayed percentage uses the interval midpoint (5%, 15%, … 95%, capped at 100%) following the Linux driver. Unknown readings show **—%** instead of an invented level. Full charge shows 100%; charging faults are identified in the tooltip. Low charge turns amber, then red. Basic Bluetooth packets contain no battery reading; try a USB data cable if the badge keeps waiting. Disconnecting clears the previous reading.

The small 3D scene renders only on reading or size changes, with a CSS battery fallback if WebGL is unavailable. Battery status remains active when touchpad or gyro is toggled off. PostHog counts `controller_battery_connect_requested` and one `controller_battery_reading_available` per page visit; no charge level, hardware identifiers, or sensor packets are transmitted.

## Touchpad finger tracking

Touchpad tracking is on by default. In desktop Chrome or Edge, the app automatically reconnects a single previously authorized DualSense on load, focus, becoming visible, or controller detection without opening a permission prompt. The first time, use the **touchpad icon beside the 3D controller** and select your DualSense. If several authorized controllers are connected, choose one manually. An explicit touchpad Off is respected for the rest of the page visit, including after reconnection; it does not prevent battery access from reconnecting. Reconnecting starts with trigger effects off. The compact toolbar contains touchpad and gyro toggles plus gyro recentering. Hover or keyboard-focus an icon for its label and connection details; gold indicates an enabled feature. The toolbar sits below the controller on narrow screens.

Touchpad tracking shares the hardware connection with adaptive triggers and does not enable trigger effects. Click its icon again to disable physical finger tracking without disconnecting gyro or adaptive triggers. Clicking that icon briefly highlights the touchpad itself in the selected highlight color; tapping the touchpad on screen or physically also keeps its highlight visible long enough to see. USB and full Bluetooth reports carry up to two finger positions; the app draws a yellow circle for each contact without requiring a touchpad click. Moving or lifting a finger updates or removes its circle. You can also drag the on-screen touchpad. No vibration is added. PostHog records explicit `controller_touchpad_enabled` and `controller_touchpad_disabled` actions without finger coordinates.

Auto brings the touchpad into view when touched (held triggers retain camera priority). Finger circles clear on focus loss, Reset, and disconnect. Bluetooth tracking requests the extended input report via feature report 0x05; try USB if your browser/controller cannot provide it. Normal Gamepad API input alone cannot provide finger positions. Touch coordinates stay in the browser and are not sent to analytics.

## Gyro

Choose **Enable gyro** on the main page or **Enable gyro aiming** in target practice. This reuses the existing DualSense WebHID connection (desktop Chrome/Edge, secure context, explicit browser device permission). USB and full Bluetooth sensor reports drive the 3D orientation and pitch/yaw aiming alongside the right stick. The 3D view maps sensor X/Y/Z into the mesh’s X/Z/−Y axes, integrates rotation as a quaternion, and uses gravity to align tilt on enable and after recentering. A gentle gravity correction during slow movement limits accumulated tilt error; strong acceleration is ignored. It does not emulate gyro input for other games. Automatic button-follow camera changes are suppressed while gyro is enabled. Dragging the shell, choosing a camera view, or Reset turns gyro off so the physical controller cannot override the chosen view.

**Recenter gyro** resets the heading/aim and measures stationary gyro bias for 1.5 seconds on a stable surface. Place the controller flat with its USB port pointing toward the screen, then pick it up after centering completes; the model follows its physical tilt. In the game, it pauses the round; resume after centering. It cancels on focus loss or substantial movement. Heading remains relative: gravity can correct tilt, but cannot reveal which compass direction the controller faces. Recenter if heading drifts. Tilt is realigned on returning to the tab without integrating the missing time. Turn gyro off to return to normal controls.

The gyro service parses signed axes and the controller's sensor clock (including wraparound), discards missing/large time steps, and removes listeners on disconnect. It reads factory sensitivity from feature report 0x05 when available; otherwise the live rates are explicitly approximate using nominal sensitivity. It never sends feature reports or writes factory calibration. The packet layout, clock units, and scale conventions are referenced from [Sony's Linux hid-playstation driver](https://github.com/torvalds/linux/blob/master/drivers/hid/hid-playstation.c); feature-report framing follows [WebHID](https://wicg.github.io/webhid/).

Gyro coordinate and accelerometer conventions are checked against [SDL’s DualSense driver](https://github.com/libsdl-org/SDL/blob/main/src/joystick/hidapi/SDL_hidapi_ps5.c) and [sensor coordinate documentation](https://wiki.libsdl.org/SDL3/SDL_SensorType). No raw motion or orientation data is sent to analytics.

PostHog counts `controller_gyro_enabled`, `controller_gyro_disabled`, and `controller_gyro_recentered`. No raw gyro rates, stick measurements, bias values, or device IDs are sent. Tests cover report decoding, feature framing, timestamp wrap, pause/disconnect, cancellation during calibration, stationary-bias correction, all three model rotation axes, flat/upright/sideways poses, tilt correction, pause/resume, raw diagnostic preservation, and motion aiming. Physical motion direction and feel still require a hands-on controller check.

## Target practice

Choose **Play target practice** beneath the page title to open a 20-second arcade round. Three moving bullseyes respawn after hits. Center hits score 100, outer hits score 50, and consecutive hits add a bonus up to 50 per hit. The HUD shows score, time, accuracy, streak, and a personal best stored only in your browser.

- **Controller:** right stick aims, R2 fires, Triangle cycles weapons, and Cross starts/replays/resumes a round.
- A connected, standard-mapped controller is required. Connect via USB or Bluetooth and press a button so the browser detects it. Mouse, trackpad, touchscreen, and keyboard cannot aim or fire; menus and name entry remain accessible.
- Pistol and Shotgun require release between shots. Shotgun has a wider hit area; LMG and SMG fire continuously at their preset cadence. Release R2 after switching weapons to rearm.
- Enable adaptive triggers before starting or while paused to feel the selected preset. Normal stick/button play uses the Gamepad API; gyro and adaptive triggers need the optional hardware connection. The range uses the existing trigger connection and changes both L2/R2 to the chosen preset without adding rumble or touchpad vibration.
- Disconnecting the controller pauses the round; reconnect and explicitly resume to continue. Pause, losing focus, hiding the tab, finishing, and closing the range stop firing and release trigger effects. Resume preserves the score and timer, but hardware effects must be enabled again. Closing restores the interactive 3D controller.

The range uses a separate Canvas 2D renderer and suspends the 3D render while open. Tests cover target collision/scoring, cooldowns, automatic-fire cadence, single-shot rearming, pause/resume, round completion, and aiming bounds.

## Firing-line presentation

Target practice uses a dedicated arena layout with a compact HUD, remaining-time bar, weapon loadout, and an expandable controller setup panel. The locally drawn firing bay includes illuminated hanging targets, impact particles, hit markers, and recoil feedback in the reticle. The arena keeps a fixed coordinate system inside a fitted viewport to keep target positions consistent at different screen sizes. Reduced-motion preference removes decorative particles, tracers, and reticle recoil. The current leaderboard uses 20-second controller-only rounds. Personal bests start fresh for these rules; the Previous leaderboard tab keeps older scores available without comparing different formats.

Completed rounds show score, hits/accuracy, optional name submission, replay, and scorecard download in a centered arena card. The name field receives focus when play ends with focus on the canvas; typing names does not affect gameplay. The leaderboard is launched from inside the game only. Offline/practice-only rounds explain why submission is unavailable while replay and scorecard exports still work. When ranked rules change, older tabs show a refresh action before another ranked round can start or be submitted.

## Touchpad drawing

Open **Touchpad drawing** below the hardware controls. Move one or two fingers on an enabled physical touchpad, or drag across the canvas with a mouse or touchscreen. Choose soft gold, ice blue, or lilac; lifting a finger starts a separate stroke. **Save drawing** exports a 1200 × 735 PNG with a small studio footer. **Clear canvas** starts over. Closing the panel preserves the drawing in memory; refreshing clears it. The canvas caps recorded points at 20,000 and announces when it is full. Drawing adds no vibration and sends no coordinates or artwork to a server.

## Controller diagnostics

Open **Controller diagnostics**, connect a gamepad, and press a button if the browser has not detected it. The panel displays the first four raw stick axes without the 3D viewer's added deadzone. **Measure resting sticks** samples for two seconds and reports the mean offset from center plus the greatest offset seen. Let go of the sticks during this measurement. Focus loss cancels an incomplete measurement.

For a standard-mapped controller, L2 and R2 show current travel and observed minimum/maximum values. Each button shows its current press/release state and press count. **Reset readings**, reconnecting, or opening the panel starts a new check. These are browser-reported readings, not a hardware calibration, fault diagnosis, or end-to-end latency test. Opening diagnostics releases adaptive trigger effects.

## Shareable scorecards

Finish a target-practice round, then choose **Download scorecard**. The 1200 × 675 PNG includes the score, accuracy, hits/shots, and every weapon actually fired during that round. Switching weapons after completion cannot change the card, and replay cannot change a download already started. Empty rounds explicitly say no shots were fired. Cards are generated locally. Players can separately choose to submit their round to the public leaderboard.
