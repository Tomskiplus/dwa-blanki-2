// =====================================================
//  DWA BLANKI II - DANE GRY
//  Tu są wszystkie liczby i kształty. Możesz je śmiało zmieniać!
//  (Zasady, które z nich korzystają, są w rules.js)
// =====================================================

// --- Punkty w turze ---
const BUILD_POINTS = 8;          // punkty budowy na turę
const BARRACKS_BONUS = 1;        // dodatkowy punkt, który można wydać TYLKO na koszary
const MOVE_POINTS = 5;           // punkty ruchu dla każdego oddziału
const BUILDING_HP_PER_CELL = 2;  // budynek ma 2 życia za każdą swoją kratkę

// --- Ery ---
// ERA_NAMES[1] to nazwa ery 1 itd. (pozycja 0 jest pusta, żeby numery się zgadzały)
const ERA_NAMES = ["", "era mroku", "era feudalna", "era zamków", "era imperiów"];
// To samo w innej formie, do zdań typu "Czerwony przechodzi do ery feudalnej"
const ERA_GENITIVE = ["", "ery mroku", "ery feudalnej", "ery zamków", "ery imperiów"];
const MAX_ERA = 4;

// --- Kształty ---
// Kształt to lista kratek [x, y]. [0, 0] to lewy górny róg.
// x rośnie w prawo, y rośnie w dół (tak jak na canvasie).
// Przykład: [[0, 0], [0, 1]] to dwie kratki jedna pod drugą (prostokąt 1×2).

// --- Budynki ---
// canBuild: false = tego budynku nie da się postawić w trakcie gry
// era = od której ery można go budować (w zeszycie: napis E.1, E.2...)
// Żeby przejść do następnej ery, trzeba mieć WSZYSTKIE budynki z obecnej ery.
// group = w której zakładce panelu jest przycisk: "budynki" albo "obrona"
// hpPerCell = życie za każdą kratkę (gdy go nie ma: BUILDING_HP_PER_CELL)
// wall: true = palisada/mur - blokuje drogę i da się go PRZEDŁUŻAĆ (stawiać obok swojego muru)
// gate: true = brama - SWOJE jednostki przechodzą, wrogowie nie
// attack, range = budowla strzela jak łucznik (raz na turę)
// buildTurns: 2 = budowa trwa 2 tury (zamek)
const BUILDING_TYPES = {
  ratusz: {
    name: "Ratusz",
    short: "R",
    // 2 kratki szerokości, 3 wysokości: górny rząd to dach, pod nim 2×2 kwadraty
    shape: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    hasRoof: true,
    canBuild: true,   // drugi ratusz można zbudować dopiero w erze 4
    era: 4,
    group: "budynki",
  },
  uniwersytet: {
    name: "Uniwersytet",
    short: "U",
    shape: [[0, 0], [1, 0], [2, 0], [3, 0]],   // 4 pola w rzędzie
    canBuild: true,
    era: 4,
    group: "budynki",
  },
  dom: {
    name: "Dom",
    short: "D",
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],   // 2×2 (na razie nic nie robi, później populacja)
    canBuild: true,
    era: 1,
    group: "budynki",
  },
  palisada: {
    name: "Palisada",
    short: "",
    shape: [[0, 0]],             // 1 pole - słaby mur, da się przedłużać
    canBuild: true,
    era: 1,
    group: "obrona",
    wall: true,
    hpPerCell: 1,
  },
  bramaDrewniana: {
    name: "Brama drewniana",
    short: "",
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],   // 2×2
    canBuild: true,
    era: 1,
    group: "obrona",
    gate: true,
    hpPerCell: 2,
  },
  mur: {
    name: "Mur",
    short: "",
    shape: [[0, 0]],             // 1 pole - mocny mur, da się przedłużać
    canBuild: true,
    era: 2,
    group: "obrona",
    wall: true,
    hpPerCell: 4,
  },
  bramaKamienna: {
    name: "Brama kamienna",
    short: "",
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],   // 2×2
    canBuild: true,
    era: 2,
    group: "obrona",
    gate: true,
    hpPerCell: 4,
  },
  wiezaDrewniana: {
    name: "Wieża drewniana",
    short: "",
    shape: [[0, 0], [0, 1], [0, 2]],           // 1×3
    canBuild: true,
    era: 2,
    group: "obrona",
    hpPerCell: 2,
    attack: 1,
    range: 4,
  },
  wiezaKamienna: {
    name: "Wieża z kamienia",
    short: "",
    shape: [[0, 0], [0, 1]],                   // 1×2
    canBuild: true,
    era: 3,
    group: "obrona",
    hpPerCell: 4,
    attack: 2,
    range: 5,
  },
  zamek: {
    name: "Zamek",
    short: "",
    // 10 pól: dwie wieżyczki na górze, pod nimi 2 rzędy po 4
    shape: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]],
    canBuild: true,
    era: 3,
    group: "obrona",
    hpPerCell: 4,
    attack: 3,
    range: 6,
    buildTurns: 2,
  },
  koszary: {
    name: "Koszary",
    short: "K",
    // kwadrat 3×3
    shape: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    canBuild: true,
    era: 1,
    group: "budynki",
  },
  strzelnica: {
    name: "Strzelnica",
    short: "S",
    // litera L: słupek z lewej i podstawa na dole
    shape: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
    canBuild: true,
    era: 2,
    group: "budynki",
  },
  stajnia: {
    name: "Stajnia",
    short: "St",
    // prostokąt 2×3
    shape: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    canBuild: true,
    era: 3,
    group: "budynki",
  },
};

