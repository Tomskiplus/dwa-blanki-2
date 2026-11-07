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
  game.players[0].era = 3;  // stajnia jest od ery 3
  const stable = placeBuilding(game, "stajnia", buildingCells("stajnia", 4, 5));
  check("Stajnię (6 kratek) da się postawić obok chłopa", stable.ok && game.buildPoints === 2);
  const barracks = placeBuilding(game, "koszary", buildingCells("koszary", 2, 9));
  check("Po stajni nie starczy punktów na koszary", !barracks.ok);
}

{
  // Strzelnica ma 5 kratek. Przy 4 punktach + bonusie NIE wolno (bonus jest tylko na koszary)
  const game = createGame(2, "mala");
  game.players[0].era = 2;  // strzelnica jest od ery 2
  game.buildPoints = 4;
  check("Bonus koszar nie działa na inne budynki", !canPlaceBuilding(game, "strzelnica", buildingCells("strzelnica", 2, 6, 1)).ok);
  game.buildPoints = 5;
  check("Przy 5 punktach strzelnica już wchodzi", canPlaceBuilding(game, "strzelnica", buildingCells("strzelnica", 2, 6, 1)).ok);
}

{
  const game = createGame(2, "mala");
  game.players[0].era = MAX_ERA;  // wszystkie budynki dostępne - sprawdzamy TYLKO miejsce
  check("Budynek daleko od chłopa - nie wolno", !canPlaceBuilding(game, "stajnia", buildingCells("stajnia", 10, 7)).ok);
  check("Budynek na chłopie - nie wolno", !canPlaceBuilding(game, "koszary", buildingCells("koszary", 2, 5)).ok);
  check("Budynek poza planszą - nie wolno", !canPlaceBuilding(game, "stajnia", buildingCells("stajnia", -1, 5)).ok);
  game.players[0].era = 1;
  check("Drugiego ratusza nie da się zbudować w erze 1", !canPlaceBuilding(game, "ratusz", buildingCells("ratusz", 4, 5)).ok);
  game.players[0].era = MAX_ERA;
  check("W erze 4 drugi ratusz da się zbudować", canPlaceBuilding(game, "ratusz", buildingCells("ratusz", 4, 5)).ok);
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
  check("Ułan zajmuje 3 kratki (litera L)", UNIT_TYPES.ulan.shape.length === 3);
  const gamma = UNIT_TYPES.kawaleria1.shape.map(([x, y]) => x + "," + y).sort().join(" ");
  check("Kawaleria (1) to litera Γ", gamma === "0,0 0,1 1,0");

  const game = createGame(2, "mala");
  addBuilding(game, "strzelnica", 0, buildingCells("strzelnica", 10, 2));
  addBuilding(game, "stajnia", 0, buildingCells("stajnia", 14, 2));
  const range = objectsOf(game, 0, "strzelnica")[0];
  const stable = objectsOf(game, 0, "stajnia")[0];
  game.players[0].era = 2;
  check("Strzelnica w erze 2 robi: łucznika i oszczepnika", getRecruitOptions(game, range).sort().join(",") === "lucznik,oszczepnik");
  game.players[0].era = 3;
  check("Strzelnica w erze 3 (bez ulepszeń) robi: łucznika, oszczepnika i słonia",
    getRecruitOptions(game, range).sort().join(",") === "lucznik,oszczepnik,slon");
  check("Stajnia w erze 3 robi: kawalerię (1) i (2)", getRecruitOptions(game, stable).sort().join(",") === "kawaleria1,kawaleria2");
  check("Ułan (era 4) w erze 3 jest jeszcze niedostępny", !isUnitAvailable(game, "ulan", 0));

  // Ułan postawiony z obrotem 1 pamięta ten obrót
  game.players[0].era = 4;
  game.buildPoints = 20;
  const cells = shapeCells(UNIT_TYPES.ulan.shape, 16, 2, 1);
  const result = placeUnit(game, "ulan", stable, cells, 1);
  check("Ułan obok stajni - wolno", result.ok);
  check("Postawiona jednostka pamięta obrót", objectsOf(game, 0, "ulan")[0].rotation === 1);
  check("Jednostka bez podanego obrotu ma obrót 0", objectsOf(game, 0, "chlop")[0].rotation === 0);
}

