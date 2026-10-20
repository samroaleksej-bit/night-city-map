/*
 * Netrun Breach — a code-matrix hacking minigame for Cyberpunk RED (Foundry VTT).
 * The GM launches a breach for a player; the netrunner's Interface rank sets buffer size and time,
 * the floor's DV sets the grid and the daemons. The result goes to chat.
 */
const MID = "netrun-breach";
const SOCKET = `module.${MID}`;
const ru = () => { try { const v = game.settings.get(MID, "lang"); if (v !== "auto") return v === "ru"; } catch (e) { /* */ } return String(game.i18n?.lang ?? "en").startsWith("ru"); };
const L = (r, e) => ru() ? r : e;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = (n) => Math.floor(Math.random() * n);
const CODES = ["A3", "0F", "D4", "7E", "C9", "5B"];

/** Сложность по DV этажа: размер сетки и длины демонов. */
const PRESETS = {
  6: { n: 5, lens: [2, 3] },
  8: { n: 5, lens: [2, 3, 3] },
  10: { n: 6, lens: [3, 3, 4] },
  12: { n: 6, lens: [3, 4, 4] },
  14: { n: 7, lens: [4, 4, 5] }
};
const DAEMONS = () => [
  L("Backdoor · пароль этажа вскрыт", "Backdoor · floor password cracked"),
  L("Eye-Dee · данные этажа", "Eye-Dee · floor data"),
  L("Control · узел управления", "Control · control node")
];
const bufferFor = (rank) => 4 + Math.ceil(Math.max(0, rank) / 2);
const timeFor = (rank, dv) => Math.max(15, 25 + rank * 4 - (dv - 6));

/** Сетка + гарантированно проходимые демоны: все они — куски одного допустимого пути. */
function generate({ dv, rank }) {
  const p = PRESETS[dv] ?? PRESETS[8], n = p.n, B = bufferFor(rank);
  let grid, path;
  for (let tries = 0; tries < 200; tries++) {
    grid = Array.from({ length: n }, () => Array.from({ length: n }, () => CODES[rnd(CODES.length)]));
    path = []; const used = new Set(); let axis = "row", idx = 0, ok = true;
    for (let k = 0; k < B; k++) {
      const opts = [];
      for (let j = 0; j < n; j++) { const [r, c] = axis === "row" ? [idx, j] : [j, idx]; if (!used.has(r * n + c)) opts.push([r, c]); }
      if (!opts.length) { ok = false; break; }
      const [r, c] = opts[rnd(opts.length)]; used.add(r * n + c); path.push([r, c]);
      if (axis === "row") { axis = "col"; idx = c; } else { axis = "row"; idx = r; }
    }
    if (ok) break;
  }
  const codes = path.map(([r, c]) => grid[r][c]);
  const lens = p.lens.map(l => Math.min(l, B));
  const total = lens.reduce((a, b) => a + b, 0);
  const seqs = []; let o = 0;
  lens.forEach((len, i) => {
    const start = total <= B ? o : Math.round(i * (B - len) / Math.max(1, lens.length - 1));
    seqs.push(codes.slice(start, start + len)); o += len;
  });
  return { n, grid, seqs, buffer: B, time: timeFor(rank, dv) };
}

/* ---------------------------------------------------------------- звук */
const Sfx = {
  ctx: null,
  vol() { try { return Number(game.settings.get("core", "globalInterfaceVolume") ?? 0.5); } catch (e) { return 0.5; } },
  t(f1, f2, d, type = "square", g = 0.05, delay = 0) {
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ctx ??= new C(); const ctx = this.ctx, t = ctx.currentTime + 0.01 + delay, o = ctx.createOscillator(), gn = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, g * this.vol()), t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* */ }
  },
  pick() { this.t(1800, 1200, 0.05, "square", 0.04); },
  daemon() { [0, 0.09, 0.18].forEach((d, i) => this.t(700 + i * 300, 900 + i * 300, 0.12, "sine", 0.08, d)); },
  win() { [0, 0.1, 0.2, 0.32].forEach((d, i) => this.t(500 + i * 200, 800 + i * 250, 0.16, "triangle", 0.09, d)); },
  fail() { this.t(300, 90, 0.6, "sawtooth", 0.08); }
};

