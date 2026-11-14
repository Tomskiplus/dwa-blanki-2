// =====================================================
//  DWA BLANKI II - FILTR CZATU ("strażnik")
//  Sprawdza każdą wiadomość czatu DWA RAZY:
//   - u mnie, zanim ją wyślę,
//   - u mnie, gdy przyjdzie od przeciwnika
//     (bo ktoś mógł przerobić swoją grę i ominąć filtr u siebie).
//  Zasady ustalił TATA (2026-11-14) - nie luzujemy ich bez jego zgody!
//
//  Tu NIE MA rysowania ani internetu - same "czyste" funkcje,
//  dlatego da się je sprawdzić testami: node tests/run-tests.js
// =====================================================

// --- Ustawienia czatu ---
const CHAT_MAX_LENGTH = 60;     // najdłuższa wiadomość (w znakach)
const CHAT_MIN_GAP_MS = 2000;   // najwyżej 1 wiadomość co 2 sekundy

// Napisy dla gracza, gdy wiadomość nie przejdzie
const CHAT_BLOCKED_TEXT = "Bez cyfr, linków i kontaktów!";
const CHAT_EMPTY_TEXT = "Pusta wiadomość.";

// Litery, które wolno pisać (zwykłe + polskie). Inne alfabety odpadają,
// bo np. rosyjskie "о" wygląda jak nasze "o" i oszukałoby strażnika.
const CHAT_LETTERS = "abcdefghijklmnopqrstuvwxyząćęłńóśźż";

// Znaki przestankowe, które wolno pisać (i spacja)
const CHAT_PUNCTUATION = " .,!?:;()-'\"";

// Tylko te emotki - inne "dziwne" znaki mogłyby ukrywać cyfry (np. 1️⃣)
const CHAT_EMOJIS = ["😀", "😂", "😅", "😎", "👍", "👋", "🙂", "😮", "😢", "🔥"];

// Polskie ogonki -> zwykłe litery (żeby "kórwa" i "kurwa" były tym samym)
const CHAT_NO_ACCENTS = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };

// Kontakty i dane osobowe: jeśli któreś SŁOWO zawiera taki początek (także pisane
// "d i s c o r d" albo "d.i.s.c.o.r.d") - wiadomość w ogóle nie wychodzi.
const CHAT_CONTACT_WORDS = [
  // komunikatory i serwisy (tam ktoś chciałby przenieść rozmowę)
  "discord", "dyskord", "insta", "snap", "tiktok", "whatsapp", "telegram", "messenger",
  "facebook", "gmail", "youtube", "twitch", "twitter", "roblox", "skype",
  // pytania o dane osobowe
  "mieszkasz", "adres", "nazwisk", "telefon", "numer", "szkol",
];

// Całe zwroty (kilka słów) - też stop
const CHAT_CONTACT_PHRASES = ["ile masz lat", "skad jestes", "kropka pl", "kropka com", "dot com"];

// Końcówki stron internetowych: "cos.pl", "cos . com"
// (bez ".gg", bo "gg" to po prostu "dobra gra")
const CHAT_DOMAIN_PATTERN = /[a-z]\s*\.\s*(pl|com|net|org|eu|io|tv|xyz|info)\b/;

// Liczebniki: 3 albo więcej w jednej wiadomości = pewnie numer zapisany słowami.
// (Bez "ten" i "one", bo po polsku to zwykłe słowa: "ten zamek", "one wygrały")
const CHAT_NUMBER_WORDS = [
  "zero", "jeden", "jedna", "dwa", "dwie", "trzy", "cztery", "piec", "szesc", "siedem",
  "osiem", "dziewiec", "dziesiec", "sto",
  "two", "three", "four", "five", "six", "seven", "eight", "nine",
];

// Brzydkie słowa (początki słów). Ta lista jest tu tylko po to,
// żeby strażnik wiedział, co zamienić na ***.
const CHAT_BAD_WORDS = [
  "kurw", "chuj", "huj", "pierdol", "pierdal", "jeb", "pizd", "cipa", "cipk", "kutas",
  "dziwk", "cwel", "dupa", "dupe", "dupk", "gown", "debil", "idiot", "hitler", "nazi",
  "fuck", "shit", "bitch", "cunt", "asshole", "bastard", "whore", "slut", "nigga", "nigger",
  "retard", "porn", "seks", "sex",
];

// =====================================================
//  POMOCNICZE
// =====================================================

// Tekst do porównań: małe litery, bez ogonków, "$" jak "s",
// zostają tylko litery a-z, a powtórzone litery zlepiamy ("kuuurwa" -> "kurwa")
function chatNormalize(text) {
  let result = "";
  for (const char of text.toLowerCase()) {
    let letter = CHAT_NO_ACCENTS[char] || char;
    if (letter === "$") letter = "s";
    if (letter < "a" || letter > "z") continue;          // nie litera - pomijamy
    if (result[result.length - 1] === letter) continue;  // ta sama litera co przed chwilą
    result += letter;
  }
  return result;
}

// Brzydkie słowa i kontakty po tej samej "obróbce" (np. "asshole" -> "ashole")
const CHAT_BAD_STEMS = CHAT_BAD_WORDS.map(chatNormalize);
const CHAT_CONTACT_STEMS = CHAT_CONTACT_WORDS.map(chatNormalize);

