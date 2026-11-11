/* Книга Длани Симори - личный модуль: реестр экспедиции в виде книги. Мастер открывает её игрокам и листает, игроки идут следом. */
const MID = "jungle-book";
const SOCKET = `module.${MID}`;
const WIN_ID = "jb-book";
const TITLE = "Книга Длани Симори";
let TOC = [];
let lead = true; // мастер ведёт игроков за собой
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const frameHTML = (page) => `<div class="jb-frame"><iframe src="modules/${MID}/book/index.html#${Number(page) || 0}" title="${TITLE}" allow="fullscreen"></iframe></div>`;

let win = null;
function makeWindow(page) {
  const V2 = foundry?.applications?.api?.ApplicationV2;
  const w = Math.min(1240, window.innerWidth - 80), h = Math.min(860, window.innerHeight - 60);
  if (V2) {
    class BookWindow extends V2 {
      static DEFAULT_OPTIONS = { id: WIN_ID, classes: ["jb-window"], window: { title: TITLE, resizable: true }, position: { width: w, height: h } };
      async _renderHTML() { const d = document.createElement("div"); d.innerHTML = frameHTML(page); return d.firstElementChild; }
      _replaceHTML(result, content) { content.replaceChildren(result); }
    }
    return new BookWindow();
  }
  class BookWindowV1 extends Application {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { id: WIN_ID, title: TITLE, width: w, height: h, resizable: true, classes: ["jb-window"], popOut: true }); }
    async _renderInner() { return $(frameHTML(page)); }
  }
  return new BookWindowV1();
}
function frame() { return document.querySelector(`#${WIN_ID} iframe`); }
function goto(n) { try { frame()?.contentWindow?.postMessage({ type: "jb-goto", n: Number(n) || 0 }, "*"); } catch (e) { /* */ } }

async function loadToc() {
  if (TOC.length) return TOC;
  try { TOC = await (await fetch(`modules/${MID}/book/toc.json`, { cache: "no-cache" })).json(); } catch (e) { console.error(MID, e); TOC = []; }
  return TOC;
}
async function open(page = 0) {
  if (frame()) { goto(page); win?.bringToFront?.(); return; }
  win = makeWindow(page); await win.render(true);
}
async function show(page = 0) {
  if (!game.user.isGM) return;
  game.socket.emit(SOCKET, { action: "open", page });
  await open(page);
  ui.notifications.info("Книга открыта у игроков.");
}
async function panel() {
  if (!game.user.isGM) return;
  const list = await loadToc();
  const rows = list.map(c => `<div class="jb-row" data-page="${Number(c.page) || 0}"><b>${esc(c.name)}</b>
    <button type="button" data-a="open"><i class="fas fa-book-open"></i> Открыть</button>
    <button type="button" data-a="show"><i class="fas fa-eye"></i> Показать игрокам</button></div>`).join("") || "<p>Оглавление пусто.</p>";
  const content = `<div class="jb-panel"><label class="jb-lead"><input type="checkbox" id="jb-lead" ${lead ? "checked" : ""}> Игроки листают следом за мастером</label>${rows}</div>`;
  const wire = (root) => {
    root.querySelector("#jb-lead")?.addEventListener("change", (e) => { lead = e.target.checked; });
    root.querySelectorAll("[data-a]").forEach(b => b.addEventListener("click", () => {
      const page = Number(b.closest(".jb-row").dataset.page) || 0;
      b.dataset.a === "show" ? show(page) : open(page);
    }));
  };
  const D2 = foundry?.applications?.api?.DialogV2;
  if (D2) {
    const d = new D2({ window: { title: TITLE }, position: { width: 560 }, content, buttons: [{ action: "close", label: "Закрыть", default: true }] });
    await d.render(true); wire(d.element);
  } else {
    new Dialog({ title: TITLE, content, buttons: { close: { label: "Закрыть" } }, render: (html) => wire(html[0] ?? html) }, { width: 560 }).render(true);
  }
}

/* Вложения: список открытых игрокам листов хранится в настройке мира, меняет его только мастер. */
const revealed = () => { try { return game.settings.get(MID, "revealed") || []; } catch (e) { return []; } };
function pushState() { try { frame()?.contentWindow?.postMessage({ type: "jb-state", gm: !!game.user?.isGM, revealed: revealed() }, "*"); } catch (e) { /* */ } }
Hooks.once("init", () => {
  game.settings.register(MID, "revealed", { scope: "world", config: false, type: Array, default: [], onChange: () => pushState() });
});

/* Мастер перелистнул - книга у игроков открывается на том же развороте. */
window.addEventListener("message", (ev) => {
  const d = ev.data;
  if (d?.type === "jb-hello") return pushState();
  if (d?.type === "jb-reveal" && game.user?.isGM) {
    const set = new Set(revealed()); d.on ? set.add(String(d.id)) : set.delete(String(d.id));
    return void game.settings.set(MID, "revealed", [...set]);
  }
  if (d?.type !== "jb-page" || !game.user?.isGM || !lead) return;
  game.socket.emit(SOCKET, { action: "goto", page: d.n });
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, (d) => {
    if (game.user.isGM) return;
    if (d?.action === "open") open(d.page);
    if (d?.action === "goto") goto(d.page);
  });
  const api = { open, show, panel, goto };
  game.modules.get(MID).api = api; globalThis.JungleBook = api;
});
Hooks.on("getSceneControlButtons", (controls) => {
  const tool = { name: MID, title: TITLE, icon: "fas fa-book-open", button: true, visible: game.user.isGM, onClick: () => panel(), onChange: () => panel() };
  if (Array.isArray(controls)) controls.find(c => c.name === "token")?.tools.push(tool);
  else if (controls?.tokens?.tools) controls.tokens.tools[MID] = { ...tool, order: 97 };
});
