/*
 * Найт-Сити · интерактивная карта (Foundry VTT v12, система любая — сделано под Cyberpunk RED).
 * Карта с точками интереса, районами и опасными зонами, прокладка маршрутов, квесты от фиксеров,
 * метка «Мы здесь» и показ карты игрокам. Состояние (квесты, правки точек, метка, общий маршрут)
 * хранится в настройке мира и сразу расходится всем клиентам.
 */
import { MAP_SIZE, POIS, DISTRICTS, ZONES, STREETS } from "./data.js";
import { CATALOG, SHOP_TYPES, TIERS, stockFor, MARKET_CATS, MARKET_NAMES, marketStock } from "./shops.js";
import { rollEncounter, threatOf, THREAT_RU, rollGig, FIXERS } from "./encounters.js";
import { MOOKS, MOOK_PACK } from "./mooks.js";
import { SCID, SC_NAME, scName, NC_HOLIDAYS, buildCalendar } from "./calendar.js";
import { T, isRu, freezeLang } from "./i18n.js";

const MID = "night-city-map";
const SOCKET = `module.${MID}`;
const ROOT = "ncm";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isGM = () => !!game.user?.isGM;
const rid = () => foundry.utils.randomID(10);
const clone = (o) => foundry.utils.deepClone(o);

const CATS = {
  culture: { ru: "Культура и искусство", color: "#ff7a2f", icon: "fa-palette" },
  club: { ru: "Клубы и ночная жизнь", color: "#3d5bff", icon: "fa-music" },
  arts: { ru: "Шоу и спорт", color: "#c040e0", icon: "fa-film" },
  public: { ru: "Городские службы", color: "#b0552a", icon: "fa-building-columns" },
  corp: { ru: "Корпорации", color: "#2fbf4a", icon: "fa-building" },
  food: { ru: "Отели, бары, еда", color: "#20c4c0", icon: "fa-martini-glass" },
  other: { ru: "Прочее", color: "#e0303a", icon: "fa-star" },
  shop: { ru: "Магазины", color: "#ff5fd2", icon: "fa-cart-shopping" },
  market: { ru: "Ночные рынки", color: "#9b6bff", icon: "fa-moon" },
  custom: { ru: "Метки мастера", color: "#f5e663", icon: "fa-location-dot" }
};
const DANGER = ["Вода", "Корпоративная", "Умеренная", "Переполненные пригороды", "Боевая зона", "Зона Поражения"];
const TRANSPORT = [
  { id: "foot", ru: "Пешком", kmh: 5, icon: "fa-person-walking" },
  { id: "bike", ru: "Мотоцикл", kmh: 45, icon: "fa-motorcycle" },
  { id: "car", ru: "Машина", kmh: 35, icon: "fa-car" },
  { id: "av", ru: "AV / ави", kmh: 160, icon: "fa-helicopter" }
];
const QSTATUS = { hidden: "Скрыт", offer: "Слух / предложение", active: "Активен", done: "Выполнен", failed: "Провален" };

/* ================================================================ настройки и состояние */

const DEFAULT_STATE = { quests: [], pins: [], poi: {}, party: null, route: null, visited: [], shops: [], markets: [], night: false, clock: 0, players: {}, messages: [], contacts: [], encounters: [], encMode: "mix", roads: [] };

Hooks.once("init", () => {
  game.settings.register(MID, "lang", {
    name: "NCM.Settings.LangName", hint: "NCM.Settings.LangHint", scope: "client", config: true, type: String, default: "auto",
    choices: { auto: "NCM.Settings.LangAuto", ru: "Русский", en: "English" }, requiresReload: true
  });
  game.settings.register(MID, "state", { scope: "world", config: false, type: Object, default: DEFAULT_STATE, onChange: () => { UI.refresh(); Agent.onState(); } });
  game.settings.register(MID, "image", {
    name: "NCM.Settings.ImageName", hint: "NCM.Settings.ImageHint",
    scope: "world", config: true, type: String, filePicker: "image", default: `modules/${MID}/assets/night-city-2045.webp`, onChange: () => UI.rebuild()
  });
  game.settings.register(MID, "widthKm", {
    name: "NCM.Settings.WidthName", hint: "NCM.Settings.WidthHint", scope: "world", config: true, type: Number, default: 14, range: { min: 4, max: 60, step: 1 }
  });
  game.settings.register(MID, "redtime", {
    name: "NCM.Settings.ScanName", hint: "NCM.Settings.ScanHint",
    scope: "client", config: true, type: String, default: "full", choices: { full: "NCM.Settings.ScanFull", soft: "NCM.Settings.ScanSoft", off: "NCM.Settings.ScanOff" }, onChange: () => UI.rebuild()
  });
  game.settings.register(MID, "scSync", {
    name: "NCM.Settings.ScName", hint: "NCM.Settings.ScHint",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => onTime(true)
  });
  game.settings.register(MID, "agentAuto", {
    name: "NCM.Settings.AgentName", hint: "NCM.Settings.AgentHint",
    scope: "client", config: true, type: Boolean, default: true
  });
  game.settings.register(MID, "agentOn", {
    name: "NCM.Settings.AgentOnName", hint: "NCM.Settings.AgentOnHint",
    scope: "world", config: true, type: Boolean, default: true, requiresReload: true
  });
  game.settings.register(MID, "shopBuy", {
    name: "NCM.Settings.BuyName", hint: "NCM.Settings.BuyHint", scope: "world", config: true, type: String, default: "gm",
    choices: { gm: "NCM.Settings.BuyGm", auto: "NCM.Settings.BuyAuto", off: "NCM.Settings.BuyOff" }
  });
  game.settings.register(MID, "roadsImage", {
    name: "NCM.Settings.RoadsName", hint: "NCM.Settings.RoadsHint", scope: "world", config: true, type: String, filePicker: "image", default: "", requiresReload: true
  });
  game.settings.register(MID, "callSound", {
    name: "NCM.Settings.CallName", hint: "NCM.Settings.CallHint", scope: "world", config: true, type: String, filePicker: "audio", default: ""
  });
  game.settings.register(MID, "autoPlaced", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(MID, "scAsked", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(MID, "notify", { name: "NCM.Settings.NotifyName", scope: "world", config: true, type: Boolean, default: true });
  game.keybindings.register(MID, "agent", { name: "NCM.Keys.Agent", editable: [{ key: "KeyA", modifiers: ["Shift"] }], onDown: () => { if (!agentOn()) return false; Agent.toggle(); return true; } });
  game.keybindings.register(MID, "open", {
    name: "NCM.Keys.Open", editable: [{ key: "KeyM", modifiers: ["Shift"] }],
    onDown: () => { UI.toggle(); return true; }
  });
});

const agentOn = () => { try { return game.settings.get(MID, "agentOn") !== false; } catch (e) { return true; } };
const state = () => foundry.utils.mergeObject(clone(DEFAULT_STATE), clone(game.settings.get(MID, "state") ?? {}), { inplace: false });
async function save(mut) {
  if (!isGM()) return ui.notifications.warn(T("Карта: изменять может только мастер."));
  const s = state();
  if (scLinked()) s.clock = nowMin(s);
  mut(s);
  await game.settings.set(MID, "state", s);
}

/* ================================================================ время */

const T0 = Date.UTC(2045, 6, 14, 20, 0); // старт часов: пт 14.07.2045, 20:00
const DOW = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
/* Simple Calendar: если календарь «Найт-Сити 2045» активен, часы карты = мировое время Foundry. */
const scApi = () => game.modules.get(SCID)?.active ? globalThis.SimpleCalendar?.api ?? null : null;
function scLinked() {
  const a = scApi();
  try { return !!a && game.settings.get(MID, "scSync") && [SC_NAME, scName()].includes(a.getCurrentCalendar?.()?.name); } catch (e) { return false; }
}
/** Текущее время карты в минутах от T0. */
function nowMin(s) {
  if (scLinked()) {
    const d = scApi().timestampToDate(game.time.worldTime);
    if (d && Number.isFinite(d.year)) return Math.floor((Date.UTC(d.year, d.month, d.day + 1, d.hour, d.minute) - T0) / 60000);
  }
  return (s ?? state()).clock ?? 0;
}
/** Сдвинуть время на min минут (мастер). С календарём — через мировое время, без него — часы карты. */
async function advanceTime(min) {
  min = Math.round(min); if (!min || !isGM()) return;
  if (scLinked()) return game.time.advance(min * 60);
  await save(s => { s.clock = (s.clock ?? 0) + min; });
  game.time?.advance?.(min * 60);
}
/** Поставить время карты на дату (мс UTC). */
async function setTimeMs(ms) {
  if (!isGM()) return;
  if (scLinked()) {
    const d = new Date(ms), a = scApi();
    const ts = a.dateToTimestamp({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() - 1, hour: d.getUTCHours(), minute: d.getUTCMinutes(), seconds: 0 });
    return game.time.advance(ts - game.time.worldTime);
  }
  return save(s => { s.clock = Math.round((ms - T0) / 60000); });
}
/** Настроить Simple Calendar под Найт-Сити и выставить дату по часам карты. */
/** Дата мира в Simple Calendar сейчас (мс UTC) или null. */
function scWorldMs() {
  try {
    const d = scApi()?.timestampToDate(game.time.worldTime);
    if (!d || !Number.isFinite(d.year)) return null;
    return Date.UTC(d.year, d.month, d.day + 1, d.hour ?? 0, d.minute ?? 0);
  } catch (e) { return null; }
}
/** source: "world" — главное время мира (Simple Calendar), карта подстраивается; "map" — мир берёт время с часов карты. */
async function setupCalendar({ holidays = true, source = "world" } = {}) {
  const a = scApi();
  if (!a) return ui.notifications.warn(T("Simple Calendar не включён в этом мире."));
  if (!isGM()) return;
  const base = await fetch(`modules/${SCID}/predefined-calendars/gregorian.json`).then(r => r.json()).catch(() => null);
  if (!base?.calendar) return ui.notifications.error(T("Не нашёл gregorian.json в Simple Calendar — обнови модуль."));
  const ms = (source === "world" ? scWorldMs() : null) ?? T0 + (state().clock ?? 0) * 60000;
  const ok = await a.configureCalendar(buildCalendar(base.calendar, new Date(ms)));
  if (!ok) return ui.notifications.error(T("Simple Calendar не принял настройки."));
  await new Promise(r => setTimeout(r, 300));
  await setTimeMs(ms);
  if (holidays && a.addNote) {
    const have = new Set((a.getNotes?.() ?? []).map(n => n.name));
    for (const h of NC_HOLIDAYS) {
      if (have.has(T(h.title))) continue;
      const day = { year: 2045, month: h.m - 1, day: h.d - 1, hour: 0, minute: 0, seconds: 0 };
      try { await a.addNote(T(h.title), `<p>${T(h.text)}</p>`, day, day, true, 3, [T("Праздник")]); } catch (e) { console.warn(MID, e); }
    }
  }
  await game.settings.set(MID, "scAsked", true);
  onTime(true);
  ui.notifications.info(`Simple Calendar: ${T("«")}${scName()}${T("»")}, ${fmtClock().day} ${fmtClock().time}.`);
}
/** Спросить, чьё время главное, и настроить календарь. */
async function scDialog({ first = false } = {}) {
  const wm = scWorldMs(), z = (n) => String(n).padStart(2, "0");
  const fmt = (ms) => { const d = new Date(ms); return `${z(d.getUTCDate())}.${z(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`; };
  const data = await formDialog(T("Карта Найт-Сити · Simple Calendar"), `<form class="ncm-form">
    <p>${first ? T("Найден Simple Calendar. Настроить его под Найт-Сити?") : T("Настроить Simple Calendar под Найт-Сити?")}</p>
    <p>${T("Календарь «")}${scName()}${T("»: григорианские месяцы и дни недели, праздники года. Часы карты потом идут по времени мира.")}</p>
    <label>${T("Какое время оставить")}<select name="source">
      <option value="world">${T("Время мира — карта подстроится")}${wm ? ` (${fmt(wm)})` : ""}</option>
      <option value="map">${T("Время карты — мир перейдёт на него")} (${fmtClock().day} ${fmtClock().time})</option></select></label></form>`);
  if (!data) { if (first) await game.settings.set(MID, "scAsked", true); return; }
  return setupCalendar({ source: data.source });
}
let lastMin = null, lastNight = null;
/** Время изменилось — обновить часы, ночь и телефон. */
function onTime(force = false) {
  const m = nowMin(), n = isNight();
  if (!force && m === lastMin) return;
  const flip = n !== lastNight; lastMin = m; lastNight = n;
  if (UI.el) { if (flip || force) UI.refresh(); else UI.renderClock(); }
  if (Agent.el && Agent.tab === "me") Agent.render();
}
Hooks.on("updateWorldTime", () => onTime());
Hooks.on("simple-calendar-date-time-change", () => onTime());
Hooks.on("simple-calendar-ready", () => onTime(true));

function clockDate(min = nowMin()) { return new Date(T0 + min * 60000); }
function fmtClock(min = nowMin()) {
  const d = clockDate(min), z = (n) => String(n).padStart(2, "0");
  return { day: `${DOW[d.getUTCDay()]} ${z(d.getUTCDate())}.${z(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`, time: `${z(d.getUTCHours())}:${z(d.getUTCMinutes())}` };
}
const isNight = (s = state()) => { const h = clockDate(nowMin(s)).getUTCHours(); return s.night || h >= 21 || h < 6; };
/** Репутация персонажа игрока (Cyberpunk RED: system.reputation.value). */
const repOf = (u) => Number(u?.character?.system?.reputation?.value ?? 0) || 0;
const fmtMin = (m) => m < 60 ? `${Math.round(m)} ${T("мин")}` : `${Math.floor(m / 60)} ${T("ч")}${Math.round(m % 60) ? ` ${Math.round(m % 60)} ${T("мин")}` : ""}`;

/* ================================================================ запросы игроков через мастера */

/** Игроки не пишут настройки мира — их действия выполняет активный мастер. */
async function act(op, data = {}) {
  if (isGM()) return applyOp(op, data, game.user);
  if (!game.users.activeGM) return ui.notifications.warn(T("Карта: нужен мастер в игре, чтобы сохранить это."));
  emit({ action: "op", op, data, user: game.user.id });
}
async function applyOp(op, d, user) {
  const name = user?.character?.name ?? user?.name ?? T("Игрок");
  switch (op) {
    case "party": return save(s => { s.party = { x: d.x, y: d.y }; });
    case "me": return save(s => { s.players[user.id] = { x: d.x, y: d.y }; });
    case "me-clear": return save(s => { delete s.players[user.id]; });
    case "party-clear": return save(s => { s.party = null; });
    case "msg-del": {
      const ids = new Set(d.ids ?? []);
      return save(s => { s.messages = s.messages.filter(m => !ids.has(m.id) || !(user?.isGM || m.fromUser === user?.id)); });
    }
    case "buy": return gmApproveBuy(d, user);
    case "travel": {
      await advanceTime(d.min);
      await save(s => { if (d.who === "party") s.party = { x: d.x, y: d.y }; else s.players[d.who] = { x: d.x, y: d.y }; });
      return chatTravel(d, name);
    }
    case "take": return save(s => { const q = s.quests.find(x => x.id === d.id); if (q && q.status === "offer") { q.status = "active"; q.takenBy = name; } })
      .then(() => ChatMessage.create({ speaker: { alias: T("Агент") }, content: `<div class="ncm-chat"><div class="ncm-chat-k">${T("ЗАКАЗ ПРИНЯТ")}</div><b>${esc(name)}</b> ${T("берёт заказ «")}${esc(state().quests.find(x => x.id === d.id)?.title ?? "")}${T("»")}</div>` }));
    case "msg": return save(s => { s.messages.push({ id: rid(), to: d.to ?? "gm", from: d.from ?? name, fromUser: user?.id, text: String(d.text ?? "").slice(0, 2000), t: nowMin(s), ts: Date.now(), ...(d.call ? { call: true } : {}) }); if (s.messages.length > 300) s.messages = s.messages.slice(-300); });
  }
}
function chatTravel(d, name) {
  ChatMessage.create({ speaker: { alias: T("Найт-Сити") }, content: `<div class="ncm-chat"><div class="ncm-chat-k">${T("В ПУТИ ·")} ${esc(d.mode ?? "")}</div><b>${esc(d.who === "party" ? T("Группа") : name)}</b> → ${esc(d.to ?? "")}<br>${fmtMin(d.min)} · ${(d.km ?? 0).toFixed(1)} ${T("км · теперь")} ${fmtClock().time}</div>` });
}

/* ================================================================ данные */

/** Все точки: базовые + метки мастера, с учётом правок мастера. Скрытые — только мастеру. */
function allPois() {
  const s = state();
  const base = POIS.map(p => ({ ...p, ...(s.poi[p.id] ?? {}) })).filter(p => !p.removed);
  const pins = s.pins.map(p => ({ cat: "custom", ...p }));
  const shops = (s.shops ?? []).map(sh => ({ ...sh, cat: "shop", desc: SHOP_TYPES[sh.type]?.ru ?? T("Магазин"), shop: true }));
  const markets = (s.markets ?? []).map(m => ({ ...m, cat: "market", desc: T("Ночной рынок"), market: true }));
  return [...base, ...pins, ...shops, ...markets].filter(p => isGM() || !p.hidden);
}
const poiById = (id) => allPois().find(p => p.id === id);
const questsVisible = () => state().quests.filter(q => isGM() || q.status !== "hidden");

/** Ближайшая улица (из Cyberpunk 2077) к точке — для адреса места. */
function streetNear(x, y) {
  let best = null, bd = Infinity;
  for (const s of STREETS) {
    if (s.hw) continue;
    const [ax, ay] = s.a, [bx, by] = s.b, vx = bx - ax, vy = (by - ay) * aspect;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * aspect * vy) / (vx * vx + vy * vy || 1)));
    const d = Math.hypot(x - (ax + vx * t), (y - ay) * aspect - vy * t);
    if (d < bd) { bd = d; best = s; }
  }
  return bd < 0.06 ? best : null;
}

function districtAt(x, y) {
  let best = null, bd = Infinity;
  for (const d of DISTRICTS) { if (d.id === "delbay" || d.id === "sanbay") continue; const dd = (d.x - x) ** 2 + (d.y - y) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function inPoly(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
const aspect = MAP_SIZE.h / MAP_SIZE.w;
const inCircle = (x, y, c) => Math.hypot(x - c.x, (y - c.y) * aspect) < c.r;
function zoneAt(x, y) {
  if (inCircle(x, y, ZONES.hot)) return "hot";
  if (inPoly(x, y, ZONES.combat) && !inCircle(x, y, ZONES.glen)) return "combat";
  return null;
}

/* ================================================================ маршрут */

/** Сетка проходимости (assets/roads.png): 255 — улица, 128 — суша, 0 — вода. */
const GRID = { w: 0, h: 0, cell: null, base: null, ready: null, key: "" };
const ROAD_VAL = { road: 1, land: 2, water: 0 };
/** Правки мастера поверх сетки: мазки кистью «улица / суша / вода». */
function applyRoadEdits(force = false) {
  if (!GRID.base) return;
  const strokes = state().roads ?? [], key = JSON.stringify(strokes).length + ":" + strokes.length;
  if (!force && key === GRID.key) return false;
  GRID.key = key; GRID.cell = GRID.base.slice();
  const { w, h, cell } = GRID;
  for (const st of strokes) {
    const v = ROAD_VAL[st.t] ?? 1, r = Math.max(0.5, (st.w ?? 0.004) * w / 2), pts = st.p ?? [];
    const dab = (fx, fy) => {
      const cx = fx * (w - 1), cy = fy * (h - 1);
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if (x >= 0 && y >= 0 && x < w && y < h && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) cell[y * w + x] = v;
    };
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[i + 1] ?? a, n = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * w, (b[1] - a[1]) * h) / Math.max(1, r / 2)));
      for (let k = 0; k <= n; k++) dab(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n);
    }
  }
  return true;
}
const roadsSrc = () => { try { return game.settings.get(MID, "roadsImage") || `modules/${MID}/assets/roads.png`; } catch (e) { return `modules/${MID}/assets/roads.png`; } };
/** Сетка улиц: картинка → массив клеток. Устойчиво к хостингам, где файлы модулей отдаются с другого домена (The Forge, S3, CDN):
 *  сначала картинка с crossOrigin, если холст «испачкан» — тот же файл через fetch → blob (тот же источник). Ошибка — честный false, а не вечное ожидание. */
function gridFromImage(img) {
  const c = document.createElement("canvas"); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data; // бросает SecurityError на «чужой» картинке
  GRID.w = c.width; GRID.h = c.height; GRID.cell = new Uint8Array(c.width * c.height);
  for (let i = 0; i < GRID.cell.length; i++) { const v = d[i * 4]; GRID.cell[i] = v > 200 ? 1 : v > 60 ? 2 : 0; }
  GRID.base = GRID.cell.slice(); applyRoadEdits(true);
  return true;
}
const loadImg = (src, cors) => new Promise((res, rej) => {
  const img = new Image(); if (cors) img.crossOrigin = "anonymous";
  const t = setTimeout(() => rej(new Error("timeout")), 15000);
  img.onload = () => { clearTimeout(t); res(img); }; img.onerror = () => { clearTimeout(t); rej(new Error("load " + src)); };
  img.src = src;
});
function loadGrid() {
  GRID.ready ??= (async () => {
    const src = roadsSrc();
    for (const step of [() => loadImg(src, true), async () => { const r = await fetch(src); if (!r.ok) throw new Error(r.status); return loadImg(URL.createObjectURL(await r.blob()), false); }, () => loadImg(src, false)]) {
      try { if (gridFromImage(await step())) return true; } catch (e) { console.warn(`${MID} | road grid:`, e?.message ?? e); }
    }
    ui.notifications?.warn(T("Карта: не удалось прочитать сетку улиц. Маршруты пойдут по прямой, магазины встанут без привязки к улицам."));
    return false;
  })();
  return GRID.ready;
}
const COST = [Infinity, 1, 7]; // вода / улица / дворы и пустыри

