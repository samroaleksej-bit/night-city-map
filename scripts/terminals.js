/*
 * Terminals — computer screens in the style of 2077 (files, messages, decryption, camera feeds, sounds).
 * The GM imports a terminal as a .json file (no upload to the server needed: the data is kept in a world
 * setting), opens it for himself or shows it to the players. Each player then browses it on their own.
 * The screen itself is assets/terminal/terminal.html in an iframe; it asks the module for its data by id.
 */
import { T, lang } from "./i18n.js";

const MID = "night-city-map";
const SOCKET = `module.${MID}`;
const ENGINE = `modules/${MID}/assets/terminal/terminal.html`;
const isGM = () => !!game.user?.isGM;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rid = () => foundry.utils.randomID?.() ?? Math.random().toString(36).slice(2, 12);

const terms = () => { try { return foundry.utils.deepClone(game.settings.get(MID, "terminals") ?? []); } catch (e) { return []; } };
async function saveTerms(list) { await game.settings.set(MID, "terminals", list); }
const termById = (id) => terms().find(t => t.id === id);

Hooks.once("init", () => {
  game.settings.register(MID, "terminals", {
    scope: "world", config: false, type: Array, default: [],
    onChange: () => { try { ui.controls?.initialize?.(); } catch (e) { /* */ } Manager.refresh(); },
  });
  // ход взлома NET-архитектуры по каждому терминалу — общий для всех (пишет мастер)
  game.settings.register(MID, "termNet", { scope: "world", config: false, type: Object, default: {} });
});
const netAll = () => { try { return game.settings.get(MID, "termNet") ?? {}; } catch (e) { return {}; } };
async function netSet(id, st) {
  if (game.user === game.users.activeGM) { const all = foundry.utils.deepClone(netAll()); all[id] = st; await game.settings.set(MID, "termNet", all); }
  else game.socket.emit(SOCKET, { action: "term-net", id, st });
}

/* ---------------------------------------------------------------- окно терминала */

class TermApp extends Application {
  constructor(t, options = {}) { super(options); this.t = t; }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { width: 1200, height: 790, resizable: true, popOut: true, classes: ["ncm-term-app"] });
  }
  get id() { return `ncm-term-${this.t.id}`; }
  async close(options) {
    try { (globalThis.__ncAudio ?? []).forEach(n => { try { n.stop(); } catch (e) { /* */ } }); globalThis.__ncAudio?.clear(); } catch (e) { /* */ }
    return super.close(options);
  }
  get title() { return this.t.name || T("Терминал"); }
  async _renderInner() {
    const src = this.t.src ? encodeURI(decodeURI(this.t.src)) + `?v=${Date.now()}` : `${ENGINE}?id=${encodeURIComponent(this.t.id)}&lang=${lang()}&v=${Date.now()}`;
    return $(`<div class="ncm-term-wrap"><iframe src="${src}" allow="autoplay"></iframe></div>`);
  }
}

function openTerm(id) {
  const t = termById(id);
  if (!t) return ui.notifications.warn(T("Терминал не найден."));
  const open = Object.values(ui.windows).find(w => w.id === `ncm-term-${id}`);
  if (open) { open.bringToTop?.(); return open; }
  return new TermApp(t).render(true);
}
function closeTerms(id) {
  for (const w of Object.values(ui.windows)) if (w instanceof TermApp && (!id || w.t.id === id)) w.close();
}

/* ---------------------------------------------------------------- список (мастер и игроки) */

