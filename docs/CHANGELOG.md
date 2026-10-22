## 0.20.0 — place scenes

- Any place on the map (built-in or your own) can be linked to a scene: **Edit** → **Place scene (battle map)**. The list shows world scenes and scenes from every Scene compendium (map packs).
- In the place panel the GM gets **Open scene** (view it yourself) and **Move players** (activate it for everyone). A compendium scene is imported into the world once and reused after that.
- Scene links travel with export/import.

## 0.20.0 — сцены мест

- К любому месту на карте (встроенному или своему) можно привязать сцену: **«Править»** → **«Сцена места (боевая карта)»**. В списке сцены мира и сцены из всех компендиумов сцен (паков карт).
- В панели места у мастера кнопки **«Открыть сцену»** (посмотреть самому) и **«Перенести игроков»** (активировать для всех). Сцена из компендиума импортируется в мир один раз, дальше берётся уже импортированная.
- Привязки переносятся экспортом и импортом.

## 0.19.0 — custom districts & streets

- New **Districts** button (GM): your own districts and street labels for a custom map. Tick “Custom districts and streets instead of built-in” — the Night City 2045 ones stop showing up in addresses, encounters, shops and gigs.
- **District** tool: click the map, name it, pick its danger (Corporate … Combat Zone … Hot Zone). Danger drives encounter threat, and Combat / Hot Zone danger turns the area around the label into that zone.
- **Street** tool: click the start and the end of a street, name it. It becomes the address of nearby places.
- Drag district and street labels to move them, click to edit; edit, redraw or delete from the list too.
- **Start from built-in** copies the Night City 2045 districts and streets so you can just shift and rename them.
- “Always show district names” — for map images that have no names printed on them.
- Districts and streets travel with export/import (Places → Export), so edits made in a test world move to the main one.

## 0.19.0 — свои районы и улицы

- Кнопка **«Районы»** (мастер): свои районы и подписи улиц под свою карту. Включил «Свои районы и улицы вместо встроенных» — районы и улицы Найт-Сити 2045 больше не лезут в адреса, встречи, магазины и заказы.
- Инструмент **«Район»**: клик по карте, название, опасность (Корпоративная … Боевая зона … Зона Поражения). От опасности зависят встречи, а «Боевая зона» и «Зона Поражения» делают территорию вокруг названия соответствующей зоной.
- Инструмент **«Улица»**: клик в начало и в конец улицы, название. Она становится адресом ближайших мест.
- Названия районов и улиц перетаскиваются мышью, клик - правка; править, перечертить и удалить можно и из списка.
- **«Взять встроенные за основу»** копирует районы и улицы Найт-Сити 2045 - остаётся сдвинуть и переименовать.
- «Всегда показывать названия районов» - для картинок, где названий нет.
- Районы и улицы переносятся экспортом (Места → Экспорт), так что правки из тестового мира легко перенести в основной.

## 0.18.0 — arrange

- New **Arrange** button (GM): drag any place on the map with the mouse — built-in locations, your own points, shops and Night Markets. Right button still pans. Press **Done** (or Esc) and everything is fixed in place again, so nothing moves by accident during play.
- The old one-by-one **Move** button in a place's panel still works.

## 0.18.0 — расстановка

- Кнопка **«Расставить»** (мастер): любое место на карте перетаскивается мышью — встроенные, свои точки, магазины и Ночные рынки. Карта двигается правой кнопкой. Нажал «Готово» (или Esc) — всё снова закреплено, и во время игры ничего случайно не сдвинется.
- Кнопка «Переместить» в панели места тоже осталась.

## 0.17.1

- English: the Decline button on an incoming call no longer says “Reset”.

## 0.17.1

- Кнопка отказа от входящего вызова теперь «Сбросить вызов» (в английской версии была «Reset»).

## 0.17.0 — contacts

- **Contacts** tab in the Agent. The GM adds fixers and NPCs (name, portrait, caption) and chooses which players see each one; there's also “Add to Agent contacts” in an actor's context menu.
- Players call a contact from their phone: they hear the ringback, the GM gets the incoming call and answers as that NPC. No answer in 45 seconds — “No answer”.
- From a contact you can also message (the GM writes as that NPC) and, for the GM, call players as them in one click.
- Contacts are included in export/import.

## 0.17.0 — контакты

- Вкладка **«Контакты»** в «Агенте». Мастер добавляет фиксеров и NPC (имя, портрет, подпись) и выбирает, кто из игроков их видит. Есть и пункт «Добавить в контакты «Агента»» в меню актёра.
- Игрок звонит контакту прямо с телефона: слышит гудки, у мастера всплывает входящий вызов, и он отвечает от имени NPC. Не ответили за 45 секунд — «Абонент не отвечает».
- Из контакта можно и написать (мастер пишет от имени NPC), а мастер одной кнопкой звонит игрокам от его лица.
- Контакты переносятся экспортом и импортом.

## 0.16.0 — holo-calls

- **Holo-call**: the GM calls players as any character. Incoming call with portrait, ringtone, Accept / Decline; once connected everyone on the line types lines that appear as subtitles, with a call timer and a live status per player.
- Call from the Agent (phone button next to “From”), from the actor's context menu in the Actors tab, from the **Call** button in an actor sheet header, or from a macro: `NightCityMap.call({ from: "Rogue", img: "path.webp", to: "all", text: "Got a job." })`.
- Call lines are saved in the Agent chats, marked with a phone icon.
- New setting **Call ringtone**: any audio file from your server. Empty — the module's built-in synth tone.

## 0.16.0 — голо-звонки

