// =====================================================
//  DWA BLANKI II - RYSUNKI JEDNOSTEK (jak w zeszycie)
//
//  Każda jednostka ma tu swoją funkcję rysującą.
//  Rysujemy czarnym "długopisem" na kształcie jednostki PRZED obrotem
//  (obrotem zajmuje się game.js). Lewy górny róg kształtu to (0, 0).
//
//  s = rozmiar jednej kratki w pikselach.
//  Wszystkie liczby są w KRATKACH: 0.5 = pół kratki, 2 = dwie kratki.
// =====================================================

// --- Pomocnicze "klocki" do rysowania (liczby w kratkach) ---

// Kreska od (x1, y1) do (x2, y2)
function penLine(ctx, s, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1 * s, y1 * s);
  ctx.lineTo(x2 * s, y2 * s);
  ctx.stroke();
}

// Prostokąt (tylko obrys)
function penRect(ctx, s, x, y, w, h) {
  ctx.strokeRect(x * s, y * s, w * s, h * s);
}

// Kółko (obrys albo zamalowane, gdy filled = true)
function penCircle(ctx, s, x, y, r, filled) {
  ctx.beginPath();
  ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
  if (filled) ctx.fill();
  else ctx.stroke();
}

// Wielokąt z listy punktów [[x, y], ...] (obrys albo zamalowany)
function penPolygon(ctx, s, points, filled) {
  ctx.beginPath();
  ctx.moveTo(points[0][0] * s, points[0][1] * s);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x * s, y * s);
  ctx.closePath();
  if (filled) ctx.fill();
  else ctx.stroke();
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

// Kwadrat z daszkiem (grotem) - włócznik i jego ulepszenia. Kształt 1×2.
function drawSpearBase(ctx, s) {
  penRect(ctx, s, 0.15, 1.1, 0.7, 0.75);                             // kwadrat w dolnej kratce
  penPolygon(ctx, s, [[0.15, 1.1], [0.5, 0.2], [0.85, 1.1]], false); // daszek w górnej kratce
}

// "Ołówek" - wojownik orłów i jego ulepszenia. Kształt 4×1 (w poziomie).
function drawPencilBase(ctx, s) {
  penRect(ctx, s, 0.1, 0.15, 0.9, 0.7);                               // kwadrat z tyłu
  penRect(ctx, s, 1, 0.15, 2, 0.7);                                   // długi prostokąt
  penPolygon(ctx, s, [[3, 0.15], [3.9, 0.5], [3, 0.85]], false);      // grot
  penLine(ctx, s, 0.3, 0.5, 3.4, 0.5);                                // kreska przez środek
}

// Pióra z tyłu ołówka (dwa znaczki "<") - elitarny wojownik orłów
function drawFeathers(ctx, s) {
  penLine(ctx, s, 0.65, 0.5, 0.3, 0.22);
  penLine(ctx, s, 0.65, 0.5, 0.3, 0.78);
  penLine(ctx, s, 0.95, 0.5, 0.6, 0.22);
  penLine(ctx, s, 0.95, 0.5, 0.6, 0.78);
}

// Obrys małego L (kawaleria 2, paladyn). Kształt: [[1,0],[0,1],[1,1]]
function drawSmallL(ctx, s) {
  penPolygon(ctx, s, [[1.12, 0.12], [1.88, 0.12], [1.88, 1.88], [0.12, 1.88], [0.12, 1.12], [1.12, 1.12]], false);
}

// Kwadrat z kropką - oszczepnik i elitarny oszczepnik. Kształt 1×1.
function drawJavelinBase(ctx, s) {
  penRect(ctx, s, 0.18, 0.18, 0.64, 0.64);
  penCircle(ctx, s, 0.5, 0.5, 0.09, true);
}

