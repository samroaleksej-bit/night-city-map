/*
 * Foundry's file browser, found the same way on every version.
 * v13+ : foundry.applications.apps.FilePicker (and its .implementation, which The Forge and other modules may replace).
 * v12  : FilePicker is a global class declared by the core script. Such a class is reachable by its bare name only,
 *        it is NOT a property of globalThis/window, so `globalThis.FilePicker` is undefined there. That was the
 *        "FilePicker not found" bug: the bare name has to be used.
 */
function legacyClass() {
  try { return FilePicker; } catch (e) { return undefined; }   // eslint-disable-line no-undef
}

/** The FilePicker class. need = name of a static method the class must have (e.g. "browse"). */
export function filePickerClass(need = null) {
  const ok = (c) => !!c && (!need || typeof c[need] === "function");
  const modern = foundry.applications?.apps?.FilePicker;
  for (const c of [modern?.implementation, modern]) if (ok(c)) return c;
  const old = legacyClass();
  for (const c of [old?.implementation, old]) if (ok(c)) return c;
  return null;
}

/** List a folder. Uses FilePicker.browse; if no class offers it, asks the server directly, as the core does. */
export async function browseFiles(source, target, options = {}) {
  const FP = filePickerClass("browse");
  if (FP) return FP.browse(source, target, options);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("file browser timeout")), 15000);
    game.socket.emit("manageFiles", { action: "browseFiles", storage: source, target }, options, (r) => {
      clearTimeout(t);
      if (!r || r.error) reject(new Error(r?.error || "no response")); else resolve(r);
    });
  });
}

/** Split a path into storage source / target / bucket the way the picker itself would (S3, The Forge...). */
export function parsePath(path) {
  for (const need of ["parse", "matchS3URL"]) {
    const FP = filePickerClass(need);
    try {
      if (need === "parse" && FP) { const pr = FP.parse(path); if (pr?.source) return { source: pr.source, target: pr.target ?? path, bucket: pr.bucket ?? null }; }
      if (need === "matchS3URL" && FP) { const m = FP.matchS3URL(path); if (m?.groups) return { source: "s3", target: m.groups.key, bucket: m.groups.bucket }; }
    } catch (e) { /* not this kind of path */ }
  }
  return null;
}
