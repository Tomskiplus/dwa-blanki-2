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
  check("Koszary w erze 1 robią: piechur, włócznik i (tymczasowo) wojownik orłów",
    options.length === 3 && options.includes("piechur") && options.includes("wlocznik") && options.includes("wojownikOrlow"));

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
//  ETAP 3: Ruch oddziałów
//  Gracz 0 na małej planszy: ratusz (2,2)-(3,4), chłopi na (2,5) i (3,5)
// =====================================================

// Pomocnicze: pierwsza jednostka gracza 0 danego typu
function firstUnit(game, type) {
  return objectsOf(game, 0, type)[0];
}

{
  const game = createGame(2, "mala");
  const squads = findSquads(game, 0);
  check("Dwaj chłopi stojący obok siebie to 1 oddział", squads.length === 1 && squads[0].length === 2);

  // Jednostki stykające się tylko rogiem też tworzą oddział
  addUnit(game, "piechur", 0, [{ x: 4, y: 6 }, { x: 4, y: 7 }]);  // dotyka chłopa (3,5) rogiem
  check("Jednostka stykająca się rogiem dołącza do oddziału", findSquads(game, 0)[0].length === 3);

  addUnit(game, "lucznik", 0, [{ x: 10, y: 10 }]);  // daleko od reszty
  check("Jednostka daleko od innych to osobny oddział", findSquads(game, 0).length === 2);

  const newOne = addUnit(game, "lucznik", 0, [{ x: 12, y: 12 }]);
  newOne.isNew = true;
  check("Nowa jednostka nie należy do żadnego oddziału", findSquads(game, 0).length === 2);
  check("Nowa jednostka nie może się ruszyć", !moveSquad(game, newOne, 1, 0).ok);
}

{
  const game = createGame(2, "mala");
  game.buildPoints = 2;  // jakby gracz wydał 6 punktów na budowanie
  const peasant = firstUnit(game, "chlop");
  check("Pula ruchu = 5 + niewydane punkty budowy (2) = 7", getSquadOfUnit(game, peasant).points === 7);

  const moves = getReachableMoves(game, getSquadOfUnit(game, peasant));
  check("Krok po skosie kosztuje 1 punkt", moves.get("1,1") === 1);
  check("Oddział nie wejdzie na ratusz (krok w górę zablokowany)", !moves.has("0,-1"));
  check("Oddział dojdzie 7 pól w dół, ale nie 8", moves.has("0,7") && !moves.has("0,8"));

  check("Nieudany ruch NIE kończy budowania", !moveSquad(game, peasant, 0, 9).ok && game.phase === "build");

  const result = moveSquad(game, peasant, 0, 3);
  check("Ruch o 3 pola w dół się udaje", result.ok);
  check("Obaj chłopi przesunęli się razem", firstUnit(game, "chlop").cells[0].y === 8 && objectsOf(game, 0, "chlop")[1].cells[0].y === 8);
  check("Z puli zostały 4 punkty", getSquadOfUnit(game, peasant).points === 4);
  check("Po ruchu nie można już budować", game.phase === "move" && !canPlaceBuilding(game, "stajnia", buildingCells("stajnia", 2, 9)).ok);
}

{
  // Jednostka zamknięta w rogu planszy nie ma dokąd iść
  const game = createGame(2, "mala");
  const trapped = addUnit(game, "lucznik", 0, [{ x: 0, y: 0 }]);
  addUnit(game, "lucznik", 1, [{ x: 1, y: 0 }]);
  addUnit(game, "lucznik", 1, [{ x: 0, y: 1 }]);
  addUnit(game, "lucznik", 1, [{ x: 1, y: 1 }]);
  check("Zablokowana jednostka nie ma żadnego ruchu", getReachableMoves(game, getSquadOfUnit(game, trapped)).size === 0);
}

{
  // Oddział omija przeszkodę: ściana wroga między (5,0) a (5,8), przejście tylko dołem
  const game = createGame(2, "mala");
  const walker = addUnit(game, "lucznik", 0, [{ x: 4, y: 0 }]);
  for (let y = 0; y <= 8; y++) addUnit(game, "lucznik", 1, [{ x: 5, y: y }]);
  const moves = getReachableMoves(game, { unitIds: [walker.id], points: 20 });
  check("Przez ścianę nie da się przejść - trzeba ją obejść", moves.get("2,0") > 2);
}

{
  // Oddziały są "zamrożone" do końca tury: po zetknięciu się nie łączą od razu
  const game = createGame(2, "mala");
  const a = addUnit(game, "lucznik", 0, [{ x: 10, y: 0 }]);
  const b = addUnit(game, "lucznik", 0, [{ x: 14, y: 0 }]);
  moveSquad(game, a, 2, 0);  // a staje na (12,0), b stoi na (14,0) - jeszcze się nie stykają
  moveSquad(game, a, 1, 0);  // a staje na (13,0) i dotyka b
  check("Zetknięte oddziały w tej turze ruszają się osobno", getSquadOfUnit(game, a).unitIds.length === 1);
  endTurn(game);
  endTurn(game);
  check("W następnej turze to już jeden oddział", getSquadOfUnit(game, a).unitIds.includes(b.id));
}

// =====================================================
//  ETAP 4: Walka i wygrana
// =====================================================

{
  const game = createGame(2, "mala");
  const archer = addUnit(game, "lucznik", 0, [{ x: 8, y: 2 }]);
  const near = addUnit(game, "piechur", 1, [{ x: 12, y: 6 }, { x: 12, y: 7 }]);  // 4 w prawo i 4 w dół
  const far = addUnit(game, "piechur", 1, [{ x: 13, y: 2 }, { x: 13, y: 3 }]);   // 5 w prawo
  const targets = getAttackTargets(game, archer);
  check("Łucznik (zasięg 4) trafia wroga 4 pola po skosie", targets.includes(near));
  check("Łucznik nie trafia wroga 5 pól dalej", !targets.includes(far));

  const result = attack(game, archer, near);
  check("Atak łucznika zadaje 1 obrażenie", result.ok && near.hp === 2);
  check("Drugi atak w tej samej turze - nie wolno", !attack(game, archer, near).ok);
  check("Atak nie kończy budowania", game.phase === "build");
}

