// =====================================================
//  DWA BLANKI II - TŁA PLANSZY (tajne kody w EDYTORZE)
//  design:mountain = góry, design:meadow = łąka, design:space = kosmos,
//  design:off = bez tła.
//
//  Tło jest "lekko widoczne": rysujemy je półprzezroczyste pod kratkami.
//  Każde tło malujemy RAZ na ukrytym canvasie (jak naklejkę),
//  a potem tylko je przyklejamy w każdej klatce - tak jest dużo szybciej.
//  Wszystko rysowane w kodzie - bez obrazków z internetu.
// =====================================================

// Kod -> nazwa tła (null = wyłącz tło)
const DESIGN_CODES = {
  "design:mountain": "mountain",
  "design:meadow": "meadow",
  "design:space": "space",
  "design:off": null,
};

// Polskie nazwy (do napisu w czacie) i jak mocno widać każde tło (0 = wcale, 1 = całkiem)
const DESIGNS = {
  mountain: { name: "Góry", alpha: 0.45, draw: drawMountainDesign },
  meadow:   { name: "Łąka", alpha: 0.45, draw: drawMeadowDesign },
  space:    { name: "Kosmos", alpha: 0.55, draw: drawSpaceDesign },
};

let boardDesign = null;       // które tło jest teraz włączone (albo null)
let designPicture = null;     // gotowa "naklejka": { key, canvas }

// Czy ten tekst to kod tła? (wielkość liter i spacje nie mają znaczenia)
function isDesignCode(text) {
  const code = String(text).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(DESIGN_CODES, code);
}

// Włącza tło z kodu. Zwraca napis dla gracza, np. "Tło: Góry"
function useDesignCode(text) {
  boardDesign = DESIGN_CODES[String(text).trim().toLowerCase()];
  return boardDesign ? "Tło: " + DESIGNS[boardDesign].name : "Tło wyłączone";
}

// Rysuje tło na planszy (woła je drawBoardGrid z game.js, zanim narysuje kratki)
function drawBoardDesign(x, y, width, height) {
  if (!boardDesign) return;

  // Naklejkę malujemy od nowa tylko, gdy zmieniło się tło albo rozmiar planszy
  const key = boardDesign + "-" + width + "x" + height;
  if (!designPicture || designPicture.key !== key) {
    const picture = document.createElement("canvas");   // ukryty canvas - nikt go nie widzi
    picture.width = width;
    picture.height = height;
    DESIGNS[boardDesign].draw(picture.getContext("2d"), width, height);
    designPicture = { key: key, canvas: picture };
  }

  ctx.save();
  ctx.globalAlpha = DESIGNS[boardDesign].alpha;   // "lekko widoczne"
  ctx.drawImage(designPicture.canvas, x, y);
  ctx.restore();
}

// --- Pomocnicze ---

// Losowa liczba od min do max
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Pionowy gradient (płynne przejście koloru z góry na dół) na cały prostokąt
function fillGradient(c, width, height, topColor, bottomColor) {
  const gradient = c.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  c.fillStyle = gradient;
  c.fillRect(0, 0, width, height);
}

// =====================================================
//  GÓRY
// =====================================================

function drawMountainDesign(c, w, h) {
  fillGradient(c, w, h, "#8ec5ff", "#e6f3ff");   // niebo
  drawClouds(c, w, h);
  // Dwa pasma gór: dalsze (jaśniejsze) i bliższe (ciemniejsze)
  drawMountainRange(c, w, h, h * 0.75, h * 0.25, h * 0.5, "#7f93ad");
  drawMountainRange(c, w, h, h * 0.95, h * 0.45, h * 0.7, "#4f6178");
}

// Kilka białych chmurek z kółek
function drawClouds(c, w, h) {
  c.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i++) {
    const cx = randomBetween(0.1, 0.9) * w;
    const cy = randomBetween(0.06, 0.25) * h;
    const size = randomBetween(0.04, 0.07) * w;
    for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.2, 0.75], [-0.9, 0.2, 0.7], [0.4, -0.4, 0.7]]) {
      c.beginPath();
      c.arc(cx + dx * size, cy + dy * size, r * size, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// Pasmo gór: zygzak szczytów od lewej do prawej, ze śniegiem na czubkach.
// baseY = gdzie kończą się góry na dole, topMin/topMax = jak wysoko mogą być szczyty
function drawMountainRange(c, w, h, baseY, topMin, topMax, color) {
  const peaks = [];
  const count = 5;
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * w + randomBetween(-0.05, 0.05) * w;
    peaks.push({ x: x, peakY: randomBetween(topMin, topMax), valleyX: x + w / count / 2 });
  }

  // Sylwetka gór
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, h);
  for (const peak of peaks) {
    c.lineTo(peak.x, peak.peakY);
    c.lineTo(peak.valleyX, baseY - (baseY - peak.peakY) * 0.35);   // dolina między szczytami
  }
  c.lineTo(w, h);
  c.closePath();
  c.fill();

  // Śnieg: biały trójkącik z "postrzępionym" dołem na każdym szczycie
  c.fillStyle = "#ffffff";
  for (const peak of peaks) {
    const capH = (baseY - peak.peakY) * 0.2;
    const capW = capH * 0.8;
    c.beginPath();
    c.moveTo(peak.x, peak.peakY);
    c.lineTo(peak.x + capW, peak.peakY + capH);
    c.lineTo(peak.x + capW * 0.3, peak.peakY + capH * 0.75);
    c.lineTo(peak.x, peak.peakY + capH);
    c.lineTo(peak.x - capW * 0.3, peak.peakY + capH * 0.75);
    c.lineTo(peak.x - capW, peak.peakY + capH);
    c.closePath();
    c.fill();
  }
}

