// =====================================================
//  DWA BLANKI II - BOT (komputerowy przeciwnik)
//  Tu NIC nie rysujemy. Bot tylko patrzy na planszę i wybiera, co zrobić.
//  Gra uczciwie: używa TYCH SAMYCH zasad z rules.js co gracz.
//
//  Bot działa "po kroczku" - jak zegar z redstone'u:
//   - getBotStep(game, mode) wybiera JEDNĄ następną akcję,
//   - doBotStep(game, step) ją wykonuje.
//  game.js woła to co pół sekundy (żeby było widać ruchy bota),
//  a testy - w pętli, bez czekania.
//
//  Kolejność w turze bota: atak -> ruch -> budowa koszar -> wojsko -> koniec tury.
//  Bot to zawsze gracz, który ma teraz turę (game.current).
// =====================================================

// --- Ustawienia bota (skrzynie z liczbami - zmieniaj śmiało!) ---
const BOT_ARMY_TO_ATTACK = 4;   // ofensywny: od tylu wojaków bot rusza do ataku
const BOT_DEFEND_RADIUS = 6;    // defensywny: wróg tak blisko budynku bota (w polach) = intruz
// Bezpiecznik: po tylu krokach tura bota kończy się na siłę (łapie tylko pętle bez końca -
// normalna tura z dużą armią ma ok. 2 kroki na wojaka: ruch + atak)
const BOT_MAX_STEPS = 200;
const BOT_SEARCH_MARGIN = 5;    // jak daleko wokół chłopa/koszar szukamy miejsca na budowę

// =====================================================
//  POMOCNICY - kto jest czyj
// =====================================================

// Wszystkie obiekty bota (budynki i jednostki), od najstarszego
function getBotObjects(game) {
  return game.objects
    .filter(obj => obj.owner === game.current)
    .sort((a, b) => a.id - b.id);
}

// Wojsko bota = jego jednostki, które NIE są chłopami (chłopi zostają w domu)
function getBotArmy(game) {
  return getBotObjects(game).filter(obj => obj.kind === "unit" && !UNIT_TYPES[obj.type].builder);
}

// Chłopi bota (tylko oni mogą budować)
function getBotPeasants(game) {
  return getBotObjects(game).filter(obj => obj.kind === "unit" && UNIT_TYPES[obj.type].builder);
}

// Wszystkie obiekty wrogów bota
function getEnemyObjects(game) {
  return game.objects.filter(obj => obj.owner !== game.current);
}

// Środek wszystkich obiektów wroga - tam bot "patrzy", gdy coś stawia.
// Zwraca null, gdy wroga nie ma.
function getEnemyCenter(game) {
  const cells = [];
  for (const obj of getEnemyObjects(game)) cells.push(...obj.cells);
  return cells.length > 0 ? cellsCenter(cells) : null;
}

// =====================================================
//  WYBÓR CELU
// =====================================================

// Porównuje dwa cele. Liczba < 0 znaczy: "a" jest lepszy.
// Kolejność: 1. mniej życia, 2. jednostka przed budynkiem, 3. bliżej, 4. mniejszy numer
function compareTargets(attacker, a, b) {
  if (a.hp !== b.hp) return a.hp - b.hp;
  const kindA = a.kind === "unit" ? 0 : 1;
  const kindB = b.kind === "unit" ? 0 : 1;
  if (kindA !== kindB) return kindA - kindB;
  const distanceA = distance(attacker.cells, a.cells);
  const distanceB = distance(attacker.cells, b.cells);
  if (distanceA !== distanceB) return distanceA - distanceB;
  return a.id - b.id;
}

// Najsłabszy cel w zasięgu atakującego (albo null, gdy nie ma kogo bić)
function pickWeakestTarget(game, attacker) {
  const targets = getAttackTargets(game, attacker);
  if (targets.length === 0) return null;
  return targets.sort((a, b) => compareTargets(attacker, a, b))[0];
}

// Najbliższy obiekt z listy "candidates" (remis: jednostka przed budynkiem, potem mniejszy numer)
function findNearest(cells, candidates) {
  let best = null;
  for (const obj of candidates) {
    if (best === null) {
      best = obj;
      continue;
    }
    const d = distance(cells, obj.cells);
    const bestD = distance(cells, best.cells);
    const kind = obj.kind === "unit" ? 0 : 1;
    const bestKind = best.kind === "unit" ? 0 : 1;
    if (d < bestD || (d === bestD && kind < bestKind) || (d === bestD && kind === bestKind && obj.id < best.id)) {
      best = obj;
    }
  }
  return best;
}

// Intruzi = jednostki wroga, które podeszły do budynku bota na BOT_DEFEND_RADIUS pól (albo bliżej)
function findIntruders(game) {
  const buildings = getBotObjects(game).filter(obj => obj.kind === "building");
  return getEnemyObjects(game).filter(obj =>
    obj.kind === "unit" && buildings.some(b => distance(b.cells, obj.cells) <= BOT_DEFEND_RADIUS)
  );
}

