// =====================================================
//  DWA BLANKI II - ZASADY GRY
//  Tu NIC nie rysujemy. Tylko liczymy i sprawdzamy zasady.
//  Dzięki temu możemy je testować programem tests/run-tests.js
// =====================================================

// =====================================================
//  KSZTAŁTY I KRATKI
// =====================================================

// Zamienia kształt (np. [[0,0],[0,1]]) na prawdziwe kratki na planszy.
// x, y = gdzie stawiamy lewy górny róg kształtu
// rotation = ile razy obrócić o 90° w prawo (0, 1, 2 albo 3)
function shapeCells(shape, x, y, rotation) {
  let cells = shape.map(([sx, sy]) => ({ x: sx, y: sy }));

  // Obracamy kształt tyle razy, ile trzeba
  for (let i = 0; i < (rotation || 0); i++) {
    // Obrót o 90° w prawo: (x, y) -> (-y, x)
    cells = cells.map(c => ({ x: -c.y, y: c.x }));
  }

  // Po obrocie kształt może "uciec" na minus - przesuwamy go z powrotem do (0, 0)
  const minX = Math.min(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));

  return cells.map(c => ({ x: c.x - minX + x, y: c.y - minY + y }));
}

// Czy kratka (x, y) jest na planszy?
function isInsideBoard(game, x, y) {
  return x >= 0 && y >= 0 && x < game.cols && y < game.rows;
}

// Zwraca obiekt (budynek albo jednostkę), który stoi na kratce (x, y), albo null
// Jednostki sprawdzamy NAJPIERW - bo jednostka może stać w swojej bramie
// i wtedy kliknięcie ma trafić w jednostkę, a nie w bramę pod nią.
function getObjectAt(game, x, y) {
  for (const kind of ["unit", "building"]) {
    for (const obj of game.objects) {
      if (obj.kind !== kind) continue;
      for (const cell of obj.cells) {
        if (cell.x === x && cell.y === y) return obj;
      }
    }
  }
  return null;
}

// Czy dwa kształty stykają się BOKIEM (nie tylko rogiem)?
function touchesBySide(cellsA, cellsB) {
  return cellsA.some(a => cellsB.some(b => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1));
}

// Odległość między dwoma kształtami - liczona jak ruch króla w szachach:
// krok po skosie też liczy się jako 1. Bierzemy dwie NAJBLIŻSZE kratki.
// Odległość 1 = kształty się stykają (bokiem albo rogiem).
function distance(cellsA, cellsB) {
  let best = Infinity;
  for (const a of cellsA) {
    for (const b of cellsB) {
      const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      if (d < best) best = d;
    }
  }
  return best;
}

// =====================================================
//  TWORZENIE OBIEKTÓW
// =====================================================

// Dodaje budynek na planszę i zwraca go (rotation = obrót 0-3, potrzebny do rysowania)
function addBuilding(game, typeKey, owner, cells, rotation) {
  const building = {
    id: game.nextId++,
    kind: "building",
    type: typeKey,
    owner: owner,
    cells: cells,
    rotation: rotation || 0,
    // życie: kratki × życie za kratkę (np. mur ma 4 za kratkę, palisada tylko 1)
    hp: buildingMaxHp(game, owner, typeKey, cells.length),
    hasAttacked: false,       // wieże i zamek strzelają raz na turę
    underConstruction: false, // zamek w budowie (jeszcze nie strzela)
    debt: 0,                  // ile punktów budowy zamek zabierze na początku następnej tury
  };
  building.maxHp = building.hp;
  game.objects.push(building);
  return building;
}

// Dodaje jednostkę na planszę i zwraca ją.
// rotation = jak obrócona jest jednostka (0-3) - potrzebne, żeby dobrze ją narysować
function addUnit(game, typeKey, owner, cells, rotation) {
  const unit = {
    id: game.nextId++,
    kind: "unit",
    type: typeKey,
    owner: owner,
    cells: cells,
    rotation: rotation || 0,
    hp: unitMaxHp(game, owner, typeKey),
    maxHp: unitMaxHp(game, owner, typeKey),
    attacksUsed: 0,      // ile razy już atakowała w tej turze (kawaleria z Szarżą może 2 razy)
    hasAttacked: false,  // czy już atakowała w tej turze
    isNew: false,        // czy dopiero powstała (wtedy nie rusza się i nie atakuje)
    freeSteps: freeStepsFor(game, owner, typeKey),  // darmowe kroki w tej turze (dalsze kroki biorą punkty budowy)
  };
  game.objects.push(unit);
  return unit;
}

// =====================================================
//  START GRY
// =====================================================

// Miejsca startowe ratuszy (lewy górny róg ratusza 2×3).
// Kolejność: najpierw przeciwne rogi, potem pozostałe rogi, potem środki krawędzi.
// side = z której strony ratusza stoją chłopi (w stronę środka planszy)
function getStartSpots(cols, rows) {
  const margin = 2;                       // odstęp od brzegu planszy
  const left = margin;
  const right = cols - margin - 2;        // ratusz ma 2 kratki szerokości
  const top = margin;
  const bottom = rows - margin - 3;       // ratusz ma 3 kratki wysokości
  const middleX = Math.floor(cols / 2) - 1;
  const middleY = Math.floor((rows - 3) / 2);

  return [
    { x: left,    y: top,     side: "down" },  // lewy górny róg
    { x: right,   y: bottom,  side: "up" },    // prawy dolny róg
    { x: right,   y: top,     side: "down" },  // prawy górny róg
    { x: left,    y: bottom,  side: "up" },    // lewy dolny róg
    { x: middleX, y: top,     side: "down" },  // środek górnej krawędzi
    { x: middleX, y: bottom,  side: "up" },    // środek dolnej krawędzi
    { x: left,    y: middleY, side: "right" }, // środek lewej krawędzi
    { x: right,   y: middleY, side: "left" },  // środek prawej krawędzi
  ];
}

