/* Досье Danger Gal — личный модуль: папки на кандидатов открываются в окне Foundry, мастер показывает их игрокам. */
const MID = "nc-dossiers";
const SOCKET = `module.${MID}`;
let LIST = [];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

class DossierWindow extends Application {
  constructor(d, folder = "") { super({ id: `ncd-${d.id}`, title: `NCNET · ${d.name}` }); this.d = d; this.folder = folder; }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { width: Math.min(1180, window.innerWidth - 80), height: Math.min(820, window.innerHeight - 60), resizable: true, classes: ["ncd-window"], popOut: true });
  }
  async _renderInner() {
    const src = `modules/${MID}/dossiers/${this.d.id}/index.html${this.d.id.startsWith("term-") ? "?id=ncd-" + this.d.id : ""}${this.folder ? "#" + this.folder : ""}`;
    return $(`<div class="ncd-frame"><iframe src="${src}" title="${esc(this.d.name)}" allow="fullscreen"></iframe></div>`);
  }
}

async function load() {
  if (LIST.length) return LIST;
  try { LIST = await (await fetch(`modules/${MID}/dossiers/index.json`, { cache: "no-cache" })).json(); } catch (e) { console.error(MID, e); LIST = []; }
  return LIST;
}
async function open(id, folder = "") {
  const d = (await load()).find(x => x.id === id); if (!d) return ui.notifications.warn(`Досье «${id}» не найдено.`);
  const prev = Object.values(ui.windows).find(w => w.id === `ncd-${id}`); if (prev) await prev.close();
  new DossierWindow(d, folder).render(true);
}
async function show(id, folder = "") {
  if (!game.user.isGM) return;
  game.socket.emit(SOCKET, { action: "open", id, folder });
  await open(id, folder);
  ui.notifications.info("Досье открыто у игроков.");
}
async function panel() {
  if (!game.user.isGM) return;
  const list = await load();
  let grp = null;
  const rows = list.map(d => `${(d.group ?? "Досье") !== grp ? `<h3 class="ncd-grp">${esc(grp = d.group ?? "Досье")}</h3>` : ""}<div class="ncd-row" data-id="${d.id}"><b>${esc(d.name)}</b>
    <select>${(d.folders ?? [{ id: "", name: "Все папки" }]).map(f => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join("")}</select>
    <button type="button" data-a="open"><i class="fas fa-folder-open"></i> Открыть</button>
    <button type="button" data-a="show"><i class="fas fa-eye"></i> Показать игрокам</button></div>`).join("") || "<p>Досье нет.</p>";
  new Dialog({
    title: "Досье Danger Gal", content: `<div class="ncd-panel">${rows}</div>`, buttons: { close: { label: "Закрыть" } },
    render: (html) => (html[0] ?? html).querySelectorAll("[data-a]").forEach(b => b.addEventListener("click", () => {
      const row = b.closest(".ncd-row"), id = row.dataset.id, folder = row.querySelector("select").value;
      b.dataset.a === "show" ? show(id, folder) : open(id, folder);
    }))
  }, { width: 640, classes: ["ncd-dialog"] }).render(true);
}

Hooks.once("ready", () => {
  game.socket.on(SOCKET, (d) => { if (d?.action === "open" && !game.user.isGM) open(d.id, d.folder); });
  const api = { open, show, panel };
  game.modules.get(MID).api = api; globalThis.NCDossiers = api;
});
Hooks.on("getSceneControlButtons", (controls) => {
  const tool = { name: "nc-dossiers", title: "Досье Danger Gal и раздатки", icon: "fas fa-folder-tree", button: true, visible: game.user.isGM, onClick: () => panel(), onChange: () => panel() };
  if (Array.isArray(controls)) controls.find(c => c.name === "token")?.tools.push(tool);
  else if (controls?.tokens?.tools) controls.tokens.tools["nc-dossiers"] = { ...tool, order: 98 };
});
