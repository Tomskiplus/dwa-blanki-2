// =====================================================
//  TEST BAZY – gra przez internet (Supabase)
//  Uruchom w terminalu:  node tests/online-sql-test.js
//  Dłuższa wersja (ranking 0 i zasada 30 sekund, ok. 3 min):
//                        node tests/online-sql-test.js --full
//
//  Program udaje DWÓCH (albo więcej) anonimowych graczy i sprawdza,
//  czy funkcje bazy z supabase/02-mecze-i-ranking.sql pilnują zasad.
//  Każde uruchomienie zakłada w bazie kilku nowych "sztucznych" graczy.
//
//  UWAGA: działa tylko, dopóki w Supabase NIE ma captchy (etap 5),
//  bo sztuczny gracz nie umie rozwiązać captchy.
// =====================================================

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Wczytujemy pliki gry tak, jak przeglądarka (adres bazy + zasady gry)
function loadGameFile(fileName) {
  const code = fs.readFileSync(path.join(__dirname, "..", fileName), "utf8");
  vm.runInThisContext(code, { filename: fileName });
}
loadGameFile("supabase-config.js");
loadGameFile("data.js");
loadGameFile("rules.js");

const FULL = process.argv.includes("--full");

// --- Mini-tester (taki sam jak w run-tests.js) ---
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
    console.log("✅ " + name);
  } else {
    failed++;
    console.log("❌ " + name);
  }
}

// Czekanie (w milisekundach)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================
//  ROZMOWA Z BAZĄ (zwykły fetch, bez bibliotek)
// =====================================================

// Nowy anonimowy gracz: baza daje mu "przepustkę" (token) i numer (id)
async function newPlayer(name) {
  const res = await fetch(SUPABASE_URL + "/auth/v1/signup", {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ data: {} }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error("Nie udało się zalogować anonimowo: " + JSON.stringify(json));
  return { name: name, token: json.access_token, id: json.user.id };
}

// Nagłówki: publiczny klucz gry + przepustka gracza
function headersFor(player) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: "Bearer " + player.token,
    "Content-Type": "application/json",
  };
}

// Wywołuje funkcję bazy. Zwraca { ok, data, error }
async function rpc(player, functionName, args) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + functionName, {
    method: "POST",
    headers: headersFor(player),
    body: JSON.stringify(args || {}),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) return { ok: false, data: null, error: json && json.message };
  return { ok: true, data: json, error: null };
}

