// ================================================================
//  PIXI INPUT — will translate pointer/tap/drag events on the Pixi
//  stage into calls to the EXISTING input-handling functions already
//  in index5.html (startDrag/moveDrag/endDrag, tapShot(), the
//  bowling d-pad handlers, etc.) — never duplicate that logic here,
//  only route input to it.
//
//  STATUS: NOT STARTED. Per CONVERSION_GUIDE.md Section 4 ("suggested
//  build order"), input wiring is Step 7 — it comes after the ball,
//  batsman, bowler, stumps, and fielder sprites exist, so there's
//  something meaningful on the Pixi stage to attach handlers to.
//
//  Right now #pixi-layer is `pointer-events: none` in CSS (see
//  index5.html), so even if this file attached listeners today they'd
//  never fire — all taps/drags correctly keep going to the existing
//  d-pad buttons and canvas as they do now. This file is intentionally
//  a no-op until Step 7 is picked up.
// ================================================================

(function () {
    // Intentionally empty for Step 1. See CONVERSION_GUIDE.md Section 3
    // Step 7 for the input-routing approach to implement here once the
    // Pixi-rendered sprites this would attach to actually exist.
})();