/** A* по сетке: путь от a до b (доли 0..1) → массив точек (доли). */
function findPath(a, b) {
  const { w, h, cell } = GRID;
  if (!cell) return [a, b];
  const idx = (x, y) => y * w + x;
  const snap = (p) => {
    const x = Math.round(p.x * (w - 1)), y = Math.round(p.y * (h - 1));
    if (cell[idx(x, y)] === 1) return idx(x, y);
    for (let r = 1; r < 25; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && cell[idx(nx, ny)] === 1) return idx(nx, ny);
    }
    return cell[idx(x, y)] ? idx(x, y) : -1;
  };
  const s = snap(a), t = snap(b);
  if (s < 0 || t < 0) return [a, b];
  const tx = t % w, ty = (t / w) | 0;
  const g = new Float32Array(w * h).fill(Infinity), from = new Int32Array(w * h).fill(-1), closed = new Uint8Array(w * h);
  const heap = [];
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  g[s] = 0; push(0, s);
  let found = false, guard = 0;
  while (heap.length && guard++ < 800000) {
    const [, i] = pop();
    if (closed[i]) continue; closed[i] = 1;
    if (i === t) { found = true; break; }
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy, dc] of D) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = idx(nx, ny), c = COST[cell[j]]; if (c === Infinity || closed[j]) continue;
      const ng = g[i] + dc * c;
      if (ng < g[j]) { g[j] = ng; from[j] = i; push(ng + Math.hypot(tx - nx, ty - ny), j); }
    }
  }
  if (!found) return [a, b];
  const raw = []; for (let i = t; i >= 0; i = from[i]) raw.push({ x: (i % w) / (w - 1), y: ((i / w) | 0) / (h - 1) });
  raw.reverse();
  return [a, ...simplify(raw, 0.8 / w), b];
}
/** Упрощение ломаной (Рамер — Дуглас — Пекер). */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts.at(-1);
  let md = 0, mi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1e-9;
    const d = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / L;
    if (d > md) { md = d; mi = i; }
  }
  return md > eps ? [...simplify(pts.slice(0, mi + 1), eps).slice(0, -1), ...simplify(pts.slice(mi), eps)] : [a, b];
}
/** Полный путь по путевым точкам. */
function buildPath(wps) {
  if (wps.length < 2) return wps.slice();
  const out = [wps[0]];
  for (let i = 1; i < wps.length; i++) out.push(...findPath(wps[i - 1], wps[i]).slice(1));
  return out;
}

function routeStats(pts, streets = false) {
  const km = game.settings.get(MID, "widthKm");
  let dist = 0, combat = 0, hot = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, (b.y - a.y) * aspect) * km;
    dist += seg;
    for (let t = 0; t <= 1; t += 0.05) {
      const z = zoneAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      if (z === "combat") combat += seg * 0.05; else if (z === "hot") hot += seg * 0.05;
    }
  }
  // по улицам дорога длиннее прямой — коэффициент извилистости
  const road = streets ? dist : dist * 1.3;
  return { dist, road, combat, hot };
}
const fmtTime = (h) => h < 1 / 60 ? T("<1 мин") : h < 1 ? `${Math.round(h * 60)} ${T("мин")}` : `${Math.floor(h)} ${T("ч")} ${Math.round((h % 1) * 60)} ${T("мин")}`;

/* ================================================================ интерфейс */

/** clip-path, вырезающий из блока box прямоугольник r (экран телефона). */
function clipTo(r, box) {
  const t = Math.max(0, r.top - box.top), l = Math.max(0, r.left - box.left);
  const rt = Math.max(0, box.right - r.right), bt = Math.max(0, box.bottom - r.bottom);
  return `inset(${t}px ${rt}px ${bt}px ${l}px round 24px)`;
}

