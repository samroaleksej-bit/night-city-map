/*
 * Language layer. The module is written in Russian; English (and any future language) is a
 * dictionary keyed by the Russian source text: T("Русский текст") → "English text".
 * Language = module setting "Map language" (auto / ru / en); "auto" follows Foundry's language.
 * Anything missing from a dictionary falls back to Russian, so a partial translation never breaks.
 */
import EN from "./lang/en.js";

const MID = "night-city-map";
const DICTS = { en: EN };
let cached = null;

/** Current map language code: "ru" or a key of DICTS. */
export function lang() {
  if (cached) return cached;
  let pref = "auto";
  try { if (game.settings.settings.has(`${MID}.lang`)) pref = game.settings.get(MID, "lang"); } catch (e) { /* not registered yet */ }
  const code = pref !== "auto" ? pref : String(game.i18n?.lang ?? "en").slice(0, 2);
  return code === "ru" ? "ru" : DICTS[code] ? code : "en";
}
/** Fix the language for the session (called on "setup", when Foundry's language is final). */
export function freezeLang() { cached = null; cached = lang(); return cached; }
export const isRu = () => lang() === "ru";

/** Translate a Russian source string. */
export function T(s) {
  if (s == null || isRu()) return s;
  const d = DICTS[lang()];
  return d?.[s] ?? s;
}
