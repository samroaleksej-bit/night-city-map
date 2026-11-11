/* Движок книги: листание, закладки, связь с Foundry. Разворот n = сколько листов перевёрнуто (0 - закрытая обложка). */
(() => {
  const P = window.PAGES || [], leavesEl = document.getElementById("leaves"), book = document.getElementById("book");
  const L = Math.ceil(P.length / 2); let n = 0;
  const leaves = [];
  for (let i = 0; i < L; i++) {
    const leaf = document.createElement("div"); leaf.className = "leaf";
    for (const [k, side] of [[2 * i, "front"], [2 * i + 1, "back"]]) {
      const pg = document.createElement("div"); const d = P[k] || { html: "" };
      pg.className = `pg ${side} ${d.cls || ""}`; pg.dataset.k = k; pg.innerHTML = d.html + (d.cls === "cover" || !d.html ? "" : `<div class="no">· ${k} ·</div>`);
      leaf.appendChild(pg);
    }
    leavesEl.appendChild(leaf); leaves.push(leaf);
  }
  function fit() { const s = Math.min((innerWidth - 150) / 1100, (innerHeight - 60) / 720); book.style.scale = Math.max(.3, s); }
  function draw(silent) {
    leaves.forEach((lf, i) => { const f = i < n; lf.classList.toggle("flipped", f); lf.style.zIndex = f ? i + 1 : L - i; });
    book.style.translate = n === 0 ? "-25% 0" : n === L ? "25% 0" : "0 0";
    document.getElementById("prev").disabled = n === 0; document.getElementById("next").disabled = n === L;
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", +b.dataset.n === n));
    document.querySelectorAll("video").forEach(v => { const k = +v.closest(".pg").dataset.k; if (n > 0 && (k === 2 * n - 1 || k === 2 * n)) v.play().catch(() => {}); else v.pause(); });
    try { history.replaceState(null, "", "#" + n); } catch (e) { /* */ }
    if (!silent) try { parent.postMessage({ type: "jb-page", n }, "*"); } catch (e) { /* */ }
  }
  /* Шелест страницы: одна запись, каждый раз с чуть другой скоростью. Громкость можно задать в адресе: index.html?vol=0.3 (0 - без звука). */
  const VOL = (() => { const v = parseFloat(new URLSearchParams(location.search).get("vol")); return isNaN(v) ? .6 : Math.max(0, Math.min(1, v)); })();
  const SRC = (window.__F && window.__F["snd/page.mp3"]) || "snd/page.mp3";
  const SND = [0, 1, 2].map(() => { const a = new Audio(SRC); a.preload = "auto"; return a; });
  let si = 0;
  function rustle(steps) {
    if (!VOL) return;
    const times = Math.min(3, Math.max(1, steps));
    for (let j = 0; j < times; j++) setTimeout(() => { const a = SND[si++ % SND.length]; try { a.currentTime = 0; a.volume = VOL; a.playbackRate = .92 + Math.random() * .18; a.play().catch(() => {}); } catch (err) { /* */ } }, j * 170);
  }
  function go(k, silent) { k = Math.max(0, Math.min(L, k | 0)); if (k === n) return; const d = Math.abs(k - n); n = k; rustle(d); draw(silent); }
  window.jbGo = (k) => go(k);
  document.getElementById("prev").onclick = () => go(n - 1);
  document.getElementById("next").onclick = () => go(n + 1);
  addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === " ") go(n + 1); if (e.key === "ArrowLeft") go(n - 1); });
  leavesEl.addEventListener("click", (e) => {
    if (e.target.closest(".ho,.vid")) return;
    const t = e.target.closest("[data-go]"); if (t) return go(+t.dataset.go);
    const r = book.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (x > .86) go(n + 1); else if (x < .14) go(n - 1);
  });
  const tabs = document.getElementById("tabs");
  (window.TABS || []).forEach(([label, k, title]) => { const b = document.createElement("button"); b.textContent = label; b.title = title; b.dataset.n = k; b.onclick = () => go(k); tabs.appendChild(b); });
  addEventListener("message", (e) => { if (e.data?.type === "jb-goto") go(e.data.n, true); });
  addEventListener("resize", fit); fit();
  n = Math.max(0, Math.min(L, parseInt(location.hash.slice(1), 10) || 0)); draw(true);
  /* Вложения: кто что видит. Вне Foundry (предпросмотр) считаем зрителя мастером. */
  const A = (p) => (window.__F && window.__F[p]) || p;
  const inFoundry = parent !== window;
  const st = { gm: !inFoundry, revealed: new Set() };
  function drawHo() {
    document.querySelectorAll(".ho").forEach(f => {
      const id = f.dataset.ho, open = st.revealed.has(id), see = st.gm || open, sheet = f.querySelector(".sheet");
      f.classList.toggle("open", see);
      if (see && !sheet.querySelector("img")) { const im = new Image(); im.src = A(f.dataset.src); im.alt = f.dataset.cap; sheet.prepend(im); }
      if (!see) sheet.querySelector("img")?.remove();
      f.querySelector("figcaption").innerHTML = (see ? f.dataset.cap : "") + (st.gm ? ` <button type="button" class="rv ${open ? "on" : ""}">${open ? "Игроки видят · скрыть" : "Показать игрокам"}</button>` : "");
    });
  }
  const lb = document.createElement("div"); lb.id = "lb"; document.body.appendChild(lb);
  lb.onclick = () => { lb.classList.remove("on"); lb.innerHTML = ""; };
  leavesEl.addEventListener("click", (e) => {
    const rv = e.target.closest(".rv");
    if (rv) { const id = rv.closest(".ho").dataset.ho, on = !st.revealed.has(id); on ? st.revealed.add(id) : st.revealed.delete(id); drawHo();
      try { parent.postMessage({ type: "jb-reveal", id, on }, "*"); } catch (err) { /* */ } return; }
    const im = e.target.closest(".ho img"), v = e.target.closest(".vid video");
    if (im) { lb.innerHTML = `<img src="${im.src}" alt="">`; lb.classList.add("on"); }
    if (v) { lb.innerHTML = `<video src="${v.currentSrc || v.src}" muted loop autoplay playsinline></video>`; lb.classList.add("on"); }
  }, true);
  addEventListener("keydown", (e) => { if (e.key === "Escape") lb.onclick(); });
  addEventListener("message", (e) => { if (e.data?.type === "jb-state") { st.gm = !!e.data.gm; st.revealed = new Set(e.data.revealed || []); drawHo(); } });
  drawHo();
  if (inFoundry) try { parent.postMessage({ type: "jb-hello" }, "*"); } catch (err) { /* */ }
  document.querySelectorAll(".port img,.fres img").forEach(im => im.addEventListener("error", () => im.remove()));
})();