const UI = {
  el: null, view: { x: 0, y: 0, s: 0.5 }, sel: null, mode: "browse", route: [], filter: new Set(Object.keys(CATS)), query: "", tab: "info",
  drag: null, streets: true, path: [],

  toggle() { this.el ? this.close() : this.open(); },
  open(focus = null) {
    if (!this.el) {
      // Телефон «Агента» на экране — переворачиваем его и раскрываем карту из экрана телефона
      if (Agent.el && !Agent.docked && !Agent.busy) {
        return Agent.flip().then((r) => { this.build(r); if (focus) this.focus(focus.x, focus.y, focus.s); });
      }
      this.build();
    }
    if (focus) this.focus(focus.x, focus.y, focus.s);
    return Promise.resolve();
  },
  close() {
    if (!this.el) return;
    const el = this.el; this.el = null;
    if (Agent.el && Agent.docked) {
      // Обратно в телефон: карта сжимается в его экран, телефон поворачивается вертикально
      const r = Agent.el.getBoundingClientRect(), b = el.getBoundingClientRect();
      el.classList.add("ncm-zoom");
      el.style.clipPath = "inset(0 0 0 0 round 0px)";
      void el.offsetWidth;
      el.style.clipPath = clipTo(r, b);
      setTimeout(() => { el.remove(); Agent.unflip(); }, 480);
      return;
    }
    el.classList.remove("ncm-in");
    setTimeout(() => el.remove(), 250);
  },
  rebuild() { if (this.el) { this.el.remove(); this.el = null; this.build(); } },
  refresh() {
    if (applyRoadEdits() && this.el) { this.path = []; if (this.route.length > 1) this.recalc(); this.renderRoads(); }
    if (this.el) { this.renderMarkers(); this.renderSvg(); this.renderPanel(); this.renderQuestList(); }
  },
  /** Сетка дорог поверх карты (только в режиме «Дороги»). */
  renderRoads() {
    const cv = this.el?.querySelector(".ncm-roads"); if (!cv) return;
    const on = this.mode === "roads" && !!GRID.cell; cv.hidden = !on; if (!on) return;
    const { w, h, cell } = GRID; cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), d = img.data;
    for (let i = 0; i < cell.length; i++) {
      const c = cell[i] === 1 ? [0, 240, 255, 95] : cell[i] === 0 ? [30, 70, 255, 120] : [0, 0, 0, 0];
      d.set(c, i * 4);
    }
    ctx.putImageData(img, 0, 0);
  },
  /** Предпросмотр мазка прямо на сетке, пока ведёшь мышью. */
  drawStroke() {
    const cv = this.el?.querySelector(".ncm-roads"), st = this.stroke; if (!cv || !st || cv.hidden) return;
    const ctx = cv.getContext("2d"), { w, h } = GRID;
    ctx.strokeStyle = st.t === "road" ? "rgba(0,240,255,.8)" : st.t === "water" ? "rgba(40,90,255,.7)" : "rgba(255,42,109,.7)";
    ctx.lineWidth = Math.max(1, st.w * w); ctx.lineCap = "round"; ctx.lineJoin = "round";
    const p = st.p, a = p.at(-2) ?? p.at(-1), b = p.at(-1);
    ctx.beginPath(); ctx.moveTo(a[0] * (w - 1), a[1] * (h - 1)); ctx.lineTo(b[0] * (w - 1), b[1] * (h - 1)); ctx.stroke();
  },
  renderRoadsPanel(panel) {
    const b = this.brush ??= { t: "road", w: 0.006 }, n = (state().roads ?? []).length;
    panel.classList.add("on");
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:#00f0ff">
        <span class="ncm-p-cat"><i class="fas fa-road"></i> ${T("Мастер")}</span>
        <h2>${T("Дороги")}</h2>
        <button class="ncm-p-x" data-act="mode-off"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body">
        ${GRID.cell ? "" : `<div class="ncm-warn hot"><i class="fas fa-triangle-exclamation"></i> ${T("Сетка улиц не загрузилась (см. консоль F12). Мазки сохраняются, но показать их не на чем.")}</div>`}
        <p class="ncm-muted">${T("Голубое — улицы, по ним идут маршруты. Синее — вода, через неё не пройти. Рисуй левой кнопкой, карту двигай правой.")}</p>
        <div class="ncm-seg">${[["road", T("Улица")], ["land", T("Стереть улицу")], ["water", T("Вода")]].map(([k, l]) => `<button data-act="brush" data-t="${k}" class="${b.t === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <label class="ncm-range">${T("Ширина кисти")}<input type="range" data-brushw min="0.002" max="0.03" step="0.001" value="${b.w}"></label>
        <p class="ncm-muted">${T("Своих мазков:")} ${n}</p>
        <div class="ncm-p-acts"><button data-act="roads-undo" ${n ? "" : "disabled"}><i class="fas fa-rotate-left"></i> ${T("Отменить мазок")}</button>
          <button class="danger" data-act="roads-clear" ${n ? "" : "disabled"}><i class="fas fa-trash"></i> ${T("Сбросить правки")}</button></div>
        <p class="ncm-muted">${T("Своя карта? Нарисуй сетку целиком (белое — улицы, серое — суша, чёрное — вода) и укажи файл в настройках модуля.")}</p>
      </div>`;
    panel.querySelector("[data-brushw]")?.addEventListener("input", (ev) => { this.brush.w = Number(ev.target.value); });
  },

  build(fromRect = null) {
    const el = document.createElement("div");
    el.id = ROOT;
    el.innerHTML = `
      <header class="ncm-top">
        <div class="ncm-brand"><span>NIGHT CITY</span><small>2045 · NET MAP</small></div>
        <label class="ncm-search"><i class="fas fa-magnifying-glass"></i><input type="search" placeholder="${T("Поиск: Посмертие, Арасака, Джиг-Джиг…")}"></label>
        <div class="ncm-modes">
          <button data-act="mode-route" title="${T("Проложить маршрут: кликайте точки на карте")}"><i class="fas fa-route"></i> ${T("Маршрут")}</button>
          <button data-act="quests" title="${T("Список заказов")}"><i class="fas fa-scroll"></i> ${T("Заказы")}</button>
          <button data-act="mode-party" title="${T("Поставить метку «Мы здесь» (вся группа)")}"><i class="fas fa-users"></i> ${T("Мы здесь")}</button>
          <button data-act="mode-me" title="${T("Поставить свою метку «Я здесь» — если группа разделилась")}"><i class="fas fa-user"></i> ${T("Я здесь")}</button>
          ${agentOn() ? `<button data-act="agent" title="${T("Агент: заказы и сообщения (Shift+A)")}"><i class="fas fa-mobile-screen"></i> ${T("Агент")}<span class="ncm-agent-badge" hidden></span></button>` : ""}
          ${isGM() ? `<button data-act="gen-gigs" title="${T("Разбросать случайные заказы по карте")}"><i class="fas fa-circle-question"></i> ${T("Заказы на карту")}</button>
          <button data-act="gen-shops" title="${T("Расставить случайные магазины по городу")}"><i class="fas fa-cart-shopping"></i> ${T("Магазины")}</button>
          <button data-act="gen-markets" title="${T("Расставить Ночные рынки: репутация и фиксер для входа")}"><i class="fas fa-moon"></i> ${T("Ночные рынки")}</button>
          <button data-act="mode-pin" title="${T("Добавить свою точку")}"><i class="fas fa-location-dot"></i> ${T("Точка")}</button>
          <button data-act="mode-roads" title="${T("Сетка дорог для маршрутов: показать и дорисовать")}"><i class="fas fa-road"></i> ${T("Дороги")}</button>
          <button data-act="places" title="${T("Места на карте: вернуть убранные, экспорт и импорт")}"><i class="fas fa-map-location-dot"></i> ${T("Места")}</button>
          <button data-act="share" title="${T("Открыть карту у всех игроков на этом месте")}"><i class="fas fa-satellite-dish"></i> ${T("Показать всем")}</button>` : ""}
        </div>
        <div class="ncm-clock" title="${T("Время в Найт-Сити")}"></div>
        <button class="ncm-x" data-act="close" title="${T("Закрыть (Esc)")}"><i class="fas fa-xmark"></i></button>
      </header>
      <nav class="ncm-cats">${Object.entries(CATS).map(([k, c]) => `<button data-cat="${k}" class="on" style="--c:${c.color}"><i class="fas ${c.icon}"></i>${c.ru}</button>`).join("")}</nav>
      <div class="ncm-viewport">
        <div class="ncm-world">
          <img class="ncm-img" src="${esc(mapImage())}" alt="" draggable="false">
          <div class="ncm-nightfx" aria-hidden="true"></div>
          <svg class="ncm-svg" viewBox="0 0 1000 ${Math.round(1000 * aspect)}" preserveAspectRatio="none"></svg>
          <div class="ncm-streets"></div>
          <canvas class="ncm-roads" hidden></canvas>
          <div class="ncm-labels"></div>
          <div class="ncm-markers"></div>
        </div>
        <div class="ncm-fx ncm-fx-${game.settings.get(MID, "redtime")}" aria-hidden="true"><div class="ncm-fx-line"></div></div>
        <div class="ncm-hint"></div>
        <div class="ncm-zoom"><button data-act="to-party" title="${T("К метке «Мы здесь»")}"><i class="fas fa-crosshairs"></i></button><button data-act="zin">+</button><button data-act="zout">−</button><button data-act="fit" title="${T("Вся карта")}"><i class="fas fa-expand"></i></button></div>
      </div>
      <aside class="ncm-panel"></aside>
      <aside class="ncm-quests"></aside>
      <div class="ncm-scan"></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.layout();
    this.world = el.querySelector(".ncm-world");
    this.vp = el.querySelector(".ncm-viewport");
    const img = el.querySelector(".ncm-img");
    const ready = () => { this.fit(); this.renderStreets(); this.renderLabels(); this.renderMarkers(); this.renderSvg(); };
    img.complete && img.naturalWidth ? ready() : img.addEventListener("load", ready, { once: true });
    img.addEventListener("error", () => ui.notifications.error(T("Карта Найт-Сити: не найден файл картинки. Укажите его в настройках модуля.")), { once: true });
    this.bind();
    this.renderPanel();
    this.renderQuestList();
    loadGrid();
    if (fromRect) {
      el.classList.add("ncm-zoom", "ncm-in");
      el.style.clipPath = clipTo(fromRect, el.getBoundingClientRect());
      void el.offsetWidth;
      requestAnimationFrame(() => { el.style.clipPath = "inset(0 0 0 0 round 0px)"; });
      setTimeout(() => { el.classList.remove("ncm-zoom"); el.style.clipPath = ""; }, 650);
    } else requestAnimationFrame(() => el.classList.add("ncm-in"));
  },

  /** Карта не перекрывает боковую панель Foundry (чат, журналы), а окна Foundry всегда поверх карты. */
  layout() {
    if (!this.el) return;
    const sb = document.getElementById("sidebar"), r = sb?.getBoundingClientRect();
    const right = r && r.width ? Math.max(0, window.innerWidth - r.left + 6) : 0;
    this.el.style.right = `${right}px`;
  },
  /* ------------------------------------------------ вид */
  size() { const img = this.el.querySelector(".ncm-img"); return { w: img.naturalWidth || MAP_SIZE.w, h: img.naturalHeight || MAP_SIZE.h }; },
  apply() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this._apply(); });
    this.el.classList.add("ncm-moving");
    clearTimeout(this._mv); this._mv = setTimeout(() => this.el?.classList.remove("ncm-moving"), 160);
  },
  _apply() {
    if (!this.el) return;
    const { x, y, s } = this.view;
    this.world.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    if (this._lastS !== s) { this._lastS = s; this.world.style.setProperty("--inv", 1 / s); }
    this.el.classList.toggle("ncm-far", s < 0.42);
    this.el.classList.toggle("ncm-near", s >= 0.62);
    this.el.classList.toggle("ncm-close", s >= 1.6);
  },
  fit() {
    const { w, h } = this.size(); const r = this.vp.getBoundingClientRect();
    const s = Math.min(r.width / w, r.height / h) * 0.98;
    this.world.style.width = `${w}px`; this.world.style.height = `${h}px`;
    this.view = { s, x: (r.width - w * s) / 2, y: (r.height - h * s) / 2 };
    this.apply();
  },
  zoomAt(f, cx, cy) {
    const v = this.view, r = this.vp.getBoundingClientRect();
    const ns = Math.min(4, Math.max(0.15, v.s * f));
    const px = (cx ?? r.width / 2), py = (cy ?? r.height / 2);
    v.x = px - (px - v.x) * (ns / v.s); v.y = py - (py - v.y) * (ns / v.s); v.s = ns;
    this.apply();
  },
  /** Центрировать точку (доли 0..1). */
  focus(fx, fy, s = null) {
    if (!this.el) return;
    const { w, h } = this.size(), r = this.vp.getBoundingClientRect();
    if (s) this.view.s = s;
    this.view.x = r.width / 2 - fx * w * this.view.s;
    this.view.y = r.height / 2 - fy * h * this.view.s;
    this.world.classList.add("ncm-anim"); this.apply();
    setTimeout(() => this.world?.classList.remove("ncm-anim"), 450);
  },
  toFrac(ev) {
    const r = this.world.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
  },

  /* ------------------------------------------------ слои */
  renderStreets() {
    const { w, h } = this.size();
    this.el.querySelector(".ncm-streets").innerHTML = STREETS.map(s => {
      const ax = s.a[0] * w, ay = s.a[1] * h, bx = s.b[0] * w, by = s.b[1] * h;
      let ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
      if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      return `<div class="ncm-street${s.hw ? " hw" : ""}" title="${esc(s.en)}" style="left:${(ax + bx) / 2}px;top:${(ay + by) / 2}px;--a:${ang.toFixed(1)}deg">${esc(s.ru)}</div>`;
    }).join("");
  },
  renderLabels() {
    this.el.querySelector(".ncm-labels").innerHTML = DISTRICTS.map(d =>
      `<div class="ncm-dist d${d.danger}" data-dist="${d.id}" style="left:${d.x * 100}%;top:${d.y * 100}%">${esc(d.ru)}</div>`).join("");
  },
  renderMarkers() {
    const s = state(), q = this.query.toLowerCase();
    this.el.classList.toggle("ncm-night", isNight(s));
    this.renderClock();
    const qByPoi = {};
    for (const qu of questsVisible()) if (qu.status === "active" || (isGM() && qu.status === "hidden")) { if (qu.target) (qByPoi[qu.target] ??= []).push(qu); if (qu.giver) (qByPoi[qu.giver] ??= []).push(qu); }
    const html = allPois().filter(p => this.filter.has(p.cat)).map(p => {
      const c = p.shop ? { color: CATALOG[SHOP_TYPES[p.type]?.cats[0]]?.color ?? CATS.shop.color, icon: p.type === "night" ? "fa-moon" : p.type === "ripper" ? "fa-robot" : CATALOG[SHOP_TYPES[p.type]?.cats[0]]?.icon ?? "fa-cart-shopping" } : (CATS[p.cat] ?? CATS.custom);
      const hit = !q || `${p.name} ${p.en ?? ""} ${p.desc ?? ""} ${p.n ?? ""}`.toLowerCase().includes(q);
      const qs = qByPoi[p.id];
      return `<button class="ncm-pin${this.sel === p.id ? " sel" : ""}${hit ? "" : " dim"}${p.hidden ? " secret" : ""}${qs ? " has-q" : ""}${s.visited.includes(p.id) ? " visited" : ""}"
        data-poi="${p.id}" style="left:${p.x * 100}%;top:${p.y * 100}%;--c:${c.color}" title="${esc(p.name)}">
        <span class="ncm-dot${p.shop ? " shop" : p.market ? " market" : ""}">${p.n ?? `<i class="fas ${c.icon}"></i>`}</span>
        ${qs ? `<span class="ncm-qmark">!</span>` : ""}
        <span class="ncm-name">${esc(p.name)}</span></button>`;
    }).join("");
    const party = s.party ? `<div class="ncm-party" style="left:${s.party.x * 100}%;top:${s.party.y * 100}%"><span></span><b>${T("МЫ ЗДЕСЬ")}</b></div>` : "";
    const gigs = questsVisible().filter(qu => qu.x != null && ["offer", "active", "hidden"].includes(qu.status)).map(qu =>
      `<button class="ncm-pin ncm-gig st-${qu.status}${this.sel === `q:${qu.id}` ? " sel" : ""}" data-gig="${qu.id}" style="left:${qu.x * 100}%;top:${qu.y * 100}%" title="${esc(qu.title)}">
        <span class="ncm-gigmark">${qu.status === "active" ? "!" : "?"}</span><span class="ncm-name">${esc(qu.title)}</span></button>`).join("");
    const me = Object.entries(s.players ?? {}).map(([uid, pt]) => {
      const u = game.users.get(uid); if (!u) return "";
      const img = u.character?.img ?? u.avatar;
      return `<div class="ncm-me" style="left:${pt.x * 100}%;top:${pt.y * 100}%;--uc:${u.color?.css ?? u.color ?? "#ff2a6d"}" title="${esc(u.name)}">${img ? `<img src="${esc(img)}" alt="">` : ""}<b>${esc(u.character?.name ?? u.name)}</b></div>`;
    }).join("");
    this.el.querySelector(".ncm-markers").innerHTML = html + gigs + party + me;
  },
  renderSvg() {
    const H = 1000 * aspect, P = (p) => `${(p.x * 1000).toFixed(1)},${(p.y * H).toFixed(1)}`;
    const shared = state().route;
    const mine = this.path.length ? this.path : this.route;
    const line = (pts, cls, wps = pts) => !wps.length ? "" : (pts.length > 1 ? `<polyline class="${cls.split(" ").map(c => c + "-glow").join(" ")}" points="${pts.map(P).join(" ")}"/><polyline class="${cls}" points="${pts.map(P).join(" ")}"/>` : "") +
      wps.map((p, i) => `<circle class="${cls}-pt${i === 0 ? " start" : i === wps.length - 1 ? " end" : ""}" cx="${(p.x * 1000).toFixed(1)}" cy="${(p.y * H).toFixed(1)}" r="${i === 0 || i === wps.length - 1 ? 5 : 3}"/>`).join("");
    this.el.querySelector(".ncm-svg").innerHTML = `
      <defs><filter id="ncmglow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      ${shared?.pts?.length > 1 ? line(shared.path ?? shared.pts, "ncm-rt ncm-rt-shared", shared.pts) : ""}
      ${line(mine, "ncm-rt", this.route)}
      <line class="ncm-rt-rubber" x1="0" y1="0" x2="0" y2="0" style="display:none"/>`;
    this.renderHint();
  },
  /** Пунктир от последней точки маршрута к курсору — видно, куда ляжет следующий отрезок. */
  rubber(ev) {
    const l = this.el?.querySelector(".ncm-rt-rubber"); if (!l) return;
    const last = this.route.at(-1);
    if (!ev || this.mode !== "route" || !last || this.drag?.moved) { l.style.display = "none"; return; }
    const f = this.toFrac(ev), H = 1000 * aspect;
    l.setAttribute("x1", (last.x * 1000).toFixed(1)); l.setAttribute("y1", (last.y * H).toFixed(1));
    l.setAttribute("x2", (f.x * 1000).toFixed(1)); l.setAttribute("y2", (f.y * H).toFixed(1));
    l.style.display = "";
  },
  renderHint() {
    const h = this.el.querySelector(".ncm-hint");
    const msg = { route: T("Маршрут: кликайте по карте или точкам — каждый клик добавляет поворот. Тяните карту мышью, чтобы сдвинуть. Правый клик — убрать последнюю точку."),
      party: T("Кликните по карте, чтобы поставить метку «Мы здесь»."), me: T("Кликните по карте, чтобы поставить свою метку «Я здесь»."), pin: T("Кликните по карте, чтобы добавить свою точку."), move: T("Кликните туда, куда перенести место."), roads: T("Рисуй дороги левой кнопкой мыши, двигай карту правой.") }[this.mode];
    const st = state();
    const clr = this.mode === "party" && st.party ? `<button data-act="party-clear"><i class="fas fa-eraser"></i> ${T("Убрать метку")}</button>`
      : this.mode === "me" && st.players?.[game.user.id] ? `<button data-act="me-clear"><i class="fas fa-eraser"></i> ${T("Убрать метку")}</button>` : "";
    h.innerHTML = msg ? `<i class="fas fa-crosshairs"></i> ${msg} ${clr}<button data-act="mode-off">${T("Готово")}</button>` : "";
    h.classList.toggle("on", !!msg);
    this.el.querySelectorAll(".ncm-modes button").forEach(b => b.classList.toggle("on", b.dataset.act === `mode-${this.mode}`));
    this.vp.classList.toggle("ncm-pick", this.mode !== "browse");
    this.el.classList.toggle("ncm-roadsmode", this.mode === "roads");
  },

  /* ------------------------------------------------ панель справа */
  renderPanel() {
    const panel = this.el.querySelector(".ncm-panel");
    if (this.mode === "roads") return this.renderRoadsPanel(panel);
    if (this.mode === "route" || (this.route.length > 1 && !this.sel)) return this.renderRoutePanel(panel);
    const p = this.sel && poiById(this.sel);
    if (!p) { panel.classList.remove("on"); panel.innerHTML = ""; return; }
    if (p.shop) return this.renderShop(panel, p);
    if (p.market) return this.renderMarket(panel, p);
    const c = CATS[p.cat] ?? CATS.custom, d = districtAt(p.x, p.y), z = zoneAt(p.x, p.y);
    const s = state();
    const qs = questsVisible().filter(q => q.target === p.id || q.giver === p.id);
    panel.classList.add("on");
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:${c.color}">
        <span class="ncm-p-cat"><i class="fas ${c.icon}"></i> ${c.ru}${p.n ? ` · ${T("№")}${p.n}` : ""}</span>
        <h2>${esc(p.name)}</h2>
        ${p.en ? `<div class="ncm-p-en">${esc(p.en)}</div>` : ""}
        ${d ? `<button class="ncm-p-dist" data-act="dist" data-id="${d.id}">${esc(d.ru)}</button>` : ""}
        ${streetNear(p.x, p.y) ? `<div class="ncm-p-street"><i class="fas fa-signs-post"></i> ${esc(streetNear(p.x, p.y).ru)}</div>` : ""}
        ${z ? `<div class="ncm-warn ${z}"><i class="fas fa-triangle-exclamation"></i> ${z === "hot" ? T("Зона Поражения — руины, наводнения, мародёры") : T("Боевая зона — здесь правят банды")}</div>` : ""}
        <button class="ncm-p-x" data-act="unsel"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body">
        ${poiArt(p) ? `<button class="ncm-p-imgbtn" data-act="dossier" data-id="${p.id}" title="${T("Открыть досье")}"><img class="ncm-p-img" src="${esc(poiArt(p))}" alt="" onerror="this.parentElement.remove()"><span><i class="fas fa-expand"></i> ${T("ДОСЬЕ")}</span></button>` : ""}
        <p>${esc(p.desc ?? "")}</p>
        ${isGM() && p.notes ? `<div class="ncm-gm"><b>${T("Заметки мастера")}</b><p>${esc(p.notes)}</p></div>` : ""}
        ${qs.length ? `<h3><i class="fas fa-scroll"></i> ${T("Заказы")}</h3>${qs.map(qcard).join("")}` : ""}
        ${encBlock(p.x, p.y, d?.id)}
        <div class="ncm-p-acts">
          <button data-act="route-from" data-id="${p.id}"><i class="fas fa-play"></i> ${T("Маршрут отсюда")}</button>
          <button data-act="route-to" data-id="${p.id}"><i class="fas fa-flag-checkered"></i> ${T("Маршрут сюда")}</button>
          ${isGM() ? `
          <button data-act="visit" data-id="${p.id}"><i class="fas fa-${s.visited.includes(p.id) ? "eye-slash" : "check"}"></i> ${s.visited.includes(p.id) ? T("Не посещено") : T("Посещено")}</button>
          <button data-act="edit-poi" data-id="${p.id}"><i class="fas fa-pen"></i> ${T("Править")}</button>
          <button data-act="move" data-id="${p.id}"><i class="fas fa-arrows-up-down-left-right"></i> ${T("Переместить")}</button>
          ${!p.id.startsWith("c") && !p.locked ? `<button class="danger" data-act="remove-poi" data-id="${p.id}"><i class="fas fa-eye-slash"></i> ${T("Убрать с карты")}</button>` : ""}
          <button data-act="new-quest" data-id="${p.id}"><i class="fas fa-plus"></i> ${T("Заказ здесь")}</button>
          <button data-act="toggle-hide" data-id="${p.id}"><i class="fas fa-${p.hidden ? "eye" : "eye-slash"}"></i> ${p.hidden ? T("Показать игрокам") : T("Скрыть от игроков")}</button>
          <button data-act="lock-pin" data-id="${p.id}"><i class="fas fa-${p.locked ? "lock-open" : "lock"}"></i> ${p.locked ? T("Снять защиту") : T("Защитить от удаления")}</button>
          ${p.id.startsWith("c") && !p.locked ? `<button class="danger" data-act="del-pin" data-id="${p.id}"><i class="fas fa-trash"></i> ${T("Удалить точку")}</button>` : ""}` : ""}
        </div>
      </div>`;
  },
  renderShop(panel, sh) {
    const t = SHOP_TYPES[sh.type], d = districtAt(sh.x, sh.y), st = streetNear(sh.x, sh.y), z = zoneAt(sh.x, sh.y);
    const stock = stockFor(sh.type, sh.seed), q = (this.shopQuery ?? "").toLowerCase();
    const mk = sh.markup ?? 1;
    const byCat = {};
    stock.forEach((it, i) => { it.i = i; if (!q || `${it.n} ${it.note ?? ""}`.toLowerCase().includes(q)) (byCat[it.cat] ??= []).push(it); });
    const color = CATALOG[t.cats[0]].color;
    panel.classList.add("on");
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:${color}">
        <span class="ncm-p-cat"><i class="fas fa-cart-shopping"></i> ${esc(t.ru)}</span>
        <h2>${esc(sh.name)}</h2>
        ${d ? `<button class="ncm-p-dist" data-act="dist" data-id="${d.id}">${esc(d.ru)}</button>` : ""}
        ${st ? `<div class="ncm-p-street"><i class="fas fa-signs-post"></i> ${esc(st.ru)}</div>` : ""}
        ${z ? `<div class="ncm-warn ${z}"><i class="fas fa-triangle-exclamation"></i> ${z === "hot" ? T("Зона Поражения") : T("Боевая зона — торгуются жёстко, товар «с витрины»")}</div>` : ""}
        <div class="ncm-mk">${T("Цены:")} ${mk === 1 ? T("по книге") : mk > 1 ? `+${Math.round((mk - 1) * 100)}${T("% к книге")}` : `−${Math.round((1 - mk) * 100)}${T("% к книге")}`}</div>
        <button class="ncm-p-x" data-act="unsel"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body">
        <label class="ncm-shopsearch"><i class="fas fa-magnifying-glass"></i><input type="search" data-shopq placeholder="${T("Найти товар…")}" value="${esc(this.shopQuery ?? "")}"></label>
        ${Object.entries(byCat).map(([c, items]) => `<h3 style="color:${CATALOG[c].color}"><i class="fas ${CATALOG[c].icon}"></i> ${CATALOG[c].ru}</h3>
          <table class="ncm-stock">${items.map(it => `<tr><td><b>${esc(it.n)}</b>${it.note ? `<small>${esc(it.note)}</small>` : ""}</td>
            <td class="ncm-tier">${TIERS[it.tier].ru}</td><td class="ncm-eb">${priceOf(it, mk)} eb</td>${buyCell(sh.id, it)}</tr>`).join("")}</table>`).join("") || `<p class="ncm-muted">${T("Ничего не найдено.")}</p>`}
        ${encBlock(sh.x, sh.y, d?.id)}
        <div class="ncm-p-acts">
          <button data-act="route-to" data-id="${sh.id}"><i class="fas fa-flag-checkered"></i> ${T("Маршрут сюда")}</button>
          ${isGM() ? `<button data-act="shop-reroll" data-id="${sh.id}"><i class="fas fa-dice"></i> ${T("Новый товар")}</button>
          <button data-act="shop-edit" data-id="${sh.id}"><i class="fas fa-pen"></i> ${T("Править")}</button>
          <button data-act="toggle-hide" data-id="${sh.id}"><i class="fas fa-${sh.hidden ? "eye" : "eye-slash"}"></i> ${sh.hidden ? T("Показать игрокам") : T("Скрыть")}</button>
          <button class="danger" data-act="shop-del" data-id="${sh.id}"><i class="fas fa-trash"></i></button>` : ""}
        </div>
      </div>`;
    const inp = panel.querySelector("[data-shopq]");
    inp.addEventListener("keydown", ev => ev.stopPropagation());
    inp.addEventListener("input", () => { this.shopQuery = inp.value; const pos = inp.selectionStart; this.renderShop(panel, sh); const n = panel.querySelector("[data-shopq]"); n.focus(); n.setSelectionRange(pos, pos); });
  },
  renderMarket(panel, m) {
    const d = districtAt(m.x, m.y), st = streetNear(m.x, m.y), z = zoneAt(m.x, m.y), gm = isGM(), c = CATS.market;
    const open = isNight(), rep = repOf(game.user), need = m.rep ?? 0, access = m.access ?? [];
    const okRep = rep >= need, okFix = access.includes(game.user.id), can = gm || (okRep && okFix);
    const mk = m.markup ?? 1, q = (this.shopQuery ?? "").toLowerCase();
    const byCat = {};
    if (can && (open || gm)) marketStock(m.cats ?? [], m.seed).forEach((it, i) => { it.i = i; if (!q || `${it.n} ${it.note ?? ""}`.toLowerCase().includes(q)) (byCat[it.cat] ??= []).push(it); });
    const players = game.users.filter(u => !u.isGM);
    const lock = !can ? `<div class="ncm-mlock"><i class="fas fa-lock"></i><b>${T("Вход только по рекомендации")}</b><span>${T("Без репутации и фиксера охрана развернёт тебя ещё на подходе.")}</span></div>`
      : !open && !gm ? `<div class="ncm-mlock"><i class="fas fa-moon"></i><b>${T("Рынок свёрнут")}</b><span>${T("Торговцы появятся с наступлением ночи — после 21:00.")}</span></div>` : "";
    panel.classList.add("on");
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:${c.color}">
        <span class="ncm-p-cat"><i class="fas fa-moon"></i> ${T("Ночной рынок")}</span>
        <h2>${esc(m.name)}</h2>
        ${d ? `<button class="ncm-p-dist" data-act="dist" data-id="${d.id}">${esc(d.ru)}</button>` : ""}
        ${st ? `<div class="ncm-p-street"><i class="fas fa-signs-post"></i> ${esc(st.ru)}</div>` : ""}
        ${z ? `<div class="ncm-warn ${z}"><i class="fas fa-triangle-exclamation"></i> ${z === "hot" ? T("Зона Поражения") : T("Боевая зона")}</div>` : ""}
        <div class="ncm-mk">${open ? T("● Открыт сейчас") : T("○ Закрыт · работает ночью, 21:00–06:00")}</div>
        <button class="ncm-p-x" data-act="unsel"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body">
        <div class="ncm-req">
          <div class="${gm || okRep ? "ok" : "no"}"><i class="fas fa-star"></i><span>${T("Репутация")} <b>${need}+</b></span><small>${gm ? T("условие для игроков") : `${T("у тебя")} ${rep}`}</small></div>
          <div class="${gm || okFix ? "ok" : "no"}"><i class="fas fa-handshake"></i><span>${T("Фиксер")} <b>${esc(m.fixer ?? "—")}</b></span><small>${gm ? T("сводит с организаторами") : okFix ? T("свёл тебя с организаторами") : T("нужно знакомство")}</small></div>
        </div>
        <div class="ncm-msecs">${(m.cats ?? []).map(k => `<span>${esc(MARKET_CATS[k]?.ru ?? k)}</span>`).join("")}</div>
        ${gm ? `<h3><i class="fas fa-user-check"></i> ${T("Кого пускают")}</h3><div class="ncm-mpl">${players.map(u => { const r = repOf(u), on = access.includes(u.id);
          return `<button data-act="market-grant" data-id="${m.id}" data-u="${u.id}" class="${on ? "on" : ""}" title="${on ? T("Закрыть доступ") : `${T("Фиксер сводит — придёт сообщение от")} ${esc(m.fixer ?? T("фиксера"))}`}"><i class="fas fa-${on ? "check" : "plus"}"></i> ${esc(u.character?.name ?? u.name)} <small class="${r >= need ? "ok" : "no"}">${T("реп.")} ${r}</small></button>`; }).join("") || `<p class="ncm-muted">${T("Нет игроков.")}</p>`}</div>
          ${m.notes ? `<p class="ncm-muted">${esc(m.notes)}</p>` : ""}` : ""}
        ${lock}
        ${Object.keys(byCat).length || (can && (open || gm)) ? `<label class="ncm-shopsearch"><i class="fas fa-magnifying-glass"></i><input type="search" data-shopq placeholder="${T("Найти товар…")}" value="${esc(this.shopQuery ?? "")}"></label>
        <div class="ncm-mk">${T("Цены:")} ${mk === 1 ? T("по книге") : mk > 1 ? `+${Math.round((mk - 1) * 100)}${T("% к книге")}` : `−${Math.round((1 - mk) * 100)}${T("% к книге")}`}</div>` : ""}
        ${Object.entries(byCat).map(([k, items]) => `<h3 style="color:${CATALOG[k].color}"><i class="fas ${CATALOG[k].icon}"></i> ${CATALOG[k].ru}</h3>
          <table class="ncm-stock">${items.map(it => `<tr><td><b>${esc(it.n)}</b>${it.note ? `<small>${esc(it.note)}</small>` : ""}</td>
            <td class="ncm-tier">${TIERS[it.tier].ru}</td><td class="ncm-eb">${priceOf(it, mk)} eb</td>${open || gm ? buyCell(m.id, it) : ""}</tr>`).join("")}</table>`).join("")}
        ${encBlock(m.x, m.y, d?.id)}
        <div class="ncm-p-acts">
          <button data-act="route-to" data-id="${m.id}"><i class="fas fa-flag-checkered"></i> ${T("Маршрут сюда")}</button>
          ${!gm && !okFix ? `<button data-act="market-ask" data-id="${m.id}"><i class="fas fa-mobile-screen"></i> ${T("Написать фиксеру")}</button>` : ""}
          ${gm ? `<button data-act="market-reroll" data-id="${m.id}"><i class="fas fa-dice"></i> ${T("Новый товар")}</button>
          <button data-act="market-edit" data-id="${m.id}"><i class="fas fa-pen"></i> ${T("Править")}</button>
          <button data-act="toggle-hide" data-id="${m.id}"><i class="fas fa-${m.hidden ? "eye" : "eye-slash"}"></i> ${m.hidden ? T("Показать игрокам") : T("Скрыть")}</button>
          <button class="danger" data-act="market-del" data-id="${m.id}"><i class="fas fa-trash"></i></button>` : ""}
        </div>
      </div>`;
    const inp = panel.querySelector("[data-shopq]");
    if (inp) {
      inp.addEventListener("keydown", ev => ev.stopPropagation());
      inp.addEventListener("input", () => { this.shopQuery = inp.value; const pos = inp.selectionStart; this.renderMarket(panel, m); const n = panel.querySelector("[data-shopq]"); n?.focus(); n?.setSelectionRange(pos, pos); });
    }
  },
  renderRoutePanel(panel) {
    const pts = this.route, st = routeStats(this.path.length ? this.path : pts, this.path.length > 1);
    panel.classList.add("on");
    const names = pts.map(p => p.poi ? poiById(p.poi)?.name : p.gig ? state().quests.find(q => q.id === p.gig)?.title : null);
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:#ff2a6d">
        <span class="ncm-p-cat"><i class="fas fa-route"></i> ${T("Маршрут")}</span>
        <h2>${esc(names[0] ?? (pts[0] ? T("Точка на карте") : T("Выберите старт")))}${pts.length > 1 ? ` → ${esc(names.at(-1) ?? T("точка на карте"))}` : ""}</h2>
        <button class="ncm-p-x" data-act="route-clear"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body">
        <div class="ncm-rpick">
          <input list="ncm-poilist" data-route-add placeholder="${pts.length ? T("Добавить точку: место, магазин, район…") : T("Откуда: место, магазин, район…")}">
          <datalist id="ncm-poilist">${allPois().map(x => `<option value="${esc(x.name)}">`).join("")}${DISTRICTS.filter(x => !["delbay", "sanbay"].includes(x.id)).map(x => `<option value="${esc(x.ru)}">`).join("")}${state().party ? `<option value="${T("Мы здесь")}">` : ""}${state().players?.[game.user.id] ? `<option value="${T("Я здесь")}">` : ""}</datalist>
          ${state().party ? `<button data-act="route-party" title="${T("Начать от метки «Мы здесь»")}"><i class="fas fa-users"></i></button>` : ""}
        </div>
        ${pts.length > 1 ? `
        <label class="ncm-toggle"><input type="checkbox" data-act="streets" ${this.streets ? "checked" : ""}> ${T("По улицам (обход воды и кварталов)")}</label>
        <div class="ncm-stats"><div><b>${st.road.toFixed(1)}</b><span>${T("км в пути")}</span></div><div><b>${routeStats(pts).dist.toFixed(1)}</b><span>${T("км по прямой")}</span></div><div><b>${pts.length}</b><span>${T("точек")}</span></div></div>
        ${st.hot > 0.05 ? `<div class="ncm-warn hot"><i class="fas fa-radiation"></i> ${T("Через Зону Поражения:")} ${st.hot.toFixed(1)} ${T("км")}</div>` : ""}
        ${st.combat > 0.05 ? `<div class="ncm-warn combat"><i class="fas fa-triangle-exclamation"></i> ${T("Через Боевую зону:")} ${st.combat.toFixed(1)} ${T("км — возможна встреча с бандой")}</div>` : ""}
        <div class="ncm-eta">${TRANSPORT.map(t => `<button data-act="travel" data-t="${t.id}" title="${T("Проехать: время пройдёт, метка переместится в конец маршрута")}"><i class="fas ${t.icon}"></i><span>${t.ru}</span><b>${fmtTime((t.id === "av" ? st.dist : st.road) / t.kmh)}</b><em>▶</em></button>`).join("")}</div>
        <div class="ncm-who">${T("Кто едет:")}
          <label><input type="radio" name="ncm-who" value="party" ${this.who !== "me" ? "checked" : ""}> ${T("вся группа")}</label>
          <label><input type="radio" name="ncm-who" value="me" ${this.who === "me" ? "checked" : ""}> ${T("только я")}</label>
          ${isGM() ? `<label><input type="checkbox" data-travel-enc ${this.travelEnc ? "checked" : ""}> ${T("встречи по пути")}</label>` : ""}</div>
        ${isGM() ? `<button class="ncm-enc-roll" data-act="enc-route"><i class="fas fa-dice-d20"></i> ${T("Встречи по пути")}</button>
        ${(this.routeEnc ?? []).map(encCard).join("")}` : ""}
        <ol class="ncm-steps">${pts.map((p, i) => `<li><button class="ncm-step-x" data-act="route-rm" data-i="${i}" title="${T("Убрать точку")}">✕</button>${esc(names[i] ?? ([streetNear(p.x, p.y)?.ru, districtAt(p.x, p.y)?.ru].filter(Boolean).join(", ") || T("точка")))}</li>`).join("")}</ol>` :
        `<p class="ncm-muted">${T("Кликните по карте или по точке, чтобы задать начало, потом — следующие точки пути.")}</p>`}
        <div class="ncm-p-acts">
          ${this.mode !== "route" ? `<button data-act="mode-route"><i class="fas fa-pen"></i> ${T("Дорисовать")}</button>` : ""}
          <button data-act="route-undo"><i class="fas fa-rotate-left"></i> ${T("Убрать последнюю")}</button>
          ${isGM() && pts.length > 1 ? `<button data-act="route-share"><i class="fas fa-satellite-dish"></i> ${T("Показать маршрут всем")}</button>` : ""}
          ${isGM() && state().route ? `<button data-act="route-unshare"><i class="fas fa-eraser"></i> ${T("Стереть общий маршрут")}</button>` : ""}
          <button class="danger" data-act="route-clear"><i class="fas fa-trash"></i> ${T("Сбросить")}</button>
        </div>
      </div>`;
    this.bindRoutePick(panel);
  },
  bindRoutePick(panel) {
    const inp = panel.querySelector("[data-route-add]");
    if (!inp) return;
    inp.addEventListener("keydown", ev => ev.stopPropagation());
    inp.addEventListener("change", () => {
      const v = inp.value.trim().toLowerCase(); inp.value = ""; if (!v) return;
      let pt = null;
      if ((v === "мы здесь" || v === T("мы здесь").toLowerCase()) && state().party) pt = { ...state().party };
      if ((v === "я здесь" || v === T("я здесь").toLowerCase()) && state().players?.[game.user.id]) pt = { ...state().players[game.user.id] };
      const p = allPois().find(x => x.name.toLowerCase() === v) ?? allPois().find(x => x.name.toLowerCase().includes(v));
      const d = DISTRICTS.find(x => x.ru.toLowerCase() === v);
      if (!pt && p) pt = { x: p.x, y: p.y, poi: p.id };
      if (!pt && d) pt = { x: d.x, y: d.y };
      if (!pt) return ui.notifications.warn(T("Карта: такое место не найдено."));
      const last = this.route.at(-1);
      if (last && Math.abs(last.x - pt.x) < 1e-6 && Math.abs(last.y - pt.y) < 1e-6) return;
      this.route.push(pt); this.recalc().then(() => this.el.querySelector("[data-route-add]")?.focus());
    });
  },
  renderDistrict(id) {
    const d = DISTRICTS.find(x => x.id === id);
    if (!d) return;
    this.sel = null;
    const panel = this.el.querySelector(".ncm-panel");
    const inside = allPois().filter(p => districtAt(p.x, p.y)?.id === id);
    panel.classList.add("on");
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:${["#2fbf4a", "#7bd88f", "#f5e663", "#ff9f43", "#ff4d4d", "#ff2a6d"][d.danger]}">
        <span class="ncm-p-cat"><i class="fas fa-city"></i> ${T("Район ·")} ${DANGER[d.danger]}</span>
        <h2>${esc(d.ru)}</h2><div class="ncm-muted">${esc(d.en)}</div>
        <div class="ncm-danger">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= d.danger ? "on" : ""}"></i>`).join("")}</div>
        <button class="ncm-p-x" data-act="unsel"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body"><p>${esc(d.desc)}</p>
        ${encBlock(d.x, d.y, d.id)}
        ${inside.length ? `<h3>${T("Места района")}</h3><div class="ncm-list">${inside.map(p => `<button data-poi="${p.id}" style="--c:${(CATS[p.cat] ?? CATS.custom).color}"><span>${p.n ?? "•"}</span>${esc(p.name)}</button>`).join("")}</div>` : ""}
      </div>`;
    this.focus(d.x, d.y);
  },

  /* ------------------------------------------------ места: убранные, экспорт */
  renderPlaces() {
    const panel = this.el.querySelector(".ncm-panel"), s = state();
    const removed = POIS.filter(p => s.poi[p.id]?.removed);
    this.sel = null; this.renderMarkers();
    panel.classList.add("on");
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:#00f0ff">
        <span class="ncm-p-cat"><i class="fas fa-map-location-dot"></i> ${T("Мастер")}</span>
        <h2>${T("Места на карте")}</h2>
        <button class="ncm-p-x" data-act="unsel"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body">
        <p class="ncm-muted">${T("Любое место можно править, перемещать и убирать с карты. Свою карту (например, 2077) ставь в настройках модуля, встроенные места убери и расставь свои.")}</p>
        <div class="ncm-seg"><button data-act="places-all" data-on="0">${T("Убрать все встроенные")}</button><button data-act="places-all" data-on="1">${T("Вернуть все встроенные")}</button></div>
        <h3>${T("Убранные места")} · ${removed.length}</h3>
        ${removed.length ? removed.map(p => `<div class="ncm-own"><div><b>${esc(p.name)}</b><small>${esc((CATS[p.cat] ?? CATS.custom).ru)}</small></div><button data-act="restore-poi" data-id="${p.id}" title="${T("Вернуть")}"><i class="fas fa-rotate-left"></i></button></div>`).join("") : `<p class="ncm-muted">${T("Ничего не убрано.")}</p>`}
        <h3>${T("Перенос между мирами")}</h3>
        <p class="ncm-muted">${T("В файл попадают свои точки, правки мест, встречи, магазины, рынки и заказы.")}</p>
        <div class="ncm-p-acts"><button data-act="export"><i class="fas fa-file-export"></i> ${T("Экспорт")}</button><button data-act="import"><i class="fas fa-file-import"></i> ${T("Импорт")}</button></div>
      </div>`;
  },

  /* ------------------------------------------------ свои встречи */
  renderEncEditor() {
    const panel = this.el.querySelector(".ncm-panel"), s = state(), list = s.encounters ?? [], mode = s.encMode ?? "mix";
    this.sel = null; this.renderMarkers();
    const TH = Object.keys(THREAT_RU);
    panel.classList.add("on");
    panel.innerHTML = `
      <div class="ncm-p-head" style="--c:#ff2a6d">
        <span class="ncm-p-cat"><i class="fas fa-dice-d20"></i> ${T("Случайные встречи")}</span>
        <h2>${T("Свои встречи")}</h2>
        <button class="ncm-p-x" data-act="unsel"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="ncm-p-body">
        <p class="ncm-muted">${T("Свои встречи выпадают там, где подходят угроза района и время суток. {g} в тексте — банда района.")}</p>
        <div class="ncm-seg"><button data-act="enc-mode" data-m="mix" class="${mode === "mix" ? "on" : ""}">${T("Вместе с книжными")}</button><button data-act="enc-mode" data-m="own" class="${mode === "own" ? "on" : ""}">${T("Только свои")}</button></div>
        ${list.length ? list.map(e => `<div class="ncm-own">
          <div><b>${esc(e.title)}</b><small>${(e.threats?.length ? e.threats : TH).map(t => T(THREAT_RU[t])).join(", ")} · ${e.time === "day" ? T("день") : e.time === "night" ? T("ночь") : T("день и ночь")}</small></div>
          <button data-act="enc-edit" data-id="${e.id}" title="${T("Править")}"><i class="fas fa-pen"></i></button>
          <button class="danger" data-act="enc-del" data-id="${e.id}" title="${T("Удалить")}"><i class="fas fa-trash"></i></button></div>`).join("")
          : `<p class="ncm-muted">${T("Своих встреч пока нет.")}</p>`}
        <div class="ncm-p-acts"><button data-act="enc-add"><i class="fas fa-plus"></i> ${T("Добавить встречу")}</button></div>
      </div>`;
  },
  async editEncounter(id = null) {
    const e = (state().encounters ?? []).find(x => x.id === id) ?? { id: rid(), title: "", text: "", stats: "", twists: [], threats: [], time: "any" };
    const TH = Object.keys(THREAT_RU);
    const data = await formDialog(id ? e.title : T("Новая встреча"), `<form class="ncm-form">
      <label>${T("Название")}<input name="title" value="${esc(e.title)}" placeholder="${T("Например: Облава NCPD")}"></label>
      <label>${T("Что происходит")}<textarea name="text" rows="3">${esc(e.text)}</textarea></label>
      <label>${T("Противники / статы")}<input name="stats" value="${esc(e.stats ?? "")}" placeholder="${T("Бустеры ×4")}"></label>
      <label>${T("Повороты — по одному в строке, выпадет случайный")}<textarea name="twists" rows="4">${esc((e.twists ?? []).join("\n"))}</textarea></label>
      <div class="ncm-checks"><span>${T("Где (ничего не отмечено — везде)")}</span>${TH.map(t => `<label class="ncm-check"><input type="checkbox" name="th_${t}" ${e.threats?.includes(t) ? "checked" : ""}> ${T(THREAT_RU[t])}</label>`).join("")}</div>
      <label>${T("Когда")}<select name="time"><option value="any"${e.time === "any" ? " selected" : ""}>${T("день и ночь")}</option><option value="day"${e.time === "day" ? " selected" : ""}>${T("днём")}</option><option value="night"${e.time === "night" ? " selected" : ""}>${T("ночью")}</option></select></label></form>`);
    if (!data?.title) return this.renderEncEditor();
    const out = { id: e.id, title: data.title, text: data.text, stats: data.stats, time: data.time,
      twists: String(data.twists ?? "").split("\n").map(x => x.trim()).filter(Boolean).slice(0, 12), threats: TH.filter(t => data[`th_${t}`]) };
    await save(s => { s.encounters ??= []; const i = s.encounters.findIndex(x => x.id === e.id); i >= 0 ? (s.encounters[i] = out) : s.encounters.push(out); });
    this.renderEncEditor();
  },

  /* ------------------------------------------------ квесты */
  renderQuestList() {
    const box = this.el.querySelector(".ncm-quests");
    const qs = questsVisible();
    const order = { active: 0, offer: 1, hidden: 2, done: 3, failed: 4 };
    qs.sort((a, b) => order[a.status] - order[b.status]);
    box.innerHTML = `
      <div class="ncm-q-head"><h2><i class="fas fa-scroll"></i> ${T("Заказы")}</h2>
        ${isGM() ? `<button data-act="gen-gig" title="${T("Случайный заказ")}"><i class="fas fa-dice"></i> ${T("Сгенерировать")}</button><button data-act="new-quest"><i class="fas fa-plus"></i> ${T("Новый")}</button>` : ""}
        <button class="ncm-p-x" data-act="quests"><i class="fas fa-xmark"></i></button></div>
      <div class="ncm-q-body">${qs.length ? qs.map(qcard).join("") : `<p class="ncm-muted">${T("Пока заказов нет. Фиксеры молчат.")}</p>`}</div>`;
  },
  async editQuest(id = null, atPoi = null, preset = null) {
    const s = state();
    const q = s.quests.find(x => x.id === id) ?? { id: rid(), title: "", fixer: "", desc: "", reward: "", status: "hidden", target: atPoi, giver: null, notes: "", ...(preset ?? {}) };
    const opts = (sel) => `<option value="">—</option>` + allPois().sort((a, b) => a.name.localeCompare(b.name)).map(p => `<option value="${p.id}"${p.id === sel ? " selected" : ""}>${esc(p.name)}</option>`).join("");
    const html = `<form class="ncm-form">
      <label>${T("Название")}<input name="title" value="${esc(q.title)}" placeholder="${T("Например: Груз для Рога")}"></label>
      <label>${T("Фиксер / заказчик")}<input name="fixer" value="${esc(q.fixer)}" placeholder="${T("Роуг, Ватсон…")}"></label>
      <div class="ncm-row"><label>${T("Где выдают")}<select name="giver">${opts(q.giver)}</select></label><label>${T("Цель")}<select name="target">${opts(q.target)}</select></label></div>
      <label>${T("Описание для игроков")}<textarea name="desc" rows="4">${esc(q.desc)}</textarea></label>
      <div class="ncm-row"><label>${T("Награда")}<input name="reward" value="${esc(q.reward)}" placeholder="${T("2000 eb (эдди)")}"></label>
        <label>${T("Статус")}<select name="status">${Object.entries(QSTATUS).map(([k, v]) => `<option value="${k}"${k === q.status ? " selected" : ""}>${v}</option>`).join("")}</select></label></div>
      <label>${T("Заметки мастера (игроки не видят)")}<textarea name="notes" rows="3">${esc(q.notes)}</textarea></label></form>`;
    const data = await formDialog(id ? T("Заказ") : T("Новый заказ"), html);
    if (!data) return;
    const wasHidden = q.status === "hidden";
    Object.assign(q, data);
    await save(st => { const i = st.quests.findIndex(x => x.id === q.id); i >= 0 ? (st.quests[i] = q) : st.quests.push(q); });
    if (wasHidden && q.status === "active" && game.settings.get(MID, "notify")) emit({ action: "quest", id: q.id });
  },

  /* ------------------------------------------------ события */
  bind() {
    const el = this.el, vp = this.vp;
    el.addEventListener("click", (ev) => this.onClick(ev));
    el.addEventListener("change", (ev) => {
      if (ev.target.name === "ncm-who") this.who = ev.target.value;
      if (ev.target.matches("[data-travel-enc]")) this.travelEnc = ev.target.checked;
    });
    el.querySelector(".ncm-search input").addEventListener("input", (ev) => { this.query = ev.target.value.trim(); this.renderMarkers(); });
    el.querySelector(".ncm-search input").addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key !== "Enter") return;
      const q = this.query.toLowerCase();
      const p = allPois().find(x => `${x.name} ${x.en ?? ""}`.toLowerCase().includes(q));
      const d = DISTRICTS.find(x => x.ru.toLowerCase().includes(q) || x.en.toLowerCase().includes(q));
      if (p) this.select(p.id, true); else if (d) this.renderDistrict(d.id);
    });
    vp.addEventListener("wheel", (ev) => { ev.preventDefault(); const r = vp.getBoundingClientRect(); this.zoomAt(ev.deltaY < 0 ? 1.18 : 1 / 1.18, ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
    vp.addEventListener("pointerdown", (ev) => {
      if (ev.button > 2 || ev.target.closest("button:not(.ncm-pin), .ncm-hint, .ncm-dist")) return;
      if (ev.button === 1) ev.preventDefault();
      if (this.mode === "roads" && ev.button === 0 && isGM()) {
        const f = this.toFrac(ev); this.stroke = { t: this.brush?.t ?? "road", w: this.brush?.w ?? 0.006, p: [[f.x, f.y]] };
        vp.setPointerCapture(ev.pointerId); return this.drawStroke();
      }
      this.drag = { x: ev.clientX, y: ev.clientY, vx: this.view.x, vy: this.view.y, moved: false, target: ev.target, btn: ev.button };
      vp.setPointerCapture(ev.pointerId);
    });
    vp.addEventListener("pointermove", (ev) => {
      if (this.mode === "route") this.rubber(ev);
      if (this.stroke) { const f = this.toFrac(ev), l = this.stroke.p.at(-1); if (Math.hypot(f.x - l[0], f.y - l[1]) > 0.002) { this.stroke.p.push([+f.x.toFixed(5), +f.y.toFixed(5)]); this.drawStroke(); } return; }
      const d = this.drag; if (!d) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
      if (d.moved) { this.view.x = d.vx + dx; this.view.y = d.vy + dy; this.apply(); vp.classList.add("ncm-grab"); }
    });
    vp.addEventListener("pointerup", (ev) => {
      if (this.stroke) { const st = this.stroke; this.stroke = null; return save(s => { s.roads = [...(s.roads ?? []), st]; }); }
      const d = this.drag; this.drag = null; vp.classList.remove("ncm-grab");
      if (!d || d.moved) return;
      if (d.btn === 2) { if (this.mode === "route" && this.route.length) { this.route.pop(); this.recalc(); } return; }
      if (d.btn === 0 && !d.target.closest("button:not(.ncm-pin)")) this.onMapClick(ev, d.target);
    });
    vp.addEventListener("contextmenu", (ev) => ev.preventDefault());
    vp.addEventListener("pointerleave", () => this.rubber(null));
    this.onKey = (ev) => {
      if (!this.el) return document.removeEventListener("keydown", this.onKey, true);
      if (ev.key === "Escape") { ev.stopPropagation(); if (this.mode !== "browse") this.setMode("browse"); else this.close(); }
    };
    document.addEventListener("keydown", this.onKey, true);
    window.addEventListener("resize", () => { if (this.el) { this.layout(); this.fit(); } });
  },
  reopen() {
    if (this.lastEncDist && !this.sel) return this.renderDistrict(this.lastEncDist);
    this.renderPanel();
  },
  async rollRoute() {
    const pts = this.path.length ? this.path : this.route, seen = new Set(), out = [];
    // одна встреча на каждый «тип территории» по пути: начало, Боевая зона, Зона Поражения
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[i + 1] ?? a;
      for (let t = 0; t <= 1; t += 0.25) {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        const key = zoneAt(x, y) ?? districtAt(x, y)?.id;
        if (seen.has(key) || out.length >= 3) continue;
        if (!zoneAt(x, y) && out.length) continue;
        seen.add(key); out.push(await doEncounter(x, y, null, { toGM: true }));
      }
    }
    this.routeEnc = out; this.lastEnc = out.at(-1);
    this.renderPanel();
  },
  selectGig(id) {
    this.sel = `q:${id}`; this.renderMarkers();
    const q = state().quests.find(x => x.id === id), panel = this.el.querySelector(".ncm-panel");
    if (!q) return;
    const d = districtAt(q.x, q.y), st = streetNear(q.x, q.y);
    panel.classList.add("on");
    panel.innerHTML = `<div class="ncm-p-head" style="--c:${q.status === "active" ? "#fcee0a" : "#00f0ff"}">
        <span class="ncm-p-cat"><i class="fas fa-${q.status === "active" ? "exclamation" : "question"}"></i> ${QSTATUS[q.status]}</span>
        <h2>${esc(q.title)}</h2>${d ? `<button class="ncm-p-dist" data-act="dist" data-id="${d.id}">${esc(d.ru)}</button>` : ""}
        ${st ? `<div class="ncm-p-street"><i class="fas fa-signs-post"></i> ${esc(st.ru)}</div>` : ""}
        <button class="ncm-p-x" data-act="unsel"><i class="fas fa-xmark"></i></button></div>
      <div class="ncm-p-body">${qcard(q)}
        <div class="ncm-p-acts"><button data-act="route-gig" data-id="${q.id}"><i class="fas fa-flag-checkered"></i> ${T("Маршрут сюда")}</button>
        ${!isGM() && q.status === "offer" ? `<button data-act="take" data-id="${q.id}"><i class="fas fa-handshake"></i> ${T("Взять заказ")}</button>` : ""}</div>
        ${encBlock(q.x, q.y, d?.id)}</div>`;
  },
  renderClock() {
    const c = this.el?.querySelector(".ncm-clock"); if (!c) return;
    const { day, time } = fmtClock(), n = isNight();
    c.innerHTML = `<i class="fas fa-${n ? "moon" : "sun"}"></i><b>${time}</b><small>${day}</small>${isGM() ? `<span class="ncm-tadd"><button data-act="time" data-m="10">${T("+10м")}</button><button data-act="time" data-m="60">${T("+1ч")}</button><button data-act="time" data-m="480">${T("+8ч")}</button><button data-act="time-set" title="${T("Установить время")}">⏱</button>${scApi() ? `<button data-act="sc-setup" class="${scLinked() ? "on" : ""}" title="${scLinked() ? `Simple Calendar: ${T("«")}${scName()}${T("» подключён. Нажми, чтобы перенастроить")}` : T("Настроить Simple Calendar под Найт-Сити")}">📅</button>` : ""}</span>` : ""}${scLinked() ? `<span class="ncm-sc" title="${T("Время идёт по Simple Calendar")}">SC</span>` : ""}`;
  },
  async travel(tid) {
    const pts = this.path.length ? this.path : this.route; if (pts.length < 2) return;
    const t = TRANSPORT.find(x => x.id === tid), st = routeStats(pts, this.path.length > 1);
    const min = ((t.id === "av" ? st.dist : st.road) / t.kmh) * 60;
    const end = this.route.at(-1), who = this.who === "me" ? game.user.id : "party";
    const to = end.poi ? poiById(end.poi)?.name : end.gig ? state().quests.find(x => x.id === end.gig)?.title : (streetNear(end.x, end.y)?.ru ?? districtAt(end.x, end.y)?.ru);
    if (isGM() && this.travelEnc) await this.rollRoute();
    // анимация метки по маршруту
    this.animateTravel(pts);
    await act("travel", { x: end.x, y: end.y, min, who, mode: t.ru, to, km: st.road });
    this.route = [{ ...end }]; this.path = [];
    setTimeout(() => { this.renderSvg(); this.renderPanel(); }, 1300);
  },
  animateTravel(pts) {
    const layer = this.el.querySelector(".ncm-markers"), dot = document.createElement("div");
    dot.className = "ncm-runner"; layer.appendChild(dot);
    const segs = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push([pts[i - 1], pts[i], L, l]); L += l; }
    const t0 = performance.now(), dur = 1200;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), at = k * L;
      const sg = segs.find(g => at <= g[2] + g[3]) ?? segs.at(-1), u = sg[3] ? (at - sg[2]) / sg[3] : 1;
      dot.style.left = `${(sg[0].x + (sg[1].x - sg[0].x) * u) * 100}%`; dot.style.top = `${(sg[0].y + (sg[1].y - sg[0].y) * u) * 100}%`;
      if (k < 1) requestAnimationFrame(step); else setTimeout(() => dot.remove(), 200);
    };
    requestAnimationFrame(step);
  },
  async recalc() {
    if (this.streets && this.route.length > 1) { await loadGrid(); this.path = buildPath(this.route); }
    else this.path = [];
    this.renderSvg(); this.renderPanel();
  },
  setMode(m) {
    this.mode = this.mode === m ? "browse" : m;
    if (this.mode === "roads") loadGrid().then(() => this.renderRoads()); else this.renderRoads();
    if (this.mode === "route" && !this.route.length && this.sel) { const p = poiById(this.sel); if (p) this.route.push({ x: p.x, y: p.y, poi: p.id }); }
    this.renderHint(); this.renderPanel(); this.renderSvg();
  },
  select(id, center = false) {
    if (this.sel !== id) { this.shopQuery = ""; this.lastEncDist = null; }
    this.sel = id;
    const p = poiById(id);
    this.renderMarkers(); this.renderPanel();
    if (center && p) this.focus(p.x, p.y, Math.max(this.view.s, 0.9));
  },
  async onMapClick(ev, target = ev.target) {
    const pin = target.closest("[data-poi], [data-gig]");
    if (pin?.dataset.gig && this.mode !== "route") { /* обработано ниже */ }
    const f = this.toFrac(ev);
    if (this.mode === "route") {
      const gq = pin?.dataset.gig ? state().quests.find(x => x.id === pin.dataset.gig) : null;
      const p = pin?.dataset.poi ? poiById(pin.dataset.poi) : null;
      this.route.push(p ? { x: p.x, y: p.y, poi: p.id } : gq ? { x: gq.x, y: gq.y, gig: gq.id } : f);
      return this.recalc();
    }
    if (this.mode === "move") {
      const id = this.moveId; this.moveId = null;
      if (id) await save(s => {
        const pin = s.pins.find(x => x.id === id) ?? s.shops.find(x => x.id === id) ?? s.markets.find(x => x.id === id);
        if (pin) Object.assign(pin, { x: f.x, y: f.y }); else s.poi[id] = { ...(s.poi[id] ?? {}), x: f.x, y: f.y };
      });
      this.setMode("browse"); return id && this.select(id);
    }
    if (this.mode === "party") { await act("party", f); this.setMode("browse"); return; }
    if (this.mode === "me") { await act("me", f); this.setMode("browse"); return; }
    if (this.mode === "pin") {
      const data = await pinDialog(T("Новая точка"), { hidden: true });
      if (data?.name) { const id = `c${rid()}`; await save(s => { s.pins.push({ id, ...f, ...data }); }); this.setMode("browse"); return this.select(id); }
      this.setMode("browse"); return;
    }
    const gig = target.closest("[data-gig]");
    if (this.mode === "browse" && gig) return this.selectGig(gig.dataset.gig);
    if (pin) return this.select(pin.dataset.poi);
    const dist = target.closest("[data-dist]");
    if (dist) return this.renderDistrict(dist.dataset.dist);
    if (this.sel) { this.sel = null; this.renderMarkers(); this.renderPanel(); }
  },
  async onClick(ev) {
    const dl = ev.target.closest(".ncm-dist");
    if (dl && this.mode === "browse") return this.renderDistrict(dl.dataset.dist);
    const b = ev.target.closest("[data-act], [data-cat], .ncm-list [data-poi], .ncm-qcard [data-poi]");
    if (!b) return;
    if (b.dataset.cat) {
      const c = b.dataset.cat;
      this.filter.has(c) ? this.filter.delete(c) : this.filter.add(c);
      b.classList.toggle("on", this.filter.has(c)); return this.renderMarkers();
    }
    if (!b.dataset.act && b.dataset.poi) return this.select(b.dataset.poi, true);
    const id = b.dataset.id;
    switch (b.dataset.act) {
      case "close": return this.close();
      case "zin": return this.zoomAt(1.3);
      case "zout": return this.zoomAt(1 / 1.3);
      case "fit": return this.fit();
      case "unsel": this.sel = null; this.renderMarkers(); return this.renderPanel();
      case "dist": return this.renderDistrict(id);
      case "quests": return this.el.querySelector(".ncm-quests").classList.toggle("on");
      case "mode-route": return this.setMode("route");
      case "mode-party": return this.setMode("party");
      case "mode-pin": return this.setMode("pin");
      case "mode-off": return this.setMode("browse");
      case "route-from": { const p = poiById(id); this.route = [{ x: p.x, y: p.y, poi: p.id }]; this.path = []; this.mode = "browse"; return this.setMode("route"); }
      case "route-to": {
        const p = poiById(id), party = state().party;
        const start = this.route[0] ?? (party ? { ...party } : null);
        this.route = start ? [start, { x: p.x, y: p.y, poi: p.id }] : [{ x: p.x, y: p.y, poi: p.id }];
        this.mode = "browse";
        if (!start) return this.setMode("route");
        return this.recalc();
      }
      case "route-undo": this.route.pop(); return this.recalc();
      case "route-rm": this.route.splice(Number(b.dataset.i), 1); return this.recalc();
      case "route-party": { const pt = state().party; if (pt) this.route.unshift({ ...pt }); return this.recalc(); }
      case "streets": this.streets = b.checked; return this.recalc();
      case "route-clear": this.route = []; this.path = []; this.routeEnc = []; this.mode = "browse"; this.renderHint(); this.renderSvg(); return this.renderPanel();
      case "route-share": return save(s => { s.route = { pts: clone(this.route), path: this.path.length ? clone(this.path) : null }; });
      case "route-unshare": return save(s => { s.route = null; });
      case "share": { const r = this.vp.getBoundingClientRect(), { w, h } = this.size(), v = this.view;
        const cx = (r.width / 2 - v.x) / (w * v.s), cy = (r.height / 2 - v.y) / (h * v.s);
        emit({ action: "open", x: cx, y: cy, s: v.s, sel: this.sel }); return ui.notifications.info(T("Карта открыта у игроков.")); }
      case "visit": return save(s => { s.visited = s.visited.includes(id) ? s.visited.filter(x => x !== id) : [...s.visited, id]; });
      case "toggle-hide": return save(s => {
        if (id.startsWith("nm")) { const p = s.markets.find(x => x.id === id); if (p) p.hidden = !p.hidden; }
        else if (id.startsWith("s")) { const p = s.shops.find(x => x.id === id); if (p) p.hidden = !p.hidden; }
        else if (id.startsWith("c")) { const p = s.pins.find(x => x.id === id); if (p) p.hidden = !p.hidden; }
        else { s.poi[id] = { ...(s.poi[id] ?? {}), hidden: !(s.poi[id]?.hidden) }; }
      });
      case "move": this.moveId = id; this.mode = "browse"; return this.setMode("move");
      case "remove-poi": {
        const p = poiById(id); if (!p || p.locked) return;
        const ok = await Dialog.confirm({ title: T("Убрать с карты"), content: `<p>${T("Убрать «")}${esc(p.name)}${T("» с карты? Вернуть можно в окне «Места».")}</p>` });
        if (!ok) return;
        this.sel = null; return save(s => { s.poi[id] = { ...(s.poi[id] ?? {}), removed: true }; });
      }
      case "places": return this.renderPlaces();
      case "mode-roads": return this.setMode("roads");
      case "brush": this.brush.t = b.dataset.t; return this.renderPanel();
      case "roads-undo": return save(s => { s.roads = (s.roads ?? []).slice(0, -1); });
      case "roads-clear": { const ok = await Dialog.confirm({ title: T("Дороги"), content: `<p>${T("Сбросить все свои правки дорог?")}</p>` }); if (ok) return save(s => { s.roads = []; }); return; }
      case "restore-poi": return save(s => { if (s.poi[id]) delete s.poi[id].removed; }).then(() => this.renderPlaces());
      case "places-all": return save(s => { for (const p of POIS) { s.poi[p.id] = { ...(s.poi[p.id] ?? {}) }; if (b.dataset.on === "1") delete s.poi[p.id].removed; else s.poi[p.id].removed = true; } }).then(() => this.renderPlaces());
      case "export": return exportData();
      case "import": return importData().then(() => this.renderPlaces());
      case "buy": return buyItem({ shopId: b.dataset.shop, i: Number(b.dataset.i) });
      case "lock-pin": return save(s => { const p = s.pins.find(x => x.id === id); if (p) p.locked = !p.locked; else if (s.poi[id] || POIS.some(x => x.id === id)) s.poi[id] = { ...(s.poi[id] ?? {}), locked: !s.poi[id]?.locked }; });
      case "del-pin": {
        const p = poiById(id); if (!p || p.locked) return;
        const ok = await Dialog.confirm({ title: T("Удалить точку"), content: `<p>${T("Удалить точку «")}${esc(p.name)}${T("»? Это не отменить.")}</p>` });
        if (!ok) return;
        this.sel = null; return save(s => { s.pins = s.pins.filter(x => x.id !== id); });
      }
      case "edit-poi": {
        const p = poiById(id);
        if (id.startsWith("c")) { const data = await pinDialog(p.name, p); if (!data) return; return save(s => { Object.assign(s.pins.find(x => x.id === id) ?? {}, data); }); }
        const data = await pinDialog(p.name, p, { base: true });
        if (!data) return;
        if (!data.img) delete data.img;
        return save(s => {
          if (id.startsWith("c")) Object.assign(s.pins.find(x => x.id === id) ?? {}, data);
          else s.poi[id] = { ...(s.poi[id] ?? {}), ...data };
        });
      }
      case "night": return save(s => { s.night = !s.night; });
      case "mode-me": return this.setMode("me");
      case "party-clear": await act("party-clear"); return this.setMode("browse");
      case "me-clear": await act("me-clear"); return this.setMode("browse");
      case "agent": return agentOn() && Agent.toggle();
      case "time": return advanceTime(Number(b.dataset.m));
      case "sc-setup": return scDialog();
      case "time-set": {
        const d = clockDate(), z = (n) => String(n).padStart(2, "0");
        const data = await formDialog(T("Время в Найт-Сити"), `<form class="ncm-form"><div class="ncm-row"><label>${T("Дата")}<input type="date" name="d" value="${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}"></label><label>${T("Время")}<input type="time" name="t" value="${z(d.getUTCHours())}:${z(d.getUTCMinutes())}"></label></div></form>`);
        if (!data) return;
        const ms = Date.parse(`${data.d}T${data.t}:00Z`); if (isNaN(ms)) return;
        return setTimeMs(ms);
      }
      case "travel": return this.travel(b.dataset.t);
      case "take": return act("take", { id });
      case "route-gig": { const q = state().quests.find(x => x.id === id); if (!q) return; const me = state().players?.[game.user.id], start = me ?? state().party; this.sel = null; this.route = start ? [{ ...start }, { x: q.x, y: q.y, gig: q.id }] : [{ x: q.x, y: q.y, gig: q.id }]; this.mode = "browse"; if (!start) return this.setMode("route"); return this.recalc(); }
      case "gen-gigs": return genGigsDialog();
      case "dossier": return openDossier(id);
      case "enc": { await doEncounter(Number(b.dataset.x), Number(b.dataset.y), b.dataset.d || null); this.lastEncDist = b.dataset.d; return this.reopen(); }
      case "enc-again": { const e = this.lastEnc; if (!e) return; if (this.routeEnc?.includes(e)) return this.rollRoute(); await doEncounter(e.x, e.y, e.distId); return this.reopen(); }
      case "enc-chat": { const e = this.lastEnc; if (e) chatEnc(e, false); return ui.notifications.info(T("Встреча отправлена в чат.")); }
      case "enc-route": return this.rollRoute();
      case "enc-clear": this.lastEnc = null; this.routeEnc = []; this.lastEncDist = null; return this.reopen();
      case "enc-own": return this.renderEncEditor();
      case "enc-add": case "enc-edit": return this.editEncounter(id);
      case "enc-del": return save(s => { s.encounters = (s.encounters ?? []).filter(x => x.id !== id); }).then(() => this.renderEncEditor());
      case "enc-mode": return save(s => { s.encMode = b.dataset.m; }).then(() => this.renderEncEditor());
      case "mook": {
        this.mookSel = b.dataset.id;
        b.closest(".ncm-mooks")?.querySelectorAll(".ncm-mook").forEach(x => x.classList.toggle("on", x === b));
        if (ev.shiftKey || ev.detail === 2) return; // двойной клик — только выбор
        const a = await fromUuid(`Compendium.${MOOK_PACK}.Actor.${b.dataset.id}`); return a?.sheet?.render(true);
      }
      case "mook-spawn": {
        const id = this.mookSel ?? b.closest(".ncm-mooks")?.querySelector(".ncm-mook")?.dataset.id; if (!id) return;
        const n = Number(b.closest(".ncm-mooks").querySelector("[data-mookn]")?.value) || 1;
        this.close(); return spawnMooks(id, n);
      }
      case "gen-gig": {
        const g = rollGig(allPois().filter(p => !p.hidden && !p.shop && !p.market), { distOf: (p) => districtAt(p.x, p.y)?.id });
        return this.editQuest(null, null, g);
      }
      case "to-party": { const pt = state().party; return pt ? this.focus(pt.x, pt.y, Math.max(this.view.s, 0.8)) : ui.notifications.info(T("Метка «Мы здесь» ещё не поставлена.")); }
      case "gen-shops": return genShopsDialog();
      case "gen-markets": return genMarketsDialog();
      case "market-reroll": return save(s => { const m = s.markets.find(x => x.id === id); if (m) m.seed = Math.floor(Math.random() * 1e9); });
      case "market-del": this.sel = null; return save(s => { s.markets = s.markets.filter(x => x.id !== id); });
      case "market-grant": {
        const u = game.users.get(b.dataset.u);
        return save(s => {
          const m = s.markets.find(x => x.id === id); if (!m || !u) return;
          m.access ??= [];
          if (m.access.includes(u.id)) { m.access = m.access.filter(x => x !== u.id); return; }
          m.access.push(u.id);
          s.messages.push({ id: rid(), to: u.id, from: m.fixer ?? T("Фиксер"), text: `${T("Слышал, ты ищешь, где закупиться. «")}${m.name}${T("» — открываются после девяти вечера. Скажешь на входе, что от меня. И не светись там с NCPD.")}`, t: nowMin(s), ts: Date.now() });
        });
      }
      case "market-ask": {
        const m = state().markets.find(x => x.id === id); if (!m) return;
        await act("msg", { to: "gm", text: `${T("Хочу попасть на Ночной рынок «")}${m.name}${T("»")}. ${m.fixer ?? T("Фиксер")}${T(", сведёшь? (моя репутация")} ${repOf(game.user)}${T(", нужно")} ${m.rep ?? 0}+)` });
        return ui.notifications.info(`${T("Сообщение для")} ${m.fixer ?? T("фиксера")} ${T("отправлено в «Агент».")}`);
      }
      case "market-edit": {
        const m = state().markets.find(x => x.id === id); if (!m) return;
        const opt = (sel) => Object.entries(MARKET_CATS).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${v.ru}</option>`).join("");
        const data = await formDialog(m.name, `<form class="ncm-form"><label>${T("Название")}<input name="name" value="${esc(m.name)}"></label>
          <div class="ncm-row"><label>${T("Фиксер")}<input name="fixer" list="ncm-fixers" value="${esc(m.fixer ?? "")}"><datalist id="ncm-fixers">${FIXERS.map(f => `<option value="${esc(f)}">`).join("")}</datalist></label>
          <label>${T("Нужна репутация")}<input name="rep" type="number" min="0" max="10" value="${m.rep ?? 0}"></label></div>
          <div class="ncm-row"><label>${T("Раздел 1")}<select name="c1">${opt(m.cats?.[0])}</select></label><label>${T("Раздел 2")}<select name="c2">${opt(m.cats?.[1])}</select></label></div>
          <label>${T("Цены, % к книге")}<input name="pct" type="number" step="5" value="${Math.round((m.markup ?? 1) * 100)}"></label>
          <label>${T("Заметки мастера")}<textarea name="notes" rows="3">${esc(m.notes ?? "")}</textarea></label></form>`);
        if (!data) return;
        return save(s => { const x = s.markets.find(y => y.id === id); Object.assign(x, { name: data.name, fixer: data.fixer, rep: Math.max(0, Math.min(10, Number(data.rep) || 0)), cats: [...new Set([data.c1, data.c2])], notes: data.notes, markup: (Number(data.pct) || 100) / 100 }); });
      }
      case "shop-reroll": return save(s => { const sh = s.shops.find(x => x.id === id); if (sh) sh.seed = Math.floor(Math.random() * 1e9); });
      case "shop-del": this.sel = null; return save(s => { s.shops = s.shops.filter(x => x.id !== id); });
      case "shop-edit": {
        const sh = state().shops.find(x => x.id === id);
        const data = await formDialog(sh.name, `<form class="ncm-form"><label>${T("Название")}<input name="name" value="${esc(sh.name)}"></label>
          <div class="ncm-row"><label>${T("Тип")}<select name="type">${Object.entries(SHOP_TYPES).map(([k, v]) => `<option value="${k}"${k === sh.type ? " selected" : ""}>${v.ru}</option>`).join("")}</select></label>
          <label>${T("Цены, % к книге")}<input name="pct" type="number" step="5" value="${Math.round((sh.markup ?? 1) * 100)}"></label></div>
          <label>${T("Заметки мастера")}<textarea name="notes" rows="3">${esc(sh.notes ?? "")}</textarea></label></form>`);
        if (!data) return;
        return save(s => { const x = s.shops.find(y => y.id === id); Object.assign(x, { name: data.name, type: data.type, notes: data.notes, markup: (Number(data.pct) || 100) / 100 }); });
      }
      case "new-quest": return this.editQuest(null, id ?? this.sel);
      case "edit-quest": return this.editQuest(id);
      case "gig-go": { const q = state().quests.find(x => x.id === id); if (q?.x != null) { this.focus(q.x, q.y, Math.max(this.view.s, 0.8)); this.selectGig(id); } return; }
      case "quest-go": { const q = state().quests.find(x => x.id === id); const p = q && poiById(q.target ?? q.giver); if (p) this.select(p.id, true); return; }
      case "quest-status": return save(s => { const q = s.quests.find(x => x.id === id); if (q) q.status = b.dataset.st; })
        .then(() => { if (b.dataset.st === "active" && game.settings.get(MID, "notify")) emit({ action: "quest", id }); });
      case "del-quest": return save(s => { s.quests = s.quests.filter(x => x.id !== id); });
    }
  }
};

/** Блок «Случайная встреча» для карточек (только мастер). */
function encBlock(x, y, distId) {
  if (!isGM()) return "";
  const e = UI.lastEnc;
  const here = e && e.key === `${x.toFixed(4)},${y.toFixed(4)}`;
  return `<div class="ncm-enc">
    <div class="ncm-enc-row"><button class="ncm-enc-roll" data-act="enc" data-x="${x}" data-y="${y}" data-d="${distId ?? ""}"><i class="fas fa-dice-d20"></i> ${T("Случайная встреча")}</button><button class="ncm-enc-own" data-act="enc-own" title="${T("Свои встречи: добавить и править")}"><i class="fas fa-list"></i></button></div>
    ${here ? encCard(e) : ""}</div>`;
}
function encCard(e) {
  return `<div class="ncm-enc-card t-${e.threat}">
    <div class="ncm-enc-top"><span>${e.own ? `<i class="fas fa-pen-nib"></i> ${T("своя встреча")}` : `${T("к10:")} ${e.roll}`} · ${T(THREAT_RU[e.threat])} · ${e.night ? T("ночь") : T("день")}</span></div>
    <b>${esc(e.title)}</b><p>${esc(e.text)}</p>
    ${e.twist ? `<div class="ncm-enc-tw"><i class="fas fa-dice-six"></i> ${e.own ? "" : `${T("к6:")} `}${e.own ? "" : e.sub} ${e.own ? "" : "— "}${esc(e.twist)}</div>` : ""}
    ${e.stats && e.stats !== "—" ? `<div class="ncm-enc-st"><i class="fas fa-user-ninja"></i> ${T("По Корке:")} ${esc(e.stats)}</div>` : ""}
    ${mookChips(e)}
    <div class="ncm-p-acts"><button data-act="enc-chat"><i class="fas fa-comment"></i> ${T("В чат всем")}</button><button data-act="enc-again"><i class="fas fa-rotate"></i> ${T("Перебросить")}</button><button data-act="enc-clear" title="${T("Убрать встречи из окна")}"><i class="fas fa-broom"></i> ${T("Очистить")}</button></div>
  </div>`;
}
const MOOK_RU = { ncpd: "NCPD", ncpd_units: "Техника NCPD", ratsec: "Корп. охрана (RatSec)", civ: "Мирные", iron: "Железные Прицелы", gangsters: "Гангстеры", thugs: "Уличная шпана",
  raffen: "Рафен (налётчики)", vaq: "Стальные Вакерос", tt: "Trauma Team", scav: "Мусорщики", vdb: "Вудуисты", arasaka: "Арасака", nightmare: "Кошмары НС", maxtac: "MaxTac",
  mael: "Мальстрём", drones: "Дроны RatSec", tyger: "Тигриные Когти", g6: "6-я улица", vamp: "Вампиры Филармонии", piranha: "Пираньи", prime: "Игроки Прайм-Тайма",
  reck: "Отступники", rcl: "Легион Красного Хрома", inq: "Инквизиторы", militech: "Милитех", biotech: "Биотехника", bozos: "Бозо" };
const mookPackOk = () => !!game.packs?.get(MOOK_PACK);
/** Противники встречи из Mook Pack: лист по клику, «на сцену» — токены у центра экрана. */
function mookChips(e) {
  if (!e.mooks?.length || !mookPackOk()) return "";
  return `<div class="ncm-mooks">${[...new Set(e.mooks)].map(k => `<div class="ncm-mg"><span>${esc(MOOK_RU[k] ?? k)}</span>${(MOOKS[k] ?? []).map(m =>
    `<button class="ncm-mook" data-act="mook" data-id="${m.id}" title="${T("Открыть лист · ПЗ")} ${m.hp}"><img src="${esc(m.img ?? "")}" alt="" onerror="this.remove()">${esc(m.n)} <small>${m.hp}</small></button>`).join("")}</div>`).join("")}
    <div class="ncm-mook-place"><label>${T("На сцену:")} <input type="number" min="1" max="12" value="${Math.max(1, game.users?.filter(u => !u.isGM && u.active).length || 3)}" data-mookn></label>
    <button data-act="mook-spawn"><i class="fas fa-person-rifle"></i> ${T("Выставить выбранного")}</button></div></div>`;
}
async function mookActor(id) {
  const uuid = `Compendium.${MOOK_PACK}.Actor.${id}`;
  let a = game.actors.find(x => x.getFlag(MID, "mook") === id);
  if (a) return a;
  const pack = game.packs.get(MOOK_PACK);
  let folder = game.folders.find(f => f.type === "Actor" && ["Найт-Сити · встречи", T("Найт-Сити · встречи")].includes(f.name));
  folder ??= await Folder.create({ name: T("Найт-Сити · встречи"), type: "Actor", color: "#ff2a6d" });
  a = await game.actors.importFromCompendium(pack, id, { folder: folder.id, [`flags.${MID}.mook`]: id });
  await a?.setFlag(MID, "mook", id);
  return a ?? fromUuid(uuid);
}
async function spawnMooks(id, n) {
  if (!canvas?.scene) return ui.notifications.warn(T("Карта: нет активной сцены."));
  const a = await mookActor(id); if (!a) return;
  const g = canvas.grid.size, c = canvas.stage.pivot;
  const base = (await a.getTokenDocument()).toObject();
  const docs = Array.from({ length: n }, (_, i) => ({ ...base, x: Math.round((c.x + (i % 4) * g - g * 1.5) / g) * g, y: Math.round((c.y + Math.floor(i / 4) * g) / g) * g, hidden: true }));
  await canvas.scene.createEmbeddedDocuments("Token", docs);
  ui.notifications.info(`${T("На сцену:")} ${a.name} ×${n} ${T("(скрыты — откройте, когда нужно).")}`);
}

async function doEncounter(x, y, distId, { toGM = true } = {}) {
  const dist = DISTRICTS.find(d => d.id === distId) ?? districtAt(x, y);
  const threat = threatOf(dist, zoneAt(x, y));
  const st = state();
  const e = rollEncounter({ distId: dist?.id, threat, night: isNight(), custom: st.encounters ?? [], mode: st.encMode ?? "mix" });
  e.key = `${x.toFixed(4)},${y.toFixed(4)}`; e.x = x; e.y = y; e.distId = dist?.id; e.where = streetNear(x, y)?.ru ?? dist?.ru ?? "";
  UI.lastEnc = e;
  if (toGM) chatEnc(e, true);
  return e;
}
function chatEnc(e, gmOnly) {
  const content = `<div class="ncm-chat"><div class="ncm-chat-k">${T("СЛУЧАЙНАЯ ВСТРЕЧА ·")} ${esc(e.where)}</div><b>${esc(e.title)}</b><p>${esc(e.text)}</p><p><i>${esc(e.twist)}</i></p>${gmOnly && e.stats !== "—" ? `<small>${T("Статы:")} ${esc(e.stats)}</small>` : ""}</div>`;
  return ChatMessage.create({ content, speaker: { alias: T("Найт-Сити") }, whisper: gmOnly ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [] });
}

/* ================================================================ досье места: арт + текст в стиле терминала */

const poiArt = (p) => p?.img || (p?.n ? `modules/${MID}/assets/poi/p${p.n}.webp` : "");
const hex = (n) => (n * 2654435761 >>> 0).toString(16).toUpperCase().padStart(8, "0");

/** Арт на весь экран: клик — увеличить ×2.5 в точке клика, тянуть — двигать, колесо — масштаб, Esc/✕ — закрыть. */
function openZoom(src) {
  document.getElementById("ncm-zoom")?.remove();
  const el = document.createElement("div");
  el.id = "ncm-zoom";
  el.innerHTML = `<img src="${esc(src)}" alt="" draggable="false"><div class="nz-x">✕</div><div class="nz-h">${T("клик — увеличить · колесо — масштаб · тяни — двигай · Esc — закрыть")}</div>`;
  document.body.appendChild(el);
  const img = el.querySelector("img");
  let s = 1, x = 0, y = 0, drag = null, raf = 0;
  const apply = () => { raf = 0; img.style.transform = `translate(${x}px, ${y}px) scale(${s})`; el.classList.toggle("z", s > 1); };
  const sched = () => { if (!raf) raf = requestAnimationFrame(apply); };
  const zoomTo = (ns, cx, cy) => {
    ns = Math.min(6, Math.max(1, ns));
    const r = el.getBoundingClientRect(), ox = cx - r.width / 2, oy = cy - r.height / 2;
    x = ox - (ox - x) * (ns / s); y = oy - (oy - y) * (ns / s); s = ns;
    if (s === 1) { x = 0; y = 0; }
    sched();
  };
  const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 200); document.removeEventListener("keydown", key, true); };
  const key = (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } };
  document.addEventListener("keydown", key, true);
  el.addEventListener("wheel", (ev) => { ev.preventDefault(); zoomTo(s * (ev.deltaY < 0 ? 1.2 : 1 / 1.2), ev.clientX, ev.clientY); }, { passive: false });
  el.addEventListener("pointerdown", (ev) => { if (ev.target.closest(".nz-x")) return; drag = { x: ev.clientX, y: ev.clientY, ox: x, oy: y, moved: false }; el.setPointerCapture(ev.pointerId); });
  el.addEventListener("pointermove", (ev) => {
    if (!drag) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved && s > 1) { x = drag.ox + dx; y = drag.oy + dy; sched(); }
  });
  el.addEventListener("pointerup", (ev) => {
    const d = drag; drag = null;
    if (ev.target.closest(".nz-x")) return close();
    if (d && !d.moved) zoomTo(s > 1 ? 1 : 2.5, ev.clientX, ev.clientY);
  });
  requestAnimationFrame(() => el.classList.add("on"));
}

function openDossier(id, { remote = false } = {}) {
  const p = poiById(id) ?? POIS.find(x => x.id === id);
  if (!p) return;
  document.getElementById("ncm-dossier")?.remove();
  const d = districtAt(p.x, p.y), st = streetNear(p.x, p.y), z = zoneAt(p.x, p.y);
  const threat = threatOf(d, z), c = (CATS[p.cat] ?? CATS.custom).color;
  const qs = questsVisible().filter(q => (q.target === p.id || q.giver === p.id) && q.status === "active");
  const el = document.createElement("div");
  el.id = "ncm-dossier";
  el.style.setProperty("--c", c);
  el.innerHTML = `
    <div class="nd-back"></div>
    <div class="nd-frame">
      <div class="nd-bar"><span>NCNET://CITY.DB/POI/${String(p.n ?? "X").padStart(3, "0")}</span><span class="nd-blink">● LIVE</span><span>ID ${hex(p.n ?? 7)}</span>
        ${isGM() && !remote ? `<button data-nd="share" title="${T("Показать всем игрокам")}"><i class="fas fa-satellite-dish"></i> ${T("ВСЕМ")}</button>` : ""}<button data-nd="close" title="${T("Закрыть (Esc)")}">✕</button></div>
      <div class="nd-art"><img src="${esc(poiArt(p))}" alt=""><div class="nd-scan"></div><div class="nd-corner tl"></div><div class="nd-corner tr"></div><div class="nd-corner bl"></div><div class="nd-corner br"></div>
        <div class="nd-zoomhint">${T("⊕ УВЕЛИЧИТЬ")}</div><div class="nd-tag">${esc((CATS[p.cat] ?? CATS.custom).ru)}${p.n ? ` · ${T("№")}${p.n}` : ""}</div></div>
      <div class="nd-body">
        <div class="nd-title"><h1 data-text="${esc(p.name)}">${esc(p.name)}</h1>${p.en ? `<small>${esc(p.en)}</small>` : ""}</div>
        <div class="nd-meta">
          ${d ? `<div><span>${T("РАЙОН")}</span><b>${esc(d.ru)}</b></div>` : ""}
          ${st ? `<div><span>${T("АДРЕС")}</span><b>${esc(st.ru)}</b></div>` : ""}
          <div class="th-${threat}"><span>${T("УГРОЗА")}</span><b>${esc(THREAT_RU[threat])}</b></div>
        </div>
        <div class="nd-text"><span class="nd-prompt">&gt;_</span> <span class="nd-type"></span><span class="nd-cursor">█</span></div>
        ${qs.length ? `<div class="nd-jobs"><span>${T("// ДОСТУПНЫЕ ЗАКАЗЫ")}</span>${qs.map(q => `<div>▸ ${esc(q.title)}${q.reward ? ` <em>${esc(q.reward)}</em>` : ""}</div>`).join("")}</div>` : ""}
      </div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("on"));
  // печать текста
  const text = p.desc ?? "", out = el.querySelector(".nd-type");
  let i = 0; const t = setInterval(() => { i += 2; out.textContent = text.slice(0, i); if (i >= text.length) clearInterval(t); }, 14);
  const close = () => { clearInterval(t); el.classList.remove("on"); setTimeout(() => el.remove(), 300); document.removeEventListener("keydown", key, true); };
  const key = (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } };
  document.addEventListener("keydown", key, true);
  el.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-nd]");
    if (b?.dataset.nd === "share") { emit({ action: "dossier", id }); return ui.notifications.info(T("Досье показано игрокам.")); }
    if (b?.dataset.nd === "close" || ev.target.classList.contains("nd-back")) return close();
    if (ev.target.closest(".nd-art")) openZoom(poiArt(p));
  });
}