// =====================================================
//  ZMIANA "ery"
//  Gracz 0 na małej planszy: ratusz (2,2)-(3,4), chłopi na (2,5) i (3,5)
// =====================================================

{
  const game = createGame(2, "mala");
  check("Na start gracz jest w erze 1 (era mroku)", game.players[0].era === 1 && ERA_NAMES[1] === "era mroku");
  check("Strzelnica w erze 1 - nie wolno", !canPlaceBuilding(game, "strzelnica", buildingCells("strzelnica", 2, 6, 1)).ok);
  check("Wymagania ery 1: koszary, dom, palisada, brama drewniana",
    getEraRequirements(game, 0).sort().join(",") === "bramaDrewniana,dom,koszary,palisada");

  const noBarracks = canAdvanceEra(game);
  check("Bez koszar nie można przejść do ery 2", !noBarracks.ok && noBarracks.missing.includes("koszary"));

  // Koszary WROGA się nie liczą
  addBuilding(game, "koszary", 1, buildingCells("koszary", 10, 6));
  check("Koszary wroga nie wystarczą", !canAdvanceEra(game).ok);

  placeBuilding(game, "koszary", buildingCells("koszary", 2, 6));
  check("Same koszary to za mało", !canAdvanceEra(game).ok);
  // Pozostałe budynki ery 1 stawiamy "na skróty" (addBuilding nie sprawdza zasad)
  addBuilding(game, "dom", 0, buildingCells("dom", 0, 10));
  addBuilding(game, "palisada", 0, [{ x: 0, y: 13 }]);
  addBuilding(game, "bramaDrewniana", 0, buildingCells("bramaDrewniana", 6, 10));
  const result = advanceEra(game);
  check("Ze wszystkimi budynkami ery 1 gracz przechodzi do ery 2", result.ok && game.players[0].era === 2);
  check("Po przejściu do ery tura się kończy", game.current === 1);
  check("Przeciwnik zostaje w erze 1", game.players[1].era === 1);

  endTurn(game);  // znowu gracz 0, era 2
  check("Wymagania ery 2: strzelnica, mur, brama kamienna, wieża drewniana",
    getEraRequirements(game, 0).sort().join(",") === "bramaKamienna,mur,strzelnica,wiezaDrewniana");
  check("W erze 2 strzelnica obok chłopa - wolno", canPlaceBuilding(game, "strzelnica", buildingCells("strzelnica", 4, 3, 1)).ok);
  check("W erze 2 bez strzelnicy nie można dalej", !canAdvanceEra(game).ok);

  game.players[0].era = MAX_ERA;
  const last = canAdvanceEra(game);
  check("Z ery 4 (imperiów) nie można dalej", !last.ok && last.reason === "To już ostatnia era.");
}

// =====================================================
//  ZMIANA "tekstury-poprawki": małe części są darmowe
// =====================================================

{
  check("Włócznik zajmuje 2 kratki, ale kosztuje 1 (daszek darmowy)", UNIT_TYPES.wlocznik.shape.length === 2 && unitCost("wlocznik") === 1);
  check("Wojownik orłów zajmuje 4 kratki, ale kosztuje 3 (grot darmowy)", UNIT_TYPES.wojownikOrlow.shape.length === 4 && unitCost("wojownikOrlow") === 3);
  check("Ułan kosztuje 3", unitCost("ulan") === 3);
  check("Piechur kosztuje 2 (bez darmowych części)", unitCost("piechur") === 2);

  const game = createGame(2, "mala");
  placeBuilding(game, "koszary", buildingCells("koszary", 2, 6));
  const barracks = objectsOf(game, 0, "koszary")[0];
  game.buildPoints = 5;
  const result = placeUnit(game, "wlocznik", barracks, shapeCells(UNIT_TYPES.wlocznik.shape, 5, 6, 0), 0);
  check("Postawienie włócznika zabiera 1 punkt", result.ok && game.buildPoints === 4);
  check("Daszek włócznika zajmuje pole (nikt tam nie stanie)", getObjectAt(game, 5, 6) !== null);

  game.buildPoints = 0;
  check("Przy 0 punktach włócznika nie da się postawić", !canPlaceUnit(game, "wlocznik", barracks, shapeCells(UNIT_TYPES.wlocznik.shape, 5, 8, 0)).ok);
}