// --- Kilka gotowych kształtów jednostek (żeby nie pisać ich wiele razy) ---
const SHAPE_1x1 = [[0, 0]];                          // 1 kratka
const SHAPE_1x2 = [[0, 0], [0, 1]];                  // 2 kratki w pionie
const SHAPE_1x3 = [[0, 0], [0, 1], [0, 2]];          // 3 kratki w pionie
const SHAPE_LONG4 = [[0, 0], [1, 0], [2, 0], [3, 0]]; // 4 kratki w poziomie ("ołówek")
const SHAPE_L3 = [[1, 0], [0, 1], [1, 1]];           // małe L z 3 kratek
const SHAPE_GAMMA3 = [[0, 0], [1, 0], [0, 1]];       // litera Γ z 3 kratek (kawaleria)
const SHAPE_SQUARE4 = [[0, 0], [1, 0], [0, 1], [1, 1]]; // kwadrat 2×2
const SHAPE_LANCER = [[0, 0], [0, 1], [1, 1]];       // litera L z 3 kratek (ułan) - włócznia wystaje w pusty róg
// Słoń: 1 kratka na górze + podstawa 3×2
const SHAPE_ELEPHANT = [[1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
// Bombarda: 4 kratki w rzędzie + 1 pod trzecią
const SHAPE_BOMBARD = [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1]];
// Mamut: duży słoń - 1 kratka na górze + podstawa 3×3 (10 kratek)
const SHAPE_MAMMOTH = [[1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3], [1, 3], [2, 3]];

// --- Jednostki ---
// hp = życie ❤️, attack = atak ⚔️, range = zasięg
// era = od której ery można ją zrobić
// building = który budynek ją produkuje
// cavalry: true = to jest kawaleria (włócznicy zadają jej więcej obrażeń)
// bonusVsCavalry = ile DODATKOWYCH obrażeń zadaje kawalerii
// free = "małe części" (nie większe niż pół pola, np. daszek albo grot):
//        zajmują pole (nikt tam nie stanie), ale NIE kosztują punktów budowy
// Ery ustalone 2026-11-07: lepsze wersje jednostek są zawsze o erę później.
const UNIT_TYPES = {
  // ----- Ratusz -----
  chlop:             { name: "Chłop",                 shape: SHAPE_1x1, hp: 1,  attack: 0,   range: 0, era: 1, building: "ratusz", builder: true },
  chlopUlepszony:    { name: "Chłop ulepszony",       shape: SHAPE_1x1, hp: 3,  attack: 1,   range: 1, era: 2, building: "ratusz", builder: true },

  // ----- Uniwersytet (era 4, dopiero po zbadaniu Prochu) -----
  // needsResearch = jakie badanie trzeba mieć; bonusVsBuildings = dodatkowe obrażenia budynkom
  bombarda:          { name: "Bombarda",              shape: SHAPE_BOMBARD, hp: 5, attack: 5, range: 5, era: 4, building: "uniwersytet", needsResearch: "proch", bonusVsBuildings: 4 },

  // ----- Koszary -----
  piechur:           { name: "Piechur",               shape: SHAPE_1x2, hp: 3,  attack: 1,   range: 1, era: 1, building: "koszary" },
  wlocznik:          { name: "Włócznik",              shape: SHAPE_1x2, hp: 2,  attack: 1,   range: 1, era: 1, building: "koszary", free: [[0, 0]], bonusVsCavalry: 3 },
  piechurUlepszony:  { name: "Piechur ulepszony",     shape: SHAPE_1x3, hp: 4,  attack: 1.5, range: 1, era: 2, building: "koszary" },
  pikinier:          { name: "Pikinier",              shape: SHAPE_1x2, hp: 4,  attack: 2,   range: 1, era: 2, building: "koszary", free: [[0, 0]], bonusVsCavalry: 2 },
  wojownikOrlow:     { name: "Wojownik orłów",        shape: SHAPE_LONG4, hp: 3, attack: 2,  range: 2, era: 2, building: "koszary", free: [[3, 0]] },
  halabardnik:       { name: "Halabardnik",           shape: SHAPE_1x2, hp: 6,  attack: 3,   range: 1, era: 3, building: "koszary", free: [[0, 0]], bonusVsCavalry: 3 },
  eWojownikOrlow:    { name: "Elit. wojownik orłów",  shape: SHAPE_LONG4, hp: 4, attack: 4,  range: 2, era: 3, building: "koszary", free: [[3, 0]] },
  eWojownikOrlowUl:  { name: "Elit. wojownik orłów+", shape: SHAPE_LONG4, hp: 6, attack: 5,  range: 2, era: 4, building: "koszary", free: [[3, 0]] },

  // ----- Strzelnica (od ery 2) -----
  lucznik:           { name: "Łucznik",               shape: SHAPE_1x1, hp: 2,  attack: 1,   range: 4, era: 2, building: "strzelnica" },
  oszczepnik:        { name: "Oszczepnik",            shape: SHAPE_1x1, hp: 2,  attack: 1,   range: 4, era: 2, building: "strzelnica" },
  wyszkolonyLucznik: { name: "Wyszkolony łucznik",    shape: SHAPE_1x1, hp: 2,  attack: 1.5, range: 6, era: 3, building: "strzelnica" },
  eOszczepnik:       { name: "Elit. oszczepnik",      shape: SHAPE_1x1, hp: 3,  attack: 2,   range: 5, era: 3, building: "strzelnica" },
  slon:              { name: "Słoń bojowy",           shape: SHAPE_ELEPHANT, hp: 10, attack: 4, range: 6, era: 3, building: "strzelnica" },

  // ----- Stajnia (od ery 3) -----
  kawaleria1:        { name: "Kawaleria (1)",         shape: SHAPE_GAMMA3,  hp: 5, attack: 2, range: 1, era: 3, building: "stajnia", cavalry: true },
  kawaleria2:        { name: "Kawaleria (2)",         shape: SHAPE_L3,      hp: 5, attack: 2, range: 1, era: 3, building: "stajnia", cavalry: true },
  ciezkaKawaleria:   { name: "Ciężka kawaleria",      shape: SHAPE_SQUARE4, hp: 6, attack: 3, range: 1, era: 4, building: "stajnia", cavalry: true },
  paladyn:           { name: "Paladyn",               shape: SHAPE_L3,      hp: 9, attack: 4, range: 1, era: 4, building: "stajnia", cavalry: true },
  ulan:              { name: "Ułan",                  shape: SHAPE_LANCER,  hp: 6, attack: 4, range: 1, era: 4, building: "stajnia", cavalry: true },
  // Ulepszony paladyn - tylko kraj zielony; ulepszenie kupuje się w zamku (patrz UPGRADES)
  ulepszonyPaladyn:  { name: "Ulepszony paladyn",     shape: SHAPE_L3,      hp: 9, attack: 5, range: 1, era: 4, building: "stajnia", cavalry: true, countries: ["zielony"] },

  // ----- Zamek: jednostki specjalne krajów (era 3 - wtedy da się zbudować zamek) -----
  // countries = które kraje mogą ją robić
  // group = do której grupy należy przy badaniach i bonusach ("strzelnica" = Płonący grot,
  //         "koszary" = Sparing); bez group = badania na nią nie działają
  // Ulepszone wersje ("Ulepszona ...") kupuje się w uniwersytecie (era 4)
  miniArmatka:            { name: "Mini armatka",                shape: SHAPE_1x1, hp: 8, attack: 5, range: 7, era: 3, building: "zamek", countries: ["czerwony"] },
  ulepszonaMiniArmatka:   { name: "Ulepszona mini armatka",      shape: SHAPE_1x1, hp: 8, attack: 6, range: 8, era: 4, building: "zamek", countries: ["czerwony"] },
  lucznikKompozytowy:     { name: "Łucznik kompozytowy",         shape: SHAPE_1x1, hp: 3, attack: 2, range: 10, era: 3, building: "zamek", countries: ["ciemnopomaranczowy"], group: "strzelnica" },
  ulepszonyLucznikKomp:   { name: "Ulepszony łucznik kompozytowy", shape: SHAPE_1x1, hp: 3, attack: 3, range: 12, era: 4, building: "zamek", countries: ["ciemnopomaranczowy"], group: "strzelnica" },
  skorpion:               { name: "Skorpion",                    shape: SHAPE_1x2, hp: 6, attack: 5, range: 6, era: 3, building: "zamek", countries: ["pomaranczowy"] },
  ulepszonySkorpion:      { name: "Ulepszony skorpion",          shape: SHAPE_1x2, hp: 9, attack: 7, range: 8, era: 4, building: "zamek", countries: ["pomaranczowy"] },
  armatkaTurbo:           { name: "Armatka turbo",               shape: SHAPE_1x1, hp: 8, attack: 5, range: 4, era: 3, building: "zamek", countries: ["jasnozielony"] },
  ulepszonaArmatkaTurbo:  { name: "Ulepszona armatka turbo",     shape: SHAPE_1x1, hp: 8, attack: 8, range: 6, era: 4, building: "zamek", countries: ["jasnozielony"] },
  slonZBalista:           { name: "Słoń z balistą",              shape: SHAPE_ELEPHANT, hp: 10, attack: 8, range: 6, era: 3, building: "zamek", countries: ["ciemnozielony"], group: "strzelnica" },
  podwojnyHalabardnik:    { name: "Podwójny halabardnik",        shape: SHAPE_1x1, hp: 8, attack: 6, range: 4, era: 3, building: "zamek", countries: ["niebieski"], group: "koszary", bonusVsCavalry: 3 },
  ulepszonyPodwHalabardnik: { name: "Ulepszony podwójny halabardnik", shape: SHAPE_1x1, hp: 8, attack: 9, range: 4, era: 4, building: "zamek", countries: ["niebieski"], group: "koszary", bonusVsCavalry: 3 },
  plonacyOszczepnik:      { name: "Płonący oszczepnik",          shape: SHAPE_1x1, hp: 4, attack: 3, range: 6, era: 3, building: "zamek", countries: ["jasnoniebieski", "bordowy"], group: "strzelnica" },
  // Granatowy ma najwięcej jednostek specjalnych
  slonTrykacz:            { name: "Opancerzony słoń trykacz",    shape: SHAPE_ELEPHANT, hp: 10, attack: 6, range: 1, era: 3, building: "zamek", countries: ["granatowy"], group: "strzelnica" },
  shurikeniarz:           { name: "Shurikeniarz",                shape: SHAPE_1x1, hp: 5, attack: 2, range: 3, era: 3, building: "zamek", countries: ["granatowy"], group: "strzelnica" },
  kawaleriaZLukiem:       { name: "Kawaleria z łukiem",          shape: SHAPE_L3,  hp: 5, attack: 3, range: 5, era: 3, building: "zamek", countries: ["granatowy"], cavalry: true },
  ulanZPancerzem:         { name: "Ułan z pancerzem płytowym",   shape: SHAPE_LANCER, hp: 5, attack: 2, range: 4, era: 3, building: "zamek", countries: ["granatowy"], cavalry: true },
  slonZTaranem:           { name: "Słoń z taranem",              shape: SHAPE_ELEPHANT, hp: 9, attack: 8, range: 1, era: 3, building: "zamek", countries: ["granatowy"], group: "strzelnica", bonusVsBuildings: 3 },
  mamut:                  { name: "Mamut",                       shape: SHAPE_MAMMOTH, hp: 12, attack: 7, range: 8, era: 3, building: "zamek", countries: ["granatowy"], group: "strzelnica" },
  slonOpancerzony:        { name: "Słoń opancerzony",            shape: SHAPE_ELEPHANT, hp: 10, attack: 5, range: 6, era: 3, building: "zamek", countries: ["granatowy"], group: "strzelnica" },
  ulepszonySlonOpanc:     { name: "Ulepszony słoń opancerzony",  shape: SHAPE_ELEPHANT, hp: 11, attack: 6, range: 6, era: 4, building: "zamek", countries: ["granatowy"], group: "strzelnica" },
  superLucznik:           { name: "Super łucznik",               shape: SHAPE_1x1, hp: 3, attack: 2, range: 6, era: 3, building: "zamek", countries: ["fioletowy"], group: "strzelnica" },
  ulepszonySuperLucznik:  { name: "Ulepszony super łucznik",     shape: SHAPE_1x1, hp: 4, attack: 4, range: 7, era: 4, building: "zamek", countries: ["fioletowy"], group: "strzelnica" },
  kawaleriaZLukiem2:      { name: "Kawaleria z łukiem 2",        shape: SHAPE_L3,  hp: 5, attack: 3, range: 4, era: 3, building: "zamek", countries: ["rozowy"], cavalry: true },
  ulepszonaKawaleriaZLukiem2: { name: "Ulepszona kawaleria z łukiem 2", shape: SHAPE_L3, hp: 6, attack: 5, range: 4, era: 4, building: "zamek", countries: ["rozowy"], cavalry: true },
  opancerzonyPaladyn:     { name: "Opancerzony paladyn",         shape: SHAPE_L3,  hp: 8, attack: 4, range: 1, era: 3, building: "zamek", countries: ["szary"], cavalry: true },
  zwiadowca:              { name: "Zwiadowca",                   shape: SHAPE_1x1, hp: 6, attack: 6, range: 9, era: 3, building: "zamek", countries: ["czarny"], group: "strzelnica" },

  // ----- TAJNE: tylko z kodu w EDYTORZE (patrz CHEAT_CODES niżej) -----
  // Nie mają "building", więc żaden budynek ich nie robi.
  // attacksPerTurn = ile razy atakuje w jednej turze
  // onlyVsUnits = atakuje tylko jednostki (budynków nie)
  // range: 999 = "nieskończoność" (Infinity nie przeżyłoby zapisu gry jako JSON - zmieniłoby się w null)
  jez:               { name: "Jeż",                   shape: SHAPE_SQUARE4, hp: 5,  attack: 1,  range: 1,   era: 1, cheatOnly: true, attacksPerTurn: 15 },
  kotAk:             { name: "Kot z AK-47",           shape: SHAPE_1x2,     hp: 20, attack: 10, range: 999, era: 1, cheatOnly: true, onlyVsUnits: true },
  // unlimitedMove = "nieskończony" ruch (999 darmowych kroków na turę)
  // tongueAttack = przy ataku wyciąga język (animacja w game.js)
  zaba:              { name: "Żaba",                  shape: SHAPE_SQUARE4, hp: 21, attack: 5,  range: 4,   era: 1, cheatOnly: true, unlimitedMove: true, tongueAttack: true },
};

// --- Tajne kody (tylko w EDYTORZE, wpisywane w okienko czatu) ---
// kod -> jaka jednostka się pojawia.
// Wielkość liter MA znaczenie: działa "IAmNotTusk", a "iamnottusk" już nie (zasada autora gry)
const CHEAT_CODES = {
  "IAmNotTusk": "jez",
  "AK-47_cat": "kotAk",
  "ILLfroggy": "zaba",
};

// --- Ulepszenia jednostek ---
// Każde ulepszenie zmienia WSZYSTKIE jednostki gracza z "from" na "to" (też przyszłe).
// Kupuje się je w budynku, który robi jednostkę "from", od ery jednostki "to".
// grow = gdy nowy kształt jest większy: o ile przesuwa się stary kształt w nowym
//        (piechur [0, 1] = nowa kratka dochodzi z przodu, czyli u góry przed obrotem)
const UPGRADE_COST = 4;
const UPGRADES = [
  // ----- Koszary -----
  { from: "piechur",        to: "piechurUlepszony", grow: [0, 1] },
  { from: "wlocznik",       to: "pikinier" },
  { from: "pikinier",       to: "halabardnik" },
  { from: "wojownikOrlow",  to: "eWojownikOrlow" },
  { from: "eWojownikOrlow", to: "eWojownikOrlowUl" },
  // ----- Strzelnica -----
  { from: "lucznik",        to: "wyszkolonyLucznik" },
  { from: "oszczepnik",     to: "eOszczepnik" },
  // ----- Stajnia -----
  { from: "kawaleria1",     to: "ciezkaKawaleria", grow: [0, 0] },  // Γ dopełnia pusty róg do 2×2
  { from: "kawaleria2",     to: "paladyn" },
  // ----- Ratusz -----
  { from: "chlop",          to: "chlopUlepszony" },
  // ----- Zamek i uniwersytet: jednostki specjalne krajów -----
  // where = gdzie kupuje się ulepszenie (gdy inaczej niż w budynku, który robi jednostkę)
  // countries = tylko te kraje mogą je kupić
  { from: "paladyn",             to: "ulepszonyPaladyn",           where: "zamek", countries: ["zielony"] },
  { from: "miniArmatka",         to: "ulepszonaMiniArmatka",       where: "uniwersytet" },
  { from: "lucznikKompozytowy",  to: "ulepszonyLucznikKomp",       where: "uniwersytet" },
  { from: "skorpion",            to: "ulepszonySkorpion",          where: "uniwersytet" },
  { from: "armatkaTurbo",        to: "ulepszonaArmatkaTurbo",      where: "uniwersytet" },
  { from: "podwojnyHalabardnik", to: "ulepszonyPodwHalabardnik",   where: "uniwersytet" },
  { from: "slonOpancerzony",     to: "ulepszonySlonOpanc",         where: "uniwersytet" },
  { from: "superLucznik",        to: "ulepszonySuperLucznik",      where: "uniwersytet" },
  { from: "kawaleriaZLukiem2",   to: "ulepszonaKawaleriaZLukiem2", where: "uniwersytet" },
];

// --- Badania w uniwersytecie ("Zbadaj...") ---
const RESEARCH_COST = 4;
const RESEARCH = {
  wypalanie:      { name: "Wypalanie",       info: "Budynki: +1 życia za każde pole." },
  plonacyGrot:    { name: "Płonący grot",    info: "Jednostki ze strzelnicy: +2 ataku." },
  mordownia:      { name: "Mordownia",       info: "Wieże i zamek strzelają też do wroga tuż obok." },
  pancerzLuskowy: { name: "Pancerz łuskowy", info: "Każda jednostka: +2 darmowe kroki." },
  szarza:         { name: "Szarża",          info: "Kawaleria atakuje 2 razy na turę." },
  sparing:        { name: "Sparing",         info: "Jednostki z koszar: +3 życia." },
  proch:          { name: "Proch",           info: "Uniwersytet może robić bombardy." },
};

// --- Kraje (kolory) ---
// Każdy kolor to osobny kraj - jak cywilizacja. Kolejność jak w zeszycie.
// Gracz wybiera kraj przed grą; kilku graczy może mieć ten sam kraj.
const COUNTRIES = [
  { key: "czerwony",           name: "Czerwony",           color: "#d63031" },
  { key: "ciemnopomaranczowy", name: "Ciemnopomarańczowy", color: "#c0510f" },
  { key: "pomaranczowy",       name: "Pomarańczowy",       color: "#f0901a" },
  { key: "zolty",              name: "Żółty",              color: "#e1b000" },
  { key: "jasnozielony",       name: "Jasnozielony",       color: "#7cc832" },
  { key: "zielony",            name: "Zielony",            color: "#1e9e3a" },
  { key: "ciemnozielony",      name: "Ciemnozielony",      color: "#0d5c2a" },
  { key: "jasnoniebieski",     name: "Jasnoniebieski",     color: "#3cb4e6" },
  { key: "niebieski",          name: "Niebieski",          color: "#1f6fe0" },
  { key: "granatowy",          name: "Granatowy",          color: "#1b2a7a" },
  { key: "fioletowy",          name: "Fioletowy",          color: "#8e44ad" },
  { key: "rozowy",             name: "Różowy",             color: "#e84393" },
  { key: "bezowy",             name: "Beżowy",             color: "#c8a878" },
  { key: "brazowy",            name: "Brązowy",            color: "#7a4a1e" },
  { key: "szary",              name: "Szary",              color: "#8a8a8a" },
  { key: "czarny",             name: "Czarny",             color: "#2b2b2b" },
  { key: "bordowy",            name: "Bordowy",            color: "#7b1530" },
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

// --- Rozmiary planszy (cols = kolumny, rows = rzędy) ---
const BOARD_SIZES = {
  mala:    { name: "MAŁA",    cols: 20, rows: 15 },
  srednia: { name: "ŚREDNIA", cols: 28, rows: 21 },
  duza:    { name: "DUŻA",    cols: 36, rows: 27 },
};