function qcard(q) {
  const t = q.target && poiById(q.target), g = q.giver && poiById(q.giver);
  return `<div class="ncm-qcard st-${q.status}">
    <div class="ncm-qc-top"><b>${esc(q.title || T("Без названия"))}</b><span class="ncm-qst">${QSTATUS[q.status]}</span></div>
    ${q.takenBy ? `<div class="ncm-qc-fx"><i class="fas fa-user-check"></i> ${T("Взял:")} ${esc(q.takenBy)}</div>` : ""}
    ${q.x != null ? `<button class="ncm-qc-go" data-act="gig-go" data-id="${q.id}"><i class="fas fa-location-crosshairs"></i> ${T("На карте")}</button>` : ""}
    ${q.fixer ? `<div class="ncm-qc-fx"><i class="fas fa-user-secret"></i> ${esc(q.fixer)}</div>` : ""}
    ${q.desc ? `<p>${esc(q.desc)}</p>` : ""}
    <div class="ncm-qc-meta">
      ${g ? `<button data-poi="${g.id}"><i class="fas fa-handshake"></i> ${esc(g.name)}</button>` : ""}
      ${t ? `<button data-poi="${t.id}"><i class="fas fa-crosshairs"></i> ${esc(t.name)}</button>` : ""}
      ${q.reward ? `<span class="ncm-eb">${esc(q.reward)}</span>` : ""}
    </div>
    ${isGM() && q.notes ? `<div class="ncm-gm"><p>${esc(q.notes)}</p></div>` : ""}
    ${isGM() ? `<div class="ncm-qc-acts">
      <button data-act="edit-quest" data-id="${q.id}"><i class="fas fa-pen"></i></button>
      ${q.status === "hidden" ? `<button data-act="quest-status" data-st="offer" data-id="${q.id}" title="${T("Игроки увидят «?» на карте")}">${T("Слух")}</button>` : ""}
      ${q.status !== "active" ? `<button data-act="quest-status" data-st="active" data-id="${q.id}">${T("Выдать")}</button>` : ""}
      ${q.status === "active" ? `<button data-act="quest-status" data-st="done" data-id="${q.id}">${T("Выполнен")}</button><button data-act="quest-status" data-st="failed" data-id="${q.id}">${T("Провален")}</button>` : ""}
      <button class="danger" data-act="del-quest" data-id="${q.id}"><i class="fas fa-trash"></i></button></div>` : ""}
  </div>`;
}