// Gdzie stoją 2 chłopi obok ratusza, który stoi na (x, y)
function getStartPeasantCells(spot) {
  const { x, y, side } = spot;
  if (side === "down")  return [{ x: x, y: y + 3 }, { x: x + 1, y: y + 3 }];
  if (side === "up")    return [{ x: x, y: y - 1 }, { x: x + 1, y: y - 1 }];
  if (side === "right") return [{ x: x + 2, y: y + 1 }, { x: x + 2, y: y + 2 }];
  return [{ x: x - 1, y: y + 1 }, { x: x - 1, y: y + 2 }]; // "left"
}

// Tworzy nową grę: gracze, plansza, ratusze i chłopi.
// playerCount = ilu graczy (2-8), sizeKey = "mala", "srednia" albo "duza",
// countryIndexes = który kraj (numer w COUNTRIES) ma każdy gracz - jeśli nie podano, to po kolei
function createGame(playerCount, sizeKey, countryIndexes) {
  const size = BOARD_SIZES[sizeKey];

  const game = {
    cols: size.cols,
    rows: size.rows,
    players: [],
    current: 0,           // numer gracza, który ma teraz turę
    turn: 1,              // numer tury
    objects: [],          // wszystkie budynki i jednostki na planszy
    nextId: 1,            // każdy obiekt dostaje swój numer
    buildPoints: BUILD_POINTS,
    barracksBonus: BARRACKS_BONUS,
    squads: [],           // oddziały zrobione ramką w tej turze: [{ unitIds: [...] }]
    winner: null,         // numer zwycięzcy albo null
  };

  const spots = getStartSpots(size.cols, size.rows);

  // Kraj każdego gracza (domyślnie po kolei z listy)
  const chosen = [];
  for (let i = 0; i < playerCount; i++) {
    chosen.push(countryIndexes ? countryIndexes[i] : i);
  }

  for (let i = 0; i < playerCount; i++) {
    const country = COUNTRIES[chosen[i]];
    // Czy ten kraj ma też ktoś inny? Wtedy dopisujemy numer gracza, żeby było wiadomo, kto jest kim
    const repeated = chosen.filter(index => index === chosen[i]).length > 1;
    game.players.push({
      id: i,
      country: country.key,
      colorName: repeated ? country.name + " " + (i + 1) : country.name,
      color: country.color,
      showNumber: repeated,  // rysować cyfrę z numerem gracza na jego budynkach i jednostkach
      era: 1,
      alive: true,
      upgraded: {},   // kupione ulepszenia, np. { wlocznik: true } = włócznicy są już pikinierami
      research: {},   // zbadane w uniwersytecie, np. { proch: true }
    });

    // Ratusz w miejscu startowym
    const spot = spots[i];
    addBuilding(game, "ratusz", i, shapeCells(BUILDING_TYPES.ratusz.shape, spot.x, spot.y, 0));

    // 2 chłopów obok ratusza
    for (const cell of getStartPeasantCells(spot)) {
      addUnit(game, "chlop", i, [cell]);
    }
  }

  return game;
}

// =====================================================
//  BUDOWANIE I REKRUTACJA
//  Funkcje "canXxx" zwracają { ok: true/false, reason: "dlaczego nie" }
// =====================================================

// Sprawdza, czy wszystkie kratki są na planszy i są wolne
function checkCellsFree(game, cells) {
  for (const cell of cells) {
    if (!isInsideBoard(game, cell.x, cell.y)) return { ok: false, reason: "Wychodzi poza planszę." };
    if (getObjectAt(game, cell.x, cell.y)) return { ok: false, reason: "To miejsce jest zajęte." };
  }
  return { ok: true, reason: "" };
}

// Ile punktów budowy gracz może wydać na dany budynek
// (bonusowy punkt działa tylko przy koszarach)
function availablePointsFor(game, buildingKey) {
  if (buildingKey === "koszary") return game.buildPoints + game.barracksBonus;
  return game.buildPoints;
}

// Czy aktualny gracz może postawić budynek typu buildingKey na tych kratkach?
function canPlaceBuilding(game, buildingKey, cells) {
  const type = BUILDING_TYPES[buildingKey];
  if (!type.canBuild) return { ok: false, reason: type.name + " nie da się zbudować." };
  if (type.era > game.players[game.current].era) {
    return { ok: false, reason: type.name + " będzie dostępna w erze " + type.era + " (" + ERA_NAMES[type.era] + ")." };
  }

  const free = checkCellsFree(game, cells);
  if (!free.ok) return free;

  // Budynek musi dotykać (bokiem albo rogiem) chłopa aktualnego gracza...
  const touchesPeasant = game.objects.some(obj =>
    obj.owner === game.current && obj.kind === "unit" && UNIT_TYPES[obj.type].builder && distance(obj.cells, cells) === 1
  );
  // ...ALBO, jeśli to palisada/mur, może dotykać twojej palisady/muru - bokiem albo po skosie (przedłużanie)
  const extendsWall = type.wall === true && game.objects.some(obj =>
    obj.owner === game.current && obj.kind === "building" && BUILDING_TYPES[obj.type].wall && distance(obj.cells, cells) === 1
  );
  if (!touchesPeasant && !extendsWall) {
    if (type.wall) return { ok: false, reason: type.name + " musi dotykać chłopa albo twojego muru." };
    return { ok: false, reason: "Budynek musi dotykać twojego chłopa." };
  }

  const cost = cells.length;
  const available = availablePointsFor(game, buildingKey);

  // Zamek buduje się 2 tury: teraz płacisz, ile masz, a resztę (najwyżej 8) zabierze następna tura
  if (type.buildTurns) {
    const unfinished = game.objects.some(obj => obj.owner === game.current && obj.underConstruction);
    if (unfinished) return { ok: false, reason: "Najpierw dokończ budowę zamku." };
    if (available < 1) return { ok: false, reason: "Za mało punktów: potrzeba choć 1." };
    if (cost - available > BUILD_POINTS) return { ok: false, reason: "Za mało punktów: nawet w 2 tury się nie uda." };
    return { ok: true, reason: "" };
  }

  if (cost > available) return { ok: false, reason: "Za mało punktów: potrzeba " + cost + ", masz " + available + "." };

  return { ok: true, reason: "" };
}

