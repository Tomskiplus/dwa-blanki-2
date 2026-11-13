// =====================================================
//  DWA BLANKI II - SIEĆ (rozmowa z bazą Supabase)
//  To JEDYNY plik, który wie, że używamy Supabase.
//  Gdybyśmy kiedyś zmienili serwer, wymieniamy tylko ten plik.
//
//  Każda funkcja zwraca obiekt { ok, data, error }:
//   ok    = czy się udało (true / false)
//   data  = odpowiedź bazy
//   error = polski napis dla gracza, gdy coś nie wyszło
// =====================================================

let supabaseClient = null;  // połączenie z bazą (tworzy je connect)
let myUserId = null;        // mój anonimowy numer gracza
let roomChannel = null;     // "kanał na żywo" z pokojem, który oglądamy

const NO_CONNECTION = "Brak połączenia z serwerem gry. Spróbuj za chwilę.";

// Błędy z bazy (z pliku supabase/02-mecze-i-ranking.sql) po polsku
const ERROR_TEXTS = {
  conflict: "Gra się zsynchronizowała - spróbuj jeszcze raz.",
  not_your_turn: "To nie twoja tura.",
  game_over: "Ta gra już się skończyła.",
  not_in_room: "Nie grasz w tej grze.",
  too_early: "Czas tury jeszcze nie minął.",
  state_too_big: "Gra jest za duża, żeby ją zapisać.",
};

// Zamienia błąd z bazy na polski napis dla gracza
function errorText(error) {
  const text = (error && error.message) || "";
  for (const key of Object.keys(ERROR_TEXTS)) {
    if (text.includes(key)) return ERROR_TEXTS[key];
  }
  return NO_CONNECTION;
}

// Wywołuje funkcję bazy (np. "find_match") i zawsze zwraca { ok, data, error }.
// code = krótki kod błędu z bazy (np. "conflict") - przydaje się w programie
async function callDatabase(functionName, args) {
  try {
    const result = await supabaseClient.rpc(functionName, args || {});
    if (result.error) {
      return { ok: false, data: null, error: errorText(result.error), code: result.error.message };
    }
    return { ok: true, data: result.data, error: null };
  } catch (problem) {
    // np. brak internetu albo baza "śpi"
    return { ok: false, data: null, error: NO_CONNECTION, code: "network" };
  }
}

// =====================================================
//  POŁĄCZENIE I LOGOWANIE
// =====================================================

// Łączy się z bazą i loguje anonimowo (bez e-maila i hasła).
// Przepustkę (sesję) biblioteka sama pamięta w przeglądarce,
// więc następnym razem jesteśmy tym samym graczem.
// captchaToken = "bilet" z captchy (potrzebny tylko nowemu graczowi) albo null
async function connect(captchaToken) {
  try {
    if (!supabaseClient) {
      // "supabase" to biblioteka wczytana w index.html. Gdy jej nie ma - nie ma internetu
      if (typeof supabase === "undefined") return { ok: false, data: null, error: NO_CONNECTION };
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }

    // Mam już przepustkę z poprzedniego razu?
    const saved = await supabaseClient.auth.getSession();
    if (saved.data.session) {
      myUserId = saved.data.session.user.id;
      return { ok: true, data: myUserId, error: null };
    }

    // Nie - loguję się anonimowo jako nowy gracz
    const credentials = captchaToken ? { options: { captchaToken: captchaToken } } : undefined;
    const result = await supabaseClient.auth.signInAnonymously(credentials);
    if (result.error) return { ok: false, data: null, error: NO_CONNECTION };
    myUserId = result.data.user.id;
    return { ok: true, data: myUserId, error: null };
  } catch (problem) {
    return { ok: false, data: null, error: NO_CONNECTION };
  }
}

// Czy ta przeglądarka grała już przez internet? (ma zapamiętaną przepustkę)
// Tylko sprawdza - NIE zakłada nowego gracza. data = true / false
async function hasSavedSession() {
  try {
    if (typeof supabase === "undefined") return { ok: false, data: false, error: NO_CONNECTION };
    if (!supabaseClient) supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const saved = await supabaseClient.auth.getSession();
    if (!saved.data.session) return { ok: true, data: false, error: null };
    myUserId = saved.data.session.user.id;
    return { ok: true, data: true, error: null };
  } catch (problem) {
    return { ok: false, data: false, error: NO_CONNECTION };
  }
}