/* ================================================================ «Мы здесь» и магазины */

/** Метку ставит мастер напрямую, игрок — через мастера (сокет). Видят все. */
async function setParty(f) {
  if (isGM()) return save(s => { s.party = { x: f.x, y: f.y }; });
  if (!game.users.activeGM) return ui.notifications.warn(T("Карта: метку сохраняет мастер — сейчас его нет в игре."));
  emit({ action: "party", x: f.x, y: f.y, user: game.user.name });
  ui.notifications.info(T("Метка «Мы здесь» отправлена."));
}

const SHOP_WEIGHTS = { food: 6, clothes: 4, guns: 3, tech: 3, gear: 2, med: 2, ripper: 3, armor: 1 };
const NO_SHOPS = new Set(["norcal", "morro", "oldcorp", "delbay", "sanbay"]);
const PRICEY = { exec: 1.3, westbrook: 1.2, marina: 1.1, glen: 1.05 };

/** Случайные точки на настоящих улицах (не пустыри, не Зона Поражения), не ближе minD к занятым. */
/** Без сетки улиц: точки вокруг центров районов. */
function districtSpots(n, taken, minD, skip = NO_SHOPS) {
  const ds = DISTRICTS.filter(d => !skip.has(d.id) && !["delbay", "sanbay"].includes(d.id)), out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 400 && ds.length) {
    const d = ds[Math.floor(Math.random() * ds.length)];
    const x = d.x + (Math.random() - .5) * 0.07, y = d.y + (Math.random() - .5) * 0.07;
    if (districtAt(x, y)?.id !== d.id || zoneAt(x, y) === "hot") continue;
    if (taken.some(p => Math.hypot(p.x - x, (p.y - y) * aspect) < minD)) continue;
    out.push({ x, y, d }); taken.push({ x, y });
  }
  return out;
}
function streetSpots(n, taken, minD = 0.022) {
  if (!GRID.cell) return districtSpots(n, taken, minD);
  const { w, h, cell } = GRID, out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 400) {
    const i = Math.floor(Math.random() * cell.length);
    if (cell[i] !== 1) continue;
    const x = (i % w) / (w - 1), y = ((i / w) | 0) / (h - 1);
    if (x > 0.93 || y > 0.965 || x < 0.03 || y < 0.03) continue; // края карты и трасса I-101
    let open = 0; const cx = i % w, cy = (i / w) | 0;
    for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) if (cell[(cy + dy) * w + cx + dx] === 1) open++;
    if (open > 17) continue;
    const d = districtAt(x, y);
    if (!d || NO_SHOPS.has(d.id) || zoneAt(x, y) === "hot") continue;
    if (taken.some(p => Math.hypot(p.x - x, (p.y - y) * aspect) < minD)) continue;
    out.push({ x, y, d }); taken.push({ x, y });
  }
  return out;
}

