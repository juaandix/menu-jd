"use strict";
const $ = (s) => document.querySelector(s);
const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const f1 = (x) => r1(x).toLocaleString("es-ES"); // para mostrar: coma decimal
// Los platos del plan de Cristina llevan "(S1 · Lunes)" en el nombre: se muestra aparte, como etiqueta.
const TAG_RE = /\s*\((S\d+\s*·\s*[^)]+)\)/;
function splitName(n) { const m = String(n).match(TAG_RE); return m ? { t: String(n).replace(TAG_RE, ""), tag: m[1] } : { t: String(n), tag: "" }; }
// Iconos de la interfaz (SVG en línea, trazo de 1,8 que hereda el color del texto).
const ICONS = {
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".6" class="fill"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 7.5c0-1.5 1.5-1.5 1.5-3M12.5 7.5c0-1.5 1.5-1.5 1.5-3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.3L20 15"/><path d="M20 20v-5h-5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  upload: '<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
};
const ico = (name, cls = "") => `<svg class="i${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
function nameHTML(n) { const x = splitName(n); return esc(x.t) + (x.tag ? ` <span class="tag">${esc(x.tag)}</span>` : ""); }

/* ---------- perfil activo ---------- */
const PROFILE_KEY = "menujd.profile.v1";
// Enlace con ?perfil=<id> (p. ej. para instalar la app en el móvil de Cristina): fija ese perfil y limpia la URL.
(function profileFromUrl() {
  const p = new URLSearchParams(location.search).get("perfil");
  if (!p) return;
  const id = Object.keys(PROFILES).find((k) => k === p.toLowerCase() || norm(PROFILES[k].label).split(" ")[0] === norm(p));
  if (id) try { localStorage.setItem(PROFILE_KEY, id); } catch {}
  history.replaceState(null, "", location.pathname + location.hash);
})();
let profile = PROFILES[localStorage.getItem(PROFILE_KEY)] || PROFILES.jd;
let ALL, byId, slotOf;
// Platos modificados con el editor (por perfil): { "D1": { i:[...], k, p, c, f } } sustituyen al plato original de data.js.
function dishesKey() { return `menujd.dishes.${profile.id}.v1`; }
function loadDishOverrides() { try { return JSON.parse(localStorage.getItem(dishesKey())) || {}; } catch { return {}; } }
function saveDishOverrides(ov) { try { localStorage.setItem(dishesKey(), JSON.stringify(ov)); } catch { toast("No se pudo guardar en este dispositivo"); } }
function rebuildIndex() {
  if (!profile._baseMenu) profile._baseMenu = profile.menu;
  const ov = loadDishOverrides();
  profile.menu = Object.fromEntries(Object.entries(profile._baseMenu).map(([slot, arr]) =>
    [slot, arr.map((o) => (ov[o.id] ? { ...o, ...ov[o.id], mod: true } : o))]));
  ALL = Object.values(profile.menu).flat();
  byId = (id) => ALL.find((o) => o.id === id);
  slotOf = (id) => Object.keys(profile.menu).find((k) => profile.menu[k].some((o) => o.id === id));
}
rebuildIndex();

// Tema de color por perfil (fondo azul oscuro para JD, violeta para Cristina): ver styles.css.
function applyProfileTheme() {
  document.documentElement.dataset.profile = profile.id;
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
}
applyProfileTheme();

/* ---------- almacenamiento local (por perfil) ---------- */
function logKey() { return `menujd.log.${profile.id}.v1`; }
function loadAll() {
  try { return JSON.parse(localStorage.getItem(logKey())) || {}; } catch { return {}; }
}
function saveAll(db) { try { localStorage.setItem(logKey(), JSON.stringify(db)); } catch { toast("No se pudo guardar en este dispositivo"); } }
// Migra el registro antiguo (de antes de los perfiles) al perfil jd, una sola vez.
(function migrateLegacyLog() {
  const legacy = localStorage.getItem("menujd.log.v1");
  if (legacy && !localStorage.getItem("menujd.log.jd.v1")) {
    localStorage.setItem("menujd.log.jd.v1", legacy);
    localStorage.removeItem("menujd.log.v1");
  }
})();
let db = loadAll();

/* ---------- fechas ---------- */
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
let current = new Date(); current.setHours(12, 0, 0, 0);
function dayLabel(d) {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diff = Math.round((d - today) / 864e5);
  const txt = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
  if (diff === 0) return "Hoy · " + txt;
  if (diff === -1) return "Ayer · " + txt;
  if (diff === 1) return "Mañana · " + txt;
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
function getDay(key) {
  if (!db[key]) {
    const d = new Date(key + "T12:00:00");
    const type = profile.defaultType ? profile.defaultType(d) : profile.dayTypes[0].id;
    db[key] = { type, items: [] };
  }
  return db[key];
}

/* ---------- HOY ---------- */
function totals(items) {
  return items.reduce((t, x) => ({ k: t.k + x.k, p: t.p + x.p, c: t.c + (x.c || 0), f: t.f + (x.f || 0) }), { k: 0, p: 0, c: 0, f: 0 });
}
// Anillo de kcal: arco = comido / objetivo; el centro dice lo que queda (o lo que sobra, en color de aviso).
function ring(eaten, target, left) {
  const R = 52, C = 2 * Math.PI * R, pct = Math.max(0, Math.min(1, eaten / target)), over = left < -60;
  return `<div class="ring${over ? " over" : ""}" role="img" aria-label="${r0(eaten)} de ${r0(target)} kcal">
    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" class="ring-track"/>
      <circle cx="60" cy="60" r="${R}" class="ring-val" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/></svg>
    <div class="ring-c"><strong>${r0(Math.abs(left)).toLocaleString("es-ES")}</strong><span>${left >= 0 ? "kcal restantes" : "kcal de más"}</span></div></div>`;
}
// Barra de un macro con su color; con objetivo, muestra lo que falta.
function macroBar(label, key, val, target) {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  const right = target ? `<b>${r0(val)}</b> / ${target} g` : `<b>${r0(val)}</b> g`;
  return `<div class="mbar m-${key}"><div class="mbar-l"><span><i class="dot"></i>${label}</span><span>${right}</span></div>
    ${target ? `<div class="bar"><i style="width:${pct}%"></i></div>${val < target ? `<small>faltan ${r0(target - val)} g</small>` : `<small class="ok">${ico("check")} objetivo cubierto</small>`}` : ""}</div>`;
}
function renderHoy() {
  const key = iso(current);
  const day = db[key] || getDay(key);
  const type = profile.dayTypes.find((t) => t.id === day.type) || profile.dayTypes[0];
  $("#dateTitle").textContent = dayLabel(current);
  $("#dayType").innerHTML = profile.dayTypes.map((t) => `<option value="${t.id}">${t.label} · ${t.kcal}</option>`).join("");
  $("#dayType").value = type.id;
  $("#gcalDetect").hidden = !profile.calendar;
  $("#healthDay").hidden = !profile.health;
  renderHealthStatus();
  renderFoodSync();

  const t = totals(day.items);
  const adj = stepAdjust(day, type, key);
  const target = type.kcal + adj;
  const left = target - t.k;
  const pLeft = profile.proteinTarget - t.p;
  const cost = itemsCost(day.items);
  $("#summary").innerHTML = `
    <div class="hero">
      ${ring(t.k, target, left)}
      <div class="hero-side">
        <div class="hs-row"><span>Objetivo</span><b>${r0(target).toLocaleString("es-ES")}</b></div>
        ${adj ? `<div class="hs-row sub"><span>por pasos</span><b>${adj > 0 ? "+" : ""}${adj}</b></div>` : ""}
        <div class="hs-row"><span>Comido</span><b>${r0(t.k).toLocaleString("es-ES")}</b></div>
        ${cost.priced ? `<div class="hs-row"><span>Coste</span><b>${costLabel(cost)}</b></div>` : ""}
      </div>
    </div>
    <div class="macro-bars">
      ${macroBar("Proteína", "p", t.p, profile.proteinTarget)}
      ${macroBar("Carbohidratos", "c", t.c)}
      ${macroBar("Grasa", "f", t.f)}
    </div>
    ${suggestHTML(day, key, left, pLeft)}`;
  renderSteps(day, type, key, adj);

  $("#slots").innerHTML = profile.slots.map((s) => {
    const items = day.items.map((x, idx) => ({ ...x, idx })).filter((x) => x.slot === s.id);
    const hint = s.id === "S" && type.mods ? `${s.hint} · ${type.mods} hoy` : s.hint;
    const st = totals(items);
    const fav = items.length ? null : favorite(s.id, key);
    return `<div class="slot${items.length ? "" : " is-empty"}">
      <div class="slot-head"><h3>${s.label}<small>${items.length ? `<b>${r0(st.k)} kcal · ${r0(st.p)} g P</b> · ${hint}` : hint}</small></h3>
        <button class="add-btn" data-add="${s.id}" aria-label="Añadir a ${s.label}">+ Añadir</button></div>
      ${items.length ? items.map((x) => `
        <div class="entry${entryThumb(x) ? " has-thumb" : ""}">${entryThumb(x)}<button class="name" type="button" data-entry="${x.idx}" aria-label="Editar ${esc(x.n)}"><b>${nameHTML(x.n)}</b><span>${x.ref ? x.ref + " · " : ""}P ${f1(x.p)} · C ${r0(x.c || 0)} · G ${r0(x.f || 0)}${costLabel(itemDishCost(x)) ? " · " + costLabel(itemDishCost(x)) : ""}${x.i ? " · editado" : ""}</span></button>
          <span class="kc">${r0(x.k)}</span>
          <button class="del" data-del="${x.idx}" aria-label="Quitar ${esc(x.n)}">${ico("x")}</button></div>`).join("")
      : fav ? `<button class="chip-opt fav" data-fav="${fav.o.id}|${fav.m}"><span>${ico("plus")} Lo de siempre: ${esc(splitName(withPortion(fav.o.n, fav.m)).t)}</span><small>${r0(fav.o.k * fav.m)} kcal</small></button>` : ""}
    </div>`;
  }).join("");
}
// "Lo de siempre": el plato (y ración) más repetido en esa franja en los 30 días anteriores, si sale 3 veces o más.
function favorite(slotId, key) {
  const from = iso(new Date(new Date(key + "T12:00:00").getTime() - 30 * 864e5));
  const count = new Map();
  for (const [k, d] of Object.entries(db)) {
    if (k >= key || k < from) continue;
    for (const x of d.items) {
      if (x.slot !== slotId || !x.ref || x.i || !byId(x.ref)) continue;
      const id = x.ref + "|" + r1(entryMult(x));
      count.set(id, (count.get(id) || 0) + 1);
    }
  }
  const [best] = [...count.entries()].sort((a, b) => b[1] - a[1]);
  if (!best || best[1] < 3) return null;
  const [ref, m] = best[0].split("|");
  const o = byId(ref);
  return o && !dishMissing(o).length ? { o, m: +m } : null;
}
// Si falta proteína y quedan kcal: los platos que mejor la cubren sin pasarse (hoy desde las 15 h, o días futuros al planificar).
function proteinSuggest(day, key, left, pLeft) {
  const today = iso(new Date());
  if (day.items.length < 2 || pLeft < 10 || left < 60) return [];
  if (key < today || (key === today && new Date().getHours() < 15)) return [];
  return ALL.filter((o) => o.k <= left + 20 && o.p >= Math.min(10, pLeft * 0.6) && !dishMissing(o).length)
    .map((o) => ({ o, score: Math.min(o.p, pLeft) - 0.05 * o.k }))
    .sort((a, b) => b.score - a.score).slice(0, 2).map((x) => x.o);
}
function suggestHTML(day, key, left, pLeft) {
  const list = proteinSuggest(day, key, left, pLeft);
  if (!list.length) return "";
  return `<div class="suggest"><p>Te faltan <b>${r0(pLeft)} g</b> de proteína con <b>${r0(left)} kcal</b>. Encaja:</p>
    ${list.map((o) => `<button class="opt" data-sugg="${o.id}"><span class="code">${o.id}</span><span>${nameHTML(o.n)}</span><span class="kc">${o.k} kcal<br>${f1(o.p)} g P</span></button>`).join("")}</div>`;
}
/* copiar las comidas de otro día */
function openCopySheet() {
  const key = iso(current);
  const days = Object.keys(db).filter((k) => k < key && db[k].items && db[k].items.length).sort().reverse().slice(0, 14);
  $("#sheetTitle").textContent = "Copiar de otro día";
  $("#sheetBody").innerHTML = days.length
    ? `<p class="muted small">Se añade todo lo de ese día a ${shortDay(current)} (sin borrar lo que ya tengas).</p>
      <div class="ed-options">${days.map((k) => {
        const t = totals(db[k].items);
        return `<button class="opt rec" data-copy-from="${k}"><span>${esc(dayLabel(new Date(k + "T12:00:00")))}<small>${esc(db[k].items.map((x) => splitName(x.n).t).join(" · "))}</small></span><span class="kc">${r0(t.k)} kcal<br>${r0(t.p)} g P</span></button>`;
      }).join("")}</div>`
    : `<p class="empty">No hay días anteriores con comidas registradas.</p>`;
  $("#sheet").hidden = false; $("#sheetBg").hidden = false;
}
function copyDay(from) {
  const key = iso(current), day = getDay(key);
  const added = JSON.parse(JSON.stringify(db[from].items));
  day.items.push(...added);
  saveAll(db); renderHoy(); closeSheet();
  toast(`Copiadas ${added.length} comidas`, 6000, { label: "Deshacer", fn: () => {
    const d = getDay(key); d.items = d.items.filter((x) => !added.includes(x)); saveAll(db); renderHoy(); toast("Deshecho");
  } });
}
/* pasos: si el tipo de día trae pasos de referencia, el objetivo se ajusta con los pasos reales */
const KCAL_PER_STEP_KG = 0.0004; // ≈ 0,035 kcal por paso a 87 kg (gasto neto andando)
function latestWeight(beforeKey) {
  const w = loadWeights();
  const k = Object.keys(w).filter((d) => d <= beforeKey).sort().pop();
  return k ? w[k] : profile.weight || 75;
}
function stepAdjust(day, type, key) {
  if (!type.steps || typeof day.steps !== "number") return 0;
  const adj = Math.round(((day.steps - type.steps) * KCAL_PER_STEP_KG * latestWeight(key)) / 10) * 10;
  return Math.max(-400, Math.min(400, adj));
}
function renderSteps(day, type, key, adj) {
  const el = $("#stepsIn");
  if (document.activeElement !== el) el.value = typeof day.steps === "number" ? day.steps : "";
  const fmt = (n) => n.toLocaleString("es-ES");
  let msg;
  if (type.steps && typeof day.steps === "number")
    msg = `${adj > 0 ? "+" : ""}${adj} kcal al objetivo (cuenta con ~${fmt(type.steps)} pasos)${key === iso(new Date()) ? " · el día sigue: actualiza por la noche" : ""}`;
  else if (type.steps) msg = `El objetivo ya cuenta con ~${fmt(type.steps)} pasos.`;
  else if (typeof day.steps === "number") msg = `≈ ${fmt(Math.round(day.steps * KCAL_PER_STEP_KG * latestWeight(key)))} kcal andando (no ajusta el objetivo).`;
  else msg = "";
  $("#stepsInfo").textContent = msg;
  $("#stepsInfo").hidden = !msg;
}
function itemsCost(items) {
  let eur = 0, missing = 0, priced = 0;
  for (const x of items) {
    const c = itemDishCost(x);
    if (!c) { missing++; continue; }
    eur += c.eur; missing += c.missing; priced += c.priced;
  }
  return { eur, missing, priced };
}
/* ---------- editar lo registrado: ración, mover, duplicar, ingredientes, borrar con deshacer ---------- */
let entState = null;
// Ración de una entrada: la guardada (m), deducida de las kcal del plato, o 1.
function entryMult(x) { return x.m || (x.ref && !x.i && byId(x.ref) ? itemMult(x, byId(x.ref)) : 1); }
function openEntry(idx) {
  entState = { key: iso(current), idx };
  const x = getDay(entState.key).items[idx];
  if (!x) return;
  const mult = entryMult(x);
  const canIng = !!(x.i || (x.ref && byId(x.ref)));
  $("#sheetTitle").textContent = x.n;
  $("#sheetBody").innerHTML = `
    <p class="ed-sum"><b>${macrosTxt({ k: x.k, p: x.p, c: x.c || 0, f: x.f || 0 })}</b></p>
    ${x.i ? `<ul class="ent-ings">${x.i.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
    <div class="portion-card">
      <p class="muted small">Ración</p>
      <div class="portion-row">${PORTIONS.map((pt) => `<button class="portion-btn${Math.abs(pt.mult - mult) < 0.01 ? " is-default" : ""}" data-ent-portion="${pt.mult}"><b>${pt.label}×</b><span>${r0((x.k / mult) * pt.mult)} kcal · ${f1((x.p / mult) * pt.mult)} g P</span></button>`).join("")}</div>
      ${multHTML("ent", { k: x.k / mult, p: x.p / mult })}
      <p class="muted small">Mover a</p>
      <div class="recent-row">${profile.slots.filter((s) => s.id !== x.slot).map((s) => `<button class="chip-opt" data-ent-move="${s.id}">${s.label}</button>`).join("")}</div>
    </div>
    <div class="row">
      ${canIng ? `<button class="btn ghost" data-ent-ing="1">${ico("edit")} Ingredientes</button>` : ""}
      <button class="btn ghost" data-ent-dup="1">Duplicar</button>
      <button class="btn ghost danger" data-ent-del="1">Borrar</button>
    </div>`;
  $("#sheet").hidden = false; $("#sheetBg").hidden = false;
}
function entPortion(mult) {
  const day = getDay(entState.key), x = day.items[entState.idx];
  const old = entryMult(x);
  const per = { k: x.k / old, p: x.p / old, c: (x.c || 0) / old, f: (x.f || 0) / old };
  Object.assign(x, scaled(per, mult), { m: mult, n: withPortion(x.n, mult) });
  saveAll(db); renderHoy(); closeSheet(); toast("Ración cambiada");
}
function entMove(slot) {
  const x = getDay(entState.key).items[entState.idx];
  x.slot = slot; saveAll(db); renderHoy(); closeSheet();
  toast("Movido a " + profile.slots.find((s) => s.id === slot).label);
}
function entDup() {
  const day = getDay(entState.key), x = day.items[entState.idx];
  day.items.splice(entState.idx + 1, 0, JSON.parse(JSON.stringify(x)));
  saveAll(db); renderHoy(); closeSheet(); toast("Duplicado");
}
function deleteEntry(key, idx) {
  const day = getDay(key);
  const [x] = day.items.splice(idx, 1);
  saveAll(db); renderHoy(); closeSheet();
  toast("Borrado: " + x.n, 6000, { label: "Deshacer", fn: () => {
    const d = getDay(key); d.items.splice(Math.min(idx, d.items.length), 0, x); saveAll(db); renderHoy(); toast("Recuperado");
  } });
}
function addItem(slot, item) {
  const day = getDay(iso(current));
  day.items.push({ slot, ...item });
  saveAll(db); renderHoy();
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* ---------- hoja de añadir: buscador, recientes y ración ---------- */
const PORTIONS = [{ mult: 0.5, label: "½" }, { mult: 1, label: "1" }, { mult: 1.5, label: "1½" }, { mult: 2, label: "2" }];
let sheetState = { slot: null, query: "" };

function norm(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function dishMatches(o, q) { return !q || norm(o.n).includes(norm(q)) || o.i.some((i) => norm(i).includes(norm(q))); }

function recentKey() { return `menujd.recent.${profile.id}.v1`; }
function loadRecent() { try { return JSON.parse(localStorage.getItem(recentKey())) || {}; } catch { return {}; } }
function pushRecent(slot, id) {
  const r = loadRecent();
  const arr = (r[slot] || []).filter((x) => x !== id);
  arr.unshift(id);
  r[slot] = arr.slice(0, 5);
  localStorage.setItem(recentKey(), JSON.stringify(r));
}

function openSheet(slot) {
  sheetState = { slot, query: "" };
  const s = profile.slots.find((x) => x.id === slot);
  $("#sheetTitle").textContent = "Añadir · " + s.label;
  showSheetList();
  $("#sheet").hidden = false; $("#sheetBg").hidden = false;
}
function showSheetList() {
  const slot = sheetState.slot;
  $("#sheetBody").dataset.slot = slot;
  $("#sheetBody").innerHTML = `
    <input type="search" id="sheetSearch" placeholder="Buscar un plato…" autocomplete="off" value="${esc(sheetState.query)}">
    <div id="recentRow"></div>
    <div id="sheetList"></div>
    <div id="foodRow"></div>
    <button class="btn ghost free-btn" type="button" data-ed-free="1">${ico("bowl")} Montar con ingredientes</button>
    <form class="custom" id="customForm">
      <b>Otra cosa (con tus macros)</b>
      <input type="text" id="cName" placeholder="Nombre (p. ej. café americano)" required>
      <div class="grid4">
        <label for="cK">kcal<input type="number" id="cK" inputmode="decimal" min="0" step="any" required></label>
        <label for="cP">Prot.<input type="number" id="cP" inputmode="decimal" min="0" step="any" value="0"></label>
        <label for="cC">Carb.<input type="number" id="cC" inputmode="decimal" min="0" step="any" value="0"></label>
        <label for="cF">Grasa<input type="number" id="cF" inputmode="decimal" min="0" step="any" value="0"></label>
      </div>
      <button class="btn" type="submit">Añadir</button>
    </form>`;
  renderSheetOptions();
  $("#sheetSearch").addEventListener("input", (e) => { sheetState.query = e.target.value; renderSheetOptions(); });
}
function renderSheetOptions() {
  const slot = sheetState.slot, q = sheetState.query;
  const recent = (loadRecent()[slot] || []).map((id) => profile.menu[slot].find((o) => o.id === id)).filter(Boolean);
  // Platos del plan que tocan el día abierto (los que llevan "(S1 · Lunes)" con ese día de la semana).
  const wd = norm(current.toLocaleDateString("es-ES", { weekday: "long" }));
  const planned = q ? [] : profile.menu[slot].filter((o) => { const tg = splitName(o.n).tag; return tg && norm(tg).endsWith(wd); });
  const optHTML = (o) => `<button class="opt" data-pick="${o.id}"><span class="code">${o.id}</span><span>${nameHTML(o.n)}${dishMissing(o).length ? `<small class="miss-mark">${ico("alert")} falta ${esc(missNames(dishMissing(o)))}</small>` : ""}</span><span class="kc">${o.k} kcal<br>${r0(o.p)} g P</span></button>`;
  $("#recentRow").innerHTML = (planned.length ? `<div class="recent-label">Toca hoy en el plan</div><div class="plan-list">${planned.map(optHTML).join("")}</div>` : "")
    + (recent.length && !q ? `<div class="recent-label">Recientes</div><div class="recent-row">${recent.map((o) => `<button class="chip-opt" data-pick="${o.id}">${esc(splitName(o.n).t)} <small>${o.k}</small></button>`).join("")}</div>` : "");
  const list = profile.menu[slot].filter((o) => dishMatches(o, q) && !planned.includes(o));
  $("#sheetList").innerHTML = (list.length && (planned.length || recent.length) && !q ? `<div class="recent-label">Todos</div>` : "")
    + (list.length ? list.map(optHTML).join("") : `<p class="empty">Sin platos que coincidan con "${esc(q)}".</p>`);
  renderFoodRow(q);
}
// Al buscar: tus productos e ingredientes del catálogo que coinciden (se registran por gramos) y, para lo que
// no esté, buscar en Google sus macros y apuntarlos en un formulario que se queda guardado en Mis productos.
function renderFoodRow(q) {
  const box = $("#foodRow");
  if (!box) return;
  const nq = norm(q.trim());
  if (nq.length < 2) { box.innerHTML = ""; return; }
  const words = nq.split(/\s+/).filter((w) => w.length > 2 && !["con", "de", "del", "los", "las"].includes(w));
  const opts = foodOptions().filter((o) => { const t = norm(o.label); return t.includes(nq) || (words.length && words.every((w) => t.includes(w))); })
    .map((o) => { const t = norm(o.label); return { o, s: (o.c.user ? 0 : 4) + (t === nq ? 0 : t.startsWith(nq) ? 1 : 2) + t.length / 100 }; })
    .sort((a, b) => a.s - b.s).map((x) => x.o).slice(0, 6);
  box.innerHTML = (opts.length ? `<div class="recent-label">Ingredientes y tus productos</div><div class="ed-options">${opts.map((o) => `<button class="opt rec has-thumb" data-food-log="${o.id}">${thumbHTML(o.c)}<span>${esc(o.label)}${o.c.user ? `<small>tu producto</small>` : ""}</span><span class="kc">${r0(o.nut[0])} kcal<br>${f1(o.nut[1])} g P /100 g</span></button>`).join("")}</div>` : "")
    + `<button class="btn ghost web-btn" type="button" data-web-search="1">${ico("search")} Buscar «${esc(q.trim())}» en Google</button>
    <p class="muted small">Abre Google con sus macros por 100 g; al volver tendrás el formulario preparado para apuntarlos.</p>`;
}
const googleUrl = (q) => "https://www.google.com/search?q=" + encodeURIComponent(`${q} macros por 100 g`);
// Formulario para apuntar lo encontrado en internet: macros por 100 g + gramos comidos → registra y crea el producto.
function openWebForm(q) {
  const name = q.trim().replace(/\s+/g, " ");
  const same = userProducts().find((p) => norm(p.n) === norm(name));
  const v = (i) => (same ? String(same.nut[i]).replace(".", ",") : "");
  $("#sheetBody").innerHTML = `
    <button class="back-link" type="button" data-web-back="1">${ico("back")} Volver a la búsqueda</button>
    <form id="webForm" class="custom">
      <a class="btn ghost web-btn" href="${googleUrl(name)}" target="_blank" rel="noopener">${ico("external")} Abrir otra vez en Google</a>
      <label for="wfName">Nombre<input type="text" id="wfName" value="${esc(name)}" required autocomplete="off"></label>
      <p class="muted small">Valores <b>por 100 g</b> (si solo encuentras los de una ración, divide entre sus gramos y multiplica por 100):</p>
      <div class="grid4">
        <label for="wfK">kcal<input type="text" inputmode="decimal" id="wfK" value="${v(0)}" required></label>
        <label for="wfP">Prot.<input type="text" inputmode="decimal" id="wfP" value="${v(1)}" placeholder="0"></label>
        <label for="wfC">Carb.<input type="text" inputmode="decimal" id="wfC" value="${v(2)}" placeholder="0"></label>
        <label for="wfF">Grasa<input type="text" inputmode="decimal" id="wfF" value="${v(3)}" placeholder="0"></label>
      </div>
      <label for="wfG">¿Cuántos gramos has comido?<input type="text" inputmode="decimal" id="wfG" placeholder="p. ej. 300" required></label>
      <label for="wfR">Tipo de alimento<select id="wfR"><option value="">Sin tipo</option>${Object.entries(ROLE_LABELS).map(([k, l]) => `<option value="${k}"${same && same.r === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <p class="ed-sum" id="wfPrev"></p>
      <button class="btn" type="submit">Registrar y guardar en Mis productos</button>
    </form>`;
  const prev = () => {
    const num = (id) => parseFloat($(id).value.replace(",", ".")) || 0, g = num("#wfG");
    $("#wfPrev").innerHTML = num("#wfK") && g ? `${fmtG(g)} g → <b>${macrosTxt({ k: num("#wfK") * g / 100, p: num("#wfP") * g / 100, c: num("#wfC") * g / 100, f: num("#wfF") * g / 100 })}</b>` : "";
  };
  $("#webForm").addEventListener("input", prev);
  prev();
}
function saveWebForm() {
  const num = (id) => parseFloat($(id).value.replace(",", ".")) || 0;
  let n = $("#wfName").value.trim().replace(/\s+/g, " "); n = n.charAt(0).toUpperCase() + n.slice(1);
  const k = num("#wfK"), g = num("#wfG");
  if (!n || !$("#wfK").value.trim() || !(g > 0)) { toast("Pon el nombre, las kcal por 100 g y los gramos"); return; }
  const list = userProducts(), same = list.find((p) => norm(p.n) === norm(n));
  const prod = { key: same ? same.key : "u" + Date.now().toString(36), n, nut: [k, num("#wfP"), num("#wfC"), num("#wfF")], ...($("#wfR").value ? { r: $("#wfR").value } : {}) };
  saveProducts([...list.filter((p) => p.key !== prod.key), prod]);
  logFood(prod.key + "|0", g);
}
// Registra un ingrediente o producto suelto con sus gramos (lleva i para que salga en la compra y en el coste).
function logFood(optId, g) {
  const o = foodOptions().find((x) => x.id === optId);
  if (!o || !(g > 0)) return;
  const w = o.cooked ? o.c.cooked.w : o.c.w;
  // En las de la compra por litros (bebidas, aceite) la cantidad va en ml; en el resto, en gramos.
  const u = o.c.u === "ml" ? "ml" : "g", gr = g * (u === "ml" ? o.c.dens || 1 : 1);
  const txt = `${fmtG(g)} ${u} de ${w}${unitsText(o, g)}`;
  const m = ingMacros(txt) || { k: (o.nut[0] * gr) / 100, p: (o.nut[1] * gr) / 100, c: (o.nut[2] * gr) / 100, f: (o.nut[3] * gr) / 100 };
  const n = o.c.g && o.c.u === "ud" ? `${o.label} · ${f1(g / o.c.g)} ud` : `${o.label} (${fmtG(g)} ${u})`;
  addItem(sheetState.slot, { n, i: [txt], m: 1, ...scaled(m, 1) });
  afterDishChange(); closeSheet();
  toast(sheetState.from === "menu" ? `Añadido a ${profile.slots.find((s) => s.id === sheetState.slot).label} · ${dayLabel(current).split(" · ")[0]}` : "Añadido: " + n);
}
// Contador de unidades para ingredientes que se cuentan por piezas (muffins, huevos, yogures…): rellena los gramos.
function unitsHTML(o, target) {
  if (!o.c.g) return "";
  return `<div class="units" data-ug="${o.c.g}" data-target="${target}">
    <div class="units-top"><span>Unidades <small>1 ≈ ${o.c.g} g</small></span>
      <div class="stepper"><button type="button" class="st-btn" data-u-step="-1" aria-label="Una menos">−</button><b class="units-v"></b><button type="button" class="st-btn" data-u-step="1" aria-label="Una más">+</button></div></div>
    <div class="recent-row">${[1, 2, 3, 4, 6].map((n) => `<button type="button" class="chip-opt" data-u-set="${n}">${n}</button>`).join("")}</div></div>`;
}
const gramsLabel = (o) => (o.c.u === "ml" ? "Gramos (o ml)" : "Gramos");
function syncUnits() {
  document.querySelectorAll(".units").forEach((box) => {
    const n = (parseFloat($("#" + box.dataset.target).value.replace(",", ".")) || 0) / +box.dataset.ug;
    box.querySelector(".units-v").textContent = f1(n);
    box.querySelectorAll("[data-u-set]").forEach((c) => c.classList.toggle("on", Math.abs(+c.dataset.uSet - n) < 0.01));
  });
}
function stepUnits(b) {
  const box = b.closest(".units"), inp = $("#" + box.dataset.target), g = +box.dataset.ug;
  const cur = (parseFloat(inp.value.replace(",", ".")) || 0) / g;
  const n = b.dataset.uSet ? +b.dataset.uSet : Math.max(0.5, Math.round(cur * 2) / 2 + +b.dataset.uStep);
  inp.value = fmtG(n * g);
  inp.dispatchEvent(new Event("input"));
}
const unitsText = (o, g) => (o.c.g && o.c.u === "ud" ? ` (${f1(g / o.c.g)} ud)` : "");
// "Otra cantidad": raciones de un plato fuera de ½/1/1½/2 (p. ej. 3×), de 0,5 en 0,5.
function multHTML(kind, per, dishId = "") {
  return `<div class="mult" data-kind="${kind}" data-dish="${dishId}" data-k="${per.k}" data-p="${per.p}" data-m="3">
    <div class="units-top"><span>Otra cantidad</span>
      <div class="stepper"><button type="button" class="st-btn" data-m-step="-0.5" aria-label="Menos">−</button><b class="units-v">3×</b><button type="button" class="st-btn" data-m-step="0.5" aria-label="Más">+</button></div></div>
    <button type="button" class="btn ghost mult-go" ${kind === "ent" ? `data-ent-portion="3"` : `data-portion="3" data-dish="${dishId}"`}>${kind === "ent" ? "Cambiar a" : "Añadir"} 3× · ${r0(per.k * 3)} kcal · ${f1(per.p * 3)} g P</button></div>`;
}
function stepMult(b) {
  const box = b.closest(".mult"), m = Math.min(10, Math.max(0.5, +box.dataset.m + +b.dataset.mStep));
  box.dataset.m = m;
  const lab = portionLabel(m), go = box.querySelector(".mult-go");
  box.querySelector(".units-v").textContent = lab + "×";
  if (box.dataset.kind === "ent") go.dataset.entPortion = m; else go.dataset.portion = m;
  go.textContent = `${box.dataset.kind === "ent" ? "Cambiar a" : "Añadir"} ${lab}× · ${r0(box.dataset.k * m)} kcal · ${f1(box.dataset.p * m)} g P`;
}
function openFoodGrams(optId) {
  const o = foodOptions().find((x) => x.id === optId);
  if (!o) return;
  $("#sheetBody").innerHTML = `
    ${sheetState.from === "menu" ? "" : `<button class="back-link" type="button" data-web-back="1">${ico("back")} Volver a la búsqueda</button>`}
    <form id="foodForm" class="portion-card" data-opt="${o.id}">
      ${sheetState.from === "menu" ? `<div class="prod-head">${thumbHTML(o.c)}<p><b>${esc(o.label)}</b><span class="muted small">${r0(o.nut[0])} kcal · ${f1(o.nut[1])} g P por 100 g</span></p></div>
      <p class="muted small">Se añade a <b>${esc(dayLabel(current))}</b> (el día abierto en Hoy).</p>
      <div class="recent-row slot-pick">${profile.slots.map((s) => `<button type="button" class="chip-opt${s.id === sheetState.slot ? " on" : ""}" data-slot-pick="${s.id}">${esc(s.label)}</button>`).join("")}</div>`
        : `<p><b>${esc(o.label)}</b> <span class="muted small">(${r0(o.nut[0])} kcal · ${f1(o.nut[1])} g P por 100 g)</span></p>`}
      ${unitsHTML(o, "ffG")}
      <label for="ffG">${o.c.u === "ml" ? "Mililitros" : "Gramos"}<input type="text" inputmode="decimal" id="ffG" value="${o.c.g || (o.c.u === "ml" ? 200 : 100)}"></label>
      <p class="ed-sum" id="ffPrev"></p>
      <button class="btn" type="submit" id="ffGo">${sheetState.from === "menu" ? `Añadir a ${esc(profile.slots.find((s) => s.id === sheetState.slot).label)}` : "Registrar"}</button>
    </form>`;
  const prev = () => { const g = (parseFloat($("#ffG").value.replace(",", ".")) || 0) * (o.c.u === "ml" ? o.c.dens || 1 : 1); $("#ffPrev").innerHTML = g ? `<b>${macrosTxt({ k: o.nut[0] * g / 100, p: o.nut[1] * g / 100, c: o.nut[2] * g / 100, f: o.nut[3] * g / 100 })}</b>` : ""; };
  $("#ffG").addEventListener("input", () => { prev(); syncUnits(); }); prev(); syncUnits();
}
function openPortionStep(dishId) {
  const o = byId(dishId);
  $("#sheetTitle").textContent = splitName(o.n).t;
  $("#sheetBody").innerHTML = `
    <button class="back-link" id="portionBack" type="button">${ico("back")} Elegir otro plato</button>
    <div class="portion-card">
      <p class="muted">¿Qué ración quieres registrar?</p>
      <div class="portion-row">
        ${PORTIONS.map((pt) => `<button class="portion-btn${pt.mult === 1 ? " is-default" : ""}" data-portion="${pt.mult}" data-dish="${o.id}">
          <b>${pt.label}×</b><span>${r0(o.k * pt.mult)} kcal · ${f1(o.p * pt.mult)} g P</span></button>`).join("")}
      </div>
      ${multHTML("portion", o, o.id)}
      ${dishMissing(o).length ? `<p class="miss-note"><span>${ico("alert")} No tienes ${esc(missNames(dishMissing(o)))}.</span></p><button class="btn" type="button" data-ed-fixlog="${o.id}">Sustituir solo para hoy</button>` : ""}
      <button class="btn ghost" type="button" data-ed-logdish="${o.id}">${ico("edit")} Cambiar ingredientes solo para hoy</button>
    </div>`;
}
function closeSheet() { $("#sheet").hidden = true; $("#sheetBg").hidden = true; }

/* ---------- fotos de productos ----------
   Catálogo: img/p/<key>.webp (160×160, Wikimedia Commons; autor y licencia en img/p/credits.json). Se descargan al
   mostrarse y sw.js las guarda en una caché aparte que no se borra al cambiar de versión.
   Propias: hechas o elegidas en el móvil, reducidas a 160×160 JPEG y guardadas en localStorage["menujd.photos.v1"] =
   { clave: dataURL }, comunes a los perfiles. Mandan sobre la del catálogo. No van en la copia de seguridad. */
const PHOTO_PX = 160;
function photosKey() { return "menujd.photos.v1"; }
let photoCache = null;
function loadPhotos() {
  if (!photoCache) { try { photoCache = JSON.parse(localStorage.getItem(photosKey())) || {}; } catch { photoCache = {}; } }
  return photoCache;
}
function savePhotos(p) {
  try { localStorage.setItem(photosKey(), JSON.stringify(p)); photoCache = p; return true; }
  catch { toast("No queda espacio para más fotos en este móvil"); return false; }
}
function photoSrc(c) {
  if (!c) return null;
  return loadPhotos()[c.key] || (c.user ? null : `img/p/${c.key}.webp`);
}
// Miniatura cuadrada; sin foto, la inicial sobre un fondo neutro (y lo mismo si la imagen no carga).
function thumbHTML(c) {
  const src = photoSrc(c), ini = esc(((c && c.n) || "?").charAt(0).toUpperCase());
  return src ? `<img class="thumb" src="${src}" alt="" width="40" height="40" loading="lazy" decoding="async" data-ini="${ini}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'thumb ph',textContent:this.dataset.ini}))">`
    : `<span class="thumb ph" aria-hidden="true">${ini}</span>`;
}
// En Hoy, solo para lo registrado como un único ingrediente (fruta, un yogur…): los platos no tienen foto.
function entryThumb(x) {
  if (!x.i || x.i.length !== 1) return "";
  const { c } = parseIng(x.i[0]);
  return c ? thumbHTML(c) : "";
}
// Recorta al centro y reduce a 160×160 JPEG (~8 KB): admite fotos de cámara (también HEIC en iPhone) y de la galería.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const cv = document.createElement("canvas"); cv.width = cv.height = PHOTO_PX;
      cv.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_PX, PHOTO_PX);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto")); };
    img.src = url;
  });
}
let photoTarget = null;
function renderPhotoList() {
  const box = $("#photoList");
  if (!box) return;
  const q = norm(($("#photoSearch").value || "").trim()), own = loadPhotos();
  const list = catalog().filter((c) => !q || norm(c.n).includes(q))
    .sort((a, b) => !!own[b.key] - !!own[a.key] || a.n.localeCompare(b.n, "es"));
  const shown = q ? list : list.slice(0, 12);
  box.innerHTML = shown.map((c) => `<li class="has-thumb">${thumbHTML(c)}<span><b>${esc(c.n)}</b><small>${own[c.key] ? "foto tuya" : c.user ? "sin foto" : "foto genérica"}</small></span>
      <button class="btn ghost small" type="button" data-photo-take="${c.key}">${ico("camera")} ${own[c.key] ? "Cambiar" : "Tu foto"}</button>
      ${own[c.key] ? `<button class="del" type="button" data-photo-del="${c.key}" aria-label="Quitar tu foto de ${esc(c.n)}">${ico("x")}</button>` : "<span></span>"}</li>`).join("")
    + (!q && list.length > shown.length ? `<li class="empty">Busca para ver los ${list.length - shown.length} restantes.</li>` : "")
    + (q && !list.length ? `<li class="empty">Nada con «${esc(q)}».</li>` : "");
}
$("#photoSearch").addEventListener("input", renderPhotoList);
$("#photoList").addEventListener("click", (e) => {
  const take = e.target.closest("[data-photo-take]"), del = e.target.closest("[data-photo-del]");
  if (take) { photoTarget = take.dataset.photoTake; $("#photoFile").value = ""; $("#photoFile").click(); }
  if (del) {
    const before = loadPhotos(), p = { ...before }; delete p[del.dataset.photoDel];
    if (savePhotos(p)) { renderPhotoList(); toast("Foto quitada", 6000, { label: "Deshacer", fn: () => { if (savePhotos(before)) { renderPhotoList(); renderProducts(); } } }); }
  }
});
$("#photoFile").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file || !photoTarget) return;
  try {
    const data = await shrinkPhoto(file);
    if (savePhotos({ ...loadPhotos(), [photoTarget]: data })) { renderPhotoList(); renderProducts(); toast("Foto guardada"); }
  } catch (err) { toast(err.message || "No se pudo guardar la foto"); }
  photoTarget = null;
});
$("#photoCredits").addEventListener("toggle", async (e) => {
  if (!e.target.open || $("#creditList").childElementCount) return;
  try {
    const cr = await (await fetch("img/p/credits.json")).json();
    $("#creditList").innerHTML = SHOP.filter((c) => cr[c.key]).map((c) => { const x = cr[c.key];
      return `<li><b>${esc(c.n)}</b>: <a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a> · ${esc(x.a)} · ${esc(x.l)}</li>`; }).join("");
  } catch { $("#creditList").innerHTML = "<li>Sin conexión: no se pudieron cargar los créditos.</li>"; }
});

/* ---------- ingredientes: compra y coste ---------- */
// Convierte "2 latas atún al natural (112 g)" en { c: entrada de SHOP, qty: 112 } en la unidad de compra de esa entrada.
// qty null = sin cantidad ("al gusto"); c null = ingrediente que no está en el catálogo.
const QTY = "(\\d+(?:[.,]\\d+)?(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?|\\d*[½¼¾])";
function qtyVal(s) {
  const frac = { "½": 0.5, "¼": 0.25, "¾": 0.75 };
  const m = s.match(/^(\d*)([½¼¾])$/);
  if (m) return (+m[1] || 0) + frac[m[2]];
  const nums = s.split(/[-–]/).map((x) => parseFloat(x.replace(",", ".")));
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
const parseCache = new Map();
// Productos propios (Mis productos): { key, n, nut:[kcal,P,C,G] por 100 g, g?: gramos por unidad }. Comunes a todos los perfiles.
function productsKey() { return "menujd.products.v1"; }
function userProducts() { try { return JSON.parse(localStorage.getItem(productsKey())) || []; } catch { return []; } }
function saveProducts(list) { try { localStorage.setItem(productsKey(), JSON.stringify(list)); } catch { toast("No se pudo guardar en este dispositivo"); } parseCache.clear(); }
function productEntry(p) { return { key: p.key, n: p.n, u: "g", g: p.g || null, nut: p.nut, w: p.n, cat: "Mis productos", user: true, r: p.r || "" }; }
function catalog() { return [...userProducts().map(productEntry), ...SHOP]; }
// Grupos de alimento (campo r de SHOP) que se pueden elegir para Mis productos.
const ROLE_LABELS = { prot: "Carne, pescado o huevo", lacteo: "Lácteo", queso: "Queso", polvo: "Proteína en polvo", hc: "Pan, cereal, pasta, arroz o patata",
  fruta: "Fruta", verdura: "Verdura", grasa: "Grasa o frutos secos", dulce: "Dulce", salsa: "Salsa", casero: "Casero", bebida: "Bebida" };

/* ---------- "No tengo": ingredientes que faltan en casa ---------- */
// Claves del catálogo; comunes a todos los perfiles (la despensa es la misma). Los platos que los llevan
// salen marcados con ⚠ y con un botón para sustituirlos, y no se recomiendan como sustitutos.
function missingKey() { return "menujd.missing.v1"; }
function loadMissing() { try { return JSON.parse(localStorage.getItem(missingKey())) || []; } catch { return []; } }
function saveMissing(list) { try { localStorage.setItem(missingKey(), JSON.stringify([...new Set(list)])); } catch { toast("No se pudo guardar en este dispositivo"); } }
function setMissing(key, on) { const l = loadMissing().filter((k) => k !== key); saveMissing(on ? [...l, key] : l); }
// Ingredientes del plato que no tienes: [{ idx, c }].
function dishMissing(o) {
  const miss = loadMissing();
  if (!miss.length || !o || !o.i) return [];
  return o.i.map((raw, idx) => ({ idx, c: parseIng(raw).c })).filter((x) => x.c && miss.includes(x.c.key));
}
const missNames = (list) => [...new Set(list.map((x) => x.c.n))].join(", ");
// Devuelve { c, qty (unidad de compra), grams (peso tal como se escribe), cooked, nut (por 100 g), raw }.
function parseIng(raw) {
  if (parseCache.has(raw)) return parseCache.get(raw);
  const t = norm(raw);
  const own = userProducts().find((p) => t.includes(norm(p.n)));
  const c = own ? productEntry(own) : SHOP.find((x) => x.re.test(t)) || null;
  let amount = null, unit = null; // unit: "g" | "ml" | null (= unidades)
  const lead = t.match(new RegExp("^" + QTY + "\\s*(g|ml)?\\b"));
  let parenG = null;
  if (lead) {
    amount = qtyVal(lead[1]); unit = lead[2] || null;
    if (!unit) { const pg = t.match(new RegExp("\\([^)]*?" + QTY + "\\s*g\\b")); if (pg) parenG = qtyVal(pg[1]); }
    if (!unit && parenG != null && c && c.u !== "ud") { amount = parenG; unit = "g"; }
  } else {
    const any = t.match(new RegExp(QTY + "\\s*(g|ml)\\b"));
    if (any) { amount = qtyVal(any[1]); unit = any[2]; }
  }
  let qty = null, grams = null;
  const cooked = !!(c && c.cooked && c.cooked.re.test(t));
  if (c && amount != null) {
    if (c.u === "ud") qty = unit ? (c.g ? amount / c.g : null) : amount;
    else if (c.u === "ml") qty = unit === "ml" ? amount : unit === "g" ? amount / (c.dens || 1) : null;
    else qty = unit ? amount : (c.g ? amount * c.g : null);
    if (qty != null && cooked) qty *= c.cooked.f;
    if (unit === "g") grams = amount;
    else if (unit === "ml") grams = amount * (c.dens || 1);
    else grams = parenG != null ? parenG : c.g ? amount * c.g : null;
  }
  const nut = c ? (cooked ? c.cooked.nut : c.nut) || null : null;
  const res = { c, qty, grams, cooked, nut, raw };
  parseCache.set(raw, res);
  return res;
}
// Macros de una línea de ingrediente: { k, p, c, f } o null si no se pueden calcular.
function ingMacros(raw) {
  const { grams, nut } = parseIng(raw);
  if (grams == null || !nut) return null;
  const x = grams / 100;
  return { k: nut[0] * x, p: nut[1] * x, c: nut[2] * x, f: nut[3] * x };
}
function pricesKey() { return "menujd.prices.v1"; }
function loadPrices() { try { return JSON.parse(localStorage.getItem(pricesKey())) || {}; } catch { return {}; } }
function savePrices() { try { localStorage.setItem(pricesKey(), JSON.stringify(prices)); } catch { toast("No se pudo guardar en este dispositivo"); } }
let prices = loadPrices();
function itemCost(c, qty) {
  const pr = prices[c.key];
  if (pr == null) return null;
  return c.u === "ud" ? qty * pr : (qty / 1000) * pr;
}
// Coste de un plato con los precios que haya: { eur, missing } (missing = ingredientes con cantidad pero sin precio).
function dishCost(o, mult = 1) {
  let eur = 0, missing = 0, priced = 0;
  for (const raw of o.i) {
    const { c, qty } = parseIng(raw);
    if (!c || qty == null) continue;
    const v = itemCost(c, qty * mult);
    if (v == null) missing++; else { eur += v; priced++; }
  }
  return { eur, missing, priced };
}
const eurFmt = (x) => x.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "\u00a0€";
function costLabel(cost) {
  if (!cost || !cost.priced) return "";
  return (cost.missing ? "≥\u00a0" : "≈\u00a0") + eurFmt(cost.eur);
}
// Ración registrada de un plato: las entradas nuevas guardan m; las antiguas se deducen de las kcal.
function itemMult(x, o) { return x.m || (o && o.k ? x.k / o.k : 1); }
function itemDishCost(x) {
  if (x.i) return dishCost({ i: x.i }, x.m || 1);
  const o = x.ref && byId(x.ref);
  return o ? dishCost(o, itemMult(x, o)) : null;
}

/* ---------- MENÚ ---------- */
function cardHTML(o, addable = true) {
  return `<article class="card"><h3><span class="code">${o.id}</span><span>${nameHTML(o.n)}</span>${o.mod ? `<span class="mod-tag">modificado</span>` : ""}</h3>
    <ul>${o.i.map((x) => `<li>${x}</li>`).join("")}</ul>
    ${o.t ? `<p class="tip">${o.t}</p>` : ""}
    ${addable && dishMissing(o).length ? `<p class="miss-note"><span>${ico("alert")} Te falta: ${esc(missNames(dishMissing(o)))}</span><button class="add-btn" data-fix="${o.id}">Sustituir</button></p>` : ""}
    <div class="macros"><span><b>${o.k}</b> kcal</span><span>P <b>${r0(o.p)}</b></span><span>C ${r0(o.c)}</span><span>G ${r0(o.f)}</span>${costLabel(dishCost(o)) ? `<span class="cost">${costLabel(dishCost(o))}</span>` : ""}
    ${addable ? `<span class="card-btns"><button class="add-btn edit-btn" data-edit="${o.id}" aria-label="Cambiar ingredientes de ${esc(o.n)}">${ico("edit")} Cambiar</button><button class="add-btn" data-quick="${o.id}">+ Hoy</button></span>` : ""}</div></article>`;
}
let avgS = {};
function renderPantry() {
  const miss = loadMissing(), cat = catalog();
  const list = miss.map((k) => cat.find((c) => c.key === k)).filter(Boolean);
  const hit = list.length ? ALL.filter((o) => dishMissing(o).length).length : 0;
  $("#pantry").innerHTML = `<div class="pantry-head"><div><b>¿Te falta algo en casa?</b>
      <small>${list.length ? `${hit} ${hit === 1 ? "plato lo lleva" : "platos lo llevan"}: salen marcados para sustituirlo` : "Márcalo y te digo qué platos cambiar y por qué"}</small></div>
      <button class="add-btn" data-miss-open="1">${ico("plus")} Me falta…</button></div>
    ${list.length ? `<div class="recent-row">${list.map((c) => `<button class="chip-opt miss" data-miss-off="${c.key}" aria-label="Ya tengo ${esc(c.n)}">${esc(c.n)} ${ico("x")}</button>`).join("")}</div>` : ""}`;
}
function openMissingSheet() {
  sheetState = { slot: null, query: "" };
  $("#sheetTitle").textContent = "¿Qué te falta?";
  $("#sheetBody").innerHTML = `<input type="search" id="missSearch" placeholder="Buscar ingrediente…" autocomplete="off">
    <div id="missList" class="ed-options"></div>
    <p class="muted small">Toca para marcar o desmarcar. Cuando lo compres, desmárcalo (o márcalo en la lista de la compra).</p>`;
  renderMissingList();
  $("#missSearch").addEventListener("input", (e) => { sheetState.query = e.target.value; renderMissingList(); });
  $("#sheet").hidden = false; $("#sheetBg").hidden = false;
}
function renderMissingList() {
  const q = norm(sheetState.query || ""), miss = loadMissing();
  const list = catalog().filter((c) => !q || norm(c.n).includes(q)).sort((a, b) => miss.includes(b.key) - miss.includes(a.key) || a.n.localeCompare(b.n, "es"));
  $("#missList").innerHTML = list.map((c) => `<button class="opt has-thumb${miss.includes(c.key) ? " is-miss" : ""}" data-miss-toggle="${c.key}">${thumbHTML(c)}<span>${esc(c.n)}</span><span class="kc">${miss.includes(c.key) ? "no tengo" : ""}</span></button>`).join("")
    || `<p class="empty">Nada con "${esc(sheetState.query)}".</p>`;
}
function afterMissingChange() { renderPantry(); renderMenuList(); if (profile.builder) fillBuilder(); }
/* ---------- Menú → Productos: el catálogo con fotos para añadir algo suelto a una comida del día abierto ---------- */
let menuTab = "platos", prodCat = "";
function setMenuTab(tab) {
  menuTab = tab;
  $("#view-menu").classList.toggle("show-products", tab === "productos");
  $("#tabDishes").setAttribute("aria-selected", tab === "platos");
  $("#tabProducts").setAttribute("aria-selected", tab === "productos");
  if (tab === "productos") renderProductsPane();
}
// Franja propuesta según la hora (en días que no son hoy, la primera): el usuario la cambia en la hoja.
function guessSlot() {
  const ids = profile.slots.map((s) => s.id);
  if (iso(current) !== iso(new Date())) return ids[0];
  const h = new Date().getHours();
  const want = h < 11 ? ["D"] : h < 13 ? ["M", "C"] : h < 16 ? ["C"] : h < 20 ? ["Me", "S"] : ["N"];
  return want.find((id) => ids.includes(id)) || ids[0];
}
function renderProductsPane() {
  const q = norm(($("#prodSearch").value || "").trim()), opts = foodOptions();
  const cats = SHOP_CATS.filter((cat) => opts.some((o) => o.c.cat === cat));
  $("#prodCats").innerHTML = [["", "Todo"], ...cats.map((c) => [c, c])].map(([v, l]) => `<button type="button" class="chip-opt${v === prodCat ? " on" : ""}" data-prod-cat="${esc(v)}">${esc(l)}</button>`).join("");
  const list = opts.filter((o) => (!prodCat || o.c.cat === prodCat) && (!q || norm(o.label).includes(q)));
  $("#prodHint").textContent = `Toca uno para añadirlo a una comida de ${dayLabel(current).split(" · ")[0].toLowerCase()}.`;
  const row = (o) => `<button class="opt rec has-thumb" data-prod-add="${o.id}">${thumbHTML(o.c)}<span>${esc(o.label)}${o.c.g && o.c.u === "ud" ? `<small>1 ud ≈ ${o.c.g} g</small>` : ""}</span><span class="kc">${r0(o.nut[0])} kcal<br>${f1(o.nut[1])} g P /100 g</span></button>`;
  const groups = q || prodCat ? [[null, list]] : cats.map((cat) => [cat, list.filter((o) => o.c.cat === cat)]);
  $("#prodList").innerHTML = list.length
    ? groups.map(([cat, l]) => `${cat ? `<h3 class="recent-label">${esc(cat)}</h3>` : ""}<div class="ed-options">${[...l].sort((a, b) => a.label.localeCompare(b.label, "es")).map(row).join("")}</div>`).join("")
    : `<p class="empty">Nada con «${esc($("#prodSearch").value.trim())}». Puedes buscarlo en Google desde Hoy → Añadir.</p>`;
}
function openProductSheet(optId) {
  const o = foodOptions().find((x) => x.id === optId);
  if (!o) return;
  sheetState = { slot: guessSlot(), query: "", from: "menu" };
  $("#sheetTitle").textContent = "Añadir producto";
  openFoodGrams(optId);
  $("#sheet").hidden = false; $("#sheetBg").hidden = false;
}
$("#view-menu").addEventListener("click", (e) => {
  const tab = e.target.closest("[data-mtab]"), cat = e.target.closest("[data-prod-cat]"), add = e.target.closest("[data-prod-add]");
  if (tab) setMenuTab(tab.dataset.mtab);
  else if (cat) { prodCat = cat.dataset.prodCat; renderProductsPane(); }
  else if (add) openProductSheet(add.dataset.prodAdd);
});
$("#prodSearch").addEventListener("input", renderProductsPane);

function renderMenuList() {
  $("#menuList").innerHTML = profile.slots.map((s) => `
    <section class="group"><h2>${s.label}s<small>${s.hint}</small></h2>
    <div class="cards">${profile.menu[s.id].map((o) => cardHTML(o)).join("")}</div></section>`).join("");
}
function renderMenu() {
  $("#menuLead").textContent = profile.builder
    ? "Cualquier combinación de desayuno, comida y cena da aproximadamente lo mismo. Los snacks ajustan al objetivo del día."
    : "Plan de referencia: cada tarjeta es uno de los platos de tu plan, con sus kcal, proteína, carbohidratos y grasa.";
  renderPantry(); renderMenuList();
  if (menuTab === "productos") renderProductsPane();

  $("#builderSection").hidden = !profile.builder;
  if (!profile.builder) return;
  fillBuilder();
  $("#bT").innerHTML = profile.dayTypes.map((t) => `<option value="${t.id}">${t.label}</option>`).join("");
  const snacks = profile.builder.snackSlot ? profile.menu[profile.builder.snackSlot] : [];
  avgS = snacks.length
    ? { k: snacks.reduce((a, o) => a + o.k, 0) / snacks.length, p: snacks.reduce((a, o) => a + o.p, 0) / snacks.length }
    : { k: 0, p: 0 };
  updBuilder();
}
function fillBuilder() {
  const [mainD, mainC, mainN] = profile.builder.main;
  const fill = (id, arr) => { const v = $(id).value; $(id).innerHTML = arr.map((o) => `<option value="${o.id}">${dishMissing(o).length ? "⚠ " : ""}${o.id} · ${esc(o.n)}</option>`).join(""); if (v) $(id).value = v; };
  fill("#bD", profile.menu[mainD]); fill("#bC", profile.menu[mainC]); fill("#bN", profile.menu[mainN]);
}
function updBuilder() {
  if (!profile.builder) return;
  const d = byId($("#bD").value), c = byId($("#bC").value), n = byId($("#bN").value);
  const t = profile.dayTypes.find((x) => x.id === $("#bT").value);
  const base = d.k + c.k + n.k, k = base + t.mods * avgS.k, p = d.p + c.p + n.p + t.mods * avgS.p;
  const diff = r0(k - t.kcal);
  $("#bTot").innerHTML = `<div><small>Base</small><strong>${base}</strong></div>
    <div><small>+ ${t.mods} snacks</small><strong>${r0(k)} kcal</strong></div>
    <div><small>Proteína</small><strong>${r0(p)} g</strong></div>
    <div><small>vs objetivo</small><strong class="${Math.abs(diff) <= 60 ? "ok" : "off"}">${diff > 0 ? "+" : ""}${diff}</strong></div>`;
}

/* ---------- EDITOR DE PLATOS: cambiar, quitar o añadir ingredientes ---------- */
// Los macros del plato se ajustan por diferencia (se resta lo que se quita y se suma lo que se pone),
// así el resto del plato conserva sus valores originales (etiquetas reales en JD, estimaciones en Cristina).
let ed = null;
const fmtG = (g) => String(Math.round(g)).replace(".", ",");
const addM = (a, b, sign = 1) => ({ k: a.k + sign * b.k, p: a.p + sign * b.p, c: a.c + sign * b.c, f: a.f + sign * b.f });
function macrosTxt(m) { return `${r0(m.k)} kcal · P ${f1(m.p)} · C ${r0(m.c)} · G ${r0(m.f)}`; }
function bandStatus(slotId, m) {
  const t = (profile.slots.find((s) => s.id === slotId) || {}).target;
  if (!t) return "";
  const out = [];
  const dk = m.k - t.k;
  if (Math.abs(dk) > 15) out.push(`${dk > 0 ? "+" : ""}${r0(dk)} kcal`);
  if (t.p != null) { const dp = m.p - t.p; if (Math.abs(dp) > 3) out.push(`${dp > 0 ? "+" : ""}${f1(dp)} g P`); }
  else if (m.p < t.pMin || m.p > t.pMax) out.push(`proteína fuera de ${t.pMin}–${t.pMax} g`);
  return out.length ? `<p class="band off">Fuera de la franja (${t.k} kcal): ${out.join(", ")}</p>` : `<p class="band ok">${ico("check")} Dentro de la franja</p>`;
}
// Modos: "dish" (plato del Menú, se guarda para siempre en este móvil), "log" (solo para registrarlo hoy),
// "free" (comida montada desde cero con ingredientes) y "entry" (algo ya registrado en Hoy).
const ZERO = { k: 0, p: 0, c: 0, f: 0 };
function showEditor(state, title) {
  ed = state;
  $("#sheetTitle").textContent = title;
  renderEditor();
  $("#sheet").hidden = false; $("#sheetBg").hidden = false;
}
function openEditor(id) {
  const o = byId(id), slot = slotOf(id);
  showEditor({ mode: "dish", id, slot, n: o.n, i: [...o.i], m: { k: o.k, p: o.p, c: o.c, f: o.f }, base: profile._baseMenu[slot].find((x) => x.id === id) }, "Cambiar · " + o.n);
}
function openLogEditor(id) {
  const o = byId(id);
  showEditor({ mode: "log", id, slot: sheetState.slot, n: o.n, i: [...o.i], m: { k: o.k, p: o.p, c: o.c, f: o.f }, base: o }, "Solo para hoy · " + o.n);
}
function openFreeEditor() {
  showEditor({ mode: "free", slot: sheetState.slot, n: "", i: [], m: { ...ZERO }, base: { n: "", i: [], ...ZERO } }, "Montar con ingredientes");
}
function openEntryEditor() {
  const x = getDay(entState.key).items[entState.idx];
  const o = x.ref && byId(x.ref);
  const mult = entryMult(x);
  const per = { k: x.k / mult, p: x.p / mult, c: (x.c || 0) / mult, f: (x.f || 0) / mult };
  const i = x.i || (o ? o.i : []);
  showEditor({ mode: "entry", slot: x.slot, n: baseName(x.n), i: [...i], m: per, base: { n: baseName(x.n), i: [...i], ...per }, mult }, "Ingredientes · " + baseName(x.n));
}
function renderEditor() {
  const b = ed.base, free = ed.mode === "free";
  const changed = ed.i.join("\n") !== b.i.join("\n") || ed.n.trim() !== b.n;
  const showOrig = !free && (changed || (ed.mode === "dish" && byId(ed.id).mod));
  const actions = {
    dish: `<button class="btn" data-ed-save="1">Guardar plato</button>${byId(ed.id || "") && byId(ed.id).mod ? `<button class="btn ghost" data-ed-reset="1">Restaurar original</button>` : ""}`,
    log: `<div class="portion-row">${PORTIONS.map((pt) => `<button class="portion-btn${pt.mult === 1 ? " is-default" : ""}" data-ed-log="${pt.mult}"><b>${pt.label}×</b><span>${r0(ed.m.k * pt.mult)} kcal · ${f1(ed.m.p * pt.mult)} g P</span></button>`).join("")}</div>`,
    free: `<button class="btn" data-ed-log="1"${ed.i.length ? "" : " disabled"}>Registrar</button>`,
    entry: `<button class="btn" data-ed-entry="1">Guardar cambios</button>`,
  }[ed.mode];
  const note = {
    dish: "El cambio se guarda en este móvil y se usa al registrar, en Monta tu día, la lista de la compra y los costes. Lo ya registrado no cambia.",
    log: "Solo cambia lo que registras ahora; el plato del Menú se queda como está. Elige la ración para registrarlo.",
    free: "Añade los ingredientes con sus gramos y los macros se calculan solos.",
    entry: `Cambia solo esta entrada del registro${ed.mult !== 1 ? ` (ración ${f1(ed.mult)}×; los valores de arriba son por ración)` : ""}.`,
  }[ed.mode];
  $("#sheetBody").innerHTML = `
    <label for="edName">${free ? "Nombre (opcional)" : "Nombre del plato"}<input type="text" id="edName" value="${esc(ed.n)}" placeholder="${free ? "p. ej. Tostadas con pavo" : ""}" autocomplete="off"></label>
    <div class="ed-list">${ed.i.length ? ed.i.map((raw, idx) => {
      const m = ingMacros(raw);
      const miss = loadMissing().includes((parseIng(raw).c || {}).key);
      return `<div class="ed-row${miss ? " is-miss" : ""}"><div class="ed-name"><b>${esc(raw)}</b><small>${miss ? "no lo tienes · " : ""}${m ? `${r0(m.k)} kcal · ${f1(m.p)} g P` : "sin macros (no se puede cambiar)"}</small></div>
        ${m ? `<button class="chip-opt" data-ed-change="${idx}">Cambiar</button><button class="del" data-ed-remove="${idx}" aria-label="Quitar ${esc(raw)}">${ico("x")}</button>` : ""}</div>`;
    }).join("") : `<p class="empty">Aún no hay ingredientes.</p>`}</div>
    <button class="btn ghost" data-ed-add="1">${ico("plus")} Añadir ingrediente</button>
    <div class="ed-total">
      <div><small>${ed.mode === "log" || ed.mode === "entry" ? "Ahora (1 ración)" : "Ahora"}</small><b>${macrosTxt(ed.m)}</b></div>
      ${showOrig ? `<div><small>Original</small><span>${macrosTxt(b)}</span></div>` : ""}
      ${ed.i.length ? bandStatus(ed.slot, ed.m) : ""}
    </div>
    <div class="row">${actions}</div>
    <p class="muted small">${note}</p>`;
  $("#edName").addEventListener("input", (e) => { ed.n = e.target.value; });
}
const portionLabel = (mult) => (PORTIONS.find((p) => p.mult === mult) || { label: String(mult).replace(".", ",") }).label;
const baseName = (n) => String(n).replace(/ · ración [^·]*$/, "");
const withPortion = (n, mult) => baseName(n) + (mult === 1 ? "" : ` · ración ${portionLabel(mult)}`);
function scaled(m, mult) { return { k: r0(m.k * mult), p: r1(m.p * mult), c: r1(m.c * mult), f: r1(m.f * mult) }; }
// Registra lo del editor (modos log y free) en la franja abierta de Hoy.
function logFromEditor(mult) {
  if (!ed.i.length) { toast("Añade al menos un ingrediente"); return; }
  const changed = ed.i.join("\n") !== ed.base.i.join("\n");
  let n = ed.n.trim();
  if (ed.mode === "free" && !n) n = ed.i.join(" + ").slice(0, 70);
  if (ed.mode === "log" && changed && n === ed.base.n) n += " · con cambios";
  const item = { n: withPortion(n || ed.base.n, mult), m: mult, ...scaled(ed.m, mult) };
  if (ed.mode === "log") { item.ref = ed.id; pushRecent(sheetState.slot, ed.id); }
  if (ed.mode === "free" || changed) item.i = [...ed.i];
  addItem(sheetState.slot, item);
  closeSheet(); toast("Añadido: " + item.n);
}
function saveEntryFromEditor() {
  const day = getDay(entState.key), x = day.items[entState.idx];
  const changed = ed.i.join("\n") !== ed.base.i.join("\n");
  Object.assign(x, scaled(ed.m, ed.mult), { m: ed.mult, n: withPortion(ed.n.trim() || ed.base.n, ed.mult) });
  if (changed || x.i) x.i = [...ed.i];
  saveAll(db); renderHoy(); closeSheet(); toast("Entrada actualizada");
}
// Opciones del buscador: cada entrada del catálogo con macros (y su versión cocinada si la tiene) + Mis productos.
function foodOptions() {
  const out = [];
  for (const c of catalog()) {
    if (c.nut) out.push({ id: c.key + "|0", c, cooked: false, label: c.n, nut: c.nut });
    if (c.cooked && c.cooked.nut) out.push({ id: c.key + "|1", c, cooked: true, label: c.cooked.w.charAt(0).toUpperCase() + c.cooked.w.slice(1), nut: c.cooked.nut });
  }
  return out;
}
function openPicker(idx) {
  ed.idx = idx; ed.q = "";
  const old = idx != null ? ed.i[idx] : null;
  $("#sheetBody").innerHTML = `
    <button class="back-link" type="button" data-ed-back="1">${ico("back")} Volver al plato</button>
    ${old ? `<p class="muted small">Cambiar <b>${esc(old)}</b> por…</p>` : `<p class="muted small">Añadir al plato…</p>`}
    <input type="search" id="edSearch" placeholder="Buscar ingrediente…" autocomplete="off">
    <div id="edRecs"></div>
    <div id="edOptions" class="ed-options"></div>
    <details class="ed-new"><summary>¿No está? Crear producto con sus macros</summary>
      <form id="prodForm" class="custom">
        <input type="text" id="prName" placeholder="Nombre (p. ej. skyr natural Hacendado)" required>
        <p class="muted small">Valores por 100 g (de la etiqueta):</p>
        <div class="grid4">
          <label for="prK">kcal<input type="text" inputmode="decimal" id="prK" required></label>
          <label for="prP">Prot.<input type="text" inputmode="decimal" id="prP" value="0"></label>
          <label for="prC">Carb.<input type="text" inputmode="decimal" id="prC" value="0"></label>
          <label for="prF">Grasa<input type="text" inputmode="decimal" id="prF" value="0"></label>
        </div>
        <label for="prG">Peso de una unidad en g (opcional)<input type="text" inputmode="decimal" id="prG" placeholder="p. ej. 125"></label>
        <label for="prR">Tipo de alimento (para recomendarlo como sustituto)<select id="prR"><option value="">Sin tipo (se recomienda para todo)</option>${Object.entries(ROLE_LABELS).map(([k, v]) => `<option value="${k}"${old && roleGroup((parseIng(old).c || {}).r) === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
        <button class="btn" type="submit">Crear y usar</button>
      </form>
    </details>`;
  renderPickerOptions();
  $("#edSearch").addEventListener("input", (e) => { ed.q = e.target.value; renderPickerOptions(); });
}
// Sustitutos recomendados: para cada ingrediente con macros se calculan los gramos "auto" que suplen
// al que se cambia y se puntúa cuánto se parecen los cuatro macros (en unidades de tolerancia).
// Así salen primero los que encajan sin descuadrar el plato (p. ej. pollo → pavo, merluza o atún).
// Grupos afines que también valen como sustituto (para grupos con pocos ingredientes).
const ROLE_ALSO = { dulce: ["fruta"], polvo: ["lacteo"], casero: ["lacteo", "polvo"] };
const roleGroup = (r) => (r ? r.split(":")[0] : "");
// Si la proteína pesa poco en el ingrediente (arroz, aceite, fruta…), se igualan las kcal; si no, kcal + proteína.
const proteinMatters = (m) => m.p * 4 >= m.k * 0.2;
function defaultFit(m) { return proteinMatters(m) ? "auto" : "k"; }
function substitutes(raw, max = 5) {
  const old = parseIng(raw), o = ingMacros(raw);
  if (!o || !(o.k > 0)) return [];
  const role = old.c && old.c.r, grp = roleGroup(role), best = new Map();
  const missing = new Set(loadMissing()), mode = defaultFit(o), tolP = proteinMatters(o) ? 3 : 6;
  for (const opt of foodOptions()) {
    if (old.c && opt.c.key === old.c.key) continue;
    if (!(opt.nut[0] > 0) || missing.has(opt.c.key)) continue;
    // Mismo grupo de alimento. Mis productos sin grupo entran siempre, y si lo que se cambia no tiene
    // grupo, vale cualquiera menos las salsas.
    const og = roleGroup(opt.c.r);
    if (og && (grp ? og !== grp && !(ROLE_ALSO[grp] || []).includes(og) : og === "salsa")) continue;
    const g = fitGramsFor(o, opt.nut, mode);
    if (!g) continue;
    const x = g / 100, n = { k: opt.nut[0] * x, p: opt.nut[1] * x, c: opt.nut[2] * x, f: opt.nut[3] * x };
    let score = ((n.k - o.k) / 15) ** 2 + ((n.p - o.p) / tolP) ** 2
      + 0.5 * ((n.c - o.c) / Math.max(5, o.c * 0.15)) ** 2 + 0.5 * ((n.f - o.f) / Math.max(3, o.f * 0.15)) ** 2;
    if (old.grams && (g > old.grams * 3 || g < old.grams / 3)) score += 50; // cantidades poco realistas
    if (opt.c.u === "ud" && opt.c.g && g / opt.c.g > 6) score += 50;
    const fit = score; // parecido de macros, para la etiqueta "encaja / parecido / aprox."
    if (role && opt.c.r === role && role.includes(":")) score = score * 0.3 - 1; // mismo subgrupo: pollo → pavo, arroz → pasta
    if (opt.cooked !== old.cooked && opt.c.cooked) score += 1; // si se cambia algo cocido, mejor en cocido
    if (opt.cooked && old.cooked) score -= 0.5; // cocido por cocido se pesa igual (arroz cocido → pasta cocida)
    const prev = best.get(opt.c.key); // una sola versión (seco o cocido) por ingrediente
    if (!prev || score < prev.score) best.set(opt.c.key, { opt, g, n, score, fit });
  }
  return [...best.values()].sort((a, b) => a.score - b.score).slice(0, max);
}
function renderRecs() {
  const box = $("#edRecs");
  if (!box) return;
  const recs = ed.idx != null && !ed.q ? substitutes(ed.i[ed.idx]) : [];
  box.innerHTML = recs.length ? `<p class="recent-label">Recomendados para sustituirlo</p>
    <div class="ed-options">${recs.map((r) => `<button class="opt rec has-thumb" data-ed-pick="${r.opt.id}">${thumbHTML(r.opt.c)}<span>${esc(r.opt.label)}<small>${fmtG(r.g)} g → ${r0(r.n.k)} kcal · ${f1(r.n.p)} g P · C ${r0(r.n.c)} · G ${r0(r.n.f)}</small></span><span class="kc">${r.fit < 3 ? "encaja" : r.fit < 15 ? "parecido" : "aprox."}</span></button>`).join("")}</div>
    <p class="recent-label">Todos los ingredientes</p>` : "";
}
function renderPickerOptions() {
  renderRecs();
  const q = norm(ed.q || "");
  const list = foodOptions().filter((o) => !q || norm(o.label).includes(q) || norm(o.cooked ? o.c.cooked.w : o.c.w || "").includes(q));
  const missSet = new Set(loadMissing());
  $("#edOptions").innerHTML = list.length
    ? list.map((o) => `<button class="opt has-thumb" data-ed-pick="${o.id}">${thumbHTML(o.c)}<span>${esc(o.label)}${missSet.has(o.c.key) ? `<small class="miss-mark">no lo tienes</small>` : ""}</span><span class="kc">${r0(o.nut[0])} kcal<br>${f1(o.nut[1])} g P</span></button>`).join("")
    : `<p class="empty">Nada con "${esc(ed.q)}". Créalo abajo con sus macros.</p>`;
}
function openGrams(optId) {
  const o = foodOptions().find((x) => x.id === optId);
  if (!o) return;
  ed.pick = o;
  const old = ed.idx != null ? parseIng(ed.i[ed.idx]) : null;
  ed.oldM = ed.idx != null ? ingMacros(ed.i[ed.idx]) : null;
  // Al cambiar un ingrediente se calculan solos los gramos que suplen al anterior (si los dos tienen macros).
  ed.fit = ed.oldM && o.nut[0] > 0 ? defaultFit(ed.oldM) : null;
  ed.grams = ed.fit ? fitGrams(ed.fit) : (old && old.grams) || o.c.g || 100;
  $("#sheetBody").innerHTML = `
    <button class="back-link" type="button" data-ed-back-pick="1">${ico("back")} Elegir otro ingrediente</button>
    <div class="portion-card">
      <p><b>${esc(o.label)}</b> <span class="muted small">(${r0(o.nut[0])} kcal · ${f1(o.nut[1])} g P por 100 g)</span></p>
      ${ed.fit ? `<div class="fit-row" role="group" aria-label="Calcular gramos para igualar">${FIT_MODES.map((f) => `<button class="chip-opt fit-btn" data-ed-fit="${f.id}">${f.label}</button>`).join("")}</div>` : ""}
      ${unitsHTML(o, "edGrams")}
      <label for="edGrams">${gramsLabel(o)}<input type="text" inputmode="decimal" id="edGrams" value="${fmtG(ed.grams)}"></label>
      <div id="edPreview"></div>
      <div class="row">
        <button class="btn" data-ed-apply="1">${ed.idx != null ? "Cambiar" : "Añadir"}</button>
      </div>
    </div>`;
  $("#edGrams").addEventListener("input", (e) => { ed.grams = parseFloat(e.target.value.replace(",", ".")) || 0; ed.fit = ed.fit && "manual"; renderGramsPreview(); syncUnits(); });
  renderGramsPreview(); syncUnits();
}
// Cómo se calculan los gramos del sustituto. "auto" busca el mejor equilibrio entre kcal y proteína
// pesando cada una por la tolerancia de las franjas (±15 kcal, ±3 g P): un solo ingrediente no puede
// igualar los cuatro macros a la vez salvo que sea igual que el anterior.
const FIT_MODES = [
  { id: "auto", label: "Kcal + proteína" },
  { id: "k", label: "Mismas kcal" },
  { id: "p", label: "Misma proteína" },
  { id: "c", label: "Mismos carbohidratos" },
  { id: "f", label: "Misma grasa" },
];
function fitGrams(mode) { return fitGramsFor(ed.oldM, ed.pick.nut, mode); }
function fitGramsFor(o, nut, mode) {
  const [k, p, c, f] = nut.map((v) => v / 100);
  let g;
  if (mode === "auto") {
    const wk = 1 / 15 ** 2, wp = 1 / 3 ** 2;
    g = (wk * k * o.k + wp * p * o.p) / (wk * k * k + wp * p * p);
  } else {
    const per = { k, p, c, f }[mode];
    g = per > 0 ? o[mode] / per : NaN;
  }
  return isFinite(g) && g > 0 ? Math.max(1, Math.round(g)) : 0;
}
function setFit(mode) {
  const g = fitGrams(mode);
  if (!g) { toast("El ingrediente nuevo no tiene de eso"); return; }
  ed.fit = mode; ed.grams = g;
  $("#edGrams").value = fmtG(g); renderGramsPreview(); syncUnits();
}
function pickText() {
  const o = ed.pick, w = o.cooked ? o.c.cooked.w : o.c.w;
  return `${fmtG(ed.grams)} g de ${w}${unitsText(o, ed.grams)}`;
}
function pickDelta() {
  const newM = ingMacros(pickText());
  const oldM = ed.idx != null ? ingMacros(ed.i[ed.idx]) : { k: 0, p: 0, c: 0, f: 0 };
  return newM && oldM ? { newM, oldM, total: addM(addM(ed.m, oldM, -1), newM) } : null;
}
function fitDiff(n, o) {
  const parts = [["k", "kcal", r0], ["p", "P", f1], ["c", "C", f1], ["f", "G", f1]].map(([key, lab, fmt]) => {
    const d = n[key] - o[key], v = fmt(Math.abs(d));
    return `<span class="${Math.abs(d) <= (key === "k" ? 15 : 3) ? "ok" : "off"}">${lab} ${d >= 0 ? "+" : "−"}${v}</span>`;
  });
  return `<p class="fit-diff">vs anterior: ${parts.join(" ")}</p>`;
}
function renderGramsPreview() {
  const d = ed.grams > 0 ? pickDelta() : null;
  document.querySelectorAll(".fit-btn").forEach((b) => b.classList.toggle("on", b.dataset.edFit === ed.fit));
  $("#edPreview").innerHTML = d ? `
    <p class="muted small">Este ingrediente: ${r0(d.newM.k)} kcal · ${f1(d.newM.p)} g P${ed.idx != null ? ` (antes ${r0(d.oldM.k)} kcal · ${f1(d.oldM.p)} g P)` : ""}</p>
    ${ed.idx != null ? fitDiff(d.newM, d.oldM) : ""}
    <p class="ed-sum">Plato: <b>${macrosTxt(d.total)}</b></p>${bandStatus(ed.slot, d.total)}` : `<p class="empty">Pon los gramos.</p>`;
}
function applyPick() {
  const d = ed.grams > 0 ? pickDelta() : null;
  if (!d) { toast("Revisa los gramos"); return; }
  const txt = pickText();
  if (ed.idx != null) ed.i[ed.idx] = txt; else ed.i.push(txt);
  ed.m = d.total;
  renderEditor();
}
function saveEditor() {
  if (ed.mode !== "dish") return;
  const ov = loadDishOverrides();
  const n = ed.n.trim() || ed.base.n;
  if (ed.i.join("\n") === ed.base.i.join("\n") && n === ed.base.n) delete ov[ed.id];
  else ov[ed.id] = { n, i: ed.i, k: r0(ed.m.k), p: r1(ed.m.p), c: r1(ed.m.c), f: r1(ed.m.f) };
  saveDishOverrides(ov);
  afterDishChange(); closeSheet(); toast("Plato guardado");
}
function resetDish() {
  const ov = loadDishOverrides(); delete ov[ed.id]; saveDishOverrides(ov);
  afterDishChange(); closeSheet(); toast("Plato restaurado");
}
function afterDishChange() {
  parseCache.clear(); rebuildIndex(); renderMenuList();
  if (profile.builder) updBuilder();
}
function renderProducts() {
  const list = userProducts();
  $("#productList").innerHTML = list.length
    ? list.map((p) => `<li class="has-thumb">${thumbHTML(productEntry(p))}<span><b>${esc(p.n)}</b><small>${p.nut[0]} kcal · P ${p.nut[1]} · C ${p.nut[2]} · G ${p.nut[3]} /100 g${p.g ? ` · ${p.g} g/ud` : ""}${p.r && ROLE_LABELS[p.r] ? ` · ${ROLE_LABELS[p.r]}` : ""}</small></span><button class="del" data-prod-del="${p.key}" aria-label="Borrar ${esc(p.n)}">${ico("x")}</button></li>`).join("")
    : `<li class="empty">Aún no hay ninguno. Se crean desde «Cambiar» en un plato del Menú o buscando en Google desde Añadir.</li>`;
}

/* ---------- RECETAS ---------- */
function renderRecetas() {
  $("#recipeList").innerHTML = profile.recipes.map((x) => `<article class="card"><h3><span class="code">${x.tag}</span>${x.n}</h3>
    <ul>${x.i.map((i) => `<li>${i}</li>`).join("")}</ul><ol>${x.s.map((i) => `<li>${i}</li>`).join("")}</ol>
    <div class="macros"><span>${x.m}</span></div></article>`).join("");
  $("#notes").innerHTML = profile.notes.map((n) => `<li>${n}</li>`).join("");
  renderProducts();
  renderPhotoList();
  $("#gcalSection").hidden = !profile.calendar && !profile.health;
  $("#healthHelp").hidden = !profile.health;
}

/* ---------- SEMANA: historial, peso, lista de la compra y precios ---------- */
function weightKey() { return `menujd.weight.${profile.id}.v1`; }
function loadWeights() { try { return JSON.parse(localStorage.getItem(weightKey())) || {}; } catch { return {}; } }
function saveWeights(w) { try { localStorage.setItem(weightKey(), JSON.stringify(w)); } catch { toast("No se pudo guardar en este dispositivo"); } }
const kgFmt = (x) => x.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Semanas de domingo a sábado; weekStart = domingo a las 12:00.
function startOfWeek(d) { const s = new Date(d); s.setHours(12, 0, 0, 0); s.setDate(s.getDate() - s.getDay()); return s; }
let weekStart = startOfWeek(new Date());
function weekDates(start) { return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; }); }

function dayTarget(key) {
  const day = db[key];
  if (!day) return null;
  const type = profile.dayTypes.find((t) => t.id === day.type) || profile.dayTypes[0];
  return type.kcal + stepAdjust(day, type, key);
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }

function renderSemana() {
  const dates = weekDates(weekStart);
  const fmt = (d, o) => d.toLocaleDateString("es-ES", o);
  const thisWeek = iso(startOfWeek(new Date())) === iso(weekStart);
  $("#weekTitle").textContent = thisWeek ? "Esta semana" : `${fmt(dates[0], { day: "numeric", month: "short" })} – ${fmt(dates[6], { day: "numeric", month: "short" })}`;
  $("#weekSub").textContent = `${fmt(dates[0], { day: "numeric", month: "short" })} – ${fmt(dates[6], { day: "numeric", month: "short" })} · de domingo a sábado`;

  const weights = loadWeights();
  const rows = dates.map((d) => {
    const key = iso(d), day = db[key];
    const items = day ? day.items : [];
    return { d, key, day, items, t: totals(items), target: dayTarget(key), cost: itemsCost(items), steps: day && typeof day.steps === "number" ? day.steps : null, w: weights[key] ?? null };
  });
  // Los días futuros con comidas son plan (para la compra), no se cuentan como comidos en medias ni balance.
  const todayKey = iso(new Date());
  rows.forEach((r) => (r.plan = r.key > todayKey && r.items.length > 0));
  const logged = rows.filter((r) => r.items.length && !r.plan);
  const kAvg = avg(logged.map((r) => r.t.k)), tAvg = avg(logged.map((r) => r.target));
  const pAvg = avg(logged.map((r) => r.t.p));
  const stepsAvg = avg(rows.filter((r) => r.steps != null).map((r) => r.steps));
  const wAvg = avg(rows.filter((r) => r.w != null).map((r) => r.w));
  const prevStart = new Date(weekStart); prevStart.setDate(prevStart.getDate() - 7);
  const wPrev = avg(weekDates(prevStart).map((d) => weights[iso(d)]).filter((x) => x != null));
  const cost = rows.reduce((a, r) => ({ eur: a.eur + r.cost.eur, missing: a.missing + r.cost.missing, priced: a.priced + r.cost.priced }), { eur: 0, missing: 0, priced: 0 });

  const sign = (x) => (x > 0 ? "+" : "") + x;
  const tile = (label, val, sub, cls = "") => `<div class="tile ${cls}"><small>${label}</small><b>${val}</b>${sub ? `<span>${sub}</span>` : ""}</div>`;
  $("#weekSummary").innerHTML = `
    <div class="tiles">
      ${tile("Kcal media", kAvg != null ? r0(kAvg) : "—", kAvg != null ? `objetivo ${r0(tAvg)} · ${sign(r0(kAvg - tAvg))}` : "sin registros", kAvg != null && kAvg > tAvg * 1.03 ? "warn" : "")}
      ${tile("Proteína media", pAvg != null ? `${r0(pAvg)} g` : "—", `objetivo ${profile.proteinTarget} g`, pAvg != null && pAvg < profile.proteinTarget * 0.9 ? "warn" : "")}
      ${tile("Pasos / día", stepsAvg != null ? r0(stepsAvg).toLocaleString("es-ES") : "—", stepsAvg != null ? "" : "sin datos")}
      ${tile("Peso medio", wAvg != null ? `${kgFmt(wAvg)} kg` : "—", wAvg != null && wPrev != null ? `${wAvg - wPrev > 0 ? "+" : ""}${kgFmt(wAvg - wPrev)} vs semana anterior` : "")}
    </div>
    ${weekChart(rows)}
    ${logged.length ? `<p class="mini-row"><span>Balance <b>${sign(r0((kAvg - tAvg) * logged.length))} kcal</b> en ${logged.length} ${logged.length === 1 ? "día" : "días"}</span>${cost.priced ? `<span>Coste <b>${costLabel(cost)}</b></span>` : ""}</p>` : ""}`;

  $("#weekDays").innerHTML = rows.map((r) => {
    const pct = r.target ? Math.min(100, (r.t.k / r.target) * 100) : 0;
    const over = r.target && r.t.k > r.target * 1.03;
    return `<button class="wday${r.key === todayKey ? " is-today" : ""}${r.plan ? " is-plan" : ""}" data-goday="${r.key}" aria-label="Abrir ${fmt(r.d, { weekday: "long", day: "numeric" })} en Hoy">
      <span class="wd-name">${fmt(r.d, { weekday: "short" })}<b>${r.d.getDate()}</b></span>
      <span class="wd-main">${r.items.length
        ? `<span class="wd-nums">${r.plan ? `<span class="plan-tag">plan</span> ` : ""}<b>${r0(r.t.k)}</b> / ${r0(r.target)} kcal · ${r0(r.t.p)} g P</span><span class="bar${over ? " over" : ""}"><i style="width:${pct}%"></i></span>`
        : `<span class="wd-nums muted">Sin registro</span>`}
        <span class="wd-extra">${[r.steps != null ? r.steps.toLocaleString("es-ES") + " pasos" : "", r.w != null ? kgFmt(r.w) + " kg" : "", costLabel(r.cost)].filter(Boolean).join(" · ")}</span>
      </span></button>`;
  }).join("");

  $("#healthWeek").hidden = !profile.health;
  $("#planWeek").textContent = `Planificar días vacíos (${planTargets().length})`;
  $("#planWeek").disabled = !planTargets().length;
  renderWeight();
  renderShop(rows);
  renderPrices();
}

// Barras de kcal por día con la marca del objetivo de cada día (SVG, sin librerías).
function weekChart(rows) {
  if (!rows.some((r) => r.items.length)) return "";
  const W = 340, H = 120, B = 18, T = 8, gap = 10, bw = (W - gap * 8) / 7;
  const max = Math.max(...rows.map((r) => Math.max(r.t.k, r.target || 0)), 1) * 1.08;
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const todayKey = iso(new Date());
  return `<svg class="wkchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kcal de cada día frente a su objetivo">
    ${rows.map((r, i) => {
      const x = gap + i * (bw + gap);
      const lbl = r.d.toLocaleDateString("es-ES", { weekday: "narrow" }).toUpperCase();
      const over = r.target && r.t.k > r.target * 1.03;
      return `<g>
        ${r.items.length ? `<rect x="${x}" y="${y(r.t.k)}" width="${bw}" height="${H - B - y(r.t.k)}" rx="4" class="${r.plan ? "plan" : over ? "over" : "ok"}"><title>${lbl}: ${r0(r.t.k)} / ${r0(r.target)} kcal</title></rect>` : `<rect x="${x}" y="${H - B - 2}" width="${bw}" height="2" class="none"/>`}
        ${r.target && r.items.length ? `<line x1="${x - 2}" x2="${x + bw + 2}" y1="${y(r.target)}" y2="${y(r.target)}" class="tgt"/>` : ""}
        <text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle" class="${r.key === todayKey ? "today" : ""}">${lbl}</text></g>`;
    }).join("")}
  </svg>`;
}

/* planificar: rellena los días vacíos de la semana (de hoy en adelante) para sacar la lista de la compra */
function planTargets() {
  const today = iso(new Date());
  return weekDates(weekStart).filter((d) => { const k = iso(d); return k >= today && !(db[k] && db[k].items.length); });
}
// Platos con etiqueta de plan "(S1 · Lunes)" de una semana del plan para un día de la semana.
function planDishes(week, d) {
  const wd = norm(d.toLocaleDateString("es-ES", { weekday: "long" }));
  return profile.slots.map((s) => profile.menu[s.id].find((o) => norm(splitName(o.n).tag).replace(/\s+/g, " ") === `${week} · ${wd}`)).filter(Boolean);
}
function planWeeks() {
  return [...new Set(ALL.map((o) => (splitName(o.n).tag.match(/^S\d+/) || [])[0]).filter(Boolean))].sort();
}
function openPlanSheet() {
  const targets = planTargets();
  const prev = targets.filter((d) => { const p = new Date(d); p.setDate(p.getDate() - 7); const k = iso(p); return db[k] && db[k].items.length; }).length;
  const opts = [];
  opts.push({ id: "prev", t: "Repetir la semana anterior", s: prev ? `Copia lo de cada día de hace 7 días (${prev} de ${targets.length} días tienen algo)` : "La semana anterior no tiene comidas en esos días", off: !prev });
  for (const w of planWeeks()) opts.push({ id: "tag:" + w, t: `Seguir el plan · semana ${w.slice(1)}`, s: "Las comidas del plan que tocan cada día de la semana" });
  if (profile.builder) opts.push({ id: "mix", t: "Menú variado", s: "Desayuno, comida y cena distintos cada día, y los snacks que pide cada tipo de día" });
  $("#sheetTitle").textContent = "Planificar la semana";
  $("#sheetBody").innerHTML = `<p class="muted small">Se rellenan ${targets.length} ${targets.length === 1 ? "día vacío" : "días vacíos"} desde hoy: ${targets.map((d) => d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })).join(", ")}. Luego cada día se puede cambiar en Hoy, y la lista de la compra sale de lo planificado.</p>
    <div class="ed-options">${opts.map((o) => `<button class="opt rec" data-plan="${o.id}"${o.off ? " disabled" : ""}><span>${o.t}<small>${o.s}</small></span><span class="kc">${ico("next")}</span></button>`).join("")}</div>`;
  $("#sheet").hidden = false; $("#sheetBg").hidden = false;
}
const itemFrom = (o, slot) => ({ slot: slot || slotOf(o.id), ref: o.id, m: 1, n: o.n, ...scaled(o, 1) });
function planWeek(mode) {
  const targets = planTargets(), before = {};
  let filled = 0;
  targets.forEach((d, i) => {
    const key = iso(d);
    before[key] = db[key] ? JSON.parse(JSON.stringify(db[key])) : null;
    const day = getDay(key);
    let items = [];
    if (mode === "prev") {
      const p = new Date(d); p.setDate(p.getDate() - 7);
      const src = db[iso(p)];
      if (src && src.items.length) { items = JSON.parse(JSON.stringify(src.items)); day.type = src.type; }
    } else if (mode.startsWith("tag:")) {
      items = planDishes(mode.slice(4).toLowerCase(), d).map((o) => itemFrom(o));
    } else if (mode === "mix" && profile.builder) {
      // Rota cada franja por el día del año, con desfases distintos para que no coincidan siempre las mismas combinaciones.
      const n = Math.floor(d.getTime() / 864e5);
      const type = profile.dayTypes.find((t) => t.id === day.type) || profile.dayTypes[0];
      const pick = (slot, off) => { const arr = profile.menu[slot].filter((o) => !dishMissing(o).length); return arr.length ? arr[(n + off) % arr.length] : null; };
      const [sD, sC, sN] = profile.builder.main;
      items = [pick(sD, 0), pick(sC, 3), pick(sN, 7)].filter(Boolean).map((o) => itemFrom(o));
      const snacks = profile.builder.snackSlot ? profile.menu[profile.builder.snackSlot].filter((o) => !dishMissing(o).length) : [];
      for (let j = 0; j < (type.mods || 0) && snacks.length; j++) items.push(itemFrom(snacks[(n * 2 + j) % snacks.length]));
    }
    if (items.length) { day.items.push(...items); filled++; }
    else if (!before[key]) delete db[key];
  });
  saveAll(db); closeSheet(); renderSemana();
  if (!filled) { toast("No había nada que poner en esos días"); return; }
  toast(`Planificados ${filled} ${filled === 1 ? "día" : "días"}`, 6000, { label: "Deshacer", fn: () => {
    for (const [k, v] of Object.entries(before)) { if (v) db[k] = v; else delete db[k]; }
    saveAll(db); renderSemana(); toast("Deshecho");
  } });
}

/* peso */
// Recta de regresión de los pesos de los últimos 28 días: pendiente (kg/día) y valor de la recta en el último registro.
// Hace falta un mínimo de 4 registros repartidos en 10 días o más para que sea fiable.
function weightTrend(w, keys) {
  if (!keys.length) return null;
  const lastT = new Date(keys[keys.length - 1] + "T12:00:00").getTime();
  const pts = keys.map((k) => ({ x: (new Date(k + "T12:00:00").getTime() - lastT) / 864e5, y: w[k] })).filter((p) => p.x > -28);
  if (pts.length < 4 || -pts[0].x < 10) return null;
  const mx = avg(pts.map((p) => p.x)), my = avg(pts.map((p) => p.y));
  const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const slope = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx;
  return { slope, now: my - slope * mx };
}
function renderWeight() {
  const w = loadWeights();
  const keys = Object.keys(w).sort();
  if (!$("#wDate").value) $("#wDate").value = iso(new Date());
  if (!keys.length) {
    $("#weightChart").innerHTML = `<p class="empty">Apunta tu peso (mejor en ayunas, mismo día de la semana) y aquí verás la evolución.</p>`;
    $("#weightList").innerHTML = "";
    return;
  }
  const pts = keys.slice(-60).map((k) => ({ k, t: new Date(k + "T12:00:00").getTime(), v: w[k] }));
  // Media de 7 días (los registros de esa fecha y los 6 días anteriores): el peso diario baila mucho.
  pts.forEach((p) => { const win = keys.filter((k) => { const t = new Date(k + "T12:00:00").getTime(); return t <= p.t && t > p.t - 7 * 864e5; }); p.avg = avg(win.map((k) => w[k])); });
  const goal = profile.weightGoal;
  const vals = pts.map((p) => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (goal && goal >= lo - 3) lo = Math.min(lo, goal);
  if (hi - lo < 2) { lo -= 1; hi += 1; }
  lo = Math.floor(lo - 0.3); hi = Math.ceil(hi + 0.3);
  const W = 340, H = 170, L = 34, R = 10, T = 10, B = 24;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (t) => (t1 === t0 ? (L + W - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  const dShort = (k) => new Date(k + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  $("#weightChart").innerHTML = `<svg class="wchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso: de ${kgFmt(pts[0].v)} a ${kgFmt(pts[pts.length - 1].v)} kg">
    ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${kgFmt(v)}</text>`).join("")}
    ${goal && goal >= lo && goal <= hi ? `<line x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}" class="goal"/><text x="${W - R}" y="${y(goal) - 5}" text-anchor="end" class="goal-t">Objetivo ${goal} kg</text>` : ""}
    <polyline points="${pts.map((p) => `${x(p.t)},${y(p.v)}`).join(" ")}" class="line"/>
    ${pts.length >= 3 ? `<polyline points="${pts.map((p) => `${x(p.t)},${y(p.avg)}`).join(" ")}" class="trend"/><text x="${L + 4}" y="${T + 10}" class="trend-t">── media de 7 días</text>` : ""}
    ${pts.map((p) => `<circle cx="${x(p.t)}" cy="${y(p.v)}" r="3.5" class="dot"><title>${dShort(p.k)}: ${kgFmt(p.v)} kg</title></circle>`).join("")}
    <text x="${L}" y="${H - 6}">${dShort(pts[0].k)}</text>
    ${pts.length > 1 ? `<text x="${W - R}" y="${H - 6}" text-anchor="end">${dShort(pts[pts.length - 1].k)}</text>` : ""}
  </svg>`;
  const last = pts[pts.length - 1];
  const weekAgo = keys.filter((k) => k <= iso(new Date(last.t - 7 * 864e5))).pop();
  const bits = [`Último: <b>${kgFmt(last.v)} kg</b> (${dShort(last.k)})`];
  if (weekAgo) bits.push(`${last.v - w[weekAgo] > 0 ? "+" : ""}${kgFmt(last.v - w[weekAgo])} kg en 7 días`);
  if (goal && last.v > goal) bits.push(`faltan ${kgFmt(last.v - goal)} kg para ${goal}`);
  const tr = weightTrend(w, keys);
  if (tr) {
    const perWeek = tr.slope * 7;
    let msg = `Tendencia <b>${perWeek > 0 ? "+" : ""}${kgFmt(perWeek)} kg/semana</b> (últimas 4 semanas)`;
    if (goal && tr.now > goal && tr.slope < -0.005) {
      const eta = new Date(last.t + ((tr.now - goal) / -tr.slope) * 864e5);
      msg += ` · a este ritmo llegarías a ${goal} kg hacia el ${eta.toLocaleDateString("es-ES", { day: "numeric", month: "short", ...(eta.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) })}`;
    } else if (goal && tr.now > goal) msg += " · a este ritmo no bajas hacia el objetivo";
    bits.push(msg);
  }
  $("#weightList").innerHTML = `<p class="muted small">${bits.join(" · ")}</p>
    <ul class="wlist">${keys.slice(-5).reverse().map((k) => `<li><span>${dShort(k)}</span><b>${kgFmt(w[k])} kg</b><button class="del" data-wdel="${k}" aria-label="Borrar peso del ${dShort(k)}">${ico("x")}</button></li>`).join("")}</ul>`;
}

/* lista de la compra */
const SHOP_CATS = ["Fruta y verdura", "Carne y pescado", "Charcutería", "Huevos", "Lácteos", "Panadería", "Despensa", "Bebidas", "Caseros", "Mis productos"];
function shopCheckKey() { return `menujd.shopcheck.${profile.id}.v1`; }
function loadChecks() { try { return JSON.parse(localStorage.getItem(shopCheckKey())) || {}; } catch { return {}; } }
function saveChecks(all) {
  const keep = Object.keys(all).sort().slice(-8); // solo las últimas semanas
  try { localStorage.setItem(shopCheckKey(), JSON.stringify(Object.fromEntries(keep.map((k) => [k, all[k]])))); } catch {}
}
function buildShop(rows) {
  const agg = new Map(), loose = new Map();
  for (const r of rows) for (const x of r.items) {
    const o = x.ref && byId(x.ref);
    const ings = x.i || (o && o.i);
    if (!ings) continue;
    const mult = x.i ? x.m || 1 : itemMult(x, o);
    for (const raw of ings) {
      const { c, qty } = parseIng(raw);
      if (!c) { loose.set(raw, (loose.get(raw) || 0) + 1); continue; }
      const a = agg.get(c.key) || { c, qty: 0, gusto: false };
      if (qty == null) a.gusto = true; else a.qty += qty * mult;
      agg.set(c.key, a);
    }
  }
  return { agg, loose };
}
function qtyFmt(c, q) {
  if (!q) return "al gusto";
  if (c.u === "ud") return `${Math.ceil(q - 0.05)} ud`;
  if (c.u === "ml") return q >= 1000 ? `${(q / 1000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} l` : `${Math.round(q / 10) * 10 || r0(q)} ml`;
  return q >= 1000 ? `${(q / 1000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg` : `${Math.round(q / 10) * 10 || r0(q)} g`;
}
let lastShop = null;
function renderShop(rows) {
  const { agg, loose } = buildShop(rows);
  lastShop = { agg, loose };
  if (!agg.size && !loose.size) { $("#shopList").innerHTML = `<p class="empty">Nada que comprar: no hay platos del menú registrados en esta semana.</p>`; return; }
  const checks = loadChecks()[iso(weekStart)] || [];
  let total = 0, missing = 0, priced = 0;
  const groups = SHOP_CATS.map((cat) => {
    const list = [...agg.values()].filter((a) => a.c.cat === cat).sort((a, b) => a.c.n.localeCompare(b.c.n, "es"));
    if (!list.length) return "";
    return `<div class="shop-group"><h3>${cat}</h3>${list.map((a) => {
      const v = a.qty ? itemCost(a.c, a.qty) : null;
      if (a.qty) { if (v == null) missing++; else { total += v; priced++; } }
      const on = checks.includes(a.c.key);
      return `<label class="shop-item${on ? " done" : ""}"><input type="checkbox" data-shop="${a.c.key}"${on ? " checked" : ""}>
        ${thumbHTML(a.c)}<span>${esc(a.c.n)}</span><b>${qtyFmt(a.c, a.qty)}${a.gusto && a.qty ? " + al gusto" : ""}</b>${v != null ? `<small>${eurFmt(v)}</small>` : ""}</label>`;
    }).join("")}</div>`;
  }).join("");
  const others = loose.size ? `<div class="shop-group"><h3>Otros</h3>${[...loose.keys()].map((raw) => `<p class="shop-loose">${esc(raw)}</p>`).join("")}</div>` : "";
  const sum = priced ? `<p class="shop-total">Total estimado <b>${costLabel({ eur: total, missing, priced })}</b>${missing ? ` <span class="muted small">(faltan precios de ${missing} ingrediente${missing === 1 ? "" : "s"})</span>` : ""}</p>` : "";
  $("#shopList").innerHTML = groups + others + sum;
}
function shopText() {
  if (!lastShop) return "";
  const checks = loadChecks()[iso(weekStart)] || [];
  const lines = [`Lista de la compra · ${$("#weekTitle").textContent} (${profile.label})`];
  for (const cat of SHOP_CATS) {
    const list = [...lastShop.agg.values()].filter((a) => a.c.cat === cat && !checks.includes(a.c.key));
    if (!list.length) continue;
    lines.push("", cat);
    list.forEach((a) => lines.push(`- ${a.c.n}: ${qtyFmt(a.c, a.qty)}`));
  }
  if (lastShop.loose.size) { lines.push("", "Otros"); lastShop.loose.forEach((_, raw) => lines.push("- " + raw)); }
  return lines.join("\n");
}

/* precios */
function renderPrices() {
  const used = new Set();
  ALL.forEach((o) => o.i.forEach((raw) => { const { c } = parseIng(raw); if (c) used.add(c.key); }));
  // También lo registrado suelto (fruta, productos del catálogo…), para poder ponerle precio.
  Object.values(db).forEach((d) => (d.items || []).forEach((x) => (x.i || []).forEach((raw) => { const { c } = parseIng(raw); if (c) used.add(c.key); })));
  userProducts().forEach((p) => used.add(p.key));
  const unit = { g: "€/kg", ml: "€/l", ud: "€/ud" };
  const box = $("#priceList");
  if (box.contains(document.activeElement)) return; // no repintar mientras se escribe
  box.innerHTML = catalog().filter((c) => used.has(c.key)).sort((a, b) => a.n.localeCompare(b.n, "es")).map((c) => `
    <label class="price-item"><span>${esc(c.n)}</span>
      <span class="price-in"><input type="text" inputmode="decimal" data-price="${c.key}" value="${prices[c.key] != null ? String(prices[c.key]).replace(".", ",") : ""}" placeholder="—" aria-label="Precio de ${esc(c.n)} en ${unit[c.u]}"><small>${unit[c.u]}</small></span></label>`).join("");
}

$("#prevWeek").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() - 7); renderSemana(); });
$("#nextWeek").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() + 7); renderSemana(); });
$("#weightForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const kg = parseFloat($("#wKg").value.replace(",", "."));
  const date = $("#wDate").value;
  if (!date || !(kg > 20 && kg < 400)) { toast("Revisa el peso"); return; }
  const w = loadWeights(); w[date] = Math.round(kg * 10) / 10; saveWeights(w);
  $("#wKg").value = "";
  renderSemana(); toast("Peso guardado");
});
$("#shopList").addEventListener("change", (e) => {
  const key = e.target.dataset.shop; if (!key) return;
  const all = loadChecks(), wk = iso(weekStart);
  const set = new Set(all[wk] || []);
  e.target.checked ? set.add(key) : set.delete(key);
  if (e.target.checked && loadMissing().includes(key)) { setMissing(key, false); toast("Comprado: ya no sale como que te falta"); }
  all[wk] = [...set]; saveChecks(all);
  e.target.closest(".shop-item").classList.toggle("done", e.target.checked);
});
$("#shopReset").addEventListener("click", () => { const all = loadChecks(); delete all[iso(weekStart)]; saveChecks(all); renderSemana(); });
$("#shopCopy").addEventListener("click", async () => {
  const txt = shopText();
  if (!txt) return;
  try { await navigator.clipboard.writeText(txt); toast("Lista copiada"); }
  catch { toast("No se pudo copiar en este navegador"); }
});
$("#priceList").addEventListener("change", (e) => {
  const key = e.target.dataset.price; if (!key) return;
  const v = parseFloat(e.target.value.replace(",", "."));
  if (Number.isFinite(v) && v >= 0) prices[key] = v; else delete prices[key];
  savePrices();
  e.target.blur();
  renderSemana();
});

/* ---------- navegación y eventos ---------- */
function show(view) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + view));
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "hoy") renderHoy();
  if (view === "menu") { renderMenuList(); updApplyLabel(); }
  if (view === "semana") renderSemana();
  if (view === "recetas") renderProducts();
  window.scrollTo(0, 0);
}
let toastT;
let toastAction = null;
function toast(msg, ms = 2000, action = null) {
  const t = $("#toast");
  toastAction = action;
  t.innerHTML = esc(msg) + (action ? ` <button class="toast-act" type="button">${esc(action.label)}</button>` : "");
  t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms);
}

/* ---------- cambio de perfil ---------- */
function renderProfileSelect() {
  $("#profileSelect").innerHTML = Object.values(PROFILES).map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
  $("#profileSelect").value = profile.id;
}
function switchProfile(id) {
  if (!PROFILES[id] || PROFILES[id].id === profile.id) return;
  profile = PROFILES[id];
  localStorage.setItem(PROFILE_KEY, profile.id);
  applyProfileTheme();
  rebuildIndex();
  db = loadAll();
  current = new Date(); current.setHours(12, 0, 0, 0);
  weekStart = startOfWeek(new Date());
  renderProfileSelect();
  renderMenu(); renderRecetas();
  show("hoy");
  autoHealth(); autoFood();
}
$("#profileSelect").addEventListener("change", (e) => switchProfile(e.target.value));

document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.view) show(b.dataset.view);
  else if (b.dataset.goday) { current = new Date(b.dataset.goday + "T12:00:00"); show("hoy"); }
  else if (b.dataset.wdel) { const w = loadWeights(); delete w[b.dataset.wdel]; saveWeights(w); renderSemana(); toast("Peso borrado"); }
  else if (b.dataset.add) openSheet(b.dataset.add);
  else if (b.dataset.del !== undefined) deleteEntry(iso(current), +b.dataset.del);
  else if (b.dataset.entry !== undefined) openEntry(+b.dataset.entry);
  else if (b.dataset.entPortion) entPortion(parseFloat(b.dataset.entPortion));
  else if (b.dataset.entMove) entMove(b.dataset.entMove);
  else if (b.dataset.entDup) entDup();
  else if (b.dataset.entDel) deleteEntry(entState.key, entState.idx);
  else if (b.dataset.entIng) openEntryEditor();
  else if (b.dataset.edLogdish) openLogEditor(b.dataset.edLogdish);
  else if (b.dataset.edFree) openFreeEditor();
  else if (b.dataset.edLog) logFromEditor(parseFloat(b.dataset.edLog));
  else if (b.dataset.edEntry) saveEntryFromEditor();
  else if (b.id === "portionBack") { showSheetList(); }
  else if (b.dataset.portion) {
    const o = byId(b.dataset.dish);
    const mult = parseFloat(b.dataset.portion);
    pushRecent(sheetState.slot, o.id);
    addItem(sheetState.slot, { ref: o.id, m: mult, n: withPortion(o.n, mult), ...scaled(o, mult) });
    closeSheet(); toast("Añadido: " + withPortion(o.n, mult));
  }
  else if (b.dataset.pick) { openPortionStep(b.dataset.pick); }
  else if (b.dataset.edit) openEditor(b.dataset.edit);
  else if (b.dataset.edChange) openPicker(+b.dataset.edChange);
  else if (b.dataset.edAdd) openPicker(null);
  else if (b.dataset.edRemove) {
    const m = ingMacros(ed.i[+b.dataset.edRemove]);
    if (!m) { toast("No tengo los macros de ese ingrediente"); return; }
    ed.m = addM(ed.m, m, -1); ed.i.splice(+b.dataset.edRemove, 1); renderEditor();
  }
  else if (b.dataset.edBack) renderEditor();
  else if (b.dataset.edBackPick) openPicker(ed.idx);
  else if (b.dataset.edPick) openGrams(b.dataset.edPick);
  else if (b.dataset.edFit) setFit(b.dataset.edFit);
  else if (b.dataset.edApply) applyPick();
  else if (b.dataset.edSave) saveEditor();
  else if (b.dataset.edReset) resetDish();
  else if (b.dataset.prodDel) {
    const before = userProducts(), gone = before.find((p) => p.key === b.dataset.prodDel);
    saveProducts(before.filter((p) => p.key !== b.dataset.prodDel));
    afterDishChange(); renderProducts();
    toast("Borrado: " + (gone ? gone.n : "producto"), 6000, { label: "Deshacer", fn: () => { saveProducts(before); afterDishChange(); renderProducts(); toast("Producto recuperado"); } });
  }
  else if (b.dataset.uStep || b.dataset.uSet) stepUnits(b);
  else if (b.dataset.slotPick) {
    sheetState.slot = b.dataset.slotPick;
    b.parentElement.querySelectorAll("[data-slot-pick]").forEach((x) => x.classList.toggle("on", x === b));
    $("#ffGo").textContent = "Añadir a " + profile.slots.find((s) => s.id === sheetState.slot).label;
  }
  else if (b.dataset.mStep) stepMult(b);
  else if (b.dataset.webSearch) {
    // Se abre Google en otra pestaña y la hoja se queda con el formulario listo para cuando vuelvas.
    const q = sheetState.query.trim();
    window.open(googleUrl(q), "_blank", "noopener");
    openWebForm(q);
  }
  else if (b.dataset.webBack) showSheetList();
  else if (b.dataset.foodLog) openFoodGrams(b.dataset.foodLog);
  else if (b.dataset.fav) {
    const [ref, m] = b.dataset.fav.split("|"), o = byId(ref), mult = +m;
    pushRecent(slotOf(ref), ref);
    addItem(slotOf(ref), { ref, m: mult, n: withPortion(o.n, mult), ...scaled(o, mult) });
    toast("Añadido: " + withPortion(o.n, mult));
  }
  else if (b.dataset.sugg) { const o = byId(b.dataset.sugg); addItem(slotOf(o.id), { ref: o.id, m: 1, n: o.n, ...scaled(o, 1) }); toast("Añadido: " + o.n); }
  else if (b.id === "copyDay") openCopySheet();
  else if (b.dataset.copyFrom) copyDay(b.dataset.copyFrom);
  else if (b.dataset.missOpen) openMissingSheet();
  else if (b.dataset.missOff) { setMissing(b.dataset.missOff, false); afterMissingChange(); toast("Quitado de lo que te falta"); }
  else if (b.dataset.missToggle) { const k = b.dataset.missToggle; setMissing(k, !loadMissing().includes(k)); renderMissingList(); afterMissingChange(); }
  else if (b.dataset.fix) { const o = byId(b.dataset.fix), miss = dishMissing(o); openEditor(o.id); if (miss.length) openPicker(miss[0].idx); }
  else if (b.dataset.edFixlog) { const o = byId(b.dataset.edFixlog), miss = dishMissing(o); openLogEditor(o.id); if (miss.length) openPicker(miss[0].idx); }
  else if (b.id === "planWeek") openPlanSheet();
  else if (b.dataset.plan) planWeek(b.dataset.plan);
  else if (b.dataset.quick) { const o = byId(b.dataset.quick); current = new Date(); current.setHours(12, 0, 0, 0); pushRecent(slotOf(o.id), o.id); addItem(slotOf(o.id), { ref: o.id, n: o.n, k: o.k, p: o.p, c: o.c, f: o.f }); toast("Añadido a hoy: " + o.n); }
});
$("#sheetClose").addEventListener("click", closeSheet);
$("#sheetBg").addEventListener("click", closeSheet);
$("#sheetBody").addEventListener("submit", (e) => {
  e.preventDefault();
  const num = (id) => parseFloat($(id).value.replace(",", ".")) || 0;
  if (e.target.id === "webForm") { saveWebForm(); return; }
  if (e.target.id === "foodForm") { logFood(e.target.dataset.opt, num("#ffG")); return; }
  if (e.target.id === "prodForm") {
    const n = $("#prName").value.trim().replace(/\s+/g, " ");
    const k = num("#prK");
    if (!n || !(k >= 0) || !$("#prK").value.trim()) { toast("Pon al menos el nombre y las kcal"); return; }
    const list = userProducts();
    const same = list.find((p) => norm(p.n) === norm(n));
    const prod = { key: same ? same.key : "u" + Date.now().toString(36), n, nut: [k, num("#prP"), num("#prC"), num("#prF")], ...(num("#prG") > 0 ? { g: num("#prG") } : {}), ...($("#prR").value ? { r: $("#prR").value } : {}) };
    saveProducts([...list.filter((p) => p.key !== prod.key), prod]);
    openGrams(prod.key + "|0");
    return;
  }
  addItem($("#sheetBody").dataset.slot, { n: $("#cName").value.trim(), k: num("#cK"), p: num("#cP"), c: num("#cC"), f: num("#cF") });
  closeSheet(); toast("Añadido");
});
$("#prevDay").addEventListener("click", () => { current.setDate(current.getDate() - 1); renderHoy(); });
$("#nextDay").addEventListener("click", () => { current.setDate(current.getDate() + 1); renderHoy(); });
$("#dayType").addEventListener("change", (e) => { getDay(iso(current)).type = e.target.value; saveAll(db); renderHoy(); });
$("#stepsIn").addEventListener("change", (e) => {
  const day = getDay(iso(current));
  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
  if (Number.isFinite(n)) day.steps = n; else delete day.steps;
  saveAll(db); renderHoy();
});
["#bD", "#bC", "#bN", "#bT"].forEach((id) => $(id).addEventListener("change", updBuilder));
function shortDay(d) {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return iso(d) === iso(today) ? "hoy" : d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric" });
}
function updApplyLabel() { $("#bApply").textContent = "Usar este plan para " + shortDay(current); }
$("#bApply").addEventListener("click", () => {
  if (!profile.builder) return;
  const day = getDay(iso(current));
  day.type = $("#bT").value;
  ["#bD", "#bC", "#bN"].forEach((id) => { const o = byId($(id).value); day.items.push({ slot: slotOf(o.id), ref: o.id, n: o.n, k: o.k, p: o.p, c: o.c, f: o.f }); });
  saveAll(db); show("hoy"); toast("Plan añadido a " + shortDay(current));
});

/* copia de seguridad */
$("#exportBtn").addEventListener("click", () => {
  const payload = { app: "menujd", version: 2, profile: profile.id, log: db, weight: loadWeights(), prices, dishes: loadDishOverrides(), products: userProducts() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `menujd-registro-${profile.id}-${iso(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  $("#backupMsg").textContent = "Registro exportado.";
});
$("#importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    // v2: { app, version, profile, log, weight, prices }; v1 (antiguo): directamente { "YYYY-MM-DD": día }.
    // Cada copia va a su perfil: el de dentro del archivo (v2) o el del nombre "menujd-registro-<id>-fecha.json" (v1).
    const target = (data.app === "menujd" && data.profile) || (f.name.match(/menujd-registro-([a-z0-9]+)-/i) || [])[1];
    let note = "";
    if (target && PROFILES[target] && target !== profile.id) {
      switchProfile(target); show("recetas");
      note = ` El archivo era del perfil ${PROFILES[target].label}: he cambiado a ese perfil.`;
    } else if (!target || !PROFILES[target]) note = ` El archivo no indica de qué perfil es: se ha importado en ${profile.label}.`;
    const log = data.app === "menujd" ? data.log || {} : data;
    db = { ...db, ...log }; saveAll(db);
    let extra = "";
    if (data.app === "menujd" && data.weight) { saveWeights({ ...loadWeights(), ...data.weight }); extra += `, ${Object.keys(data.weight).length} pesos`; }
    if (data.app === "menujd" && data.prices) { prices = { ...prices, ...data.prices }; savePrices(); extra += ", precios"; }
    if (data.app === "menujd" && Array.isArray(data.products) && data.products.length) {
      const keys = new Set(data.products.map((p) => p.key));
      saveProducts([...userProducts().filter((p) => !keys.has(p.key)), ...data.products]); extra += `, ${data.products.length} productos`;
    }
    if (data.app === "menujd" && data.dishes && Object.keys(data.dishes).length) {
      saveDishOverrides({ ...loadDishOverrides(), ...data.dishes }); extra += `, ${Object.keys(data.dishes).length} platos modificados`;
    }
    afterDishChange(); renderProducts();
    $("#backupMsg").textContent = `Importados ${Object.keys(log).length} días${extra} en ${profile.label}.${note}`;
    toast(`Importado en ${profile.label}`, 3000);
  } catch { $("#backupMsg").textContent = "Ese archivo no es una copia válida del registro."; }
  e.target.value = "";
});

/* ---------- Google Calendar (opcional, bajo demanda, solo perfiles con calendar.enabled) ---------- */
function gcalCfgKey() { return `menujd.gcal.cfg.${profile.id}.v1`; }
function gcalTokKey() { return `menujd.gcal.tok.${profile.id}.v1`; }
// Lo guardado en el móvil manda; si no hay Client ID guardado, se usa el del perfil (data.js).
function gcalCfg() {
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(gcalCfgKey())) || {}; } catch {}
  return { ...cfg, clientId: cfg.clientId || (profile.calendar && profile.calendar.clientId) || "" };
}
function saveGcalCfg(cfg) { localStorage.setItem(gcalCfgKey(), JSON.stringify(cfg)); }
function gcalToken() { try { return JSON.parse(sessionStorage.getItem(gcalTokKey())); } catch { return null; } }
function saveGcalToken(t) { sessionStorage.setItem(gcalTokKey(), JSON.stringify(t)); }
function clearGcalToken() { sessionStorage.removeItem(gcalTokKey()); }