const Manager = {
  dlg: null,
  refresh() { if (this.dlg?.rendered) { const pos = this.dlg.position; this.dlg.close(); this.open(pos); } },
  html() {
    const list = terms().filter(t => isGM() || t.shared);
    const rows = list.map(t => `<li class="ncm-term-row" data-id="${t.id}">
      <i class="fas fa-terminal"></i><span class="nm">${esc(t.name)}</span>
      ${t.shared ? `<em class="sh" title="${T("Игроки видят этот терминал в списке")}">${T("у игроков")}</em>` : ""}
      <span class="btns">
        <button type="button" data-a="open" title="${T("Открыть у себя")}"><i class="fas fa-eye"></i></button>
        ${isGM() ? `<button type="button" data-a="show" title="${T("Показать всем игрокам (откроется у всех)")}"><i class="fas fa-tower-broadcast"></i></button>
        <button type="button" data-a="toggle" title="${t.shared ? T("Убрать из списка игроков") : T("Дать игрокам в список, не открывая")}"><i class="fas ${t.shared ? "fa-user-slash" : "fa-user-plus"}"></i></button>
        <button type="button" data-a="rename" title="${T("Переименовать")}"><i class="fas fa-pen"></i></button>
        ${t.src ? "" : `<button type="button" data-a="export" title="${T("Скачать .json")}"><i class="fas fa-download"></i></button>`}
        <button type="button" data-a="del" title="${T("Удалить")}"><i class="fas fa-trash"></i></button>` : ""}
      </span></li>`).join("");
    return `<div class="ncm-term-mgr">
      ${isGM() ? `<p class="hint">${T("Терминал — это файл .json с файлами и сообщениями. Импорт хранит его в мире, загружать на сервер ничего не надо.")}</p>` : ""}
      <ul>${rows || `<li class="empty">${isGM() ? T("Пока пусто — импортируй .json терминала.") : T("Мастер пока ничего не открыл.")}</li>`}</ul>
      ${isGM() ? `<div class="bar"><button type="button" data-a="import"><i class="fas fa-file-import"></i> ${T("Импорт .json")}</button>
        <button type="button" data-a="folder" title="${T("Все .json и .html из папки — в терминалы, картинки — в журнал с раздатками")}"><i class="fas fa-folder-open"></i> ${T("Из папки")}</button>
        <button type="button" data-a="closeall"><i class="fas fa-power-off"></i> ${T("Закрыть у всех")}</button></div>
        <input type="file" accept=".json,application/json" multiple hidden>` : ""}
    </div>`;
  },
  open(pos) {
    this.dlg = new Dialog({
      title: T("Терминалы"), content: this.html(), buttons: {},
      render: (h) => this.bind(h instanceof HTMLElement ? h : h[0]),
    }, { classes: ["ncm-dialog", "ncm-term-dlg"], width: 520, ...(pos?.left != null ? { left: pos.left, top: pos.top } : {}) });
    this.dlg.render(true);
  },
  toggle() { if (this.dlg?.rendered) this.dlg.close(); else this.open(); },
  bind(root) {
    if (!root) return;
    const file = root.querySelector("input[type=file]");
    root.querySelectorAll("button[data-a]").forEach(b => b.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const a = b.dataset.a, id = b.closest("[data-id]")?.dataset.id;
      if (a === "open") return openTerm(id);
      if (a === "import") return file?.click();
      if (a === "folder") return pickFolder();
      if (a === "closeall") { game.socket.emit(SOCKET, { action: "term-close" }); closeTerms(); return; }
      if (!isGM()) return;
      const list = terms(), t = list.find(x => x.id === id);
      if (!t) return;
      if (a === "show") {
        t.shared = true; await saveTerms(list);
        game.socket.emit(SOCKET, { action: "term-open", id });
        openTerm(id);
        ui.notifications.info(`${T("Терминал открыт у игроков:")} ${t.name}`);
      }
      if (a === "toggle") { t.shared = !t.shared; await saveTerms(list); if (!t.shared) game.socket.emit(SOCKET, { action: "term-close", id }); }
      if (a === "rename") {
        const name = await new Promise(r => Dialog.prompt({ title: T("Переименовать"), content: `<input type="text" name="n" value="${esc(t.name)}" style="width:100%">`,
          callback: (h) => (h instanceof HTMLElement ? h : h[0]).querySelector("input").value, rejectClose: false }).then(r, () => r(null)));
        if (name) { t.name = name.trim(); await saveTerms(list); }
      }
      if (a === "export") saveDataToFile(JSON.stringify(t.data, null, 1), "application/json", `${t.name || "terminal"}.json`);
      if (a === "del") {
        const ok = await Dialog.confirm({ title: T("Удалить"), content: `<p>${T("Удалить терминал")} «${esc(t.name)}»?</p>` });
        if (ok) { await saveTerms(list.filter(x => x.id !== id)); const all = foundry.utils.deepClone(netAll()); delete all[id]; await game.settings.set(MID, "termNet", all); game.socket.emit(SOCKET, { action: "term-close", id }); closeTerms(id); }
      }
    }));
    file?.addEventListener("change", async () => {
      const list = terms(); let n = 0;
      for (const f of file.files) {
        try {
          const d = JSON.parse(await f.text());
          if (!d || !(Array.isArray(d.files) || Array.isArray(d.msgs))) throw new Error("no files/msgs");
          list.push({ id: rid(), name: d.title || f.name.replace(/\.json$/i, ""), data: d, shared: false }); n++;
        } catch (e) { console.error(MID, e); ui.notifications.error(`${T("Не похоже на терминал:")} ${f.name}`); }
      }
      if (n) { await saveTerms(list); ui.notifications.info(`${T("Импортировано терминалов:")} ${n}`); }
      file.value = "";
    });
  },
};

/* ---------------------------------------------------------------- импорт папки с раздатками */

const IMG_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
const FP = () => foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker?.implementation ?? globalThis.FilePicker;
const nameOf = (p) => decodeURIComponent(p.split("/").pop()).replace(/\.[^.]+$/, "").replace(/^\d+[_ .-]*/, "").replace(/_/g, " ");