async function genMarketsDialog() {
  const data = await formDialog(T("Ночные рынки"), `<form class="ncm-form">
    <p>${T("Ночной рынок — не магазин: его устраивает фиксер, работает он только ночью, а пускают туда по репутации и рекомендации. Товар — два раздела из таблицы Корки (1к6 дважды).")}</p>
    <div class="ncm-row"><label>${T("Сколько рынков")}<input name="count" type="number" min="1" max="20" value="6"></label>
    <label>${T("Репутация от")}<input name="rmin" type="number" min="0" max="10" value="2"></label><label>${T("до")}<input name="rmax" type="number" min="0" max="10" value="7"></label></div>
    <label class="ncm-check"><input type="checkbox" name="replace" checked> ${T("Заменить уже расставленные")}</label>
    <label class="ncm-check"><input type="checkbox" name="hidden"> ${T("Скрыть от игроков")}</label></form>`);
  if (!data) return;
  return placeMarkets({ n: Number(data.count) || 6, lo: Number(data.rmin) || 0, hi: Number(data.rmax) || 0, replace: !!data.replace, hidden: !!data.hidden });
}
async function placeMarkets({ n = 6, lo = 2, hi = 7, replace = true, hidden = false, quiet = false } = {}) {
  await loadGrid();
  n = Math.max(1, Math.min(20, n));
  lo = Math.max(0, Math.min(10, lo)); hi = Math.max(0, Math.min(10, hi)); if (hi < lo) [lo, hi] = [hi, lo];
  const data = { hidden };
  const existing = replace ? [] : (state().markets ?? []);
  const taken = [...allPois().filter(p => !p.market), ...existing].map(p => ({ x: p.x, y: p.y }));
  const keys = Object.keys(MARKET_CATS), names = [...MARKET_NAMES].sort(() => Math.random() - 0.5), out = [];
  const roll = (a) => a[Math.floor(Math.random() * a.length)];
  for (const { x, y, d } of streetSpots(n, taken, 0.05)) {
    const c1 = roll(keys); let c2 = roll(keys); while (c2 === c1) c2 = roll(keys);
    const rich = PRICEY[d.id] ? 2 : zoneAt(x, y) === "combat" ? -1 : 0;
    const rep = Math.max(lo, Math.min(hi, lo + Math.floor(Math.random() * (hi - lo + 1)) + rich));
    out.push({ id: `nm${rid()}`, name: names.pop() ?? `${T("Ночной рынок ·")} ${streetNear(x, y)?.ru ?? d.ru}`, x, y, fixer: roll(FIXERS), rep, cats: [c1, c2],
      seed: Math.floor(Math.random() * 1e9), markup: Math.round((0.85 + Math.random() * 0.3) * 20) / 20, access: [], hidden: !!data.hidden });
  }
  await save(s => { s.markets = [...existing, ...out]; });
  if (!quiet) ui.notifications.info(`${T("Ночных рынков:")} ${out.length}.`);
  UI.filter.add("market");
}

async function genShopsDialog() {
  const data = await formDialog(T("Случайные магазины"), `<form class="ncm-form">
    <p>${T("Магазины встанут на улицы по всему городу. Ассортимент — по Корке Cyberpunk RED, цены — категории книги с наценкой района.")}</p>
    <label>${T("Сколько магазинов")}<input name="count" type="number" min="1" max="120" value="30"></label>
    <label class="ncm-check"><input type="checkbox" name="replace" checked> ${T("Заменить уже расставленные")}</label>
    <label class="ncm-check"><input type="checkbox" name="hidden"> ${T("Скрыть от игроков (откроете по одному)")}</label></form>`);
  if (!data) return;
  return placeShops({ n: Number(data.count) || 30, replace: !!data.replace, hidden: !!data.hidden });
}
async function placeShops({ n = 30, replace = true, hidden = false, quiet = false } = {}) {
  await loadGrid();
  n = Math.max(1, Math.min(120, n));
  const data = { hidden };
  const st = state(), existing = replace ? [] : (st.shops ?? []);
  const taken = [...allPois().filter(p => !p.shop), ...existing].map(p => ({ x: p.x, y: p.y }));
  const bag = Object.entries(SHOP_WEIGHTS).flatMap(([k, w]) => Array(w).fill(k));
  const out = [], usedNames = new Set(existing.map(x => x.name));
  for (const { x, y, d } of streetSpots(n, taken)) {
    const type = bag[Math.floor(Math.random() * bag.length)], t = SHOP_TYPES[type];
    let name = t.names[Math.floor(Math.random() * t.names.length)];
    if (usedNames.has(name)) name = `${name} · ${(streetNear(x, y)?.ru ?? d.ru)}`;
    usedNames.add(name);
    const base = PRICEY[d.id] ?? (zoneAt(x, y) === "combat" ? 1.15 : 1);
    const markup = Math.round(base * (0.9 + Math.random() * 0.25) * 20) / 20;
    out.push({ id: `s${rid()}`, type, name, x, y, seed: Math.floor(Math.random() * 1e9), markup, hidden: !!data.hidden });
  }
  await save(s => { s.shops = [...existing, ...out]; });
  if (!quiet) ui.notifications.info(`${T("Расставлено магазинов:")} ${out.length}.`);
  if (!UI.filter.has("shop")) UI.filter.add("shop");
}

/* ================================================================ диалоги */

/* ================================================================ покупки в магазинах и на Ночных рынках */

const priceOf = (it, mk = 1) => Math.round(TIERS[it.tier].eb * mk / 5) * 5 || TIERS[it.tier].eb;
const buyMode = () => { try { return game.settings.get(MID, "shopBuy"); } catch (e) { return "gm"; } };
function buyCell(shopId, it) {
  if (isGM() || buyMode() === "off" || !game.user.character) return "";
  return `<td class="ncm-buy"><button data-act="buy" data-shop="${shopId}" data-i="${it.i}" title="${T("Купить")}"><i class="fas fa-cart-plus"></i></button></td>`;
}
/** Товар по магазину и номеру в ассортименте (ассортимент детерминирован по seed — одинаков у всех). */
function stockItem(shopId, i) {
  const s = state(), sh = s.shops.find(x => x.id === shopId), m = s.markets.find(x => x.id === shopId);
  const list = sh ? stockFor(sh.type, sh.seed) : m ? marketStock(m.cats ?? [], m.seed) : [];
  const it = list[i]; if (!it) return null;
  const place = sh ?? m;
  return { ...it, price: priceOf(it, place.markup ?? 1), shop: place.name, market: !!m };
}
const wealthOf = (a) => Number(a?.system?.wealth?.value);
async function buyItem({ shopId, i }) {
  const it = stockItem(shopId, i), actor = game.user.character;
  if (!it || !actor) return ui.notifications.warn(T("Нужен назначенный персонаж, чтобы покупать."));
  const w = wealthOf(actor);
  const ok = await Dialog.confirm({ title: T("Покупка"), content: `<p>${T("Купить «")}${esc(it.n)}${T("» за")} <b>${it.price} eb</b>?</p>${Number.isFinite(w) ? `<p>${T("На счету:")} ${w} eb</p>` : ""}${buyMode() === "gm" ? `<p><i>${T("Мастер должен подтвердить покупку.")}</i></p>` : ""}` });
  if (!ok) return;
  if (Number.isFinite(w) && w < it.price) return ui.notifications.warn(T("Не хватает эдди."));
  if (buyMode() === "auto") return doPurchase(actor, it);
  await act("buy", { shopId, i, actorId: actor.id });
  ui.notifications.info(T("Запрос на покупку отправлен мастеру."));
}
async function gmApproveBuy(d, user) {
  const it = stockItem(d.shopId, d.i), actor = game.actors.get(d.actorId);
  if (!it || !actor) return;
  const who = actor.name ?? user?.name;
  const ok = buyMode() === "auto" ? true : await Dialog.confirm({ title: T("Покупка"),
    content: `<p><b>${esc(who)}</b> ${T("хочет купить «")}${esc(it.n)}${T("» за")} <b>${it.price} eb</b> ${T("в «")}${esc(it.shop)}${T("»")}.</p>${Number.isFinite(wealthOf(actor)) ? `<p>${T("На счету:")} ${wealthOf(actor)} eb</p>` : ""}` });
  if (!ok) return ChatMessage.create({ speaker: { alias: it.shop }, whisper: [user?.id].filter(Boolean), content: `<div class="ncm-chat"><div class="ncm-chat-k">${T("ПОКУПКА ОТКЛОНЕНА")}</div>${esc(it.n)}</div>` });
  return doPurchase(actor, it);
}
/** Найти предмет в компендиумах системы по английскому имени. */
let ITEM_INDEX = null;
async function findSystemItem(name) {
  const norm = (s) => String(s ?? "").toLowerCase().replace(/\(.*?\)|×\s*\d+/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  if (!ITEM_INDEX) {
    ITEM_INDEX = new Map();
    for (const pack of game.packs ?? []) {
      if (pack.documentName !== "Item" || pack.metadata?.packageType !== "system") continue;
      try { for (const e of await pack.getIndex()) { const k = norm(e.name); if (k && !ITEM_INDEX.has(k)) ITEM_INDEX.set(k, `${pack.collection}.${e._id}`); } } catch (e) { /* пак не открылся */ }
    }
  }
  const tries = [name, String(name).split(" / ")[0], String(name).split(",")[0]].map(norm);
  for (const k of tries) {
    const ref = ITEM_INDEX.get(k); if (!ref) continue;
    const [pk, id] = [ref.slice(0, ref.lastIndexOf(".")), ref.slice(ref.lastIndexOf(".") + 1)];
    const doc = await game.packs.get(pk)?.getDocument(id);
    if (doc) { const o = doc.toObject(); delete o._id; return o; }
  }
  return null;
}
async function doPurchase(actor, it) {
  const cpr = typeof actor.deltaLedgerProperty === "function" && Number.isFinite(wealthOf(actor));
  if (cpr && wealthOf(actor) < it.price) return ui.notifications.warn(`${actor.name}: ${T("не хватает эдди.")}`);
  if (cpr) await actor.deltaLedgerProperty("wealth", -it.price, `${it.n} — ${it.shop}`);
  let data = await findSystemItem(it.en ?? it.n);
  if (!data && game.system.id === "cyberpunk-red-core") data = { name: it.n, type: "gear", system: { price: { market: it.price } } };
  let added = false;
  if (data) { try { await actor.createEmbeddedDocuments("Item", [data]); added = true; } catch (e) { console.warn(MID, e); } }
  ChatMessage.create({ speaker: { alias: it.shop }, content: `<div class="ncm-chat"><div class="ncm-chat-k">${it.market ? T("НОЧНОЙ РЫНОК") : T("ПОКУПКА")}</div><b>${esc(actor.name)}</b> ${T("покупает «")}${esc(it.n)}${T("» за")} ${it.price} eb.${cpr ? "" : `<br><i>${T("Спишите эдди вручную.")}</i>`}${added ? "" : `<br><i>${T("Предмет добавьте на лист вручную.")}</i>`}</div>` });
}

/* ================================================================ экспорт и импорт мест */

const EXPORT_KEYS = ["pins", "poi", "encounters", "encMode", "shops", "markets", "quests", "roads", "contacts"];
function exportData() {
  const s = state(), out = { module: MID, version: game.modules.get(MID)?.version, ...Object.fromEntries(EXPORT_KEYS.map(k => [k, s[k]])) };
  const dl = foundry.utils.saveDataToFile ?? globalThis.saveDataToFile;
  dl(JSON.stringify(out, null, 1), "application/json", "night-city-map.json");
}
async function importData() {
  const file = await new Promise(res => { const i = document.createElement("input"); i.type = "file"; i.accept = ".json,application/json"; i.onchange = () => res(i.files[0]); i.click(); });
  if (!file) return;
  let d; try { d = JSON.parse(await file.text()); } catch (e) { return ui.notifications.error(T("Это не файл карты Найт-Сити.")); }
  if (d?.module !== MID) return ui.notifications.error(T("Это не файл карты Найт-Сити."));
  const ok = await Dialog.confirm({ title: T("Импорт"), content: `<p>${T("Заменить места, свои точки, встречи, магазины и заказы данными из файла?")}</p>` });
  if (!ok) return;
  await save(s => { for (const k of EXPORT_KEYS) if (d[k] !== undefined) s[k] = d[k]; });
  ui.notifications.info(T("Импорт готов."));
}

/** Своя точка мастера: категория, описание, картинка для досье, защита от удаления. */
function pinDialog(title, p = {}, { base = false } = {}) {
  const cats = Object.entries(CATS).filter(([k]) => !["shop", "market"].includes(k));
  return formDialog(title, `<form class="ncm-form">
    <label>${T("Название")}<input name="name" value="${esc(p.name ?? "")}" placeholder="${T("Схрон Мальстрема")}"></label>
    <label>${T("Категория")}<select name="cat">${cats.map(([k, c]) => `<option value="${k}"${(p.cat ?? "custom") === k ? " selected" : ""}>${c.ru}</option>`).join("")}</select></label>
    <label>${T("Описание (видят игроки)")}<textarea name="desc" rows="4">${esc(p.desc ?? "")}</textarea></label>
    <label>${T("Картинка для досье")}<span class="ncm-fp"><input name="img" value="${esc(p.img ?? "")}" placeholder="${base ? T("пусто — арт модуля") : "worlds/…/bar.webp"}"><button type="button" data-fp="img" title="${T("Выбрать файл")}"><i class="fas fa-file-image"></i></button></span></label>
    <label>${T("Заметки мастера")}<textarea name="notes" rows="2">${esc(p.notes ?? "")}</textarea></label>
    <label class="ncm-check"><input type="checkbox" name="hidden" ${p.hidden ? "checked" : ""}> ${T("Скрыть от игроков")}</label>
    <label class="ncm-check"><input type="checkbox" name="locked" ${p.locked ? "checked" : ""}> ${T("Защитить от удаления")}</label></form>`);
}

function formDialog(title, content, okLabel = T("Сохранить")) {
  return new Promise(resolve => {
    new Dialog({
      title, content,
      buttons: {
        ok: { icon: '<i class="fas fa-check"></i>', label: okLabel, callback: (html) => {
          const form = (html[0] ?? html).querySelector("form");
          const fd = new FormDataExtended(form).object;
          for (const cb of form.querySelectorAll("input[type=checkbox]")) fd[cb.name] = cb.checked;
          resolve(fd);
        } },
        cancel: { label: T("Отмена"), callback: () => resolve(null) }
      },
      default: "ok", close: () => resolve(null),
      render: (html) => {
        const root = html?.[0] ?? html;
        root?.querySelectorAll?.("[data-fp]").forEach(btn => btn.addEventListener("click", () => {
          const inp = root.querySelector(`[name="${btn.dataset.fp}"]`);
          const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
          if (FP) new FP({ type: "image", current: inp.value, callback: (path) => { inp.value = path; } }).render(true);
        }));
        root?.querySelector?.("[data-actor]")?.addEventListener("change", (ev) => {
          const a = game.actors.get(ev.target.value); if (!a) return;
          root.querySelector('[name="from"]').value = a.name;
          root.querySelector('[name="img"]').value = a.img && !a.img.includes("mystery-man") ? a.img : "";
        });
      }
    }, { classes: ["ncm-dialog"], width: 480 }).render(true);
  });
}

/* ================================================================ сокет и уведомления */

function emit(data) { game.socket.emit(SOCKET, data); }

function questToast(q) {
  const t = document.createElement("div");
  t.className = "ncm-toast";
  t.innerHTML = `<div class="ncm-toast-k">${T("НОВЫЙ ЗАКАЗ")}</div><b>${esc(q.title)}</b>${q.fixer ? `<span>${T("от")} ${esc(q.fixer)}</span>` : ""}${q.reward ? `<em>${esc(q.reward)}</em>` : ""}`;
  t.addEventListener("click", () => { const p = poiById(q.target ?? q.giver); UI.open().then(() => { if (p) setTimeout(() => UI.select(p.id, true), 300); }); t.remove(); });
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("on"));
  setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 7000);
}