// =====================================================
//  ŁĄKA
// =====================================================

function drawMeadowDesign(c, w, h) {
  fillGradient(c, w, h, "#a8dcff", "#eaf7ff");   // niebo
  // Słońce w prawym górnym rogu
  c.fillStyle = "#ffd43b";
  c.beginPath();
  c.arc(w * 0.85, h * 0.14, Math.min(w, h) * 0.08, 0, Math.PI * 2);
  c.fill();
  drawClouds(c, w, h);
  // Dwa pagórki: dalszy (jasny) i bliższy (ciemniejszy)
  drawHill(c, w, h, h * 0.45, "#9ad46b");
  drawHill(c, w, h, h * 0.6, "#6fbf4a");
  // Źdźbła trawy i kwiatki na bliższym pagórku
  drawGrassAndFlowers(c, w, h, h * 0.65);
}

// Łagodny pagórek: od lewej krawędzi do prawej, z zaokrąglonym czubkiem
function drawHill(c, w, h, topY, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, topY + h * 0.08);
  c.quadraticCurveTo(w * randomBetween(0.3, 0.7), topY - h * 0.12, w, topY + h * 0.05);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.closePath();
  c.fill();
}

function drawGrassAndFlowers(c, w, h, fromY) {
  // Trawa: krótkie, lekko pochylone kreski
  c.strokeStyle = "#3f8f2a";
  c.lineWidth = 2;
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * w;
    const y = randomBetween(fromY, h);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + randomBetween(-4, 4), y - randomBetween(6, 12));
    c.stroke();
  }
  // Kwiatki: 5 płatków dookoła żółtego środka
  const petalColors = ["#ffffff", "#ff6b9d", "#b07cff", "#ff8c42"];
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * w;
    const y = randomBetween(fromY, h);
    c.fillStyle = petalColors[i % petalColors.length];
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      c.beginPath();
      c.arc(x + Math.cos(angle) * 4, y + Math.sin(angle) * 4, 3, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#ffd43b";
    c.beginPath();
    c.arc(x, y, 2.5, 0, Math.PI * 2);
    c.fill();
  }
}

// =====================================================
//  KOSMOS
// =====================================================

function drawSpaceDesign(c, w, h) {
  fillGradient(c, w, h, "#0b1026", "#1d2b5a");   // ciemne niebo
  // Mgławica: kolorowe, rozmyte "chmury" (gradient od koloru do przezroczystości)
  drawNebula(c, w * 0.3, h * 0.35, Math.max(w, h) * 0.35, "rgba(160, 80, 220, 0.45)");
  drawNebula(c, w * 0.7, h * 0.65, Math.max(w, h) * 0.3, "rgba(60, 140, 255, 0.35)");
  // Gwiazdy: dużo małych białych kropek
  c.fillStyle = "#ffffff";
  for (let i = 0; i < 220; i++) {
    c.globalAlpha = randomBetween(0.4, 1);
    c.beginPath();
    c.arc(Math.random() * w, Math.random() * h, randomBetween(0.5, 1.8), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  drawRingedPlanet(c, w * 0.78, h * 0.25, Math.min(w, h) * 0.1);
  drawMoon(c, w * 0.18, h * 0.78, Math.min(w, h) * 0.06);
}

function drawNebula(c, x, y, radius, color) {
  const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  c.fillStyle = gradient;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// Pomarańczowa planeta z pierścieniem (tylna połowa pierścienia jest ZA planetą)
function drawRingedPlanet(c, x, y, r) {
  c.strokeStyle = "#f3d59b";
  c.lineWidth = r * 0.15;
  c.beginPath();
  c.ellipse(x, y, r * 1.8, r * 0.45, -0.3, Math.PI, Math.PI * 2);   // tył pierścienia
  c.stroke();
  c.fillStyle = "#e8833a";
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(x, y, r * 1.8, r * 0.45, -0.3, 0, Math.PI);             // przód pierścienia
  c.stroke();
}

// Szary księżyc z kraterami
function drawMoon(c, x, y, r) {
  c.fillStyle = "#c9ccd6";
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#a3a7b5";
  for (const [dx, dy, size] of [[-0.3, -0.2, 0.25], [0.35, 0.1, 0.18], [-0.05, 0.4, 0.15]]) {
    c.beginPath();
    c.arc(x + dx * r, y + dy * r, size * r, 0, Math.PI * 2);
    c.fill();
  }
}