// Zwykłe zapytanie do tabeli (GET / POST / PATCH). Zwraca { status, data }
async function rest(player, method, urlPath, body) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + urlPath, {
    method: method,
    headers: Object.assign(headersFor(player), { Prefer: "return=representation" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function getRoom(player, code) {
  const res = await rest(player, "GET", "rooms?code=eq." + code + "&select=*");
  return res.data[0];
}

async function getSlots(player, code) {
  const res = await rest(player, "GET", "room_players?room_code=eq." + code + "&select=user_id,slot,country");
  const slots = {};
  for (const row of res.data) slots[row.user_id] = row.slot;
  return slots;
}

async function getRating(player) {
  const res = await rpc(player, "get_my_profile");
  return res.data.rating;
}

// Dwóch graczy szuka gry, aż baza ich połączy (najwyżej maxSeconds).
// first szuka pierwszy (czyli dłużej czeka). Zwraca kod pokoju albo null.
async function matchPlayers(first, second, maxSeconds) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < maxSeconds) {
    const a = await rpc(first, "find_match", { p_country: 0 });
    const b = await rpc(second, "find_match", { p_country: 1 });
    if (b.ok && b.data) {
      const again = await rpc(first, "find_match", { p_country: 0 });
      return again.data === b.data ? b.data : null;
    }
    if (a.ok && a.data) return a.data;
    await sleep(2000);
  }
  return null;
}

// =====================================================
//  TESTY
// =====================================================

async function main() {
  console.log("Łączę się z: " + SUPABASE_URL + "\n");

  const A = await newPlayer("A");
  const B = await newPlayer("B");

  // ---------- Ranking na start ----------
  console.log("\n--- Ranking na start ---");
  const profA = await rpc(A, "get_my_profile");
  check("nowy gracz ma ranking 10", profA.ok && profA.data.rating === 10);

  // ---------- Dobieranie ----------
  console.log("\n--- WYSZUKAJ GRĘ ---");
  const first = await rpc(A, "find_match", { p_country: 0 });
  check("sam w kolejce → jeszcze nie ma gry (null)", first.ok && first.data === null);

  const codeB = await rpc(B, "find_match", { p_country: 1 });
  check("drugi gracz dostaje kod pokoju BLANK-xxxx", codeB.ok && /^BLANK-[A-Z2-9]{4}$/.test(codeB.data));
  const code = codeB.data;

  const codeA = await rpc(A, "find_match", { p_country: 0 });
  check("pierwszy gracz dostaje ten sam kod", codeA.data === code);

  const slots = await getSlots(A, code);
  check("równy ranking → zaczyna (miejsce 0) ten, kto dłużej czekał", slots[A.id] === 0 && slots[B.id] === 1);

  let room = await getRoom(A, code);
  check("plansza MAŁA, kraje [0, 1], gra trwa, wersja 0",
    room.settings.sizeKey === "mala" && JSON.stringify(room.settings.countries) === "[0,1]" &&
    room.status === "playing" && room.version === 0);

  const walk = await rpc(A, "claim_walkover", { p_code: code });
  check("walkower zaraz po starcie → nie wolno (false)", walk.ok && walk.data === false);

  // ---------- Zapisywanie ruchów ----------
  console.log("\n--- Ruchy i wersje ---");
  const state = createGame(2, "mala", room.settings.countries);
  const v1 = await rpc(B, "submit_state", { p_code: code, p_state: state, p_expected_version: 0 });
  check("pierwszy stan gry (wersja 0) może wysłać każdy gracz → wersja 1", v1.ok && v1.data === 1);

  const stale = await rpc(A, "submit_state", { p_code: code, p_state: state, p_expected_version: 0 });
  check("stara wersja → błąd 'conflict'", !stale.ok && stale.error === "conflict");

  const notMine = await rpc(B, "submit_state", { p_code: code, p_state: state, p_expected_version: 1 });
  check("gracz bez tury nie może zapisać ruchu → 'not_your_turn'", !notMine.ok && notMine.error === "not_your_turn");

  endTurn(state);   // A kończy turę – teraz tura B
  const v2 = await rpc(A, "submit_state", { p_code: code, p_state: state, p_expected_version: 1 });
  check("gracz z turą zapisuje ruch → wersja 2", v2.ok && v2.data === 2);

  room = await getRoom(A, code);
  check("w bazie jest stan po zmianie tury (current = 1) i czas startu tury",
    room.state.current === 1 && room.turn_started_at !== null);

  const early = await rpc(A, "claim_timeout", { p_code: code, p_state: state, p_expected_version: 2 });
  check("kończenie cudzej tury przed 5:00 → 'too_early'", !early.ok && early.error === "too_early");

  // ---------- Bezpośredni zapis jest zablokowany ----------
  console.log("\n--- Oszukiwanie się nie uda ---");
  const hackInsert = await rest(A, "POST", "rooms", { code: "HACK-" + Date.now(), host_id: A.id });
  check("nie da się założyć pokoju z pominięciem funkcji", hackInsert.status >= 400);

  await rest(A, "PATCH", "rooms?code=eq." + code, { version: 99 });
  room = await getRoom(A, code);
  check("nie da się zmienić pokoju z pominięciem funkcji", room.version === 2);

  await rest(A, "PATCH", "profiles?user_id=eq." + A.id, { rating: 999 });
  check("nie da się dopisać sobie rankingu", (await getRating(A)) === 10);

  const queuePeek = await rest(A, "GET", "match_queue?select=*");
  check("kolejki szukających nie da się podejrzeć", Array.isArray(queuePeek.data) && queuePeek.data.length === 0);

  const internal = await rpc(A, "finish_room", { p_code: code, p_winner_slot: 0, p_reason: "win" });
  check("funkcji wewnętrznej finish_room nie da się wywołać", !internal.ok);

  // ---------- Poddanie ----------
  console.log("\n--- PODDAJ SIĘ ---");
  const surr = await rpc(A, "surrender", { p_code: code });
  room = await getRoom(A, code);
  check("po poddaniu gra skończona, wygrywa B (miejsce 1), powód 'surrender'",
    surr.ok && room.status === "finished" && room.winner_slot === 1 && room.end_reason === "surrender");
  check("ranking: wygrany 10 → 12, przegrany 10 → 9", (await getRating(B)) === 12 && (await getRating(A)) === 9);

  const afterEnd = await rpc(B, "submit_state", { p_code: code, p_state: state, p_expected_version: 2 });
  check("po końcu gry nie da się już robić ruchów → 'game_over'", !afterEnd.ok && afterEnd.error === "game_over");

  const surrAgain = await rpc(B, "surrender", { p_code: code });
  check("drugie poddanie nic nie zmienia w rankingu", surrAgain.ok && (await getRating(B)) === 12);

  // ---------- Niższy ranking zaczyna + wygrana w grze ----------
  console.log("\n--- Druga gra: niższy ranking zaczyna ---");
  const code2 = await matchPlayers(B, A, 10);   // B czeka dłużej, ale ma wyższy ranking
  check("A (9) i B (12) się znajdują (różnica 3 ≤ 5)", code2 !== null);
  const slots2 = await getSlots(A, code2);
  check("zaczyna niższy ranking (A), choć B czekał dłużej", slots2[A.id] === 0);

  const room2 = await getRoom(A, code2);
  const state2 = createGame(2, "mala", room2.settings.countries);
  await rpc(A, "submit_state", { p_code: code2, p_state: state2, p_expected_version: 0 });
  state2.winner = 0;   // udajemy, że A zniszczył ratusz B
  const win = await rpc(A, "submit_state", { p_code: code2, p_state: state2, p_expected_version: 1 });
  const room2end = await getRoom(A, code2);
  check("stan z wygraną kończy grę, powód 'win'",
    win.ok && room2end.status === "finished" && room2end.winner_slot === 0 && room2end.end_reason === "win");
  check("ranking: A 9 → 11, B 12 → 11", (await getRating(A)) === 11 && (await getRating(B)) === 11);

  // ---------- Wersja długa: zasada 30 sekund i ranking nie spada poniżej 0 ----------
  if (FULL) {
    console.log("\n--- (pełny test) Przegrywanie do zera i zasada 30 sekund ---");
    const L = await newPlayer("L");   // L będzie ciągle przegrywał z nowymi graczami (ranking 10)
    let rating = 10;
    let checked30 = false;
    // najwyżej 15 gier: 10 przegranych do zera + 1 przy zerze + zapas
    for (let gameNumber = 0; gameNumber < 15; gameNumber++) {
      const O = await newPlayer("O");
      const tooFar = Math.abs(rating - 10) > 5;

      if (tooFar && !checked30) {
        // Różnica > 5: na początku NIE wolno ich połączyć
        await rpc(L, "find_match", { p_country: 0 });
        const quick = await rpc(O, "find_match", { p_country: 1 });
        check("różnica " + Math.abs(rating - 10) + " > 5 → na początku brak gry", quick.ok && quick.data === null);
      }

      const started = Date.now();
      const gameCode = await matchPlayers(L, O, 45);
      const waited = (Date.now() - started) / 1000;
      if (tooFar && !checked30) {
        check("po ok. 30 s czekania gra się znajduje (czekali " + Math.round(waited) + " s)", gameCode !== null);
        checked30 = true;
      }
      if (!gameCode) break;
      await rpc(L, "surrender", { p_code: gameCode });
      const before = rating;
      rating = await getRating(L);
      if (before === 0) {
        check("przegrana przy rankingu 0 → dalej 0 (nie ma minusów)", rating === 0);
        break;
      }
    }
  }

  console.log("\nWynik: " + passed + " ✅, " + failed + " ❌");
  if (failed > 0) process.exit(1);
}

main().catch(error => {
  console.log("❌ Test przerwany: " + error.message);
  process.exit(1);
});