/* ================================================================ язык */

const IMG_RU = `modules/${MID}/assets/night-city-2045.webp`, IMG_EN = `modules/${MID}/assets/night-city-2045-en.webp`;
/** Картинка карты: своя из настроек или встроенная на языке карты. */
function mapImage() {
  const v = game.settings.get(MID, "image");
  return v === IMG_RU && !isRu() ? IMG_EN : v;
}

/** Не-русский язык: переводим справочники на месте (один раз за сессию). Поля .ru = «отображаемое имя». */
function localizeData() {
  const tr = (o, f = "ru") => { if (o?.[f]) { o._ru ??= o[f]; o[f] = T(o._ru); } };
  Object.values(CATS).forEach(c => tr(c));
  TRANSPORT.forEach(t => tr(t));
  for (const k of Object.keys(QSTATUS)) QSTATUS[k] = T(QSTATUS[k]);
  DANGER.forEach((v, i) => { DANGER[i] = T(v); });
  DOW.forEach((v, i) => { DOW[i] = T(v); });
  for (const k of Object.keys(MOOK_RU)) MOOK_RU[k] = T(MOOK_RU[k]);
  for (const k of Object.keys(THREAT_RU)) THREAT_RU[k] = T(THREAT_RU[k]);
  FIXERS.forEach((v, i) => { FIXERS[i] = T(v); });
  MARKET_NAMES.forEach((v, i) => { MARKET_NAMES[i] = T(v); });
  Object.values(TIERS).forEach(t => tr(t));
  Object.values(MARKET_CATS).forEach(m => tr(m));
  Object.values(SHOP_TYPES).forEach(t => { tr(t); t.names = t.names.map(T); });
  Object.values(CATALOG).forEach(c => tr(c));
  // места, районы, улицы: английские названия есть в данных
  for (const p of POIS) { p._ru ??= { name: p.name, desc: p.desc }; p.name = p.en || p.name; p.desc = T(p._ru.desc); p.en = ""; }
  for (const d of DISTRICTS) { d._ru ??= { ru: d.ru, desc: d.desc }; d.ru = d.en || d.ru; d.desc = T(d._ru.desc); d.en = ""; }
  for (const st of STREETS) { st._ru ??= st.ru; st.ru = st.en || st.ru; }
}
Hooks.once("setup", () => { if (freezeLang() !== "ru") localizeData(); });

Hooks.once("ready", () => {
  game.socket.on(SOCKET, (d) => {
    if (!d) return;
    if (d.action === "op") { if (game.user === game.users.activeGM) applyOp(d.op, d.data, game.users.get(d.user)); return; }
    if (d.action === "party") { if (game.user === game.users.activeGM) save(s => { s.party = { x: d.x, y: d.y }; }); return; }
    if (String(d.action).startsWith("call")) return Call.onSocket(d);
    if (isGM()) return;
    if (d.action === "open") { UI.open().then(() => setTimeout(() => { UI.focus(d.x, d.y, d.s); if (d.sel) UI.select(d.sel); }, 120)); }
    if (d.action === "dossier") return openDossier(d.id, { remote: true });
    if (d.action === "quest") { const q = state().quests.find(x => x.id === d.id); if (q) questToast(q); }
  });
  game.modules.get(MID).api = { open: () => UI.open(), close: () => UI.close(), ui: UI, agent: () => agentOn() && Agent.toggle(), call: (o) => Call.start(o ?? {}) };
  Agent.seen = new Set(state().messages.map(m => m.id));
  if (agentOn() && game.settings.get(MID, "agentAuto")) setTimeout(() => Agent.open(), 1200);
  // Первый запуск у мастера: город сразу с магазинами и Ночными рынками
  if (game.user === game.users.activeGM && !game.settings.get(MID, "autoPlaced")) setTimeout(async () => {
    try {
      const s = state();
      if (!(s.shops ?? []).length) await placeShops({ n: 30, quiet: true });
      if (!(s.markets ?? []).length) await placeMarkets({ n: 6, quiet: true });
      await game.settings.set(MID, "autoPlaced", true);
      ui.notifications.info(T("Карта Найт-Сити: расставлены магазины и Ночные рынки. Перегенерировать — кнопками «Магазины» и «Ночные рынки» на карте."));
    } catch (e) { console.error(MID, e); }
  }, 2000);
  globalThis.NightCityMap = game.modules.get(MID).api;
  game.modules.get(MID).api.setupCalendar = setupCalendar;
  // Мастеру — один раз предложить настроить Simple Calendar
  if (game.user === game.users.activeGM && scApi() && !game.settings.get(MID, "scAsked")) {
    setTimeout(() => !scLinked() && scDialog({ first: true }), 2500);
  }
});

/* ================================================================ кнопки запуска */

Hooks.on("getSceneControlButtons", (controls) => {
  const tok = controls.find?.(c => c.name === "token");
  tok?.tools?.push({ name: "ncm", title: T("Карта Найт-Сити (Shift+M)"), icon: "fas fa-city", button: true, onClick: () => UI.toggle() });
  if (agentOn()) tok?.tools?.push({ name: "ncm-agent", title: T("Агент — заказы и сообщения (Shift+A)"), icon: "fas fa-mobile-screen", button: true, onClick: () => Agent.toggle() });
});
Hooks.on("renderJournalDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".ncm-dir-btn")) return;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "ncm-dir-btn";
  btn.innerHTML = `<i class="fas fa-city"></i> ${T("Карта Найт-Сити")}`;
  btn.addEventListener("click", () => UI.open());
  (root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root).append(btn);
});

/* ================================================================ случайные заказы на карту */

async function genGigsDialog() {
  const data = await formDialog(T("Заказы на карту"), `<form class="ncm-form">
    <p>${T("Случайные заказы появятся на улицах города. «?» — слух, игроки видят его и могут взять заказ; скрытые видит только мастер.")}</p>
    <label>${T("Сколько заказов")}<input name="count" type="number" min="1" max="30" value="6"></label>
    <label>${T("Статус")}<select name="status"><option value="offer">${T("Слух — видят игроки («?»)")}</option><option value="hidden">${T("Скрыт — только мастер")}</option></select></label>
    <label class="ncm-check"><input type="checkbox" name="replace"> ${T("Убрать старые невзятые заказы с карты")}</label></form>`);
  if (!data) return;
  const gridOk = await loadGrid();
  const n = Math.max(1, Math.min(30, Number(data.count) || 6));
  const pois = allPois().filter(p => !p.hidden && !p.shop && !p.market);
  const { w, h, cell } = GRID, out = [];
  const taken = [...allPois(), ...state().quests.filter(q => q.x != null)].map(p => ({ x: p.x, y: p.y }));
  let tries = 0;
  if (!gridOk) for (const sp of districtSpots(n, taken, 0.025, new Set(["norcal", "morro"]))) {
    const g = rollGig(pois, { distOf: (p) => districtAt(p.x, p.y)?.id }), where = streetNear(sp.x, sp.y)?.ru ?? sp.d.ru;
    g.title = `${g.jtype}: ${sp.d.ru}`; g.desc = `${T("Встреча с контактом:")} ${where}.\n` + g.desc;
    out.push({ id: rid(), ...g, x: sp.x, y: sp.y, status: data.status === "hidden" ? "hidden" : "offer" });
  }
  while (gridOk && out.length < n && tries++ < n * 500) {
    const i = Math.floor(Math.random() * cell.length);
    if (cell[i] !== 1) continue;
    const x = (i % w) / (w - 1), y = ((i / w) | 0) / (h - 1);
    if (x > 0.93 || x < 0.03 || y < 0.03 || y > 0.965) continue;
    const d = districtAt(x, y); if (!d || ["norcal", "morro", "delbay", "sanbay"].includes(d.id)) continue;
    if (taken.some(p => Math.hypot(p.x - x, (p.y - y) * aspect) < 0.025)) continue;
    const g = rollGig(pois, { distOf: (p) => districtAt(p.x, p.y)?.id });
    const where = streetNear(x, y)?.ru ?? d.ru;
    g.title = `${g.jtype}: ${d.ru}`;
    g.desc = `${T("Встреча с контактом:")} ${where}.\n` + g.desc;
    out.push({ id: rid(), ...g, x, y, status: data.status === "hidden" ? "hidden" : "offer" });
    taken.push({ x, y });
  }
  await save(s => {
    if (data.replace) s.quests = s.quests.filter(q => !(q.x != null && ["offer", "hidden"].includes(q.status)));
    s.quests.push(...out);
  });
  ui.notifications.info(`${T("На карте новых заказов:")} ${out.length}.`);
}

/* ================================================================ Агент — телефон эджраннера */

const Agent = {
  el: null, tab: "msg", seen: new Set(), unread: 0, chatWith: null, docked: false, busy: false,
  toggle() { this.el && !this.docked ? this.close() : this.open(); },
  /** Повернуть телефон горизонтально и спрятать — карта раскроется из его экрана. */
  flip() {
    const el = this.el; this.busy = true;
    el.classList.add("ag-flip");
    return new Promise(res => setTimeout(() => {
      const r = el.getBoundingClientRect();
      el.classList.add("ag-docked"); this.docked = true; this.busy = false;
      res(r);
    }, 380));
  },
  /** Карта закрылась — телефон возвращается и поворачивается вертикально. */
  unflip() {
    const el = this.el; if (!el) return;
    this.docked = false;
    el.classList.remove("ag-docked");
    void el.offsetWidth;
    requestAnimationFrame(() => el.classList.remove("ag-flip"));
    this.render();
  },
  mini() {
    this.close();
    if (document.getElementById("ncm-agent-pill")) return;
    const p = document.createElement("button");
    p.id = "ncm-agent-pill"; p.title = T("Агент (Shift+A)");
    p.innerHTML = `<i class="fas fa-mobile-screen"></i> AGENT<span class="ncm-agent-badge" hidden></span>`;
    p.addEventListener("click", () => this.open());
    document.body.appendChild(p);
    requestAnimationFrame(() => p.classList.add("on"));
    this.badge();
  },
  open(tab) {
    if (tab) this.tab = tab;
    document.getElementById("ncm-agent-pill")?.remove();
    if (this.el && this.docked) this.unflip();
    if (!this.el) {
      const el = document.createElement("div");
      el.id = "ncm-agent";
      document.body.appendChild(el);
      this.el = el;
      el.addEventListener("click", (ev) => this.onClick(ev));
      el.addEventListener("keydown", (ev) => { ev.stopPropagation(); if (ev.key === "Enter" && !ev.shiftKey && ev.target.matches("textarea")) { ev.preventDefault(); this.send(); } });
      this.makeDraggable(el);
      requestAnimationFrame(() => el.classList.add("on"));
    }
    this.markSeen(); this.render();
  },
  close() { if (!this.el) return; const el = this.el; this.el = null; this.docked = false; el.classList.remove("on"); setTimeout(() => el.remove(), 250); },
  makeDraggable(el) {
    let d = null;
    el.addEventListener("pointerdown", (ev) => { if (!ev.target.closest(".ag-top") || ev.target.closest("button")) return; const r = el.getBoundingClientRect(); d = { x: ev.clientX - r.left, y: ev.clientY - r.top }; el.setPointerCapture(ev.pointerId); });
    el.addEventListener("pointermove", (ev) => { if (!d) return; el.style.left = `${ev.clientX - d.x}px`; el.style.top = `${ev.clientY - d.y}px`; el.style.right = "auto"; el.style.bottom = "auto"; });
    el.addEventListener("pointerup", () => { d = null; });
  },
  mine(m) { return isGM() || m.to === "all" || m.to === game.user.id || m.fromUser === game.user.id; },
  msgs() { return state().messages.filter(m => this.mine(m)); },
  markSeen() { for (const m of this.msgs()) this.seen.add(m.id); this.unread = 0; this.badge(); },
  badge() { document.querySelectorAll(".ncm-agent-badge").forEach(b => { b.textContent = this.unread || ""; b.hidden = !this.unread; }); },
  onState() {
    const fresh = this.msgs().filter(m => !this.seen.has(m.id) && m.fromUser !== game.user.id);
    if (fresh.length) {
      for (const m of fresh) this.seen.add(m.id);
      const loud = fresh.filter(m => !m.call);
      if (loud.length && (!this.el || this.tab !== "msg")) { this.unread += loud.length; this.badge(); this.ping(loud.at(-1)); }
    }
    if (this.el) this.render();
  },
  ping(m) {
    try { foundry.audio?.AudioHelper?.play?.({ src: "sounds/notify.wav", volume: 0.6 }, false) ?? AudioHelper.play({ src: "sounds/notify.wav", volume: 0.6 }, false); } catch (e) { /* без звука */ }
    const t = document.createElement("div");
    t.className = "ncm-toast ncm-toast-agent";
    t.innerHTML = `<div class="ncm-toast-k"><i class="fas fa-mobile-screen"></i> ${T("АГЕНТ · НОВОЕ СООБЩЕНИЕ")}</div><b>${esc(m.from)}</b><span>${esc(m.text.slice(0, 120))}${m.text.length > 120 ? "…" : ""}</span>`;
    t.addEventListener("click", () => { this.open("msg"); t.remove(); });
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("on"));
    setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 8000);
  },
  render() {
    if (!this.el) return;
    const { time } = fmtClock();
    const body = this.tab === "msg" ? this.renderMsgs() : this.tab === "jobs" ? this.renderJobs() : this.tab === "contacts" ? this.renderContacts() : this.renderMe();
    this.el.innerHTML = `<div class="ag-phone">
      <div class="ag-top"><span>${time}</span><span class="ag-net">NCNET ▮▮▮▯ 5G</span><button data-ag="mini" title="${T("Свернуть")}">▁</button><button data-ag="close" title="${T("Закрыть")}">✕</button></div>
      <div class="ag-head"><b>AGENT</b><small>${esc(game.user.character?.name ?? game.user.name)}</small></div>
      <div class="ag-body">${body}</div>
      <nav class="ag-nav">
        <button data-ag="tab" data-t="msg" class="${this.tab === "msg" ? "on" : ""}"><i class="fas fa-comment-dots"></i>${T("Чаты")}</button>
        <button data-ag="tab" data-t="contacts" class="${this.tab === "contacts" ? "on" : ""}"><i class="fas fa-address-book"></i>${T("Контакты")}</button>
        <button data-ag="tab" data-t="jobs" class="${this.tab === "jobs" ? "on" : ""}"><i class="fas fa-briefcase"></i>${T("Заказы")}</button>
        <button data-ag="tab" data-t="me" class="${this.tab === "me" ? "on" : ""}"><i class="fas fa-location-dot"></i>${T("Я")}</button>
        <button data-ag="map"><i class="fas fa-map"></i>${T("Карта")}</button>
      </nav></div>`;
    const list = this.el.querySelector(".ag-msgs"); if (list) list.scrollTop = list.scrollHeight;
  },
  renderMsgs() {
    const all = this.msgs();
    const players = game.users.filter(u => !u.isGM);
    const fromName = (m) => m.fromUser === game.user.id ? T("Вы") : m.from;
    const t = (m) => fmtClock(m.t).time;
    let list = all;
    if (isGM() && this.chatWith) list = all.filter(m => m.to === "all" || m.to === this.chatWith || m.fromUser === this.chatWith);
    return `${isGM() ? `<div class="ag-to">${T("Кому:")} <select data-ag-to><option value="all">${T("Всем")}</option>${players.map(u => `<option value="${u.id}"${this.chatWith === u.id ? " selected" : ""}>${esc(u.character?.name ?? u.name)}</option>`).join("")}</select>
        ${T("От:")} <input data-ag-from value="${esc(this.from ?? T("Фиксер"))}"><button class="ag-call" data-ag="call" title="${T("Голо-вызов")}"><i class="fas fa-phone"></i></button></div>` : ""}
      ${isGM() && list.length ? `<div class="ag-tools"><button data-ag="del-all" title="${T("Удалить все сообщения в этом списке")}"><i class="fas fa-trash"></i> ${this.chatWith ? T("Очистить переписку") : T("Очистить все чаты")}</button></div>` : ""}
      <div class="ag-msgs">${list.length ? list.map(m => `<div class="ag-msg ${m.fromUser === game.user.id ? "out" : "in"}${m.to === "all" ? " all" : ""}">
          ${isGM() || m.fromUser === game.user.id ? `<button class="ag-del" data-ag="del" data-id="${m.id}" title="${T("Удалить сообщение")}">✕</button>` : ""}
          <div class="ag-m-h">${m.call ? `<i class="fas fa-phone-volume" title="${T("Из звонка")}"></i> ` : ""}<b>${esc(fromName(m))}</b>${isGM() && m.to !== "all" && m.to !== "gm" ? ` → ${esc(game.users.get(m.to)?.name ?? "")}` : ""}${m.to === "all" ? T(" · всем") : ""}<span>${t(m)}</span></div>
          <div class="ag-m-t">${esc(m.text).replace(/\n/g, "<br>")}</div></div>`).join("") : `<p class="ag-empty">${T("Нет сообщений. Сеть молчит.")}</p>`}</div>
      <div class="ag-compose"><textarea data-ag-text rows="2" placeholder="${isGM() ? T("Сообщение от фиксера…") : T("Ответить мастеру…")}"></textarea><button data-ag="send"><i class="fas fa-paper-plane"></i></button></div>`;
  },
  contacts() { const s = state(); return (s.contacts ?? []).filter(k => isGM() || k.who === "all" || (k.who ?? []).includes?.(game.user.id)); },
  renderContacts() {
    const ks = this.contacts().slice().sort((a, b) => a.name.localeCompare(b.name));
    const seen = (k) => k.who === "all" ? T("все") : (k.who ?? []).map(id => game.users.get(id)?.character?.name ?? game.users.get(id)?.name).filter(Boolean).join(", ") || T("никто");
    return `<div class="ag-contacts">${isGM() ? `<button class="ag-add" data-ag="k-add"><i class="fas fa-user-plus"></i> ${T("Добавить контакт")}</button>` : ""}
      ${ks.length ? ks.map(k => `<div class="ag-k">
        <div class="ag-k-pic">${k.img ? `<img src="${esc(k.img)}" alt="">` : `<i class="fas fa-user-secret"></i>`}</div>
        <div class="ag-k-info"><b>${esc(k.name)}</b>${k.note ? `<small>${esc(k.note)}</small>` : ""}${isGM() ? `<small class="ag-k-who"><i class="fas fa-eye"></i> ${esc(seen(k))}</small>` : ""}</div>
        <div class="ag-k-act"><button data-ag="k-call" data-id="${k.id}" title="${T("Позвонить")}"><i class="fas fa-phone"></i></button><button data-ag="k-msg" data-id="${k.id}" title="${T("Написать")}"><i class="fas fa-comment"></i></button>${isGM() ? `<button data-ag="k-edit" data-id="${k.id}" title="${T("Править")}"><i class="fas fa-pen"></i></button><button data-ag="k-del" data-id="${k.id}" title="${T("Удалить")}"><i class="fas fa-trash"></i></button>` : ""}</div>
      </div>`).join("") : `<p class="ag-empty">${isGM() ? T("Контактов нет. Добавь фиксеров и NPC — игроки смогут им звонить.") : T("Контактов пока нет.")}</p>`}</div>`;
  },
  renderJobs() {
    const qs = questsVisible().filter(q => isGM() ? q.status !== "done" && q.status !== "failed" : ["active", "offer"].includes(q.status));
    const done = questsVisible().filter(q => ["done", "failed"].includes(q.status));
    const card = (q) => `<div class="ag-job st-${q.status}"><div class="ag-j-h"><b>${esc(q.title)}</b><span>${QSTATUS[q.status]}</span></div>
      ${q.fixer ? `<small><i class="fas fa-user-secret"></i> ${esc(q.fixer)}</small>` : ""}
      ${q.desc ? `<p>${esc(q.desc).replace(/\n/g, "<br>")}</p>` : ""}
      <div class="ag-j-f">${q.reward ? `<em>${esc(q.reward)}</em>` : "<span></span>"}
        <span>${q.x != null || q.target ? `<button data-ag="job-map" data-id="${q.id}"><i class="fas fa-location-crosshairs"></i></button>` : ""}
        ${!isGM() && q.status === "offer" ? `<button data-ag="take" data-id="${q.id}">${T("Взять")}</button>` : ""}</span></div></div>`;
    return `<div class="ag-jobs">${qs.length ? qs.map(card).join("") : `<p class="ag-empty">${T("Заказов нет.")}</p>`}
      ${done.length ? `<details><summary>${T("Архив (")}${done.length})</summary>${done.map(card).join("")}</details>` : ""}</div>`;
  },
  renderMe() {
    const s = state(), me = s.players?.[game.user.id], d = me && districtAt(me.x, me.y), st = me && streetNear(me.x, me.y);
    const { day, time } = fmtClock();
    return `<div class="ag-me"><div class="ag-clock"><b>${time}</b><small>${day} · ${isNight() ? T("ночь") : T("день")}</small></div>
      <div class="ag-loc"><span>${T("МОЯ ПОЗИЦИЯ")}</span><b>${me ? esc([st?.ru, d?.ru].filter(Boolean).join(", ")) : T("не отмечена")}</b></div>
      <button data-ag="set-me"><i class="fas fa-user"></i> ${T("Отметить «Я здесь» на карте")}</button>
      ${me ? `<button data-ag="clear-me"><i class="fas fa-users"></i> ${T("Я снова с группой")}</button>` : ""}
      ${s.party ? `<div class="ag-loc"><span>${T("ГРУППА")}</span><b>${esc([streetNear(s.party.x, s.party.y)?.ru, districtAt(s.party.x, s.party.y)?.ru].filter(Boolean).join(", "))}</b></div>` : ""}</div>`;
  },
  async send() {
    const ta = this.el?.querySelector("[data-ag-text]"); const text = ta?.value.trim(); if (!text) return;
    if (isGM()) {
      const to = this.el.querySelector("[data-ag-to]")?.value ?? "all"; this.from = this.el.querySelector("[data-ag-from]")?.value || T("Фиксер");
      await act("msg", { to, from: this.from, text });
    } else await act("msg", { to: "gm", text, from: game.user.character?.name ?? game.user.name });
    ta.value = "";
  },
  async onClick(ev) {
    const b = ev.target.closest("[data-ag]"); if (!b) return;
    switch (b.dataset.ag) {
      case "close": return this.close();
      case "mini": return this.mini();
      case "tab": this.tab = b.dataset.t; if (this.tab === "msg") this.markSeen(); return this.render();
      case "send": return this.send();
      case "call": this.from = this.el.querySelector("[data-ag-from]")?.value || this.from; return Call.dialog({ from: this.from });
      case "del": return act("msg-del", { ids: [b.dataset.id] });
      case "del-all": {
        const w = this.chatWith, ids = this.msgs().filter(m => !w || m.to === "all" || m.to === w || m.fromUser === w).map(m => m.id);
        const ok = await Dialog.confirm({ title: T("Агент"), content: `<p>${T("Удалить сообщений:")} ${ids.length}? ${T("Их не увидит никто, и это не отменить.")}</p>` });
        return ok && act("msg-del", { ids });
      }
      case "k-add": return contactDialog();
      case "k-edit": return contactDialog(state().contacts.find(k => k.id === b.dataset.id));
      case "k-del": {
        const k = state().contacts.find(x => x.id === b.dataset.id); if (!k) return;
        const ok = await Dialog.confirm({ title: T("Контакты"), content: `<p>${T("Удалить контакт")} «${esc(k.name)}»?</p>` });
        return ok && save(s => { s.contacts = s.contacts.filter(x => x.id !== k.id); });
      }
      case "k-call": {
        const k = this.contacts().find(x => x.id === b.dataset.id); if (!k) return;
        return isGM() ? Call.dialog({ from: k.name, img: k.img, to: k.who !== "all" && k.who?.length === 1 ? k.who[0] : undefined }) : Call.dial(k);
      }
      case "k-msg": {
        const k = this.contacts().find(x => x.id === b.dataset.id); if (!k) return;
        if (isGM()) this.from = k.name;
        this.tab = "msg"; this.markSeen(); this.render();
        const ta = this.el?.querySelector("[data-ag-text]"); if (ta && !isGM()) { ta.value = `@${k.name} `; } ta?.focus();
        return;
      }
      case "map": return UI.open();
      case "take": return act("take", { id: b.dataset.id });
      case "set-me": return UI.open().then(() => setTimeout(() => UI.setMode("me"), 150));
      case "clear-me": return act("me-clear", {});
      case "job-map": {
        const q = state().quests.find(x => x.id === b.dataset.id); await UI.open(); if (!q) return;
        return setTimeout(() => { if (q.x != null) { UI.focus(q.x, q.y, 0.9); UI.selectGig(q.id); } else { const p = poiById(q.target ?? q.giver); if (p) UI.select(p.id, true); } }, 200);
      }
    }
  }
};
/* ================================================================ звонки (голо-вызов) */

