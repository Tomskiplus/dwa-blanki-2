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
function getObjectAt(game, x, y) {
  for (const obj of game.objects) {
    for (const cell of obj.cells) {
      if (cell.x === x && cell.y === y) return obj;
    }
  }
  return null;
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

// Dodaje budynek na planszę i zwraca go
function addBuilding(game, typeKey, owner, cells) {
  const building = {
    id: game.nextId++,
    kind: "building",
    type: typeKey,
    owner: owner,
    cells: cells,
    hp: cells.length * BUILDING_HP_PER_CELL,
  };
  building.maxHp = building.hp;
  game.objects.push(building);
  return building;
}

// Dodaje jednostkę na planszę i zwraca ją
function addUnit(game, typeKey, owner, cells) {
  const unit = {
    id: game.nextId++,
    kind: "unit",
    type: typeKey,
    owner: owner,
    cells: cells,
    hp: UNIT_TYPES[typeKey].hp,
    maxHp: UNIT_TYPES[typeKey].hp,
    hasAttacked: false,  // czy już atakowała w tej turze
    isNew: false,        // czy dopiero powstała (wtedy nie rusza się i nie atakuje)
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
// playerCount = ilu graczy (2-8), sizeKey = "mala", "srednia" albo "duza"
function createGame(playerCount, sizeKey) {
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
    phase: "build",       // "build" = budowanie, "move" = ruch
    squads: [],           // oddziały (liczone na początku ruchu)
    winner: null,         // numer zwycięzcy albo null
  };

  const spots = getStartSpots(size.cols, size.rows);

  for (let i = 0; i < playerCount; i++) {
    game.players.push({
      id: i,
      colorName: PLAYER_COLORS[i].name,
      color: PLAYER_COLORS[i].color,
      era: 1,
      alive: true,
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