/* ---------------------------------------------------------------- игра */
const Game = {
  el: null, s: null, timer: null,
  open(job) {
    this.close(true);
    const g = job.g;
    this.s = { ...job, used: new Set(), buf: [], axis: "row", idx: 0, done: g.seqs.map(() => false), t0: 0, left: g.time, over: false, hover: null };
    const el = document.createElement("div"); el.id = "nb-root"; document.body.appendChild(el); this.el = el;
    el.addEventListener("click", (ev) => this.onClick(ev));
    el.addEventListener("pointerover", (ev) => { const c = ev.target.closest("[data-rc]"); this.s.hover = c ? c.dataset.code : null; this.paintHover(); });
    el.addEventListener("keydown", (ev) => ev.stopPropagation());
    this.render(); requestAnimationFrame(() => el.classList.add("on"));
  },
  close(silent) { clearInterval(this.timer); this.timer = null; const el = this.el; this.el = null; this.s = null; if (el) { el.classList.remove("on"); setTimeout(() => el.remove(), silent ? 0 : 300); } },
  progress(seq) { // сколько кодов демона уже стоит в конце буфера
    const b = this.s.buf;
    for (let k = Math.min(seq.length, b.length); k > 0; k--) if (seq.slice(0, k).every((x, i) => x === b[b.length - k + i])) return k;
    return 0;
  },
  canPick(r, c) { const s = this.s; return !s.over && !s.used.has(r * s.g.n + c) && (s.axis === "row" ? r === s.idx : c === s.idx); },
  pick(r, c) {
    const s = this.s; if (!this.canPick(r, c)) return;
    if (!s.t0) { s.t0 = Date.now(); this.timer = setInterval(() => this.tick(), 100); }
    s.used.add(r * s.g.n + c); s.buf.push(s.g.grid[r][c]); Sfx.pick();
    if (s.axis === "row") { s.axis = "col"; s.idx = c; } else { s.axis = "row"; s.idx = r; }
    s.g.seqs.forEach((q, i) => { if (!s.done[i] && this.progress(q) === q.length) { s.done[i] = true; Sfx.daemon(); } });
    // тупик: в активной линии нечего брать
    const free = Array.from({ length: s.g.n }, (_, j) => s.axis === "row" ? [s.idx, j] : [j, s.idx]).some(([a, b]) => !s.used.has(a * s.g.n + b));
    if (s.done.every(Boolean) || s.buf.length >= s.g.buffer || !free) return this.finish(s.done.every(Boolean) ? "all" : s.buf.length >= s.g.buffer ? "buffer" : "stuck");
    this.render();
  },
  tick() {
    const s = this.s; if (!s || s.over) return;
    s.left = Math.max(0, s.g.time - (Date.now() - s.t0) / 1000);
    const bar = this.el?.querySelector(".nb-time i"), txt = this.el?.querySelector(".nb-time b");
    if (bar) bar.style.width = `${(s.left / s.g.time) * 100}%`;
    if (txt) txt.textContent = s.left.toFixed(1);
    if (s.left <= 0) this.finish("time");
  },
  finish(why) {
    const s = this.s; if (!s || s.over) return;
    s.over = why; clearInterval(this.timer); this.timer = null;
    const n = s.done.filter(Boolean).length;
    n ? Sfx.win() : Sfx.fail();
    this.render();
    report(s, why);
  },
  render() {
    const s = this.s, g = s.g; if (!this.el) return;
    const names = s.names;
    const cell = (r, c) => {
      const used = s.used.has(r * g.n + c), act = !s.over && (s.axis === "row" ? r === s.idx : c === s.idx);
      return `<button class="nb-c${used ? " used" : ""}${act ? " act" : ""}" data-rc="${r},${c}" data-code="${g.grid[r][c]}" ${used || !act ? "tabindex=-1" : ""}>${used ? "[ ]" : g.grid[r][c]}</button>`;
    };
    const why = { all: L("ВСЕ ДЕМОНЫ ЗАГРУЖЕНЫ", "ALL DAEMONS UPLOADED"), buffer: L("БУФЕР ЗАПОЛНЕН", "BUFFER FULL"), stuck: L("ТУПИК: НЕЧЕГО ВЫБРАТЬ", "DEAD END: NOTHING TO PICK"), time: L("ВРЕМЯ ВЫШЛО", "TIME'S UP"), quit: L("ОТКЛЮЧЕНИЕ", "JACKED OUT") }[s.over] ?? "";
    const nDone = s.done.filter(Boolean).length;
    this.el.className = `on${s.over ? " over" : ""}${s.over && !nDone ? " fail" : ""}`;
    this.el.innerHTML = `<div class="nb-win" role="dialog" aria-label="Netrun breach">
      <header class="nb-head"><span class="nb-k">NET · ${L("ВЗЛОМ ЭТАЖА", "FLOOR BREACH")}</span><span>DV ${s.dv} · Interface ${s.rank}</span>
        <div class="nb-time"><b>${s.left.toFixed(1)}</b><span><i style="width:${(s.left / g.time) * 100}%"></i></span></div></header>
      <div class="nb-body">
        <section class="nb-matrix"><h3>${L("КОД-МАТРИЦА", "CODE MATRIX")}</h3>
          <div class="nb-grid" style="--n:${g.n}">${Array.from({ length: g.n }, (_, r) => Array.from({ length: g.n }, (_, c) => cell(r, c)).join("")).join("")}</div>
          <p class="nb-hint">${s.over ? "" : s.t0 ? (s.axis === "row" ? L("Выбирай в подсвеченной строке", "Pick in the highlighted row") : L("Выбирай в подсвеченном столбце", "Pick in the highlighted column")) : L("Начни с верхней строки. Таймер пойдёт с первого кода.", "Start in the top row. The timer starts on your first pick.")}</p></section>
        <section class="nb-side">
          <h3>${L("БУФЕР", "BUFFER")} <small>${s.buf.length}/${g.buffer}</small></h3>
          <div class="nb-buf">${Array.from({ length: g.buffer }, (_, i) => `<span class="${s.buf[i] ? "f" : ""}">${s.buf[i] ?? ""}</span>`).join("")}</div>
          <h3>${L("ДЕМОНЫ", "DAEMONS")}</h3>
          <div class="nb-daemons">${g.seqs.map((q, i) => { const p = s.done[i] ? q.length : this.progress(q); const failed = s.over && !s.done[i];
            return `<div class="nb-d${s.done[i] ? " ok" : ""}${failed ? " no" : ""}"><div class="nb-seq">${q.map((x, j) => `<span class="${j < p ? "m" : ""}${!s.done[i] && j === p ? " next" : ""}" data-code="${x}">${x}</span>`).join("")}</div><b>${esc(names[i] ?? `Daemon ${i + 1}`)}</b><em>${s.done[i] ? L("ЗАГРУЖЕН", "UPLOADED") : failed ? L("ПРОВАЛ", "FAILED") : ""}</em></div>`; }).join("")}</div>
          ${s.over ? `<div class="nb-res"><b>${why}</b><span>${L("Демонов загружено", "Daemons uploaded")}: ${nDone}/${g.seqs.length}</span>${!nDone ? `<span class="nb-ice">${L("Тебя заметил лёд этажа. Мастер решит, что дальше.", "The floor's ICE noticed you. The GM decides what's next.")}</span>` : ""}</div>
            <button class="nb-btn" data-nb="close">${L("Закрыть", "Close")}</button>` : `<button class="nb-btn out" data-nb="quit">${L("Отключиться", "Jack out")}</button>`}
        </section>
      </div></div>`;
    this.paintHover();
  },
  paintHover() {
    const h = this.s?.hover; if (!this.el) return;
    this.el.querySelectorAll(".nb-seq span.hl").forEach(x => x.classList.remove("hl"));
    if (h) this.el.querySelectorAll(`.nb-seq span.next[data-code="${h}"]`).forEach(x => x.classList.add("hl"));
  },
  onClick(ev) {
    const c = ev.target.closest("[data-rc]"); if (c) { const [r, k] = c.dataset.rc.split(",").map(Number); return this.pick(r, k); }
    const b = ev.target.closest("[data-nb]"); if (!b) return;
    if (b.dataset.nb === "quit") return this.finish("quit");
    if (b.dataset.nb === "close") return this.close();
  }
};