/** Мелодия вызова: свой файл из настроек или встроенный синтезированный сигнал. */
const Ring = {
  audio: null, ctx: null, timer: null,
  vol() { try { return Number(game.settings.get("core", "globalInterfaceVolume") ?? 0.5); } catch (e) { return 0.5; } },
  synth() {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    this.ctx ??= new C(); this.ctx.resume?.(); return this.ctx;
  },
  tone(t, f1, f2, d, type = "square", gain = 0.07) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * this.vol()), t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.03);
  },
  start() {
    this.stop();
    const src = game.settings.get(MID, "callSound");
    if (src) { const a = new Audio(src); a.loop = true; a.volume = Math.min(1, this.vol()); a.play().catch(() => {}); this.audio = a; return; }
    try {
      if (!this.synth()) return;
      const ring = () => { const t = this.ctx.currentTime + 0.02;
        [0, 0.14, 0.28].forEach((o, i) => this.tone(t + o, 660 + i * 220, 990 + i * 260, 0.11));
        [0.62, 0.76].forEach(o => this.tone(t + o, 1480, 880, 0.13, "sawtooth", 0.05)); };
      ring(); this.timer = setInterval(ring, 2100);
    } catch (e) { /* без звука */ }
  },
  /** Гудки у звонящего, пока на том конце не ответили. */
  back() { this.stop(); try { if (!this.synth()) return; const b = () => this.tone(this.ctx.currentTime + 0.02, 425, 425, 0.9, "sine", 0.05); b(); this.timer = setInterval(b, 3000); } catch (e) { /* */ } },
  stop() { if (this.audio) { this.audio.pause(); this.audio = null; } clearInterval(this.timer); this.timer = null; },
  /** Короткий сигнал: соединение (up) или сброс (down). */
  blip(up) { try { if (!this.synth()) return; const t = this.ctx.currentTime + 0.02; up ? (this.tone(t, 880, 1320, 0.09, "sine", 0.09), this.tone(t + 0.1, 1320, 1760, 0.09, "sine", 0.09)) : this.tone(t, 900, 300, 0.25, "sawtooth", 0.06); } catch (e) { /* */ } }
};

const Call = {
  cur: null, el: null, tick: null,
  /** Мастер звонит: окно выбора, кто звонит и кому. */
  async dialog(opts = {}) {
    if (!isGM()) return;
    const players = game.users.filter(u => !u.isGM);
    const actors = game.actors.filter(a => a.type !== "container").slice(0, 300);
    const fd = await formDialog(T("Голо-вызов"), `<form class="ncm-form">
      <label>${T("Взять из актёра")}<select data-actor><option value="">—</option>${actors.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></label>
      <label>${T("Кто звонит")}<input name="from" value="${esc(opts.from ?? Agent.from ?? T("Фиксер"))}"></label>
      <label>${T("Портрет")}<span class="ncm-fp"><input name="img" value="${esc(opts.img ?? "")}" placeholder="${T("пусто — силуэт")}"><button type="button" data-fp="img" title="${T("Выбрать файл")}"><i class="fas fa-file-image"></i></button></span></label>
      <label>${T("Кому")}<select name="to"><option value="all">${T("Всем игрокам")}</option>${players.map(u => `<option value="${u.id}"${opts.to === u.id || Agent.chatWith === u.id ? " selected" : ""}>${esc(u.character?.name ?? u.name)}${u.active ? "" : T(" (не в игре)")}</option>`).join("")}</select></label>
      <label>${T("Первая реплика (необязательно)")}<textarea name="text" rows="2" placeholder="${T("Есть работа. Срочно.")}"></textarea></label></form>`, T("Позвонить"));
    if (fd) this.start(fd);
  },
  /** Начать вызов (мастер). Можно из макроса: NightCityMap.call({from, img, to, text}). */
  start({ from, img = "", to = "all", text = "" } = {}) {
    if (!isGM()) return ui.notifications.warn(T("Звонить может только мастер."));
    if (!from) return this.dialog({ img, to });
    if (this.cur) this.end(true);
    const targets = to === "all" ? game.users.filter(u => !u.isGM && u.active).map(u => u.id) : [to];
    if (!targets.length) return ui.notifications.warn(T("Некому звонить: игроков нет в игре."));
    const c = { id: rid(), from, img, to, first: String(text ?? "").trim() };
    this.cur = { ...c, gm: true, phase: "out", lines: [], ans: Object.fromEntries(targets.map(id => [id, "ring"])), t0: Date.now() };
    emit({ action: "call", c });
    this.render();
  },
  /** Игрок звонит контакту: вызов уходит мастеру, тот отвечает от имени контакта. */
  dial(k) {
    if (!k) return;
    if (!game.users.activeGM) return ui.notifications.warn(T("Абонент недоступен: мастера нет в игре."));
    if (this.cur) return;
    const c = { id: rid(), from: k.name, img: k.img ?? "", to: "gm", caller: game.user.id, callerName: game.user.character?.name ?? game.user.name };
    this.cur = { ...c, gm: false, outgoing: true, phase: "out", lines: [], t0: Date.now() };
    emit({ action: "call", c }); Ring.back(); this.render();
    setTimeout(() => { const x = this.cur; if (x?.id === c.id && x.phase === "out") { emit({ action: "call-ans", id: c.id, ok: false, user: game.user.id }); Ring.stop(); x.phase = "over"; x.noAnswer = true; this.render(); setTimeout(() => this.cur?.id === c.id && this.close(), 3000); } }, 45000);
  },
  onSocket(d) {
    const c = this.cur;
    switch (d.action) {
      case "call": {
        if (d.c.to === "gm") { // игрок звонит контакту — отвечает мастер
          if (!isGM()) return;
          if (c && c.phase === "live") return emit({ action: "call-end", id: d.c.id, busy: true });
          this.cur = { ...d.c, gm: true, incoming: true, phase: "ring", lines: [], ans: { [d.c.caller]: "ring" }, t0: Date.now() };
          Ring.start(); return this.render();
        }
        if (isGM() || (d.c.to !== "all" && d.c.to !== game.user.id)) return;
        if (c && c.phase === "live") return emit({ action: "call-ans", id: d.c.id, ok: false, busy: true, user: game.user.id });
        this.cur = { ...d.c, gm: false, phase: "ring", lines: [], t0: Date.now() };
        Ring.start(); return this.render();
      }
      case "call-ans": {
        if (!isGM() || !c || c.id !== d.id) return;
        c.ans[d.user] = d.ok ? "ok" : d.busy ? "busy" : c.ans[d.user] === "ok" ? "left" : "no";
        if (d.ok) {
          if (c.phase !== "live") { c.phase = "live"; c.t1 = Date.now(); Ring.blip(true); }
          if (c.lines.length) emit({ action: "call-sync", id: c.id, user: d.user, lines: c.lines.map(l => ({ from: l.from, text: l.text })) });
          if (c.first && !c.firstSaid) { c.firstSaid = true; this.say(c.first); }
        }
        if (!Object.values(c.ans).some(v => v === "ring" || v === "ok")) { c.phase = "over"; Ring.blip(false); setTimeout(() => this.cur?.id === d.id && this.close(), 3500); }
        return this.render();
      }
      case "call-ok": {
        if (!c || c.id !== d.id || c.phase !== "out" || c.gm) return;
        Ring.stop(); Ring.blip(true); c.phase = "live"; c.t1 = Date.now(); return this.render();
      }
      case "call-sync": if (c && c.id === d.id && d.user === game.user.id) { c.lines = d.lines; this.render(); } return;
      case "call-line": {
        if (!c || c.id !== d.id || (!c.gm && c.phase !== "live")) return;
        c.lines.push({ from: d.from, text: d.text, me: false }); c.talk = Date.now(); return this.render(true);
      }
      case "call-end": {
        if (!c || c.id !== d.id) return;
        if (d.busy) c.busyEnd = true;
        Ring.stop(); if (c.phase === "live") Ring.blip(false);
        c.phase = "over"; this.render(); setTimeout(() => this.cur?.id === d.id && this.close(), 2500); return;
      }
    }
  },
  accept() {
    const c = this.cur; if (!c) return;
    Ring.stop(); Ring.blip(true);
    c.phase = "live"; c.t1 = Date.now();
    if (c.incoming) { c.ans[c.caller] = "ok"; emit({ action: "call-ok", id: c.id }); return this.render(); }
    emit({ action: "call-ans", id: c.id, ok: true, user: game.user.id });
    this.render();
  },
  decline() {
    const c = this.cur; if (!c) return;
    if (c.incoming) { Ring.stop(); emit({ action: "call-end", id: c.id }); return this.close(); }
    Ring.stop(); if (c.phase === "live") Ring.blip(false);
    emit({ action: "call-ans", id: c.id, ok: false, user: game.user.id });
    this.close();
  },
  /** Реплика в разговоре: видят все на линии, сохраняется в чатах Агента. */
  say(text) {
    const c = this.cur; text = String(text ?? "").trim(); if (!c || !text) return;
    const from = c.gm ? c.from : (game.user.character?.name ?? game.user.name);
    emit({ action: "call-line", id: c.id, from, text });
    c.lines.push({ from, text, me: true }); c.talk = Date.now();
    act("msg", c.gm ? { to: c.caller ?? c.to, from, text, call: true } : { to: "gm", from, text, call: true });
    this.render(true);
  },
  end(silent) {
    const c = this.cur; if (!c) return;
    if (c.gm) emit({ action: "call-end", id: c.id }); else emit({ action: "call-ans", id: c.id, ok: false, user: game.user.id });
    Ring.stop(); if (!silent && c.phase === "live") Ring.blip(false);
    this.close();
  },
  close() {
    clearInterval(this.tick); this.tick = null; Ring.stop(); this.cur = null;
    const el = this.el; this.el = null; if (!el) return;
    el.classList.remove("on"); setTimeout(() => el.remove(), 300);
  },
  dur() { const c = this.cur; if (!c?.t1) return "00:00"; const s = Math.floor((Date.now() - c.t1) / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; },
  render(typed) {
    const c = this.cur; if (!c) return;
    if (!this.el) {
      const el = document.createElement("div"); el.id = "ncm-call"; document.body.appendChild(el); this.el = el;
      el.addEventListener("click", (ev) => this.onClick(ev));
      el.addEventListener("keydown", (ev) => { ev.stopPropagation(); if (ev.key === "Enter" && !ev.shiftKey && ev.target.matches("textarea")) { ev.preventDefault(); this.send(); } });
      let dr = null;
      el.addEventListener("pointerdown", (ev) => { if (!ev.target.closest(".cl-head") || ev.target.closest("button")) return; const r = el.getBoundingClientRect(); dr = { x: ev.clientX - r.left, y: ev.clientY - r.top }; el.setPointerCapture(ev.pointerId); });
      el.addEventListener("pointermove", (ev) => { if (!dr) return; el.style.left = `${ev.clientX - dr.x}px`; el.style.top = `${ev.clientY - dr.y}px`; });
      el.addEventListener("pointerup", () => { dr = null; });
      requestAnimationFrame(() => el.classList.add("on"));
    }
    if (!this.tick) this.tick = setInterval(() => { const t = this.el?.querySelector(".cl-dur"); if (t) t.textContent = this.dur(); this.el?.classList.toggle("talk", Date.now() - (this.cur?.talk ?? 0) < 2600); }, 500);
    const name = (id) => { const u = game.users.get(id); return esc(u?.character?.name ?? u?.name ?? "?"); };
    const ST = { ring: T("вызов…"), ok: T("на связи"), no: T("сбросил"), left: T("отключился"), busy: T("занят") };
    const status = c.phase === "ring" ? T("ВХОДЯЩИЙ ВЫЗОВ") : c.phase === "out" ? T("ВЫЗОВ…") : c.phase === "live" ? T("НА СВЯЗИ") : c.noAnswer ? T("АБОНЕНТ НЕ ОТВЕЧАЕТ") : c.busyEnd ? T("АБОНЕНТ ЗАНЯТ") : T("СВЯЗЬ ПРЕРВАНА");
    const who = c.gm ? (c.incoming ? name(c.caller) : c.to === "all" ? T("Все игроки") : name(c.to)) : c.from;
    const lines = c.lines.slice(-4);
    this.el.className = `on ph-${c.phase}${c.gm ? " gm" : ""}`;
    this.el.innerHTML = `<div class="cl-frame">
      <div class="cl-head"><span class="cl-k"><i class="fas fa-phone-volume"></i> ${status}</span>${c.phase === "live" ? `<span class="cl-dur">${this.dur()}</span>` : ""}</div>
      <div class="cl-main">
        <div class="cl-portrait">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<i class="fas fa-user-secret"></i>`}<span class="cl-scan"></span><span class="cl-glitch"></span></div>
        <div class="cl-info">
          <small>${c.incoming ? `${esc(c.callerName)} ${T("ЗВОНИТ КОНТАКТУ")}` : c.gm ? T("ЗВОНИТ ОТ ИМЕНИ") : c.outgoing ? T("ВЫ ЗВОНИТЕ") : "NCNET · HOLO"}</small>
          <b>${esc(c.gm ? c.from : who)}</b>
          ${c.gm ? `<small class="cl-to">${c.incoming ? "←" : "→"} ${who}</small>` : ""}
          <div class="cl-eq">${"<i></i>".repeat(14)}</div>
        </div>
      </div>
      ${c.gm ? `<div class="cl-ans">${Object.entries(c.ans).map(([id, v]) => `<span class="a-${v}">${name(id)} · ${ST[v]}</span>`).join("")}</div>` : ""}
      ${lines.length ? `<div class="cl-lines">${lines.map((l, i) => `<p class="${l.me ? "me" : ""}"><b>${esc(l.from)}:</b> <span${typed && i === lines.length - 1 && !l.me ? " data-type" : ""}>${esc(l.text)}</span></p>`).join("")}</div>` : ""}
      ${c.phase === "live" || (c.gm && c.phase === "out") ? `<div class="cl-say"><textarea data-cl-text rows="1" placeholder="${c.gm ? T("Реплика от ") + esc(c.from) + "…" : T("Ответить…")}"></textarea><button data-cl="send" title="${T("Сказать")}"><i class="fas fa-paper-plane"></i></button></div>` : ""}
      <div class="cl-btns">
        ${c.phase === "ring" ? `<button class="ok" data-cl="accept"><i class="fas fa-phone"></i> ${T("Принять")}</button><button class="no" data-cl="decline"><i class="fas fa-phone-slash"></i> ${T("Сбросить вызов")}</button>` : ""}
        ${c.phase === "live" || c.phase === "out" ? `<button class="no" data-cl="end"><i class="fas fa-phone-slash"></i> ${c.gm ? T("Завершить вызов") : T("Положить трубку")}</button>` : ""}
        ${c.phase === "over" ? `<button data-cl="close">${T("Закрыть")}</button>` : ""}
      </div></div>`;
    const tw = this.el.querySelector("[data-type]");
    if (tw) { const full = tw.textContent; tw.textContent = ""; let i = 0; const step = () => { if (!tw.isConnected) return; tw.textContent = full.slice(0, ++i); if (i < full.length) setTimeout(step, 22); }; step(); }
    const box = this.el.querySelector(".cl-lines"); if (box) box.scrollTop = box.scrollHeight;
    if (c.phase === "live") this.el.querySelector("[data-cl-text]")?.focus({ preventScroll: true });
  },
  send() { const ta = this.el?.querySelector("[data-cl-text]"); if (!ta?.value.trim()) return; const v = ta.value; ta.value = ""; this.say(v); },
  onClick(ev) {
    const b = ev.target.closest("[data-cl]"); if (!b) return;
    switch (b.dataset.cl) {
      case "accept": return this.accept();
      case "decline": return this.decline();
      case "end": return this.end();
      case "close": return this.close();
      case "send": return this.send();
    }
  }
};
/** Контакт в «Агенте»: кто это, портрет, кто из игроков его видит. */
async function contactDialog(k = {}, actor) {
  if (!isGM()) return;
  const players = game.users.filter(u => !u.isGM);
  const actors = game.actors.filter(a => a.type !== "container").slice(0, 300);
  const all = !k.id || k.who === "all";
  const fd = await formDialog(k.id ? T("Контакт") : T("Новый контакт"), `<form class="ncm-form">
    <label>${T("Взять из актёра")}<select data-actor><option value="">—</option>${actors.map(a => `<option value="${a.id}"${actor?.id === a.id ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label>
    <label>${T("Имя")}<input name="name" value="${esc(k.name ?? actor?.name ?? "")}" placeholder="${T("Роуг")}"></label>
    <label>${T("Портрет")}<span class="ncm-fp"><input name="img" value="${esc(k.img ?? (actor?.img && !actor.img.includes("mystery-man") ? actor.img : ""))}" placeholder="${T("пусто — силуэт")}"><button type="button" data-fp="img" title="${T("Выбрать файл")}"><i class="fas fa-file-image"></i></button></span></label>
    <label>${T("Подпись (видят игроки)")}<input name="note" value="${esc(k.note ?? "")}" placeholder="${T("Фиксер, Посмертие")}"></label>
    <div class="ncm-who"><span>${T("Кому виден")}</span>
      <label class="ncm-check"><input type="checkbox" name="all" ${all ? "checked" : ""}> ${T("Всем игрокам")}</label>
      ${players.map(u => `<label class="ncm-check"><input type="checkbox" name="p_${u.id}" ${!all && (k.who ?? []).includes(u.id) ? "checked" : ""}> ${esc(u.character?.name ?? u.name)}</label>`).join("")}</div></form>`, T("Сохранить"));
  if (!fd || !String(fd.name ?? "").trim()) return;
  const who = fd.all ? "all" : players.filter(u => fd[`p_${u.id}`]).map(u => u.id);
  const rec = { id: k.id ?? rid(), name: String(fd.name).trim(), img: fd.img ?? "", note: fd.note ?? "", who };
  await save(s => { s.contacts ??= []; const i = s.contacts.findIndex(x => x.id === rec.id); if (i >= 0) s.contacts[i] = rec; else s.contacts.push(rec); });
  ui.notifications.info(T("Контакт сохранён в «Агенте»."));
}

/* Голо-вызов от имени персонажа: пункт в меню актёров и кнопка в шапке листа (только мастеру). */
const callFromActor = (a) => a && agentOn() && Call.dialog({ from: a.name, img: a.img && !a.img.includes("mystery-man") ? a.img : "" });
Hooks.on("getActorDirectoryEntryContext", (html, opts) => {
  opts.push({ name: T("Голо-вызов от этого персонажа"), icon: '<i class="fas fa-phone-volume"></i>', condition: () => isGM() && agentOn(),
    callback: (li) => { const el = li?.[0] ?? li; callFromActor(game.actors.get(el?.dataset?.documentId ?? el?.dataset?.entryId)); } });
});
Hooks.on("getActorDirectoryEntryContext", (html, opts) => {
  opts.push({ name: T("Добавить в контакты «Агента»"), icon: '<i class="fas fa-address-book"></i>', condition: () => isGM() && agentOn(),
    callback: (li) => { const el = li?.[0] ?? li; const a = game.actors.get(el?.dataset?.documentId ?? el?.dataset?.entryId); if (a) contactDialog({}, a); } });
});
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  if (!isGM() || !agentOn()) return;
  buttons.unshift({ label: T("Позвонить"), class: "ncm-call-btn", icon: "fas fa-phone-volume", onclick: () => callFromActor(sheet.actor ?? sheet.object) });
});
document.addEventListener("change", (ev) => { if (ev.target.matches?.("#ncm-agent [data-ag-to]")) { Agent.chatWith = ev.target.value === "all" ? null : ev.target.value; Agent.render(); } });

Hooks.on("collapseSidebar", () => setTimeout(() => { if (UI.el) { UI.layout(); UI.fit(); } }, 350));
