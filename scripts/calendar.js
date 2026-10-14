/* Календарь Найт-Сити для Simple Calendar: григорианский, по-русски, 2045 год. */

import { T } from "./i18n.js";

export const SCID = "foundryvtt-simple-calendar";
export const SC_NAME = "Найт-Сити 2045";
/** Имя календаря на языке карты. */
export const scName = () => T(SC_NAME);

const MONTHS = [
  ["Январь", "Янв"], ["Февраль", "Фев"], ["Март", "Мар"], ["Апрель", "Апр"], ["Май", "Май"], ["Июнь", "Июн"],
  ["Июль", "Июл"], ["Август", "Авг"], ["Сентябрь", "Сен"], ["Октябрь", "Окт"], ["Ноябрь", "Ноя"], ["Декабрь", "Дек"]
];
const WEEK = [["Понедельник", "Пн"], ["Вторник", "Вт"], ["Среда", "Ср"], ["Четверг", "Чт"], ["Пятница", "Пт"], ["Суббота", "Сб", true], ["Воскресенье", "Вс", true]];
const SEASONS = { Spring: "Весна", Summer: "Лето", Fall: "Осень", Winter: "Зима" };
const PHASES = ["Новолуние", "Растущий серп", "Первая четверть", "Растущая луна", "Полнолуние", "Убывающая луна", "Последняя четверть", "Убывающий серп"];

/** Праздники года (заметки календаря). */
export const NC_HOLIDAYS = [
  { m: 1, d: 1, title: "Новый год", text: "Весь город в неоне и фейерверках. Копы и NCPD на взводе, бустеры — на крышах." },
  { m: 7, d: 4, title: "День независимости", text: "Праздник старых США. В Найт-Сити — повод для вечеринки и стрельбы в воздух." },
  { m: 10, d: 31, title: "Хэллоуин", text: "Маски, импланты-светильники и бандиты в костюмах. Отличная ночь для заказов." },
  { m: 12, d: 25, title: "Рождество", text: "Распродажи в Хейвуде, переполненные моллы, ёлки в голограммах." }
];

/** Конфиг календаря на основе встроенного gregorian.json Simple Calendar. */
export function buildCalendar(base, date) {
  const c = foundry.utils.deepClone(base);
  c.currentDate = { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() - 1, seconds: date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 };
  c.name = scName();
  c.months = c.months.map((m, i) => ({ ...m, name: T(MONTHS[i][0]), abbreviation: T(MONTHS[i][1]) }));
  c.weekdays = WEEK.map(([name, abbreviation, rest], i) => ({ name: T(name), abbreviation: T(abbreviation), numericRepresentation: i + 1, restday: !!rest }));
  c.year = { ...c.year, numericRepresentation: 2045, firstWeekday: 3, showWeekdayHeadings: true, prefix: "", postfix: "" }; // 01.01.1970 — четверг
  c.seasons = (c.seasons ?? []).map(s => ({ ...s, name: SEASONS[s.name] ? T(SEASONS[s.name]) : s.name }));
  c.moons = (c.moons ?? []).map(m => ({ ...m, name: T("Луна"), phases: m.phases.map((p, i) => ({ ...p, name: PHASES[i] ? T(PHASES[i]) : p.name })) }));
  c.noteCategories = [{ name: T("Праздник"), textColor: "#FFFFFF", color: "#b3123a" }, { name: T("Заказ"), textColor: "#000000", color: "#f2e600" }, { name: T("Встреча"), textColor: "#FFFFFF", color: "#1f8fa6" }];
  c.general = { ...c.general, gameWorldTimeIntegration: "mixed", showClock: true, pf2eSync: false,
    dateFormat: { date: "DD.MM.YYYY", time: "HH:mm", monthYear: "MMMM YYYY", chatTime: "DD.MM.YYYY HH:mm" } };
  return c;
}
