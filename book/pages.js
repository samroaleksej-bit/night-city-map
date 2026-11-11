/* Страницы книги. Страница 0 - обложка, дальше по порядку: нечётные слева, чётные справа.
   Разворот n показывает страницы 2n-1 и 2n. Портреты: положи файл в book/img/ с именем из src - появится вместо буквы.
   Здесь только то, что знает Орден и что можно видеть игрокам. Тайны героев сюда не писать. */
const SEAL = '<svg viewBox="0 0 100 100" fill="none" stroke="#ead9a6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M50 14v72M30 34c0 14 8 22 20 22s20-8 20-22"/><circle cx="50" cy="56" r="34" opacity=".5"/></svg>';

function hero(o) {
  return [
    { html: `<div class="eyebrow">Наёмник экспедиции · ${o.num}</div>
      <div class="port"><span class="sig">${o.sig}</span><img src="img/${o.img}" alt=""></div>
      <h2 class="hname">${o.name}</h2><p class="hline">${o.line}</p>` },
    { html: `<div class="eyebrow">Запись жреца-казначея</div><h2>${o.name}</h2><div class="rule"></div>
      <dl class="kv"><dt>Откуда</dt><dd>${o.from}</dd><dt>Зачем нанят</dt><dd>${o.why}</dd><dt>Приметы</dt><dd>${o.marks}</dd></dl>
      <div class="note">${o.note}</div>${o.stamp ? `<div class="stamp">${o.stamp}</div>` : ""}` }
  ];
}

const HEROES = [
  { num: "I", sig: "Х", img: "hazar.webp", name: "Ха'Зар", line: "леонин с обликом тигра · 21 год",
    from: "Орескос. Сирота, вырос в пустыне.",
    why: "Знает обряды пустыни и повадки нежити. Сам ищет на острове древний манускрипт.",
    marks: "Белые пятна на шкуре.",
    note: "Плату взял не глядя. Спросил только, далеко ли остров от пустыни." },
  { num: "II", sig: "С", img: "sinmin.webp", name: "Синь-Минь Суи", line: "полусовлин · монах",
    from: "Горный монастырь мастера Сюй Сяня.",
    why: "Паломник. Говорит, что на острове его ждёт первая ступень просветления. Защищает слабых.",
    marks: "Невысок, в перьях. Смотрит не мигая.",
    note: "От оружия отказался. Убивать не станет - предупредил сразу." },
  { num: "III", sig: "Р", img: "regilion.webp", name: "Регилион", line: "человек из Гарды · маг-бронник",
    from: "Гарда, академия.",
    why: "Чинит и зачаровывает доспех. Ищет знакомую по академии: её видели в землях людоящеров.",
    marks: "Ростом выше двери каюты. Повязка на глазу, трубка в зубах.",
    note: "О плате не торговался. Дважды спросил, когда отходим." },
  { num: "IV", sig: "М", img: "raize.webp", name: "Майстер Райзе", line: "инквизитор",
    from: "Не назвал. Служит Всевышнему, не Симори.",
    why: "Идёт за последними еретиками. Ордену с ним по пути, пока враг общий.",
    marks: "Бледен, говорит тихо. Возраст назвать отказался.",
    note: "За три ночи на берегу ни разу не видел его спящим. Говорит, что молится." },
  { num: "V", sig: "К", img: "kraik.webp", name: "Крайк", line: "людоящер · каторжник",
    from: "Авангардия. Вырос среди людей, в знатном доме.",
    why: "Осуждён за убийство жреца-инквизитора. Эшафот заменён каторгой в экспедиции - рук не хватает.",
    marks: "Умеет растягивать пасть в подобие улыбки. Лучше бы не умел.",
    note: "Держать в цепях до выхода в море. На суде не оправдывался.", stamp: "Каторжник" }
];

