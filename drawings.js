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

// =====================================================
//  RYSUNKI BUDOWLI (mury, bramy, wieże, zamek, dom)
//  Tu ctx.fillStyle = PEŁNY kolor gracza (budowle są mocniej pokolorowane niż jednostki).
//  Szare i brązowe części malujemy własnym kolorem, a kolor gracza pokazuje, czyja to budowla.
// =====================================================

const STONE_COLOR = "#a3a3a3";   // szary kamień
const WOOD_COLOR = "#8d6e63";    // brązowe drewno
const DARK_WOOD_COLOR = "#5d4037";

// Maluje kształt innym kolorem (np. szarym), a potem przywraca kolor gracza
function withColor(ctx, color, drawFn) {
  const playerColor = ctx.fillStyle;
  ctx.fillStyle = color;
  drawFn();
  ctx.fillStyle = playerColor;
}

// Mała chorągiewka w kolorze gracza (pokazuje, czyja to budowla)
function drawFlag(ctx, s, x, y) {
  penLine(ctx, s, x, y, x, y + 0.45);
  colorPolygon(ctx, s, [[x, y], [x + 0.4, y + 0.12], [x, y + 0.24]]);
}

// Brama: prostokąt 2×2 z łukiem i kratą w środku. wallColor = drewno albo kamień
function drawGate(ctx, s, wallColor) {
  withColor(ctx, wallColor, () => colorRect(ctx, s, 0, 0, 2, 2));
  // Otwór bramy: łuk u góry, proste boki
  ctx.beginPath();
  ctx.moveTo(0.4 * s, 2 * s);
  ctx.lineTo(0.4 * s, 1.1 * s);
  ctx.arc(1 * s, 1.1 * s, 0.6 * s, Math.PI, 0);
  ctx.lineTo(1.6 * s, 2 * s);
  ctx.closePath();
  withColor(ctx, "#f2f2f2", () => ctx.fill());
  ctx.stroke();
  // Krata w otworze
  ctx.save();
  ctx.clip();                       // rysujemy TYLKO w środku otworu
  for (const x of [0.7, 1, 1.3]) penLine(ctx, s, x, 0.4, x, 2);
  for (const y of [1.2, 1.5, 1.8]) penLine(ctx, s, 0.4, y, 1.6, y);
  ctx.restore();
}

