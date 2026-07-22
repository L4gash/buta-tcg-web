# BUTA TCG — Salón de récords · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Récords" page showing all-time league records (más campeonatos, más Top 8, más podios, mejor promedio) as Top-3 mini-podiums with profile links, per `docs/superpowers/specs/2026-07-22-buta-tcg-salon-records-design.md`.

**Architecture:** Pure-frontend addition to the live static site. A new pure module `js/records-calc.js` (`calcularRecords`, unit-tested) computes the records from all Resultados rows, grouping players by `normalizarNombre`. A new page `records.html` + entry `js/records.js` renders them. One nav entry added in `js/layout.js`. No backend, no sheets.

**Tech Stack:** unchanged (Node 24 tests `npm test` = `node --test tests/*.test.mjs`; serve :3000; `node screenshot.mjs <url> [label] [WxH]`). Run `npm test` first to record the green baseline (currently 106; call it N).

**Site is LIVE** at https://l4gash.github.io/buta-tcg-web/ . Work on a branch off `main`; do NOT push until the deploy task. Console signature "🐗 BUTA TCG" is the deploy-freshness signal.

**Conventions (verified):**
- Pages load compiled `css/tailwind.css` (NOT the CDN), `js/theme.js`, `css/custom.css`; header/footer are empty `#site-header`/`#site-footer` filled by `js/layout.js` (loaded as the first module in `<body>`); a `<div id="volver">` holds the back-arrow; the page's own entry script is the last `<script type="module">`. Base new page markup on `ranking.html`.
- Pure helpers live in their own side-effect-free modules (e.g. `ranking-zonas.js`, `historial.js`); the page entry script (e.g. `ranking.js`) has the top-level `await load…()` + render. Follow this split: `records-calc.js` (pure) + `records.js` (entry).
- `js/buscar.js` exports `normalizarNombre(s)` (lowercase + strip accents).
- `js/data.js` exports `loadResultados()` (with fallback) and `esc`.
- Resultados rows: `{ torneo, puesto, nombre, deck, foto, temporada? }`.

---

## File Structure

```
js/records-calc.js         # NEW: pure calcularRecords (Task 1)
tests/records-calc.test.mjs # NEW: tests (Task 1)
records.html               # NEW: page (Task 2)
js/records.js              # NEW: render entry (Task 2)
js/layout.js               # + "Récords" nav entry (Task 2)
```

---

### Task 1: Pure `calcularRecords` (`js/records-calc.js`) — TDD

**Files:**
- Create: `js/records-calc.js`
- Test: `tests/records-calc.test.mjs`

- [ ] **Step 0: Baseline.** `npm test`, note passing count N (expected 106). All green.

- [ ] **Step 1: Write failing tests `tests/records-calc.test.mjs`:**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRecords } from '../js/records-calc.js';

const ROWS = [
  // Ana: 3 tops, 2 campeonatos, 3 podios, puestos 1,2,1
  { torneo: 'T1', puesto: '1', nombre: 'Ana' },
  { torneo: 'T2', puesto: '2', nombre: 'ana' },       // misma persona (normaliza)
  { torneo: 'T3', puesto: '1', nombre: 'Ana' },
  // Beto: 2 tops, 1 campeonato, 1 podio, puestos 1,5
  { torneo: 'T1', puesto: '5', nombre: 'Beto' },
  { torneo: 'T2', puesto: '1', nombre: 'Beto' },
  // Caro: 1 top, 0 campeonatos, 0 podios, puesto 8
  { torneo: 'T3', puesto: '8', nombre: 'Caro' },
  { torneo: 'T1', puesto: '', nombre: '' },           // fila basura: se ignora
];

test('campeonatos: cuenta puesto 1 y ordena desc', () => {
  const r = calcularRecords(ROWS);
  assert.deepEqual(r.campeonatos, [
    { nombre: 'Ana', valor: 2 },
    { nombre: 'Beto', valor: 1 },
  ]);
});

test('top8: cuenta apariciones', () => {
  const r = calcularRecords(ROWS);
  assert.deepEqual(r.top8.map((x) => [x.nombre, x.valor]), [['Ana', 3], ['Beto', 2], ['Caro', 1]]);
});

test('podios: cuenta puesto <= 3', () => {
  const r = calcularRecords(ROWS);
  assert.deepEqual(r.podios.map((x) => [x.nombre, x.valor]), [['Ana', 3], ['Beto', 1]]);
});

