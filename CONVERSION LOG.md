# Conversion Log

## Step 1 — blank Pixi canvas alongside the existing game (DONE)

Per `CONVERSION_GUIDE.md` Section 4, item 1: *"Get a blank Pixi canvas
rendering inside the existing game-screen layout, sitting alongside (not
replacing) current elements — confirm no regressions to existing logic."*

**What changed in `index5.html`** (verified additive-only: 0 functions
removed or edited, only new tags/comments added):
- Loads PixiJS 8.x from the jsDelivr CDN — no build step, still a single
  static file deployable to GitHub Pages exactly as today.
- Added `#pixi-layer` (a `pointer-events: none`, absolutely-positioned div)
  inside `.pitch-stage`, next to the existing `#pitch-canvas` and SVG
  overlays. Because it's `pointer-events: none`, it can never intercept a
  tap/drag meant for the real game — even once real sprites are added
  later, hit-testing will need to be deliberately opted into (Step 7).
- Added `#pixi-status-badge`, a small on-screen debug label (top-right of
  the pitch stage) so you can visually confirm Pixi initialized without
  opening devtools.
- Added one hook call at the very end of the existing `drawPitch()`
  function: `window.pixiRenderer.renderMatchFrame(state)`, wrapped in
  `try/catch`. This is the same call site pattern the guide specifies
  (same place `updateScoreboard()` is already called), and since
  `drawPitch()` already runs every animation frame while the game screen
  is active, the hook fires continuously — no other call sites needed to
  change.
- Added one guarded `pixiRenderer.init('pixi-layer')` call in the existing
  `INIT` block, after `animate()` starts. If PixiJS fails to load (CDN
  blocked, no WebGL/Canvas2D) this only logs a warning — the real game has
  already started by that point and is completely unaffected.

**New files:**
- `pixi-renderer.js` — sets up the `PIXI.Application`, the
  background/pitch/fielders/bowler/batsman/ball/stumps/fx layer stack
  described in the guide (all empty containers for now), and a single
  placeholder debug dot that tracks `state.ball.x/y` when present, purely
  to prove `renderMatchFrame(state)` is receiving live state every frame.
  No sprite artwork is loaded yet — `assets/` is still empty.
- `pixi-input.js` — intentionally a no-op stub. Input wiring is build-order
  Step 7, which comes after there's something real on the Pixi stage to
  attach handlers to. Included now only so the `<script>` tag doesn't 404.

**How to verify no regressions:**
1. Open `index5.html`, play through team select → toss → openers → a full
   over or two, both batting and bowling.
2. You should see a small `Pixi ✓ (Step 1 — blank layer, no art yet)`
   badge appear top-right of the pitch once you reach the game screen, and
   (if you look closely) a faint yellow dot tracking the ball whenever
   `state.ball` is set — everything else should look and behave exactly as
   it did before.
3. Confirm the v2.3 fixes still hold: opener screen isn't stuck, bowling
   figures still show in the end-of-innings/match scorecard.
4. Try it with the network tab blocking `cdn.jsdelivr.net` (or offline) —
   the game should still fully play; only the badge/debug dot won't
   appear, and you'll see one console warning.

## Next steps (not started — do these one at a time, per the guide)

2. Replace the placeholder debug dot with a real ball sprite (flat-color
   circle is fine as a placeholder per `ASSET_SPEC.md`'s "Placeholder
   strategy") + a GSAP tween along the trajectory math already used by
   `drawBall()`/`animateBall()`/`animateOutgoingBall()`.
3. Batsman placeholder sprite, wired to the shot-played events.
4. Bowler placeholder sprite + run-up.
5. Stumps-break + wicket particles.
6. Fielder dive + catch.
7. Four/six celebration particles, *then* wire `pixi-input.js` if you
   still want native drag-to-aim instead of the d-pad.
8. Polish (camera pan/zoom, screen shake, parallax) — optional.

Swap in real artwork from `ASSET_SPEC.md` into `assets/` at any point —
matching filenames means no code changes are needed once it's ready.
