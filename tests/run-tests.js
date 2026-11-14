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
loadGameFile("chat-filter.js");

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
  // Kraje: 17 kolorów, wybór kraju, powtórzony kraj dostaje numer gracza
  check("Jest 17 krajów", COUNTRIES.length === 17);
  const byDefault = createGame(3, "mala");
  check("Bez wyboru kraje są po kolei: czerwony, ciemnopomarańczowy, pomarańczowy",
    byDefault.players.map(p => p.country).join(",") === "czerwony,ciemnopomaranczowy,pomaranczowy");
  check("Bez powtórzeń nazwa bez numeru i bez cyfr", byDefault.players[0].colorName === "Czerwony" && !byDefault.players[0].showNumber);

  const chosen = createGame(3, "mala", [9, 0, 9]);  // granatowy, czerwony, granatowy
  check("Gracz dostaje wybrany kraj i jego kolor", chosen.players[0].country === "granatowy" && chosen.players[0].color === COUNTRIES[9].color);
  check("Powtórzony kraj: nazwa z numerem gracza (Granatowy 1, Granatowy 3)",
    chosen.players[0].colorName === "Granatowy 1" && chosen.players[2].colorName === "Granatowy 3");
  check("Powtórzony kraj: cyfry na obiektach, a inny kraj bez cyfr",
    chosen.players[0].showNumber && chosen.players[2].showNumber && !chosen.players[1].showNumber && chosen.players[1].colorName === "Czerwony");
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
  // Każda jednostka chodzi sama; oddział robi się ramką (formSquads)
  const game = createGame(2, "mala");
  const [p1, p2] = objectsOf(game, 0, "chlop");
  check("Stykający się chłopi bez ramki chodzą osobno", getSquadOfUnit(game, p1).unitIds.length === 1);

  const groups = formSquads(game, [p1.id, p2.id]);
  check("Ramka: dwaj stykający się chłopi to 1 oddział", groups.length === 1 && getSquadOfUnit(game, p1).unitIds.length === 2);

  // Jednostki stykające się tylko rogiem też tworzą oddział; daleka jednostka to osobna grupa
  const corner = addUnit(game, "piechur", 0, [{ x: 4, y: 6 }, { x: 4, y: 7 }]);  // dotyka chłopa (3,5) rogiem
  const far = addUnit(game, "lucznik", 0, [{ x: 10, y: 10 }]);
  const groups2 = formSquads(game, [p1.id, p2.id, corner.id, far.id]);
  check("Ramka: jednostka stykająca się rogiem dołącza do oddziału", getSquadOfUnit(game, p1).unitIds.length === 3);
  check("Ramka: jednostka daleko od innych to osobna grupa", groups2.length === 2 && getSquadOfUnit(game, far).unitIds.length === 1);

  const newOne = addUnit(game, "lucznik", 0, [{ x: 11, y: 10 }]);  // stoi obok "far"
  newOne.isNew = true;
  formSquads(game, [far.id, newOne.id]);
  check("Nowa jednostka nie wchodzi do oddziału", getSquadOfUnit(game, far).unitIds.length === 1 && getSquadOfUnit(game, newOne) === null);
  check("Nowa jednostka nie może się ruszyć", !moveSquad(game, newOne, 1, 0).ok);

  // Nowa ramka zabiera jednostkę ze starego oddziału
  formSquads(game, [p1.id]);
  check("Jednostka z nowej ramki wychodzi ze starego oddziału", getSquadOfUnit(game, p1).unitIds.length === 1 && getSquadOfUnit(game, p2).unitIds.length === 2);
}