// Stawia budynek (najpierw sprawdza, czy wolno). Zwraca { ok, reason }.
function placeBuilding(game, buildingKey, cells, rotation) {
  const check = canPlaceBuilding(game, buildingKey, cells);
  if (!check.ok) return check;

  let cost = cells.length;
  // Przy koszarach najpierw zużywamy bonusowy punkt
  if (buildingKey === "koszary") {
    const fromBonus = Math.min(game.barracksBonus, cost);
    game.barracksBonus -= fromBonus;
    cost -= fromBonus;
  }
  // Zamek: płacimy, ile się da, a resztę zapisujemy jako "dług" na następną turę
  const paid = Math.min(cost, game.buildPoints);
  game.buildPoints -= paid;
  const building = addBuilding(game, buildingKey, game.current, cells, rotation);
  building.debt = cost - paid;
  building.underConstruction = building.debt > 0;
  return check;
}

// Ile punktów budowy kosztuje jednostka: liczba jej kratek MINUS "małe części"
// (np. włócznik zajmuje 2 kratki, ale daszek jest darmowy, więc kosztuje 1)
function unitCost(unitKey) {
  const type = UNIT_TYPES[unitKey];
  const freeParts = type.free ? type.free.length : 0;
  return type.shape.length - freeParts;
}

// Czy kraj gracza jest na liście "countries"? Brak listy = każdy kraj może.
function countryAllowed(game, owner, countries) {
  if (!countries) return true;
  return countries.includes(game.players[owner].country);
}

// Grupa jednostki przy badaniach i bonusach: "koszary", "strzelnica", "stajnia"...
// Jednostki z zamku mają własną "group" (np. słonie liczą się jak strzelnica).
function unitGroup(unitKey) {
  const type = UNIT_TYPES[unitKey];
  return type.group || type.building;
}

// Czy gracz może już robić tę jednostkę? Tak, jeśli jest z jego ery albo wcześniejszej
// (i - przy jednostkach specjalnych - z jego kraju).
function isUnitAvailable(game, unitKey, owner) {
  const type = UNIT_TYPES[unitKey];
  const player = game.players[owner];
  if (!countryAllowed(game, owner, type.countries)) return false;
  if (type.era > player.era) return false;
  if (type.needsResearch && !player.research[type.needsResearch]) return false;  // np. bombarda po Prochu
  return isCurrentTier(game, owner, unitKey);
}

// Jakie jednostki może teraz zrobić ten budynek (budynek w budowie - jeszcze żadnych)
function getRecruitOptions(game, building) {
  if (building.underConstruction) return [];
  return Object.keys(UNIT_TYPES).filter(key =>
    UNIT_TYPES[key].building === building.type && isUnitAvailable(game, key, building.owner)
  );
}

// Czy aktualny gracz może zrobić jednostkę unitKey w budynku building na tych kratkach?
function canPlaceUnit(game, unitKey, building, cells) {
  const type = UNIT_TYPES[unitKey];
  if (building.owner !== game.current) return { ok: false, reason: "To nie twój budynek." };
  if (building.underConstruction) return { ok: false, reason: BUILDING_TYPES[building.type].name + " jest jeszcze w budowie." };
  if (type.building !== building.type) return { ok: false, reason: BUILDING_TYPES[building.type].name + " nie robi tej jednostki." };
  if (type.era > game.players[game.current].era) return { ok: false, reason: type.name + " będzie dostępny w erze " + type.era + "." };
  if (!isUnitAvailable(game, unitKey, game.current)) return { ok: false, reason: "Tej jednostki nie możesz teraz robić (ulepszenie albo badanie)." };

  const free = checkCellsFree(game, cells);
  if (!free.ok) return free;

  // Nowa jednostka pojawia się obok budynku, który ją zrobił,
  // albo obok twojej jednostki, która tego budynku dotyka (tylko o jedną jednostkę dalej)
  const nextToBuilding = distance(building.cells, cells) === 1;
  const nextToHelper = game.objects.some(obj =>
    obj.kind === "unit" && obj.owner === game.current &&
    distance(building.cells, obj.cells) === 1 && distance(obj.cells, cells) === 1
  );
  if (!nextToBuilding && !nextToHelper) {
    return { ok: false, reason: "Jednostka musi stać obok budynku albo obok twojej jednostki przy budynku." };
  }

  const cost = unitCost(unitKey);
  if (building.type === "zamek") {
    // Jednostki z zamku można robić "na dług" (jak sam zamek): resztę zabierze następna tura
    if (cost - game.buildPoints > BUILD_POINTS) return { ok: false, reason: "Za mało punktów: nawet w 2 tury się nie uda." };
  } else if (cost > game.buildPoints) {
    return { ok: false, reason: "Za mało punktów: potrzeba " + cost + ", masz " + game.buildPoints + "." };
  }

  return { ok: true, reason: "" };
}

// Robi jednostkę (najpierw sprawdza, czy wolno). Zwraca { ok, reason }.
// rotation = obrót, z jakim gracz postawił jednostkę (zapamiętujemy go do rysowania)
function placeUnit(game, unitKey, building, cells, rotation) {
  const check = canPlaceUnit(game, unitKey, building, cells);
  if (!check.ok) return check;

  // Płacimy, ile mamy; brakująca reszta (tylko jednostki z zamku) to dług na następną turę
  const cost = unitCost(unitKey);
  const paid = Math.min(cost, game.buildPoints);
  game.buildPoints -= paid;
  const unit = addUnit(game, unitKey, game.current, cells, rotation);
  unit.isNew = true; // w tej turze jeszcze się nie rusza i nie atakuje
  if (cost > paid) unit.debt = cost - paid;
  return check;
}

// =====================================================
//  TAJNE KODY (tylko EDYTOR - pilnuje tego chat.js)
// =====================================================

// Czy ten tekst to tajny kod? Zwraca klucz jednostki (np. "jez") albo null.
// Wielkość liter ma znaczenie ("iamnottusk" to NIE kod), spacje na brzegach - nie.
// hasOwnProperty = tylko kody z NASZEJ listy (bez ukrytych pól, które ma każdy obiekt,
// np. "constructor" - inaczej to też "byłby" kod)
function cheatCodeUnit(text) {
  const code = String(text).trim();
  if (!Object.prototype.hasOwnProperty.call(CHEAT_CODES, code)) return null;
  return CHEAT_CODES[code];
}

