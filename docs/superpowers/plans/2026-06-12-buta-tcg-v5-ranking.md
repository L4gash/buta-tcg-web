# BUTA TCG v5 — Página de Ranking · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Ranking" page that shows league standings read from a second public Google Sheet, plus a static points-system section, per `docs/superpowers/specs/2026-06-12-buta-tcg-v5-ranking-design.md`.

**Architecture:** Pure-frontend addition to the live v4 static site. `js/data.js` gains `RANKING_CSV_URL` consumption via `loadRanking()` + `FALLBACK_RANKING` + a pure `filtrarRanking()` (tested). New `ranking.html` page + `js/ranking.js` renderer (responsive table → cards). "Ranking" nav item added to all 5 pages. No backend, no Apps Script, no inscripciones-sheet changes.

**Tech Stack:** unchanged (Node 24 tests `npm test` = `node --test tests/*.test.mjs`; serve :3000; `node screenshot.mjs <url> [label] [WxH]`). Currently 22/22 tests green.

**Site is LIVE** at https://l4gash.github.io/buta-tcg-web/ . Work on a branch off `main`; do NOT push until the deploy task. Console signature "🐗 BUTA TCG" is the deploy-freshness signal.

**Verified data source:** the second sheet's ranking tab is readable at
`https://docs.google.com/spreadsheets/d/1N4S4eMmxVJxxyXVrOQpSI1vg3-u_LrC3o3b9ZzHRriY/gviz/tq?tqx=out:csv&gid=2006498169`
Header row: `Pos,Jugador,Victorias,Torneos Jugados,PL Totales,Ultima fecha` (+2 unnamed cols). 39 real players then empty filler rows (blank `Jugador`).

---

## File Structure

```
js/config.js          # + RANKING_CSV_URL (Task 1)
js/data.js            # + FALLBACK_RANKING, loadRanking, filtrarRanking (Task 1)
tests/data.test.mjs   # + filtrarRanking tests (Task 1)
js/ranking.js         # NEW: render standings table/cards (Task 2)
ranking.html          # NEW: page (chrome + hero + #tabla-ranking + points section) (Task 2)
index.html, torneos.html, resultados.html, nosotros.html  # + "Ranking" nav item (Task 3)
```

---

### Task 1: Data layer — `RANKING_CSV_URL`, `loadRanking`, `filtrarRanking`, fallback (TDD)

**Files:**
- Modify: `js/config.js`, `js/data.js`
- Test: `tests/data.test.mjs`

- [ ] **Step 1: Add the ranking URL to `js/config.js`.** After the existing `export const APPS_SCRIPT_URL = '...';` line, add:

```js
// Ranking de liga (2º planilla pública, pestaña de puntos). Leída como CSV vía gviz.
export const RANKING_CSV_URL = 'https://docs.google.com/spreadsheets/d/1N4S4eMmxVJxxyXVrOQpSI1vg3-u_LrC3o3b9ZzHRriY/gviz/tq?tqx=out:csv&gid=2006498169';
```

- [ ] **Step 2: Append failing test to `tests/data.test.mjs`** (add `filtrarRanking, FALLBACK_RANKING` to the existing import on line 3):

```js
test('filtrarRanking descarta filas sin Jugador', () => {
  const rows = [
    { Pos: '1', Jugador: 'Juanny Gordillo', 'PL Totales': '46' },
    { Pos: '2', Jugador: '  ', 'PL Totales': '0' },
    { Pos: '3', Jugador: '', 'PL Totales': '0' },
    { Pos: '4', Jugador: 'Alex Herrera', 'PL Totales': '43' },
  ];
  assert.deepEqual(filtrarRanking(rows).map((r) => r.Jugador), ['Juanny Gordillo', 'Alex Herrera']);
  assert.deepEqual(filtrarRanking([]), []);
});

test('FALLBACK_RANKING tiene jugadores con PL', () => {
  assert.ok(FALLBACK_RANKING.length >= 3);
  assert.equal('Jugador' in FALLBACK_RANKING[0], true);
  assert.equal('PL Totales' in FALLBACK_RANKING[0], true);
});
```

