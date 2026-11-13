## 0.30.0 — community requests, part three

- **Gang marks can be dragged.** In Gang marks mode drag a mark to move it; a click still opens its settings. Asked by Literally Me.
- **Walk + NCART.** The route planner gets a fifth option when NCART lines exist: walk to the nearest station, ride, walk to the destination. It tries several stations on each side and is offered only when it beats walking. Asked by Literally Me and Timo.
- **Route from / to a station.** NCART station panels now have "Route from here" and "Route to here", like places. Asked by Timo.
- **Bends without a stop.** While placing stops, Shift+click adds a bend: the line turns there, the train does not stop. Asked by Timo.
- **Loops.** Clicking an existing stop while placing stops adds it to the line, so a line can come back to its own station. This already worked; the hint now says so.
- **Route colour.** New per-player setting: yellow, cyan, green, orange, violet, blue or white. Asked by Timo.
- **Travel animation speed.** New per-player setting, 1 to 10 seconds, default 3. The marker also no longer vanishes halfway: the animation used to be cut off as soon as the new position arrived. Asked by Timo.
- **"Who lives here" badges are optional.** New world setting to turn the ring and badge off; names stay in the place panel. Asked by Foxman.
- **Hidden button for the GM.** Hides for the GM everything that is hidden from players, to see the map as they do. Asked by Timo.
- **Night lights density** now goes down to 1% (was 10%), and harbour lights follow it too. Asked by Aegaeon.

## 0.30.0 — по просьбам сообщества, часть третья

- **Метки банд перетаскиваются.** В режиме «Метки банд» тащи метку, чтобы сдвинуть; клик по-прежнему открывает настройки. Просил Literally Me.
- **Пешком + NCART.** В планировщике маршрута появляется пятый вариант, если есть линии NCART: дойти до ближайшей станции, проехать, дойти до цели. Перебирает несколько станций с каждой стороны и предлагается, только когда быстрее, чем пешком. Просили Literally Me и Timo.
- **Маршрут от станции и до станции.** В панели станции NCART есть «Маршрут отсюда» и «Маршрут сюда», как у мест. Просил Timo.
- **Изгибы без остановки.** При расстановке остановок Shift+клик ставит изгиб: линия поворачивает, поезд не останавливается. Просил Timo.
- **Кольца.** Клик по готовой остановке при расстановке добавляет её в линию, так что линия может вернуться на свою станцию. Это работало и раньше, теперь об этом сказано в подсказке.
- **Цвет маршрута.** Новая личная настройка: жёлтый, голубой, зелёный, оранжевый, фиолетовый, синий или белый. Просил Timo.
- **Скорость анимации поездки.** Новая личная настройка, от 1 до 10 секунд, по умолчанию 3. Метка больше не пропадает на полпути: раньше анимация обрывалась, как только приходило новое положение. Просил Timo.
- **Плашки «кто здесь живёт» отключаются.** Новая настройка мира убирает кольцо и плашку; имена остаются в панели места. Просил Foxman.
- **Кнопка «Скрытое» у мастера.** Прячет у мастера всё, что скрыто от игроков, чтобы видеть карту их глазами. Просил Timo.
- **Плотность ночных огней** теперь опускается до 1% (было 10%), огни гавани тоже ей подчиняются. Просил Aegaeon.

## 0.29.1 — category bar wraps

- The category bar no longer scrolls sideways: buttons that do not fit wrap onto a second row, so nothing hides off-screen. The place and gig panels move down with it.

## 0.29.1 — полоса категорий переносится

- Полоса категорий больше не прокручивается вбок: кнопки, которые не помещаются, уходят на вторую строку, и ничего не прячется за краем. Панели места и заказов опускаются следом.

## 0.29.0 — community requests, part two

- **Your own categories.** The new **Categories** button (GM, left of the category bar) opens a list: add categories with a name, colour and icon, and rename or recolour the built-in ones. Pick the category in the place edit window. Deleting a category moves its places to "GM Markers". Categories travel with export and import. Asked by CptWashu and Timo.
- **Who lives here.** Every place has a new field "Who lives or hangs out here". Such places get a white ring, a name that is always visible and a badge with the names; if a name matches an actor in the world, the portrait is shown too. Good for player homes and important NPCs. Asked by Timo.
- **Gang marks.** The **Gang marks** button (GM) lets you click the map and drop a logo from your own image, or a tag with the gang name if there is no image. Size, opacity, colour, hidden from players. Players switch the layer with the "Gangs" button. No logos are shipped with the module. Asked by Timo.
- **Nearby.** The **Nearby** button hides everything farther than the chosen radius (0.5–15 km) from your "I am here" marker, or from "We are here" if you have none. Places with active gigs, homes, gigs and NCART stops always stay. Each player sets it for themselves. Asked by It'sSoClover.
- **Fixed: "NCART: FilePicker not found"** on Foundry v12. The file browser was looked up in the wrong place, so the folder with line images was never read. The same fix covers picking an image for a place and importing terminal handouts from a folder. Thanks to Literally Me and Schism.
- The category bar scrolls sideways with the mouse wheel when it does not fit.