// Gracz, który ma turę, wpisał kod. Zwraca { ok, reason, unit }:
//  - to nie kod             -> ok: false, reason: ""  (to po prostu wiadomość czatu)
//  - kod, ale nie wolno     -> ok: false, reason: dlaczego
//  - udało się              -> ok: true, unit: nowa jednostka
function useCheatCode(game, text) {
  const unitKey = cheatCodeUnit(text);
  if (!unitKey) return { ok: false, reason: "", unit: null };
  if (game.codeUsedThisTurn) return { ok: false, reason: "Kod już użyty w tej turze.", unit: null };

  const townHall = game.objects.find(obj =>
    obj.kind === "building" && obj.type === "ratusz" && obj.owner === game.current
  );
  if (!townHall) return { ok: false, reason: "Nie masz ratusza.", unit: null };

  const spot = findSpotNear(game, UNIT_TYPES[unitKey].shape, townHall.cells);
  if (!spot) return { ok: false, reason: "Brak miejsca obok ratusza.", unit: null };

  // Jednostka za darmo, ale jak każda nowa - działa od następnej tury
  const unit = addUnit(game, unitKey, game.current, spot.cells, spot.rotation);
  unit.isNew = true;
  game.codeUsedThisTurn = true;
  return { ok: true, reason: "", unit: unit };
}

// Szuka wolnego miejsca na kształt jak najbliżej podanych kratek (np. ratusza).
// Sprawdza całą planszę: najpierw bez obrotu, potem obrócony o 90°.
// Przy remisie wygrywa miejsce, którego środek jest najbliżej środka celu
// (żeby jeż nie wciskał się w róg, tylko stał "przy drzwiach").
// Zwraca { cells, rotation } albo null.
function findSpotNear(game, shape, targetCells) {
  const target = cellsCenter(targetCells);
  let best = null;
  let bestDistance = Infinity;
  let bestCenter = Infinity;
  for (const rotation of [0, 1]) {
    for (let y = 0; y < game.rows; y++) {
      for (let x = 0; x < game.cols; x++) {
        const cells = shapeCells(shape, x, y, rotation);
        if (!checkCellsFree(game, cells).ok) continue;
        const d = distance(targetCells, cells);
        const center = cellsCenter(cells);
        const centerD = (center.x - target.x) ** 2 + (center.y - target.y) ** 2;
        if (d < bestDistance || (d === bestDistance && centerD < bestCenter)) {
          best = { cells: cells, rotation: rotation };
          bestDistance = d;
          bestCenter = centerD;
        }
      }
    }
  }
  return best;
}

// Środek grupy kratek (średnia x i y)
function cellsCenter(cells) {
  const x = cells.reduce((sum, c) => sum + c.x, 0) / cells.length;
  const y = cells.reduce((sum, c) => sum + c.y, 0) / cells.length;
  return { x: x, y: y };
}

// =====================================================
//  TURY
// =====================================================

// Kończy turę: następny gracz, który jeszcze jest w grze, dostaje świeże punkty
function endTurn(game) {
  let next = game.current;
  // Szukamy następnego żywego gracza (pętla "w kółko" po liście graczy)
  for (let i = 0; i < game.players.length; i++) {
    next = (next + 1) % game.players.length;
    if (next === 0) game.turn++;   // wszyscy już zagrali - zaczyna się nowa tura
    if (game.players[next].alive) break;
  }
  game.current = next;

  game.buildPoints = BUILD_POINTS;
  game.barracksBonus = BARRACKS_BONUS;
  game.squads = [];   // oddziały z ramki trzymają się tylko do końca tury
  game.codeUsedThisTurn = false;   // nowy gracz może znowu użyć tajnego kodu (EDYTOR)

  // Jednostki gracza, który zaczyna turę, są już gotowe do działania
  for (const obj of game.objects) {
    if (obj.kind === "unit" && obj.owner === next) {
      obj.isNew = false;
      obj.hasAttacked = false;
      obj.attacksUsed = 0;
      obj.freeSteps = freeStepsFor(game, next, obj.type);  // świeże darmowe kroki
      // Jednostka z zamku zrobiona na dług zabiera brakujące punkty z nowej tury
      if (obj.debt) {
        const pay = Math.min(obj.debt, game.buildPoints);
        game.buildPoints -= pay;
        obj.debt -= pay;
      }
    }
  }

  // Budowle gracza: wieże i zamek znowu mogą strzelać, a zamek w budowie zabiera
  // swoje brakujące punkty z nowej tury i jest gotowy
  for (const obj of game.objects) {
    if (obj.kind !== "building" || obj.owner !== next) continue;
    obj.hasAttacked = false;
    obj.attacksUsed = 0;
    if (obj.underConstruction) {
      const pay = Math.min(obj.debt, game.buildPoints);
      game.buildPoints -= pay;
      obj.debt -= pay;
      if (obj.debt === 0) obj.underConstruction = false;
    }
  }
  // Ulepszone jednostki, które czekały na miejsce, próbują urosnąć
  tryGrowAll(game, next);
}

// =====================================================
//  RUCH ODDZIAŁÓW
//  Każda jednostka chodzi sama. Oddział robi się ramką myszki: zaznaczone
//  jednostki, które się stykają (bokiem albo rogiem), ruszają się razem jak
//  jeden klocek - ale tylko do końca tury.
//  Każda jednostka ma swoje darmowe kroki (freeSteps). Dalsze kroki biorą
//  po 1 punkcie ze wspólnych punktów budowy.
// =====================================================