// =====================================================
//  ZMIANA "zamek-i-mury"
//  Gracz 0 na małej planszy: ratusz (2,2)-(3,4), chłopi na (2,5) i (3,5)
// =====================================================

{
  // Palisada i mur: przedłużanie
  const game = createGame(2, "mala");
  check("Palisada obok chłopa - wolno", placeBuilding(game, "palisada", [{ x: 4, y: 6 }]).ok);
  check("Palisada ma 1 życia, kosztuje 1", objectsOf(game, 0, "palisada")[0].hp === 1 && game.buildPoints === 7);
  check("Palisada dalej, ale bokiem przy palisadzie - wolno (przedłużanie)", placeBuilding(game, "palisada", [{ x: 5, y: 6 }]).ok);
  check("Palisada po skosie (rogiem) przy palisadzie - też wolno", canPlaceBuilding(game, "palisada", [{ x: 6, y: 7 }]).ok);
  check("Dom przy samej palisadzie (bez chłopa) - nie wolno", !canPlaceBuilding(game, "dom", buildingCells("dom", 6, 5)).ok);
  check("Mur w erze 1 - nie wolno", !canPlaceBuilding(game, "mur", [{ x: 6, y: 6 }]).ok);
  game.players[0].era = 2;
  check("Mur w erze 2 przy palisadzie - wolno", placeBuilding(game, "mur", [{ x: 6, y: 6 }]).ok);
  check("Mur ma 4 życia", objectsOf(game, 0, "mur")[0].hp === 4);
}

{
  // Ukośny mur: nie da się przecisnąć po skosie między dwoma kawałkami stykającymi się rogami
  //   (10,5)=mur   (11,5)=cel
  //   (10,6)=start (11,6)=mur
  const game = createGame(2, "mala");
  const walker = addUnit(game, "lucznik", 0, [{ x: 10, y: 6 }]);
  const squad = { unitIds: [walker.id], points: 1 };
  check("Bez muru krok po skosie w górę-prawo jest możliwy", getReachableMoves(game, squad).has("1,-1"));
  addBuilding(game, "palisada", 1, [{ x: 10, y: 5 }]);
  addBuilding(game, "palisada", 1, [{ x: 11, y: 6 }]);
  check("Przez ukośną palisadę nie da się przejść po skosie", !getReachableMoves(game, squad).has("1,-1"));
  check("Ale w inne strony dalej można iść", getReachableMoves(game, squad).has("-1,0"));
}

{
  // Brama przepuszcza swoich, a wrogów nie
  const game = createGame(2, "mala");
  addBuilding(game, "bramaDrewniana", 0, buildingCells("bramaDrewniana", 8, 8));   // (8,8)-(9,9)
  const mine = addUnit(game, "lucznik", 0, [{ x: 7, y: 8 }]);
  const enemy = addUnit(game, "lucznik", 1, [{ x: 10, y: 9 }]);
  const myMoves = getReachableMoves(game, getSquadOfUnit(game, mine));
  check("Moja jednostka może wejść do mojej bramy", myMoves.has("1,0"));
  check("Moja jednostka może przejść przez moją bramę", myMoves.has("3,0"));
  moveSquad(game, mine, 1, 0);
  check("Klik w bramę, w której stoi jednostka, trafia w jednostkę", getObjectAt(game, 8, 8) === mine);

  endTurn(game);  // tura wroga
  const enemyMoves = getReachableMoves(game, getSquadOfUnit(game, enemy));
  check("Wróg nie wejdzie do mojej bramy", !enemyMoves.has("-1,0") && !enemyMoves.has("-1,-1"));
}

