# Analytics reference

[Back to DualSense Studio](../README.md)

Event names, privacy boundaries, and verification for the studio and Streamer mode. The event allowlist lives in [analytics-service.js](../controller/analytics-service.js).

## Overview

PostHog tracks this demo with cookieless analytics, no identified person profiles, no session recordings, and no automatic click/keyboard capture. Do Not Track is respected. Unique visitors are estimates and cookieless identity resets daily.

Localhost traffic is disabled by default. For an explicit integration test open `http://localhost:8000/?analytics_test=1`. Those events have `environment=development`; filter dashboards to `environment=production` for real traffic.

| Event | Meaning |
| --- | --- |
| `$pageview` | Page opened; includes referrer and campaign information |
| `controller_loaded` | 3D model successfully ready |
| `controller_interacted` | First meaningful interaction, once per page visit |
| `controller_feature_used` | Button, stick, rotate, zoom, view, finish, or sound; once per feature per visit |
| `controller_finish_selected` | Selected finish, once per color per visit |
| `controller_gamepad_connected` | Gamepad found, once per page visit; no device identifier captured |
| `controller_active_time` | Incremental `seconds` of estimated active use; stops after 5 seconds of inactivity or when hidden/unfocused |

A visit here means one page load. Sum `controller_active_time.seconds` for active time; count `controller_interacted` for engaged page visits or use unique users for estimated people. Do not treat total events as visitor counts. Tracking begins only after the updated files are deployed.

The public project token in `controller/analytics.js` only allows event ingestion; it cannot read analytics or manage the account. If you fork the project, replace it with your own token. Cookieless server hash mode must be enabled in PostHog project settings.

## Feature events

The tools send explicit PostHog events through the same cookieless client and development/production filters. `controller_feature_used` counts each feature once per page visit: `touchpad_drawing`, `trigger_presets`, `diagnostics`, `scorecard`, `target_practice`, `leaderboard`, `touchpad`, `gyro`, `battery`, `appearance`, `streamer`, `trigger_effects`, `viewer`, `help`, and `navigation`. For feature reach, count unique visitors or feature-used events; action events below can repeat in one visit. Automatic sensor discovery does not count as an engaged visit.

