"use client";
import * as React from "react";
/* The character's sheet. Every coordinate in the figure lives in this box. */
const CW = 600;
const CH = 720;
/* --------------------------------------------------------------- the gaze
   The figure is flat SVG. What sells it as a head turning is parallax: the
   features ride on top of the skull and move further than it does, the nose
   sits proud of the face and moves further still, and the ears go the other
   way and foreshorten. Nothing here is 3D maths — it is a stack of layers
   whose offsets are ordered by how far each one sits from the neck. */
// #region gaze
/**
 * Where the pointer is, relative to the head, as a direction in (-1, 1) on
 * each axis. Soft-saturated rather than clamped, so the head never slams into
 * a stop: it keeps turning a little further the further away you go.
 */
export function aim(px, py, cx, cy, rx, ry) {
    const sat = (v) => v / Math.sqrt(1 + v * v);
    return [sat((px - cx) / rx), sat((py - cy) / ry)];
}
/** Frame-rate-independent easing of `cur` towards `target`. */
export function approach(cur, target, dt, rate) {
    return target + (cur - target) * Math.exp(-rate * dt);
}
/**
 * How far each layer moves for a gaze of (x, y). Offsets are in figure units
 * and nested: `face` is relative to `head`, `nose` and `eyes` to `face`.
 * `near` is 0..1, how close the pointer is to the face — it widens the eyes
 * and lifts the brows.
 */
export function pose(x, y, near) {
    return {
        body: { dx: x * 4, dy: 0 },
        head: { dx: x * 10, dy: y * 7, rot: x * 4 },
        ears: { dx: -x * 7, dy: -y * 3, lead: 1 + x * 0.16, trail: 1 - x * 0.16 },
        beanie: { dx: x * 13, dy: y * 4 },
        tag: { dx: x * 7, dy: 0 },
        blush: { dx: x * 20, dy: y * 14 },
        face: { dx: x * 28, dy: y * (y < 0 ? 11 : 20) },
        nose: { dx: x * 10, dy: y * 7 },
        eyes: { dx: x * 4, dy: y * 4, scale: 1 + near * 0.14 },
        brows: { dx: x * 3, dy: y * 2 + Math.min(0, y) * 3 - near * 9 },
    };
}
/** Blink envelope: 1 is open, dips towards 0.08 across a 150ms blink. */
export function blink(since) {
    const d = 0.15;
    if (since < 0 || since > d)
        return 1;
    return 1 - Math.sin((Math.PI * since) / d) * 0.92;
}
/**
 * A one-point-perspective room in a 1000x1000 box that is stretched to fill
 * the hero. The back wall is a grid; every grid line on its edge runs out to
 * the frame away from the vanishing point; the depth lines are the back wall
 * scaled up about that point. Stretching distorts it, which is fine — it is a
 * room, and a taller screen just gets a taller one.
 */
