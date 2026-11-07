// =====================================================
//  DWA BLANKI II - RYSUNKI JEDNOSTEK (jak w zeszycie)
//
//  Każda jednostka ma tu swoją funkcję rysującą.
//  Rysujemy na kształcie jednostki PRZED obrotem (obrotem zajmuje się game.js).
//  Lewy górny róg kształtu to (0, 0). Rysunki zajmują PEŁNE pola.
//
//  Przed rysowaniem game.js ustawia:
//    - ctx.fillStyle   = jasny kolor gracza (tym kolorujemy środek rysunku),
//    - ctx.strokeStyle = czarny "długopis".
//  Kolor jest TYLKO w środku narysowanych kształtów - nie wychodzi poza rysunek.
//
//  s = rozmiar jednej kratki w pikselach.
//  Wszystkie liczby są w KRATKACH: 0.5 = pół kratki, 2 = dwie kratki.
// =====================================================

// --- Kształty kolorowane w środku (wypełnienie w kolorze gracza + czarny obrys) ---

// Wielokąt z listy punktów [[x, y], ...]
function colorPolygon(ctx, s, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0] * s, points[0][1] * s);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x * s, y * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Prostokąt
function colorRect(ctx, s, x, y, w, h) {
  colorPolygon(ctx, s, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
}

// Koło
function colorCircle(ctx, s, x, y, r) {
  ctx.beginPath();
  ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// --- Sam "długopis" (czarne kreski i czarne zamalowania) ---

// Kreska od (x1, y1) do (x2, y2)
function penLine(ctx, s, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1 * s, y1 * s);
  ctx.lineTo(x2 * s, y2 * s);
  ctx.stroke();
}

// Zamalowany na czarno wielokąt albo koło (np. kropka oszczepnika)
function inkPolygon(ctx, s, points) {
  const color = ctx.fillStyle;      // zapamiętujemy kolor gracza...
  ctx.fillStyle = ctx.strokeStyle;  // ...malujemy na czarno...
  ctx.beginPath();
  ctx.moveTo(points[0][0] * s, points[0][1] * s);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x * s, y * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;            // ...i przywracamy kolor gracza
}

function inkDot(ctx, s, x, y, r) {
  const color = ctx.fillStyle;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
}

// Strzałka od (x1, y1) do (x2, y2) z grotem na końcu
function penArrow(ctx, s, x1, y1, x2, y2) {
  penLine(ctx, s, x1, y1, x2, y2);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 0.3; // długość grota w kratkach
  for (const side of [-1, 1]) {
    const a = angle + Math.PI + side * 0.5;
    penLine(ctx, s, x2, y2, x2 + Math.cos(a) * head, y2 + Math.sin(a) * head);
  }
}

// Falka (kilka łuków w poziomie) - do ciężkiej kawalerii
function penWave(ctx, s, x, y, width) {
  ctx.beginPath();
  ctx.moveTo(x * s, y * s);
  const bumps = 3;
  const step = width / bumps;
  for (let i = 0; i < bumps; i++) {
    const startX = x + i * step;
    ctx.quadraticCurveTo((startX + step / 2) * s, (y - 0.12) * s, (startX + step) * s, y * s);
  }
  ctx.stroke();
}

// --- Wspólne części kilku rysunków ---

// Kwadrat z daszkiem - włócznik i jego ulepszenia. Kształt 1×2:
// górne pole = daszek (mała część, darmowa), dolne pole = kwadrat
function drawSpearBase(ctx, s) {
  colorRect(ctx, s, 0, 1, 1, 1);                          // kwadrat na całe dolne pole
  colorPolygon(ctx, s, [[0, 1], [0.5, 0], [1, 1]]);       // daszek na całe górne pole
}

// "Ołówek" - wojownik orłów i jego ulepszenia. Kształt 4×1 (w poziomie):
// pola 0-2 = kwadrat i długi prostokąt, pole 3 = grot (mała część, darmowa)
function drawPencilBase(ctx, s) {
  colorRect(ctx, s, 0, 0, 1, 1);                          // kwadrat z tyłu
  colorRect(ctx, s, 1, 0, 2, 1);                          // długi prostokąt
  colorPolygon(ctx, s, [[3, 0], [4, 0.5], [3, 1]]);       // grot
  penLine(ctx, s, 0.3, 0.5, 3.5, 0.5);                    // kreska przez środek
}

// Pióra z tyłu ołówka (dwa znaczki "<") - elitarny wojownik orłów
function drawFeathers(ctx, s) {
  penLine(ctx, s, 0.65, 0.5, 0.3, 0.2);
  penLine(ctx, s, 0.65, 0.5, 0.3, 0.8);
  penLine(ctx, s, 0.95, 0.5, 0.6, 0.2);
  penLine(ctx, s, 0.95, 0.5, 0.6, 0.8);
}

// Małe L (kawaleria 2, paladyn). Kształt: [[1,0],[0,1],[1,1]]
function drawSmallL(ctx, s) {
  colorPolygon(ctx, s, [[1, 0], [2, 0], [2, 2], [0, 2], [0, 1], [1, 1]]);
}

// Kwadrat z kropką - oszczepnik i elitarny oszczepnik. Kształt 1×1.
function drawJavelinBase(ctx, s) {
  colorRect(ctx, s, 0, 0, 1, 1);
  inkDot(ctx, s, 0.5, 0.5, 0.1);
}

// =====================================================
//  RYSUNKI WSZYSTKICH JEDNOSTEK
//  (klucze takie same jak w UNIT_TYPES w data.js)
// =====================================================
const UNIT_DRAWINGS = {
  // Chłop - pusty kwadrat
  chlop: (ctx, s) => {
    colorRect(ctx, s, 0, 0, 1, 1);
  },

  // ----- Koszary -----
  piechur: (ctx, s) => {
    colorRect(ctx, s, 0, 0, 1, 2);                 // prostokąt 1×2
  },
  piechurUlepszony: (ctx, s) => {
    colorRect(ctx, s, 0, 0, 1, 3);                 // prostokąt 1×3
    penLine(ctx, s, 0, 1, 1, 1);                   // kreska oddziela górne pole
  },
  wlocznik: (ctx, s) => {
    drawSpearBase(ctx, s);                         // kwadrat z daszkiem
  },
  pikinier: (ctx, s) => {
    drawSpearBase(ctx, s);
    penLine(ctx, s, 0, 1, 1, 2);                   // skośna kreska w kwadracie
  },
  halabardnik: (ctx, s) => {
    drawSpearBase(ctx, s);
    penLine(ctx, s, 0, 1, 1, 2);                   // X w kwadracie
    penLine(ctx, s, 1, 1, 0, 2);
  },
  wojownikOrlow: (ctx, s) => {
    drawPencilBase(ctx, s);                        // "ołówek"
  },
  eWojownikOrlow: (ctx, s) => {
    drawPencilBase(ctx, s);
    drawFeathers(ctx, s);                          // + pióra z tyłu
  },
  eWojownikOrlowUl: (ctx, s) => {
    drawPencilBase(ctx, s);
    ctx.globalAlpha = 0.45;
    inkPolygon(ctx, s, [[0, 0], [1, 0], [1, 1], [0, 1]]);  // przyciemniony tył
    ctx.globalAlpha = 1;
    drawFeathers(ctx, s);
  },

  // ----- Strzelnica -----
  lucznik: (ctx, s) => {
    colorCircle(ctx, s, 0.5, 0.5, 0.47);           // koło na całe pole
  },
  wyszkolonyLucznik: (ctx, s) => {
    colorCircle(ctx, s, 0.33, 0.5, 0.29);          // koło (łucznik)...
    // ...trzyma łuk z prawej strony: wygięty łuk ")" i prosta cięciwa
    ctx.beginPath();
    ctx.arc(0.45 * s, 0.5 * s, 0.48 * s, -1.0, 1.0);  // łuk
    ctx.stroke();
    const bowX = 0.45 + 0.48 * Math.cos(1.0);          // gdzie kończą się ramiona łuku
    const bowY = 0.48 * Math.sin(1.0);
    penLine(ctx, s, bowX, 0.5 - bowY, bowX, 0.5 + bowY);  // cięciwa
  },
  oszczepnik: (ctx, s) => {
    drawJavelinBase(ctx, s);                       // kwadrat z kropką
  },
  eOszczepnik: (ctx, s) => {
    drawJavelinBase(ctx, s);
    // oszczep nad kropką: poziomy kij z grotem w prawo
    penLine(ctx, s, 0.12, 0.24, 0.72, 0.24);
    inkPolygon(ctx, s, [[0.7, 0.13], [0.92, 0.24], [0.7, 0.35]]);
  },
  slon: (ctx, s) => {
    // Cały słoń jest szary (kwadrat na górze + podstawa 3×2)...
    const playerColor = ctx.fillStyle;
    ctx.fillStyle = "#b5b5b5";
    colorPolygon(ctx, s, [[1, 0], [2, 0], [2, 1], [3, 1], [3, 3], [0, 3], [0, 1], [1, 1]]);
    penLine(ctx, s, 1, 1, 2, 1);                   // kreska pod górnym kwadratem
    // ...a na środku podstawy ma mały kwadrat w kolorze gracza
    ctx.fillStyle = playerColor;
    colorRect(ctx, s, 1, 1.5, 1, 1);
  },

  // ----- Stajnia -----
  kawaleria1: (ctx, s) => {
    colorPolygon(ctx, s, [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]]);   // litera Γ
  },
  ciezkaKawaleria: (ctx, s) => {
    colorRect(ctx, s, 0, 0, 2, 2);                 // kwadrat 2×2
    penLine(ctx, s, 1, 0, 1, 2);                   // kreska w środku
    penWave(ctx, s, 1.1, 0.5, 0.8);                // falki w prawej połowie
    penWave(ctx, s, 1.1, 1.0, 0.8);
    penWave(ctx, s, 1.1, 1.5, 0.8);
  },
  kawaleria2: (ctx, s) => {
    drawSmallL(ctx, s);
  },
  paladyn: (ctx, s) => {
    drawSmallL(ctx, s);
    penArrow(ctx, s, 1.5, 1.8, 1.5, 0.25);         // strzałka w górę
  },
  ulan: (ctx, s) => {
    // litera L z 3 pól: [[0,0],[0,1],[1,1]]
    colorPolygon(ctx, s, [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [0, 2]]);
    // włócznia po skosie - grot wystaje w pusty prawy górny róg (to pole jest wolne)
    penArrow(ctx, s, 0.25, 1.75, 1.75, 0.25);
  },
};