// подписи под живыми картинами Ха'Зара - правь здесь
const HAZAR_LIFE = [
  ["01", "детство", "Один на гребне бархана."],
  ["02", "товарищи", "Костёр и те, с кем делил дорогу."],
  ["03", "пустыня", "Гробницы под песком."],
  ["04", "красный туман", "Ночь, которую он не помнит."]
];
const HAZAR_EMO = ["Спокоен", "Улыбается", "В ярости", "Напуган", "Скорбит", "Решился"];
const SINMIN_LIFE = [
  ["01", "Ночь, когда сгорел дом."],
  ["02", "Монастырь над облаками."],
  ["03", "Мастер Сюй Сянь учит держать руки."],
  ["04", "Клятва: меч отложен, чаша пуста."]
];
const SINMIN_EMO = ["Спокоен", "Улыбается", "Гневается", "Потрясён", "Скорбит", "Решился"];
const RAIZE_LIFE = [
  ["01", "Дорога без конца."],
  ["02", "Ересь не сдаётся без боя."],
  ["03", "Голос, которого нет."],
  ["04", "Гарда на рассвете."]
];
const RAIZE_EMO = ["Спокоен", "Любопытствует", "В гневе", "Страшится", "Скорбит", "Решился"];
const KRAIK_LIFE = [
  ["01", "Яйцо в трюме торгового корабля."],
  ["02", "Диковинка на приёме."],
  ["03", "Свой среди знати. Почти."],
  ["04", "Ночь в часовне."]
];
const KRAIK_EMO = ["Спокоен", "Улыбается", "В ярости", "Напуган", "Скорбит", "Сосредоточен"];
const REGIL_LIFE = [
  ["01", "Парта, которая ему мала."],
  ["02", "Она смеётся. Он так и не сказал."],
  ["03", "Ночи в мастерской."],
  ["04", "Пустая комната и зелёная лента."]
];

/* Вложения: раздатки. Мастер открывает каждый лист игрокам кнопкой под ним; до этого игрок видит «Запечатано».
   [id, файл в book/ho/, подпись] */
const HO = {
  hazar: [["hazar-pismo", "pismo-ordena-hazar.webp", "Письмо Ордена"], ["hazar-motum", "hazar-list-motum-ainos.webp", "Лист «Мотум Айнос»"]],
  sinmin: [["sinmin-pismo", "pismo-ordena-sinmin.webp", "Письмо Ордена"], ["sinmin-kassian", "sinmin-nabrosok-kassiana.webp", "Набросок Кассиана"], ["sinmin-nastavleniya", "sinmin-tri-nastavleniya.webp", "Три наставления"]],
  regil: [["regil-pismo", "pismo-ordena-regil.webp", "Письмо Ордена"], ["regil-zapiska", "regil-zapiska-melissy.webp", "Записка Мелиссы"], ["regil-neotpr", "regil-neotpravlennoe-pismo.webp", "Неотправленное письмо"]],
  raize: [["raize-pismo", "pismo-ordena-raize.webp", "Письмо Ордена"], ["raize-protokol", "raize-protokol-doprosa.webp", "Протокол допроса"], ["raize-gramota", "raize-dolgovaya-gramota.webp", "Долговая грамота"]],
  kraik: [["kraik-sud", "kraik-postanovlenie-suda.webp", "Постановление суда"], ["kraik-etap", "kraik-etapny-list.webp", "Этапный лист"], ["kraik-valdau", "kraik-list-doma-valdau.webp", "Лист дома Вальдау"]]
};
const hoBox = ([id, file, cap]) => `<figure class="ho" data-ho="${id}" data-src="ho/${file}" data-cap="${cap}"><div class="sheet"><span class="lock">Запечатано</span></div><figcaption></figcaption></figure>`;
function inserts(key, name) {
  const [letter, ...rest] = HO[key];
  return [
    { html: `<div class="eyebrow">${name} · вложения</div><div class="hos one">${hoBox(letter)}</div>` },
    { html: `<div class="eyebrow">${name} · вложения</div><div class="hos ${rest.length > 1 ? "two" : "one"}">${rest.map(hoBox).join("")}</div>` }
  ];
}