test('mejorPromedio: filtra por mínimo de tops', () => {
  // Con mínimo 5, nadie califica (todos tienen < 5 tops).
  assert.deepEqual(calcularRecords(ROWS).mejorPromedio, []);
  // Con mínimo 2: Ana (prom (1+2+1)/3 = 1.3) mejor que Beto ((1+5)/2 = 3.0).
  const r2 = calcularRecords(ROWS, { minPromedio: 2 });
  assert.deepEqual(r2.mejorPromedio, [
    { nombre: 'Ana', valor: 1.3 },
    { nombre: 'Beto', valor: 3 },
  ]);
});

test('top 3 como máximo y nombre canónico = variante más frecuente', () => {
  const rows = [
    { torneo: 'A', puesto: '1', nombre: 'Juanny Gordillo' },
    { torneo: 'B', puesto: '1', nombre: 'Juanny Gordillo' },
    { torneo: 'C', puesto: '1', nombre: 'juanny gordillo' },
    { torneo: 'A', puesto: '1', nombre: 'Beto' },
    { torneo: 'B', puesto: '1', nombre: 'Caro' },
    { torneo: 'C', puesto: '1', nombre: 'Dani' },
  ];
  const r = calcularRecords(rows);
  assert.equal(r.campeonatos.length, 3);            // no más de 3
  assert.equal(r.campeonatos[0].nombre, 'Juanny Gordillo'); // variante más frecuente
});

test('sin datos => arrays vacíos', () => {
  const r = calcularRecords([]);
  assert.deepEqual(r, { campeonatos: [], top8: [], podios: [], mejorPromedio: [] });
});
```

- [ ] **Step 2: Run `npm test` — the new tests FAIL** (`Cannot find module ../js/records-calc.js`). Rest green.

- [ ] **Step 3: Create `js/records-calc.js`:**

```js
// Récords históricos de la liga a partir de las filas de Resultados (todas las
// temporadas). Función pura: sin DOM ni fetch. La usa records.js y la testean en Node.
import { normalizarNombre } from './buscar.js';

// Agrega por jugador (agrupado por nombre normalizado) sobre todas las filas.
function agregarJugadores(rows) {
  const map = new Map(); // clave normalizada -> agregado
  (rows ?? []).forEach((r, i) => {
    const nombre = String(r?.nombre ?? '').trim();
    if (!nombre) return;
    const clave = normalizarNombre(nombre);
    const puesto = Number(r.puesto);
    let a = map.get(clave);
    if (!a) {
      a = { campeonatos: 0, top8: 0, podios: 0, suma: 0, conPuesto: 0, variantes: new Map() };
      map.set(clave, a);
    }
    a.top8 += 1;
    if (puesto === 1) a.campeonatos += 1;
    if (puesto >= 1 && puesto <= 3) a.podios += 1;
    if (puesto >= 1) { a.suma += puesto; a.conPuesto += 1; }
    const v = a.variantes.get(nombre) ?? { cantidad: 0, ultimo: -1 };
    v.cantidad += 1; v.ultimo = i;
    a.variantes.set(nombre, v);
  });
  for (const a of map.values()) {
    // Nombre canónico: la variante más frecuente (desempate: la más reciente).
    a.nombre = [...a.variantes.entries()]
      .sort((x, y) => y[1].cantidad - x[1].cantidad || y[1].ultimo - x[1].ultimo)[0][0];
    a.promedio = a.conPuesto ? a.suma / a.conPuesto : null;
  }
  return [...map.values()];
}

const alfabetico = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
const redondear1 = (n) => Math.round(n * 10) / 10;