// Czy gram teraz w jakiejś grze? data = kod pokoju albo null.
// (Bez dopisywania do kolejki szukających - do tego jest findMatch)
async function findMyActiveGame() {
  try {
    const result = await supabaseClient.from("room_players")
      .select("room_code, rooms!inner(status)")
      .eq("user_id", myUserId)
      .eq("rooms.status", "playing")
      .limit(1);
    if (result.error) return { ok: false, data: null, error: NO_CONNECTION };
    return { ok: true, data: result.data.length > 0 ? result.data[0].room_code : null, error: null };
  } catch (problem) {
    return { ok: false, data: null, error: NO_CONNECTION };
  }
}

// =====================================================
//  RANKING I SZUKANIE GRY
// =====================================================

// Mój ranking: { rating, wins, losses }
function getMyProfile() {
  return callDatabase("get_my_profile");
}

// Szukam przeciwnika. data = kod pokoju (np. "BLANK-K7P2") albo null (jeszcze szukam)
function findMatch(country) {
  return callDatabase("find_match", { p_country: country });
}

// Przestaję szukać
function cancelSearch() {
  return callDatabase("cancel_search");
}

// =====================================================
//  POKÓJ (GRA)
// =====================================================

// Pobiera pokój i graczy. data = { room, players, mySlot }
async function loadRoom(code) {
  try {
    const room = await supabaseClient.from("rooms").select("*").eq("code", code).single();
    const players = await supabaseClient.from("room_players")
      .select("user_id, slot, country, rating_before, last_seen")
      .eq("room_code", code);
    if (room.error || players.error) return { ok: false, data: null, error: NO_CONNECTION };

    const me = players.data.find(player => player.user_id === myUserId);
    return {
      ok: true,
      data: { room: room.data, players: players.data, mySlot: me ? me.slot : null },
      error: null,
    };
  } catch (problem) {
    return { ok: false, data: null, error: NO_CONNECTION };
  }
}

// Zapisy ruchów idą w KOLEJCE - jeden po drugim, nigdy dwa naraz.
// getExpectedVersion = funkcja, która w chwili wysyłania mówi, jaki numer wersji
// jest teraz w bazie (bo poprzedni zapis z kolejki mógł go właśnie zmienić).
let saveQueue = Promise.resolve();

function submitState(code, state, getExpectedVersion) {
  const snapshot = JSON.parse(JSON.stringify(state));   // "zdjęcie" stanu w tej chwili
  const job = saveQueue.then(() => callDatabase("submit_state", {
    p_code: code,
    p_state: snapshot,
    p_expected_version: getExpectedVersion(),
  }));
  saveQueue = job;
  return job;   // data = nowy numer wersji
}

// Kończę turę przeciwnika, któremu minął czas (stan już po endTurn)
function claimTimeout(code, state, expectedVersion) {
  return callDatabase("claim_timeout", { p_code: code, p_state: state, p_expected_version: expectedVersion });
}

// "Bicie serca" - jestem w grze
function heartbeat(code) {
  return callDatabase("heartbeat", { p_code: code });
}

// Walkower: data = true (wygrałem), false (jeszcze nie można)
function claimWalkover(code) {
  return callDatabase("claim_walkover", { p_code: code });
}

// Poddaję się
function surrender(code) {
  return callDatabase("surrender", { p_code: code });
}

// =====================================================
//  NA ŻYWO (Realtime)
// =====================================================

// Zaczyna oglądać pokój na żywo:
//  onRoom(room)       - gdy zmieni się pokój (nowy ruch, koniec gry)
//  onPlayer(player)   - gdy zmieni się gracz (np. jego "bicie serca")
function watchRoom(code, onRoom, onPlayer) {
  unwatchRoom();
  roomChannel = supabaseClient.channel("room-" + code)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms", filter: "code=eq." + code },
      payload => onRoom(payload.new))
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "room_players", filter: "room_code=eq." + code },
      payload => onPlayer(payload.new))
    .subscribe();
}

// Przestaje oglądać pokój
function unwatchRoom() {
  if (roomChannel) {
    supabaseClient.removeChannel(roomChannel);
    roomChannel = null;
  }
}