{
  // Wieża strzela raz na turę
  const game = createGame(2, "mala");
  const tower = addBuilding(game, "wiezaDrewniana", 0, buildingCells("wiezaDrewniana", 10, 2));  // (10,2)-(10,4)
  const near = addUnit(game, "piechur", 1, [{ x: 14, y: 4 }, { x: 14, y: 5 }]);
  const far = addUnit(game, "piechur", 1, [{ x: 15, y: 0 }, { x: 15, y: 1 }]);
  check("Wieża drewniana ma 6 życia (3 kratki × 2)", tower.hp === 6);
  const targets = getAttackTargets(game, tower);
  check("Wieża (zasięg 4) trafia wroga 4 pola dalej, ale nie 5", targets.includes(near) && !targets.includes(far));
  check("Strzał wieży zadaje 1 obrażenie", attack(game, tower, near).ok && near.hp === 2);
  check("Drugi strzał wieży w tej turze - nie wolno", !attack(game, tower, near).ok);
  endTurn(game);
  endTurn(game);
  check("W następnej turze wieża znowu strzela", attack(game, tower, near).ok);
}

{
  // Zamek: budowa w 2 tury
  const game = createGame(2, "mala");
  game.players[0].era = 3;
  const cells = buildingCells("zamek", 2, 6);
  check("Zamek ma 10 pól", cells.length === 10);
  check("Zamek obok chłopa - wolno, mimo że kosztuje 10 (a jest 8 punktów)", placeBuilding(game, "zamek", cells).ok);
  const castle = objectsOf(game, 0, "zamek")[0];
  check("Teraz zapłacone 8, reszta (2) na następną turę", game.buildPoints === 0 && castle.debt === 2 && castle.underConstruction);
  check("Zamek w budowie nie strzela", getAttackTargets(game, castle).length === 0);

  addBuilding(game, "stajnia", 0, buildingCells("stajnia", 12, 0));
  addBuilding(game, "wiezaKamienna", 0, buildingCells("wiezaKamienna", 15, 0));
  check("Zamek w budowie nie liczy się do następnej ery", canAdvanceEra(game).missing.includes("zamek"));

  endTurn(game);
  endTurn(game);  // znowu gracz 0
  check("Na początku następnej tury zamek jest gotowy", !castle.underConstruction && castle.debt === 0);
  check("Dokończenie zamku zabrało 2 punkty z nowej tury", game.buildPoints === 6);
  check("Gotowy zamek liczy się do następnej ery", canAdvanceEra(game).ok);
  check("Zamek ma 40 życia (10 × 4)", castle.hp === 40);
}

// =====================================================
//  ZMIANA "ulepszenia-uniwersytet"
//  Gracz 0 na małej planszy: ratusz (2,2)-(3,4), chłopi na (2,5) i (3,5)
// =====================================================

// Pomocnicze: jednostka gracza 0 postawiona "na skróty" (bez sprawdzania zasad)
function unitAt(game, type, x, y, rotation, owner) {
  return addUnit(game, type, owner || 0, shapeCells(UNIT_TYPES[type].shape, x, y, rotation || 0), rotation || 0);
}
function hasCell(obj, x, y) {
  return obj.cells.some(c => c.x === x && c.y === y);
}

{
  // Ulepszenie włócznik -> pikinier
  const game = createGame(2, "mala");
  game.players[0].era = 2;
  const barracks = addBuilding(game, "koszary", 0, buildingCells("koszary", 2, 6));
  const spear1 = unitAt(game, "wlocznik", 5, 6);
  const spear2 = unitAt(game, "wlocznik", 6, 10);
  spear2.hp = 1;  // ranny

  const options = getUpgradeOptions(game, barracks).map(up => up.from).sort().join(",");
  check("Koszary w erze 2 mają ulepszenia: piechur i włócznik (wojownik orłów dopiero w erze 3)", options === "piechur,wlocznik");

  check("Kupno ulepszenia włócznik -> pikinier", buyUpgrade(game, barracks, "wlocznik").ok);
  check("Ulepszenie kosztuje 4 punkty", game.buildPoints === 4);
  check("WSZYSCY włócznicy stali się pikinierami", spear1.type === "pikinier" && spear2.type === "pikinier");
  check("Ranny włócznik wyleczył się do pełna (pikinier 4/4)", spear2.hp === 4 && spear2.maxHp === 4);
  check("Koszary robią teraz pikiniera zamiast włócznika",
    getRecruitOptions(game, barracks).sort().join(",") === "piechur,pikinier,wojownikOrlow");
  check("Drugi raz tego samego ulepszenia nie da się kupić", !canBuyUpgrade(game, barracks, "wlocznik").ok);
  check("Pikinier -> halabardnik dopiero w erze 3", !getUpgradeOptions(game, barracks).some(up => up.from === "pikinier"));
  game.players[0].era = 3;
  check("W erze 3 można ulepszyć pikiniera w halabardnika", getUpgradeOptions(game, barracks).some(up => up.from === "pikinier"));
}

