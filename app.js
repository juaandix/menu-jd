"use strict";
const $ = (s) => document.querySelector(s);
const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;

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
function meter(label, val, target, unit) {
  const pct = Math.min(100, (val / target) * 100);
  const over = val > target * 1.03;
  return `<div class="meter"><div class="meter-label"><span>${label}</span><span><b>${r0(val)}</b> / ${target} ${unit}</span></div>
    <div class="bar${over ? " over" : ""}"><i style="width:${pct}%"></i></div></div>`;
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

  const t = totals(day.items);
  const adj = stepAdjust(day, type, key);
  const target = type.kcal + adj;
  const left = target - t.k;
  const pLeft = profile.proteinTarget - t.p;
  const cost = itemsCost(day.items);
  $("#summary").innerHTML = `
    <div class="big"><strong>${r0(left)}</strong><span>${left >= 0 ? "kcal restantes" : "kcal por encima del objetivo"}</span></div>
    ${meter(adj ? "Calorías (ajustado por pasos)" : "Calorías", t.k, target, "kcal")}
    ${meter("Proteína", t.p, profile.proteinTarget, "g")}
    <div class="chips">
      <span class="chip">C ${r0(t.c)} g</span><span class="chip">G ${r0(t.f)} g</span>
      ${pLeft > 0 ? `<span class="chip">Faltan ${r0(pLeft)} g de proteína</span>` : `<span class="chip">Proteína cubierta</span>`}
      ${left < -60 ? `<span class="chip warn">Te has pasado ${r0(-left)} kcal</span>` : ""}
      ${cost.priced ? `<span class="chip">Coste ${costLabel(cost)}</span>` : ""}
    </div>`;
  renderSteps(day, type, key, adj);

  $("#slots").innerHTML = profile.slots.map((s) => {
    const items = day.items.map((x, idx) => ({ ...x, idx })).filter((x) => x.slot === s.id);
    const hint = s.id === "S" && type.mods ? `${s.hint} · ${type.mods} en este tipo de día` : s.hint;
    return `<div class="slot">
      <div class="slot-head"><h3>${s.label}<small>${hint}</small></h3>
        <button class="add-btn" data-add="${s.id}">+ Añadir</button></div>
      ${items.length ? items.map((x) => `
        <div class="entry"><button class="name" type="button" data-entry="${x.idx}" aria-label="Editar ${esc(x.n)}"><b>${esc(x.n)}</b><span>${x.ref ? x.ref + " · " : ""}P ${r1(x.p)} · C ${r0(x.c || 0)} · G ${r0(x.f || 0)}${costLabel(itemDishCost(x)) ? " · " + costLabel(itemDishCost(x)) : ""}${x.i ? " · ✎" : ""}</span></button>
          <span class="kc">${r0(x.k)}</span>
          <button class="del" data-del="${x.idx}" aria-label="Quitar ${esc(x.n)}">✕</button></div>`).join("")
      : `<p class="empty">Nada registrado.</p>`}
    </div>`;
  }).join("");
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
    msg = `Este objetivo ya cuenta con ~${fmt(type.steps)} pasos: ${adj > 0 ? "+" : ""}${adj} kcal → ${fmt(type.kcal + adj)} kcal.`;
  else if (type.steps)
    msg = `El objetivo de este tipo de día ya cuenta con ~${fmt(type.steps)} pasos. Apunta los reales para ajustarlo.`;
  else if (typeof day.steps === "number")
    msg = `≈ ${fmt(Math.round(day.steps * KCAL_PER_STEP_KG * latestWeight(key)))} kcal de actividad andando (informativo: este tipo de día no ajusta el objetivo por pasos).`;
  else msg = "Opcional: quedan en el historial semanal.";
  if (typeof day.steps === "number" && type.steps && key === iso(new Date())) msg += " El día no ha terminado: actualízalos por la noche.";
  $("#stepsInfo").textContent = msg;
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
      <div class="portion-row">${PORTIONS.map((pt) => `<button class="portion-btn${Math.abs(pt.mult - mult) < 0.01 ? " is-default" : ""}" data-ent-portion="${pt.mult}"><b>${pt.label}×</b><span>${r0((x.k / mult) * pt.mult)} kcal · ${r1((x.p / mult) * pt.mult)} g P</span></button>`).join("")}</div>
      <p class="muted small">Mover a</p>
      <div class="recent-row">${profile.slots.filter((s) => s.id !== x.slot).map((s) => `<button class="chip-opt" data-ent-move="${s.id}">${s.label}</button>`).join("")}</div>
    </div>
    <div class="row">
      ${canIng ? `<button class="btn ghost" data-ent-ing="1">✎ Ingredientes</button>` : ""}
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
    <button class="btn ghost free-btn" type="button" data-ed-free="1">🥣 Montar con ingredientes (macros automáticos)</button>
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
  $("#recentRow").innerHTML = recent.length && !q
    ? `<div class="recent-label">Recientes</div><div class="recent-row">${recent.map((o) => `<button class="chip-opt" data-pick="${o.id}">${esc(o.n)}</button>`).join("")}</div>`
    : "";
  const list = profile.menu[slot].filter((o) => dishMatches(o, q));
  $("#sheetList").innerHTML = list.length
    ? list.map((o) => `<button class="opt" data-pick="${o.id}"><span class="code">${o.id}</span><span>${esc(o.n)}</span><span class="kc">${o.k} kcal<br>${r0(o.p)} g P</span></button>`).join("")
    : `<p class="empty">Sin platos que coincidan con "${esc(q)}".</p>`;
}
function openPortionStep(dishId) {
  const o = byId(dishId);
  $("#sheetTitle").textContent = o.n;
  $("#sheetBody").innerHTML = `
    <button class="back-link" id="portionBack" type="button">‹ Elegir otro plato</button>
    <div class="portion-card">
      <p class="muted">¿Qué ración quieres registrar?</p>
      <div class="portion-row">
        ${PORTIONS.map((pt) => `<button class="portion-btn${pt.mult === 1 ? " is-default" : ""}" data-portion="${pt.mult}" data-dish="${o.id}">
          <b>${pt.label}×</b><span>${r0(o.k * pt.mult)} kcal · ${r1(o.p * pt.mult)} g P</span></button>`).join("")}
      </div>
      <button class="btn ghost" type="button" data-ed-logdish="${o.id}">✎ Cambiar ingredientes solo para hoy</button>
    </div>`;
}
function closeSheet() { $("#sheet").hidden = true; $("#sheetBg").hidden = true; }

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
function productEntry(p) { return { key: p.key, n: p.n, u: "g", g: p.g || null, nut: p.nut, w: p.n, cat: "Mis productos", user: true }; }
function catalog() { return [...userProducts().map(productEntry), ...SHOP]; }
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
  return `<article class="card"><h3><span class="code">${o.id}</span>${o.n}${o.mod ? `<span class="mod-tag">modificado</span>` : ""}</h3>
    <ul>${o.i.map((x) => `<li>${x}</li>`).join("")}</ul>
    ${o.t ? `<p class="tip">${o.t}</p>` : ""}
    <div class="macros"><span><b>${o.k}</b> kcal</span><span>P <b>${r0(o.p)}</b></span><span>C ${r0(o.c)}</span><span>G ${r0(o.f)}</span>${costLabel(dishCost(o)) ? `<span class="cost">${costLabel(dishCost(o))}</span>` : ""}
    ${addable ? `<span class="card-btns"><button class="add-btn edit-btn" data-edit="${o.id}" aria-label="Cambiar ingredientes de ${esc(o.n)}">✎ Cambiar</button><button class="add-btn" data-quick="${o.id}">+ Hoy</button></span>` : ""}</div></article>`;
}
let avgS = {};
function renderMenuList() {
  $("#menuList").innerHTML = profile.slots.map((s) => `
    <section class="group"><h2>${s.label}s<small>${s.hint}</small></h2>
    <div class="cards">${profile.menu[s.id].map((o) => cardHTML(o)).join("")}</div></section>`).join("");
}
function renderMenu() {
  $("#menuLead").textContent = profile.builder
    ? "Cualquier combinación de desayuno, comida y cena da aproximadamente lo mismo. Los snacks ajustan al objetivo del día."
    : "Plan de referencia: cada tarjeta es uno de los platos de tu plan, con sus kcal, proteína, carbohidratos y grasa.";
  renderMenuList();

  $("#builderSection").hidden = !profile.builder;
  if (!profile.builder) return;
  const [mainD, mainC, mainN] = profile.builder.main;
  const fill = (id, arr) => ($(id).innerHTML = arr.map((o) => `<option value="${o.id}">${o.id} · ${o.n}</option>`).join(""));
  fill("#bD", profile.menu[mainD]); fill("#bC", profile.menu[mainC]); fill("#bN", profile.menu[mainN]);
  $("#bT").innerHTML = profile.dayTypes.map((t) => `<option value="${t.id}">${t.label}</option>`).join("");
  const snacks = profile.builder.snackSlot ? profile.menu[profile.builder.snackSlot] : [];
  avgS = snacks.length
    ? { k: snacks.reduce((a, o) => a + o.k, 0) / snacks.length, p: snacks.reduce((a, o) => a + o.p, 0) / snacks.length }
    : { k: 0, p: 0 };
  updBuilder();
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
function macrosTxt(m) { return `${r0(m.k)} kcal · P ${r1(m.p)} · C ${r0(m.c)} · G ${r0(m.f)}`; }
function bandStatus(slotId, m) {
  const t = (profile.slots.find((s) => s.id === slotId) || {}).target;
  if (!t) return "";
  const out = [];
  const dk = m.k - t.k;
  if (Math.abs(dk) > 15) out.push(`${dk > 0 ? "+" : ""}${r0(dk)} kcal`);
  if (t.p != null) { const dp = m.p - t.p; if (Math.abs(dp) > 3) out.push(`${dp > 0 ? "+" : ""}${r1(dp)} g P`); }
  else if (m.p < t.pMin || m.p > t.pMax) out.push(`proteína fuera de ${t.pMin}–${t.pMax} g`);
  return out.length ? `<p class="band off">Fuera de la franja (${t.k} kcal): ${out.join(", ")}</p>` : `<p class="band ok">Dentro de la franja ✓</p>`;
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
    log: `<div class="portion-row">${PORTIONS.map((pt) => `<button class="portion-btn${pt.mult === 1 ? " is-default" : ""}" data-ed-log="${pt.mult}"><b>${pt.label}×</b><span>${r0(ed.m.k * pt.mult)} kcal · ${r1(ed.m.p * pt.mult)} g P</span></button>`).join("")}</div>`,
    free: `<button class="btn" data-ed-log="1"${ed.i.length ? "" : " disabled"}>Registrar</button>`,
    entry: `<button class="btn" data-ed-entry="1">Guardar cambios</button>`,
  }[ed.mode];
  const note = {
    dish: "El cambio se guarda en este móvil y se usa al registrar, en Monta tu día, la lista de la compra y los costes. Lo ya registrado no cambia.",
    log: "Solo cambia lo que registras ahora; el plato del Menú se queda como está. Elige la ración para registrarlo.",
    free: "Añade los ingredientes con sus gramos y los macros se calculan solos.",
    entry: `Cambia solo esta entrada del registro${ed.mult !== 1 ? ` (ración ${r1(ed.mult)}×; los valores de arriba son por ración)` : ""}.`,
  }[ed.mode];
  $("#sheetBody").innerHTML = `
    <label for="edName">${free ? "Nombre (opcional)" : "Nombre del plato"}<input type="text" id="edName" value="${esc(ed.n)}" placeholder="${free ? "p. ej. Tostadas con pavo" : ""}" autocomplete="off"></label>
    <div class="ed-list">${ed.i.length ? ed.i.map((raw, idx) => {
      const m = ingMacros(raw);
      return `<div class="ed-row"><div class="ed-name"><b>${esc(raw)}</b><small>${m ? `${r0(m.k)} kcal · ${r1(m.p)} g P` : "sin macros (no se puede cambiar)"}</small></div>
        ${m ? `<button class="chip-opt" data-ed-change="${idx}">Cambiar</button><button class="del" data-ed-remove="${idx}" aria-label="Quitar ${esc(raw)}">✕</button>` : ""}</div>`;
    }).join("") : `<p class="empty">Aún no hay ingredientes.</p>`}</div>
    <button class="btn ghost" data-ed-add="1">＋ Añadir ingrediente</button>
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
    <button class="back-link" type="button" data-ed-back="1">‹ Volver al plato</button>
    ${old ? `<p class="muted small">Cambiar <b>${esc(old)}</b> por…</p>` : `<p class="muted small">Añadir al plato…</p>`}
    <input type="search" id="edSearch" placeholder="Buscar ingrediente…" autocomplete="off">
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
        <button class="btn" type="submit">Crear y usar</button>
      </form>
    </details>`;
  renderPickerOptions();
  $("#edSearch").addEventListener("input", (e) => { ed.q = e.target.value; renderPickerOptions(); });
}
function renderPickerOptions() {
  const q = norm(ed.q || "");
  const list = foodOptions().filter((o) => !q || norm(o.label).includes(q) || norm(o.cooked ? o.c.cooked.w : o.c.w || "").includes(q));
  $("#edOptions").innerHTML = list.length
    ? list.map((o) => `<button class="opt" data-ed-pick="${o.id}"><span>${esc(o.label)}</span><span class="kc">${r0(o.nut[0])} kcal<br>${r1(o.nut[1])} g P</span></button>`).join("")
    : `<p class="empty">Nada con "${esc(ed.q)}". Créalo abajo con sus macros.</p>`;
}
function openGrams(optId) {
  const o = foodOptions().find((x) => x.id === optId);
  if (!o) return;
  ed.pick = o;
  const old = ed.idx != null ? parseIng(ed.i[ed.idx]) : null;
  ed.grams = (old && old.grams) || o.c.g || 100;
  $("#sheetBody").innerHTML = `
    <button class="back-link" type="button" data-ed-back-pick="1">‹ Elegir otro ingrediente</button>
    <div class="portion-card">
      <p><b>${esc(o.label)}</b> <span class="muted small">(${r0(o.nut[0])} kcal · ${r1(o.nut[1])} g P por 100 g)</span></p>
      <label for="edGrams">Gramos${o.c.g ? ` (1 unidad ≈ ${o.c.g} g)` : ""}<input type="text" inputmode="decimal" id="edGrams" value="${fmtG(ed.grams)}"></label>
      <div id="edPreview"></div>
      <div class="row">
        ${old && ingMacros(ed.i[ed.idx]) && o.nut[0] > 0 ? `<button class="btn ghost" data-ed-match="1">Igualar kcal</button>` : ""}
        <button class="btn" data-ed-apply="1">${ed.idx != null ? "Cambiar" : "Añadir"}</button>
      </div>
    </div>`;
  $("#edGrams").addEventListener("input", (e) => { ed.grams = parseFloat(e.target.value.replace(",", ".")) || 0; renderGramsPreview(); });
  renderGramsPreview();
}
function pickText() {
  const o = ed.pick, w = o.cooked ? o.c.cooked.w : o.c.w;
  const units = o.c.g && o.c.u === "ud" ? ` (≈${r1(ed.grams / o.c.g).toString().replace(".", ",")} ud)` : "";
  return `${fmtG(ed.grams)} g de ${w}${units}`;
}
function pickDelta() {
  const newM = ingMacros(pickText());
  const oldM = ed.idx != null ? ingMacros(ed.i[ed.idx]) : { k: 0, p: 0, c: 0, f: 0 };
  return newM && oldM ? { newM, oldM, total: addM(addM(ed.m, oldM, -1), newM) } : null;
}
function renderGramsPreview() {
  const d = ed.grams > 0 ? pickDelta() : null;
  $("#edPreview").innerHTML = d ? `
    <p class="muted small">Este ingrediente: ${r0(d.newM.k)} kcal · ${r1(d.newM.p)} g P${ed.idx != null ? ` (antes ${r0(d.oldM.k)} kcal · ${r1(d.oldM.p)} g P)` : ""}</p>
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
    ? list.map((p) => `<li><span><b>${esc(p.n)}</b><small>${p.nut[0]} kcal · P ${p.nut[1]} · C ${p.nut[2]} · G ${p.nut[3]} /100 g${p.g ? ` · ${p.g} g/ud` : ""}</small></span><button class="del" data-prod-del="${p.key}" aria-label="Borrar ${esc(p.n)}">✕</button></li>`).join("")
    : `<li class="empty">Aún no hay ninguno. Se crean desde ✎ Cambiar en un plato del Menú.</li>`;
}

/* ---------- RECETAS ---------- */
function renderRecetas() {
  $("#recipeList").innerHTML = profile.recipes.map((x) => `<article class="card"><h3><span class="code">${x.tag}</span>${x.n}</h3>
    <ul>${x.i.map((i) => `<li>${i}</li>`).join("")}</ul><ol>${x.s.map((i) => `<li>${i}</li>`).join("")}</ol>
    <div class="macros"><span>${x.m}</span></div></article>`).join("");
  $("#notes").innerHTML = profile.notes.map((n) => `<li>${n}</li>`).join("");
  renderProducts();
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
  $("#weekSub").textContent = `Domingo ${fmt(dates[0], { day: "numeric", month: "long" })} a sábado ${fmt(dates[6], { day: "numeric", month: "long" })}`;

  const weights = loadWeights();
  const rows = dates.map((d) => {
    const key = iso(d), day = db[key];
    const items = day ? day.items : [];
    return { d, key, day, items, t: totals(items), target: dayTarget(key), cost: itemsCost(items), steps: day && typeof day.steps === "number" ? day.steps : null, w: weights[key] ?? null };
  });
  const logged = rows.filter((r) => r.items.length);
  const kAvg = avg(logged.map((r) => r.t.k)), tAvg = avg(logged.map((r) => r.target));
  const pAvg = avg(logged.map((r) => r.t.p));
  const stepsAvg = avg(rows.filter((r) => r.steps != null).map((r) => r.steps));
  const wAvg = avg(rows.filter((r) => r.w != null).map((r) => r.w));
  const prevStart = new Date(weekStart); prevStart.setDate(prevStart.getDate() - 7);
  const wPrev = avg(weekDates(prevStart).map((d) => weights[iso(d)]).filter((x) => x != null));
  const cost = rows.reduce((a, r) => ({ eur: a.eur + r.cost.eur, missing: a.missing + r.cost.missing, priced: a.priced + r.cost.priced }), { eur: 0, missing: 0, priced: 0 });

  $("#weekSummary").innerHTML = logged.length ? `
    <div class="big"><strong>${r0(kAvg)}</strong><span>kcal de media · objetivo medio ${r0(tAvg)} (${logged.length} ${logged.length === 1 ? "día registrado" : "días registrados"})</span></div>
    ${meter("Calorías (media)", kAvg, r0(tAvg), "kcal")}
    ${meter("Proteína (media)", pAvg, profile.proteinTarget, "g")}
    <div class="chips">
      <span class="chip">${r0(kAvg - tAvg) > 0 ? "+" : ""}${r0(kAvg - tAvg)} kcal/día vs objetivo</span>
      <span class="chip">Balance semana ${r0((kAvg - tAvg) * logged.length) > 0 ? "+" : ""}${r0((kAvg - tAvg) * logged.length)} kcal</span>
      ${stepsAvg != null ? `<span class="chip">${r0(stepsAvg).toLocaleString("es-ES")} pasos/día</span>` : ""}
      ${wAvg != null ? `<span class="chip">Peso medio ${kgFmt(wAvg)} kg${wPrev != null ? ` (${wAvg - wPrev > 0 ? "+" : ""}${kgFmt(wAvg - wPrev)})` : ""}</span>` : ""}
      ${cost.priced ? `<span class="chip">Coste ${costLabel(cost)}</span>` : ""}
    </div>`
    : `<p class="empty">No hay comidas registradas en esta semana.</p>${wAvg != null ? `<div class="chips"><span class="chip">Peso medio ${kgFmt(wAvg)} kg</span></div>` : ""}`;

  const todayKey = iso(new Date());
  $("#weekDays").innerHTML = rows.map((r) => {
    const pct = r.target ? Math.min(100, (r.t.k / r.target) * 100) : 0;
    const over = r.target && r.t.k > r.target * 1.03;
    return `<button class="wday${r.key === todayKey ? " is-today" : ""}" data-goday="${r.key}" aria-label="Abrir ${fmt(r.d, { weekday: "long", day: "numeric" })} en Hoy">
      <span class="wd-name">${fmt(r.d, { weekday: "short" })}<b>${r.d.getDate()}</b></span>
      <span class="wd-main">${r.items.length
        ? `<span class="wd-nums"><b>${r0(r.t.k)}</b> / ${r0(r.target)} kcal · ${r0(r.t.p)} g P</span><span class="bar${over ? " over" : ""}"><i style="width:${pct}%"></i></span>`
        : `<span class="wd-nums muted">Sin registro</span>`}
        <span class="wd-extra">${[r.steps != null ? r.steps.toLocaleString("es-ES") + " pasos" : "", r.w != null ? kgFmt(r.w) + " kg" : "", costLabel(r.cost)].filter(Boolean).join(" · ")}</span>
      </span></button>`;
  }).join("");

  $("#healthWeek").hidden = !profile.health;
  renderWeight();
  renderShop(rows);
  renderPrices();
}

/* peso */
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
    ${pts.map((p) => `<circle cx="${x(p.t)}" cy="${y(p.v)}" r="3.5" class="dot"><title>${dShort(p.k)}: ${kgFmt(p.v)} kg</title></circle>`).join("")}
    <text x="${L}" y="${H - 6}">${dShort(pts[0].k)}</text>
    ${pts.length > 1 ? `<text x="${W - R}" y="${H - 6}" text-anchor="end">${dShort(pts[pts.length - 1].k)}</text>` : ""}
  </svg>`;
  const last = pts[pts.length - 1];
  const weekAgo = keys.filter((k) => k <= iso(new Date(last.t - 7 * 864e5))).pop();
  const bits = [`Último: <b>${kgFmt(last.v)} kg</b> (${dShort(last.k)})`];
  if (weekAgo) bits.push(`${last.v - w[weekAgo] > 0 ? "+" : ""}${kgFmt(last.v - w[weekAgo])} kg en 7 días`);
  if (goal && last.v > goal) bits.push(`faltan ${kgFmt(last.v - goal)} kg para ${goal}`);
  $("#weightList").innerHTML = `<p class="muted small">${bits.join(" · ")}</p>
    <ul class="wlist">${keys.slice(-5).reverse().map((k) => `<li><span>${dShort(k)}</span><b>${kgFmt(w[k])} kg</b><button class="del" data-wdel="${k}" aria-label="Borrar peso del ${dShort(k)}">✕</button></li>`).join("")}</ul>`;
}

