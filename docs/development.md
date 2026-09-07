# Development guide

[Back to DualSense Studio](../README.md)

Setup, architecture, deployment, and project configuration for contributors. These guides describe this checkout; the public site may not include every local feature yet.

## Architecture

An interactive PS5 DualSense recreation built with HTML, CSS, JavaScript, and Three.js. The model, textures, and Three.js modules are included locally; the controller works without an external CDN. Netlify builds a static publish folder and a leaderboard function. Optional analytics loads from PostHog; blocking it does not affect the controller.

## Run locally

Serve the repository over HTTP rather than opening `index.html` directly. With Python 3 installed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://localhost:8000).

## Tests

Node.js 20 or newer is required for the tests. Run `npm ci` to install the server storage dependency.

```sh
npm test
```

Tests cover simultaneous input sources, trigger pressure, circular stick travel, input priority, and release on focus loss.

## Files

- `index.html` — page and controls.
- `controller/controller.css` — layout and appearance.
- `controller/controller-app.js` — mouse, touch, keyboard, gamepad, and UI handling.
- `controller/controller-view.js` — Three.js scene, materials, raycasting, and moving parts.
- `controller/input-state.js` — shared input state service.
- `controller/dualsense.glb` — model with separate interactive parts and embedded textures.
- `controller/vendor/three/` — Three.js 0.180.0 and the required add-ons.
- `netlify/functions/` — leaderboard API and storage logic.
- `scripts/build.mjs` — static publish-folder generation.
- `tests/` — input, hardware protocol, analytics, leaderboard, and page checks.

## Community leaderboard

Open **Play target practice**, then choose **Leaderboard** in the game header. The public board shows the top 50 submitted scores with nickname, accuracy, and weapons used. The **20 seconds · Controller only** board starts fresh under rules version `controller-20s-v2`, with a separate local personal best. **Previous leaderboard** preserves the prior 20-second board (which allowed mouse play) and the original longer-round board as separate, read-only archives. No scores are rescaled or combined. It keeps one best score per browser; ties use accuracy and then the earliest submission. Nicknames are not reserved identities. After a completed round with at least one shot, a results card appears in the center of the arena. Enter your name there and choose **Submit score**. Publication is optional and clearly labeled.

The API is a Netlify Function at `/.netlify/functions/leaderboard`, backed by a site-wide, strongly consistent Netlify Blobs store named `dualsense-leaderboard`. It needs no separate database account or client-side secret. `npm run build` copies the public HTML pages, icons, search files, `assets/`, and `controller/` to `dist/`; server code and dependencies are bundled separately as a function. The exact publish inputs are listed in [scripts/build.mjs](../scripts/build.mjs). Deploy through the existing Netlify Git connection. A plain static localhost server supports practice but cannot submit scores; the UI explains when the live leaderboard is unavailable.

The shared contract in `controller/range-rules.js` defines the duration and rules version. Every start and submit must send matching `rulesVersion` and `durationSeconds`; stale or missing rules receive HTTP 409 with `code: rules_changed` before storage writes. The client requires a refresh instead of starting unranked practice in this case. Network outages still allow unranked practice. The server records its own version and duration on each ticket and accepted score. The server issues a round ID before play, requires at least 20 seconds before submission, and expires an unfinished round after one hour. Starting another round in the same browser invalidates the older unfinished ticket, including across tabs. Failed network requests can be retried without duplicate scores. Conditional storage writes preserve concurrent submissions. Server validation limits nickname characters, weapon values, score/hit relationships, and shot counts. The controller requirement is enforced in the normal game UI; a browser client cannot prove physical controller use to the server. These checks reduce accidental or trivial invalid submissions; this is a casual browser leaderboard, not cheat-proof competitive scoring.

A random first-party `HttpOnly`, `Secure`, `SameSite=Strict` cookie identifies the browser for its personal best. It is restricted to the leaderboard endpoint. Clearing it creates a new player identity. The database retains the current round per browser, up to 100 best entries (50 shown), and hourly request counters keyed by a SHA-256 hash of the connecting IP; raw IPs are not written to Blobs. These gameplay records are separate from cookieless PostHog analytics. The public response never exposes browser identifiers or round IDs. Owners can inspect or remove leaderboard data through the site's Netlify Blobs controls.

Current storage uses `players/controller-20s-v2/{player}` and `board/controller-20s-v2`. Archive reads use `board/20-second-v1` and `board/v1`, selected via GET `?board=previous` or `?board=original`. GET defaults to `current`; unknown boards are rejected. Writes always target the current board, regardless of query parameters. Existing player cookies keep the “You” marker in archives, while rankings and personal bests remain separate. For a future ranked rule change, bump the shared version and preserve the old board as another explicit archive.

PostHog records `controller_leaderboard_opened` and `controller_leaderboard_submitted` (score only), plus once-per-visit `controller_feature_used` with `feature=leaderboard`. Nicknames and player identifiers are not analytics properties.

Tests cover persistent reads, round ownership and expiry, invalid inputs, idempotent retries, concurrent writes, ranking, personal-best retention, board size, rate limits, HTTP request validation, and offline client behavior.

## Optional project support


`controller_support_clicked` records an outgoing support click with `provider=buymeacoffee` and `surface=studio|builder`. It also counts `support` in feature reach. This is a link-click count, not a completed tip. Neither payment details nor the destination URL are included in custom event properties. Normal local-development, Do Not Track, and analytics-blocking behavior still apply. See the [analytics reference](analytics.md).

## SEO

The canonical public origin is `https://dualsense.studio`. Search metadata and JSON-LD live in the HTML so crawlers do not need the 3D renderer. The build includes `robots.txt`, `sitemap.xml`, a branded `404.html`, PNG icons, and the social preview in `assets/`. Appearance and trigger preset URLs retain their settings while canonicalizing to the unparameterized page. OBS capture pages stay crawlable but carry `noindex`.


## Attribution

The 3D model is **PS5 Controller** by **Taohid Animation**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Original model and creator](https://sketchfab.com/3d-models/ps5-controller-b7bb9c5102a04cb0b1966c6d02bad7d6).

The model was adapted for interaction, with separated controls, adjusted materials, and projected button markings. Full source and modification details are in [controller/ATTRIBUTION.md](../controller/ATTRIBUTION.md).

Three.js is distributed under its included [MIT license](../controller/vendor/three/LICENSE).

This is an independent visual recreation, not an official Sony product or a verified dimensional CAD model. PlayStation and DualSense are trademarks of Sony Interactive Entertainment.
