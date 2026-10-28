/* Diagnóstico interactivo · Estudio Valencia
   Lee window.DATOS (definido en datos.js de cada empresa) y arma la página. */
(() => {
const D = window.DATOS;
const WA = "56955164732";
const IG = "valencia.s7";
const DESCUENTO = 0.20;
const VENCE = new Date(2026, 10, 15, 23, 59);   // 15 de noviembre de 2026
const RUEDA = new Date(2026, 9, 28);
const COL = { ok: "#1F7A4D", warn: "#A85E00", bad: "#B3261E" };
const ICO = { ok: "✓", warn: "!", bad: "✕" };
const PALABRA = { ok: "Bien", warn: "A mejorar", bad: "Urgente" };
const NS = "http://www.w3.org/2000/svg";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CLP = n => "$" + Math.round(n).toLocaleString("es-CL");
const num = n => Number(n).toLocaleString("es-CL");
const especial = n => Math.round(n * (1 - DESCUENTO) / 1000) * 1000;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Geometría: 0° arriba, sentido horario
const pt = (c, r, a) => { const t = (a - 90) * Math.PI / 180; return [c + r * Math.cos(t), c + r * Math.sin(t)]; };
const arc = (c, r, a0, a1) => {
  const [x0, y0] = pt(c, r, a0), [x1, y1] = pt(c, r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
// Trazo que se dibuja al aparecer en pantalla
const drawPath = (d, color, w, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" class="draw" ${extra}/>`;

// Al entrar en pantalla: aparecer + dibujar trazos + contar números
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  const el = en.target;
  el.classList.add("in");
  el.querySelectorAll(".draw").forEach(p => {
    p.style.transitionDelay = (p.dataset.delay || 0) + "ms";
    p.style.strokeDashoffset = p.dataset.to ?? 0;
  });
  el.querySelectorAll("[data-count]").forEach(countUp);
  io.unobserve(el);
}), { threshold: 0.25 });

function countUp(el) {
  const to = +el.dataset.count, t0 = performance.now(), dur = reduce ? 0 : 1300;
  const step = t => {
    const k = dur ? Math.min(1, (t - t0) / dur) : 1;
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- Índice de presencia digital ----------
const pts = { ok: 1, warn: 0.5, bad: 0 };
const cuenta = s => D.presencia.filter(p => p.s === s).length;
const score = Math.round(D.presencia.reduce((a, p) => a + pts[p.s], 0) / D.presencia.length * 100);
const nivel = score >= 65 ? ["ok", "Base sólida"] : score >= 35 ? ["warn", "Buena base, con fugas"] : ["bad", "Mucho por ganar"];

function scoreSVG() {
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Índice de presencia digital: ${score} de 100">
    <circle cx="100" cy="100" r="84" fill="none" stroke="#F3F3EF" stroke-width="16"/>
    ${[...Array(20)].map((_, i) => { const [a, b] = pt(100, 66, i * 18), [c, d] = pt(100, 70, i * 18); return `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#DEDED8" stroke-width="1.5"/>`; }).join("")}
    <circle cx="100" cy="100" r="84" fill="none" stroke="${COL[nivel[0]]}" stroke-width="16" stroke-linecap="round"
      transform="rotate(-90 100 100)" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" data-to="${100 - score}" class="draw"/>
  </svg>`;
}

// ---------- Anillo segmentado de presencia ----------
function presenciaSVG() {
  const n = D.presencia.length, c = 150, r = 116, gap = 3, step = 360 / n;
  return `<svg viewBox="0 0 300 300" role="img" aria-label="Presencia digital punto por punto">` +
    D.presencia.map((p, i) => {
      const a0 = i * step + gap / 2, a1 = (i + 1) * step - gap / 2, [tx, ty] = pt(c, r, (a0 + a1) / 2);
      return `<g class="seg" data-i="${i}" tabindex="0" role="button" aria-label="${esc(p.k)}: ${esc(p.v)}">
        ${drawPath(arc(c, r, a0, a1), COL[p.s], 38, `data-delay="${i * 110}"`)}
        <path d="${arc(c, r, a0, a1)}" fill="none" stroke="transparent" stroke-width="56"/>
        <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="17" font-weight="700" pointer-events="none">${ICO[p.s]}</text>
      </g>`;
    }).join("") + `</svg>`;
}

// ---------- Barras radiales: competencia ----------
const TONOS = ["#6E6E68", "#BDBDB6", "#D9D9D2"];
function radialSVG() {
  const filas = D.grafico.filas, max = Math.max(...filas.map(f => f[1]), 1), c = 160, span = 270;
  let k = 0;
  return `<svg viewBox="0 0 320 320" role="img" aria-label="${esc(D.grafico.titulo)}">` +
    filas.map(([nombre, v, self], i) => {
      const r = 140 - i * 30, color = self ? "#FFE100" : TONOS[k++], a1 = Math.max(v / max * span, 0.01);
      const [lx, ly] = pt(c, r, 0);
      return `<g class="rb" data-i="${i}" tabindex="0" role="button" aria-label="${esc(nombre)}: ${num(v)}">
        <path d="${arc(c, r, 0, span)}" fill="none" stroke="#F3F3EF" stroke-width="20" stroke-linecap="round"/>
        ${v > 0 ? drawPath(arc(c, r, 0, a1), color, 20, `stroke-linecap="round" data-delay="${i * 160}"`) : ""}
        <path d="${arc(c, r, 0, span)}" fill="none" stroke="transparent" stroke-width="30"/>
        <text x="${lx - 10}" y="${ly}" text-anchor="end" dominant-baseline="central" font-weight="${self ? 700 : 400}" class="mono">${num(v)}</text>
      </g>`;
    }).join("") +
    `<g id="rcenter"></g></svg>`;
}

// ---------- Psicología ----------
const DEF = [
  ["fluidez", "Fluidez de procesamiento", "Lo que se entiende rápido se siente más verdadero y confiable."],
  ["prueba social", "Prueba social", "Cuando dudamos, hacemos lo que otros ya hicieron: reseñas, cifras y fotos de clientes."],
  ["halo", "Efecto halo", "Un logro destacado tiñe de positivo todo lo demás de la marca."],
  ["ikea", "Efecto IKEA", "Valoramos más lo que ayudamos a crear."],
  ["pertenencia", "Sentido de pertenencia", "Preferimos lo que nos hace sentir parte de un lugar o de un grupo."],
  ["origen", "Efecto de origen", "El lugar de origen suma valor: «Patagonia» vende antes de abrir la caja."],
  ["pico-final", "Regla pico-final", "Recordamos una experiencia por su mejor momento y por cómo terminó."],
  ["storytelling", "Storytelling", "Una historia con personajes se recuerda mucho más que una lista de datos."],
  ["personalización", "Personalización", "Lo que nos nombra o nos habla directo se siente hecho para uno."],
  ["escasez", "Escasez", "Lo limitado parece más valioso: «solo quedan 4 cupos»."],
  ["anclaje", "Anclaje", "El primer precio que vemos se vuelve la vara para juzgar todos los demás."],
  ["señuelo", "Efecto señuelo", "Una tercera opción hace que la del medio parezca la mejor compra."],
  ["tribu", "Identidad de tribu", "Compramos lo que dice quiénes somos."],
  ["ritual", "Ritual y nostalgia", "Los rituales y el pasado compartido generan cariño y confianza."],
  ["anticipada", "Experiencia anticipada", "Vivir un adelanto de la experiencia quita el miedo a comprar."]
];
const definir = ef => DEF.filter(([k]) => ef.toLowerCase().includes(k));
const EST = { no: ["bad", 0.18, "No lo usan"], mid: ["warn", 0.55, "A medias"], yes: ["ok", 1, "Lo usan bien"] };

function efectoSVG(p, i) {
  const [s, f] = EST[p.estado] || EST.mid;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="40" fill="none" stroke="#F3F3EF" stroke-width="10"/>
    <circle cx="50" cy="50" r="40" fill="none" stroke="${COL[s]}" stroke-width="10" stroke-linecap="round" transform="rotate(-90 50 50)"
      pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" data-to="${100 - f * 100}" data-delay="${i * 200}" class="draw"/>
    <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="26" font-weight="700" fill="${COL[s]}">${ICO[s]}</text>
  </svg>`;
}

// ---------- Pack: dona de precios ----------
const PACK_COL = ["#FFE100", "#F2F2EF", "#8C8C85", "#56564F"];
const items = D.pack.items.filter(i => i[1] > 0);
const total = items.reduce((a, i) => a + i[1], 0);
function packSVG() {
  let a = 0;
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Composición del pack">` +
    items.map(([n, p], i) => {
      const span = p / total * 360, a0 = a + 1.5, a1 = a + span - 1.5; a += span;
      return `<g class="pseg" data-i="${i}">${drawPath(arc(100, 82, a0, a1), PACK_COL[i], 22, `data-delay="${i * 220}"`)}</g>`;
    }).join("") + `</svg>`;
}

function relojSVG() {
  const totalDias = Math.round((VENCE - RUEDA) / 864e5);
  const quedan = Math.max(0, Math.ceil((VENCE - new Date()) / 864e5));
  const f = Math.min(1, quedan / totalDias);
  return { quedan, svg: `<svg viewBox="0 0 74 74" aria-hidden="true">
    <circle cx="37" cy="37" r="31" fill="none" stroke="#3A3A38" stroke-width="7"/>
    <circle cx="37" cy="37" r="31" fill="none" stroke="#FFE100" stroke-width="7" stroke-linecap="round" transform="rotate(-90 37 37)"
      pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" data-to="${100 - f * 100}" class="draw"/>
    <text x="37" y="35" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="22" font-weight="700" font-family="Jost">${quedan}</text>
    <text x="37" y="53" text-anchor="middle" fill="#B9B9B4" font-size="8">días</text>
  </svg>` };
}

// ---------- Redes (se completa en datos.js cuando esté el análisis) ----------
function redesHTML() {
  const R = D.redes;
  if (!R || !R.cuentas || !R.cuentas.length) return "";
  const max = Math.max(...R.cuentas.map(c => c.seguidores || 0), 1);
  return `<section class="card rv"><span class="label">Redes sociales</span><h2>${esc(R.titulo || "Cómo se ven en redes")}</h2>
    ${R.resumen ? `<p class="sub">${esc(R.resumen)}</p>` : ""}
    <div class="redes">${R.cuentas.map((c, i) => {
      const f = (c.seguidores || 0) / max, s = c.s || "warn";
      return `<a class="red" ${c.url ? `href="${esc(c.url)}" target="_blank" rel="noopener"` : ""}>
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="#F3F3EF" stroke-width="9"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="${COL[s]}" stroke-width="9" stroke-linecap="round" transform="rotate(-90 50 50)" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" data-to="${100 - f * 100}" data-delay="${i * 150}" class="draw"/>
          <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="${c.seguidores >= 10000 ? 15 : 18}" font-weight="700" font-family="Jost">${c.seguidores != null ? num(c.seguidores) : "—"}</text></svg>
        <b>${esc(c.red)}</b>${c.usuario ? `<small>${esc(c.usuario)}</small>` : ""}${c.nota ? `<p>${esc(c.nota)}</p>` : ""}
      </a>`; }).join("")}</div>
    ${R.fuente ? `<p class="src">Fuente: ${esc(R.fuente)}</p>` : ""}</section>`;
}

// ---------- Página ----------
const waTxt = `Hola Ricardo, vi el diagnóstico de ${D.nombre} y me gustaría conversar sobre «${D.pack.nombre}».`;
const waURL = `https://wa.me/${WA}?text=${encodeURIComponent(waTxt)}`;
const WA_ICO = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3Z"/></svg>`;
const reloj = relojSVG();
const vigente = reloj.quedan > 0;
const totalPack = D.pack.items.reduce((a, i) => a + i[1], 0);

document.getElementById("app").innerHTML = `
<header class="top"><div class="wrap"><img src="../assets/logo_V.png" alt="Estudio Valencia">
  <div><div class="t1">Estudio Valencia</div><div class="t2">Marketing con ciencia · IA · contenido · web · 360°</div></div></div></header>

<div class="hero"><div class="wrap">
  <span class="label">Diagnóstico digital preparado para</span>
  <h1>${esc(D.nombre)}</h1>
  <p class="rubro">${esc(D.rubro)}</p>
  <div class="chips"><span>${esc(D.lugar)}</span>${D.desde ? `<span>${esc(D.desde)}</span>` : ""}</div>
  <div class="hallazgo"><p>${esc(D.hallazgo)}</p><small>Lo que encontró mi agente de IA al investigarlos el 27 de octubre de 2026, con fuentes públicas.</small></div>
</div></div>

<main class="wrap">
  <section class="card rv">
    <span class="label">Índice de presencia digital</span>
    <h2>¿Qué tan fácil es encontrarlos y elegirlos?</h2>
    <div class="score">${scoreSVG()}<div class="center"><div><div class="num"><span data-count="${score}">0</span><small>/100</small></div><div class="lvl" style="color:${COL[nivel[0]]}">${nivel[1]}</div></div></div></div>
    <div class="counts">${["ok", "warn", "bad"].filter(s => cuenta(s)).map(s => `<span class="pill ${s}">${ICO[s]} ${cuenta(s)} ${PALABRA[s].toLowerCase()}</span>`).join("")}</div>
    <details class="explica"><summary>¿Cómo se calcula?</summary><p>Revisamos ${D.presencia.length} puntos de su presencia en internet. Cada punto en verde vale 1, en ámbar vale ½ y en rojo vale 0. El índice es el promedio, de 0 a 100. No es una nota: muestra cuánto pueden ganar.</p></details>
  </section>

  <section class="card rv">
    <span class="label">Punto por punto</span>
    <h2>Su presencia digital, en una rueda</h2>
    <p class="hint">Toca un color o un punto de la lista</p>
    <div class="ring-wrap">${presenciaSVG()}<div class="ring-center" id="pc"></div></div>
    <ul class="list" id="plist">${D.presencia.map((p, i) => `<li><button data-i="${i}"><span class="ico ${p.s}">${ICO[p.s]}</span><span><span class="lk">${esc(p.k)}</span><span class="lv">${esc(p.v)}</span></span></button></li>`).join("")}</ul>
  </section>

  <section class="card rv">
    <span class="label">Lo que ya tienen para contar</span>
    <h2>Historias que venden</h2>
    <div class="hitos">${D.hitos.map((h, i) => `<div class="hito"><span class="n">${i + 1}</span><p>${esc(h)}</p></div>`).join("")}</div>
    <p class="src">Desliza hacia el lado →</p>
  </section>

  <section class="card rv">
    <span class="label">Frente a la competencia</span>
    <h2>${esc(D.grafico.titulo)}</h2>
    <p class="hint">Toca un anillo</p>
    <div class="radial">${radialSVG()}</div>
    <ul class="legend" id="rlegend">${(() => { let k = 0; return D.grafico.filas.map(([n, v, self], i) => `<li data-i="${i}"><span class="dot" style="background:${self ? "#FFE100" : TONOS[k++]};${self ? "box-shadow:0 0 0 1.5px #161616" : ""}"></span><span class="${self ? "self" : ""}">${esc(n)}</span><span class="mono">${num(v)}</span></li>`).join(""); })()}</ul>
    <p class="src">Fuente: ${esc(D.grafico.fuente)}</p>
    <div class="rivales">${D.competencia.map(([n, t]) => `<div class="rival"><b>${esc(n)}</b><p>${esc(t)}</p></div>`).join("")}</div>
  </section>

  <section class="card rv">
    <span class="label">Balance</span>
    <h2>Lo que funciona y por dónde se escapan clientes</h2>
    <div class="tabs" id="tabs" data-i="0" role="tablist"><span class="thumb"></span>
      <button role="tab" aria-selected="true" data-i="0">Lo que funciona</button><button role="tab" aria-selected="false" data-i="1">Fugas</button></div>
    <ul class="pane" id="pane"></ul>
  </section>

  <section class="card rv">
    <span class="label">Marketing con ciencia</span>
    <h2>La psicología detrás de cada compra</h2>
    <p class="sub">Tres efectos que deciden si un cliente los elige. Cada anillo muestra cuánto los aprovechan hoy.</p>
    <div class="efectos" id="efs">${D.psicologia.map((p, i) => { const [s, , w] = EST[p.estado] || EST.mid; return `<button class="ef" data-i="${i}">${efectoSVG(p, i)}<span class="en">${esc(p.efecto)}</span><span class="es" style="color:${COL[s]}">${w}</span></button>`; }).join("")}</div>
    <div id="efd"></div>
  </section>

  ${redesHTML()}

  <section class="card pack rv" id="pack">
    <span class="label">Si quieren que lo hagamos juntos</span>
    <h2>${esc(D.pack.nombre)}</h2>
    <p class="sub">${esc(D.pack.porque)}</p>
    <div class="pack-viz">${packSVG()}<div class="center"><div>
      ${vigente ? `<div class="old">${CLP(totalPack)}</div><div class="new">${CLP(especial(totalPack))}</div><div class="cap">−${DESCUENTO * 100}% por la rueda</div>`
                : `<div class="new">${CLP(totalPack)}</div><div class="cap">valor del pack</div>`}
    </div></div></div>
    <ul class="items" id="items">${D.pack.items.map(([n, p], i) => `<li data-i="${p > 0 ? items.findIndex(x => x[0] === n) : -1}"><span class="dot" style="background:${p > 0 ? PACK_COL[items.findIndex(x => x[0] === n)] : "transparent"}"></span><span>${esc(n)}</span><span class="p">${CLP(p)}</span></li>`).join("")}
      ${D.extra ? `<li><span class="dot"></span><span>${esc(D.extra)}</span><span class="p">$0</span></li>` : ""}</ul>
    ${vigente ? `<div class="reloj">${reloj.svg}<div><b>Precio especial hasta el 15 de noviembre</b><span>Lo conversamos en la rueda Yo Compro Local del 28 de octubre.</span></div></div>` : ""}
    <a class="btn" href="${waURL}" target="_blank" rel="noopener">${WA_ICO}Conversemos por WhatsApp</a>
  </section>

  <section class="card rv">
    <span class="label">Además puedo hacer</span>
    <h2>Otras ideas para ${esc(D.nombre)}</h2>
    <ul class="mas">${D.mas.map(([n, p]) => `<li><span>${esc(n)}</span><span>${esc(p)}</span></li>`).join("")}</ul>
  </section>

  ${D.jingle ? `<section class="card rv">
    <span class="label">Su jingle</span>
    <h2>${D.jingle.audio ? `Escuchen cómo suena ${esc(D.nombre)}` : `Así podría sonar ${esc(D.nombre)}`}</h2>
    ${D.jingle.audio ? `<div class="player">
      <button class="play" id="play" aria-label="Reproducir jingle">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#F3F3EF" stroke-width="8"/>
          <circle id="prog" cx="60" cy="60" r="54" fill="none" stroke="#FFE100" stroke-width="8" stroke-linecap="round" transform="rotate(-90 60 60)" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
          <circle cx="60" cy="60" r="42" fill="#161616"/>
          <path id="picon" d="M52 42 L80 60 L52 78 Z" fill="#FFE100"/>
        </svg></button>
      <div><b>Jingle original para ustedes</b><span id="ptime">Toca para escuchar</span>
        <div class="eq" id="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div>
      <audio id="aud" preload="metadata" src="${esc(D.jingle.audio)}"></audio>
    </div>` : ""}
    <div class="jingle"><div class="g">${esc(D.jingle.genero)}</div><p>${esc(D.jingle.letra)}</p></div>
  </section>` : ""}

  <section class="card rv">
    <span class="label">Fuentes</span>
    <h2>Dónde miramos</h2>
    <ul class="fuentes">${D.links.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a></li>`).join("")}</ul>
    <p class="src">Investigación del 27 de octubre de 2026 con fuentes públicas. Las cifras de redes y reseñas cambian a diario.</p>
  </section>
</main>

<footer>Ricardo Valencia · Estudio Valencia · Coyhaique<br>
  <a href="https://www.instagram.com/${IG}/" target="_blank" rel="noopener">Instagram @${IG}</a> · <a href="${waURL}" target="_blank" rel="noopener">WhatsApp +56 9 5516 4732</a></footer>
<div class="sticky" id="sticky"><a class="btn" href="${waURL}" target="_blank" rel="noopener">${WA_ICO}Conversemos por WhatsApp</a></div>`;

document.querySelectorAll(".rv").forEach(el => io.observe(el));

// Presencia: seleccionar segmento
const pc = document.getElementById("pc");
const segs = [...document.querySelectorAll(".seg")], pbtn = [...document.querySelectorAll("#plist button")];
function selP(i) {
  const p = D.presencia[i];
  segs.forEach((s, j) => { s.classList.toggle("on", j === i); s.classList.toggle("dim", j !== i); });
  pbtn.forEach((b, j) => b.classList.toggle("on", j === i));
  pc.innerHTML = `<div><div class="k">${esc(p.k)}</div><div class="v" style="color:${COL[p.s]}">${esc(p.v)}</div>${p.d ? `<div class="d">${esc(p.d)}</div>` : ""}</div>`;
}
pc.innerHTML = `<div><div class="v">${D.presencia.length} puntos</div><div class="d">Toca un color para ver el detalle</div></div>`;
segs.forEach(s => { s.addEventListener("click", () => selP(+s.dataset.i)); s.addEventListener("keydown", e => (e.key === "Enter" || e.key === " ") && selP(+s.dataset.i)); });
pbtn.forEach(b => b.addEventListener("click", () => selP(+b.dataset.i)));

// Competencia: seleccionar anillo
const rc = document.getElementById("rcenter"), rbs = [...document.querySelectorAll(".rb")], rli = [...document.querySelectorAll("#rlegend li")];
function selR(i) {
  const [n, v] = D.grafico.filas[i];
  rbs.forEach((g, j) => g.style.opacity = j === i ? 1 : .35);
  rli.forEach((l, j) => l.classList.toggle("on", j === i));
  const corto = n.length > 22 ? n.slice(0, 21) + "…" : n;
  rc.innerHTML = `<text x="160" y="150" text-anchor="middle" font-size="12" fill="#5C5C58">${esc(corto)}</text>
    <text x="160" y="176" text-anchor="middle" font-size="26" font-weight="600" font-family="Jost" fill="#161616">${num(v)}</text>`;
}
rbs.forEach(g => { g.addEventListener("click", () => selR(+g.dataset.i)); g.addEventListener("keydown", e => (e.key === "Enter" || e.key === " ") && selR(+g.dataset.i)); });
rli.forEach(l => l.addEventListener("click", () => selR(+l.dataset.i)));
selR(Math.max(0, D.grafico.filas.findIndex(f => f[2])));
rbs.forEach(g => g.style.opacity = 1);

// Pestañas: lo que funciona / fugas
const tabs = document.getElementById("tabs"), pane = document.getElementById("pane");
function selT(i) {
  tabs.dataset.i = i;
  tabs.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", +b.dataset.i === i));
  const lista = i ? D.fugas : D.bien, s = i ? "bad" : "ok";
  pane.innerHTML = lista.map(t => `<li><span class="ico ${s}">${ICO[s]}</span><span>${esc(t)}</span></li>`).join("");
}
tabs.querySelectorAll("button").forEach(b => b.addEventListener("click", () => selT(+b.dataset.i)));
selT(0);

// Psicología: detalle del efecto
const efd = document.getElementById("efd"), efs = [...document.querySelectorAll(".ef")];
function selE(i) {
  const p = D.psicologia[i], defs = definir(p.efecto);
  efs.forEach((b, j) => b.classList.toggle("on", j === i));
  efd.innerHTML = `<div class="ef-detalle"><h3>${esc(p.efecto)}</h3>
    ${defs.map(([, n, t]) => `<p class="def"><b>${esc(n)}:</b> ${esc(t)}</p>`).join("")}
    <div class="blk"><span>Hoy</span><p>${esc(p.hoy)}</p></div>
    <div class="blk"><span>Idea gratis para mañana</span><p>${p.idea}</p></div></div>`;
}
efs.forEach(b => b.addEventListener("click", () => selE(+b.dataset.i)));
selE(0);

// Pack: resaltar ítem
const psegs = [...document.querySelectorAll(".pseg")], pli = [...document.querySelectorAll("#items li")];
pli.forEach(l => l.addEventListener("click", () => {
  const i = +l.dataset.i;
  pli.forEach(x => x.classList.toggle("on", x === l));
  psegs.forEach((g, j) => { g.style.opacity = i < 0 || j === i ? 1 : .3; g.style.transition = "opacity .25s"; });
}));

// Reproductor circular del jingle
const aud = document.getElementById("aud");
if (aud) {
  const play = document.getElementById("play"), prog = document.getElementById("prog"), picon = document.getElementById("picon");
  const ptime = document.getElementById("ptime"), eq = document.getElementById("eq");
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const PLAY = "M52 42 L80 60 L52 78 Z", PAUSA = "M48 42 h9 v36 h-9 Z M63 42 h9 v36 h-9 Z";
  play.addEventListener("click", () => aud.paused ? aud.play() : aud.pause());
  aud.addEventListener("play", () => { picon.setAttribute("d", PAUSA); eq.classList.add("on"); play.setAttribute("aria-label", "Pausar jingle"); });
  aud.addEventListener("pause", () => { picon.setAttribute("d", PLAY); eq.classList.remove("on"); play.setAttribute("aria-label", "Reproducir jingle"); });
  aud.addEventListener("timeupdate", () => {
    const d = aud.duration || 1;
    prog.style.strokeDashoffset = 100 - aud.currentTime / d * 100;
    ptime.textContent = `${mmss(aud.currentTime)} / ${mmss(d)}`;
  });
  aud.addEventListener("ended", () => { prog.style.strokeDashoffset = 100; });
}

// Barra fija de WhatsApp: aparece al bajar, se esconde sobre el pack
const sticky = document.getElementById("sticky"), pack = document.getElementById("pack");
let packVisible = false;
new IntersectionObserver(([e]) => { packVisible = e.isIntersecting; onScroll(); }, { threshold: 0.2 }).observe(pack);
function onScroll() { sticky.classList.toggle("show", scrollY > 500 && !packVisible); }
addEventListener("scroll", onScroll, { passive: true });
})();