function pickFolder() {
  try {
    const fp = new (FP())({ type: "folder", current: "assets", callback: (path) => importFolder(path) });
    Promise.resolve(fp.render(true)).then(() => { const el = fp.element?.[0] ?? fp.element; if (el?.style) el.style.zIndex = "10000"; });
  } catch (e) {
    console.error(MID, e);
    Dialog.prompt({ title: T("Из папки"), content: `<p>${T("Путь к папке в данных Foundry:")}</p><input type="text" value="assets/" style="width:100%">`,
      callback: (h) => importFolder((h instanceof HTMLElement ? h : h[0]).querySelector("input").value.trim()), rejectClose: false });
  }
}

/** .json → терминал (данные в мире), .html → терминал-страница (открывается как есть), картинки → журнал «Раздатки». */
async function importFolder(path) {
  if (!path) return;
  path = String(path).replace(/\/+$/, "");
  let res;
  try { res = await FP().browse("data", path); } catch (e) { console.error(MID, e); return ui.notifications.error(`${T("Не открыть папку:")} ${path}`); }
  const files = (res?.files ?? []).slice().sort();
  const list = terms(); let nT = 0, nU = 0;
  for (const f of files) {
    try {
      if (/\.json$/i.test(f)) {
        const d = await (await fetch(encodeURI(decodeURI(f)) + `?v=${Date.now()}`)).json();
        if (!d || !(Array.isArray(d.files) || Array.isArray(d.msgs))) continue;
        const old = list.find(t => t.from === f);
        if (old) { old.data = d; nU++; } else { list.push({ id: rid(), name: d.title || nameOf(f), data: d, shared: false, from: f }); nT++; }
      } else if (/\.html?$/i.test(f)) {
        if (list.some(t => t.src === f)) { nU++; continue; }
        list.push({ id: rid(), name: nameOf(f), src: f, shared: false, from: f }); nT++;
      }
    } catch (e) { console.error(MID, f, e); }
  }
  if (nT || nU) await saveTerms(list);
  // картинки — в один журнал на папку, страница на картинку; уже добавленные не дублируются
  const imgs = files.filter(f => IMG_EXT.test(f));
  let nI = 0, je = null;
  if (imgs.length) {
    je = game.journal.find(j => j.getFlag?.(MID, "folder") === path);
    const folderName = nameOf(path.split("/").pop());
    if (!je) je = await JournalEntry.create({ name: `${T("Раздатки")} · ${folderName}`, flags: { [MID]: { folder: path } } });
    const have = new Set(je.pages.map(p => p.src));
    const pages = imgs.filter(f => !have.has(f)).map((f, i) => ({ name: nameOf(f), type: "image", src: f, sort: (je.pages.size + i + 1) * 100000 }));
    if (pages.length) { await je.createEmbeddedDocuments("JournalEntryPage", pages); nI = pages.length; }
  }
  ui.notifications.info(`${T("Из папки")}: ${T("терминалов новых")} ${nT}, ${T("обновлено")} ${nU}, ${T("картинок в журнал")} ${nI}.`);
  if (je && nI) je.sheet?.render(true);
}

/* ---------------------------------------------------------------- сокет, API, кнопки */

Hooks.once("ready", () => {
  game.socket.on(SOCKET, (d) => {
    if (!d || !String(d.action).startsWith("term-")) return;
    if (d.action === "term-open" && !isGM()) {
      if (Array.isArray(d.users) && !d.users.includes(game.user.id)) return;
      // настройка мира может прийти чуть позже сокета — подождать
      let n = 0; const tryOpen = () => termById(d.id) ? openTerm(d.id) : (n++ < 20 && setTimeout(tryOpen, 250));
      tryOpen();
    }
    if (d.action === "term-close" && !isGM()) closeTerms(d.id);
    if (d.action === "term-net" && game.user === game.users.activeGM) netSet(d.id, d.st);
  });
  const api = game.modules.get(MID).api ?? (game.modules.get(MID).api = {});
  Object.assign(api, {
    termData: (id) => termById(id)?.data ?? null,
    termState: (id) => foundry.utils.deepClone(netAll()[id] ?? null),
    termSetState: (id, st) => netSet(id, st),
    terminals: () => Manager.toggle(),
    openTerminal: (id) => openTerm(id),
    importFolder: (path) => importFolder(path),
    lang: () => lang(),
  });
  globalThis.NightCityMap = api;
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.settings?.settings?.has(`${MID}.terminals`)) return;
  if (!isGM() && !terms().some(t => t.shared)) return;
  const tok = controls.find?.(c => c.name === "token");
  tok?.tools?.push({ name: "ncm-term", title: T("Терминалы — компьютеры в стиле 2077"), icon: "fas fa-terminal", button: true, onClick: () => Manager.toggle() });
});