// Do czego wojsko bota ma iść? Zwraca listę możliwych celów (pusta = stój w miejscu).
//  - ofensywny: gdy jest co najmniej BOT_ARMY_TO_ATTACK wojaków - do wszystkich wrogów,
//  - defensywny: tylko do intruzów przy bazie.
function getGoalCandidates(game, mode) {
  if (mode === "offensive") {
    if (getBotArmy(game).length < BOT_ARMY_TO_ATTACK) return [];
    return getEnemyObjects(game);
  }
  return findIntruders(game);
}

// =====================================================
//  RUCH
// =====================================================

// Szybkie sprawdzenie: czy jednostka może zrobić choć JEDEN krok (w którąkolwiek z 8 stron)?
// Wojak zakleszczony w tłumie nie może - wtedy nie liczymy dla niego całej drogi.
// taken = mapa zajętych kratek z getTakenCells
function canTakeOneStep(game, unit, taken) {
  const own = new Set(unit.cells.map(c => c.x + "," + c.y));
  const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  return directions.some(([dx, dy]) => unit.cells.every(c => {
    const x = c.x + dx;
    const y = c.y + dy;
    const key = x + "," + y;
    return isInsideBoard(game, x, y) && (own.has(key) || !taken.has(key));
  }));
}

// Najlepszy ruch jednostki w stronę celu - tylko za DARMOWE kroki
// (punkty budowy zostają na wojsko). Zwraca { dx, dy } albo null,
// gdy żaden ruch nie zbliża do celu.
function findBestMove(game, unit, goal) {
  const squad = getSquadOfUnit(game, unit);
  if (!squad) return null;
  // Ta sama jednostka, ale z punktami tylko na darmowe kroki
  const freeOnly = { unitIds: squad.unitIds, points: squad.minFree, minFree: squad.minFree };
  const moves = getReachableMoves(game, freeOnly);

  let best = null;
  let bestDistance = distance(unit.cells, goal.cells);  // ruch musi być LEPSZY niż stanie w miejscu
  let bestCost = Infinity;
  for (const [key, cost] of moves) {
    const [dx, dy] = key.split(",").map(Number);
    const moved = unit.cells.map(c => ({ x: c.x + dx, y: c.y + dy }));
    const d = distance(moved, goal.cells);
    // Bliżej celu wygrywa; przy remisie - tańszy (krótszy) ruch
    if (d < bestDistance || (best !== null && d === bestDistance && cost < bestCost)) {
      best = { dx: dx, dy: dy };
      bestDistance = d;
      bestCost = cost;
    }
  }
  return best;
}

// =====================================================
//  SZUKANIE MIEJSCA NA BUDYNEK / JEDNOSTKĘ
// =====================================================

// "Mapa" zajętych kratek: zbiór napisów "x,y". Sprawdzenie, czy kratka jest zajęta,
// trwa wtedy chwilkę (nie trzeba przeglądać wszystkich obiektów na planszy).
function getTakenCells(game) {
  const taken = new Set();
  for (const obj of game.objects) {
    for (const cell of obj.cells) taken.add(cell.x + "," + cell.y);
  }
  return taken;
}

// Szuka miejsca na kształt w pobliżu kratek "aroundCells" (np. chłopa albo koszar).
// isOk(cells) mówi, czy wolno tam postawić (to sprawdzają zasady z rules.js).
// Z dobrych miejsc wybiera to, które jest najbliżej wroga.
// Zwraca { cells, rotation } albo null.
function findSpot(game, shape, aroundCells, isOk) {
  const enemyCenter = getEnemyCenter(game);
  const taken = getTakenCells(game);
  const minX = Math.min(...aroundCells.map(c => c.x)) - BOT_SEARCH_MARGIN;
  const maxX = Math.max(...aroundCells.map(c => c.x)) + BOT_SEARCH_MARGIN;
  const minY = Math.min(...aroundCells.map(c => c.y)) - BOT_SEARCH_MARGIN;
  const maxY = Math.max(...aroundCells.map(c => c.y)) + BOT_SEARCH_MARGIN;

  let best = null;
  let bestScore = Infinity;
  for (let rotation = 0; rotation < 4; rotation++) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const cells = shapeCells(shape, x, y, rotation);
        // Najpierw szybko: jakaś kratka zajęta? To nawet nie pytamy zasad
        if (cells.some(c => taken.has(c.x + "," + c.y))) continue;
        if (!isOk(cells)) continue;
        // Wynik = odległość (do kwadratu) od środka wroga. Mniej = lepiej.
        let score = 0;
        if (enemyCenter) {
          const center = cellsCenter(cells);
          score = (center.x - enemyCenter.x) ** 2 + (center.y - enemyCenter.y) ** 2;
        }
        if (score < bestScore) {
          best = { cells: cells, rotation: rotation };
          bestScore = score;
        }
      }
    }
  }
  return best;
}

// =====================================================
//  WYBÓR NASTĘPNEJ AKCJI (każda funkcja zwraca akcję albo null)
// =====================================================

