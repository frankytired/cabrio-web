/* ---------- Configuración ---------- */
const WHATSAPP = "5491125916083"; // Número del local, formato internacional sin "+"
// Horario del local por día de la semana (0 = domingo), en horas decimales. Los días que no figuran están cerrados
const SCHEDULE = { 1: [10, 20], 2: [10, 20], 3: [10, 20], 4: [10, 20], 5: [10, 20], 6: [10, 19] };
// Franjas de cada estilista (10.5 = 10:30). Se recortan al horario del local de ese día.
// El último turno arranca media hora antes del fin de cada franja
const BARBER_HOURS = {
  Pablo: [[10.5, 13.5], [16, 19.5]],
  Franky: [[12, 24]],
  Aixa: [[12, 24]],
};
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 7;
const STEPS = 5;
const LOAD_TIME = 2600;

const root = document.documentElement;
const $ = (selector, ctx = document) => ctx.querySelector(selector);
const $$ = (selector, ctx = document) => [...ctx.querySelectorAll(selector)];
const lerp = (from, to, t) => from + (to - from) * t;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

root.classList.add("js");

/* ---------- Tema de color ---------- */
// "noche" es el tema por defecto; el que elige el visitante queda guardado en su navegador
const THEME_KEY = "cabrio-tema";
const themeButtons = $$("[data-theme-set]");

function setTheme(name) {
  root.dataset.theme = name;
  themeButtons.forEach((btn) => btn.setAttribute("aria-pressed", btn.dataset.themeSet === name));
  try { localStorage.setItem(THEME_KEY, name); } catch {}
}

let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch {}
setTheme(savedTheme || "noche");
themeButtons.forEach((btn) => btn.addEventListener("click", () => setTheme(btn.dataset.themeSet)));

/* ---------- Preloader ---------- */
// Avanza de 0 a 1 con una curva suave en ambos extremos: actualiza el contador y --load (relleno del logo y barra).
// Arranca recién cuando el logo está decodificado, para que el relleno no empiece sobre una imagen vacía.
// Al llegar a 1 hace la pasada de brillo (.is-full) y después abre el preloader y libera el hero
const preloader = $(".preloader");
const counter = $(".preloader__count");
const SHINE_MS = 900;
let loadStart = 0;

function tickLoader(now) {
  const t = reducedMotion ? 1 : clamp((now - loadStart) / LOAD_TIME);
  const progress = 0.5 - Math.cos(t * Math.PI) / 2;
  counter.textContent = Math.round(progress * 100);
  preloader.style.setProperty("--load", progress);
  if (t < 1) return requestAnimationFrame(tickLoader);
  preloader.classList.add("is-full");
  setTimeout(() => root.classList.add("is-loaded"), reducedMotion ? 0 : SHINE_MS);
}

Promise.all($$(".preloader__logo img").map((img) => img.decode().catch(() => {}))).then(() => {
  loadStart = performance.now();
  requestAnimationFrame(tickLoader);
});

/* ---------- Header y menú móvil ---------- */
const header = $(".header");
const burger = $(".header__burger");

