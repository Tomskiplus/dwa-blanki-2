// =====================================================
//  TESTY ZASAD GRY
//  Uruchom w terminalu:  node tests/run-tests.js
//  Każdy test sprawdza jedną zasadę. ✅ = działa, ❌ = coś zepsuliśmy.
// =====================================================

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Wczytujemy pliki gry tak, jakby przeglądarka wczytała je tagiem <script>
function loadGameFile(fileName) {
  const code = fs.readFileSync(path.join(__dirname, "..", fileName), "utf8");
  vm.runInThisContext(code, { filename: fileName });
}
loadGameFile("data.js");
loadGameFile("rules.js");

// --- Mini-tester ---
let passed = 0;
let failed = 0;

// Sprawdza jeden warunek i wypisuje wynik
function check(name, condition) {
  if (condition) {
    passed++;
    console.log("✅ " + name);
  } else {
    failed++;
    console.log("❌ " + name);
  }
}

// Pomocnicze: zwraca wszystkie obiekty danego gracza danego typu
function objectsOf(game, owner, type) {
  return game.objects.filter(o => o.owner === owner && o.type === type);
}

// =====================================================
//  ETAP 1: Start gry
// =====================================================

{
  const game = createGame(2, "mala");
  check("Gra dla 2 graczy ma 2 graczy", game.players.length === 2);
  check("Mała plansza ma 20×15 kratek", game.cols === 20 && game.rows === 15);
  check("Gracz 0 ma 1 ratusz", objectsOf(game, 0, "ratusz").length === 1);
  check("Gracz 0 ma 2 chłopów", objectsOf(game, 0, "chlop").length === 2);
  check("Ratusz ma 6 kratek (2×2 + dach)", objectsOf(game, 0, "ratusz")[0].cells.length === 6);
  check("Ratusz ma 12 życia (2 za kratkę)", objectsOf(game, 0, "ratusz")[0].hp === 12);
  check("Gra zaczyna się od gracza 0, tura 1", game.current === 0 && game.turn === 1);
  check("Na start jest 8 punktów budowy", game.buildPoints === 8);
}

{
  // Chłopi muszą stać tuż obok swojego ratusza
  const game = createGame(8, "srednia");
  let allNextToTownHall = true;
  for (let p = 0; p < 8; p++) {
    const townHall = objectsOf(game, p, "ratusz")[0];
    for (const peasant of objectsOf(game, p, "chlop")) {
      if (distance(peasant.cells, townHall.cells) !== 1) allNextToTownHall = false;
    }
  }
  check("Chłopi stoją tuż obok swojego ratusza", allNextToTownHall);
}

// Dla każdej liczby graczy i każdego rozmiaru: nic nie nachodzi na siebie i nic nie wychodzi poza planszę
for (const sizeKey of Object.keys(BOARD_SIZES)) {
  for (let count = MIN_PLAYERS; count <= MAX_PLAYERS; count++) {
    const game = createGame(count, sizeKey);
    const taken = new Set();
    let ok = true;
    for (const obj of game.objects) {
      for (const cell of obj.cells) {
        const key = cell.x + "," + cell.y;
        if (taken.has(key) || !isInsideBoard(game, cell.x, cell.y)) ok = false;
        taken.add(key);
      }
    }
    check(count + " graczy, plansza " + sizeKey + ": nic nie nachodzi i nie wychodzi poza planszę", ok);
  }
}

// =====================================================
//  Pomocnicze klocki
// =====================================================

{
  // Obrót: pionowy prostokąt 1×2 po obrocie staje się poziomy 2×1
  const cells = shapeCells([[0, 0], [0, 1]], 5, 5, 1);
  const xs = cells.map(c => c.x).sort();
  check("Obrót 1×2 daje kratki obok siebie w poziomie", cells.length === 2 && xs[0] === 5 && xs[1] === 6 && cells[0].y === 5);

  check("Odległość po skosie: (0,0) do (3,4) = 4", distance([{ x: 0, y: 0 }], [{ x: 3, y: 4 }]) === 4);
  check("Kratki stykające się rogiem mają odległość 1", distance([{ x: 0, y: 0 }], [{ x: 1, y: 1 }]) === 1);
}

// =====================================================
//  ETAP 2: Budowanie, rekrutacja i tury
//  Gracz 0 na małej planszy: ratusz (2,2)-(3,4), chłopi na (2,5) i (3,5)
// =====================================================

// Pomocnicze: kratki budynku typu "key" postawionego na (x, y)
function buildingCells(key, x, y, rotation) {
  return shapeCells(BUILDING_TYPES[key].shape, x, y, rotation || 0);
}