// =====================================================
//  RYSUNKI WSZYSTKICH JEDNOSTEK
//  (klucze takie same jak w UNIT_TYPES w data.js)
// =====================================================
const UNIT_DRAWINGS = {
  // Chłop - ludzik: głowa, tułów, ręce i nogi
  chlop: (ctx, s) => {
    penCircle(ctx, s, 0.5, 0.27, 0.13, false);
    penLine(ctx, s, 0.5, 0.4, 0.5, 0.66);
    penLine(ctx, s, 0.26, 0.5, 0.74, 0.5);
    penLine(ctx, s, 0.5, 0.66, 0.32, 0.88);
    penLine(ctx, s, 0.5, 0.66, 0.68, 0.88);
  },

  // ----- Koszary -----
  piechur: (ctx, s) => {
    penRect(ctx, s, 0.15, 0.15, 0.7, 1.7);         // wysoki prostokąt
  },
  piechurUlepszony: (ctx, s) => {
    penRect(ctx, s, 0.15, 0.15, 0.7, 2.7);         // jeszcze wyższy prostokąt
    penLine(ctx, s, 0.15, 1, 0.85, 1);             // kreska oddziela górną kratkę
  },
  wlocznik: (ctx, s) => {
    drawSpearBase(ctx, s);                         // kwadrat z daszkiem
  },
  pikinier: (ctx, s) => {
    drawSpearBase(ctx, s);
    penLine(ctx, s, 0.2, 0.55, 0.85, 1.1);         // skośna kreska przez daszek
  },
  halabardnik: (ctx, s) => {
    drawSpearBase(ctx, s);
    penLine(ctx, s, 0.15, 1.1, 0.85, 1.85);        // X w kwadracie
    penLine(ctx, s, 0.85, 1.1, 0.15, 1.85);
  },
  wojownikOrlow: (ctx, s) => {
    drawPencilBase(ctx, s);                        // "ołówek"
  },
  eWojownikOrlow: (ctx, s) => {
    drawPencilBase(ctx, s);
    drawFeathers(ctx, s);                          // + pióra z tyłu
  },
  eWojownikOrlowUl: (ctx, s) => {
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0.1 * s, 0.15 * s, 0.9 * s, 0.7 * s);  // zamalowany tył
    ctx.globalAlpha = 1;
    drawPencilBase(ctx, s);
    drawFeathers(ctx, s);
  },

  // ----- Strzelnica -----
  lucznik: (ctx, s) => {
    penCircle(ctx, s, 0.5, 0.5, 0.32, false);      // koło
  },
  wyszkolonyLucznik: (ctx, s) => {
    penCircle(ctx, s, 0.45, 0.55, 0.28, false);    // duże koło
    penCircle(ctx, s, 0.72, 0.3, 0.16, false);     // + małe koło na nim
  },
  oszczepnik: (ctx, s) => {
    drawJavelinBase(ctx, s);                       // kwadrat z kropką
  },
  eOszczepnik: (ctx, s) => {
    drawJavelinBase(ctx, s);
    penPolygon(ctx, s, [[0.55, 0.18], [0.82, 0.18], [0.82, 0.45]], true); // zamalowany róg
  },
  slon: (ctx, s) => {
    penRect(ctx, s, 0.12, 1.1, 2.76, 1.78);        // duża podstawa 3×2
    penRect(ctx, s, 1.12, 0.15, 0.76, 1.45);       // kwadrat na górze (wchodzi w podstawę)
  },

  // ----- Stajnia -----
  kawaleria1: (ctx, s) => {
    // litera Γ
    penPolygon(ctx, s, [[0.12, 0.12], [1.88, 0.12], [1.88, 0.88], [0.88, 0.88], [0.88, 1.88], [0.12, 1.88]], false);
  },
  ciezkaKawaleria: (ctx, s) => {
    penRect(ctx, s, 0.12, 0.12, 1.76, 1.76);       // kwadrat 2×2
    penLine(ctx, s, 1, 0.12, 1, 1.88);             // kreska w środku
    penWave(ctx, s, 1.1, 0.5, 0.7);                // falki w prawej połowie
    penWave(ctx, s, 1.1, 1.0, 0.7);
    penWave(ctx, s, 1.1, 1.5, 0.7);
  },
  kawaleria2: (ctx, s) => {
    drawSmallL(ctx, s);
  },
  paladyn: (ctx, s) => {
    drawSmallL(ctx, s);
    penArrow(ctx, s, 1.5, 1.7, 1.5, 0.3);          // strzałka w górę
  },
  ulan: (ctx, s) => {
    penRect(ctx, s, 0.12, 0.12, 1.76, 1.76);       // kwadrat 2×2
    penArrow(ctx, s, 0.35, 1.65, 1.65, 0.35);      // skośna strzałka
  },
};