// Dzieli listę jednostek na grupy, które się stykają.
// Zwraca listę grup, a każda grupa to lista numerów (id) jednostek.
function groupTouching(units) {
  const visited = new Set();
  const squads = [];

  for (const start of units) {
    if (visited.has(start.id)) continue;

    // Zbieramy wszystkie jednostki połączone z "start" - jak rozlewanie wody:
    // bierzemy jednostkę z kolejki i dokładamy do kolejki każdą, która jej dotyka
    const squad = [];
    const queue = [start];
    visited.add(start.id);
    while (queue.length > 0) {
      const unit = queue.shift();
      squad.push(unit.id);
      for (const other of units) {
        if (!visited.has(other.id) && distance(unit.cells, other.cells) === 1) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }
    squads.push(squad);
  }
  return squads;
}

// Robi oddziały z zaznaczonych jednostek (ramka myszki).
// Liczą się tylko jednostki aktualnego gracza, które nie są nowe.
// Zaznaczone jednostki wychodzą ze swoich starych oddziałów.
// Grupy, które się stykają, stają się oddziałami; samotna jednostka chodzi sama.
// Zwraca listę grup (list numerów jednostek) - też tych jednoosobowych.
function formSquads(game, unitIds) {
  const units = game.objects.filter(obj =>
    obj.kind === "unit" && obj.owner === game.current && !obj.isNew && unitIds.includes(obj.id)
  );
  const ids = units.map(unit => unit.id);

  // Wyjmujemy zaznaczone jednostki ze starych oddziałów (puste i jednoosobowe usuwamy)
  for (const squad of game.squads) {
    squad.unitIds = squad.unitIds.filter(id => !ids.includes(id));
  }
  game.squads = game.squads.filter(squad => squad.unitIds.length >= 2);

  const groups = groupTouching(units);
  for (const group of groups) {
    if (group.length >= 2) game.squads.push({ unitIds: group });
  }
  return groups;
}

// Zwraca oddział, do którego należy jednostka: { unitIds, points }.
// Jednostka bez oddziału z ramki to "oddział" jednoosobowy.
// points = darmowe kroki najsłabszej jednostki + wspólne punkty budowy.
// Zwraca null, gdy jednostka nie może się ruszać (np. jest nowa albo nie jest nasza).
function getSquadOfUnit(game, unit) {
  if (unit.owner !== game.current || unit.isNew) return null;

  let ids = [unit.id];
  const squad = game.squads.find(s => s.unitIds.includes(unit.id));
  if (squad) {
    // Żywi członkowie oddziału - i tylko ci, którzy dalej stykają się z tą jednostką
    // (np. gdy ktoś ze środka oddziału zginął)
    const members = game.objects.filter(obj => squad.unitIds.includes(obj.id));
    ids = groupTouching(members).find(group => group.includes(unit.id));
  }

  const members = game.objects.filter(obj => ids.includes(obj.id));
  const minFree = Math.min(...members.map(member => member.freeSteps));
  return { unitIds: ids, points: minFree + game.buildPoints, minFree: minFree };
}

// Wszystkie kratki wszystkich jednostek oddziału
function getSquadCells(game, squad) {
  const cells = [];
  for (const obj of game.objects) {
    if (squad.unitIds.includes(obj.id)) cells.push(...obj.cells);
  }
  return cells;
}

// Czy oddział zmieści się po przesunięciu o (dx, dy)?
// Każda kratka musi być na planszy i być wolna albo zajęta przez ten sam oddział.
function squadFitsAt(game, squad, squadCells, dx, dy) {
  for (const cell of squadCells) {
    const x = cell.x + dx;
    const y = cell.y + dy;
    if (!isInsideBoard(game, x, y)) return false;
    const obj = getObjectAt(game, x, y);
    if (!obj || squad.unitIds.includes(obj.id)) continue;
    // Przez SWOJĄ bramę można przejść (i w niej stanąć)
    const ownGate = obj.kind === "building" && BUILDING_TYPES[obj.type].gate && obj.owner === game.current;
    if (!ownGate) return false;
  }
  return true;
}

// Czy na kratce (x, y) stoi palisada albo mur?
function isWallAt(game, x, y) {
  const obj = getObjectAt(game, x, y);
  return obj !== null && obj.kind === "building" && BUILDING_TYPES[obj.type].wall === true;
}

// Czy krok po skosie (stepX, stepY) przecina ukośny mur?
// Dla każdej kratki oddziału sprawdzamy dwie kratki "na rogu" kroku:
//   [mur][ do ]
//   [ z ][mur]   <- jeśli OBIE są murem, to szpara jest zamknięta i nie da się przejść
function crossesDiagonalWall(game, squadCells, dx, dy, stepX, stepY) {
  for (const cell of squadCells) {
    const fromX = cell.x + dx;
    const fromY = cell.y + dy;
    if (isWallAt(game, fromX + stepX, fromY) && isWallAt(game, fromX, fromY + stepY)) return true;
  }
  return false;
}

// Szuka wszystkich przesunięć (dx, dy), na które oddział może dojść.
// Zwraca Map: "dx,dy" -> ile punktów kosztuje dojście.
// Każdy krok (też po skosie) kosztuje 1 punkt. Oddział idzie krok po kroku,
// więc omija przeszkody - jak woda, która rozlewa się dookoła kamieni.
function getReachableMoves(game, squad) {
  const squadCells = getSquadCells(game, squad);
  const costs = new Map();
  costs.set("0,0", 0);
  const queue = [{ dx: 0, dy: 0 }];

  // 8 kierunków: góra, dół, lewo, prawo i 4 skosy
  const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

  while (queue.length > 0) {
    const current = queue.shift();
    const cost = costs.get(current.dx + "," + current.dy);
    if (cost >= squad.points) continue; // brak punktów na kolejny krok

    for (const [stepX, stepY] of directions) {
      const dx = current.dx + stepX;
      const dy = current.dy + stepY;
      const key = dx + "," + dy;
      if (costs.has(key)) continue; // tu już byliśmy (i to taniej)
      if (!squadFitsAt(game, squad, squadCells, dx, dy)) continue;
      // Krok po skosie nie może "przecisnąć się" przez ukośny mur
      if (stepX !== 0 && stepY !== 0 && crossesDiagonalWall(game, squadCells, current.dx, current.dy, stepX, stepY)) continue;
      costs.set(key, cost + 1);
      queue.push({ dx: dx, dy: dy });
    }
  }

  costs.delete("0,0"); // stanie w miejscu to nie ruch
  return costs;
}

// Przesuwa cały oddział, do którego należy jednostka "unit", o (dx, dy).
// Po ruchu dalej można budować. Zwraca { ok, reason }.
function moveSquad(game, unit, dx, dy) {
  if (unit.owner !== game.current) return { ok: false, reason: "To nie twoja jednostka." };
  if (unit.isNew) return { ok: false, reason: "Nowa jednostka ruszy się w następnej turze." };

  const squad = getSquadOfUnit(game, unit);
  if (!squad) return { ok: false, reason: "Ta jednostka nie może się ruszyć." };
  const cost = getReachableMoves(game, squad).get(dx + "," + dy);
  if (cost === undefined) return { ok: false, reason: "Oddział nie dojdzie w to miejsce." };

  // Płacimy za ruch: najpierw darmowe kroki najsłabszej jednostki,
  // a za resztę po 1 punkcie budowy na krok (za cały oddział razem)
  game.buildPoints -= Math.max(0, cost - squad.minFree);

  // Przesuwamy każdą kratkę każdej jednostki oddziału i odejmujemy jej przebytą drogę
  for (const obj of game.objects) {
    if (squad.unitIds.includes(obj.id)) {
      obj.cells = obj.cells.map(c => ({ x: c.x + dx, y: c.y + dy }));
      obj.freeSteps -= Math.min(cost, obj.freeSteps);
    }
  }
  tryGrowAll(game, game.current);  // może teraz jest miejsce, żeby ulepszona jednostka urosła
  return { ok: true, reason: "" };
}

// =====================================================
//  WALKA
// =====================================================

// Dane typu obiektu: jednostki są w UNIT_TYPES, budowle w BUILDING_TYPES
function typeOf(obj) {
  return obj.kind === "unit" ? UNIT_TYPES[obj.type] : BUILDING_TYPES[obj.type];
}

// Czy ten obiekt w ogóle umie strzelać/walczyć? (jednostka z atakiem albo gotowa wieża/zamek)
function canFight(obj) {
  const type = typeOf(obj);
  if (!type.attack || type.attack <= 0 || !type.range) return false;
  if (obj.kind === "building" && obj.underConstruction) return false;
  return true;
}

// Lista wrogich obiektów (jednostek i budynków), które ten obiekt może teraz zaatakować.
// Atakować może jednostka albo budowla (wieża, zamek).
// Pusta, gdy nie umie walczyć, już atakowała w tej turze albo dopiero powstała.
function getAttackTargets(game, attacker) {
  if (attacker.owner !== game.current) return [];
  if (attacker.isNew || attacker.hasAttacked) return [];
  if (!canFight(attacker)) return [];

  const type = typeOf(attacker);
  return game.objects.filter(obj =>
    obj.owner !== attacker.owner && distance(attacker.cells, obj.cells) <= type.range &&
    !tooCloseForBuilding(game, attacker, obj) &&
    !(type.onlyVsUnits && obj.kind !== "unit")   // kot z AK-47 nie strzela w budynki
  );
}

// Wieże i zamek NIE strzelają do wroga tuż obok (odległość 1) - chyba że gracz zbadał Mordownię
function tooCloseForBuilding(game, attacker, target) {
  if (attacker.kind !== "building") return false;
  if (game.players[attacker.owner].research.mordownia) return false;
  return distance(attacker.cells, target.cells) === 1;
}

// Ile razy w turze może atakować ten obiekt: kawaleria z Szarżą - 2 razy,
// jednostki z attacksPerTurn (np. jeż) - tyle, ile tam wpisano, reszta - raz
function maxAttacks(game, obj) {
  if (obj.kind !== "unit") return 1;
  const type = UNIT_TYPES[obj.type];
  if (type.attacksPerTurn) return type.attacksPerTurn;
  if (type.cavalry && game.players[obj.owner].research.szarza) return 2;
  return 1;
}

// Ile obrażeń zada atakujący celowi (z bonusami)
function getDamage(game, attacker, target) {
  const type = typeOf(attacker);
  let damage = type.attack;
  // bonus przeciw kawalerii (włócznicy)
  const targetIsCavalry = target.kind === "unit" && UNIT_TYPES[target.type].cavalry;
  if (targetIsCavalry && type.bonusVsCavalry) damage += type.bonusVsCavalry;
  // bonus przeciw budynkom (bombarda)
  if (target.kind === "building" && type.bonusVsBuildings) damage += type.bonusVsBuildings;
  // Płonący grot: jednostki ze strzelnicy +2
  const fromRange = attacker.kind === "unit" && unitGroup(attacker.type) === "strzelnica";
  if (fromRange && game.players[attacker.owner].research.plonacyGrot) damage += 2;
  return damage;
}

// Czy jednostka albo budowla może zaatakować ten cel? Zwraca { ok, reason }
function canAttack(game, attacker, target) {
  const type = typeOf(attacker);
  if (attacker.owner !== game.current) return { ok: false, reason: "To nie twoja jednostka." };
  if (target.owner === attacker.owner) return { ok: false, reason: "Nie można atakować swoich." };
  if (attacker.kind === "building" && attacker.underConstruction) return { ok: false, reason: type.name + " jest jeszcze w budowie." };
  if (!canFight(attacker)) return { ok: false, reason: type.name + " nie umie walczyć." };
  if (attacker.isNew) return { ok: false, reason: "Nowa jednostka zaatakuje w następnej turze." };
  if (attacker.hasAttacked) return { ok: false, reason: "Ta jednostka już atakowała w tej turze." };
  if (type.onlyVsUnits && target.kind !== "unit") return { ok: false, reason: type.name + " atakuje tylko jednostki." };
  if (distance(attacker.cells, target.cells) > type.range) return { ok: false, reason: "Cel jest za daleko." };
  if (tooCloseForBuilding(game, attacker, target)) return { ok: false, reason: "Wróg jest za blisko - potrzebna Mordownia." };
  return { ok: true, reason: "" };
}

// Atak! Zwraca { ok, reason, damage, destroyed }
function attack(game, attacker, target) {
  const check = canAttack(game, attacker, target);
  if (!check.ok) return check;

  const damage = getDamage(game, attacker, target);
  target.hp -= damage;
  attacker.attacksUsed = (attacker.attacksUsed || 0) + 1;
  attacker.hasAttacked = attacker.attacksUsed >= maxAttacks(game, attacker);

  // Życie spadło do zera - obiekt znika z planszy
  const destroyed = target.hp <= 0;
  if (destroyed) {
    game.objects = game.objects.filter(obj => obj.id !== target.id);
  }

  updateEliminations(game);
  return { ok: true, reason: "", damage: damage, destroyed: destroyed };
}

// Sprawdza, kto odpadł (nie ma już żadnej jednostki) i czy ktoś wygrał.
// Budynki gracza, który odpadł, zostają na planszy - można je dalej niszczyć.
function updateEliminations(game) {
  for (const player of game.players) {
    if (!player.alive) continue;
    const hasUnits = game.objects.some(obj => obj.kind === "unit" && obj.owner === player.id);
    if (!hasUnits) player.alive = false;
  }

  // Został tylko jeden gracz? To on wygrywa!
  const alivePlayers = game.players.filter(p => p.alive);
  if (alivePlayers.length === 1) game.winner = alivePlayers[0].id;
}

// =====================================================
//  ERY
//  1 - era mroku, 2 - era feudalna, 3 - era zamków, 4 - era imperiów
// =====================================================

// Jakie budynki trzeba mieć, żeby wyjść z obecnej ery gracza?
// Wszystkie budynki z tej ery, które da się zbudować (np. w erze 1: koszary).
// Gdy dodamy nowe budynki (mury, wieże...), same wejdą do wymagań swojej ery.
function getEraRequirements(game, owner) {
  const era = game.players[owner].era;
  return Object.keys(BUILDING_TYPES).filter(key =>
    BUILDING_TYPES[key].era === era && BUILDING_TYPES[key].canBuild
  );
}

// Czy gracz, który ma turę, może przejść do następnej ery?
// Zwraca { ok, reason, missing } - missing = lista brakujących budynków
function canAdvanceEra(game) {
  const player = game.players[game.current];
  if (player.era >= MAX_ERA) return { ok: false, reason: "To już ostatnia era.", missing: [] };

  // Sprawdzamy każdy wymagany budynek: czy gracz ma co najmniej jeden taki?
  const missing = getEraRequirements(game, game.current).filter(key =>
    !game.objects.some(obj => obj.kind === "building" && obj.type === key && obj.owner === game.current && !obj.underConstruction)
  );
  if (missing.length > 0) {
    const names = missing.map(key => BUILDING_TYPES[key].name).join(", ");
    return { ok: false, reason: "Do następnej ery brakuje: " + names + ".", missing: missing };
  }
  return { ok: true, reason: "", missing: [] };
}

// Przejście do następnej ery. Potem w tej turze nie można nic robić, więc tura się kończy.
// Zwraca { ok, reason, era } - era = nowa era gracza
function advanceEra(game) {
  const check = canAdvanceEra(game);
  if (!check.ok) return check;

  const player = game.players[game.current];
  player.era++;
  endTurn(game);
  return { ok: true, reason: "", era: player.era };
}

// =====================================================
//  ŻYCIE I RUCH Z BADANIAMI
// =====================================================

// Maksymalne życie jednostki (Sparing: jednostki z koszar +3)
function unitMaxHp(game, owner, typeKey) {
  const type = UNIT_TYPES[typeKey];
  let hp = type.hp;
  if (unitGroup(typeKey) === "koszary" && game.players[owner].research.sparing) hp += 3;
  return hp;
}

// Maksymalne życie budowli (Wypalanie: +1 za każde pole)
function buildingMaxHp(game, owner, typeKey, cellCount) {
  let perCell = BUILDING_TYPES[typeKey].hpPerCell || BUILDING_HP_PER_CELL;
  if (game.players[owner].research.wypalanie) perCell += 1;
  return cellCount * perCell;
}

// Punkty ruchu każdego oddziału (Pancerz łuskowy: +2)
function movePointsFor(game, owner) {
  return MOVE_POINTS + (game.players[owner].research.pancerzLuskowy ? 2 : 0);
}

// Ruch "bez końca" (żaba z kodu): tyle kroków, że nigdy się nie skończą
const UNLIMITED_STEPS = 999;

// Darmowe kroki jednostki na początku tury
function freeStepsFor(game, owner, unitKey) {
  if (UNIT_TYPES[unitKey].unlimitedMove) return UNLIMITED_STEPS;
  return movePointsFor(game, owner);
}

// =====================================================
//  ULEPSZENIA JEDNOSTEK
//  np. "włócznik -> pikinier": wszyscy włócznicy gracza stają się pikinierami
// =====================================================

// Ulepszenie, które zaczyna się od tej jednostki (albo undefined)
function upgradeFrom(unitKey) {
  return UPGRADES.find(up => up.from === unitKey);
}

// Ulepszenie, które kończy się na tej jednostce (albo undefined)
function upgradeTo(unitKey) {
  return UPGRADES.find(up => up.to === unitKey);
}

// Czy to jest "aktualny stopień" jednostki u gracza?
// Np. pikinier jest aktualny dopiero po ulepszeniu włóczników i dopóki nie ulepszy się go w halabardnika.
function isCurrentTier(game, owner, unitKey) {
  const upgraded = game.players[owner].upgraded;
  const before = upgradeTo(unitKey);
  if (before && !upgraded[before.from]) return false;  // poprzedni stopień jeszcze nie ulepszony
  if (upgraded[unitKey]) return false;                  // ta jednostka jest już ulepszona dalej
  return true;
}

// Jakie ulepszenia można teraz kupić w tym budynku.
// Zwykle w budynku, który robi jednostkę; "where" mówi, gdy jest inaczej
// (np. jednostki z zamku ulepsza się w uniwersytecie). Liczy się też kraj gracza.
function getUpgradeOptions(game, building) {
  const player = game.players[building.owner];
  if (building.underConstruction) return [];
  return UPGRADES.filter(up =>
    (up.where || UNIT_TYPES[up.from].building) === building.type &&
    countryAllowed(game, building.owner, up.countries || UNIT_TYPES[up.from].countries) &&
    isCurrentTier(game, building.owner, up.from) &&
    UNIT_TYPES[up.to].era <= player.era
  );
}

// Czy gracz, który ma turę, może kupić ulepszenie "fromKey" w tym budynku?
function canBuyUpgrade(game, building, fromKey) {
  if (building.owner !== game.current) return { ok: false, reason: "To nie twój budynek." };
  if (!getUpgradeOptions(game, building).some(up => up.from === fromKey)) return { ok: false, reason: "Tego ulepszenia nie można tu kupić." };
  if (game.buildPoints < UPGRADE_COST) return { ok: false, reason: "Za mało punktów: potrzeba " + UPGRADE_COST + ", masz " + game.buildPoints + "." };
  return { ok: true, reason: "" };
}

// Kupuje ulepszenie: wszystkie jednostki "from" stają się "to", leczą się do pełna i (jeśli trzeba) rosną
function buyUpgrade(game, building, fromKey) {
  const check = canBuyUpgrade(game, building, fromKey);
  if (!check.ok) return check;

  const up = upgradeFrom(fromKey);
  game.buildPoints -= UPGRADE_COST;
  game.players[game.current].upgraded[fromKey] = true;

  for (const unit of game.objects) {
    if (unit.kind !== "unit" || unit.owner !== game.current || unit.type !== fromKey) continue;
    unit.type = up.to;
    unit.maxHp = unitMaxHp(game, unit.owner, up.to);
    unit.hp = unit.maxHp;  // ulepszenie leczy do pełna
    // Większy kształt? Zapamiętujemy stary kształt, dopóki jednostka nie urośnie
    if (UNIT_TYPES[up.to].shape.length !== UNIT_TYPES[fromKey].shape.length) {
      unit.shapeType = fromKey;
    }
  }
  tryGrowAll(game, game.current);
  return check;
}

// Obraca kształt BEZ przesuwania do (0, 0) - potrzebne, żeby porównać stary i nowy kształt
function rotateRaw(shape, rotation) {
  let cells = shape.map(([x, y]) => ({ x: x, y: y }));
  for (let i = 0; i < rotation; i++) cells = cells.map(c => ({ x: -c.y, y: c.x }));
  return cells;
}

// Próbuje "dorosnąć" jednostkę po ulepszeniu (np. piechur 1×2 -> piechur ulepszony 1×3).
// Nowe kratki muszą być wolne - jeśli nie są, jednostka czeka i spróbuje później.
function tryGrow(game, unit) {
  if (!unit.shapeType) return false;
  const up = upgradeFrom(unit.shapeType);
  const [shiftX, shiftY] = up.grow || [0, 0];
  const rotation = unit.rotation || 0;

  // Stary kształt przesunięty tak, jak leży w nowym kształcie - oba obracamy tak samo
  const oldShifted = UNIT_TYPES[unit.shapeType].shape.map(([x, y]) => [x + shiftX, y + shiftY]);
  const rawOld = rotateRaw(oldShifted, rotation);
  const rawNew = rotateRaw(UNIT_TYPES[unit.type].shape, rotation);

  // O ile przesunąć, żeby stary kształt trafił w kratki, na których jednostka naprawdę stoi
  const moveX = Math.min(...unit.cells.map(c => c.x)) - Math.min(...rawOld.map(c => c.x));
  const moveY = Math.min(...unit.cells.map(c => c.y)) - Math.min(...rawOld.map(c => c.y));
  const newCells = rawNew.map(c => ({ x: c.x + moveX, y: c.y + moveY }));

  // Nowe kratki (których jednostka jeszcze nie zajmuje) muszą być wolne
  const extra = newCells.filter(c => !unit.cells.some(o => o.x === c.x && o.y === c.y));
  for (const c of extra) {
    if (!isInsideBoard(game, c.x, c.y) || getObjectAt(game, c.x, c.y)) return false;
  }
  unit.cells = newCells;
  delete unit.shapeType;
  return true;
}

// Wszystkie czekające jednostki gracza próbują urosnąć
function tryGrowAll(game, owner) {
  for (const obj of game.objects) {
    if (obj.kind === "unit" && obj.owner === owner && obj.shapeType) tryGrow(game, obj);
  }
}

// =====================================================
//  BADANIA W UNIWERSYTECIE ("Zbadaj...")
// =====================================================

// Jakie badania można jeszcze zrobić w tym budynku (tylko uniwersytet)
function getResearchOptions(game, building) {
  if (building.type !== "uniwersytet") return [];
  const done = game.players[building.owner].research;
  return Object.keys(RESEARCH).filter(key => !done[key]);
}

function canBuyResearch(game, building, key) {
  if (building.owner !== game.current) return { ok: false, reason: "To nie twój budynek." };
  if (!getResearchOptions(game, building).includes(key)) return { ok: false, reason: "Tego nie można tu zbadać." };
  if (game.buildPoints < RESEARCH_COST) return { ok: false, reason: "Za mało punktów: potrzeba " + RESEARCH_COST + ", masz " + game.buildPoints + "." };
  return { ok: true, reason: "" };
}

// Bada coś w uniwersytecie. Badania, które dodają życie, od razu leczą do pełna.
function buyResearch(game, building, key) {
  const check = canBuyResearch(game, building, key);
  if (!check.ok) return check;

  game.buildPoints -= RESEARCH_COST;
  game.players[game.current].research[key] = true;

  for (const obj of game.objects) {
    if (obj.owner !== game.current) continue;
    // Pancerz łuskowy działa od razu: +2 darmowe kroki już w tej turze
    if (key === "pancerzLuskowy" && obj.kind === "unit") obj.freeSteps += 2;
    if (key === "sparing" && obj.kind === "unit" && unitGroup(obj.type) === "koszary") {
      obj.maxHp = unitMaxHp(game, obj.owner, obj.type);
      obj.hp = obj.maxHp;
    }
    if (key === "wypalanie" && obj.kind === "building") {
      obj.maxHp = buildingMaxHp(game, obj.owner, obj.type, obj.cells.length);
      obj.hp = obj.maxHp;
    }
  }
  return check;
}