const setMenu = (open) => {
  document.body.classList.toggle("menu-open", open);
  burger.setAttribute("aria-expanded", open);
};
burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
$$(".nav a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

/* ---------- Manifiesto ---------- */
// Manifiesto: palabras sueltas que se encienden según el scroll
const manifesto = $("[data-words]");
const words = manifesto.textContent.trim().split(/\s+/).map((word) => {
  const span = document.createElement("span");
  span.className = "word";
  span.textContent = `${word} `;
  return span;
});
manifesto.replaceChildren(...words);
let litWords = -1;

/* ---------- Aparición al hacer scroll ---------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.15 });
$$("[data-reveal]").forEach((el) => observer.observe(el));

/* ---------- Galería horizontal ---------- */
const gallery = $(".gallery");
const track = $(".gallery__track");
let galleryDistance = 0;

// En escritorio la sección se alarga lo que mide el recorrido horizontal
function sizeGallery() {
  const pinned = !reducedMotion && innerWidth > 860;
  gallery.classList.toggle("is-pinned", pinned);
  galleryDistance = pinned ? track.scrollWidth - innerWidth : 0;
  gallery.style.height = pinned ? `${galleryDistance + innerHeight}px` : "";
  if (!pinned) track.style.transform = "";
}
sizeGallery();
addEventListener("resize", sizeGallery);

/* ---------- Etiqueta de servicios y botones magnéticos ---------- */
// El cursor tijera vive en cursor.js; acá solo la etiqueta "Agendar" que acompaña al mouse sobre los servicios
const preview = $(".preview");
const previewName = $(".preview__name");
const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
const previewPos = { ...pointer };

if (finePointer) {
  root.classList.add("has-preview");

  addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });

  $$(".service").forEach((service) => {
    service.addEventListener("pointerenter", () => {
      previewName.textContent = service.dataset.service;
      preview.classList.add("is-visible");
    });
    service.addEventListener("pointerleave", () => preview.classList.remove("is-visible"));
  });

  if (!reducedMotion) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }
}

/* ---------- Bucle de animación ---------- */
const heroMedia = $("[data-parallax]");
const heroVideo = $("video", heroMedia);
const marquee = $(".marquee__track").getAnimations()[0];
let lastScroll = scrollY;
let velocity = 0;
let direction = 1;

function frame() {
  const y = scrollY;
  velocity = lerp(velocity, y - lastScroll, 0.1);
  lastScroll = y;

  header.classList.toggle("is-scrolled", y > 40);

  // El marquee acelera con la velocidad del scroll y sigue su dirección
  if (marquee) {
    if (velocity > 1) direction = 1;
    if (velocity < -1) direction = -1;
    marquee.playbackRate = direction * (1 + Math.min(Math.abs(velocity) / 6, 5));
  }

  // El desplazamiento se limita al 20% extra de alto que tiene el video
  if (!reducedMotion && y < innerHeight * 1.2) {
    const shift = Math.min(y * 0.12, heroMedia.offsetHeight * 0.2);
    heroVideo.style.transform = `translate3d(0, ${shift}px, 0)`;
  }

  const rect = manifesto.getBoundingClientRect();
  const lit = Math.round(clamp((innerHeight * 0.85 - rect.top) / (rect.height + innerHeight * 0.35)) * words.length);
  if (lit !== litWords) {
    words.forEach((word, i) => word.classList.toggle("is-lit", i < lit));
    litWords = lit;
  }

  if (galleryDistance) {
    const progress = clamp(-gallery.getBoundingClientRect().top / galleryDistance);
    track.style.transform = `translate3d(${-progress * galleryDistance}px, 0, 0)`;
  }

  if (finePointer) {
    // La tarjeta va más lenta que el mouse y se inclina según la distancia
    previewPos.x = lerp(previewPos.x, pointer.x, 0.12);
    previewPos.y = lerp(previewPos.y, pointer.y, 0.12);
    const tilt = clamp((pointer.x - previewPos.x) * 0.06, -12, 12);
    preview.style.transform = `translate3d(${previewPos.x}px, ${previewPos.y}px, 0) rotate(${tilt}deg)`;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- Videos ---------- */
const clips = $$(".clip");

// Cada video se reproduce solo mientras está en pantalla, para no gastar datos ni batería
const clipObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    const video = $("video", target);
    if (isIntersecting && !reducedMotion) video.play().catch(() => {});
    else video.pause();
  });
}, { threshold: 0.4 });
clips.forEach((clip) => clipObserver.observe(clip));