{
  const game = createGame(2, "mala");
  const result = placeBuilding(game, "koszary", buildingCells("koszary", 2, 6));
  check("Koszary (9 kratek) da się postawić za 8 punktów + bonus", result.ok);
  check("Po koszarach zostaje 0 punktów i 0 bonusu", game.buildPoints === 0 && game.barracksBonus === 0);
  check("Koszary mają 18 życia", objectsOf(game, 0, "koszary")[0].hp === 18);
}

{
  const game = createGame(2, "mala");
  const stable = placeBuilding(game, "stajnia", buildingCells("stajnia", 4, 5));
  check("Stajnię (6 kratek) da się postawić obok chłopa", stable.ok && game.buildPoints === 2);
  const barracks = placeBuilding(game, "koszary", buildingCells("koszary", 2, 9));
  check("Po stajni nie starczy punktów na koszary", !barracks.ok);
}

{
  // Strzelnica ma 5 kratek. Przy 4 punktach + bonusie NIE wolno (bonus jest tylko na koszary)
  const game = createGame(2, "mala");
  game.buildPoints = 4;
  check("Bonus koszar nie działa na inne budynki", !canPlaceBuilding(game, "strzelnica", buildingCells("strzelnica", 2, 6, 1)).ok);
  game.buildPoints = 5;
  check("Przy 5 punktach strzelnica już wchodzi", canPlaceBuilding(game, "strzelnica", buildingCells("strzelnica", 2, 6, 1)).ok);
}

{
  const game = createGame(2, "mala");
  check("Budynek daleko od chłopa - nie wolno", !canPlaceBuilding(game, "stajnia", buildingCells("stajnia", 10, 7)).ok);
  check("Budynek na chłopie - nie wolno", !canPlaceBuilding(game, "koszary", buildingCells("koszary", 2, 5)).ok);
  check("Budynek poza planszą - nie wolno", !canPlaceBuilding(game, "stajnia", buildingCells("stajnia", -1, 5)).ok);
  check("Drugiego ratusza nie da się zbudować", !canPlaceBuilding(game, "ratusz", buildingCells("ratusz", 4, 5)).ok);
  check("Budynek obok chłopa WROGA - nie wolno", !canPlaceBuilding(game, "stajnia", buildingCells("stajnia", 14, 7)).ok);

  // Obrócona strzelnica (litera L) też pasuje obok chłopa
  check("Obrócona strzelnica obok chłopa - wolno", canPlaceBuilding(game, "strzelnica", buildingCells("strzelnica", 2, 6, 1)).ok);
}

{
  const game = createGame(2, "mala");
  placeBuilding(game, "koszary", buildingCells("koszary", 2, 6));
  const barracks = objectsOf(game, 0, "koszary")[0];
  game.buildPoints = 20; // w teście dajemy sobie dużo punktów

  const options = getRecruitOptions(game, barracks);
  check("Koszary w erze 1 robią: piechur i włócznik", options.length === 2 && options.includes("piechur") && options.includes("wlocznik"));

  const soldier = placeUnit(game, "piechur", barracks, shapeCells(UNIT_TYPES.piechur.shape, 5, 6, 0));
  check("Piechur obok koszar - wolno", soldier.ok && game.buildPoints === 18);
  const newSoldier = objectsOf(game, 0, "piechur")[0];
  check("Nowy piechur jest oznaczony jako nowy", newSoldier.isNew === true);

  check("Piechur daleko od koszar - nie wolno", !canPlaceUnit(game, "piechur", barracks, shapeCells(UNIT_TYPES.piechur.shape, 10, 10, 0)).ok);
  check("Pikinier (era 2) w erze 1 - nie wolno", !canPlaceUnit(game, "pikinier", barracks, shapeCells(UNIT_TYPES.pikinier.shape, 6, 6, 0)).ok);
  check("Koszary nie robią łuczników", !canPlaceUnit(game, "lucznik", barracks, [{ x: 6, y: 6 }]).ok);

  const townHall = objectsOf(game, 0, "ratusz")[0];
  check("Ratusz robi chłopów", placeUnit(game, "chlop", townHall, [{ x: 4, y: 2 }]).ok);

  // Tury
  endTurn(game);
  check("Po końcu tury gra gracz 1", game.current === 1 && game.turn === 1);
  check("Nowy gracz ma 8 punktów i bonus", game.buildPoints === 8 && game.barracksBonus === 1);
  endTurn(game);
  check("Po turze gracza 1 znowu gracz 0 i tura 2", game.current === 0 && game.turn === 2);
  check("Na początku swojej tury piechur nie jest już nowy", newSoldier.isNew === false);
}

{
  // Gracz, który odpadł, jest pomijany
  const game = createGame(3, "mala");
  game.players[1].alive = false;
  endTurn(game);
  check("Gracz, który odpadł, jest pomijany w turach", game.current === 2);
}

// =====================================================
//  WYNIK
// =====================================================
console.log("");
console.log("Wynik: " + passed + " ✅, " + failed + " ❌");
if (failed > 0) process.exit(1);
