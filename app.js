"use strict";
const $ = (s) => document.querySelector(s);
const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;

/* ---------- perfil activo ---------- */
const PROFILE_KEY = "menujd.profile.v1";
let profile = PROFILES[localStorage.getItem(PROFILE_KEY)] || PROFILES.jd;
let ALL, byId, slotOf;
function rebuildIndex() {
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

  const t = totals(day.items);
  const left = type.kcal - t.k;
  const pLeft = profile.proteinTarget - t.p;
  $("#summary").innerHTML = `
    <div class="big"><strong>${r0(left)}</strong><span>${left >= 0 ? "kcal restantes" : "kcal por encima del objetivo"}</span></div>
    ${meter("Calorías", t.k, type.kcal, "kcal")}
    ${meter("Proteína", t.p, profile.proteinTarget, "g")}
    <div class="chips">
      <span class="chip">C ${r0(t.c)} g</span><span class="chip">G ${r0(t.f)} g</span>
      ${pLeft > 0 ? `<span class="chip">Faltan ${r0(pLeft)} g de proteína</span>` : `<span class="chip">Proteína cubierta</span>`}
      ${left < -60 ? `<span class="chip warn">Te has pasado ${r0(-left)} kcal</span>` : ""}
    </div>`;

  $("#slots").innerHTML = profile.slots.map((s) => {
    const items = day.items.map((x, idx) => ({ ...x, idx })).filter((x) => x.slot === s.id);
    const hint = s.id === "S" && type.mods ? `${s.hint} · ${type.mods} en este tipo de día` : s.hint;
    return `<div class="slot">
      <div class="slot-head"><h3>${s.label}<small>${hint}</small></h3>
        <button class="add-btn" data-add="${s.id}">+ Añadir</button></div>
      ${items.length ? items.map((x) => `
        <div class="entry"><div class="name"><b>${esc(x.n)}</b><span>${x.ref ? x.ref + " · " : ""}P ${r1(x.p)} · C ${r0(x.c || 0)} · G ${r0(x.f || 0)}</span></div>
          <span class="kc">${r0(x.k)}</span>
          <button class="del" data-del="${x.idx}" aria-label="Quitar ${esc(x.n)}">✕</button></div>`).join("")
      : `<p class="empty">Nada registrado.</p>`}
    </div>`;
  }).join("");
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
    <form class="custom" id="customForm">
      <b>Otra cosa</b>
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
    </div>`;
}
function closeSheet() { $("#sheet").hidden = true; $("#sheetBg").hidden = true; }

/* ---------- MENÚ ---------- */
function cardHTML(o, addable = true) {
  return `<article class="card"><h3><span class="code">${o.id}</span>${o.n}</h3>
    <ul>${o.i.map((x) => `<li>${x}</li>`).join("")}</ul>
    ${o.t ? `<p class="tip">${o.t}</p>` : ""}
    <div class="macros"><span><b>${o.k}</b> kcal</span><span>P <b>${r0(o.p)}</b></span><span>C ${r0(o.c)}</span><span>G ${r0(o.f)}</span>
    ${addable ? `<button class="add-btn" data-quick="${o.id}">+ Hoy</button>` : ""}</div></article>`;
}
let avgS = {};
function renderMenu() {
  $("#menuLead").textContent = profile.builder
    ? "Cualquier combinación de desayuno, comida y cena da aproximadamente lo mismo. Los snacks ajustan al objetivo del día."
    : "Plan de referencia: cada tarjeta es uno de los platos de tu plan, con sus kcal, proteína, carbohidratos y grasa.";
  $("#menuList").innerHTML = profile.slots.map((s) => `
    <section class="group"><h2>${s.label}s<small>${s.hint}</small></h2>
    <div class="cards">${profile.menu[s.id].map((o) => cardHTML(o)).join("")}</div></section>`).join("");

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

/* ---------- RECETAS ---------- */
function renderRecetas() {
  $("#recipeList").innerHTML = profile.recipes.map((x) => `<article class="card"><h3><span class="code">${x.tag}</span>${x.n}</h3>
    <ul>${x.i.map((i) => `<li>${i}</li>`).join("")}</ul><ol>${x.s.map((i) => `<li>${i}</li>`).join("")}</ol>
    <div class="macros"><span>${x.m}</span></div></article>`).join("");
  $("#notes").innerHTML = profile.notes.map((n) => `<li>${n}</li>`).join("");
  $("#gcalSection").hidden = !profile.calendar;
}

/* ---------- navegación y eventos ---------- */
function show(view) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + view));
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "hoy") renderHoy();
  window.scrollTo(0, 0);
}
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2000); }

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
  renderProfileSelect();
  renderMenu(); renderRecetas();
  show("hoy");
}
$("#profileSelect").addEventListener("change", (e) => switchProfile(e.target.value));

document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.view) show(b.dataset.view);
  else if (b.dataset.add) openSheet(b.dataset.add);
  else if (b.dataset.del !== undefined) { const day = getDay(iso(current)); day.items.splice(+b.dataset.del, 1); saveAll(db); renderHoy(); }
  else if (b.id === "portionBack") { showSheetList(); }
  else if (b.dataset.portion) {
    const o = byId(b.dataset.dish);
    const mult = parseFloat(b.dataset.portion);
    const pt = PORTIONS.find((p) => p.mult === mult);
    const suffix = mult === 1 ? "" : ` · ración ${pt.label}`;
    pushRecent(sheetState.slot, o.id);
    addItem(sheetState.slot, { ref: o.id, n: o.n + suffix, k: r0(o.k * mult), p: r1(o.p * mult), c: r1(o.c * mult), f: r1(o.f * mult) });
    closeSheet(); toast("Añadido: " + o.n + suffix);
  }
  else if (b.dataset.pick) { openPortionStep(b.dataset.pick); }
  else if (b.dataset.quick) { const o = byId(b.dataset.quick); current = new Date(); current.setHours(12, 0, 0, 0); pushRecent(slotOf(o.id), o.id); addItem(slotOf(o.id), { ref: o.id, n: o.n, k: o.k, p: o.p, c: o.c, f: o.f }); toast("Añadido a hoy: " + o.n); }
});
$("#sheetClose").addEventListener("click", closeSheet);
$("#sheetBg").addEventListener("click", closeSheet);
$("#sheetBody").addEventListener("submit", (e) => {
  e.preventDefault();
  const num = (id) => parseFloat($(id).value.replace(",", ".")) || 0;
  addItem($("#sheetBody").dataset.slot, { n: $("#cName").value.trim(), k: num("#cK"), p: num("#cP"), c: num("#cC"), f: num("#cF") });
  closeSheet(); toast("Añadido");
});
$("#prevDay").addEventListener("click", () => { current.setDate(current.getDate() - 1); renderHoy(); });
$("#nextDay").addEventListener("click", () => { current.setDate(current.getDate() + 1); renderHoy(); });
$("#dayType").addEventListener("change", (e) => { getDay(iso(current)).type = e.target.value; saveAll(db); renderHoy(); });
["#bD", "#bC", "#bN", "#bT"].forEach((id) => $(id).addEventListener("change", updBuilder));
$("#bApply").addEventListener("click", () => {
  if (!profile.builder) return;
  current = new Date(); current.setHours(12, 0, 0, 0);
  const day = getDay(iso(current));
  day.type = $("#bT").value;
  ["#bD", "#bC", "#bN"].forEach((id) => { const o = byId($(id).value); day.items.push({ slot: slotOf(o.id), ref: o.id, n: o.n, k: o.k, p: o.p, c: o.c, f: o.f }); });
  saveAll(db); show("hoy"); toast("Plan añadido a hoy");
});

/* copia de seguridad */
$("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `menujd-registro-${profile.id}-${iso(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  $("#backupMsg").textContent = "Registro exportado.";
});
$("#importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (typeof data !== "object" || Array.isArray(data)) throw new Error();
    db = { ...db, ...data }; saveAll(db);
    $("#backupMsg").textContent = `Importados ${Object.keys(data).length} días.`;
  } catch { $("#backupMsg").textContent = "Ese archivo no es una copia válida del registro."; }
  e.target.value = "";
});

/* ---------- Google Calendar (opcional, bajo demanda, solo perfiles con calendar.enabled) ---------- */
function gcalCfgKey() { return `menujd.gcal.cfg.${profile.id}.v1`; }
function gcalTokKey() { return `menujd.gcal.tok.${profile.id}.v1`; }
function gcalCfg() { try { return JSON.parse(localStorage.getItem(gcalCfgKey())) || {}; } catch { return {}; } }
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
  clearGcalToken(); gcalTokenClient = null;
  $("#gcalMsg").textContent = "Ajustes guardados.";
});
$("#gcalDisconnect").addEventListener("click", () => {
  clearGcalToken(); gcalTokenClient = null;
  $("#gcalMsg").textContent = "Desconectado.";
});

/* arranque */
renderProfileSelect();
initGcalSettings();
renderMenu(); renderRecetas(); renderHoy();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
