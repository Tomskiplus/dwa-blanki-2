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
  chlop:             { name: "Chłop",                 shape: SHAPE_1x1, hp: 1,  attack: 0,   range: 0, era: 1, building: "ratusz" },

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
};

// --- Kolory graczy (maksymalnie 8 graczy) ---
const PLAYER_COLORS = [
  { name: "Czerwony",    color: "#d63031" },
  { name: "Niebieski",   color: "#0984e3" },
  { name: "Zielony",     color: "#00a046" },
  { name: "Żółty",       color: "#e1b000" },
  { name: "Fioletowy",   color: "#8e44ad" },
  { name: "Pomarańczowy", color: "#e67e22" },
  { name: "Błękitny",    color: "#00b5b0" },
  { name: "Różowy",      color: "#e84393" },
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

// --- Rozmiary planszy (cols = kolumny, rows = rzędy) ---
const BOARD_SIZES = {
  mala:    { name: "MAŁA",    cols: 20, rows: 15 },
  srednia: { name: "ŚREDNIA", cols: 28, rows: 21 },
  duza:    { name: "DUŻA",    cols: 36, rows: 27 },
};