| Events | Meaning and properties |
| --- | --- |
| `controller_streamer_showcase_form_opened`, `_loaded`, `_load_failed`, `_submit_requested`, `_submitted`, `_submit_failed`, `_channel_opened` | Showcase form use, list loading, submission outcomes, and featured channel clicks. Includes `surface=builder`; submissions and channel clicks include only `platform=Twitch`, `YouTube`, or `Kick`. Load and submission outcomes are passive. No names, URLs, consent fields, or moderation data are captured. |
| `controller_help_opened` | Expanded FAQ answers on the controller and Streamer pages, plus the main-page stick-arrow disclosure. Includes bounded `surface` and `topic` identifiers; no question text. Closing an answer does not emit an open event. |
| `controller_navigation_clicked` | Studio → Streamer entry, Streamer → studio links, the FAQ → OBS setup guide link, and the X contact links in help and capture setup. Includes `surface`, `destination=studio`, `streamer`, `obs_setup`, or `x`, and `placement=brand`, `header`, `intro`, or `help`. Records clicks including keyboard activation and middle-click; no destination URL or text. |
| `controller_streamer_camera_help_viewed` | Auto camera explanation exposed by pointer hover or keyboard focus. Once per page visit, with `surface`; this passive exposure never creates an engaged visit or extends active time. |
| `controller_touchpad_drawing_opened`, `_started`, `_cleared`, `_exported`, `_export_failed` | Panel opens, first drawing input, clears, successful PNG generation/download requests, and failed exports. `_started` is once per input source per page visit, with `input_source=hardware` or `pointer`. |
| `controller_trigger_presets_opened`, `_changed`, `_reset` | Editor opened by the user, committed mode/slider changes, or defaults restored. Changes include `mode`, `strength`, and `speed_hz`; resets include `mode`. Slider movement does not send a per-frame stream. |
| `controller_trigger_presets_link_created`, `_link_copied`, `_loaded` | Link prepared, successfully copied through the clipboard API or manual copy action, and valid shared preset loaded. Custom properties are `mode`, `strength`, and `speed_hz`. Loading alone does not count as an engaged visit. |
| `controller_diagnostics_opened`, `_connected`, `_measurement_started`, `_measurement_completed`, `_reset` | Panel use and two-second resting measurements. Connection is counted once per page visit. Canceled measurements do not emit completion. No raw readings or device identifiers are included. |
| `controller_target_practice_opened`, `_controller_required`, `_controller_connection_changed`, `_start_requested`, `_started`, `_ranking_unavailable`, `_paused`, `_resumed`, `_closed`, `_weapon_changed`, `_setup_opened`, `_gyro_used`, `_completed` | Controller-only game funnel and lifecycle. Opens/connection transitions include `connected`; starts and weapon changes include `mode`; pauses include `reason`; closes include `state`. Disconnection is counted on transition, not every frame. Resume does not count as a new round. Gyro use is once per visit. Completion includes `score`, `hits`, `shots`, `accuracy`, and `weapons`. |
| `controller_scorecard_exported`, `_export_failed` | Scorecard PNG generated and download requested, or export failure. Success includes the completed round's `score`, `hits`, `shots`, `accuracy`, and `weapons`. |
| `controller_appearance_opened`, `_tab_selected`, `_changed`, `_reset`, `_opacity_changed`, `_previewed` | Color picker use with `target=picker`, `light`, `body`, or `highlight`. Highlight opacity commits include a bounded `opacity` from 0–100; previews include only the target. Committed changes include `method=preset`, `picker`, or `hex`; live slider/color movement does not send an event stream. Selecting the already active tab does not repeat the tab event. |
| `controller_appearance_sync_requested`, `_sync_enabled`, `_sync_disabled`, `_sync_cancelled`, `_sync_failed` | Physical LED sync attempts, successful initial writes, deliberate stops, chooser cancellation/denial, and failures. Failures include only `stage=connection` or `write`. Successful later color writes do not repeat `_sync_enabled`. |
| `controller_battery_details_opened`, `_connect_requested`, `_connect_succeeded`, `_connect_cancelled`, `_connect_failed`, `_reading_available` | Battery details clicked while connected, connection attempts and outcomes, and first valid battery report per page visit. Connection success means access was established; it does not guarantee a battery reading. No charge level or charging state is collected. |
| `controller_touchpad_enabled`, `_disabled`, `_tracking_started`, `_highlighted` | Deliberate toggles; first nonempty finger input per `input_source=hardware` or `pointer`; highlight use per `source=toolbar` or `button`. Tracking and highlights are once per source per page visit, including touch without a physical click. |
| `controller_touchpad_reconnected`, `_reconnect_failed` | Previously authorized device restored, or restoration threw an error. Each is once per page visit. No saved permission or multiple saved controllers emits neither event. These background events and battery reading availability never extend active time. |
| `controller_gyro_connect_requested`, `_connect_cancelled`, `_connect_failed`, `_enabled`, `_disabled`, `_recenter_started`, `_recentered`, `_recenter_failed`, `_recenter_cancelled` | Gyro connection attempts and recenter outcomes. `_recentered` now fires only after the stationary measurement actually succeeds; it previously fired when measurement began. No motion readings are collected. |
| `controller_leaderboard_opened`, `_refreshed`, `_loaded`, `_load_failed`, `_personal_rank_clicked`, `_board_selected`, `_submit_requested`, `_submitted`, `_submit_failed` | Board navigation/loading includes the bounded `board` value (`current`, `previous`, `original`). Submission outcomes remain separate. Submitted includes `score` only; no nickname, rank, player identifier, round token, or error text. |
| `controller_streamer_opened`, `_settings_changed`, `_settings_reset`, `_camera_rotated` | Streamer customization. `surface=builder` or `capture` distinguishes setup from the OBS capture page. `_settings_changed` includes `setting` for all 16 controls: stickArrows, arrowSize, arrowColor, camera, pitch, yaw, roll, triggerMeters, body, light, highlight, highlightOpacity, background, color, scale, and slot. Opening the page emits `_opened` as a passive visit event; it does not create engagement until the user acts. Camera/background modes, meter/arrow `enabled`, arrow `size` and `color_mode`, opacity, scale, and slot `selection` are bounded; color values and custom angles are omitted. A drag emits one `_camera_rotated` when committed, not per pointer movement or Auto camera animation. |
| `controller_streamer_tab_selected`, `_highlight_previewed`, `_arrows_previewed` | Active settings tab with `tab=camera`, `appearance`, or `inputs`, plus deliberate visual previews. All include `surface`; no simulated input stream is sent. |
| `controller_appearance_arrows_changed`, `_arrows_previewed` | Main-page arrow controls, with bounded `setting`, `enabled`, `size`, and `color_mode` on changes. Preview events contain no input data. |
| `controller_streamer_demo_started`, `_demo_stopped` | Simulation use with `surface`; stops include `reason=user`, `completed`, `live_input`, `closed`, or `restarted`. Automatic completion/takeover never counts as extra engagement. Simulated presses never produce input analytics. |
| `controller_streamer_link_copied`, `_copy_failed`, `_capture_opened`, `_capture_loaded`, `_setup_opened`, `_setup_closed`, `_editor_opened` | OBS setup/export funnel. Copy success includes `method=clipboard` or `manual`; setup events track deliberate panel toggles. Capture and editor links also track middle-clicks. Capture loaded means the page opened, not that OBS is recording. No overlay URL is sent as a custom event property. |
| `controller_streamer_input_connected`, `_input_state_changed`, `_connect_requested`, `_connect_succeeded`, `_connect_cancelled`, `_connect_failed`, `_disconnected`, `_reconnect_succeeded`, `_reconnect_failed`, `_model_loaded`, `_model_failed` | First live input per visit (`input_mode=gamepad` or `direct`), bounded input status transitions, direct connection attempts/outcomes, deliberate disconnect, automatic reconnection, and rendering outcomes. No-permission/ambiguous automatic reconnect emits no success. Background events never extend active time. |
| `controller_touchpad_drawing_color_changed`, `_connect_requested`, `_connect_succeeded`, `_connect_cancelled`, `_connect_failed`; `controller_touchpad_connect_requested`, `_connect_cancelled`, `_connect_failed`; `controller_trigger_presets_copy_failed` | Drawing color selections, optional touchpad connection attempts/outcomes, and preset clipboard failures. Existing successful actions remain tracked. No colors or artwork are collected. |
| `controller_trigger_effects_connect_requested`, `_enabled`, `_connect_cancelled`, `_connect_failed`, `_disabled` | Deliberate trigger effect setup with `surface=studio` or `target_practice`; automatic safety pauses do not pretend the user clicked Off. The existing `controller_trigger_effects_enabled` name now counts each successful explicit enable, with its surface, instead of only the first per visit. |
| `controller_viewer_camera_selected`, `_auto_changed`, `_sound_changed`, `_reset`, `_controls_opened`, `_model_failed` | Named viewer actions, with a bounded `camera` or boolean `enabled` where applicable. Existing feature-reach counters remain available. |

In this table, each underscored suffix continues the full event prefix in its row. An export event confirms PNG generation and a browser download request; it cannot confirm that the user saved the file to disk or posted it elsewhere. Custom properties use an allowlist; the existing PostHog client also attaches standard page/browser metadata. No artwork, touch coordinates, stick/trigger readings, controller IDs, or raw error messages are sent. Blocked analytics never interrupts the tools.

To verify in PostHog, open **Activity → Events**, filter event names by the prefixes above, and filter `app=dualsense-controller` plus `environment=production`. For development checks use `?analytics_test=1` on localhost and `environment=development`; these are excluded from the production dashboard.

## Support links

`controller_support_clicked` records the provider (`buymeacoffee`) and surface (`studio` or `builder`). Older events may contain `patreon`, which is no longer offered in the UI. It measures an outgoing click, not a completed tip. No payment details or destination URLs are custom event properties. See [support configuration](development.md#optional-project-support).

`controller_target_practice_rules_changed` records a required rules refresh without error text or player data. It is a passive event and does not extend active time.