/** Итог в чат: игрок и мастер видят карточку взлома. */
function report(s, why) {
  const n = s.done.filter(Boolean).length, used = s.t0 ? ((Date.now() - s.t0) / 1000).toFixed(1) : "0";
  const who = game.user.character?.name ?? game.user.name;
  const content = `<div class="nb-chat"><div class="nb-chat-k">NET · ${L("ВЗЛОМ ЭТАЖА", "FLOOR BREACH")} · DV ${s.dv}</div>
    <b>${esc(who)}</b> · Interface ${s.rank} · ${used} ${L("с", "s")} · ${L("буфер", "buffer")} ${s.buf.length}/${s.g.buffer}
    <ul>${s.g.seqs.map((q, i) => `<li class="${s.done[i] ? "ok" : "no"}">${s.done[i] ? "✔" : "✘"} ${esc(s.names[i] ?? "")}</li>`).join("")}</ul>
    ${!n ? `<div class="nb-chat-ice">${L("Провал: лёд этажа заметил нетраннера.", "Failed: the floor's ICE noticed the netrunner.")}</div>` : ""}</div>`;
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  const mode = game.settings.get(MID, "chat");
  ChatMessage.create({ speaker: { alias: "NET" }, content, whisper: mode === "public" ? [] : [...new Set([...gms, game.user.id])] });
}

/* ---------------------------------------------------------------- запуск мастером */
function rankOf(actor) {
  if (!actor) return 0;
  const roles = actor.items?.filter?.(i => i.type === "role") ?? [];
  const nr = roles.find(r => /netrunner|нетраннер/i.test(r.name) || /interface|интерфейс/i.test(String(r.system?.mainRoleAbility ?? "")));
  return Number(nr?.system?.rank ?? 0) || 0;
}

