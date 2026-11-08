# Jednostki obok jednostek, oddziały z ramki, budowanie po ruchu — Plan Brief

> Full plan: `context/changes/mvp-oddzialy-i-budowanie/plan.md`

## What & Why
Trzy stare punkty MVP (1, 2, 6). Gracz ma swobodniej mieszać budowanie i ruch, sam decydować, które jednostki
idą razem, i stawiać nowe jednostki trochę dalej od budynku.

## Starting Point
Tura ma dwie fazy (budowa → ruch), oddziały tworzą się same ze stykania, nowa jednostka tylko przy budynku.

## Desired End State
Brak faz; każda jednostka ma 5 darmowych kroków, dalsze z wspólnych punktów budowy; oddziały z ramki myszki
na jedną turę; nowa jednostka może stanąć obok swojej jednostki przy budynku.

## Key Decisions Made
| Decision | Choice | Why |
|---|---|---|
| Stawianie dalej | o 1 jednostkę, rogiem też, nowa się liczy | ustalone z autorem |
| Oddziały | domyślnie każdy sam; ramka; tylko stykające się; do końca tury | ustalone z autorem |
| Punkty oddziału | najsłabszy decyduje; 1 punkt budowy na krok za oddział | ustalone z autorem |
| Ruch a budowa | 5 darmowych na jednostkę, potem wspólne punkty budowy | ustalone z autorem |
| Bonus koszar | tylko na koszary, nie na ruch | ustalone z autorem |

## Phases at a Glance
| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Zasady i testy | nowe `rules.js` + przepisane testy | dużo starych testów zakłada fazy |
| 2. Interfejs | ramka myszki, panel bez faz | „click” po przeciągnięciu |

**Estimated effort:** 1 sesja.

## Open Risks & Assumptions
- Po śmierci członka oddział może się „rozpaść” – liczymy stykanie się na nowo przy każdym odczycie.
