// =====================================================
//  DWA BLANKI II - CZAT
//  Enter = otwórz pole i pisz, Enter = wyślij, Esc = zamknij.
//
//  - W meczu przez internet wiadomość leci do przeciwnika (sendChat z network.js).
//  - W EDYTORZE nic nie idzie do internetu - wiadomość widać tylko tutaj
//    (oboje gracze siedzą przy jednym komputerze).
//  - Każdą wiadomość sprawdza strażnik z chat-filter.js: przy wysyłaniu
//    I przy odbieraniu (zasada TATY).
// =====================================================

// --- Ustawienia (zmieniaj śmiało!) ---
const CHAT_SHOW_MS = 15000;        // po ilu milisekundach wiadomość znika z planszy
const CHAT_VISIBLE_COUNT = 4;      // ile ostatnich wiadomości widać naraz
const CHAT_RECEIVE_GAP_MS = 1500;  // szybsze wiadomości od przeciwnika pomijamy (ochrona przed spamem)
const CHAT_NOTICE_MS = 4000;       // jak długo widać czerwony napis (np. "Zwolnij!")
const CHAT_LINE_HEIGHT = 20;       // odstęp między linijkami czatu
const CHAT_BOTTOM_Y = 545;         // gdzie na canvasie jest dolna linijka (tuż nad polem do pisania)

// --- Stan czatu ---
const chatInput = document.getElementById("chat-input");  // pole do pisania (z index.html)
let chatMessages = [];         // wiadomości: { name, color, text, at, fromRival }
let chatLastSentAt = 0;        // kiedy JA wysłałem ostatnią wiadomość (Date.now())
let chatLastReceivedAt = 0;    // kiedy przyszła ostatnia wiadomość od przeciwnika
let chatNotice = null;         // czerwony napis dla mnie: { text, at } albo null

// =====================================================
//  KIEDY CZAT DZIAŁA
// =====================================================

// Czat jest tylko na ekranie gry: w EDYTORZE albo w trwającym meczu przez internet
function chatAvailable() {
  if (currentScreen !== "game" || !game) return false;
  if (online && online.ended) return false;
  return true;
}

// Czy teraz piszę w polu czatu? (wtedy klawisze NIE sterują grą - patrz game.js)
function isTypingInChat() {
  return document.activeElement === chatInput;
}

// =====================================================
//  OTWIERANIE I ZAMYKANIE POLA
// =====================================================

function openChat() {
  chatInput.hidden = false;
  chatInput.focus();
}

// Zamyka pole. To, co było wpisane, zostaje na następny raz
function closeChat() {
  chatInput.hidden = true;
  if (isTypingInChat()) chatInput.blur();
}

// Czyści cały czat (nowa gra, koniec meczu, wyjście do menu)
function clearChat() {
  chatMessages = [];
  chatLastReceivedAt = 0;
  chatNotice = null;
  chatInput.value = "";
  closeChat();
}

// Czerwony napis nad polem (np. "Zwolnij!")
function showChatNotice(text) {
  chatNotice = { text: text, at: Date.now() };
}

// =====================================================
//  KLAWISZE
// =====================================================

// Enter w grze (gdy pole jest zamknięte) - otwieramy pole do pisania
document.addEventListener("keydown", function (event) {
  if (event.key !== "Enter" || isTypingInChat() || !chatAvailable()) return;
  event.preventDefault();   // żeby ten sam Enter nie "wpadł" od razu do pola
  openChat();
});

// Klawisze w polu czatu: Enter = wyślij, Esc = zamknij
chatInput.addEventListener("keydown", function (event) {
  // Klawisz z pola NIE leci dalej do reszty strony. Inaczej Enter, który właśnie
  // wysłał wiadomość, otworzyłby czat znowu, a Esc anulowałby stawianie budynku.
  event.stopPropagation();

  if (event.key === "Enter") {
    event.preventDefault();
    submitChat();
  } else if (event.key === "Escape") {
    closeChat();
  }
});

// Kliknięcie gdzieś obok pola (np. w planszę) też je zamyka
chatInput.addEventListener("blur", function () {
  chatInput.hidden = true;
});

// =====================================================
//  WYSYŁANIE
// =====================================================

// Gracz wcisnął Enter w polu czatu
function submitChat() {
  const typed = chatInput.value;
  if (typed.trim() === "") {   // pusty Enter = po prostu zamknij
    closeChat();
    return;
  }
  if (!chatAvailable()) {
    clearChat();
    return;
  }

  // Tajne kody sprawdzamy PRZED strażnikiem - "AK-47_cat" ma cyfry,
  // więc strażnik by go zablokował. Kod nigdy nie trafia do czatu.
  if (cheatCodeUnit(typed) || isDesignCode(typed)) {
    handleCheatCode(typed);
    return;
  }

  // Strażnik: kontakty -> stop, brzydkie słowa -> ***
  const checked = filterChatMessage(typed);
  if (!checked.ok) {
    showChatNotice(checked.reason);   // tekst zostaje w polu - można poprawić
    return;
  }

  // Najwyżej jedna wiadomość co 2 sekundy
  if (Date.now() - chatLastSentAt < CHAT_MIN_GAP_MS) {
    showChatNotice("Zwolnij! Jedna wiadomość co 2 sekundy.");
    return;
  }
  chatLastSentAt = Date.now();

  if (online) {
    // Mecz przez internet: do przeciwnika, a u mnie "Ty: ..."
    sendChat(checked.text).then(result => {
      if (!result.ok) showChatNotice("Nie udało się wysłać wiadomości.");
    });
    addChatMessage("Ty", "#000000", checked.text, false);
  } else {
    // EDYTOR: tylko u nas, podpisane kolorem gracza, który ma turę
    const player = game.players[game.current];
    addChatMessage(player.colorName, player.color, checked.text, false);
  }

  chatInput.value = "";
  closeChat();
}