{
  // Piechur rośnie z przodu (1×2 -> 1×3)
  const game = createGame(2, "mala");
  game.players[0].era = 2;
  const barracks = addBuilding(game, "koszary", 0, buildingCells("koszary", 2, 6));
  const upright = unitAt(game, "piechur", 8, 6, 0);        // stoi pionowo: (8,6),(8,7)
  const upsideDown = unitAt(game, "piechur", 12, 6, 2);    // obrócony o 180°: przód jest na dole
  const blocked = unitAt(game, "piechur", 10, 6, 0);       // przed nim przeszkoda
  const wall = addBuilding(game, "palisada", 1, [{ x: 10, y: 5 }]);

  buyUpgrade(game, barracks, "piechur");
  check("Piechur urósł z przodu (do góry)", upright.cells.length === 3 && hasCell(upright, 8, 5));
  check("Obrócony piechur urósł w stronę, w którą patrzy (w dół)", upsideDown.cells.length === 3 && hasCell(upsideDown, 12, 8));
  check("Piechur z przeszkodą przed sobą czeka (dalej 2 pola)", blocked.cells.length === 2 && blocked.type === "piechurUlepszony");

  game.objects = game.objects.filter(obj => obj !== wall);  // przeszkoda znika
  tryGrowAll(game, 0);
  check("Gdy przeszkoda zniknie, piechur dorasta", blocked.cells.length === 3 && hasCell(blocked, 10, 5));
}

{
  // Kawaleria (1) Γ dopełnia róg do 2×2, chłop -> chłop ulepszony
  const game = createGame(2, "mala");
  game.players[0].era = 4;
  const stable = addBuilding(game, "stajnia", 0, buildingCells("stajnia", 14, 0));
  const horse = unitAt(game, "kawaleria1", 14, 6, 0);       // (14,6),(15,6),(14,7)
  buyUpgrade(game, stable, "kawaleria1");
  check("Kawaleria (1) stała się ciężką kawalerią 2×2 (dopełniony róg)", horse.type === "ciezkaKawaleria" && horse.cells.length === 4 && hasCell(horse, 15, 7));

  const townHall = objectsOf(game, 0, "ratusz")[0];
  game.players[0].era = 1;
  check("W erze 1 chłopa nie da się ulepszyć", getUpgradeOptions(game, townHall).length === 0);
  game.players[0].era = 2;
  game.buildPoints = 8;
  check("W erze 2 ratusz ulepsza chłopa", buyUpgrade(game, townHall, "chlop").ok);
  const peasant = objectsOf(game, 0, "chlopUlepszony")[0];
  check("Chłop ulepszony ma 3/1/1", peasant && peasant.hp === 3 && UNIT_TYPES.chlopUlepszony.attack === 1 && UNIT_TYPES.chlopUlepszony.range === 1);
  check("Ratusz robi teraz chłopa ulepszonego", getRecruitOptions(game, townHall).join(",") === "chlopUlepszony");
  game.players[0].era = 4;
  check("Ulepszony chłop dalej może budować (dom obok niego)", canPlaceBuilding(game, "dom", buildingCells("dom", 4, 5)).ok);
}