- [ ] **Step 3: Run `npm test` — the 2 new tests FAIL** (`filtrarRanking`/`FALLBACK_RANKING` not exported). Other 22 pass.

- [ ] **Step 4: Implement in `js/data.js`.** Add the import of the new URL: change the top import line
`import { TORNEOS_CSV_URL, RESULTADOS_CSV_URL } from './config.js';`
to
`import { TORNEOS_CSV_URL, RESULTADOS_CSV_URL, RANKING_CSV_URL } from './config.js';`

Then, immediately AFTER the `export const loadResultados = ...` line (currently line 69), add:

```js

// ---- Ranking de liga (2º planilla) ----
export const FALLBACK_RANKING = [
  { Pos: '1', Jugador: 'Juanny Gordillo', 'Torneos Jugados': '3', 'PL Totales': '46', 'Ultima fecha': 'domingo 14/6' },
  { Pos: '2', Jugador: 'Alex Herrera', 'Torneos Jugados': '3', 'PL Totales': '43', 'Ultima fecha': 'domingo 14/6' },
  { Pos: '3', Jugador: 'Mariano Castro', 'Torneos Jugados': '3', 'PL Totales': '38', 'Ultima fecha': 'domingo 14/6' },
  { Pos: '4', Jugador: 'Gaston Gimenez', 'Torneos Jugados': '2', 'PL Totales': '36', 'Ultima fecha': 'sábado 13/6' },
  { Pos: '5', Jugador: 'Charly Ramallo', 'Torneos Jugados': '3', 'PL Totales': '31', 'Ultima fecha': 'domingo 14/6' },
];

// Descarta filas de relleno (sin nombre de jugador).
export const filtrarRanking = (rows) => rows.filter((r) => String(r?.Jugador ?? '').trim() !== '');

export const loadRanking = () => fetchCsv(RANKING_CSV_URL, FALLBACK_RANKING);
```

- [ ] **Step 5: Run `npm test` — all pass** (22 + 2 = 24).

- [ ] **Step 6: Smoke-test the live fetch shape** (the gviz endpoint is reachable; confirm parsing). Create a throwaway `tmp-rank.mjs`:

```js
import { parseCsv } from './js/csv.js';
const url = 'https://docs.google.com/spreadsheets/d/1N4S4eMmxVJxxyXVrOQpSI1vg3-u_LrC3o3b9ZzHRriY/gviz/tq?tqx=out:csv&gid=2006498169';
const rows = parseCsv(await (await fetch(url)).text());
console.log('cols:', Object.keys(rows[0]));
console.log('primera fila:', rows[0].Jugador, '·', rows[0]['PL Totales']);
console.log('total filas:', rows.length);
```

Run `node tmp-rank.mjs`. Expected: cols include `Jugador` and `PL Totales`; first row is `Juanny Gordillo · 46`. Delete `tmp-rank.mjs` after.

- [ ] **Step 7: Commit**

```bash
git add js/config.js js/data.js tests/data.test.mjs
git commit -m "feat: league ranking data source and filtrarRanking helper"
```

---

### Task 2: Ranking page (`ranking.html` + `js/ranking.js`)

**Files:**
- Create: `ranking.html`, `js/ranking.js`

The page uses the SAME chrome as the other pages. Copy `<head>`/`<header>`/`<footer>` from `resultados.html` verbatim and change only: `<title>` → "Ranking — BUTA TCG"; meta description → "Ranking de liga de BUTA TCG: puntos acumulados por jugador en la temporada 2026."; nav active item → Ranking (see Task 3 for the exact nav block — use the version WITH the Ranking link, marking Ranking active here). The build-comment line after `<head>` stays identical.

- [ ] **Step 1: Create `ranking.html`.** Use the resultados.html chrome (head/header/footer) with the Ranking nav (Task 3 markup) and Ranking active. Body chrome opens `<body class="min-h-screen bg-noche font-body text-white antialiased">`. `<main class="mx-auto max-w-4xl px-4">` contains:

```html
    <section class="pb-4 pt-12 text-center">
      <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Temporada 2026</p>
      <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">Ranking de liga</h1>
      <p class="mx-auto mt-4 max-w-xl font-body text-sm leading-[1.7] text-humo">Puntos acumulados por jugador a lo largo de la temporada. Se actualiza después de cada fecha.</p>
    </section>

    <section id="tabla-ranking" class="py-6"><div class="skeleton h-96 w-full"></div></section>

    <section aria-labelledby="puntos-titulo" class="py-10">
      <h2 id="puntos-titulo" class="text-center font-display text-2xl font-bold italic text-white" style="letter-spacing:-0.03em;">¿Cómo se ganan los puntos?</h2>
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div class="rounded-2xl border border-primario/50 bg-tinta/70 p-4 text-center shadow-glow-azul">
          <p class="text-2xl">⚔️</p>
          <p class="mt-2 font-display font-bold italic text-white">Victoria</p>
          <p class="font-display text-xl font-bold text-primario-glow">3 pts</p>
        </div>
        <div class="rounded-2xl border border-borde bg-tinta/70 p-4 text-center shadow-card">
          <p class="text-2xl">🎖️</p>
          <p class="mt-2 font-display font-bold italic text-white">Top 8</p>
          <p class="font-display text-xl font-bold text-violeta-glow">+2</p>
        </div>
        <div class="rounded-2xl border border-borde bg-tinta/70 p-4 text-center shadow-card">
          <p class="text-2xl">🏆</p>
          <p class="mt-2 font-display font-bold italic text-white">Top 4</p>
          <p class="font-display text-xl font-bold text-violeta-glow">+1</p>
        </div>
        <div class="rounded-2xl border border-borde bg-tinta/70 p-4 text-center shadow-card">
          <p class="text-2xl">⚔️</p>
          <p class="mt-2 font-display font-bold italic text-white">Top 2</p>
          <p class="font-display text-xl font-bold text-violeta-glow">+1</p>
        </div>
        <div class="col-span-2 rounded-2xl border border-oro/60 bg-tinta/70 p-4 text-center shadow-glow-violeta sm:col-span-1">
          <p class="text-2xl">👑</p>
          <p class="mt-2 font-display font-bold italic text-white">Campeón</p>
          <p class="font-display text-xl font-bold text-oro">+1</p>
        </div>
      </div>
      <p class="mt-4 text-center font-body text-xs leading-[1.7] text-humo/80">Los bonos por top son acumulativos: el campeón suma victoria + Top 8 + Top 4 + Top 2 + Campeón. Los puntos los lleva la organización; acá ves el total.</p>
    </section>
```

Before `</body>`: `<script type="module" src="js/ranking.js"></script>`

- [ ] **Step 2: Create `js/ranking.js`:**