{
  const game = createGame(2, "mala");
  game.buildPoints = 2;  // jakby gracz wydał 6 punktów na budowanie
  const [peasant, other] = objectsOf(game, 0, "chlop");
  check("Zasięg = 5 darmowych kroków + 2 punkty budowy = 7", getSquadOfUnit(game, peasant).points === 7);

  const moves = getReachableMoves(game, getSquadOfUnit(game, peasant));
  check("Krok po skosie kosztuje 1 punkt", moves.get("1,1") === 1);
  check("Jednostka nie wejdzie na ratusz (krok w górę zablokowany)", !moves.has("0,-1"));
  check("Jednostka dojdzie 7 pól w dół, ale nie 8", moves.has("0,7") && !moves.has("0,8"));

  check("Nieudany ruch nic nie zabiera", !moveSquad(game, peasant, 0, 9).ok && game.buildPoints === 2 && peasant.freeSteps === 5);

  const result = moveSquad(game, peasant, 0, 3);
  check("Ruch o 3 pola w dół się udaje", result.ok);
  check("Rusza się tylko kliknięty chłop (bez ramki)", peasant.cells[0].y === 8 && other.cells[0].y === 5);
  check("3 kroki z darmowych: punkty budowy dalej 2", game.buildPoints === 2 && peasant.freeSteps === 2);
  check("Zostało 4 zasięgu (2 darmowe + 2 budowy)", getSquadOfUnit(game, peasant).points === 4);
  check("Po ruchu dalej można budować", canPlaceBuilding(game, "palisada", [{ x: 2, y: 9 }]).ok);
}

{
  // Przykład z zasad: 8 punktów budowy, łucznik idzie 7 pól -> zostaje 6, inny ma zasięg 5 + 6
  const game = createGame(2, "mala");
  const a = addUnit(game, "lucznik", 0, [{ x: 10, y: 0 }]);
  const b = addUnit(game, "lucznik", 0, [{ x: 14, y: 0 }]);
  check("Ruch o 7 pól się udaje", moveSquad(game, a, 0, 7).ok);
  check("Ruch dalej niż 5 zabrał 2 punkty budowy (zostało 6)", game.buildPoints === 6 && a.freeSteps === 0);
  check("Inny łucznik ma teraz zasięg 5 + 6 = 11", getSquadOfUnit(game, b).points === 11);
  check("Po ruchu da się zrobić jednostkę za resztę punktów", canPlaceUnit(game, "chlop", objectsOf(game, 0, "ratusz")[0], [{ x: 4, y: 2 }]).ok);

  // Wszystkie punkty budowy na ruch - bonus koszar zostaje i nie liczy się do ruchu
  check("Łucznik idzie jeszcze 6 pól (same punkty budowy)", moveSquad(game, a, 0, 6).ok && game.buildPoints === 0);
  check("Bonus koszar zostaje po ruchu", game.barracksBonus === 1);
  check("Bonus koszar nie dodaje ruchu: drugi łucznik ma tylko 5", getSquadOfUnit(game, b).points === 5);
}

{
  // Oddział z jednostek z różną liczbą darmowych kroków idzie tyle, ile najsłabsza
  const game = createGame(2, "mala");
  const a = addUnit(game, "lucznik", 0, [{ x: 10, y: 0 }]);
  const b = addUnit(game, "lucznik", 0, [{ x: 13, y: 0 }]);
  moveSquad(game, b, -2, 0);  // b staje na (11,0) obok a i ma już tylko 3 darmowe kroki
  formSquads(game, [a.id, b.id]);
  const squad = getSquadOfUnit(game, a);
  check("Oddział: zasięg = darmowe kroki najsłabszego (3) + punkty budowy (8)", squad.unitIds.length === 2 && squad.points === 11);
  check("Oddział rusza się razem o 5 pól", moveSquad(game, a, 0, 5).ok && a.cells[0].y === 5 && b.cells[0].y === 5);
  check("Za oddział płaci się 1 punkt na krok (2 kroki ponad darmowe = 2 punkty)", game.buildPoints === 6);
  check("Każdej jednostce odjęto przebytą drogę", a.freeSteps === 0 && b.freeSteps === 0);

  // Nowa tura: oddział z ramki znika, darmowe kroki wracają
  endTurn(game);
  endTurn(game);
  check("W nowej turze oddział z ramki znika", game.squads.length === 0 && getSquadOfUnit(game, a).unitIds.length === 1);
  check("W nowej turze darmowe kroki wracają do 5", a.freeSteps === 5 && b.freeSteps === 5);
}