/* lista de la compra */
const SHOP_CATS = ["Fruta y verdura", "Carne y pescado", "Charcutería", "Huevos", "Lácteos", "Panadería", "Despensa", "Caseros", "Mis productos"];
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
        <span>${esc(a.c.n)}</span><b>${qtyFmt(a.c, a.qty)}${a.gusto && a.qty ? " + al gusto" : ""}</b>${v != null ? `<small>${eurFmt(v)}</small>` : ""}</label>`;
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
  autoHealth();
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
    const pt = PORTIONS.find((p) => p.mult === mult);
    const suffix = mult === 1 ? "" : ` · ración ${pt.label}`;
    pushRecent(sheetState.slot, o.id);
    addItem(sheetState.slot, { ref: o.id, m: mult, n: o.n + suffix, k: r0(o.k * mult), p: r1(o.p * mult), c: r1(o.c * mult), f: r1(o.f * mult) });
    closeSheet(); toast("Añadido: " + o.n + suffix);
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
  else if (b.dataset.edMatch) {
    const oldM = ingMacros(ed.i[ed.idx]);
    ed.grams = Math.max(5, Math.round(oldM.k / (ed.pick.nut[0] / 100) / 5) * 5);
    $("#edGrams").value = fmtG(ed.grams); renderGramsPreview();
  }
  else if (b.dataset.edApply) applyPick();
  else if (b.dataset.edSave) saveEditor();
  else if (b.dataset.edReset) resetDish();
  else if (b.dataset.prodDel) {
    saveProducts(userProducts().filter((p) => p.key !== b.dataset.prodDel));
    afterDishChange(); renderProducts(); toast("Producto borrado");
  }
  else if (b.dataset.quick) { const o = byId(b.dataset.quick); current = new Date(); current.setHours(12, 0, 0, 0); pushRecent(slotOf(o.id), o.id); addItem(slotOf(o.id), { ref: o.id, n: o.n, k: o.k, p: o.p, c: o.c, f: o.f }); toast("Añadido a hoy: " + o.n); }
});
$("#sheetClose").addEventListener("click", closeSheet);
$("#sheetBg").addEventListener("click", closeSheet);
$("#sheetBody").addEventListener("submit", (e) => {
  e.preventDefault();
  const num = (id) => parseFloat($(id).value.replace(",", ".")) || 0;
  if (e.target.id === "prodForm") {
    const n = $("#prName").value.trim().replace(/\s+/g, " ");
    const k = num("#prK");
    if (!n || !(k >= 0) || !$("#prK").value.trim()) { toast("Pon al menos el nombre y las kcal"); return; }
    const list = userProducts();
    const same = list.find((p) => norm(p.n) === norm(n));
    const prod = { key: same ? same.key : "u" + Date.now().toString(36), n, nut: [k, num("#prP"), num("#prC"), num("#prF")], ...(num("#prG") > 0 ? { g: num("#prG") } : {}) };
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
  clearGcalToken(); gcalTokenClient = null; clearHealthToken();
  $("#gcalMsg").textContent = "Ajustes guardados.";
});
$("#gcalDisconnect").addEventListener("click", () => {
  clearGcalToken(); gcalTokenClient = null; clearHealthToken();
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
  el.textContent = `Fitbit: última actualización ${when}.${stale ? " Toca ⟳ Fitbit para actualizar." : ""}`;
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

const APP_VERSION = "v13"; // igual que CACHE en sw.js
$("#appVersion").textContent = "Versión de la app: " + APP_VERSION;

/* arranque */
renderProfileSelect();
initGcalSettings();
renderMenu(); renderRecetas(); renderHoy();
autoHealth();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
$("#toast").addEventListener("click", (e) => {
  if (e.target.closest(".toast-act") && toastAction) { const fn = toastAction.fn; toastAction = null; fn(); return; }
  $("#toast").hidden = true;
});