```js
import { loadRanking, filtrarRanking, esc } from './data.js';

const $ = (id) => document.getElementById(id);
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const colorPos = { 1: 'text-oro', 2: 'text-[#c0c4d8]', 3: 'text-[#cd7f32]' };

function fila(r) {
  const pos = Number(r.Pos);
  const medalla = MEDALLAS[pos] ?? '';
  const colPos = colorPos[pos] ?? 'text-humo';
  const oro = pos === 1 ? 'border-oro/50 bg-gradient-to-r from-oro/10 to-transparent' : 'border-borde';
  const pl = esc(r['PL Totales'] ?? '0');
  const torneos = esc(r['Torneos Jugados'] ?? '');
  const fecha = esc(r['Ultima fecha'] ?? '');
  const nombre = esc(r.Jugador ?? '');

  // Escritorio: fila en grilla de 5 columnas. Celular: tarjeta (las columnas TORN./FECHA se ocultan).
  return `
    <div class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 border-t ${oro} px-3 py-3 sm:grid-cols-[3rem_1fr_5rem_6rem_7rem]">
      <span class="font-display text-lg font-bold ${colPos}">${medalla}${pos || ''}</span>
      <span class="min-w-0 truncate font-display font-bold italic text-white">${nombre}</span>
      <span class="text-right font-display text-xl font-bold text-primario-glow sm:text-center sm:text-base">${pl}<span class="ml-1 font-body text-[0.6rem] font-normal text-humo sm:hidden">PL</span></span>
      <span class="hidden text-center font-body text-sm text-humo sm:block">${torneos}</span>
      <span class="hidden text-right font-body text-sm text-humo sm:block">${fecha}</span>
      <span class="col-span-2 -mt-1 font-body text-[0.7rem] text-humo/80 sm:hidden">${torneos ? `${torneos} torneos` : ''}${torneos && fecha ? ' · ' : ''}${fecha ? `últ. ${fecha}` : ''}</span>
    </div>`;
}

function render(rows) {
  const cont = $('tabla-ranking');
  if (!rows.length) {
    cont.innerHTML = '<p class="text-center font-body text-humo">Todavía no hay puntos cargados.</p>';
    return;
  }
  cont.innerHTML = `
    <div class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      <div class="grid grid-cols-[2.5rem_1fr_auto] gap-x-3 bg-noche/60 px-3 py-2 font-body text-[0.65rem] uppercase tracking-widest text-humo sm:grid-cols-[3rem_1fr_5rem_6rem_7rem]">
        <span>#</span>
        <span>Jugador</span>
        <span class="text-right sm:text-center">PL</span>
        <span class="hidden text-center sm:block">Torn.</span>
        <span class="hidden text-right sm:block">Últ. fecha</span>
      </div>
      ${rows.map(fila).join('')}
    </div>`;
}

render(filtrarRanking(await loadRanking()));
```

- [ ] **Step 3: Verify with real data.** Server on :3000 (check; start `node serve.mjs` background only if down).

```bash
node screenshot.mjs http://localhost:3000/ranking.html v5-ranking
node screenshot.mjs http://localhost:3000/ranking.html v5-ranking-m 390x844
```

