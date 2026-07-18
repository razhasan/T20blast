// ================================================================
//  PIXI RENDERER — owns the Pixi layer only. Reads `state` from the
//  existing game (index5.html) and draws it. NEVER mutates game
//  state — it is called from the end of drawPitch(), which remains
//  the authoritative, unmodified game render.
//
//  STATUS: CONVERSION_GUIDE.md build-order Step 1 ("get a blank Pixi
//  canvas rendering inside the existing game-screen layout, sitting
//  alongside — not replacing — current elements, confirm no
//  regressions"). No sprite artwork exists yet (assets/ folders are
//  still empty per ASSET_SPEC.md), so this intentionally does NOT
//  call PIXI.Assets.load() yet — that starts in Step 4/5, once real
//  sprite sheets land. Until then this file:
//    1. Proves the Pixi app initializes and mounts correctly.
//    2. Proves renderMatchFrame(state) is being called every frame
//       with live game state (visible via the on-screen debug badge
//       and a placeholder ball-position marker).
//    3. Lays down the exact layer/container structure Steps 3-8 will
//       fill in, so nothing needs restructuring later.
//
//  NEXT STEP (per guide Section 4, item 2): replace the placeholder
//  ball dot below with a real Pixi sprite + GSAP tween along the
//  existing trajectory math already used by drawBall()/animateBall().
// ================================================================

const pixiRenderer = (function () {
    let app = null;
    let layers = {};
    let ready = false;

    // Base coordinate space matches the existing #pitch-canvas so that,
    // once real sprites arrive, positions translate 1:1 from state without
    // re-deriving any layout math. See CONVERSION_GUIDE.md Section 3 Step 9
    // for the responsive-scaling approach this will use.
    const BASE_WIDTH = 500;
    const BASE_HEIGHT = 560;

    async function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`pixiRenderer.init: #${containerId} not found`);
        if (typeof PIXI === 'undefined') throw new Error('pixiRenderer.init: PIXI not loaded (CDN blocked?)');

        app = new PIXI.Application();
        await app.init({
            resizeTo: container,
            backgroundAlpha: 0,   // fully transparent — existing canvas/SVG stays visible underneath
            antialias: true,
        });
        container.appendChild(app.canvas);

        // Layer order per CONVERSION_GUIDE.md Section 3 Step 3:
        // background -> pitch -> fielders -> bowler -> batsman -> ball
        // -> stumps -> fx (particles/flashes on top). Empty for now —
        // populated in later steps as sprite factories are built.
        layers.background = new PIXI.Container();
        layers.pitch = new PIXI.Container();
        layers.fielders = new PIXI.Container();
        layers.bowler = new PIXI.Container();
        layers.batsman = new PIXI.Container();
        layers.ball = new PIXI.Container();
        layers.stumps = new PIXI.Container();
        layers.fx = new PIXI.Container();
        Object.values(layers).forEach((l) => app.stage.addChild(l));

        buildDebugPlaceholder();
        fitStage();
        window.addEventListener('resize', fitStage);

        ready = true;
        showBadge('Pixi ✓ (Step 1 — blank layer, no art yet)');
    }

    // Keeps the 500x560 logical stage scaled/centered inside whatever size
    // resizeTo gives the canvas, so future sprite coordinates can be
    // authored against BASE_WIDTH/BASE_HEIGHT regardless of device size.
    function fitStage() {
        if (!app) return;
        const scale = Math.min(app.renderer.width / BASE_WIDTH, app.renderer.height / BASE_HEIGHT);
        app.stage.scale.set(scale);
        app.stage.position.set(
            (app.renderer.width - BASE_WIDTH * scale) / 2,
            (app.renderer.height - BASE_HEIGHT * scale) / 2
        );
    }

    // Purely a visual/functional smoke test — NOT part of the final game.
    // A faint dot that tracks state.ball's position when present, so it's
    // obvious from the live game screen that renderMatchFrame() is wired
    // up correctly. Delete once Step 2 (real ball sprite) lands.
    let debugDot = null;
    function buildDebugPlaceholder() {
        debugDot = new PIXI.Graphics().circle(0, 0, 6).fill({ color: 0xffeb3b, alpha: 0.85 });
        debugDot.visible = false;
        layers.fx.addChild(debugDot);
    }

    function showBadge(text) {
        const badge = document.getElementById('pixi-status-badge');
        if (!badge) return;
        badge.textContent = text;
        badge.style.display = 'block';
    }

    // ---- Public: called once per frame from the end of drawPitch() ------
    // Read-only with respect to `state`. Must never throw uncaught (the
    // call site in index5.html already wraps this in try/catch as a second
    // safety net, but keep it defensive here too).
    function renderMatchFrame(state) {
        if (!ready || !app) return;

        if (state && state.ball && typeof state.ball.x === 'number') {
            debugDot.visible = true;
            debugDot.position.set(state.ball.x, state.ball.y);
        } else {
            debugDot.visible = false;
        }

        // TODO (Step 3-8, one at a time — see CONVERSION_GUIDE.md Section 4):
        //  2. Real ball sprite + GSAP trajectory tween (replaces debugDot)
        //  3. Batsman sprite wired to shot-played events
        //  4. Bowler sprite + run-up animation
        //  5. Stumps-break + wicket particles
        //  6. Fielder dive + catch animation
        //  7. Four/six celebration particles
        //  8. Camera pan/zoom, screen shake, background parallax (optional)
    }

    return {
        init,
        renderMatchFrame,
        resize: fitStage,
        get app() { return app; },
        get layers() { return layers; },
    };
})();

window.pixiRenderer = pixiRenderer;