async function dialog() {
  if (!game.user.isGM) return;
  const players = game.users.filter(u => !u.isGM);
  const d = DAEMONS();
  const content = `<form class="nb-form">
    <label>${L("Кто взламывает", "Netrunner")}<select name="user">${players.map(u => `<option value="${u.id}" data-rank="${rankOf(u.character)}">${esc(u.character?.name ?? u.name)}${u.active ? "" : L(" (не в игре)", " (offline)")}</option>`).join("")}<option value="${game.user.id}" data-rank="4">${L("Я сам (проверить)", "Me (test run)")}</option></select></label>
    <label>${L("DV этажа", "Floor DV")}<select name="dv">${Object.keys(PRESETS).map(k => `<option value="${k}"${k === "8" ? " selected" : ""}>DV ${k} · ${PRESETS[k].n}×${PRESETS[k].n}, ${L("демонов", "daemons")}: ${PRESETS[k].lens.length}</option>`).join("")}</select></label>
    <label>${L("Ранг Interface", "Interface rank")}<input name="rank" type="number" min="0" max="10" value="${rankOf(players[0]?.character) || 4}"></label>
    <fieldset><legend>${L("Что даёт каждый демон", "What each daemon does")}</legend>
      ${d.map((x, i) => `<input name="d${i}" value="${esc(x)}">`).join("")}</fieldset>
    <p class="nb-note">${L("Буфер = 4 + половина ранга (вверх), время = 25 с + 4 с за ранг − (DV − 6).", "Buffer = 4 + half the rank (rounded up), time = 25 s + 4 s per rank − (DV − 6).")}</p></form>`;
  new Dialog({
    title: L("Взлом · нетраннинг", "Netrun breach"), content,
    buttons: { go: { icon: '<i class="fas fa-terminal"></i>', label: L("Запустить", "Launch"), callback: (html) => {
      const f = (html[0] ?? html).querySelector("form"), v = (k) => f.querySelector(`[name="${k}"]`)?.value;
      start({ user: v("user"), dv: Number(v("dv")), rank: Number(v("rank")), names: [v("d0"), v("d1"), v("d2")] });
    } } },
    default: "go",
    render: (html) => {
      const root = html[0] ?? html, sel = root.querySelector('[name="user"]'), rk = root.querySelector('[name="rank"]');
      sel?.addEventListener("change", () => { const r = Number(sel.selectedOptions[0]?.dataset.rank); if (r) rk.value = r; });
    }
  }, { width: 460, classes: ["nb-dialog"] }).render(true);
}

/** Запустить взлом: start({ user, dv, rank, names }). Можно из макроса. */
function start({ user, dv = 8, rank, names } = {}) {
  if (!game.user.isGM) return ui.notifications.warn(L("Запускать взлом может только мастер.", "Only the GM can launch a breach."));
  const u = game.users.get(user) ?? game.user;
  rank = Number.isFinite(rank) ? rank : (rankOf(u.character) || 4);
  const job = { id: foundry.utils.randomID(), dv, rank, names: (names ?? DAEMONS()).map((x, i) => x || DAEMONS()[i]), g: generate({ dv, rank }) };
  if (u.id === game.user.id) return Game.open(job);
  game.socket.emit(SOCKET, { action: "breach", user: u.id, job });
  ui.notifications.info(L(`Взлом запущен у ${u.character?.name ?? u.name}.`, `Breach launched for ${u.character?.name ?? u.name}.`));
}

Hooks.once("init", () => {
  game.settings.register(MID, "chat", { name: "NB.ChatName", hint: "NB.ChatHint", scope: "world", config: true, type: String, default: "whisper", choices: { whisper: "NB.ChatWhisper", public: "NB.ChatPublic" } });
  game.settings.register(MID, "lang", { name: "NB.LangName", scope: "client", config: true, type: String, default: "auto", choices: { auto: "NB.LangAuto", ru: "Русский", en: "English" } });
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, (d) => { if (d?.action === "breach" && d.user === game.user.id) Game.open(d.job); });
  const api = { start, dialog, generate, open: (job) => Game.open(job) };
  game.modules.get(MID).api = api; globalThis.NetBreach = api;
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tool = { name: "netbreach", title: L("Взлом · нетраннинг", "Netrun breach"), icon: "fas fa-terminal", button: true, visible: game.user.isGM, onClick: () => dialog(), onChange: () => dialog() };
  if (Array.isArray(controls)) controls.find(c => c.name === "token")?.tools.push(tool);
  else if (controls?.tokens?.tools) controls.tokens.tools.netbreach = { ...tool, order: 99 };
});