{
  // Nowa jednostka obok własnej jednostki, która stoi przy budynku
  const game = createGame(2, "mala");
  placeBuilding(game, "koszary", buildingCells("koszary", 2, 6));  // koszary (2..4, 6..8)
  const barracks = objectsOf(game, 0, "koszary")[0];
  game.buildPoints = 20;
  const pikeShape = UNIT_TYPES.piechur.shape;
  check("Piechur obok koszar - wolno", placeUnit(game, "piechur", barracks, shapeCells(pikeShape, 5, 6, 0)).ok);
  check("Piechur obok NOWEGO piechura przy koszarach - wolno", canPlaceUnit(game, "piechur", barracks, shapeCells(pikeShape, 6, 6, 0)).ok);
  check("Obok piechura przy koszarach rogiem - wolno", canPlaceUnit(game, "piechur", barracks, shapeCells(pikeShape, 6, 8, 0)).ok);
  placeUnit(game, "piechur", barracks, shapeCells(pikeShape, 6, 6, 0));
  check("O dwie jednostki dalej - nie wolno (bez łańcuszka)", !canPlaceUnit(game, "piechur", barracks, shapeCells(pikeShape, 7, 6, 0)).ok);
  addUnit(game, "lucznik", 1, [{ x: 2, y: 9 }]);  // jednostka WROGA przy koszarach
  check("Obok jednostki wroga przy budynku - nie wolno", !canPlaceUnit(game, "piechur", barracks, shapeCells(pikeShape, 2, 10, 0)).ok);
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
  // Zetknięcie się nie robi oddziału - ani teraz, ani w następnej turze
  const game = createGame(2, "mala");
  const a = addUnit(game, "lucznik", 0, [{ x: 10, y: 0 }]);
  const b = addUnit(game, "lucznik", 0, [{ x: 14, y: 0 }]);
  moveSquad(game, a, 3, 0);  // a staje na (13,0) i dotyka b
  check("Zetknięte jednostki dalej chodzą osobno", getSquadOfUnit(game, a).unitIds.length === 1);
  endTurn(game);
  endTurn(game);
  check("W następnej turze też osobno (bez ramki)", !getSquadOfUnit(game, a).unitIds.includes(b.id));
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
  check("Po ataku dalej można budować", canPlaceBuilding(game, "palisada", [{ x: 2, y: 6 }]).ok);
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
  check("Pancerz łuskowy działa od razu: bombarda ma 7 darmowych kroków", cannon.freeSteps === 7);
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
//  ZMIANA "czat-w-grze": FILTR CZATU (strażnik)
//  Zasady TATY: brzydkie słowa -> ***, kontakty/cyfry/linki -> stop
// =====================================================

{
  // Pomocnicze: co strażnik zrobi z wiadomością?
  const passesAs = (text, expected) => {
    const result = filterChatMessage(text);
    return result.ok && result.text === expected;
  };
  const isBlocked = text => {
    const result = filterChatMessage(text);
    return !result.ok && result.reason === CHAT_BLOCKED_TEXT;
  };

  // Zwykłe wiadomości przechodzą bez zmian
  check("Czat: zwykła wiadomość przechodzi", passesAs("hej, powodzenia!", "hej, powodzenia!"));
  check("Czat: polskie litery przechodzą", passesAs("Zażółć gęślą jaźń", "Zażółć gęślą jaźń"));
  check("Czat: dozwolona emotka przechodzi", passesAs("dobra gra 👍", "dobra gra 👍"));
  check("Czat: GG (dobra gra) przechodzi", passesAs("dobra gra, gg", "dobra gra, gg"));

  // Długość i puste wiadomości
  check("Czat: 80 znaków -> przycięte do 60", filterChatMessage("a".repeat(80)).text.length === 60);
  check("Czat: pusta wiadomość nie przechodzi", !filterChatMessage("").ok);
  check("Czat: same spacje nie przechodzą", !filterChatMessage("    ").ok);
  check("Czat: nie-napis (od przerobionej gry) nie przechodzi", !filterChatMessage({ text: "hej" }).ok);
  check("Czat: niedozwolone znaki znikają, podwójne spacje też", passesAs("hej   <b>#ziomek", "hej bziomek"));

  // Kontakty, cyfry, linki -> cała wiadomość stop
  check("Czat: numer telefonu zablokowany", isBlocked("mój nr 600 123 456"));
  check("Czat: e-mail zablokowany", isBlocked("pisz na ab@cd.pl"));
  check("Czat: strona www zablokowana", isBlocked("wejdź na www.strona.pl"));
  check("Czat: domena bez www zablokowana", isBlocked("wejdź na strona . com"));
  check("Czat: @nick zablokowany", isBlocked("mój nick @kowal"));
  check("Czat: Discord zablokowany", isBlocked("mam discorda"));
  check("Czat: d i s c o r d ze spacjami zablokowany", isBlocked("d i s c o r d"));
  check("Czat: d.i.s.c.o.r.d z kropkami zablokowany", isBlocked("d.i.s.c.o.r.d"));
  check("Czat: Insta zablokowane", isBlocked("insta: kowal"));
  check("Czat: numer słowami zablokowany", isBlocked("pięć sześć siedem osiem"));
  check("Czat: cyfry pełnej szerokości zablokowane", isBlocked("１２３"));
  check("Czat: pytanie o wiek zablokowane", isBlocked("ile masz lat?"));
  check("Czat: pytanie o miejsce zablokowane", isBlocked("gdzie mieszkasz"));

  // Brzydkie słowa -> ***
  check("Czat: brzydkie słowo -> ***", passesAs("ty debilu", "ty ***"));
  check("Czat: WIELKIE LITERY też", passesAs("KURWA", "***"));
  check("Czat: z ogonkiem też (gówno)", passesAs("gówno", "***"));
  check("Czat: rozciągnięte litery też (kuuurwa)", passesAs("kuuurwa", "***"));
  check("Czat: rozbite na litery też (k u r w a)", passesAs("no k u r w a", "no ***"));
  check("Czat: po angielsku też", passesAs("what the fuck", "what the ***"));

  // Bez fałszywych alarmów
  check("Czat: Szczecin to nie brzydkie słowo", passesAs("Szczecin", "Szczecin"));
  check("Czat: kurczak to nie brzydkie słowo", passesAs("kurczak", "kurczak"));
  check("Czat: skubany to nie brzydkie słowo", passesAs("skubany", "skubany"));
  check("Czat: szach mat przechodzi", passesAs("szach mat", "szach mat"));
  check("Czat: nigdy to nie brzydkie słowo", passesAs("nigdy", "nigdy"));
  check("Czat: las na prawo to nie Snap", passesAs("idę przez las na prawo", "idę przez las na prawo"));
  check("Czat: ten zamek to nie liczby", passesAs("ten zamek, one dwa", "ten zamek, one dwa"));
}

// =====================================================
//  ZMIANA "kody-w-edytorze": jeż i kot z tajnych kodów
//  Gracz 0 na małej planszy: ratusz (2,2)-(3,4), chłopi na (2,5) i (3,5)
// =====================================================

{
  // Kod IAmNotTusk -> jeż obok ratusza
  const game = createGame(2, "mala");
  const townHall = game.objects.find(o => o.type === "ratusz" && o.owner === 0);
  check("Zwykły tekst to nie kod", (() => { const r = useCheatCode(game, "hej"); return !r.ok && r.reason === ""; })());

  const hedgehog = useCheatCode(game, "IAmNotTusk");
  check("Kod IAmNotTusk tworzy jeża", hedgehog.ok && hedgehog.unit.type === "jez");
  check("Jeż stoi tuż obok ratusza", distance(townHall.cells, hedgehog.unit.cells) === 1);
  check("Jeż: 4 pola, 5 życia, gracza 0", hedgehog.unit.cells.length === 4 && hedgehog.unit.hp === 5 && hedgehog.unit.owner === 0);
  check("Jeż działa dopiero od następnej tury", hedgehog.unit.isNew === true);
  check("Kod jest darmowy (8 punktów zostaje)", game.buildPoints === 8);

  const second = useCheatCode(game, "AK-47_cat");
  check("Drugi kod w tej samej turze odrzucony", !second.ok && second.reason === "Kod już użyty w tej turze.");

  endTurn(game);   // tura gracza 1
  check("Wielkość liter ma znaczenie: ak-47_CAT to nie kod", !useCheatCode(game, "ak-47_CAT").ok);
  check("iamnottusk (małymi literami) to nie kod", cheatCodeUnit("iamnottusk") === null);
  check("constructor to nie kod (ukryte pole obiektu)", cheatCodeUnit("constructor") === null);
  const cat = useCheatCode(game, "  AK-47_cat ");
  check("Po zmianie tury kod znowu działa (spacje na brzegach bez znaczenia)", cat.ok && cat.unit.type === "kotAk");
  check("Kot należy do gracza, który ma turę (1)", cat.unit.owner === 1);
  check("Kot: 2 pola, 20 życia", cat.unit.cells.length === 2 && cat.unit.hp === 20);
}

{
  // Jeż atakuje 15 razy w jednej turze, a 16. raz już nie
  const game = createGame(2, "mala");
  const hedgehog = unitAt(game, "jez", 10, 6);
  const target = unitAt(game, "kotAk", 12, 6, 0, 1);   // kot przeciwnika (20 życia) tuż obok
  let hits = 0;
  for (let i = 0; i < 15; i++) {
    if (attack(game, hedgehog, target).ok) hits++;
  }
  check("Jeż trafia 15 razy w jednej turze", hits === 15 && target.hp === 5);
  check("16. atak jeża w tej turze się nie udaje", !attack(game, hedgehog, target).ok);
}

{
  // Kot strzela przez całą planszę, ale tylko w jednostki
  const game = createGame(2, "mala");
  const enemyPeasant = game.objects.find(o => o.owner === 1 && o.type === "chlop");
  const enemyTownHall = game.objects.find(o => o.owner === 1 && o.type === "ratusz");
  const cat = unitAt(game, "kotAk", 0, 13);
  check("Kot widzi wrogiego chłopa na drugim końcu planszy",
    getAttackTargets(game, cat).includes(enemyPeasant));
  check("Kot nie celuje w budynki", !getAttackTargets(game, cat).some(o => o.kind === "building"));
  const shot = attack(game, cat, enemyPeasant);
  check("Kot zadaje 10 obrażeń", shot.ok && shot.damage === 10 && shot.destroyed);
  const cat2 = unitAt(game, "kotAk", 1, 13);
  const onBuilding = attack(game, cat2, enemyTownHall);
  check("Kot nie może zaatakować ratusza", !onBuilding.ok && onBuilding.reason === "Kot z AK-47 atakuje tylko jednostki.");
}

{
  // Kod ILLfroggy -> żaba: 21 życia, 5 ataku, zasięg 4, ruch "bez końca"
  const game = createGame(2, "mala");
  const frog = useCheatCode(game, "ILLfroggy");
  check("Kod ILLfroggy tworzy żabę (4 pola, 21 życia)",
    frog.ok && frog.unit.type === "zaba" && frog.unit.cells.length === 4 && frog.unit.hp === 21);
  endTurn(game);
  endTurn(game);   // znowu tura gracza 0 - żaba już nie jest nowa
  const squad = getSquadOfUnit(game, frog.unit);
  check("Żaba ma 999 darmowych kroków na turę", squad && squad.minFree === UNLIMITED_STEPS);
  // Najdalsze miejsce, do którego żaba może dojść
  const farthest = Math.max(...[...getReachableMoves(game, squad).keys()]
    .map(key => Math.max(...key.split(",").map(n => Math.abs(Number(n))))));
  check("Żaba skacze przez prawie całą planszę (dalej niż 13 pól)", farthest > 13);
  const move = moveSquad(game, frog.unit, 15, 0);
  check("Długi skok żaby nie zabiera punktów budowy", move.ok && game.buildPoints === 8);
  check("Po długim skoku żaba dalej może skakać", getSquadOfUnit(game, frog.unit).minFree > 900);
  const enemy = unitAt(game, "piechur", frog.unit.cells[0].x, frog.unit.cells[0].y + 6, 0, 1);
  check("Zasięg żaby: 4 (cel 5 pól dalej jest za daleko)",
    distance(frog.unit.cells, enemy.cells) === 5 && !getAttackTargets(game, frog.unit).includes(enemy));
}

{
  // Jeża i kota nie da się zrobić w żadnym budynku (nawet w erze 4)
  const game = createGame(2, "mala");
  game.players[0].era = 4;
  const secret = Object.keys(BUILDING_TYPES).some(key =>
    getRecruitOptions(game, { type: key, owner: 0 }).some(unitKey => UNIT_TYPES[unitKey].cheatOnly)
  );
  check("Jeża i kota nie ma w menu żadnego budynku", !secret);
}

// =====================================================
//  WYNIK
// =====================================================
console.log("");
console.log("Wynik: " + passed + " ✅, " + failed + " ❌");
if (failed > 0) process.exit(1);