## 0.29.0 — по просьбам сообщества, часть вторая

- **Свои категории.** Новая кнопка **«Категории»** (у мастера, слева в полосе категорий) открывает список: добавляй категории с названием, цветом и значком, переименовывай и перекрашивай встроенные. Категория выбирается в окне правки места. При удалении категории её места переходят в «Метки мастера». Категории попадают в экспорт и импорт. Просили CptWashu и Timo.
- **Кто здесь живёт.** У каждого места новое поле «Кто здесь живёт или бывает». Такие места получают белое кольцо, всегда видимое название и плашку с именами; если имя совпало с актёром мира, рядом встаёт портрет. Подходит для домов игроков и важных NPC. Просил Timo.
- **Метки банд.** Кнопка **«Метки банд»** (у мастера): клик по карте ставит логотип из твоей картинки или надпись с названием, если картинки нет. Размер, прозрачность, цвет, скрытие от игроков. Игроки включают и выключают слой кнопкой «Банды». Логотипы в модуль не входят. Просил Timo.
- **Рядом.** Кнопка **«Рядом»** прячет всё, что дальше выбранного радиуса (0,5–15 км) от твоей метки «Я здесь», а если её нет - от «Мы здесь». Места с активными заказами, дома, заказы и остановки NCART остаются всегда. Каждый игрок включает у себя. Просил(а) It'sSoClover.
- **Исправлено: «NCART: FilePicker not found»** на Foundry v12. Проводник файлов искался не там, и папка с картинками линий не читалась. Та же правка чинит выбор картинки места и импорт раздаток терминала из папки. Спасибо Literally Me и Schism.
- Полоса категорий прокручивается колесом мыши, если не помещается.

## 0.28.0 — community requests