// Czy w tekście (już po chatNormalize) jest któryś z rdzeni z listy?
function chatContainsAny(normalized, stems) {
  return stems.some(stem => normalized.includes(stem));
}

// Dzieli tekst na słowa (po chatNormalize). Ciąg słów z pojedynczych liter
// skleja w jedno: "d i s c o r d" -> "discord"
function chatWordGroups(text) {
  const words = text.split(/\s+/).map(chatNormalize).filter(word => word !== "");
  const groups = [];
  let letters = "";   // tu zbieramy pojedyncze litery z rzędu

  for (const word of words) {
    if (word.length === 1) {
      letters += word;
      continue;
    }
    if (letters !== "") groups.push(letters);
    letters = "";
    groups.push(word);
  }
  if (letters !== "") groups.push(letters);
  return groups;
}

// Czy wiadomość zawiera kontakt, link, cyfry albo pytanie o dane osobowe?
function chatHasContact(text) {
  if (/\p{N}/u.test(text)) return true;           // jakakolwiek cyfra (też ¹, １ itp.)
  if (text.includes("@") || text.includes("＠")) return true;

  // Małe litery bez ogonków, żeby "wejdź.pl" i "pięć" też złapać
  const plain = Array.from(text.toLowerCase()).map(char => CHAT_NO_ACCENTS[char] || char).join("");
  if (CHAT_DOMAIN_PATTERN.test(plain)) return true;

  // Linki: "http" i "www" (sprawdzane na samych literach, więc "w w w" też)
  const onlyLetters = plain.replace(/[^a-z]/g, "");
  if (onlyLetters.includes("http") || onlyLetters.includes("www")) return true;

  // Komunikatory i pytania o dane - słowo po słowie
  const groups = chatWordGroups(text);
  if (groups.some(word => chatContainsAny(word, CHAT_CONTACT_STEMS))) return true;

  // Zwroty z kilku słów, np. "ile masz lat"
  const words = plain.split(/[^a-z]+/).filter(word => word !== "");
  const sentence = " " + words.join(" ") + " ";
  if (CHAT_CONTACT_PHRASES.some(phrase => sentence.includes(" " + phrase + " "))) return true;

  // Numer zapisany słowami
  const numberWords = words.filter(word => CHAT_NUMBER_WORDS.includes(word));
  return numberWords.length >= 3;
}

// Zostawia tylko dozwolone znaki (litery, przestankowe, nasze emotki).
// Entery i tabulatory zamieniają się w spacje, a podwójne spacje w jedną.
function chatKeepAllowed(text) {
  let result = "";
  for (const char of Array.from(text)) {
    if (CHAT_LETTERS.includes(char.toLowerCase()) ||
        CHAT_PUNCTUATION.includes(char) ||
        CHAT_EMOJIS.includes(char)) {
      result += char;
    } else if (/\s/.test(char)) {
      result += " ";
    }
  }
  return result.replace(/ +/g, " ").trim();
}

// Zamienia brzydkie słowa na ***.
// Łapie też słowa rozbite na pojedyncze litery: "k u r w a" i "k.u.r.w.a"
function chatHideBadWords(text) {
  const words = text.split(" ");
  const isBad = word => chatContainsAny(chatNormalize(word), CHAT_BAD_STEMS);
  const result = [];
  let i = 0;

  while (i < words.length) {
    // Ciąg słów z pojedynczych liter (np. "k", "u", "r", "w", "a") sprawdzamy razem
    let end = i;
    while (end < words.length && chatNormalize(words[end]).length <= 1) end++;
    if (end - i >= 2 && isBad(words.slice(i, end).join(""))) {
      result.push("***");
      i = end;
      continue;
    }

    result.push(isBad(words[i]) ? "***" : words[i]);
    i++;
  }
  return result.join(" ");
}

// =====================================================
//  STRAŻNIK - jedyna funkcja, której używa reszta gry
// =====================================================

// Sprawdza i czyści wiadomość. Zwraca:
//   { ok: true, text }    - można pokazać / wysłać (text już wyczyszczony)
//   { ok: false, reason } - nie wolno (reason = polski napis dla gracza)
function filterChatMessage(text) {
  // Od przeciwnika może przyjść cokolwiek (nawet nie napis) - sprawdzamy
  if (typeof text !== "string") return { ok: false, reason: CHAT_EMPTY_TEXT };

  // Bardzo długie wiadomości ucinamy od razu (i tak pokażemy tylko 60 znaków)
  const raw = Array.from(text).slice(0, CHAT_MAX_LENGTH * 3).join("");

  // 1. Kontakty, linki, cyfry -> cała wiadomość stop.
  //    Sprawdzamy NAJPIERW, bo krok 2 usuwa "@" i cyfry - a "@kowal123" nie może
  //    zamienić się w niewinne "kowal".
  if (chatHasContact(raw)) return { ok: false, reason: CHAT_BLOCKED_TEXT };

  // 2. Zostawiamy tylko dozwolone znaki
  const clean = chatKeepAllowed(raw);
  if (clean === "") return { ok: false, reason: CHAT_EMPTY_TEXT };

  // 3. Brzydkie słowa -> ***, a na koniec przycinamy do 60 znaków
  const polite = chatHideBadWords(clean);
  const short = Array.from(polite).slice(0, CHAT_MAX_LENGTH).join("").trim();
  return { ok: true, text: short };
}