- **Голо-вызов**: мастер звонит игрокам от имени любого персонажа. Входящий вызов с портретом и мелодией, «Принять» / «Сбросить»; на связи все пишут реплики, они идут субтитрами, есть таймер и статус каждого игрока.
- Позвонить можно из «Агента» (кнопка с трубкой рядом с «От:»), из меню актёра во вкладке «Актёры», кнопкой «Позвонить» в шапке листа или макросом: `NightCityMap.call({ from: "Роуг", img: "путь.webp", to: "all", text: "Есть работа." })`.
- Реплики из звонка сохраняются в чатах «Агента» со значком трубки.
- Настройка «Мелодия звонка»: любой аудиофайл с твоего сервера. Пусто — встроенный сигнал модуля.

## 0.15.1

- Fixed: on hosts that serve module files from another domain (The Forge, S3, CDN) the street grid could not be read, so Shops, Night Markets and Gigs on map did nothing and the Roads overlay stayed empty. The grid now loads there; if it still can't, shops and gigs are placed by district and you get a warning instead of silence.
- Agent: delete messages. The GM can delete any message or clear a whole conversation; players can delete their own.
- README: map image sizes for those who swap the background.

## 0.15.1

- Исправлено: на хостингах, где файлы модулей идут с другого домена (The Forge, S3, CDN), не читалась сетка улиц — кнопки «Магазины», «Ночные рынки», «Заказы на карту» ничего не делали, а «Дороги» были пустыми. Теперь сетка грузится и там, а если нет — точки ставятся по районам с предупреждением.
- «Агент»: удаление сообщений. Мастер удаляет любые или чистит переписку целиком, игрок — свои.

## 0.15.0 — roads

- New **Roads** button (GM): shows the street grid that routes follow, right on the map.
- Paint it with a brush: add streets, erase them, mark water. Undo or reset your edits any time; they travel with export/import.
- New setting **Road grid image**: your own full grid for a custom map (white streets, gray land, black water).

## 0.15.0 — дороги

- Кнопка «Дороги» (мастер): сетка улиц, по которой идут маршруты, прямо на карте.
- Её можно дорисовать кистью: добавить улицу, стереть, отметить воду. Правки отменяются и переносятся экспортом.
- Настройка «Сетка дорог»: своя сетка целиком под свою карту (белое — улицы, серое — суша, чёрное — вода).

## 0.14.0 — your own city

- Edit any place, built-in ones too: name, category, description, your own dossier art.
- Move any place, shop or Night Market with the Move button.
- Remove built-in places from the map, restore them one by one or all at once (Places window). Handy for running your own map, e.g. 2077.
- Export and import: custom points, place edits, encounters, shops, markets and gigs travel between worlds as one JSON file.
- Players can buy in shops and Night Markets. Cyberpunk RED: eddies come off the character's wealth ledger, the item comes from the system compendium (or a plain gear item if there's no match). New setting **Buying in shops**: GM approves / instantly / off.

## 0.14.0 — свой город

- Любое место, включая встроенные, можно править: название, категория, описание, свой арт для досье.
- Любое место, магазин или Ночной рынок можно переместить.
- Встроенные места можно убрать с карты и вернуть (окно «Места») — под свою карту, например 2077.
- Экспорт и импорт: свои точки, правки, встречи, магазины, рынки и заказы одним файлом.
- Игроки покупают в магазинах и на Ночных рынках: эдди списываются с персонажа, предмет берётся из компендиума системы. Настройка «Покупки в магазинах»: мастер подтверждает / сразу / выключено.

## 0.13.0 — community feedback

- Sharp text at any zoom; place names show without hovering when you zoom in close.
- The map image no longer has numbered boxes baked in, so hiding a category hides its boxes too.
- Routes draw as you build them: the start point appears at once, a dotted line follows the cursor, the line is bolder.
- Drag the map with any mouse button while plotting a route. Right-click without dragging removes the last point.
- Custom points: category (filters with the rest), description, dossier image, protection from deletion, delete confirmation.
- Custom encounters: add your own to the tables by threat and time of day, mixed with the book or on their own.
- A Clear button for rolled encounters.
- Simple Calendar setup now keeps the world time by default; the map follows the world. You can still choose the map time.
- New setting **Agent phone**: turn it off and the Agent button, Shift+A and the scene control are gone.
- Remove the “We are here” and “I am here” markers from the marker mode bar.
- Clicking a place after building a route opens the place, not the route.

## 0.13.0 — по отзывам сообщества

- Чёткий текст на любом зуме, на сильном приближении названия мест видны без наведения.
- Номерные плашки убраны с самой картинки: выключил категорию — пропали и её номера.
- Маршрут рисуется сразу, пока прокладываешь; пунктир тянется за курсором.
- В режиме маршрута карту можно таскать любой кнопкой мыши, правый клик без протяжки убирает последнюю точку.
- Свои точки: категория, описание, картинка для досье, защита от удаления, подтверждение удаления.
- Свои встречи по угрозе и времени суток, вместе с книжными или только свои. Кнопка «Очистить» для встреч.
- Simple Calendar: по умолчанию главное время мира, карта подстраивается.
- Настройка «Телефон «Агент»»: выключил — кнопки и Shift+A нет.
- Метки «Мы здесь» и «Я здесь» можно убрать.

## 0.12.1

- Location art for all 65 places is now included (dossiers work out of the box).
- Feature gallery in the README.

## 0.12.0 — English edition

- Full English translation: map UI, Agent phone, encounters, gigs, shops, Night Markets, calendar, settings.
- English map image for English Foundry; Russian map stays for Russian Foundry.
- New setting **Map language**: auto (follows Foundry) / Русский / English.
- English NPC compendium (24 actors) next to the Russian one.
- The module now lives in its own repository with GitHub releases.

## 0.12.0 — английская версия

- Полный английский перевод; карта, данные и компендиум на двух языках.
- Новая настройка «Язык карты»: авто / русский / английский.