// Gracz wpisał tajny kod (zasady są w rules.js: useCheatCode)
function handleCheatCode(typed) {
  chatInput.value = "";   // kodu nie zostawiamy w polu (i nigdzie go nie pokazujemy)

  // Przez internet kody nie działają - i NIE wysyłamy ich przeciwnikowi
  if (online) {
    showChatNotice("Kody działają tylko w edytorze.");
    return;
  }

  // Kod tła (designs.js) - tylko wygląd, więc bez limitu "raz na turę"
  if (isDesignCode(typed)) {
    addChatMessage("", "#1e8449", useDesignCode(typed), false);
    closeChat();
    return;
  }

  const result = useCheatCode(game, typed);
  if (!result.ok) {
    showChatNotice(result.reason);   // np. "Kod już użyty w tej turze."
    return;
  }
  // Zielony napis bez podpisu, np. "Żaba wkracza do gry!"
  // ("wkracza" pasuje do jeża, kota i żaby - "przybył" nie pasowało do żaby)
  addChatMessage("", "#1e8449", UNIT_TYPES[result.unit.type].name + " wkracza do gry!", false);
  closeChat();
}

// =====================================================
//  ODBIERANIE (tylko mecz przez internet)
// =====================================================

// Przyszła wiadomość od przeciwnika (woła to network.js)
function receiveChat(text) {
  if (!online || online.ended || !game) return;

  // Za szybko po poprzedniej? Pomijamy (ktoś mógł przerobić grę, żeby spamować)
  const now = Date.now();
  if (now - chatLastReceivedAt < CHAT_RECEIVE_GAP_MS) return;
  chatLastReceivedAt = now;

  // Strażnik działa TAKŻE tutaj - nie ufamy grze przeciwnika
  const checked = filterChatMessage(text);
  if (!checked.ok) return;

  const rival = game.players[1 - online.mySlot];
  addChatMessage(rival.colorName, rival.color, checked.text, true);
}

// Dopisuje wiadomość do listy
function addChatMessage(name, color, text, fromRival) {
  chatMessages.push({ name: name, color: color, text: text, at: Date.now(), fromRival: fromRival });
  // Pamiętamy tylko kilka ostatnich - starsze i tak by zniknęły
  if (chatMessages.length > 20) chatMessages.shift();
}

// =====================================================
//  RYSOWANIE (woła je drawGameScreen z game.js)
// =====================================================

// Linijki do narysowania: ostatnie wiadomości sprzed < 15 s (+ czerwony napis)
function getChatLines() {
  const now = Date.now();
  const lines = chatMessages
    .filter(msg => now - msg.at < CHAT_SHOW_MS)
    .slice(-CHAT_VISIBLE_COUNT);
  if (chatNotice && now - chatNotice.at < CHAT_NOTICE_MS) {
    lines.push({ name: "", color: "#c0392b", text: chatNotice.text });
  }
  return lines;
}

// Wiadomości w lewym dolnym rogu planszy, na półprzezroczystej "karteczce"
function drawChat() {
  const lines = getChatLines();
  if (lines.length === 0) return;

  ctx.font = "bold 14px Arial, sans-serif";
  // Jak szeroka ma być karteczka? Tak jak najdłuższa linijka
  let width = 0;
  for (const line of lines) {
    width = Math.max(width, ctx.measureText(chatLineLabel(line) + line.text).width);
  }
  const height = lines.length * CHAT_LINE_HEIGHT + 8;
  const top = CHAT_BOTTOM_Y - height + CHAT_LINE_HEIGHT / 2 + 4;

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillRect(10, top, width + 16, height);

  lines.forEach((line, index) => {
    const y = top + 4 + CHAT_LINE_HEIGHT / 2 + index * CHAT_LINE_HEIGHT;
    const label = chatLineLabel(line);
    // Najpierw podpis w kolorze gracza, zaraz za nim tekst na czarno
    drawText(label, 18, y, 14, line.color, "left");
    ctx.font = "bold 14px Arial, sans-serif";
    const labelWidth = ctx.measureText(label).width;
    drawText(line.text, 18 + labelWidth, y, 14, line.name === "" ? line.color : "#000000", "left");
  });
}

// Podpis przed tekstem: "Czerwony: " (czerwony napis nie ma podpisu)
function chatLineLabel(line) {
  return line.name === "" ? "" : line.name + ": ";
}