- **NCART stops and rides.** In the NCART box the GM creates a line (name and colour) and clicks along it on the map: every click is a stop, a click on an existing stop makes a transfer, right click removes the last one. Stops show on the map; click one, pick a destination and press "The crew rides" or "I ride": time passes (wait, stops and transfers are counted) and the marker moves. Train speed and "Players see the stops" are in the same box. Line images are not required for this.
- **Agent: players can message each other.** Players get a chat picker in the Agent: fixers & GM, the whole crew, or one other player. The GM sees every message. Turn it off in **Settings → Agent: players can message each other**.
- **Export → Places only.** The export button now asks what to save. "Places only" keeps pins, names, categories and images, with no descriptions or notes, so a location set can be shared without the book texts. Importing such a file replaces places and custom pins only.
- **Night lights density.** New world setting (10–100%). Lower it if the map is hard to read at night or you use a large roads image.
- **NCART: folder could not be read** on some setups (issue #1). The file browser is now picked more carefully. Thanks to Schism for tracking it down.

## 0.28.0 — по просьбам сообщества

- **Остановки и поездки NCART.** В окне NCART мастер создаёт линию (название и цвет) и кликает по карте вдоль неё: каждый клик - остановка, клик по уже стоящей остановке делает пересадку, правый клик убирает последнюю. Остановки видны на карте: кликни по станции, выбери, куда ехать, и нажми «Едет группа» или «Еду я». Время пройдёт (считаются ожидание, остановки и пересадки), метка переедет. Скорость поезда и галочка «Игроки видят остановки» там же. Картинки линий для этого не нужны.
- **Агент: игроки пишут друг другу.** У игроков в «Агенте» появился выбор чата: фиксеры и мастер, вся группа или другой игрок. Мастер видит все сообщения. Выключается в **Настройки → «Агент: игроки пишут друг другу»**.
- **Экспорт → «Только места».** Кнопка экспорта теперь спрашивает, что сохранить. «Только места» - это точки, названия, категории и картинки без описаний и заметок: набором локаций можно делиться без текстов из книг. Импорт такого файла заменяет только места и свои точки.
- **Плотность ночных огней.** Новая настройка мира (10–100%). Убавь, если ночью карту плохо видно или у тебя большая картинка дорог.
- **NCART: папка не читалась** на некоторых установках (issue #1). Проводник файлов теперь выбирается аккуратнее. Спасибо Schism за поиск причины.

## 0.27.2

- Text formatting: line breaks in descriptions, GM notes, gigs and encounters are kept. A blank line starts a new paragraph.
- NCART: players can now see the lines (Foundry does not let players browse folders, so the GM's client saves the file list for everyone).
- NCART: the folder is read from the source the file picker used (User Data, S3, The Forge), not only User Data.

## 0.27.1

- NCART: the folder is re-read if it came back empty (e.g. the folder was set while the map was open).

## 0.27.1

- NCART: папка перечитывается, если в первый раз пришла пустой (например, папку указали при открытой карте).

## 0.27.0 — NCART lines

- **NCART layer**: point the new setting **NCART lines folder** at a folder with your own line images (one line per file, same size and framing as your map image — white background is fine, it becomes transparent). A **NCART** button appears on the map: the GM ticks lines on and off for everyone, each line glows in its own colour and glows brighter at night.
- **Fit to map**: X/Y offset, scale and height sliders in the NCART box, if your line images don't sit exactly on your map.
- The images are not included in the module — you need your own copy of the source material. Thanks to Schism for the idea and for separating the lines.

## 0.27.0 — линии NCART

- **Слой NCART**: в новой настройке **«Папка с линиями NCART»** укажи папку со своими картинками линий (одна линия на файл, того же размера и кадра, что и картинка карты; белый фон можно — он станет прозрачным). На карте появится кнопка **NCART**: мастер включает и выключает линии для всех, каждая светится своим цветом, ночью ярче.
- **Подгонка к карте**: ползунки сдвига, масштаба и высоты в окне NCART, если картинки линий не легли ровно на твою карту.
- Картинки в модуль не входят — нужна своя копия исходного материала. Спасибо Schism за идею и разрезанные линии.

## 0.26.2 — fix

- Night lights no longer go out and light up again every time you open a place or click something on the map.

## 0.26.2 — исправление

- Ночные огни больше не гаснут и не зажигаются заново каждый раз, когда открываешь место или кликаешь по карте.

## 0.26.1 — the lights actually glow

- Lights now glow: a soft bloom around every light, and the city itself is lit from below. Streets and blocks under the lights turn warm and amber, while dark districts, the Hot Zone and the bay stay in darkness.

## 0.26.1 — огни по-настоящему светятся

- Огни теперь светятся: вокруг каждого мягкий ореол, а сам город подсвечивается снизу. Улицы и кварталы под огнями становятся тёплыми, янтарными, а тёмные районы, Зона Поражения и залив остаются во тьме.

## 0.26.0 — the city lights up at night

- **Night lights**: when night falls on the map (21:00–06:00 or the GM's night switch), the city lights up in a wave, district by district: street lamps along the roads, windows and neon (rich districts brighter and colder, the outskirts sparse), fires in the Combat Zones and the Hot Zone, lights of ships along the shore. Some lights flicker, the city slowly breathes. At dawn the lights fade out.
- Lights are the same for everyone at the table. **Settings → City lights at night** turns them off on a slow computer (per player).

## 0.26.0 — ночью город загорается

- **Ночные огни**: когда на карте наступает ночь (21:00–06:00 или переключатель ночи у мастера), город загорается волной, район за районом: фонари вдоль улиц, окна и неон (богатые районы ярче и холоднее, окраины реже), костры в Боевых зонах и Зоне Поражения, огни судов у берега. Часть огней мерцает, город медленно «дышит». Утром огни гаснут.
- Огни одинаковые у всех за столом. **Настройки → «Огни города ночью»** выключают их на слабом компьютере (у каждого игрока своя галочка).

## 0.25.1 — fixes

- A terminal's sound stops when its window is closed (the camera hum kept playing in Foundry's audio).
- The camera feed file in terminals opens again.

## 0.25.1 — исправления

- Звук терминала гаснет вместе с окном (гул камеры продолжал играть в звуке Foundry).
- Файл с камерой в терминалах снова открывается.

## 0.25.0 — handouts from a folder

- **Terminals → From folder**: pick a folder in your Foundry data. Every `.json` terminal in it is imported (re-running updates the ones already imported), every `.html` page becomes a terminal that opens as is (animated handouts, your own pages), and every image goes into a **Handouts · <folder>** journal, one page per image, ready for Foundry's **Show to players**.

## 0.25.0 — раздатки из папки

- **«Терминалы» → «Из папки»**: выбираешь папку в данных Foundry. Каждый терминал `.json` из неё импортируется (повторный запуск обновляет уже добавленные), каждая страница `.html` становится терминалом и открывается как есть (анимированные раздатки, свои страницы), а все картинки попадают в журнал **«Раздатки · <папка>»**, по странице на картинку, — их можно показать игрокам штатной кнопкой Foundry.

## 0.24.0 — netrunning terminals by the Cyberpunk RED rules

- **NET tab** in a terminal whose .json has an `arch` (NET Architecture): floors with a Password, File, Control Node or Black ICE, a DV, and the rules text right on the card. **Jack in**, **Go down**, **Pathfinder** (reveals the map), **Jack out** (warns about an unsafe jack out with active Black ICE).
- **Checks**: the netrunner sets their **Interface** once, then **Backdoor / Eye-Dee / Control** roll Interface + 1d10 with Cyberpunk RED crits (10 explodes, 1 subtracts), or type in your own result from the sheet. **Slide** rolls against the ICE's PER + 1d10. Black ICE cards show PER / SPD / ATK / DEF / REZ and the effect; the fight itself is played at the table, then **Derez**.
- **Files and messages behind floors**: until the floor is breached, they are locked and the name is redacted.
- **Shared run**: the run's progress and log are the same for everyone at the table (kept by the GM in the world), so the crew watches the netrunner dive.

## 0.24.0 — нетраннинг по правилам Cyberpunk RED в терминалах

- **Вкладка «Сеть»** в терминале, у которого в .json есть `arch` (NET-архитектура): уровни с паролем, файлом, узлом управления или Black ICE, у каждого DV и подсказка по правилам прямо на карточке. Кнопки **«Подключиться»**, **«Спуститься»**, **Pathfinder** (открывает карту) и **«Отключиться»** (предупреждает о небезопасном выходе при активном льде).
- **Проверки**: нетраннер один раз вводит свой **Интерфейс**, дальше **Backdoor / Eye-Dee / Control** бросают Интерфейс + 1d10 с критами RED (10 взрывается, 1 вычитает). Можно ввести свой результат с листа. **Slide** — против PER + 1d10 льда. На карточке Black ICE видны PER / SPD / ATK / DEF / REZ и эффект; сам бой идёт за столом, потом **«Дерезнуть»**.
- **Файлы и сообщения за уровнями**: пока уровень не взломан, они закрыты, а название зачёркнуто блоками.
- **Общий забег**: прогресс и журнал взлома одинаковые у всех за столом (их хранит мастер в мире), команда смотрит, как нетраннер ныряет.

## 0.23.0 — terminals in the style of 2077

- **Terminals**: computer screens to hack and browse. A breach screen, **Files** and **Messages** tabs, text typed out on screen, tables with highlighted rows, images that scan in, encrypted files that decrypt when opened, a live camera feed.
- **Sound** made in the browser, no audio files: keystrokes, beeps, decryption, glitches, alarms, camera hum. **M** or the ♪ button mutes it. The volume follows Foundry's interface volume.
- **For the GM**: the terminal icon in the token tools → **Import .json**. The terminal is kept in the world settings, nothing to upload to the server. **Open for me**, **Show to all players** (it opens for everyone and stays in their list), **Give to players' list without opening**, **Rename**, **Download .json**, **Delete**, **Close for everyone**.
- **For players**: each one browses the terminal on their own: click files and messages, arrows to move, **R** to restart. Shared terminals can be reopened from the same button.

## 0.23.0 — терминалы в стиле 2077

- **Терминалы**: экраны компьютеров, которые можно взломать и полистать. Экран взлома, вкладки **«Файлы»** и **«Сообщения»**, печатающийся текст, таблицы с подсвеченными строками, картинки, которые «сканируются», зашифрованные файлы с дешифровкой при открытии, живая камера.
- **Звук** собирается прямо в браузере, без аудиофайлов: клавиши, сигналы, дешифровка, глитчи, тревога, гул камеры. Выключить: **M** или кнопка ♪. Громкость берётся из громкости интерфейса Foundry.
- **Мастеру**: значок терминала в инструментах токена → **«Импорт .json»**. Терминал хранится в настройках мира, на сервер ничего загружать не надо. Есть кнопки **«Открыть у себя»**, **«Показать всем игрокам»** (откроется у всех и останется в их списке), **«Дать игрокам в список, не открывая»**, **«Переименовать»**, **«Скачать .json»**, **«Удалить»** и **«Закрыть у всех»**.
- **Игрокам**: каждый листает терминал сам: клик по файлам и сообщениям, стрелки, **R** — перезапуск. Терминалы, которые показал мастер, можно открыть снова той же кнопкой.

## 0.22.0 — reset to defaults, shop stock editing

- **Reset to defaults**: **Places** → **Reset…**. Pick what to restore: place edits, your pins, custom districts and street labels, painted roads, the map image and road grid in settings, and optionally shops, gigs and Agent data. Map data lives in the **world settings**, so reinstalling the module never reset it. This is the way back to a clean map. Export first if you might want your setup again.
- **Street labels only in Districts mode**: a checkbox in **Districts**. Use it when your map image (for example an NC Atlas map) already has street names printed on it, so they don't show twice.
- **Edit a shop's stock** (GM): every item has a **custom price** and **remove** button, **Add item** puts anything into the shop (category price or exact eb), **Reset stock edits** brings back the generated stock. **New stock** rerolls and clears edits.
- **Buying looks further for the item**: world items first, then system, world and module compendiums. Items from other compendiums can now land on the sheet.

## 0.22.0 — сброс к стандартному, правка товара в магазинах

- **Сброс к стандартному**: **«Места»** → **«Сбросить…»**. Отмечаешь, что вернуть: правки мест, свои точки, свои районы и подписи улиц, нарисованные дороги, картинку карты и сетку дорог в настройках, а при желании ещё магазины, заказы и данные «Агента». Данные карты хранятся в **настройках мира**, поэтому переустановка модуля их никогда не сбрасывала. Вернуть чистую карту можно только так. Перед сбросом лучше сделать «Экспорт».
- **Подписи улиц только в режиме «Районы»**: галочка в **«Районах»**. Нужна, если на твоей картинке карты (например, NC Atlas) названия улиц уже нарисованы, чтобы они не дублировались.
- **Правка товара в магазине** (мастер): у каждого товара кнопки **«Своя цена»** и **«Убрать»**, **«Добавить товар»** кладёт что угодно (по категории цены или точная сумма), **«Сбросить правки товара»** возвращает сгенерированный ассортимент. **«Новый товар»** перебрасывает и снимает правки.
- **Покупка ищет предмет шире**: сначала предметы мира, потом компендиумы системы, мира и модулей. Предметы из других компендиумов теперь тоже попадают в лист.

## 0.21.0 — fixes from the Discord + manual shops

- **District and street labels can be dragged again** in the **Districts** mode. Pins and dots no longer sit on top of the labels there (they fade out while you edit), so a label under a location pin can be grabbed.
- **Image picker** (the file button next to “Image” for places, contacts and holo-calls) opens reliably and stays above the full-screen map. If Foundry can't open it, you get a message instead of silence.
- **Typing is no longer wiped** in a holo-call or in the Agent chat when the other side sends a message while you are still writing. The text, cursor and focus are kept.
- **Place a shop manually**: **Shops** → **Place manually**, then click the map. Pick the type, name and price %; the district is taken from the spot. To move an existing shop to another district, use **Arrange**.
- Wording: random shops are placed **along roads** (the Roads layer), not on the street labels.

## 0.21.0 — исправления из Discord + магазины вручную

- **Подписи районов и улиц снова перетаскиваются** в режиме **«Районы»**. Пины и точки мест больше не перекрывают подписи (на время правки они бледнеют), так что подпись под значком места можно схватить.
- **Выбор картинки** (кнопка файла у «Картинки» мест, контактов и голо-вызова) открывается надёжно и поверх карты на весь экран. Если Foundry не может его открыть — будет сообщение, а не тишина.
- **Текст больше не стирается** в голо-вызове и в чате «Агента», если собеседник прислал сообщение, пока ты печатаешь. Текст, курсор и фокус сохраняются.
- **Магазин вручную**: **«Магазины»** → **«Поставить вручную»**, клик по карте. Тип, название и % цены выбираешь сам, район берётся по месту. Перенести готовый магазин в другой район — режим **«Расставить»**.
- Формулировка: случайные магазины встают **вдоль дорог** (слой «Дороги»), а не по подписям улиц.

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