const BUILDING_DRAWINGS = {
  // Dom 2×2: czerwony kwadrat z kreskami jak w zeszycie
  dom: (ctx, s) => {
    colorRect(ctx, s, 0, 0, 2, 2);
    penLine(ctx, s, 1, 0, 1, 2);
    penLine(ctx, s, 0, 1, 2, 1);
  },

  // Palisada: trzy zaostrzone pale w kolorze gracza
  palisada: (ctx, s) => {
    for (let i = 0; i < 3; i++) {
      const x = i / 3;
      colorPolygon(ctx, s, [[x, 1], [x, 0.35], [x + 1 / 6, 0], [x + 1 / 3, 0.35], [x + 1 / 3, 1]]);
    }
  },

  // Mur: szare cegły z paskiem w kolorze gracza na górze
  mur: (ctx, s) => {
    withColor(ctx, STONE_COLOR, () => colorRect(ctx, s, 0, 0, 1, 1));
    colorRect(ctx, s, 0, 0, 1, 0.3);
    penLine(ctx, s, 0, 0.65, 1, 0.65);
    penLine(ctx, s, 0.5, 0.3, 0.5, 0.65);
    penLine(ctx, s, 0.25, 0.65, 0.25, 1);
    penLine(ctx, s, 0.75, 0.65, 0.75, 1);
  },

  // Brama drewniana: brązowa, z kratą i chorągiewką
  bramaDrewniana: (ctx, s) => {
    drawGate(ctx, s, WOOD_COLOR);
    drawFlag(ctx, s, 1, 0.05);
  },

  // Brama kamienna: szara, z blankami na górze, kratą i chorągiewką
  bramaKamienna: (ctx, s) => {
    drawGate(ctx, s, STONE_COLOR);
    for (const x of [0, 0.6, 1.2, 1.7]) {
      withColor(ctx, "#f2f2f2", () => colorRect(ctx, s, x + 0.15, 0, 0.15, 0.15));  // przerwy między blankami
    }
    drawFlag(ctx, s, 1, 0.2);
  },

  // Wieża drewniana 1×3: ciemny dach, pasek w kolorze gracza, brązowy korpus z okienkiem
  wiezaDrewniana: (ctx, s) => {
    withColor(ctx, DARK_WOOD_COLOR, () => colorPolygon(ctx, s, [[0, 1], [0.5, 0.05], [1, 1]]));
    withColor(ctx, WOOD_COLOR, () => colorRect(ctx, s, 0, 1, 1, 2));
    colorRect(ctx, s, 0, 1, 1, 0.35);
    withColor(ctx, "#f2f2f2", () => colorRect(ctx, s, 0.35, 1.6, 0.3, 0.45));
  },

  // Wieża z kamienia 1×2: szara z blankami, drzwiami i kropką w kolorze gracza
  wiezaKamienna: (ctx, s) => {
    withColor(ctx, STONE_COLOR, () => {
      colorRect(ctx, s, 0, 0.25, 1, 1.75);
      colorRect(ctx, s, 0, 0, 0.3, 0.25);
      colorRect(ctx, s, 0.35, 0, 0.3, 0.25);
      colorRect(ctx, s, 0.7, 0, 0.3, 0.25);
    });
    colorCircle(ctx, s, 0.5, 0.85, 0.14);
    withColor(ctx, "#5f6b7a", () => colorPolygon(ctx, s, [[0.3, 2], [0.3, 1.6], [0.5, 1.4], [0.7, 1.6], [0.7, 2]]));
  },

  // Zamek: szary, z dwiema wieżyczkami (prawa w kolorze gracza) i dwiema bramami
  zamek: (ctx, s) => {
    withColor(ctx, STONE_COLOR, () =>
      colorPolygon(ctx, s, [[0, 0], [1, 0], [1, 1], [2, 1], [2, 0], [3, 0], [3, 1], [4, 1], [4, 3], [0, 3]])
    );
    colorRect(ctx, s, 2, 0, 1, 1);                                   // wieżyczka w kolorze gracza
    withColor(ctx, "#5f6b7a", () =>                                  // lewe drzwi (ciemne)
      colorPolygon(ctx, s, [[0.9, 3], [0.9, 2.1], [1.3, 1.7], [1.7, 2.1], [1.7, 3]])
    );
    colorPolygon(ctx, s, [[2.3, 3], [2.3, 2.1], [2.7, 1.7], [3.1, 2.1], [3.1, 3]]);  // prawe drzwi w kolorze gracza
  },
};

// =====================================================
//  UKOŚNE MURY I PALISADY
//  Gdy kawałek muru łączy się z sąsiadami TYLKO po skosie, rysujemy go jako ukośny pasek.
//  Tu (0, 0) to ŚRODEK kratki, a pasek leży poziomo - game.js obraca go o 45°.
//  Pasek ma długość przekątnej kratki (√2 ≈ 1.41), więc sięga od rogu do rogu.
// =====================================================

const HALF_DIAGONAL = Math.SQRT2 / 2;   // połowa przekątnej kratki (ok. 0.71)

const WALL_DIAGONAL_DRAWINGS = {
  // Palisada: 4 zaostrzone pale w rzędzie
  palisada: (ctx, s) => {
    const stake = (HALF_DIAGONAL * 2) / 4;   // szerokość jednego pala
    for (let i = 0; i < 4; i++) {
      const x = -HALF_DIAGONAL + i * stake;
      colorPolygon(ctx, s, [[x, 0.22], [x, -0.08], [x + stake / 2, -0.32], [x + stake, -0.08], [x + stake, 0.22]]);
    }
  },

  // Mur: szary pasek cegieł z paskiem w kolorze gracza
  mur: (ctx, s) => {
    const L = HALF_DIAGONAL;
    withColor(ctx, STONE_COLOR, () => colorRect(ctx, s, -L, -0.24, 2 * L, 0.48));
    colorRect(ctx, s, -L, -0.24, 2 * L, 0.14);
    penLine(ctx, s, -L, 0.07, L, 0.07);
    for (const x of [-0.35, 0, 0.35]) penLine(ctx, s, x, -0.1, x, 0.07);
    for (const x of [-0.53, -0.18, 0.18, 0.53]) penLine(ctx, s, x, 0.07, x, 0.24);
  },
};
