# Генератор статблоков NPC для Cyberpunk RED (cyberpunk-red-core v0.92, тип "mook") → JSON-исходники компендиума.
import json, glob, random, math, copy, string, os, sys
SRC_MOOKS = sys.argv[1]; TEMPLATE = sys.argv[2]; OUT = sys.argv[3]
random.seed(2045)
rid = lambda: ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(16))
docs = [json.load(open(f)) for f in glob.glob(SRC_MOOKS + '/*.json')]
lib = {}
for a in docs:
    if not a.get('_key', '').startswith('!actors!'): continue
    for i in a['items']: lib.setdefault((i['type'], i['name']), i)
tpl = json.load(open(TEMPLATE))
skills = {n: i for (t, n), i in lib.items() if t == 'skill' and n not in ('Lowdown', 'Martial', 'Physical', 'Technical')}
slots = [i for i in tpl['items'] if i['type'] == 'cyberware' and 'Option Slots' in i['name']]

FOLDERS = {k: rid() for k in ['Фиксеры', 'Улица', 'Специалисты', 'Угрозы']}
TIER = {'mook': 'Мук', 'lt': 'Лейтенант', 'mini': 'Мини-босс', 'boss': 'Босс'}
S = lambda i, r, d, t, c, w, l, m, b, e: dict(int=i, ref=r, dex=d, tech=t, cool=c, will=w, luck=l, move=m, body=b, emp=e)