// Un clic activa el sonido de ese video y silencia los demás
clips.filter((clip) => !clip.hasAttribute("data-no-audio")).forEach((clip) => clip.addEventListener("click", () => {
  const video = $("video", clip);
  const enable = video.muted;
  clips.forEach((other) => {
    $("video", other).muted = true;
    other.classList.remove("has-sound");
  });
  video.muted = !enable;
  clip.classList.toggle("has-sound", enable);
  if (enable) video.play().catch(() => {});
}));

if (reducedMotion) heroVideo.pause();

/* ---------- Cambio de color entre secciones ---------- */
// Cuando una .section--alt cruza la línea media de la pantalla, la página funde a su color (ver .is-alt en el CSS)
const altSections = new Set();
const surfaceObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) altSections.add(target);
    else altSections.delete(target);
  });
  root.classList.toggle("is-alt", altSections.size > 0);
}, { rootMargin: "-50% 0px -50% 0px" });
$$(".section--alt").forEach((section) => surfaceObserver.observe(section));

/* ---------- Botón flotante ---------- */
// Se oculta mientras se ve el inicio, contacto o el footer, que ya tienen su propio botón
const botToggle = $(".bot-toggle");
const coveredSections = new Set();
const toggleObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) coveredSections.add(target);
    else coveredSections.delete(target);
  });
  botToggle.classList.toggle("is-hidden", coveredSections.size > 0);
});
$$(".hero, .contact, .footer").forEach((el) => toggleObserver.observe(el));

/* ---------- Bot de turnos ---------- */
const bot = $(".bot");
const status = $(".bot__status");
const messages = $(".bot__messages");
const options = $(".bot__options");
const form = $(".bot__form");
const input = $(".bot__input");

// Servicios y barberos se leen del HTML para tener una única fuente de datos
const services = $$("[data-service]").map((el) => ({ name: el.dataset.service, price: el.dataset.price }));
const barbers = $$("[data-barber]").map((el) => el.dataset.barber);

// Cada conversación tiene un id; si se reinicia, la anterior se corta en su próximo mensaje
const CANCELLED = Symbol("cancelled");
let flowId = 0;
let started = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const scrollToEnd = () => { messages.scrollTop = messages.scrollHeight; };
const formatDay = (date) => date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

function setStep(step, label = `Paso ${step} de ${STEPS}`) {
  bot.style.setProperty("--step", step / STEPS);
  status.textContent = label;
}

function addMessage(text, from) {
  const msg = document.createElement("p");
  msg.className = `bot__msg bot__msg--${from}`;
  msg.textContent = text;
  messages.append(msg);
  scrollToEnd();
  return msg;
}

// Muestra el indicador de escritura antes de cada respuesta del bot
async function say(text) {
  const id = flowId;
  const msg = addMessage("", "bot");
  msg.classList.add("is-typing");
  await wait(550);
  if (id !== flowId) {
    msg.remove();
    throw CANCELLED;
  }
  msg.classList.remove("is-typing");
  msg.textContent = text;
  scrollToEnd();
}

// Muestra botones y resuelve con el valor de la opción elegida
function choose(items) {
  return new Promise((resolve) => {
    options.replaceChildren(...items.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "bot__option";
      button.textContent = item.label;
      button.addEventListener("click", () => {
        options.replaceChildren();
        addMessage(item.label, "user");
        resolve(item.value);
      });
      return button;
    }));
    scrollToEnd();
  });
}

// Pide texto libre y resuelve cuando pasa la validación
function ask(placeholder, isValid) {
  return new Promise((resolve) => {
    form.hidden = false;
    input.placeholder = placeholder;
    input.value = "";
    input.focus();
    form.onsubmit = (event) => {
      event.preventDefault();
      const value = input.value.trim();
      input.classList.toggle("is-invalid", !isValid(value));
      if (!isValid(value)) return;
      form.hidden = true;
      addMessage(value, "user");
      resolve(value);
    };
  });
}

