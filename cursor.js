/* ---------- Cursor tijera ----------
   La tijera está renderizada en Blender (tijera.py): una hoja de cuadros con 72 posiciones de giro
   para cada uno de los 3 niveles de apertura. Acá solo se elige el cuadro según el estado:
   sobre links y botones gira despacio sobre su eje largo (de derecha a izquierda) y abre las hojas;
   al salir frena suave hasta quedar de frente. Si la imagen no carga, queda el cursor del sistema. */

// Todo va en su propio bloque para no chocar con las variables globales de script.js
(() => {
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SPRITE = "multimediz/tijera-sprite.webp";
  const SIZE = 84;                        // lado de cada cuadro en px CSS
  const HOTSPOT = { x: 10, y: 10 };       // dónde cae la punta de la tijera dentro del cuadro
  const COLUMNS = 18;                     // cuadros por fila en la hoja
  const SPIN_FRAMES = 72;                 // posiciones de giro por nivel de apertura (cada 5°)
  const OPEN_LEVELS = 3;                  // 0 = cerrada, 1 = reposo, 2 = abierta sobre clickeables
  const SPIN_SPEED = 1.15;                // velocidad de giro sobre clickeables (rad/s, una vuelta cada ~5,5 s)
  const TAU = Math.PI * 2;
  const CLICKABLE = "a, button, [role='button'], .clip, label, input, select, textarea";

  if (finePointer) {
    const sprite = new Image();
    sprite.onload = init;
    sprite.src = SPRITE;
  }

  function init() {
    const cursor = document.createElement("div");
    cursor.className = "scissors";
    cursor.setAttribute("aria-hidden", "true");
    document.body.append(cursor);
    document.documentElement.classList.add("has-scissors");

    const state = { angle: 0, velocity: 0, open: 1, snip: 0, hovering: false, sway: 0, swayVel: 0 };
    const pointer = { x: 0, y: 0, lastX: 0 };
    let visible = false;
    let currentFrame = -1;

    addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!visible) {
        visible = true;
        pointer.lastX = pointer.x;
        cursor.classList.add("is-visible");
      }
      place();
    }, { passive: true });

    document.addEventListener("pointerleave", () => {
      visible = false;
      cursor.classList.remove("is-visible");
    });

    document.addEventListener("pointerover", (event) => {
      state.hovering = Boolean(event.target.closest(CLICKABLE));
    });

    // Al hacer clic las hojas cierran y abren, como un corte
    addEventListener("pointerdown", () => { state.snip = 1; });

    // El balanceo gira el cuadro alrededor de la punta, así la punta sigue exacta sobre el mouse
    function place() {
      cursor.style.transform = `translate3d(${pointer.x - HOTSPOT.x}px, ${pointer.y - HOTSPOT.y}px, 0) rotate(${state.sway}rad)`;
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (state.hovering && !reducedMotion) {
        // Acelera de a poco hasta la velocidad de giro, en sentido de derecha a izquierda
        state.velocity += (-SPIN_SPEED - state.velocity) * Math.min(dt * 1.6, 1);
        state.angle += state.velocity * dt;
      } else {
        // Frena con un resorte suave hasta la vuelta completa más cercana en el sentido del giro
        const rest = Math.floor(state.angle / TAU + 0.02) * TAU;
        state.velocity += ((rest - state.angle) * 9 - state.velocity * 5.5) * dt;
        state.angle += state.velocity * dt;
      }

      // Balanceo con inercia: al mover el mouse de costado la tijera se inclina y vuelve, como si colgara del puntero
      if (!reducedMotion) {
        const push = Math.max(-0.35, Math.min(0.35, (pointer.x - pointer.lastX) * 0.012));
        pointer.lastX = pointer.x;
        state.swayVel += (-state.sway * 60 - state.swayVel * 9) * dt - push;
        state.sway += state.swayVel * dt;
        place();
      }

      const targetOpen = state.hovering ? 2 : 1;
      state.open += (targetOpen - state.open) * Math.min(dt * 6, 1);
      state.snip = Math.max(0, state.snip - dt * 5);
      const open = state.open * (1 - Math.sin(state.snip * Math.PI));

      // Cuadro según apertura y ángulo (los cuadros están renderizados girando en sentido negativo)
      const level = Math.round(Math.max(0, Math.min(OPEN_LEVELS - 1, open)));
      const turn = ((-state.angle / TAU) % 1 + 1) % 1;
      const index = level * SPIN_FRAMES + Math.round(turn * SPIN_FRAMES) % SPIN_FRAMES;
      if (index !== currentFrame) {
        currentFrame = index;
        cursor.style.backgroundPosition = `${-(index % COLUMNS) * SIZE}px ${-Math.floor(index / COLUMNS) * SIZE}px`;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