NPCS = [
 # Фиксеры
 dict(f='Фиксеры', n='Падре', tier='lt', role='Фиксер · Хейвуд', st=S(7,6,6,4,8,7,6,5,6,8),
  sk={'Trading':8,'Persuasion':7,'Streetwise':8,'Human Perception':7,'Bribery':6,'Handgun':5,'Evasion':4,'Conversation':6,'Local Expert':6,'Business':5,'Perception':5,'Athletics':3,'Brawling':3,'Concentration':3,'Education':4,'Language (Streetslang)':4},
  it=[('weapon','Very Heavy Pistol (Excellent)'),('armor','Kevlar (Body)'),('cyberware','Cyberaudio Suite'),('cyberware','Voice Stress Analyzer'),('cyberware','Internal Agent'),('ammo','Very Heavy Pistol (Basic)')],
  d='Бывший священник, ставший фиксером Санто-Доминго. Работу даёт только тем, кто не трогает детей и стариков. Встречи — в задней комнате закусочной.', tac='Не дерётся: при угрозе выходит через заднюю дверь, а его охрана (2 бустера) прикрывает.'),
 dict(f='Фиксеры', n='Мама Вуду', tier='lt', role='Фиксер-нетраннер · Хейвуд', st=S(8,5,6,7,7,8,5,4,5,7),
  sk={'Trading':7,'Persuasion':6,'Streetwise':7,'Human Perception':8,'Cryptography':6,'Electronics/Security Tech':6,'Library Search':6,'Handgun':4,'Evasion':4,'Conversation':5,'Local Expert':7,'Perception':6,'Concentration':5,'Education':5,'Athletics':2,'Brawling':2,'Language (Streetslang)':4},
  it=[('weapon','Medium Pistol (Excellent)'),('armor','Kevlar (Body)'),('cyberware','Neural Link'),('cyberware','Interface Plugs'),('cyberdeck','Cyberdeck (Excellent)'),('ammo','Medium Pistol (Basic)')],
  d='Связана с Вудуистами, торгует данными и заказами в Сети. В реальности — грузная женщина в кресле с кибердекой, окружённая свечами и мониторами.', tac='Интерфейс 6. В бою — только через Сеть: выключает камеры, закрывает двери, глушит агенты.'),
 dict(f='Фиксеры', n='Тихоня Мэй', tier='lt', role='Фиксер · Маленький Китай', st=S(7,7,7,4,8,6,6,6,5,6),
  sk={'Trading':7,'Streetwise':8,'Human Perception':7,'Stealth':6,'Melee Weapon':5,'Handgun':5,'Evasion':6,'Persuasion':6,'Bribery':5,'Local Expert':7,'Perception':6,'Conversation':5,'Athletics':4,'Brawling':3,'Concentration':4,'Education':3,'Language (Streetslang)':4},
  it=[('weapon','Tanto (Medium Melee)'),('weapon','Medium Pistol (Excellent)'),('armor','Light Armorjack (Body)'),('cyberware','Cybereye'),('cyberware','Image Enhance'),('ammo','Medium Pistol (Basic)')],
  d='Владелица чайной под Серебряным Драконом. Говорит шёпотом, никогда не повторяет дважды. Работает с Тигриными Когтями, но им не принадлежит.', tac='Держит дистанцию, бьёт первой из засады, уходит через кухню.'),
 dict(f='Фиксеры', n='Кейси «Сто процентов»', tier='mini', role='Фиксер-соло · Посмертие', st=S(6,8,7,4,7,7,6,6,7,5),
  sk={'Trading':5,'Streetwise':6,'Human Perception':5,'Handgun':7,'Shoulder Arms':7,'Autofire':5,'Evasion':6,'Tactics':5,'Brawling':5,'Melee Weapon':4,'Athletics':5,'Perception':5,'Persuasion':4,'Concentration':4,'Education':2,'Conversation':3,'Local Expert':4,'Language (Streetslang)':4},
  it=[('weapon','Assault Rifle'),('weapon','Very Heavy Pistol'),('armor','Light Armorjack (Body)'),('armor','Light Armorjack (Head)'),('cyberware','Kerenzikov'),('ammo','Rifle (Basic)'),('ammo','Very Heavy Pistol (Basic)')],
  d='Бывший соло, получил прозвище за то, что не провалил ни одного заказа. Теперь раздаёт работу за угловым столом Посмертия и лично проверяет новичков.', tac='Керензиков +2 к Инициативе. Стреляет очередями, отходит к укрытию, не геройствует.'),
 dict(f='Фиксеры', n='Барон', tier='lt', role='Корпоративный фиксер · Аппер Марина', st=S(8,5,5,4,8,6,7,4,5,7),
  sk={'Business':8,'Trading':6,'Bureaucracy':6,'Persuasion':7,'Human Perception':6,'Wardrobe & Style':7,'Handgun':4,'Evasion':3,'Conversation':6,'Bribery':7,'Perception':4,'Education':6,'Accounting':5,'Athletics':2,'Brawling':2,'Concentration':3,'Local Expert':4,'Language (Streetslang)':3},
  it=[('weapon','Medium Pistol'),('armor','Kevlar (Body)'),('cyberware','Smart Glasses'),('cyberware','Internal Agent'),('ammo','Medium Pistol (Basic)')],
  d='Посредник между корпорациями и улицей. Яхта в Марине, костюм из кевлара, двое телохранителей RatSec. Платит щедро — и всегда знает больше, чем говорит.', tac='Охрана: 2 × RatSec Elite. Сам стреляет только в спину.'),
 # Улица
 dict(f='Улица', n='Вышибала «Посмертия»', tier='lt', role='Охрана бара', st=S(4,6,6,3,6,6,4,5,9,4),
  sk={'Brawling':7,'Melee Weapon':6,'Shoulder Arms':5,'Perception':6,'Human Perception':5,'Athletics':6,'Evasion':4,'Endurance':5,'Interrogation':4,'Handgun':4,'Concentration':3,'Education':2,'Conversation':2,'Local Expert':4,'Language (Streetslang)':4,'Streetwise':4},
  it=[('weapon','Power Fist (Heavy Melee)'),('weapon','Shotgun'),('armor','Light Armorjack (Body)'),('cyberware','Grafted Muscle and Bone Lace'),('ammo','Shotgun Slug (Basic)')],
  d='Двухметровая стена из мышц и костного кружева. Помнит лица всех, кого выбросил на улицу.', tac='Хватает и бросает (Захват), дробовик — только если кто-то достал оружие.'),
 dict(f='Улица', n='Бармен-информатор', tier='mook', role='Бармен', st=S(6,5,5,4,6,5,5,5,5,6),
  sk={'Conversation':7,'Human Perception':7,'Streetwise':6,'Local Expert':7,'Trading':4,'Handgun':4,'Brawling':3,'Evasion':3,'Perception':5,'Athletics':2,'Concentration':2,'Education':2,'Language (Streetslang)':4},
  it=[('weapon','Medium Pistol'),('armor','Leathers (Body)'),('cyberware','Cyberaudio Suite'),('cyberware','Amplified Hearing'),('ammo','Medium Pistol (Basic)')],
  d='Слышит всё — у него усиленный слух. За 50 eb рассказывает слухи района, за 200 — имена.', tac='Прячется за стойкой и вызывает вышибалу.'),
 dict(f='Улица', n='Уличный гонщик', tier='mook', role='Гонщик · Индустриальная зона Хейвуда', st=S(4,7,7,5,6,4,5,7,5,4),
  sk={'Drive Land Vehicle':8,'Land Vehicle Tech':5,'Handgun':5,'Evasion':5,'Athletics':4,'Perception':5,'Brawling':3,'Streetwise':4,'Gamble':5,'Concentration':2,'Education':2,'Conversation':2,'Local Expert':4,'Language (Streetslang)':4},
  it=[('weapon','Heavy Pistol'),('armor','Leathers (Body)'),('cyberware','Kerenzikov'),('ammo','Heavy Pistol (Basic)')],
  d='Ночные гонки, ставки и угнанные машины. Знает каждый объезд вокруг Боевых зон.', tac='Стреляет из машины, в пешем бою — уезжает.'),
 dict(f='Улица', n='Органлеггер', tier='mook', role='Органлеггер', st=S(5,6,6,6,5,4,4,5,6,2),
  sk={'Handgun':5,'Melee Weapon':5,'First Aid':5,'Paramedic':4,'Stealth':5,'Streetwise':5,'Brawling':4,'Evasion':4,'Perception':4,'Athletics':3,'Concentration':2,'Education':2,'Conversation':2,'Local Expert':3,'Language (Streetslang)':4},
  it=[('weapon','SMG'),('weapon','Medium Melee'),('armor','Kevlar (Body)'),('cyberware','Toxin Binders'),('gear','Vial of Poison'),('ammo','Medium Pistol (Basic)')],
  d='Медицинские перчатки, фургон без номеров, холодильник для «товара». Работает в паре, охотится ночью.', tac='Отравленный нож (Флакон с ядом), затем тащит жертву в фургон. При сопротивлении — бежит.'),
 dict(f='Улица', n='Главарь бустеров', tier='lt', role='Главарь банды', st=S(4,7,7,3,7,5,5,6,7,3),
  sk={'Handgun':6,'Melee Weapon':6,'Brawling':6,'Evasion':5,'Athletics':5,'Streetwise':6,'Interrogation':5,'Perception':4,'Tactics':3,'Concentration':2,'Education':1,'Conversation':2,'Local Expert':4,'Language (Streetslang)':4},
  it=[('weapon','Very Heavy Pistol'),('armor','Light Armorjack (Body)'),('cyberware','Wolvers'),('cyberware','Rippers'),('ammo','Very Heavy Pistol (Basic)')],
  d='Хром, ирокез, вольверы. Держит квартал страхом и раздаёт «налоги».', tac='Ведёт 4–6 бустеров. Сам лезет в рукопашную, когда ранен — звереет.'),
 dict(f='Улица', n='Коп-взяточник', tier='mook', role='NCPD · патрульный', st=S(5,6,6,4,6,5,4,5,6,4),
  sk={'Handgun':6,'Melee Weapon':4,'Brawling':4,'Evasion':4,'Perception':5,'Interrogation':5,'Bribery':6,'Criminology':4,'Drive Land Vehicle':4,'Athletics':3,'Concentration':2,'Education':3,'Conversation':3,'Local Expert':4,'Language (Streetslang)':3},
  it=[('weapon','NCPD Heavy Pistol'),('weapon','NCPD Stun Stick'),('armor','NCPD Light AJ (Body)'),('armor','NCPD Light AJ (Head)'),('ammo','Heavy Pistol (Basic)')],
  d='Знает, у кого брать и с кого. За эдди «не видит», за большие эдди — помогает.', tac='Сначала требует документы, при сопротивлении — вызывает подкрепление (1к6 раундов).'),
 dict(f='Улица', n='Бездомный ветеран', tier='mook', role='Информатор · ветеран 4-й Корпоративной', st=S(5,6,5,4,5,6,3,4,6,5),
  sk={'Shoulder Arms':5,'Handgun':4,'Melee Weapon':5,'Perception':6,'Stealth':5,'Wilderness Survival':4,'Streetwise':5,'Local Expert':7,'Brawling':4,'Evasion':3,'Athletics':3,'Concentration':3,'Education':2,'Conversation':3,'Language (Streetslang)':4},
  it=[('weapon','Combat Knife'),('weapon','Very Heavy Pistol (Poor)'),('armor','Leathers (Body)'),('cyberware','Cyberarm'),('ammo','Very Heavy Pistol (Basic)')],
  d='Потрёпанная военная куртка, старая кибер-рука с выцветшими нашивками. Видит всё, что творится на улице.', tac='Не лезет в чужие драки. Если его друзей обидели — стреляет из старой пушки.'),
 # Специалисты
 dict(f='Специалисты', n='Риппердок', tier='lt', role='Риппердок', st=S(8,5,7,8,5,5,5,4,5,6),
  sk={'Cybertech':8,'Paramedic':7,'First Aid':7,'Basic Tech':6,'Electronics/Security Tech':5,'Human Perception':4,'Trading':5,'Handgun':4,'Evasion':3,'Perception':5,'Education':6,'Science':5,'Athletics':2,'Brawling':2,'Concentration':4,'Conversation':3,'Local Expert':4,'Language (Streetslang)':3},
  it=[('weapon','Medium Pistol'),('armor','Kevlar (Body)'),('cyberware','Tool Hand'),('cyberware','Cybereye'),('cyberware','Image Enhance'),('ammo','Medium Pistol (Basic)')],
  d='Подпольная клиника за жалюзи. Ставит хром без вопросов и без гарантий. Медтехник 6.', tac='В бою прячется. Под рукой — успокоительное и тревожная кнопка для «крыши».'),
 dict(f='Специалисты', n='Нетраннер-одиночка', tier='lt', role='Нетраннер', st=S(8,7,6,7,5,6,5,5,5,5),
  sk={'Electronics/Security Tech':7,'Cryptography':6,'Basic Tech':6,'Library Search':6,'Education':5,'Handgun':5,'Evasion':5,'Stealth':5,'Perception':5,'Concentration':4,'Athletics':3,'Brawling':2,'Conversation':2,'Human Perception':3,'Local Expert':4,'Language (Streetslang)':4},
  it=[('cyberdeck','Cyberdeck (Excellent)'),('weapon','Medium Pistol'),('armor','Bodysuit'),('cyberware','Neural Link'),('cyberware','Interface Plugs'),('ammo','Medium Pistol (Basic)')],
  d='Худой, бледный, с разъёмами на затылке. Берёт заказы через доски Сети, лично на встречи не ходит.', tac='Интерфейс 6. Подключается к точке доступа в 6 м от цели, остаётся в укрытии.'),
 dict(f='Специалисты', n='Частный детектив', tier='lt', role='Детектив', st=S(7,6,6,4,6,6,5,5,6,6),
  sk={'Deduction':7,'Criminology':6,'Human Perception':7,'Interrogation':5,'Perception':7,'Stealth':5,'Tracking':5,'Handgun':6,'Melee Weapon':5,'Evasion':4,'Streetwise':5,'Athletics':3,'Brawling':3,'Concentration':3,'Education':4,'Conversation':4,'Local Expert':5,'Language (Streetslang)':4},
  it=[('weapon','Very Heavy Pistol'),('weapon','Medium Melee'),('armor','Light Armorjack (Body)'),('cyberware','Cyberaudio Suite'),('cyberware','Voice Stress Analyzer'),('ammo','Very Heavy Pistol (Basic)')],
  d='Плащ, мачете и очень тяжёлый пистолет. Ищет людей, которых никто больше не ищет.', tac='Сначала говорит, потом стреляет. Анализатор стресса голоса — ловит ложь.'),
 dict(f='Специалисты', n='Журналист Нетворк 54', tier='mook', role='Медиа', st=S(7,5,6,5,7,6,6,5,5,7),
  sk={'Persuasion':6,'Conversation':6,'Human Perception':6,'Photography/Film':7,'Library Search':5,'Stealth':4,'Handgun':4,'Evasion':4,'Perception':5,'Education':5,'Composition':5,'Athletics':3,'Brawling':2,'Concentration':3,'Local Expert':4,'Language (Streetslang)':3},
  it=[('weapon','Medium Pistol'),('armor','Kevlar (Body)'),('gear','Bodycam'),('cyberware','Cybereye'),('cyberware','Image Enhance'),('ammo','Medium Pistol (Basic)')],
  d='Ищет историю, за которую дадут прайм-тайм. Камера на груди пишет всё — и транслирует, если его убьют.', tac='Не воюет. Убийство журналиста — гарантированный эфир и проблемы.'),
 dict(f='Специалисты', n='Медтех-фрилансер', tier='mook', role='Медтехник', st=S(7,5,6,6,6,6,5,5,6,7),
  sk={'Paramedic':7,'First Aid':7,'Science':5,'Handgun':4,'Evasion':4,'Perception':5,'Human Perception':5,'Basic Tech':4,'Education':5,'Athletics':3,'Brawling':2,'Concentration':3,'Conversation':3,'Local Expert':4,'Language (Streetslang)':3},
  it=[('weapon','Medium Pistol'),('armor','Kevlar (Body)'),('drug','Speedheal'),('drug','Stim'),('ammo','Medium Pistol (Basic)')],
  d='Подрабатывает вне смены REO «Мясной вагон». Латает эджраннеров на кухонном столе за 100 eb.', tac='Лечит своих, пока остальные прикрывают.'),
 dict(f='Специалисты', n='Техник-реставратор', tier='mook', role='Техник', st=S(6,5,6,8,5,6,5,5,6,6),
  sk={'Basic Tech':7,'Electronics/Security Tech':6,'Land Vehicle Tech':5,'Weaponstech':5,'Demolitions':4,'Shoulder Arms':5,'Evasion':3,'Perception':4,'Athletics':4,'Brawling':3,'Concentration':3,'Education':3,'Conversation':2,'Local Expert':5,'Language (Streetslang)':3},
  it=[('weapon','Shotgun'),('armor','Light Armorjack (Body)'),('cyberware','Tool Hand'),('ammo','Shotgun Shell (Basic)')],
  d='Подключает заброшенные дома к сети и чинит всё, что ещё можно спасти.', tac='Защищает своих рабочих, может заминировать проход.'),
 # Угрозы
 dict(f='Угрозы', n='Агент Арасаки', tier='mini', role='Корпоративный агент', st=S(7,8,8,5,8,7,6,7,7,4),
  sk={'Handgun':7,'Melee Weapon':7,'Autofire':6,'Evasion':7,'Stealth':6,'Tactics':6,'Perception':6,'Human Perception':5,'Athletics':6,'Brawling':5,'Martial Arts':5,'Concentration':5,'Education':5,'Conversation':4,'Local Expert':4,'Language (Streetslang)':3,'Interrogation':5},
  it=[('weapon','Heavy SMG (Excellent)'),('weapon','Katana (Excellent)'),('armor','Subdermal Armor'),('armor','Subdermal Armor (Head)'),('cyberware','Kerenzikov'),('cyberware','Neural Link'),('cyberware','Sandevistan'),('ammo','Heavy Pistol (Armor-Piercing)')],
  d='Безупречный костюм, мёртвый взгляд. Арасака официально не в городе — поэтому агенты работают тихо.', tac='Сандевистан (+3 Инициатива на 1 мин.), Керензиков. Режет катаной, добивает очередью.'),
 dict(f='Угрозы', n='Наёмный убийца', tier='mini', role='Снайпер-убийца', st=S(6,8,8,5,8,6,6,6,6,3),
  sk={'Shoulder Arms':8,'Handgun':7,'Stealth':7,'Perception':7,'Evasion':6,'Tracking':5,'Athletics':5,'Brawling':4,'Melee Weapon':5,'Concentration':6,'Education':3,'Conversation':2,'Local Expert':5,'Language (Streetslang)':3},
  it=[('weapon','Sniper Rifle (Excellent)'),('weapon','Very Heavy Pistol (Excellent)'),('armor','Light Armorjack (Body)'),('armor','Light Armorjack (Head)'),('cyberware','Cybereye'),('cyberware','Targeting Scope'),('cyberware','Kerenzikov'),('ammo','Rifle (Armor-Piercing)'),('ammo','Very Heavy Pistol (Basic)')],
  d='Никто не видел его лица. Работает с 800 метров, отход всегда подготовлен.', tac='Целится 1 раунд (прицельный выстрел в голову), затем меняет позицию.'),
 dict(f='Угрозы', n='Киберпсих «Хромированный Бык»', tier='boss', role='Киберпсих', st=S(3,9,8,3,8,9,5,8,12,0),
  sk={'Brawling':8,'Melee Weapon':8,'Handgun':6,'Athletics':7,'Evasion':6,'Endurance':7,'Perception':5,'Resist Torture/Drugs':8,'Concentration':2,'Education':1,'Conversation':0,'Local Expert':3,'Language (Streetslang)':3},
  it=[('cyberware',"Psycho's Blades (Paired VH Melee)"),('cyberware','Popup Heavy Pistol'),('armor','Subdermal Armor'),('armor','Subdermal Armor (Head)'),('cyberware','Grafted Muscle and Bone Lace'),('cyberware','Pain Editor'),('cyberware','Cyberarm'),('cyberware','Cyberleg'),('ammo','Heavy Pistol (Basic)')],
  d='Бывший грузчик доков, вкачавший в себя слишком много хрома. Человечность — ноль. Награда NCPD: 5000 eb.', tac='Редактор боли — игнорирует штрафы ран. Атакует ближайшего, рвёт укрытия. MaxTac прибывает через 1к6+2 раунда.'),
 dict(f='Угрозы', n='Наёмник-ветеран', tier='lt', role='Соло', st=S(5,8,7,4,6,6,5,6,7,4),
  sk={'Shoulder Arms':7,'Autofire':6,'Handgun':6,'Heavy Weapons':5,'Tactics':6,'Evasion':5,'Athletics':5,'Brawling':5,'Melee Weapon':4,'Perception':5,'Demolitions':4,'Concentration':3,'Education':2,'Conversation':2,'Local Expert':4,'Language (Streetslang)':4},
  it=[('weapon','Assault Rifle'),('weapon','Heavy Pistol'),('armor','Improved Medium Armorjack (Body)'),('armor','Improved Medium Armorjack (Head)'),('ammo','Rifle (Basic)'),('ammo','Grenade (Flashbang)'),('ammo','Heavy Pistol (Basic)')],
  d='Прошёл Южную Америку и 4-ю Корпоративную. Наёмная сила для тех, кто платит вперёд.', tac='Флешка, затем подавление очередью, затем фланг.'),
 dict(f='Угрозы', n='Корп-исполнитель', tier='mook', role='Корпорат', st=S(7,5,5,4,7,5,5,5,5,6),
  sk={'Business':6,'Bureaucracy':6,'Persuasion':6,'Human Perception':5,'Handgun':4,'Evasion':3,'Wardrobe & Style':6,'Conversation':5,'Education':6,'Perception':4,'Athletics':2,'Brawling':2,'Concentration':3,'Local Expert':3,'Language (Streetslang)':2},
  it=[('weapon','Medium Pistol (Excellent)'),('armor','Bodysuit'),('cyberware','Internal Agent'),('cyberware','Chipware Socket'),('ammo','Medium Pistol (Basic)')],
  d='Менеджер среднего звена, который «решает вопросы». Охрана рядом, юристы на быстром наборе.', tac='Не воюет — вызывает корпоративную охрану (1к6 раундов).'),
 dict(f='Угрозы', n='Мечник Тигриных Когтей', tier='lt', role='Банда · Тигриные Когти', st=S(4,8,8,3,7,5,5,7,6,3),
  sk={'Melee Weapon':8,'Martial Arts':5,'Evasion':7,'Athletics':6,'Drive Land Vehicle':6,'Handgun':4,'Stealth':4,'Perception':4,'Brawling':4,'Concentration':3,'Education':1,'Conversation':2,'Local Expert':4,'Language (Streetslang)':4},
  it=[('weapon','Katana (EQ Heavy Melee)'),('armor','Light Armorjack (Body)'),('cyberware','Kerenzikov'),('cyberware','Techhair')],
  d='Быстрый мотоцикл, быстрые рефлексы, изящный клинок. Защищает Джапантаун — по-своему.', tac='Врезается на мотоцикле, бьёт катаной, уходит до прибытия полиции.'),
]