let gcalTokenClient = null;
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar Google (¿sin conexión?)"));
    document.head.appendChild(s);
  });
}
async function ensureGcalToken() {
  const tok = gcalToken();
  if (tok && tok.exp > Date.now() + 30000) return tok.token;
  const cfg = gcalCfg();
  if (!cfg.clientId) throw new Error("Configura primero el Client ID en Recetas → Calendario.");
  await loadGIS();
  return new Promise((resolve, reject) => {
    gcalTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cfg.clientId,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      include_granted_scopes: false,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        saveGcalToken({ token: resp.access_token, exp: Date.now() + resp.expires_in * 1000 });
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error((err && err.type) || "No se pudo conectar con Google")),
    });
    gcalTokenClient.requestAccessToken({ prompt: "" });
  });
}
async function detectWorkDay(date) {
  const token = await ensureGcalToken();
  const cfg = gcalCfg();
  const keyword = (cfg.keyword || "turno").toLowerCase();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&singleEvents=true`;
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (res.status === 401) { clearGcalToken(); throw new Error("La conexión con Google caducó, inténtalo otra vez."); }
  if (!res.ok) throw new Error("No se pudo consultar el calendario (" + res.status + ")");
  const data = await res.json();
  return (data.items || []).some((ev) => String(ev.summary || "").toLowerCase().includes(keyword));
}
$("#gcalDetect").addEventListener("click", async () => {
  if (!profile.calendar) return;
  try {
    toast("Consultando calendario…");
    const works = await detectWorkDay(current);
    const gym = (profile.gymDays || []).includes(current.getDay());
    const type = works ? (gym ? "trabajo-gym" : "trabajo") : (gym ? "libre-gym" : "libre");
    if (!profile.dayTypes.some((t) => t.id === type)) throw new Error("Este perfil no distingue ese tipo de día.");
    getDay(iso(current)).type = type;
    saveAll(db); renderHoy();
    toast(works ? "Detectado: día de trabajo" : "Detectado: día libre");
  } catch (err) {
    toast(err.message || "No se pudo detectar el tipo de día");
  }
});
function initGcalSettings() {
  const cfg = gcalCfg();
  $("#gcalClientId").value = cfg.clientId || "";
  $("#gcalKeyword").value = cfg.keyword || "turno";
  $("#gcalOrigin").textContent = location.origin;
}
$("#gcalSave").addEventListener("click", () => {
  const clientId = $("#gcalClientId").value.trim();
  const keyword = $("#gcalKeyword").value.trim() || "turno";
  saveGcalCfg({ clientId, keyword });
  clearGcalToken(); gcalTokenClient = null; clearHealthToken(); clearFoodToken();
  $("#gcalMsg").textContent = "Ajustes guardados.";
});
$("#gcalDisconnect").addEventListener("click", () => {
  clearGcalToken(); gcalTokenClient = null; clearHealthToken(); clearFoodToken();
  $("#gcalMsg").textContent = "Desconectado.";
});

/* ---------- Google Health / Fitbit (opcional, bajo demanda, solo perfiles con health.enabled) ---------- */
// Usa el mismo Client ID que el calendario. Token aparte (otros permisos) y solo en sessionStorage.
const HEALTH_API = "https://health.googleapis.com/v4/users/me/dataTypes/";
const HEALTH_SCOPES = {
  steps: "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  weight: "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
};
function healthTokKey() { return `menujd.ghealth.tok.${profile.id}.v2`; }
function healthToken() { try { return JSON.parse(sessionStorage.getItem(healthTokKey())); } catch { return null; } }
function clearHealthToken() { try { sessionStorage.removeItem(healthTokKey()); } catch {} }
// onlySteps: pide solo el permiso de pasos (reintento si Google rechaza el conjunto con DISALLOWED_OAUTH_SCOPES).
async function ensureHealthToken(onlySteps = false) {
  const tok = healthToken();
  if (!onlySteps && tok && tok.exp > Date.now() + 30000) return tok;
  const cfg = gcalCfg();
  if (!cfg.clientId) throw new Error("Configura primero el Client ID en Recetas → Google.");
  await loadGIS();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: cfg.clientId,
      scope: onlySteps ? HEALTH_SCOPES.steps : Object.values(HEALTH_SCOPES).join(" "),
      // Sin mezclar permisos ya concedidos (calendario): la Health API rechaza tokens con scopes ajenos (403 DISALLOWED_OAUTH_SCOPES).
      include_granted_scopes: false,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error === "access_denied" ? "Google denegó el acceso (¿tu cuenta está en usuarios de prueba?)" : resp.error));
        const has = (s) => google.accounts.oauth2.hasGrantedAllScopes(resp, s);
        if (!has(HEALTH_SCOPES.steps)) return reject(new Error("Sin permiso para leer los pasos: márcalo al conectar."));
        const t = { token: resp.access_token, exp: Date.now() + resp.expires_in * 1000, weight: !onlySteps && has(HEALTH_SCOPES.weight), scope: String(resp.scope || "") };
        try { sessionStorage.setItem(healthTokKey(), JSON.stringify(t)); } catch {}
        resolve(t);
      },
      error_callback: (err) => reject(new Error((err && err.type) || "No se pudo conectar con Google")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}
async function healthFetch(tok, path, body) {
  let res;
  try {
    res = await fetch(HEALTH_API + path, body
      ? { method: "POST", headers: { Authorization: "Bearer " + tok.token, "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : { headers: { Authorization: "Bearer " + tok.token } });
  } catch { throw new Error("No se pudo conectar con Google Health (¿sin conexión?)"); }
  if (res.status === 401) { clearHealthToken(); throw new Error("La conexión con Google caducó, inténtalo otra vez."); }
  if (!res.ok) {
    // Google explica el motivo en { error: { message, status, details:[{ reason }] } }: se muestra tal cual para poder diagnosticar.
    let why = "";
    try {
      const e = (await res.json()).error || {};
      const info = (e.details || []).find((d) => d.reason) || {};
      const meta = info.metadata ? Object.entries(info.metadata).map(([k, v]) => `${k}=${v}`).join(", ") : "";
      why = [info.reason || e.status, e.message, meta].filter(Boolean).join(" · ");
    } catch {}
    if (res.status === 403 && /SERVICE_DISABLED|has not been used|is disabled/i.test(why)) throw new Error("La Google Health API no está habilitada en tu proyecto de Google Cloud. " + why);
    if (res.status === 403 && /SCOPE_INSUFFICIENT|insufficient/i.test(why)) { clearHealthToken(); throw new Error("Falta un permiso de Google Health: vuelve a pulsar y márcalo. " + why); }
    const err = new Error(`Google Health: error ${res.status}${why ? " · " + why : ""}`);
    err.reason = why;
    throw err;
  }
  return res.json();
}
const civil = (d) => ({ date: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } });
const civilIso = (c) => `${c.year}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
// Pasos totales por día en [from, to): { "YYYY-MM-DD": 12345 }. Días sin datos no aparecen.
async function healthSteps(tok, from, to) {
  const out = {};
  let pageToken;
  do {
    const data = await healthFetch(tok, "steps/dataPoints:dailyRollUp", { range: { start: civil(from), end: civil(to) }, windowSizeDays: 1, ...(pageToken ? { pageToken } : {}) });
    for (const p of data.rollupDataPoints || []) {
      const v = p.steps && (p.steps.countSum ?? p.steps.count_sum);
      const d = p.civilStartTime && p.civilStartTime.date;
      if (v != null && d) out[civilIso(d)] = parseInt(v, 10);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}
// Peso por día en [from, to) (el último de cada día, en kg con 1 decimal), en la hora local de la medición.
async function healthWeights(tok, from, to) {
  const filter = `weight.sample_time.physical_time >= "${from.toISOString()}" AND weight.sample_time.physical_time < "${to.toISOString()}"`;
  const pts = [];
  let pageToken;
  do {
    const q = new URLSearchParams({ filter, pageSize: "200", ...(pageToken ? { pageToken } : {}) });
    const data = await healthFetch(tok, "weight/dataPoints?" + q);
    for (const dp of data.dataPoints || []) {
      const w = dp.weight;
      if (!w || w.weightGrams == null) continue;
      const st = w.sampleTime || {};
      const t = Date.parse(st.physicalTime);
      if (!Number.isFinite(t)) continue;
      const off = parseFloat(st.utcOffset);
      const key = Number.isFinite(off) ? new Date(t + off * 1000).toISOString().slice(0, 10) : iso(new Date(t));
      pts.push({ t, key, kg: Math.round(w.weightGrams / 100) / 10 });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  const out = {};
  pts.sort((a, b) => a.t - b.t).forEach((p) => (out[p.key] = p.kg));
  return out;
}
// Trae pasos (y peso si hay permiso) de [from, to) y los guarda. No pide días futuros.
async function syncHealth(from, to) {
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  if (to > tomorrow) to = tomorrow;
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  if (end <= start) throw new Error("No hay datos de días futuros.");
  let tok = await ensureHealthToken();
  let steps;
  try { steps = await healthSteps(tok, start, end); }
  catch (err) {
    if (!/DISALLOWED_OAUTH_SCOPES/.test(err.reason || "")) throw err;
    // Reintento con solo el permiso de pasos; si también falla, se enseñan los permisos que llevaba el token.
    clearHealthToken();
    tok = await ensureHealthToken(true);
    try { steps = await healthSteps(tok, start, end); }
    catch (err2) { err2.message += " · Permisos del token: " + (tok.scope.replace(/https:\/\/www\.googleapis\.com\/auth\//g, "") || "(ninguno)"); throw err2; }
  }
  Object.entries(steps).forEach(([key, n]) => { getDay(key).steps = n; });
  saveAll(db);
  let weights = {};
  if (tok.weight) {
    weights = await healthWeights(tok, start, end);
    if (Object.keys(weights).length) saveWeights({ ...loadWeights(), ...weights });
  }
  setHealthLast();
  return { steps, weights, weightAllowed: tok.weight };
}

/* actualización automática: al abrir la app o volver a ella, si los datos tienen más de 3 h.
   Sin servidor no hay segundo plano, y Google solo da un token nuevo tras una pulsación (ventana emergente):
   si el token de la sesión sigue vivo (1 h) se actualiza en silencio; si no, el botón ⟳ Fitbit se resalta. */
const HEALTH_AUTO_MS = 3 * 3600e3;
function healthLastKey() { return `menujd.ghealth.last.${profile.id}.v1`; }
function healthLast() { try { return +localStorage.getItem(healthLastKey()) || 0; } catch { return 0; } }
function setHealthLast() { try { localStorage.setItem(healthLastKey(), String(Date.now())); } catch {} }
function healthStale() {
  const last = healthLast();
  return Date.now() - last > HEALTH_AUTO_MS || iso(new Date(last)) !== iso(new Date());
}
function renderHealthStatus() {
  const el = $("#healthStatus");
  if (!profile.health) { el.hidden = true; $("#healthDay").classList.remove("stale"); return; }
  const last = healthLast();
  const stale = healthStale();
  $("#healthDay").classList.toggle("stale", stale);
  let when = "nunca";
  if (last) {
    const d = new Date(last), hm = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const today = iso(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
    when = iso(d) === today ? `hoy a las ${hm}` : iso(d) === iso(y) ? `ayer a las ${hm}` : d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + ` a las ${hm}`;
  }
  el.textContent = `Fitbit: ${when === "nunca" ? "sin actualizar" : "actualizado " + when}${stale && when !== "nunca" ? " · toca Fitbit para actualizar" : ""}`;
  el.hidden = false;
}
let healthAutoBusy = false;
async function autoHealth() {
  if (!profile.health || healthAutoBusy) return;
  renderHealthStatus();
  const tok = healthToken();
  if (!healthStale() || !navigator.onLine || !tok || tok.exp < Date.now() + 60000) return;
  healthAutoBusy = true;
  try {
    // Últimos 3 días: así se cierran también los pasos de ayer.
    const from = new Date(); from.setDate(from.getDate() - 2);
    const to = new Date(); to.setDate(to.getDate() + 1);
    await syncHealth(from, to);
    const visible = document.querySelector(".view:not([hidden])");
    if (visible && visible.id === "view-hoy") renderHoy();
    if (visible && visible.id === "view-semana") renderSemana();
    toast("Fitbit actualizado");
  } catch { /* en silencio: el botón queda resaltado para hacerlo a mano */ }
  finally { healthAutoBusy = false; renderHealthStatus(); }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") autoHealth(); });
window.addEventListener("online", autoHealth);
async function runHealthSync(from, to, onDone) {
  if (!profile.health) return;
  try {
    toast("Consultando Google Health…");
    const r = await syncHealth(from, to);
    const nS = Object.keys(r.steps).length, nW = Object.keys(r.weights).length;
    onDone(r);
    if (!nS && !nW) toast("Google Health no tiene datos de esos días");
    else toast(`Fitbit: ${nS} ${nS === 1 ? "día" : "días"} de pasos${nW ? `, ${nW} ${nW === 1 ? "peso" : "pesos"}` : ""}`);
  } catch (err) {
    toast(err.message || "No se pudo sincronizar con Google Health", 15000);
  }
}
$("#healthDay").addEventListener("click", () => {
  // El día abierto y los dos anteriores (para cerrar los pasos de ayer si se abre por la mañana).
  const from = new Date(current); from.setDate(from.getDate() - 2);
  const to = new Date(current); to.setDate(to.getDate() + 1);
  runHealthSync(from, to, (r) => {
    renderHoy();
    const key = iso(current);
    if (r.steps[key] != null && key === iso(new Date())) setTimeout(() => toast(`Hoy: ${r.steps[key].toLocaleString("es-ES")} pasos hasta ahora · vuelve a sincronizar por la noche`), 2100);
  });
});
$("#healthWeek").addEventListener("click", () => {
  const to = new Date(weekStart); to.setDate(to.getDate() + 7);
  runHealthSync(weekStart, to, () => renderSemana());
});

/* ---------- Comidas → Google Health (solo perfiles con health.food) ----------
   Un único envío por día: cada comida registrada es una entrada "nutrition-log" (alimento anónimo con kcal, P, C, G).
   Sin servidor no se puede disparar a una hora fija (iOS no deja ejecutar nada en segundo plano a una PWA): el día se envía
   al pulsar el botón por la noche o, si no, al abrir la app al día siguiente (en silencio si el token de la sesión sigue vivo;
   si no, el botón se resalta y basta un toque). Las entradas anónimas no se pueden editar: si el día cambia después
   de enviarlo, se borran (batchDelete) y se crean de nuevo. */
const FOOD_SCOPE = "https://www.googleapis.com/auth/googlehealth.nutrition.writeonly";
const MEAL_TYPE = { D: "BREAKFAST", C: "LUNCH", S: "SNACK", N: "DINNER" };
const MEAL_TIME = { D: [8, 0], C: [14, 30], S: [17, 30], N: [21, 0] }; // hora nominal de cada franja (no se registra la real)
const FOOD_PENDING_DAYS = 7; // días cerrados que se revisan para avisar de lo que falta por enviar
const foodOn = () => !!(profile.health && profile.health.food);
function foodTokKey() { return `menujd.ghealth.food.tok.${profile.id}.v1`; }
function foodSentKey() { return `menujd.ghealth.food.${profile.id}.v1`; }
// { since: "YYYY-MM-DD" (primer envío: lo anterior no se reclama), days: { "YYYY-MM-DD": { sig, names: [nombre del dataPoint], at } } }
function loadFoodSent() { try { return JSON.parse(localStorage.getItem(foodSentKey())) || { days: {} }; } catch { return { days: {} }; } }
function saveFoodSent(st) { try { localStorage.setItem(foodSentKey(), JSON.stringify(st)); } catch {} }
const foodSig = (items) => JSON.stringify((items || []).map((x) => [x.slot, x.n, r1(x.k), r1(x.p), r1(x.c), r1(x.f)]));
// "empty" (nada que enviar), "pending" (sin enviar), "changed" (cambiado tras enviarlo), "sent", "future".
function foodState(key, st = loadFoodSent()) {
  if (key > iso(new Date())) return "future";
  const items = (db[key] && db[key].items) || [], prev = st.days[key];
  if (!prev) return items.length ? "pending" : "empty";
  return prev.sig === foodSig(items) ? "sent" : "changed";
}
// Días ya terminados (antes de hoy) con algo por enviar o actualizar, desde el primer envío.
function foodPendingDays(st = loadFoodSent()) {
  if (!st.since) return [];
  const out = [];
  for (let i = FOOD_PENDING_DAYS; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = iso(d);
    if (key >= st.since && ["pending", "changed"].includes(foodState(key, st))) out.push(key);
  }
  return out;
}
function foodToken() { try { return JSON.parse(sessionStorage.getItem(foodTokKey())); } catch { return null; } }
function clearFoodToken() { try { sessionStorage.removeItem(foodTokKey()); } catch {} }
async function ensureFoodToken() {
  const tok = foodToken();
  if (tok && tok.exp > Date.now() + 30000) return tok;
  const cfg = gcalCfg();
  if (!cfg.clientId) throw new Error("Configura primero el Client ID en Recetas → Google.");
  await loadGIS();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: cfg.clientId,
      scope: FOOD_SCOPE,
      include_granted_scopes: false, // igual que pasos/peso: sin mezclar permisos ajenos en el token
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error === "access_denied" ? "Google denegó el acceso (¿tu cuenta está en usuarios de prueba?)" : resp.error));
        if (!google.accounts.oauth2.hasGrantedAllScopes(resp, FOOD_SCOPE)) return reject(new Error("Sin permiso para añadir comidas: márcalo al conectar."));
        const t = { token: resp.access_token, exp: Date.now() + resp.expires_in * 1000 };
        try { sessionStorage.setItem(foodTokKey(), JSON.stringify(t)); } catch {}
        resolve(t);
      },
      error_callback: (err) => reject(new Error((err && err.type) || "No se pudo conectar con Google")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}
const foodDisplayName = (x) => (splitName(x.n).t + (x.m && Math.abs(x.m - 1) > 0.01 ? ` ×${f1(x.m)}` : "")).slice(0, 100);
// Envía (o reenvía) un día: borra lo enviado antes y crea una entrada por comida. Guarda el avance aunque falle a medias,
// para que el siguiente intento borre lo que sí se llegó a crear y no queden duplicados.
async function sendFoodDay(tok, key) {
  const st = loadFoodSent();
  const prev = st.days[key];
  const old = ((prev && prev.names) || []).filter(Boolean);
  if (old.length) {
    try { await healthFetch(tok, "nutrition-log/dataPoints:batchDelete", { names: old }); }
    catch (err) { if (!/\b404\b|NOT_FOUND/.test(err.message)) throw err; } // ya borradas desde la app de Fitbit
  }
  const items = (db[key] && db[key].items) || [];
  const names = [], perSlot = {};
  const save = (sig) => {
    const s2 = loadFoodSent();
    if (items.length) { s2.days[key] = { sig, names, at: Date.now() }; if (!s2.since || key < s2.since) s2.since = key; }
    else delete s2.days[key];
    saveFoodSent(s2);
  };
  try {
    for (const x of items) {
      const n = (perSlot[x.slot] = (perSlot[x.slot] || 0) + 1);
      const [h, m] = MEAL_TIME[x.slot] || [12, 0];
      const start = new Date(key + "T00:00:00"); start.setHours(h, m + (n - 1) * 5, 0, 0);
      const end = new Date(start.getTime() + 5 * 60e3);
      const op = await healthFetch(tok, "nutrition-log/dataPoints", { nutritionLog: {
        interval: { startTime: start.toISOString(), endTime: end.toISOString() },
        foodDisplayName: foodDisplayName(x),
        mealType: MEAL_TYPE[x.slot] || "ANYTIME",
        energy: { kcal: r1(x.k) },
        totalCarbohydrate: { grams: r1(x.c) },
        totalFat: { grams: r1(x.f) },
        nutrients: [{ nutrient: "PROTEIN", quantity: { grams: r1(x.p) } }],
      } });
      names.push((op && op.response && op.response.name) || null);
    }
  } catch (err) { save("partial"); throw err; }
  save(foodSig(items));
  return items.length;
}
// Envía los días indicados (en orden) con un solo token: como mucho una ventana de Google.
async function sendFoodDays(keys, tok) {
  tok = tok || await ensureFoodToken();
  let meals = 0;
  try { for (const key of keys) meals += await sendFoodDay(tok, key); }
  catch (err) { if (/caducó|Falta un permiso/.test(err.message)) clearFoodToken(); throw err; }
  return meals;
}
const foodDayName = (key) => {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return key === iso(y) ? "ayer" : new Date(key + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
};
// Qué se envía al pulsar: primero los días ya terminados que falten (incluido el abierto si es pasado); el de hoy
// solo cuando no queda nada atrás, para que cada día se envíe una vez al acabar y no a medias.
function foodSendKeys() {
  const key = iso(current), st = loadFoodSent(), today = iso(new Date());
  const open = ["pending", "changed"].includes(foodState(key, st));
  const closed = foodPendingDays(st).filter((k) => k !== key);
  if (open && key < today) closed.push(key);
  if (closed.length) return closed.sort();
  return open && key === today ? [key] : [];
}
function renderFoodSync() {
  const box = $("#foodSync");
  if (!foodOn()) { box.hidden = true; return; }
  const key = iso(current), st = loadFoodSent(), state = foodState(key, st);
  const others = foodPendingDays(st).filter((k) => k !== key);
  const isToday = key === iso(new Date());
  const prev = st.days[key];
  const at = prev && prev.at ? new Date(prev.at) : null;
  const atTxt = at ? (iso(at) === key ? "a las " + at.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "el " + at.toLocaleDateString("es-ES", { day: "numeric", month: "short" })) : "";
  let msg = "";
  if (state === "sent") msg = `Google Health: comidas enviadas ${atTxt}.`;
  else if (state === "changed") msg = prev.sig === "partial" ? "Google Health: el último envío se cortó a medias." : "Google Health: has cambiado comidas después de enviarlas.";
  else if (state === "pending") msg = isToday ? "Google Health: envía las comidas cuando termines el día." : "Google Health: comidas de este día sin enviar.";
  if (others.length) msg += `${msg ? " " : "Google Health: "}Falta${others.length > 1 ? "n" : ""} ${others.map(foodDayName).join(", ")}.`;
  const keys = foodSendKeys();
  box.hidden = !msg;
  $("#foodStatus").textContent = msg;
  const btn = $("#foodSend");
  btn.hidden = !keys.length;
  // Resaltado: hay días ya terminados por enviar (el de hoy aún puede cambiar, no se insiste).
  btn.classList.toggle("stale", keys.some((k) => k < iso(new Date())));
  const label = keys.length > 1 ? `Enviar ${keys.length} días` : keys[0] !== key ? `Enviar ${foodDayName(keys[0])}` : state === "changed" ? "Actualizar" : "Enviar";
  btn.innerHTML = `${ico("upload")} ${label}`;
}
$("#foodSend").addEventListener("click", async () => {
  if (!foodOn()) return;
  const keys = foodSendKeys();
  if (!keys.length) return;
  const btn = $("#foodSend");
  btn.disabled = true;
  try {
    toast("Enviando comidas a Google Health…", 10000);
    const n = await sendFoodDays(keys);
    toast(`Google Health: ${n} ${n === 1 ? "comida enviada" : "comidas enviadas"}${keys.length > 1 ? ` (${keys.length} días)` : ""}`);
  } catch (err) {
    toast(err.message || "No se pudieron enviar las comidas", 15000);
  } finally { btn.disabled = false; renderFoodSync(); }
});
// Al abrir la app o volver a ella: si quedan días terminados por enviar y el token sigue vivo, se envían solos.
let foodAutoBusy = false;
async function autoFood() {
  if (!foodOn() || foodAutoBusy) return;
  const tok = foodToken(), keys = foodPendingDays();
  if (!keys.length || !navigator.onLine || !tok || tok.exp < Date.now() + 60000) { renderFoodSync(); return; }
  foodAutoBusy = true;
  try {
    const n = await sendFoodDays(keys, tok);
    toast(`Google Health: enviadas ${n} ${n === 1 ? "comida" : "comidas"} de ${keys.map(foodDayName).join(", ")}`);
  } catch { /* en silencio: el botón queda resaltado */ }
  finally { foodAutoBusy = false; renderFoodSync(); }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") autoFood(); });
window.addEventListener("online", autoFood);

const APP_VERSION = "v25"; // igual que CACHE en sw.js
$("#appVersion").textContent = "Versión de la app: " + APP_VERSION;

/* arranque */
renderProfileSelect();
initGcalSettings();
renderMenu(); renderRecetas(); renderHoy();
autoHealth(); autoFood();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
$("#toast").addEventListener("click", (e) => {
  if (e.target.closest(".toast-act") && toastAction) { const fn = toastAction.fn; toastAction = null; fn(); return; }
  $("#toast").hidden = true;
});