window.PAGES = [
  // 0 - обложка
  { cls: "cover", html: `<div class="sub">Орден Симори</div><h1>Книга<br>Длани Симори</h1><div class="sub">реестр наёмной экспедиции</div><div class="seal">${SEAL}</div><div class="yr">1279 год</div>` },
  // 1 - форзац
  { html: `<div style="height:150px"></div><p style="text-align:center;font-style:italic;font-size:21px;line-height:1.6;color:var(--ink2)">Собственность Ордена Симори.<br>Вести записи дозволено жрецу-казначею.<br>Читать - тем, кто взошёл на борт.</p><div class="seal" style="margin-top:60px;background:radial-gradient(circle at 38% 32%,#b9553f,#5e1f18 70%)">${SEAL}</div>` },
  // 2 - содержание
  { html: `<div class="eyebrow">Что в книге</div><h2>Содержание</h2><div class="rule"></div>
    <ul class="toc">
      <li data-go="2">Письмо-наём<i></i><b>3</b></li>
      <li data-go="3">Ха'Зар<i></i><b>5</b></li>
      <li data-go="8">Синь-Минь Суи<i></i><b>15</b></li>
      <li data-go="12">Регилион<i></i><b>23</b></li>
      <li data-go="15">Майстер Райзе<i></i><b>29</b></li>
      <li data-go="19">Крайк<i></i><b>37</b></li>
      <li data-go="23">Заметки<i></i><b>45</b></li>
    </ul>` },
  // 3 - письмо-наём
  { html: `<div class="eyebrow">Письмо-наём</div><h2>Тому, кто дочитает</h2><div class="rule"></div>
    <p class="drop">Орден Симори ищет тех, кому нечего терять на этом берегу. Корабль «Длань Симори» отходит на рассвете. Путь лежит к острову людоящеров.</p>
    <p>Там обосновалась чумная богиня. Орден намерен покончить с её замыслами и платит тем, кто пойдёт с ним до конца.</p>
    <p>Плата - по возвращении. Тем, кто не вернётся, она не понадобится.</p>
    <p class="sign">Печать Ордена. Подпись неразборчива.</p>` },
  // 4 - шмуцтитул
  { html: `<div style="height:190px"></div><div class="eyebrow" style="text-align:center">Раздел первый</div><h2 style="text-align:center;font-size:46px">Наёмники<br>экспедиции</h2><div class="rule" style="margin:22px auto;width:60%;background:linear-gradient(90deg,rgba(176,138,60,0),var(--gold),rgba(176,138,60,0))"></div><p style="text-align:center;font-style:italic;color:var(--ink2)">Пятеро. Записано со слов самих нанятых<br>и по тому, что видел казначей.</p>` },
  // 5-44 - герои и их вложения
  ...hero(HEROES[0]),
  // Ха'Зар: четыре живые картины и лица
  ...HAZAR_LIFE.map(([n, t, c]) => ({ html: `<div class="eyebrow">Ха'Зар · ${t}</div><div class="vid"><video src="vid/hazar_${n}.mp4" poster="vid/hazar_${n}.webp" muted loop playsinline preload="none"></video></div><p class="cap">${c}</p>` })),
  ...[0, 3].map(o => ({ html: `<div class="eyebrow">Ха'Зар · лица</div><div class="emo">${HAZAR_EMO.slice(o, o + 3).map((e, i) => `<figure><img src="img/hazar_emo${o + i + 1}.webp" alt=""><figcaption>${e}</figcaption></figure>`).join("")}</div>` })),
  ...inserts("hazar", "Ха'Зар"),
  ...hero(HEROES[1]),
  // Синь-Минь: четыре живые картины (по две на странице) и лица
  ...[0, 2].map(o => ({ html: `<div class="eyebrow">Синь-Минь Суи · путь</div>${SINMIN_LIFE.slice(o, o + 2).map(([n, c]) => `<div class="vid h"><video src="vid/sinmin_${n}.mp4" poster="vid/sinmin_${n}.webp" muted loop playsinline preload="none"></video></div><p class="cap">${c}</p>`).join("")}` })),
  ...[0, 3].map(o => ({ html: `<div class="eyebrow">Синь-Минь Суи · лица</div><div class="emo">${SINMIN_EMO.slice(o, o + 3).map((e, i) => `<figure><img src="img/sinmin_emo${o + i + 1}.webp" alt=""><figcaption>${e}</figcaption></figure>`).join("")}</div>` })),
  ...inserts("sinmin", "Синь-Минь Суи"),
  ...hero(HEROES[2]),
  ...[0, 2].map(o => ({ html: `<div class="eyebrow">Регилион · академия</div>${REGIL_LIFE.slice(o, o + 2).map(([n, c]) => `<div class="vid h"><video src="vid/regil_${n}.mp4" poster="vid/regil_${n}.webp" muted loop playsinline preload="none"></video></div><p class="cap">${c}</p>`).join("")}` })),
  ...inserts("regil", "Регилион"),
  ...hero(HEROES[3]),
  ...[0, 2].map(o => ({ html: `<div class="eyebrow">Майстер Райзе · дорога</div>${RAIZE_LIFE.slice(o, o + 2).map(([n, c]) => `<div class="vid h"><video src="vid/raize_${n}.mp4" poster="vid/raize_${n}.webp" muted loop playsinline preload="none"></video></div><p class="cap">${c}</p>`).join("")}` })),
  ...[0, 3].map(o => ({ html: `<div class="eyebrow">Майстер Райзе · маска</div><div class="emo">${RAIZE_EMO.slice(o, o + 3).map((e, i) => `<figure><img src="img/raize_emo${o + i + 1}.webp" alt=""><figcaption>${e}</figcaption></figure>`).join("")}</div>` })),
  ...inserts("raize", "Майстер Райзе"),
  ...hero(HEROES[4]),
  ...[0, 2].map(o => ({ html: `<div class="eyebrow">Крайк · чужой среди людей</div>${KRAIK_LIFE.slice(o, o + 2).map(([n, c]) => `<div class="vid h"><video src="vid/kraik_${n}.mp4" poster="vid/kraik_${n}.webp" muted loop playsinline preload="none"></video></div><p class="cap">${c}</p>`).join("")}` })),
  ...[0, 3].map(o => ({ html: `<div class="eyebrow">Крайк · лица</div><div class="emo">${KRAIK_EMO.slice(o, o + 3).map((e, i) => `<figure><img src="img/kraik_emo${o + i + 1}.webp" alt=""><figcaption>${e}</figcaption></figure>`).join("")}</div>` })),
  ...inserts("kraik", "Крайк"),
  // 45 - заметки
  { html: `<div class="eyebrow">Раздел второй</div><h2>Заметки</h2><div class="rule"></div><div class="lines"></div>` },
  // 46 - пустая с печатью
  { html: `<div style="height:230px"></div><div class="seal">${SEAL}</div><p style="text-align:center;margin-top:26px;font-style:italic;color:var(--ink2)">Дальше страницы пусты.<br>Их допишет остров.</p>` },
  // 47 - задняя обложка
  { cls: "cover", html: `<div style="height:250px"></div><div class="seal">${SEAL}</div>` }
];
// закладки справа: [буква, разворот, подсказка]
window.TABS = [["✉", 2, "Письмо-наём"], ["Х", 3, "Ха'Зар"], ["С", 8, "Синь-Минь Суи"], ["Р", 12, "Регилион"], ["М", 15, "Майстер Райзе"], ["К", 19, "Крайк"], ["✎", 23, "Заметки"]];