def make(npc):
    a = copy.deepcopy(tpl)
    aid = rid()
    a['_id'] = aid; a['name'] = npc['n']; a['img'] = 'icons/svg/mystery-man.svg'
    a['folder'] = FOLDERS[npc['f']]; a['_key'] = f'!actors!{aid}'
    a['prototypeToken']['name'] = npc['n']; a['prototypeToken']['texture']['src'] = 'icons/svg/mystery-man.svg'
    a['prototypeToken']['actorLink'] = False
    st = npc['st']; s = a['system']
    cyber = [x for x in npc['it'] if x[0] == 'cyberware']
    hum = max(0, st['emp'] * 10 - 6 * len(cyber))
    for k, v in st.items():
        s['stats'][k]['value'] = v
        if 'max' in s['stats'][k]: s['stats'][k]['max'] = v
    s['stats']['emp']['value'] = min(st['emp'], hum // 10)
    hp = 10 + 5 * math.ceil((st['body'] + st['will']) / 2)
    s['derivedStats']['hp'] = {'value': hp, 'max': hp, 'transactions': []}
    s['derivedStats']['seriouslyWounded'] = math.ceil(hp / 2)
    s['derivedStats']['humanity'] = {'value': hum, 'max': st['emp'] * 10, 'transactions': []}
    s['information']['alias'] = npc['role']
    s['information']['description'] = ''
    s['information']['notes'] = (f"<h3>{npc['n']}</h3><p><b>{TIER[npc['tier']]}</b> · {npc['role']}</p><p>{npc['d']}</p>"
        f"<p><b>Тактика:</b> {npc['tac']}</p><p><b>ПЗ</b> {hp} · <b>Тяжёлое ранение</b> {math.ceil(hp/2)} · <b>Спасбросок от смерти</b> {st['body']}</p>"
        f"<p><i>Сгенерировано модулем «Найт-Сити · интерактивная карта». Арт — на ваш вкус.</i></p>")
    items = []
    for sl in slots:
        x = copy.deepcopy(sl); x['_id'] = rid(); items.append(x)
    for n, sk in skills.items():
        x = copy.deepcopy(sk); x['_id'] = rid(); x['system']['level'] = npc['sk'].get(n, 0); items.append(x)
    for t, n in npc['it']:
        src = lib.get((t, n)) or (t == 'armor' and lib.get(('armor', n)))
        if not src: print('НЕТ ПРЕДМЕТА', npc['n'], t, n); continue
        x = copy.deepcopy(src); x['_id'] = rid()
        if 'equipped' in x['system']: x['system']['equipped'] = 'equipped'
        pass
        items.append(x)
    for x in items:
        x['_key'] = f"!actors.items!{aid}.{x['_id']}"; x['folder'] = None
        for ef in x.get('effects', []):
            ef['_id'] = rid(); ef['_key'] = f"!actors.items.effects!{aid}.{x['_id']}.{ef['_id']}"
        x.setdefault('_stats', {})['compendiumSource'] = None
    a['items'] = items; a['effects'] = []
    a.pop('_stats', None); a['flags'] = {'night-city-map': {'npc': True, 'tier': npc['tier']}}
    a['ownership'] = {'default': 0}
    return a

os.makedirs(OUT, exist_ok=True)
for f in glob.glob(OUT + '/*.json'): os.remove(f)
for i, (name, fid) in enumerate(FOLDERS.items()):
    json.dump({'_id': fid, 'name': name, 'type': 'Actor', 'folder': None, 'sorting': 'a', 'sort': (i + 1) * 100000, 'color': '#ff2a6d', 'description': '', 'flags': {}, '_key': f'!folders!{fid}'},
              open(f'{OUT}/folder_{fid}.json', 'w'), ensure_ascii=False)
for npc in NPCS:
    a = make(npc); json.dump(a, open(f"{OUT}/actor_{a['_id']}.json", 'w'), ensure_ascii=False)
print('NPC:', len(NPCS))