function room() {
    const x0 = 95;
    const x1 = 905;
    const y0 = 85;
    const y1 = 865;
    const vx = (x0 + x1) / 2;
    const vy = (y0 + y1) / 2;
    const cols = 14;
    const rows = 11;
    const back = [];
    const rays = [];
    const out = (x, y) => {
        // Walk from (x, y) away from the vanishing point until the frame.
        const dx = x - vx;
        const dy = y - vy;
        const tx = dx > 0 ? (1000 - x) / dx : dx < 0 ? -x / dx : Infinity;
        const ty = dy > 0 ? (1000 - y) / dy : dy < 0 ? -y / dy : Infinity;
        const t = Math.min(tx, ty);
        return [x, y, x + dx * t, y + dy * t];
    };
    for (let i = 0; i <= cols; i++) {
        const x = x0 + ((x1 - x0) * i) / cols;
        back.push([x, y0, x, y1]);
        rays.push(out(x, y0), out(x, y1));
    }
    for (let j = 0; j <= rows; j++) {
        const y = y0 + ((y1 - y0) * j) / rows;
        back.push([x0, y, x1, y]);
        rays.push(out(x0, y), out(x1, y));
    }
    const depth = [1.07, 1.16, 1.28, 1.45, 1.7].map((s) => {
        const l = vx + (x0 - vx) * s;
        const r = vx + (x1 - vx) * s;
        const t = vy + (y0 - vy) * s;
        const b = vy + (y1 - vy) * s;
        return "M" + l + " " + t + "H" + r + "V" + b + "H" + l + "Z";
    });
    return { back, rays, depth };
}
const ROOM = room();
const DEFAULT_GREETINGS = ["Hi there!", "Let's make something bold.", "Psst — I'm open to work.", "Okay, you can stop poking me :)"];
export default function MascotPortfolioHero({
    greetings = DEFAULT_GREETINGS,
    skin = "#f7cfb0", beanie = "#1d1d1f", shirt = "#18181a", tag = "#b98158"
}) {
    // Gradient and filter ids are global. Two heroes on one page would otherwise
    // share them and the second mount would repaint the first.
    const uid = React.useId().replace(/:/g, "");
    const id = (n) => n + uid;
    const u = (n) => "url(#" + id(n) + ")";
    const rootRef = React.useRef(null);
    const charRef = React.useRef(null);
    const layers = React.useRef({});
    const set = (k) => (el) => {
        layers.current[k] = el;
    };
    const [happy, setHappy] = React.useState(false);
    const [said, setSaid] = React.useState(-1);
    const happyTimer = React.useRef(undefined);
    const poke = () => {
        setSaid((n) => (n + 1) % Math.max(1, greetings.length));
        setHappy(true);
        window.clearTimeout(happyTimer.current);
        happyTimer.current = window.setTimeout(() => setHappy(false), 2200);
    };
    React.useEffect(() => () => window.clearTimeout(happyTimer.current), []);
    /* The loop. Everything the pointer drives is written straight to the SVG —
       running it through React state would re-render the whole poster at 60fps. */
    React.useEffect(() => {
        const root = rootRef.current;
        const char = charRef.current;
        if (!root || !char)
            return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        let still = mq.matches;
        const onMq = () => (still = mq.matches);
        mq.addEventListener("change", onMq);
        let px = 0;
        let py = 0;
        let lastMove = -1e9;
        let gx = 0;
        let gy = 0;
        let near = 0;
        let prev = performance.now();
        let nextBlink = prev + 1800;
        let blinkAt = -1e9;
        let raf = 0;
        let visible = true;
        const onMove = (e) => {
            px = e.clientX;
            py = e.clientY;
            lastMove = performance.now();
        };
        const onLeave = () => (lastMove = -1e9);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
        window.addEventListener("blur", onLeave);
        const tr = (dx, dy) => "translate(" + dx.toFixed(2) + " " + dy.toFixed(2) + ")";
        const L = layers.current;
        const frame = (now) => {
            raf = requestAnimationFrame(frame);
            if (!visible)
                return;
            const dt = Math.min(0.05, (now - prev) / 1000);
            prev = now;
            const r = char.getBoundingClientRect();
            // The head, not the box: the face sits at about 50% across and 48% down.
            const cx = r.left + r.width * 0.5;
            const cy = r.top + r.height * 0.48;
            let tx = 0;
            let ty = 0;
            let tn = 0;
            const idle = now - lastMove > 3500;
            if (!still && !idle) {
                const reach = Math.max(innerWidth, innerHeight);
                [tx, ty] = aim(px, py, cx, cy, reach * 0.3, reach * 0.26);
                const dist = Math.hypot(px - cx, py - cy);
                tn = Math.max(0, 1 - dist / (r.width * 0.45));
            }
            else if (!still) {
                // Nobody is there: look around the room on its own.
                const t = now / 1000;
                tx = Math.sin(t * 0.45) * 0.55 + Math.sin(t * 1.1) * 0.1;
                ty = Math.sin(t * 0.31 + 1) * 0.25;
            }
            const rate = still ? 30 : 7;
            gx = approach(gx, tx, dt, rate);
            gy = approach(gy, ty, dt, rate);
            near = approach(near, tn, dt, 8);
            const p = pose(gx, gy, near);
            const breathe = still ? 0 : Math.sin(now / 620) * 1.6;
            if (!still && now > nextBlink) {
                blinkAt = now;
                // Now and then a double blink, the way people actually do it.
                nextBlink = now + (Math.random() < 0.2 ? 260 : 2200 + Math.random() * 3200);
            }
            const open = still ? 1 : blink((now - blinkAt) / 1000);
            L.body?.setAttribute("transform", tr(p.body.dx, p.body.dy + breathe * 0.4));
            L.head?.setAttribute("transform", tr(p.head.dx, p.head.dy + breathe) + " rotate(" + p.head.rot.toFixed(2) + " 300 560)");
            L.earL?.setAttribute("transform", tr(p.ears.dx, p.ears.dy) + " translate(138 380) scale(" + p.ears.lead.toFixed(3) + " 1) translate(-138 -380)");
            L.earR?.setAttribute("transform", tr(p.ears.dx, p.ears.dy) + " translate(462 380) scale(" + p.ears.trail.toFixed(3) + " 1) translate(-462 -380)");
            L.beanie?.setAttribute("transform", tr(p.beanie.dx, p.beanie.dy));
            L.tag?.setAttribute("transform", tr(p.tag.dx, p.tag.dy));
            L.blush?.setAttribute("transform", tr(p.blush.dx, p.blush.dy));
            L.face?.setAttribute("transform", tr(p.face.dx, p.face.dy));
            L.nose?.setAttribute("transform", tr(p.nose.dx, p.nose.dy));
            L.brows?.setAttribute("transform", tr(p.brows.dx, p.brows.dy));
            L.eyes?.setAttribute("transform", tr(p.eyes.dx, p.eyes.dy) +
                " translate(300 350) scale(" + p.eyes.scale.toFixed(3) + " " + (p.eyes.scale * open).toFixed(3) + ") translate(-300 -350)");
        };
        raf = requestAnimationFrame(frame);
        // Offscreen, the loop keeps its slot but does no work.
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
            prev = performance.now();
        });
        io.observe(root);
        return () => {
            cancelAnimationFrame(raf);
            io.disconnect();
            mq.removeEventListener("change", onMq);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerdown", onMove);
            document.documentElement.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("blur", onLeave);
        };
    }, []);
    const greeting = greetings.length ? greetings[Math.max(0, said) % greetings.length] : "Hi there!";
    return (<div ref={rootRef} className="mascot-wrap"><button ref={charRef} type="button" className={"mph-char" + (happy ? " mph-happy" : "")} onClick={poke} aria-label="Say hi to the character">
          <svg viewBox={"0 0 " + CW + " " + CH} aria-hidden="true">
            <defs>
              {/* Shading is layered over a flat fill rather than baked into it,
            so every colour prop still reads as lit and round. */}
              <radialGradient id={id("shade")} cx="46%" cy="40%" r="62%">
                <stop offset="0.55" stopColor="#7a2e14" stopOpacity="0"/>
                <stop offset="1" stopColor="#7a2e14" stopOpacity="0.34"/>
              </radialGradient>
              <radialGradient id={id("hi")} cx="36%" cy="30%" r="42%">
                <stop offset="0" stopColor="#fff" stopOpacity="0.55"/>
                <stop offset="1" stopColor="#fff" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id={id("blush")}>
                <stop offset="0" stopColor="#ff6f6f" stopOpacity="0.55"/>
                <stop offset="1" stopColor="#ff6f6f" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id={id("knit")} cx="38%" cy="22%" r="80%">
                <stop offset="0" stopColor="#fff" stopOpacity="0.2"/>
                <stop offset="0.6" stopColor="#fff" stopOpacity="0"/>
                <stop offset="1" stopColor="#000" stopOpacity="0.35"/>
              </radialGradient>
              <radialGradient id={id("eye")} cx="40%" cy="35%" r="70%">
                <stop offset="0" stopColor="#3a3a3c"/>
                <stop offset="1" stopColor="#050505"/>
              </radialGradient>
              <radialGradient id={id("nose")} cx="42%" cy="36%" r="66%">
                <stop offset="0" stopColor="#ff9c82" stopOpacity="0.18"/>
                <stop offset="1" stopColor="#b8583a" stopOpacity="0.42"/>
              </radialGradient>
              <linearGradient id={id("neck")} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#6b2a14" stopOpacity="0.45"/>
                <stop offset="0.5" stopColor="#6b2a14" stopOpacity="0.08"/>
              </linearGradient>
              <linearGradient id={id("cloth")} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.1"/>
                <stop offset="1" stopColor="#000" stopOpacity="0.3"/>
              </linearGradient>
              {/* Knit fuzz: the beanie's edge is roughed so it reads as wool,
            not a plastic cap. */}
              <filter id={id("fuzz")} x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
                <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              <clipPath id={id("mouth")}>
                <path d="M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z"/>
              </clipPath>
              <clipPath id={id("cuff")}>
                <path d="M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z"/>
              </clipPath>
            </defs>

            {/* Contact shadow on the floor. */}
            <ellipse cx="300" cy="712" rx="250" ry="16" fill="#000" opacity="0.08"/>

            <g ref={set("body")}>
              <path d="M28 730 C40 646 104 604 206 588 L394 588 C496 604 560 646 572 730 Z" fill={shirt}/>
              <path d="M28 730 C40 646 104 604 206 588 L394 588 C496 604 560 646 572 730 Z" fill={u("cloth")}/>
              {/* Neck, with the chin's shadow falling on it. */}
              <path d="M246 500 L354 500 L360 600 Q300 624 240 600 Z" fill={skin}/>
              <path d="M246 500 L354 500 L360 600 Q300 624 240 600 Z" fill={u("neck")}/>
              {/* Polo collar and placket. */}
              <path d="M236 566 Q262 604 300 628 L250 668 Q214 628 194 594 Z" fill={shirt}/>
              <path d="M364 566 Q338 604 300 628 L350 668 Q386 628 406 594 Z" fill={shirt}/>
              <path d="M236 566 Q262 604 300 628 L250 668 Q214 628 194 594 Z M364 566 Q338 604 300 628 L350 668 Q386 628 406 594 Z" fill="#fff" opacity="0.07" stroke="#000" strokeOpacity="0.4" strokeWidth="2"/>
              <rect x="288" y="628" width="24" height="102" fill="#fff" opacity="0.05" stroke="#000" strokeOpacity="0.35" strokeWidth="2"/>
              <circle cx="300" cy="656" r="6" fill="#2a2a2c" stroke="#000" strokeOpacity="0.5"/>
              <circle cx="300" cy="698" r="6" fill="#2a2a2c" stroke="#000" strokeOpacity="0.5"/>
            </g>

            <g ref={set("head")}>
              <g ref={set("earL")}>
                <ellipse cx="138" cy="380" rx="46" ry="60" fill={skin}/>
                <ellipse cx="138" cy="380" rx="46" ry="60" fill={u("shade")}/>
                <path d="M150 348 Q118 360 124 392 Q130 416 150 414" fill="none" stroke="#a24c2e" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round"/>
                <ellipse cx="136" cy="392" rx="24" ry="22" fill={u("blush")}/>
              </g>
              <g ref={set("earR")}>
                <ellipse cx="462" cy="380" rx="46" ry="60" fill={skin}/>
                <ellipse cx="462" cy="380" rx="46" ry="60" fill={u("shade")}/>
                <path d="M450 348 Q482 360 476 392 Q470 416 450 414" fill="none" stroke="#a24c2e" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round"/>
                <ellipse cx="464" cy="392" rx="24" ry="22" fill={u("blush")}/>
              </g>

              {/* Skull and face. */}
              <path d="M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z" fill={skin}/>
              <path d="M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z" fill={u("shade")}/>
              <path d="M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z" fill={u("hi")}/>

              <g ref={set("blush")}>
                <ellipse cx="190" cy="430" rx={happy ? 50 : 44} ry={happy ? 34 : 30} fill={u("blush")}/>
                <ellipse cx="410" cy="430" rx={happy ? 50 : 44} ry={happy ? 34 : 30} fill={u("blush")}/>
              </g>

              <g ref={set("face")}>
                <g ref={set("brows")}>
                  <path d={happy ? "M198 292 Q230 270 264 286" : "M198 300 Q230 282 264 294"} fill="none" stroke="#3b2518" strokeWidth="22" strokeLinecap="round"/>
                  <path d={happy ? "M336 286 Q370 270 402 292" : "M336 294 Q370 282 402 300"} fill="none" stroke="#3b2518" strokeWidth="22" strokeLinecap="round"/>
                </g>

                <g ref={set("eyes")}>
                  {happy ? (<>
                      <path d="M214 356 Q240 324 266 356" fill="none" stroke="#111" strokeWidth="13" strokeLinecap="round"/>
                      <path d="M334 356 Q360 324 386 356" fill="none" stroke="#111" strokeWidth="13" strokeLinecap="round"/>
                    </>) : (<>
                      <ellipse cx="240" cy="350" rx="25" ry="31" fill={u("eye")}/>
                      <circle cx="231" cy="336" r="8.5" fill="#fff"/>
                      <circle cx="250" cy="361" r="3.5" fill="#fff" opacity="0.8"/>
                      <ellipse cx="360" cy="350" rx="25" ry="31" fill={u("eye")}/>
                      <circle cx="351" cy="336" r="8.5" fill="#fff"/>
                      <circle cx="370" cy="361" r="3.5" fill="#fff" opacity="0.8"/>
                    </>)}
                </g>

                {/* Beauty mark — a little star on the cheek. */}
                <path d="M420 382 L423.5 391 L433 391.5 L425.6 397.5 L428.2 406.8 L420 401.5 L411.8 406.8 L414.4 397.5 L407 391.5 L416.5 391 Z" fill="#2a1a14"/>

                {/* The grin. */}
                <g transform={happy ? "translate(300 440) scale(1.06 1.12) translate(-300 -440)" : undefined}>
                  <path d="M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z" fill="#3d0f0f"/>
                  <g clipPath={u("mouth")}>
                    <ellipse cx="300" cy="530" rx="46" ry="22" fill="#d9575a"/>
                    <path d="M210 436 Q300 456 390 436 L390 474 Q300 490 210 474 Z" fill="#fff"/>
                    <path d="M236 516 Q300 500 364 516 L364 540 L236 540 Z" fill="#f3efe9"/>
                    <path d="M262 452 V484 M300 456 V488 M338 452 V484" stroke="#000" strokeOpacity="0.08" strokeWidth="2"/>
                  </g>
                  <path d="M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z" fill="none" stroke="#8a3524" strokeOpacity="0.45" strokeWidth="3"/>
                  <path d="M208 432 Q212 442 220 446 M392 432 Q388 442 380 446" fill="none" stroke="#a24c2e" strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round"/>
                </g>

                <g ref={set("nose")}>
                  <ellipse cx="300" cy="414" rx="28" ry="12" fill="#6b2a14" opacity="0.14"/>
                  <ellipse cx="300" cy="398" rx="29" ry="26" fill={skin}/>
                  <ellipse cx="300" cy="398" rx="29" ry="26" fill={u("nose")}/>
                  <ellipse cx="291" cy="387" rx="10" ry="8" fill="#fff" opacity="0.45"/>
                </g>
              </g>

              <g ref={set("beanie")}>
                {/* Sits a little high on the skull, so the brows have forehead under the cuff. */}
                <g transform="translate(0 -22)">
                  <g filter={u("fuzz")}>
                    <path d="M126 300 C112 168 196 88 300 88 C404 88 488 168 474 300 Z" fill={beanie}/>
                    <path d="M126 300 C112 168 196 88 300 88 C404 88 488 168 474 300 Z" fill={u("knit")}/>
                    <path d="M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z" fill={beanie}/>
                    <g clipPath={u("cuff")} stroke="#fff" strokeOpacity="0.08" strokeWidth="5">
                      {Array.from({ length: 34 }, (_, i) => (<line key={i} x1={112 + i * 11.4} y1="220" x2={112 + i * 11.4} y2="330"/>))}
                    </g>
                    <path d="M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z" fill="#000" opacity="0.18"/>
                    <path d="M112 292 Q300 254 488 292" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="3"/>
                  </g>
                  <g ref={set("tag")}>
                    <g className="mph-tagwig">
                      <g transform="rotate(-7 190 272)">
                        <rect x="172" y="238" width="36" height="64" rx="5" fill={tag}/>
                        <rect x="172" y="238" width="36" height="64" rx="5" fill={u("cloth")}/>
                        <rect x="177" y="243" width="26" height="54" rx="3" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" strokeDasharray="3 3"/>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </svg>
          <span className="mph-bubble" data-on={happy ? "true" : "false"} aria-live="polite">
            {greeting}
          </span>
        </button></div>);
}

export function Room(){return <svg className="room" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.13">{[...ROOM.back,...ROOM.rays].map((s,i)=><line key={i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]}/>)}{ROOM.depth.map((d,i)=><path key={i} d={d}/>)}</g></svg>}