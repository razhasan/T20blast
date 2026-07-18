// ================================================================
//  PIXI RENDERER — owns the Pixi layer only. Reads `state` from the
//  existing game (index5.html) and draws it. NEVER mutates game
//  state — it is called from the end of drawPitch(), which remains
//  the authoritative, unmodified game render.
//
//  STATUS: CONVERSION_GUIDE.md build-order Step 2 (real ball sprite +
//  trajectory) PLUS a chunk of Step 5/7 (wicket dust+shake, four/six
//  particle bursts) — grouped together here because none of them
//  need character sprite artwork, so they're all "free" visual wins
//  right now using flat-color placeholders (per ASSET_SPEC.md's
//  "Placeholder strategy"). Batsman/bowler/fielder/umpire sprites are
//  still not started — that's Steps 3/4/6, which do need real art.
//
//  Effects are triggered from the single existing showResultBanner()
//  call site in index5.html (covers all ~10 four/six/out call sites
//  in the game without touching any of them), and from renderMatchFrame
//  mirroring state.ball / state.outBall every frame.
// ================================================================

const pixiRenderer = (function () {
    let app = null;
    let world = null;          // everything scales/shakes together inside this
    let layers = {};
    let ready = false;

    const BASE_WIDTH = 500;
    const BASE_HEIGHT = 560;
    // Matches the striker's stumps position computed in drawPitch()
    // (stumpX = W*0.48, stumpY = H*0.76) — kept as a constant here since
    // that layout is fixed, not per-frame data from `state`.
    const STUMP_POS = { x: BASE_WIDTH * 0.48 + 6, y: BASE_HEIGHT * 0.76 + 10 };

    const basePos = { x: 0, y: 0 };
    const shakeOffset = { x: 0, y: 0 };

    async function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`pixiRenderer.init: #${containerId} not found`);
        if (typeof PIXI === 'undefined') throw new Error('pixiRenderer.init: PIXI not loaded (CDN blocked?)');

        app = new PIXI.Application();
        await app.init({
            resizeTo: container,
            backgroundAlpha: 0,   // transparent — existing canvas/SVG stays visible underneath
            antialias: true,
        });
        container.appendChild(app.canvas);

        world = new PIXI.Container();
        app.stage.addChild(world);

        // Layer order per CONVERSION_GUIDE.md Section 3 Step 3.
        layers.background = new PIXI.Container();
        layers.pitch = new PIXI.Container();
        layers.fielders = new PIXI.Container();
        layers.bowler = new PIXI.Container();
        layers.batsman = new PIXI.Container();
        layers.ball = new PIXI.Container();
        layers.stumps = new PIXI.Container();
        layers.fx = new PIXI.Container();
        Object.values(layers).forEach((l) => world.addChild(l));

        buildBallSprite();
        buildOutBallSprite();
        fitStage();
        window.addEventListener('resize', fitStage);
        app.ticker.add(updateParticles);

        ready = true;
        showBadge('Pixi ✓ (Step 2 — animated ball + fx, no character art yet)');
    }

    function fitStage() {
        if (!app || !world) return;
        // Match the underlying #pitch-canvas exactly: it's drawn at a fixed
        // 500x560 internal resolution but stretched by CSS to fill its
        // container (width:100%, height:68vh) — NOT uniformly, so we mirror
        // that same non-uniform stretch here rather than letterboxing.
        // This keeps every state.ball.x/y coordinate lined up 1:1 with
        // where the old canvas would have drawn it.
        const scaleX = app.renderer.width / BASE_WIDTH;
        const scaleY = app.renderer.height / BASE_HEIGHT;
        world.scale.set(scaleX, scaleY);
        basePos.x = 0;
        basePos.y = 0;
        applyWorldPosition();
    }

    function applyWorldPosition() {
        if (!world) return;
        world.position.set(basePos.x + shakeOffset.x, basePos.y + shakeOffset.y);
    }

    function showBadge(text) {
        const badge = document.getElementById('pixi-status-badge');
        if (!badge) return;
        badge.textContent = text;
        badge.style.display = 'block';
    }

    // ---- Ball sprite (Step 2) -------------------------------------------
    // Placeholder art (no PNG needed): a small layered-gradient-look circle
    // built from a few flat shapes, redrawn cheaply each frame, plus a
    // pooled fading trail. Swap for a real AnimatedSprite once
    // assets/ball/ball.png exists — nothing else here needs to change.
    let ballGfx = null;
    const TRAIL_POOL_SIZE = 16;
    let trailPool = [];
    let lastBallPos = { x: STUMP_POS.x, y: STUMP_POS.y };

    function buildBallSprite() {
        ballGfx = new PIXI.Graphics();
        ballGfx.visible = false;
        layers.ball.addChild(ballGfx);

        for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
            const g = new PIXI.Graphics();
            g.visible = false;
            layers.ball.addChildAt(g, 0); // trail sits beneath the ball
            trailPool.push(g);
        }
    }

    function drawBallGraphic(g) {
        g.clear();
        g.circle(0, 0, 7).fill({ color: 0xffffff });
        g.circle(0, 0, 7).fill({ color: 0xc9c9c9, alpha: 0.25 });
        g.circle(-2.3, -2.3, 1.8).fill({ color: 0xffffff, alpha: 0.95 });
        g.stroke({ width: 1.2, color: 0xe53935 });
        g.arc(0, 0, 5, Math.PI * 0.15, Math.PI * 0.85);
        g.arc(0, 0, 5, Math.PI * 1.15, Math.PI * 1.85);
    }

    let outBallGfx = null;
    function buildOutBallSprite() {
        outBallGfx = new PIXI.Graphics();
        outBallGfx.visible = false;
        drawBallGraphic(outBallGfx);
        layers.ball.addChild(outBallGfx);
    }

    function positionBallAndTrail(b) {
        if (!ballGfx.visible) drawBallGraphic(ballGfx);
        ballGfx.visible = true;
        ballGfx.position.set(b.x, b.y);
        // Cheap spin: rotate based on distance moved since last frame.
        const dx = b.x - lastBallPos.x, dy = b.y - lastBallPos.y;
        ballGfx.rotation += Math.hypot(dx, dy) * 0.04;
        lastBallPos = { x: b.x, y: b.y };

        const trail = b.trail || [];
        for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
            const g = trailPool[i];
            const t = trail[i];
            if (!t) { g.visible = false; continue; }
            g.visible = true;
            g.clear();
            g.circle(0, 0, 4).fill({ color: 0xffffff, alpha: (i / trail.length) * 0.25 });
            g.position.set(t.x, t.y);
        }
    }

    function hideBallAndTrail() {
        ballGfx.visible = false;
        trailPool.forEach((g) => { g.visible = false; });
    }

    // ---- Particle / screen-shake effects pack (Step 5 & 7 subset) -------
    // A small generic particle pool — flat-color squares/circles, gravity +
    // fade, no textures required. Triggered from triggerEffect(type) below.
    let particles = [];

    function spawnBurst(x, y, opts) {
        const {
            count = 18, colors = [0xffd54f, 0xffffff, 0xff7043],
            speed = 4, spread = Math.PI * 2, gravity = 0.12,
            life = 45, size = 4, shape = 'rect',
        } = opts;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * spread - spread / 2 - Math.PI / 2;
            const v = speed * (0.5 + Math.random() * 0.8);
            const g = new PIXI.Graphics();
            const color = colors[Math.floor(Math.random() * colors.length)];
            if (shape === 'rect') g.rect(-size / 2, -size / 2, size, size).fill({ color });
            else g.circle(0, 0, size / 2).fill({ color, alpha: 0.8 });
            g.position.set(x, y);
            g.rotation = Math.random() * Math.PI * 2;
            layers.fx.addChild(g);
            particles.push({
                gfx: g,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                gravity, life, maxLife: life,
                spin: (Math.random() - 0.5) * 0.3,
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.vy += p.gravity;
            p.gfx.position.x += p.vx;
            p.gfx.position.y += p.vy;
            p.gfx.rotation += p.spin;
            p.life -= 1;
            p.gfx.alpha = Math.max(0, p.life / p.maxLife);
            if (p.life <= 0) {
                layers.fx.removeChild(p.gfx);
                p.gfx.destroy();
                particles.splice(i, 1);
            }
        }
    }

    function screenShake(magnitude = 6, duration = 0.32) {
        if (typeof gsap === 'undefined') { return; } // no GSAP CDN? skip shake, everything else still works
        gsap.killTweensOf(shakeOffset);
        const tl = gsap.timeline({
            onUpdate: applyWorldPosition,
            onComplete: () => { shakeOffset.x = 0; shakeOffset.y = 0; applyWorldPosition(); },
        });
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            const decay = 1 - i / steps;
            tl.to(shakeOffset, {
                x: (Math.random() * 2 - 1) * magnitude * decay,
                y: (Math.random() * 2 - 1) * magnitude * decay,
                duration: duration / steps,
                ease: 'sine.inOut',
            });
        }
    }

    // ---- Public: triggered from showResultBanner(text, type) ------------
    function triggerEffect(type) {
        if (!ready) return;
        const origin = lastBallPos;
        if (type === 'six') {
            spawnBurst(origin.x, origin.y, {
                count: 34, colors: [0xffd54f, 0xffffff, 0xff7043, 0x4fc3f7],
                speed: 6.5, life: 55, size: 5,
            });
            screenShake(7, 0.35);
        } else if (type === 'four') {
            spawnBurst(origin.x, origin.y, {
                count: 16, colors: [0xffffff, 0xffd54f], speed: 4, life: 35, size: 4,
            });
        } else if (type === 'out') {
            spawnBurst(STUMP_POS.x, STUMP_POS.y, {
                count: 14, colors: [0xd7ccc8, 0xbcaaa4], speed: 2.4,
                gravity: 0.02, life: 40, size: 6, shape: 'circle', spread: Math.PI,
            });
            screenShake(9, 0.4);
        }
    }

    // ---- Public: called once per frame from the end of drawPitch() ------
    function renderMatchFrame(state) {
        if (!ready || !app) return;

        if (state && state.ball && typeof state.ball.x === 'number') {
            positionBallAndTrail(state.ball);
        } else {
            hideBallAndTrail();
        }

        if (state && state.outBall && typeof state.outBall.x === 'number') {
            outBallGfx.visible = true;
            outBallGfx.position.set(state.outBall.x, state.outBall.y);
            lastBallPos = { x: state.outBall.x, y: state.outBall.y };
        } else {
            outBallGfx.visible = false;
        }

        // TODO (Step 3/4/6 — need real sprite art, see ASSET_SPEC.md):
        //  3. Batsman sprite wired to shot-played events
        //  4. Bowler sprite + run-up animation
        //  6. Fielder dive + catch animation
        //  8. Camera pan/zoom, background parallax (optional)
    }

    return {
        init,
        renderMatchFrame,
        triggerEffect,
        isBallActive: () => ready,
        resize: fitStage,
        get app() { return app; },
        get layers() { return layers; },
    };
})();

window.pixiRenderer = pixiRenderer;