// Próximos días con atención según SCHEDULE
function nextDays() {
  const days = [];
  for (let i = 0; days.length < DAYS_AHEAD; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    if (!SCHEDULE[date.getDay()]) continue;
    days.push({ label: formatDay(date), value: date });
  }
  return days;
}

// Horarios del día elegido para el estilista; con "Sin preferencia" se suman las franjas de todos.
// Si es hoy, solo quedan los que todavía no pasaron
function timeSlots(date, barber) {
  const [open, close] = SCHEDULE[date.getDay()];
  const ranges = BARBER_HOURS[barber] || Object.values(BARBER_HOURS).flat();
  const now = new Date();
  const nowHours = date.toDateString() === now.toDateString() ? now.getHours() + now.getMinutes() / 60 : -1;
  const step = SLOT_MINUTES / 60;
  const starts = new Set();
  ranges.forEach(([from, to]) => {
    for (let h = Math.max(from, open); h + step <= Math.min(to, close); h += step) {
      if (h > nowHours) starts.add(h);
    }
  });
  return [...starts].sort((a, b) => a - b).map((h) => {
    const label = `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
    return { label, value: label };
  });
}

async function runFlow(presetService) {
  flowId++;
  messages.replaceChildren();
  options.replaceChildren();
  form.hidden = true;
  const booking = {};

  setStep(1);
  if (presetService) {
    booking.service = presetService;
    await say(`Hola, arranquemos con ${presetService}.`);
  } else {
    await say("Hola, te ayudo a pedir tu turno. ¿Qué servicio querés?");
    booking.service = await choose(services.map((s) => ({ label: `${s.name} · ${s.price}`, value: s.name })));
  }

  setStep(2);
  await say("¿Con quién preferís atenderte?");
  booking.barber = await choose([...barbers, "Sin preferencia"].map((b) => ({ label: b, value: b })));

  setStep(3);
  let slots = [];
  do {
    await say("¿Qué día te queda bien?");
    booking.day = await choose(nextDays());
    slots = timeSlots(booking.day, booking.barber);
    if (!slots.length) await say("Ese día ya no quedan horarios. Elegí otro.");
  } while (!slots.length);

  setStep(4);
  await say("¿En qué horario?");
  booking.time = await choose(slots);

  setStep(5);
  await say("¿A nombre de quién lo anoto?");
  booking.name = await ask("Tu nombre", (value) => value.length > 1);

  setStep(STEPS, "Listo para confirmar");
  const summary = `Servicio: ${booking.service}\nBarbero: ${booking.barber}\nDía: ${formatDay(booking.day)}\nHorario: ${booking.time}\nNombre: ${booking.name}`;
  await say(`Revisá tu pedido:\n${summary}`);

  const confirmed = await choose([
    { label: "Confirmar por WhatsApp", value: true },
    { label: "Empezar de nuevo", value: false },
  ]);

  if (!confirmed) return runFlow();

  // El turno se envía como mensaje al WhatsApp del local, que lo confirma
  const text = `Hola, quiero pedir un turno.\n${summary}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  await say("Listo, se abrió WhatsApp con tu pedido. El local te confirma el turno por ahí.");
}

function startFlow(presetService) {
  runFlow(presetService).catch((error) => { if (error !== CANCELLED) throw error; });
}

/* ---------- Apertura y cierre del bot ---------- */
function setBot(open) {
  document.body.classList.toggle("bot-open", open);
  bot.inert = !open;
}

// Sin servicio: retoma la conversación abierta. Con servicio: arranca una nueva con ese servicio
function openBot(presetService) {
  setBot(true);
  setMenu(false);
  if (started && !presetService) return;
  started = true;
  startFlow(presetService);
}

$$("[data-bot-open]").forEach((el) => el.addEventListener("click", () => openBot()));
$$(".service").forEach((el) => el.addEventListener("click", () => openBot(el.dataset.service)));
$(".bot__close").addEventListener("click", () => setBot(false));
addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  setBot(false);
  setMenu(false);
});