// 1. ATAK: pierwszy obiekt bota, który ma kogoś w zasięgu, bije najsłabszy cel
function findAttackStep(game) {
  for (const obj of getBotObjects(game)) {
    const target = pickWeakestTarget(game, obj);
    if (target) return { type: "attack", attackerId: obj.id, targetId: target.id };
  }
  return null;
}

// 2. RUCH: pierwszy wojak, który może podejść bliżej swojego celu
function findMoveStep(game, mode) {
  const candidates = getGoalCandidates(game, mode);
  if (candidates.length === 0) return null;
  const taken = getTakenCells(game);

  for (const unit of getBotArmy(game)) {
    if (unit.isNew) continue;  // nowe jednostki ruszą się w następnej turze
    if (unit.freeSteps <= 0) continue;  // zużyła już darmowe kroki
    const goal = findNearest(unit.cells, candidates);
    if (distance(unit.cells, goal.cells) <= 1) continue;  // już stoi tuż przy celu
    if (!canTakeOneStep(game, unit, taken)) continue;     // zakleszczona w tłumie
    const move = findBestMove(game, unit, goal);
    if (move) return { type: "move", unitId: unit.id, dx: move.dx, dy: move.dy };
  }
  return null;
}

// 3. BUDOWA: nie ma koszar? Stawiamy je obok swojego chłopa
function findBuildStep(game) {
  const key = "koszary";
  const hasBarracks = getBotObjects(game).some(obj => obj.kind === "building" && obj.type === key);
  if (hasBarracks) return null;
  // Za mało punktów - nawet nie szukamy miejsca (oszczędzamy liczenie)
  if (availablePointsFor(game, key) < BUILDING_TYPES[key].shape.length) return null;

  const peasants = getBotPeasants(game);
  if (peasants.length === 0) return null;
  const peasantCells = [];
  for (const peasant of peasants) peasantCells.push(...peasant.cells);

  const spot = findSpot(game, BUILDING_TYPES[key].shape, peasantCells,
    cells => canPlaceBuilding(game, key, cells).ok);
  if (!spot) return null;
  return { type: "build", key: key, cells: spot.cells, rotation: spot.rotation };
}

// Jakie jednostki bot zrobi w tym budynku: bez chłopów, tylko na tyle punktów,
// ile ma; najpierw najdroższe (np. piechur za 2, a za ostatni 1 punkt - włócznik)
function getBotRecruitChoices(game, building) {
  return getRecruitOptions(game, building)
    .filter(key => !UNIT_TYPES[key].builder && unitCost(key) <= game.buildPoints)
    .sort((a, b) => unitCost(b) - unitCost(a) || UNIT_TYPES[b].hp - UNIT_TYPES[a].hp);
}

// 4. WOJSKO: robimy jednostkę w budynku, w którym jest na nią miejsce
function findRecruitStep(game) {
  const buildings = getBotObjects(game).filter(obj => obj.kind === "building");
  for (const building of buildings) {
    for (const key of getBotRecruitChoices(game, building)) {
      const spot = findSpot(game, UNIT_TYPES[key].shape, building.cells,
        cells => canPlaceUnit(game, key, building, cells).ok);
      if (spot) {
        return { type: "recruit", key: key, buildingId: building.id, cells: spot.cells, rotation: spot.rotation };
      }
    }
  }
  return null;
}

// Wybiera NASTĘPNĄ akcję bota. mode = "offensive" (ofensywny) albo "defensive" (defensywny).
// Gdy nie ma już nic do zrobienia - koniec tury.
function getBotStep(game, mode) {
  if (game.winner !== null) return { type: "endTurn" };
  return findAttackStep(game)
    || findMoveStep(game, mode)
    || findBuildStep(game)
    || findRecruitStep(game)
    || { type: "endTurn" };
}

// =====================================================
//  WYKONANIE AKCJI (przez zasady z rules.js)
// =====================================================

// Szuka obiektu po numerze (albo null, gdy już go nie ma)
function findObjectById(game, id) {
  return game.objects.find(obj => obj.id === id) || null;
}

// Wykonuje akcję wybraną przez getBotStep. Zwraca wynik z rules.js: { ok, reason, ... }
function doBotStep(game, step) {
  if (step.type === "endTurn") {
    endTurn(game);
    return { ok: true, reason: "" };
  }
  if (step.type === "build") {
    return placeBuilding(game, step.key, step.cells, step.rotation);
  }
  if (step.type === "attack") {
    const attacker = findObjectById(game, step.attackerId);
    const target = findObjectById(game, step.targetId);
    if (!attacker || !target) return { ok: false, reason: "Nie ma już atakującego albo celu." };
    return attack(game, attacker, target);
  }
  if (step.type === "move") {
    const unit = findObjectById(game, step.unitId);
    if (!unit) return { ok: false, reason: "Nie ma już tej jednostki." };
    return moveSquad(game, unit, step.dx, step.dy);
  }
  if (step.type === "recruit") {
    const building = findObjectById(game, step.buildingId);
    if (!building) return { ok: false, reason: "Nie ma już tego budynku." };
    return placeUnit(game, step.key, building, step.cells, step.rotation);
  }
  return { ok: false, reason: "Nieznana akcja bota: " + step.type };
}