{
  const game = createGame(2, "mala");
  const spear = addUnit(game, "wlocznik", 0, [{ x: 8, y: 2 }, { x: 8, y: 3 }]);
  const horse = addUnit(game, "kawaleria1", 1, shapeCells(UNIT_TYPES.kawaleria1.shape, 9, 3, 0));
  attack(game, spear, horse);
  check("Włócznik zadaje kawalerii 1 + 3 = 4 obrażenia", horse.hp === 1);

  const peasant = objectsOf(game, 0, "chlop")[0];
  check("Chłop (atak 0) nie ma celów", getAttackTargets(game, peasant).length === 0);

  const fresh = addUnit(game, "piechur", 0, [{ x: 10, y: 2 }, { x: 10, y: 3 }]);
  fresh.isNew = true;
  check("Nowa jednostka nie może atakować", !attack(game, fresh, horse).ok);
}

{
  // Atak na budynek
  const game = createGame(2, "mala");
  addBuilding(game, "koszary", 1, buildingCells("koszary", 10, 2));
  const barracks = objectsOf(game, 1, "koszary")[0];
  const soldier = addUnit(game, "piechur", 0, [{ x: 9, y: 2 }, { x: 9, y: 3 }]);
  attack(game, soldier, barracks);
  check("Piechur zabiera koszarom 1 z 18 życia", barracks.hp === 17);
}

{
  // Zniszczenie ostatniej jednostki wroga = wygrana
  const game = createGame(2, "mala");
  game.objects = game.objects.filter(obj => !(obj.owner === 1 && obj.kind === "unit"));  // wróg traci chłopów
  const lastEnemy = addUnit(game, "chlop", 1, [{ x: 10, y: 5 }]);
  const soldier = addUnit(game, "piechur", 0, [{ x: 9, y: 5 }, { x: 9, y: 6 }]);
  const result = attack(game, soldier, lastEnemy);
  check("Chłop z 1 życiem ginie od jednego ciosu", result.destroyed && !game.objects.includes(lastEnemy));
  check("Gracz bez jednostek odpada", game.players[1].alive === false);
  check("Ostatni gracz w grze wygrywa", game.winner === 0);
  check("Ratusz gracza, który odpadł, zostaje na planszy", objectsOf(game, 1, "ratusz").length === 1);
}

{
  // 3 graczy: gracz 1 odpada, gra toczy się dalej i pomija go w turach
  const game = createGame(3, "mala");
  game.objects = game.objects.filter(obj => !(obj.owner === 1 && obj.kind === "unit"));
  const lastEnemy = addUnit(game, "chlop", 1, [{ x: 10, y: 5 }]);
  const soldier = addUnit(game, "piechur", 0, [{ x: 9, y: 5 }, { x: 9, y: 6 }]);
  attack(game, soldier, lastEnemy);
  check("Przy 3 graczach jeden odpada, ale nikt jeszcze nie wygrał", game.players[1].alive === false && game.winner === null);
  endTurn(game);
  check("Po turze gracza 0 gra gracz 2 (gracz 1 pominięty)", game.current === 2);
}

// =====================================================
//  ZMIANA "wygląd jednostek": kształty, dostępność, obrót
// =====================================================

{
  check("Słoń ma 7 kratek", UNIT_TYPES.slon.shape.length === 7);
  check("Ułan ma 4 kratki (2×2)", UNIT_TYPES.ulan.shape.length === 4);
  const gamma = UNIT_TYPES.kawaleria1.shape.map(([x, y]) => x + "," + y).sort().join(" ");
  check("Kawaleria (1) to litera Γ", gamma === "0,0 0,1 1,0");

  const game = createGame(2, "mala");
  addBuilding(game, "strzelnica", 0, buildingCells("strzelnica", 10, 2));
  addBuilding(game, "stajnia", 0, buildingCells("stajnia", 14, 2));
  const range = objectsOf(game, 0, "strzelnica")[0];
  const stable = objectsOf(game, 0, "stajnia")[0];
  const rangeOptions = getRecruitOptions(game, range).sort().join(",");
  const stableOptions = getRecruitOptions(game, stable).sort().join(",");
  check("Strzelnica robi: łucznika, oszczepnika i słonia", rangeOptions === "lucznik,oszczepnik,slon");
  check("Stajnia robi: kawalerię (1) i ułana", stableOptions === "kawaleria1,ulan");
  check("Ciężka kawaleria (era 2, bez znacznika) jest jeszcze niedostępna", !isUnitAvailable(game, "ciezkaKawaleria", 0));

  // Ułan postawiony z obrotem 1 pamięta ten obrót
  game.buildPoints = 20;
  const cells = shapeCells(UNIT_TYPES.ulan.shape, 16, 2, 1);
  const result = placeUnit(game, "ulan", stable, cells, 1);
  check("Ułan obok stajni - wolno", result.ok);
  check("Postawiona jednostka pamięta obrót", objectsOf(game, 0, "ulan")[0].rotation === 1);
  check("Jednostka bez podanego obrotu ma obrót 0", objectsOf(game, 0, "chlop")[0].rotation === 0);
}

// =====================================================
//  WYNIK
// =====================================================
console.log("");
console.log("Wynik: " + passed + " ✅, " + failed + " ❌");
if (failed > 0) process.exit(1);
