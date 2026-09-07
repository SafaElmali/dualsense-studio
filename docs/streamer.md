# Streamer mode and OBS

[Back to DualSense Studio](../README.md)

Create a customizable 3D controller overlay for OBS. To run it locally, follow the [setup instructions](development.md#run-locally), then open `streamer.html`.

## Customize your overlay

Open `streamer.html` from **Streamer mode** beside target practice. The preview reuses the studio's attributed 3D model and input animations. Its default Angle view tilts the controller to show the face buttons and both trigger caps together. Choose Auto to follow pressed controls, or a fixed front/angle/back/trigger camera, plus size, shell/light/highlight colors, highlight opacity, transparent/green/blue/custom background, and a controller slot. Settings are validated and saved in the page URL; **Copy OBS link** produces a portable `overlay.html` URL with only those settings. **Open capture page** opens the setup in the current tab so the browser can show its controller permission picker. To capture a separate browser window, paste the overlay link into desktop Chrome or Edge; the app does not force a popup. **Try demo**, beside the connection status, runs an explicitly labeled six-second demo, which stops when a real controller is detected. Both the main controller and Streamer overlay show direction arrows on moving stick caps and tint them with the chosen highlight color and opacity. The arrows fade at rest, ignore small center noise, and do not appear for a stationary L3/R3 click. Stick arrows can be hidden, resized from 50–150%, or given a custom color; automatic contrast is the default. Configure them in Streamer’s Stick arrows section or the main appearance picker under Highlight → Stick arrows. OBS links preserve all three preferences, and hiding arrows keeps stick highlighting active. Preview arrows is visual only.

## Button highlights

Button highlight color and opacity are available in the main color picker’s **Highlight** tab and Streamer’s **Button highlights** section. Opacity uses the full tint range: 0% restores the normal material, 100% uses the selected color, and intermediate values blend with the original surface while retaining 3D shading. Symbols adapt for contrast. The default is a stronger gold. **Preview highlight** briefly lights Cross, R2, and the touchpad without sending controller input. Changes preview immediately; Streamer settings travel with the capture link, and existing links retain their chosen color and opacity. Streamer preview clicks emit `controller_streamer_highlight_previewed`; no raw colors or input streams are sent.

## Camera and trigger meters

The capture page shows the controller and compact L2/R2 pressure meters, so trigger presses remain visible from every camera angle. Turn off **Show L2/R2 meters** in the editor or capture setup to hide these panels; the choice travels with copied OBS links. Trigger animation on the 3D controller remains active. The builder shows small trigger bars only while the large meters are hidden, and always keeps the current input status visible. Auto reveals the rear for L2/R2, the shoulders for L1/R1, and the front for face buttons or sticks. Held triggers take priority; the last angle stays after release. Selecting a fixed camera pauses following, and choosing Auto resumes it. Drag in the preview or capture window to choose a Custom angle; Shift-drag adjusts roll. Custom tilt, turn, and roll sliders allow precise positioning. The chosen orientation stays fixed during live input and is saved in copied OBS links. After changing the angle inside OBS Interact, reopen setup and copy the updated link into the source URL so OBS restores it after a refresh. Camera motion respects reduced-motion preferences. The capture has no decorative shadow, audio, or game UI. **Open capture page** opens setup in the current tab. For a separate capture window, paste the overlay link into another desktop Chrome or Edge window. The setup panel can be hidden and reopened with Escape or a double-click. Reloading a plain overlay link never shows setup unless loading fails; links ending in `#setup` show the connection controls.

## Preview without a controller

To see the overlay moving inside OBS without hardware, open the source's **Interact** window, press **Escape**, then choose **Preview without a controller**. Simulated button presses, sticks, analog triggers, and touchpad clicks loop until stopped. A visible **DEMO INPUTS · Stop** button labels the simulation and stops it. Connecting a real controller clears the simulation and hands control to live input. Demo mode is never included in copied overlay links and is off after reload; it tests the visuals, not hardware connectivity or finger tracking.

## Connect to OBS

Two capture paths are documented on the setup page:

- **OBS Browser Source:** paste the link, use 800 × 600 at 60 FPS, open Interact, click the controller and press a physical button to activate the Gamepad API. Transparent rendering uses the existing alpha-enabled Three.js renderer. This connection provides touchpad clicks, but not finger coordinates. For finger tracking, use the direct Chrome/Edge capture method. Check input after changing focus to your game: Gamepad access depends on the OBS/Chromium version, OS, and controller mapping.
- **Chrome/Edge window capture:** choose green or blue, open the capture window, and select **Connect DualSense** for WebHID input. Then hide setup and use an OBS window capture with a matching Chroma Key filter. Keep that window open, on its controller tab, and unminimized. This input service intentionally has no focus gate. A USB data cable is recommended; Bluetooth needs extended reports. Close controller tools that hold exclusive device access if opening fails.

## Direct controller input

Direct capture is read-only: it reads buttons, analog sticks/triggers, and touch contacts. It never sends trigger, rumble, LED, or calibration output. Reading feature report 0x05 activates extended Bluetooth input where supported. An already authorized single DualSense can reconnect without another chooser; multiple devices require a deliberate selection. Raw input fields follow [Sony's Linux hid-playstation driver](https://github.com/torvalds/linux/blob/master/drivers/hid/hid-playstation.c). Disconnects and stale HID reports clear held inputs. The regular studio's focus safety and trigger behavior remain unchanged. It does not emulate a game controller for other apps.

## Controller selection and credits

The player selector applies to normal Gamepad API input; a direct connection follows the controller selected in the browser permission dialog. The preview's checkerboard is not part of the capture. Keep model credit in your stream description when using the overlay: **DualSense model by Taohid Animation, CC BY 4.0, adapted by DualSense Studio**, with links to the [original model](https://sketchfab.com/3d-models/ps5-controller-b7bb9c5102a04cb0b1966c6d02bad7d6) and [license](https://creativecommons.org/licenses/by/4.0/).

## Analytics

PostHog covers Streamer customization, demos, OBS export/setup, model loading, and input connection states. See the [analytics reference](analytics.md#feature-events) for the complete event and property catalog. Input discovery is counted once per page, status changes only on transitions, and passive discovery/results do not extend active time. No raw input, sensor, device, or URL data is added to event properties.

## Validation and manual checks

Validation covers portable/malformed links, both HID report layouts, analog input, controller selection, permission ambiguity, cancellation during open, disconnect/stale cleanup, no output writes, and analytics boundaries. Browser checks cover the setup/capture flows, mobile layout, transparency, and simulated input while focus is unavailable. On the development Mac, the OBS Browser Source rendered the overlay and physical controller button input was observed and confirmed by the user. Chrome also received direct USB reports. Finger movement and continued input while gaming still need a final hands-on check. Completing native Chrome window capture was blocked by OBS crashing during automated source creation; no recording or streaming was started.

Analytics regression checks cover every literal event call against the allowlist, every Streamer form field, bounded properties, one event per committed rotation, demo outcomes, controller disconnect/resume, and actual gyro recenter outcomes. Local analytics remain disabled unless `analytics_test=1` is explicitly present when the page loads.

## Streamer showcase

Streamers can submit their Twitch, YouTube, or Kick channel for review. Only approved channels appear publicly. See [storage, moderation, and testing](streamer-showcase.md).