{
  // Uniwersytet: badania i bombarda
  const game = createGame(2, "mala");
  game.players[0].era = 4;
  const uni = addBuilding(game, "uniwersytet", 0, buildingCells("uniwersytet", 10, 0));
  check("Uniwersytet ma 7 badań do zrobienia", getResearchOptions(game, uni).length === 7);
  check("Bez Prochu uniwersytet nie robi bombard", getRecruitOptions(game, uni).length === 0);
  check("Zbadanie Prochu kosztuje 4", buyResearch(game, uni, "proch").ok && game.buildPoints === 4);
  check("Po Prochu uniwersytet robi bombardy", getRecruitOptions(game, uni).join(",") === "bombarda");
  check("Bombarda ma 5 pól i kosztuje 5", UNIT_TYPES.bombarda.shape.length === 5 && unitCost("bombarda") === 5);

  const cannon = unitAt(game, "bombarda", 4, 10);
  const enemyHut = addBuilding(game, "dom", 1, buildingCells("dom", 9, 10));
  const enemyUnit = unitAt(game, "piechur", 8, 12, 0, 1);
  check("Bombarda zadaje budynkom 5 + 4 = 9", getDamage(game, cannon, enemyHut) === 9);
  check("Bombarda zadaje jednostkom 5", getDamage(game, cannon, enemyUnit) === 5);

  game.buildPoints = 8;
  check("Pancerz łuskowy: przed badaniem 5 ruchu", movePointsFor(game, 0) === 5);
  buyResearch(game, uni, "pancerzLuskowy");
  check("Pancerz łuskowy: po badaniu 7 ruchu", movePointsFor(game, 0) === 7);
}

{
  // Szarża, Mordownia, Płonący grot
  const game = createGame(2, "mala");
  game.players[0].era = 4;
  const uni = addBuilding(game, "uniwersytet", 0, buildingCells("uniwersytet", 10, 0));
  const horse = unitAt(game, "kawaleria1", 6, 8);
  const victim = unitAt(game, "halabardnik", 8, 8, 0, 1);  // 6 życia
  check("Bez Szarży kawaleria atakuje raz", attack(game, horse, victim).ok && !attack(game, horse, victim).ok);

  endTurn(game); endTurn(game);
  game.buildPoints = 20;
  buyResearch(game, uni, "szarza");
  check("Z Szarżą kawaleria atakuje 2 razy", attack(game, horse, victim).ok && attack(game, horse, victim).ok);
  check("...ale nie 3 razy", !attack(game, horse, victim).ok);

  const tower = addBuilding(game, "wiezaDrewniana", 0, buildingCells("wiezaDrewniana", 14, 6));  // (14,6)-(14,8)
  const close = unitAt(game, "piechur", 15, 7, 0, 1);       // tuż obok wieży
  check("Bez Mordowni wieża nie strzela do wroga tuż obok", !getAttackTargets(game, tower).includes(close));
  buyResearch(game, uni, "mordownia");
  check("Z Mordownią wieża strzela do wroga tuż obok", getAttackTargets(game, tower).includes(close));

  const archer = unitAt(game, "lucznik", 4, 12);
  check("Łucznik bez Płonącego grotu zadaje 1", getDamage(game, archer, close) === 1);
  buyResearch(game, uni, "plonacyGrot");
  check("Z Płonącym grotem łucznik zadaje 3", getDamage(game, archer, close) === 3);
  const elephant = unitAt(game, "slon", 0, 9);
  check("Słoń (ze strzelnicy) też dostaje +2: 4 + 2 = 6", getDamage(game, elephant, close) === 6);
}

{
  // Sparing i Wypalanie leczą do pełna
  const game = createGame(2, "mala");
  game.players[0].era = 4;
  game.buildPoints = 20;
  const uni = addBuilding(game, "uniwersytet", 0, buildingCells("uniwersytet", 10, 0));
  const barracks = addBuilding(game, "koszary", 0, buildingCells("koszary", 2, 6));
  barracks.hp = 5;
  const soldier = unitAt(game, "piechur", 8, 6);
  soldier.hp = 1;
  buyResearch(game, uni, "sparing");
  check("Sparing: piechur 3 + 3 = 6 życia i wyleczony", soldier.maxHp === 6 && soldier.hp === 6);
  check("Sparing: nowy piechur też ma 6 życia", unitAt(game, "piechur", 9, 10).hp === 6);
  check("Sparing nie dotyczy łuczników", unitAt(game, "lucznik", 12, 10).hp === 2);
  buyResearch(game, uni, "wypalanie");
  check("Wypalanie: koszary 9 pól × (2 + 1) = 27 życia i wyleczone", barracks.maxHp === 27 && barracks.hp === 27);
}

// =====================================================
//  WYNIK
// =====================================================
console.log("");
console.log("Wynik: " + passed + " ✅, " + failed + " ❌");
if (failed > 0) process.exit(1);
