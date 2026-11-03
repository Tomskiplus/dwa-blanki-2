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
//  WYNIK
// =====================================================
console.log("");
console.log("Wynik: " + passed + " ✅, " + failed + " ❌");
if (failed > 0) process.exit(1);