export function calcularRecords(rows, opciones = {}) {
  const minPromedio = opciones.minPromedio ?? 5;
  const jugadores = agregarJugadores(rows);

  const top3 = (filtrados, comparador, valorDe) =>
    filtrados.slice().sort(comparador).slice(0, 3).map((j) => ({ nombre: j.nombre, valor: valorDe(j) }));

  return {
    campeonatos: top3(
      jugadores.filter((j) => j.campeonatos > 0),
      (a, b) => b.campeonatos - a.campeonatos || b.top8 - a.top8 || alfabetico(a, b),
      (j) => j.campeonatos),
    top8: top3(
      jugadores.filter((j) => j.top8 > 0),
      (a, b) => b.top8 - a.top8 || b.campeonatos - a.campeonatos || alfabetico(a, b),
      (j) => j.top8),
    podios: top3(
      jugadores.filter((j) => j.podios > 0),
      (a, b) => b.podios - a.podios || b.campeonatos - a.campeonatos || alfabetico(a, b),
      (j) => j.podios),
    mejorPromedio: top3(
      jugadores.filter((j) => j.top8 >= minPromedio && j.promedio != null),
      (a, b) => a.promedio - b.promedio || b.top8 - a.top8 || alfabetico(a, b),
      (j) => redondear1(j.promedio)),
  };
}
```

- [ ] **Step 4: Run `npm test` — all pass** (N + 6).

- [ ] **Step 5: Commit**

```bash
git add js/records-calc.js tests/records-calc.test.mjs
git commit -m "feat: calcularRecords pure module for all-time league records"
```

---

### Task 2: Page `records.html` + render `js/records.js` + nav entry

**Files:**
- Create: `records.html`, `js/records.js`
- Modify: `js/layout.js` (and `tests/layout.test.mjs` only if it asserts the exact nav list)

- [ ] **Step 1: Create `records.html`** by copying `ranking.html`'s chrome VERBATIM (head incl. build comment + OG tags + manifest/theme-color/apple-touch-icon + `css/tailwind.css` + `js/theme.js` + `css/custom.css`; the `<script type="module" src="js/layout.js">`, `#site-header`, `#site-footer`), changing only:
  - `<title>` → `Récords — BUTA TCG`; the `<meta name="description">` and the three `og:` (`og:title`, `og:description`, `og:url` → `.../records.html`) to a records-appropriate text, e.g. description "Récords históricos de la liga de BUTA TCG: más campeonatos, más Top 8, podios y mejor promedio."
  - `<main class="mx-auto max-w-4xl px-4">` containing:

```html
    <div id="volver" class="pt-4"></div>

    <section class="pb-4 pt-12 text-center">
      <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Salón de récords</p>
      <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">Récords de la liga</h1>
      <p class="mx-auto mt-4 max-w-xl font-body text-sm leading-[1.7] text-humo">Los números de toda la historia de la liga. Tocá un nombre para ver su perfil.</p>
    </section>

    <section id="records" class="py-6"><div class="skeleton h-96 w-full"></div></section>
```

  - The page's entry script (last line before `</body>`): `<script type="module" src="js/records.js"></script>`

- [ ] **Step 2: Create `js/records.js`:**

```js
import { loadResultados, esc } from './data.js';
import { calcularRecords } from './records-calc.js';

const $ = (id) => document.getElementById(id);
const MEDALLAS = ['🥇', '🥈', '🥉'];
const fmt = (v) => (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1) : String(v));

function podio(items) {
  if (!items.length) return '<p class="border-t border-borde px-4 py-6 text-center font-body text-humo">Todavía no hay suficientes datos.</p>';
  return items.map((it, i) => `
    <div class="flex items-center gap-3 border-t border-borde px-4 py-3 ${i === 0 ? 'bg-gradient-to-r from-oro/10 to-transparent' : ''}">
      <span class="w-8 shrink-0 text-center font-display text-lg">${MEDALLAS[i]}</span>
      <a href="jugador.html?nombre=${encodeURIComponent(it.nombre)}" class="min-w-0 flex-1 truncate font-display font-bold italic text-white hover:text-primario-glow">${esc(it.nombre)}</a>
      <span class="shrink-0 font-display text-xl font-bold text-primario-glow">${esc(fmt(it.valor))}</span>
    </div>`).join('');
}

function bloque(emoji, titulo, items, sufijo = '') {
  return `
    <section class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      <h2 class="flex items-center gap-2 px-4 py-3 font-display text-lg font-bold italic text-white"><span aria-hidden="true">${emoji}</span>${titulo}${sufijo}</h2>
      ${podio(items)}
    </section>`;
}

const r = calcularRecords(await loadResultados());
$('records').innerHTML = `
  <div class="grid gap-5 md:grid-cols-2">
    ${bloque('🥇', 'Más campeonatos', r.campeonatos)}
    ${bloque('🎖️', 'Más Top 8', r.top8)}
    ${bloque('🏅', 'Más podios', r.podios)}
    ${bloque('📊', 'Mejor promedio', r.mejorPromedio, ' <span class="ml-1 font-body text-xs font-normal text-humo">(mín. 5 tops)</span>')}
  </div>`;
```

- [ ] **Step 3: Add the nav entry in `js/layout.js`.** In the `PAGINAS` array, insert after the `jugadores.html` entry and before `nosotros.html`:

```js
  { archivo: 'records.html', etiqueta: 'Récords' },
```

- [ ] **Step 4: Run `npm test`.** If a test in `tests/layout.test.mjs` asserts the exact `PAGINAS` contents/length and now fails, update that assertion to include the new `records.html` entry (keep the test meaningful — just reflect the added page). If no layout test references the nav list, nothing to change. Expected end state: all green (N + 6).

- [ ] **Step 5: Verify visually.** Server on :3000 (check; start `node serve.mjs` background only if down).

```bash
node screenshot.mjs http://localhost:3000/records.html records
node screenshot.mjs http://localhost:3000/records.html records-m 390x844
```

READ both: 4 record blocks (Más campeonatos / Más Top 8 / Más podios / Mejor promedio) each with a Top-3 mini-podium (🥇/🥈/🥉), the 1º row gold-tinted, names shown, values on the right; "Mejor promedio" shows the "(mín. 5 tops)" note and 1-decimal values; grid is 2-up on desktop, stacked on mobile, no overflow at 390px; the shared header shows a "Récords" nav item. Fix concrete issues (within records.html/js/records.js), re-screenshot.

- [ ] **Step 6: Verify a name links to the profile (puppeteer, temp script deleted after):** on `records.html`, the first podium name's `<a>` href is `jugador.html?nombre=...`; clicking it navigates to `jugador.html` with that name. Print the href + resulting URL.

- [ ] **Step 7: Commit**

```bash
git add records.html js/records.js js/layout.js tests/layout.test.mjs
git commit -m "feat: Récords page with all-time league record podiums"
```

---

### Task 3: Polish + deploy

**Files:** Modify any of `records.html`, `js/records.js`, `css/custom.css` (only if a fix is needed); none for deploy.

- [ ] **Step 1: Round 1** — screenshot records desktop + mobile (`rec-pol-*`) and READ against: the four podiums read clearly (medal column steady, long names truncate not wrap, values legible/aligned), gold tint only on the 1º of each block, block titles + the "(mín. 5 tops)" note fit without wrapping awkwardly on mobile, spacing consistent with the rest of the site, no overflow at 390px, nav "Récords" active state shows on this page. Also confirm an empty record (if any block has <1 qualifier) shows the "Todavía no hay suficientes datos" line cleanly.
- [ ] **Step 2:** Fix concrete issues; re-screenshot (`rec-pol2-*`). `npm test` (N + 6).
- [ ] **Step 3: Commit** any polish fixes.

```bash
git add records.html js/records.js css/
git commit -m "polish: records page visual refinement"
```

- [ ] **Step 4: Merge + deploy.** Merge the branch to `main` (after `npm test` green), push `origin main`.
- [ ] **Step 5: Live verify.** Poll https://l4gash.github.io/buta-tcg-web/records.html until fresh (puppeteer, cache disabled, wait for console signature). Confirm: the 4 record podiums render with live data; names link to the right profiles; the "Récords" nav item appears on all pages; no console errors on records + a couple of other pages. Screenshot desktop + mobile and READ. Report the live URL + what was verified.

---

## Self-Review (completed by plan author)

- **Spec coverage:** 4 records (campeonatos, top8, podios, mejor promedio con mín. 5) as Top-3 podiums (Task 1-2) ✓ · names link to jugador.html profile (Task 2) ✓ · grouping by normalizarNombre + canonical display name (Task 1) ✓ · dedicated records.html + nav entry via layout.js (Task 2) ✓ · all-time across seasons (uses all loadResultados rows, no season filter) ✓ · empty-state message (Task 2) ✓ · tests for calc incl. min-5 filter/tie/top-3/canonical/empty (Task 1) ✓ · verification: tests, ≥2 screenshot rounds, profile-link check, live check (Tasks 1-3) ✓ · out-of-scope (streak, distinct decks, season filter, backend) respected ✓
- **Placeholder scan:** none — all code complete; temp puppeteer script described concretely and deleted.
- **Type consistency:** `calcularRecords(rows, opciones)` returns `{campeonatos, top8, podios, mejorPromedio}` each an array of `{nombre, valor}`; render (`js/records.js`) consumes exactly those keys; `fmt` handles the promedio's 1-decimal number vs integer counts; `normalizarNombre` imported from `./buscar.js`; page entry `js/records.js` matches the `<script src>` in records.html; nav entry `{archivo:'records.html', etiqueta:'Récords'}` matches the layout.js `PAGINAS` shape.