READ both: desktop shows the 5-column table (Juanny Gordillo #1 gold tint + 🥇, PL 46 in blue, 3 torneos, domingo 14/6), ~39 players, header row, then the 5 points cards + acumulativo note. Mobile: each row is a compact card (medal+name, PL big on the right, "3 torneos · últ. domingo 14/6" small), no horizontal overflow; points cards reflow to 2-up. Confirm no broken layout, gold tint only on row 1.

- [ ] **Step 4: `npm test` (24/24) and commit**

```bash
git add ranking.html js/ranking.js
git commit -m "feat: ranking page with league standings table and points section"
```

---

### Task 3: Add "Ranking" to the nav on all 5 pages

**Files:**
- Modify: `index.html`, `torneos.html`, `resultados.html`, `nosotros.html` (and `ranking.html` already has it from Task 2)

The current nav block (in every page) is:

```html
      <div class="flex items-center gap-1 font-body text-sm sm:gap-2">
        <a href="index.html" ...>Inicio</a>
        <a href="torneos.html" ...>Torneos</a>
        <a href="resultados.html" ...>Resultados</a>
        <a href="nosotros.html" ...>Nosotros</a>
      </div>
```

A "Ranking" link goes BETWEEN Resultados and Nosotros. Each page marks its own link active (`aria-current="page"` + `text-white`); all others use `text-humo`. The active classes are `rounded-md px-2 py-1.5 text-white hover:text-primario-glow sm:px-3`; inactive are `rounded-md px-2 py-1.5 text-humo hover:text-primario-glow sm:px-3`.

- [ ] **Step 1: `index.html`** — insert the Ranking link (inactive) after the `resultados.html` link in the nav:

```html
        <a href="ranking.html" class="rounded-md px-2 py-1.5 text-humo hover:text-primario-glow sm:px-3">Ranking</a>
```

- [ ] **Step 2: `torneos.html`** — insert the same inactive Ranking link after the `resultados.html` link.

- [ ] **Step 3: `resultados.html`** — insert the same inactive Ranking link after the `resultados.html` link (Resultados stays the active one here).

- [ ] **Step 4: `nosotros.html`** — insert the same inactive Ranking link after the `resultados.html` link.

- [ ] **Step 5: Verify nav fits at 390px on every page.** Server running. For each page, screenshot mobile and READ the header only:

```bash
node screenshot.mjs http://localhost:3000/index.html v5-nav-inicio-m 390x844
node screenshot.mjs http://localhost:3000/ranking.html v5-nav-ranking-m 390x844
```

READ: the 5 nav items (Inicio · Torneos · Resultados · Ranking · Nosotros) fit on one row at 390px without wrapping/overflow or pushing the logo off-screen. If they overflow, reduce nav gap/padding (e.g. `gap-0.5 px-1.5 sm:gap-2 sm:px-3`) consistently across all 5 pages and re-screenshot. Spot-check one desktop screenshot too.

- [ ] **Step 6: `npm test` (24/24) and commit**

```bash
git add index.html torneos.html resultados.html nosotros.html
git commit -m "feat: add Ranking to site navigation"
```

---

### Task 4: Polish + deploy

**Files:** Modify any of `ranking.html`, `js/ranking.js`, `css/custom.css` (only if a fix is needed); none for deploy.

- [ ] **Step 1: Round 1** — screenshot ranking desktop + mobile (`v5-pol-*`) and READ against: table rows align cleanly (numbers/medals column steady, long names truncate not wrap), header columns line up with row columns at the `sm` breakpoint, PL emphasis (blue) reads as the key number, gold tint only on #1, points cards even and the Campeón card's gold stands out, spacing rhythm matches the rest of the site, no overflow at 390px, every row legible (contrast). Also confirm the nav active state shows "Ranking" highlighted on ranking.html.
- [ ] **Step 2:** Fix concrete issues in `ranking.html`/`js/ranking.js`/`css`; re-screenshot (round 2). `npm test` 24/24.
- [ ] **Step 3: Commit** any polish fixes:

```bash
git add ranking.html js/ranking.js css/
git commit -m "polish: ranking page visual refinement"
```

- [ ] **Step 4: Merge + deploy.** Merge the branch to `main` (after `npm test` 24/24), push `origin main`.
- [ ] **Step 5: Live verify.** Poll https://l4gash.github.io/buta-tcg-web/ranking.html until fresh (puppeteer, cache disabled, wait for console signature; retry ~12× every 20s). Confirm: the standings table loads from the 2nd sheet (Juanny Gordillo #1), the points section renders, and ALL 5 pages load with the new nav and no console errors. Screenshot ranking desktop + mobile and READ. Report the live URL + what was verified.

---

## Self-Review (completed by plan author)

- **Spec coverage:** new ranking.html + nav item on 5 pages (Tasks 2,3) ✓ · 2nd-sheet CSV via RANKING_CSV_URL + loadRanking + fallback (Task 1) ✓ · columns Pos/Jugador/PL Totales/Torneos Jugados/Ultima fecha, sheet order, medals, gold #1, blue PL (Task 2) ✓ · filtrarRanking drops empty rows + tests (Task 1) ✓ · responsive table→cards (Task 2) ✓ · static points section in theme (Task 2) ✓ · esc on all sheet fields (Task 2) ✓ · empty-data message (Task 2) ✓ · verification: tests, screenshots ≥2 rounds, nav-fit @390px, live check (Tasks 2-4) ✓ · no backend/inscripciones change (nothing touches Apps Script/those CSVs) ✓ · out-of-scope (points calc, JPGs, special-tournament block, editing) respected ✓
- **Placeholder scan:** none — all code complete; the smoke-test `tmp-rank.mjs` is a throwaway described concretely and deleted.
- **Type consistency:** `loadRanking`/`filtrarRanking`/`FALLBACK_RANKING` names match across Tasks 1-2; column keys with spaces (`'PL Totales'`, `'Torneos Jugados'`, `'Ultima fecha'`) accessed via bracket notation consistently in FALLBACK, tests, and ranking.js; `RANKING_CSV_URL` exported in config and imported in data.js; ids `tabla-ranking`/`puntos-titulo` consistent between ranking.html and ranking.js.
