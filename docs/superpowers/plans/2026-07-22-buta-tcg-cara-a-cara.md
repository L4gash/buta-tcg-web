# BUTA TCG — Cara a cara · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cara a cara" page comparing two players side by side (career stats + shared-top coincidences), per `docs/superpowers/specs/2026-07-22-buta-tcg-cara-a-cara-design.md`.

**Architecture:** Pure-frontend addition to the live static site. A pure module `js/cara-a-cara-calc.js` (`caraACara`, unit-tested) reuses `historial.js`/`data.js`/`buscar.js` to build both players' stats and their shared-tournament tally. A new page `cara-a-cara.html` + entry `js/cara-a-cara.js` renders two player pickers (backed by `listaJugadores`), a comparison table with per-row winner highlight, and the coincidences block; supports a shareable `?a=&b=` URL. One nav entry in `js/layout.js`. No backend.

**Tech Stack:** unchanged (Node 24 tests `npm test` = `node --test tests/*.test.mjs`; serve :3000; `node screenshot.mjs <url> [label] [WxH]`). Run `npm test` first to record the green baseline (currently 112; call it N).

**Site is LIVE** at https://l4gash.github.io/buta-tcg-web/ . Work on a branch off `main`; do NOT push until the deploy task. Console signature "🐗 BUTA TCG" is the deploy-freshness signal.

**Conventions (verified):**
- Pages load `css/tailwind.css` + `js/theme.js` + `css/custom.css`; `js/layout.js` (first module in body) fills `#site-header`/`#site-footer`; `<div id="volver">`; the page entry script is the last module. Base the new page's chrome on `ranking.html`.
- Pure helpers in their own side-effect-free modules; the page entry (e.g. `records.js`) has the top-level `await load…()` + render. Follow the split: `cara-a-cara-calc.js` (pure) + `cara-a-cara.js` (entry).
- `js/data.js`: `loadResultados()`, `loadRanking()`, `groupResultados(rows)`, `filtrarRanking(rows)`, `esc`.
- `js/historial.js`: `historialDe(nombre, grupos)` → `[{torneo, puesto, deck}]`; `estadisticasDe(historial)` → `{fechas, campeonatos, podios, mejorPuesto, promedioPuesto}`.
- `js/buscar.js`: `normalizarNombre`, `coincideJugador`.
- `js/directorio-jugadores.js`: `listaJugadores(resultadosRows, rankingRows)` → deduped `[{nombre, tops, campeonatos, pos}]` sorted alfabético. Use for the pickers.
- `js/layout.js`: `PAGINAS` array is the single nav source.

---

## File Structure

```
js/cara-a-cara-calc.js         # NEW: pure caraACara (Task 1)
tests/cara-a-cara-calc.test.mjs # NEW: tests (Task 1)
cara-a-cara.html               # NEW: page (Task 2)
js/cara-a-cara.js              # NEW: render entry (Task 2)
js/layout.js                   # + "Cara a cara" nav entry (Task 2)
```

---

### Task 1: Pure `caraACara` (`js/cara-a-cara-calc.js`) — TDD

**Files:**
- Create: `js/cara-a-cara-calc.js`
- Test: `tests/cara-a-cara-calc.test.mjs`

- [ ] **Step 0: Baseline.** `npm test`, note passing count N (expected 112). All green.

- [ ] **Step 1: Write failing tests `tests/cara-a-cara-calc.test.mjs`:**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caraACara } from '../js/cara-a-cara-calc.js';

// Ana: puestos 1,3,5 (T1,T2,T3). Beto: puestos 2,4 (T1,T2).
const RES = [
  { torneo: 'T1', puesto: '1', nombre: 'Ana' },
  { torneo: 'T1', puesto: '2', nombre: 'Beto' },
  { torneo: 'T2', puesto: '3', nombre: 'ana' },  // misma persona (normaliza)
  { torneo: 'T2', puesto: '4', nombre: 'Beto' },
  { torneo: 'T3', puesto: '5', nombre: 'Ana' },
];
const RANK = [
  { Pos: '1', Jugador: 'Ana', 'PL Totales': '50' },
  { Pos: '3', Jugador: 'Beto', 'PL Totales': '40' },
];

test('stats por jugador', () => {
  const { a, b } = caraACara(RES, RANK, 'Ana', 'Beto');
  assert.deepEqual(
    { c: a.campeonatos, t: a.top8, p: a.podios, mp: a.mejorPuesto, prom: a.promedio, pos: a.pos, pl: a.pl },
    { c: 1, t: 3, p: 2, mp: 1, prom: 3, pos: 1, pl: '50' });
  assert.deepEqual(
    { c: b.campeonatos, t: b.top8, p: b.podios, mp: b.mejorPuesto, prom: b.promedio, pos: b.pos, pl: b.pl },
    { c: 0, t: 2, p: 1, mp: 2, prom: 3, pos: 3, pl: '40' });
});

test('coincidencias: total, aArriba/bArriba y lista reciente-primero', () => {
  const { coincidencias: c } = caraACara(RES, RANK, 'Ana', 'Beto');
  assert.equal(c.total, 2);          // T1 y T2
  assert.equal(c.aArriba, 2);        // Ana quedó arriba en ambos (1<2, 3<4)
  assert.equal(c.bArriba, 0);
  assert.deepEqual(c.torneos.map((x) => x.torneo), ['T2', 'T1']); // reciente primero
  assert.deepEqual(c.torneos[0], { torneo: 'T2', puestoA: 3, puestoB: 4 });
});

test('jugador inexistente => stats vacías', () => {
  const { a, coincidencias } = caraACara(RES, RANK, 'Nadie', 'Beto');
  assert.deepEqual(
    { c: a.campeonatos, t: a.top8, mp: a.mejorPuesto, prom: a.promedio, pos: a.pos, pl: a.pl },
    { c: 0, t: 0, mp: null, prom: null, pos: null, pl: null });
  assert.equal(coincidencias.total, 0);
});

test('sin coincidencias => total 0', () => {
  const res = [
    { torneo: 'T1', puesto: '1', nombre: 'Ana' },
    { torneo: 'T2', puesto: '1', nombre: 'Beto' },
  ];
  const { coincidencias } = caraACara(res, [], 'Ana', 'Beto');
  assert.equal(coincidencias.total, 0);
  assert.deepEqual(coincidencias.torneos, []);
});
```

- [ ] **Step 2: Run `npm test` — the new tests FAIL** (`Cannot find module ../js/cara-a-cara-calc.js`). Rest green.

- [ ] **Step 3: Create `js/cara-a-cara-calc.js`:**

```js
// Comparación "cara a cara" de dos jugadores a partir de Resultados + Ranking.
// Pura (sin DOM ni fetch). Nota: Resultados guarda el puesto por torneo, no
// partidas mano a mano — "coincidencias" = torneos donde ambos hicieron top.
import { groupResultados, filtrarRanking } from './data.js';
import { historialDe, estadisticasDe } from './historial.js';
import { coincideJugador } from './buscar.js';

function statsDe(nombre, grupos, ranking) {
  const historial = historialDe(nombre, grupos);
  const st = estadisticasDe(historial);
  const fila = ranking.find((r) => coincideJugador(r.Jugador, nombre)) ?? null;
  return {
    nombre,
    campeonatos: st.campeonatos,
    top8: st.fechas,
    podios: st.podios,
    mejorPuesto: st.mejorPuesto,        // null si sin tops
    promedio: st.promedioPuesto,        // null si sin tops
    pos: fila ? (Number(fila.Pos) || null) : null,
    pl: fila ? (fila['PL Totales'] ?? null) : null,
  };
}

export function caraACara(resultadosRows, rankingRows, nombreA, nombreB) {
  const grupos = groupResultados(resultadosRows ?? []);
  const ranking = filtrarRanking(rankingRows ?? []);
  const a = statsDe(nombreA, grupos, ranking);
  const b = statsDe(nombreB, grupos, ranking);

  // Torneos donde ambos tienen fila. groupResultados preserva el orden del CSV
  // (viejo→nuevo); invertimos la lista para mostrar reciente→viejo.
  const torneos = [];
  let aArriba = 0;
  let bArriba = 0;
  for (const [torneo, filas] of Object.entries(grupos)) {
    const fa = filas.find((r) => coincideJugador(r.nombre, nombreA));
    const fb = filas.find((r) => coincideJugador(r.nombre, nombreB));
    if (!fa || !fb) continue;
    const puestoA = Number(fa.puesto);
    const puestoB = Number(fb.puesto);
    torneos.push({ torneo, puestoA, puestoB });
    if (puestoA < puestoB) aArriba += 1;
    else if (puestoB < puestoA) bArriba += 1;
  }
  torneos.reverse();
  return { a, b, coincidencias: { total: torneos.length, aArriba, bArriba, torneos } };
}
```

- [ ] **Step 4: Run `npm test` — all pass** (N + 4).

- [ ] **Step 5: Commit**

```bash
git add js/cara-a-cara-calc.js tests/cara-a-cara-calc.test.mjs
git commit -m "feat: caraACara pure module for head-to-head comparison"
```

---

### Task 2: Page `cara-a-cara.html` + render `js/cara-a-cara.js` + nav entry

**Files:**
- Create: `cara-a-cara.html`, `js/cara-a-cara.js`
- Modify: `js/layout.js` (and `tests/layout.test.mjs` only if it asserts the exact nav list)

- [ ] **Step 1: Create `cara-a-cara.html`** by copying `ranking.html`'s chrome VERBATIM (head incl. build comment + OG tags + manifest/theme-color/apple-touch-icon + `css/tailwind.css` + `js/theme.js` + `css/custom.css`; the `<script type="module" src="js/layout.js">`, `#site-header`, `#site-footer`, `<div id="volver">`), changing only:
  - `<title>` → `Cara a cara — BUTA TCG`; the meta description + `og:title`/`og:description`/`og:url` (→ `.../cara-a-cara.html`) to head-to-head text (e.g. description "Cara a cara: compará dos jugadores de la liga de BUTA TCG lado a lado.").
  - `<main class="mx-auto max-w-3xl px-4">` containing:

```html
    <div id="volver" class="pt-4"></div>

    <section class="pb-4 pt-12 text-center">
      <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Cara a cara</p>
      <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">Jugador vs jugador</h1>
      <p class="mx-auto mt-4 max-w-xl font-body text-sm leading-[1.7] text-humo">Compará dos jugadores y mirá cuántas veces coincidieron en el top de una fecha.</p>
    </section>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label for="jugador-a" class="font-body text-sm font-semibold text-humo">Jugador A</label>
        <input id="jugador-a" list="lista-jugadores" type="search" autocomplete="off" placeholder="Elegí un jugador…"
          class="mt-1.5 w-full rounded-lg border border-borde bg-tinta px-4 py-2.5 font-body text-sm text-white placeholder-humo/80 focus:border-primario" />
      </div>
      <div>
        <label for="jugador-b" class="font-body text-sm font-semibold text-humo">Jugador B</label>
        <input id="jugador-b" list="lista-jugadores" type="search" autocomplete="off" placeholder="Elegí un jugador…"
          class="mt-1.5 w-full rounded-lg border border-borde bg-tinta px-4 py-2.5 font-body text-sm text-white placeholder-humo/80 focus:border-primario" />
      </div>
      <datalist id="lista-jugadores"></datalist>
    </section>

    <section id="comparacion" class="py-8"></section>
```

  - Entry script (last before `</body>`): `<script type="module" src="js/cara-a-cara.js"></script>`

- [ ] **Step 2: Create `js/cara-a-cara.js`:**

```js
import { loadResultados, loadRanking, esc } from './data.js';
import { listaJugadores } from './directorio-jugadores.js';
import { coincideJugador } from './buscar.js';
import { caraACara } from './cara-a-cara-calc.js';

const $ = (id) => document.getElementById(id);
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const puestoTxt = (p) => (MEDALLAS[p] ?? `#${p}`);

const [resultados, rankingRows] = await Promise.all([loadResultados(), loadRanking()]);
const jugadores = listaJugadores(resultados, rankingRows);
$('lista-jugadores').innerHTML = jugadores.map((j) => `<option value="${esc(j.nombre)}"></option>`).join('');

// Texto tipeado -> nombre canónico de la lista (o '' si no matchea a nadie).
const resolver = (texto) => (jugadores.find((j) => coincideJugador(j.nombre, texto))?.nombre ?? '');

// Fila comparativa. disp* = lo que se muestra; cmp* = número para decidir el mejor.
function filaStat(label, dispA, dispB, cmpA, cmpB, mejor) {
  const na = cmpA == null ? null : Number(cmpA);
  const nb = cmpB == null ? null : Number(cmpB);
  let ganaA = false;
  let ganaB = false;
  if (na != null && nb != null && na !== nb) {
    ganaA = mejor === 'mayor' ? na > nb : na < nb;
    ganaB = !ganaA;
  } else if (na != null && nb == null) ganaA = true;
  else if (nb != null && na == null) ganaB = true;
  const cel = (v, gana) => `<span class="font-display text-lg font-bold ${gana ? 'text-primario-glow' : 'text-white'}">${v == null ? '—' : esc(String(v))}</span>`;
  return `
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-borde px-4 py-2.5">
      <div class="text-right">${cel(dispA, ganaA)}</div>
      <div class="text-center font-body text-[0.7rem] uppercase tracking-wider text-humo">${label}</div>
      <div class="text-left">${cel(dispB, ganaB)}</div>
    </div>`;
}

function bloqueCoincidencias(a, b, c) {
  if (!c.total) return '<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-6 text-center font-body text-humo shadow-card">Todavía no coincidieron en un top.</p>';
  const lista = c.torneos.map((t) => {
    const aArriba = t.puestoA < t.puestoB;
    return `
      <a href="resultados.html?torneo=${encodeURIComponent(t.torneo)}" class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-borde px-4 py-3 hover:bg-primario/5">
        <span class="font-display text-base font-bold ${aArriba ? 'text-primario-glow' : 'text-humo'}">${puestoTxt(t.puestoA)}</span>
        <span class="min-w-0 truncate text-center font-body text-sm text-white">${esc(t.torneo)}</span>
        <span class="text-right font-display text-base font-bold ${!aArriba ? 'text-primario-glow' : 'text-humo'}">${puestoTxt(t.puestoB)}</span>
      </a>`;
  }).join('');
  return `
    <div class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      <div class="px-4 py-4 text-center">
        <p class="font-body text-sm text-humo">Se cruzaron en <strong class="text-white">${c.total}</strong> ${c.total === 1 ? 'torneo' : 'torneos'}</p>
        <p class="mt-1 font-display text-lg font-bold italic text-white">${esc(a.nombre)} arriba <span class="text-primario-glow">${c.aArriba}</span> · ${esc(b.nombre)} arriba <span class="text-primario-glow">${c.bArriba}</span></p>
      </div>
      ${lista}
    </div>`;
}

function aviso(texto) {
  return `<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-10 text-center font-body text-humo shadow-card">${texto}</p>`;
}

function render() {
  const nA = resolver($('jugador-a').value);
  const nB = resolver($('jugador-b').value);
  const cont = $('comparacion');
  if (!nA || !nB) { cont.innerHTML = aviso('Elegí dos jugadores para compararlos.'); return; }
  if (coincideJugador(nA, nB)) { cont.innerHTML = aviso('Elegí dos jugadores distintos.'); return; }

  const { a, b, coincidencias } = caraACara(resultados, rankingRows, nA, nB);
  const prom = (v) => (v == null ? null : v.toFixed(1));
  cont.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-center">
      <a href="jugador.html?nombre=${encodeURIComponent(a.nombre)}" class="truncate font-display text-xl font-bold italic text-white hover:text-primario-glow">${esc(a.nombre)}</a>
      <a href="jugador.html?nombre=${encodeURIComponent(b.nombre)}" class="truncate font-display text-xl font-bold italic text-white hover:text-primario-glow">${esc(b.nombre)}</a>
    </div>
    <div class="mt-4 overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      ${filaStat('Campeonatos', a.campeonatos, b.campeonatos, a.campeonatos, b.campeonatos, 'mayor')}
      ${filaStat('Top 8', a.top8, b.top8, a.top8, b.top8, 'mayor')}
      ${filaStat('Podios', a.podios, b.podios, a.podios, b.podios, 'mayor')}
      ${filaStat('Mejor puesto', a.mejorPuesto, b.mejorPuesto, a.mejorPuesto, b.mejorPuesto, 'menor')}
      ${filaStat('Promedio', prom(a.promedio), prom(b.promedio), a.promedio, b.promedio, 'menor')}
      ${filaStat('Ranking', a.pos, b.pos, a.pos, b.pos, 'menor')}
      ${filaStat('Puntos de liga', a.pl, b.pl, a.pl, b.pl, 'mayor')}
    </div>
    <div class="mt-6">${bloqueCoincidencias(a, b, coincidencias)}</div>`;

  const url = new URL(location.href);
  url.searchParams.set('a', a.nombre);
  url.searchParams.set('b', b.nombre);
  history.replaceState(null, '', url);
}

// Precarga desde ?a=&b= (deja el texto crudo si no resuelve, para que se vea).
const params = new URLSearchParams(location.search);
if (params.get('a')) $('jugador-a').value = resolver(params.get('a')) || params.get('a');
if (params.get('b')) $('jugador-b').value = resolver(params.get('b')) || params.get('b');
$('jugador-a').addEventListener('change', render);
$('jugador-b').addEventListener('change', render);
render();
```

- [ ] **Step 3: Add the nav entry in `js/layout.js`.** In `PAGINAS`, insert after the `records.html` entry and before `nosotros.html`:

```js
  { archivo: 'cara-a-cara.html', etiqueta: 'Cara a cara' },
```

- [ ] **Step 4: Run `npm test`.** If `tests/layout.test.mjs` asserts the exact `PAGINAS` list/length and now fails, update that assertion to include the new `cara-a-cara.html` entry (keep it meaningful). Expected: all green (N + 4).

- [ ] **Step 5: Verify visually.** Server on :3000 (check; start `node serve.mjs` background only if down). Pick two real players that have shared tops (from the live ranking/records, e.g. `Mariano Castro` and `Emanuel Gilardi`):

```bash
node screenshot.mjs "http://localhost:3000/cara-a-cara.html?a=Mariano%20Castro&b=Emanuel%20Gilardi" cac
node screenshot.mjs "http://localhost:3000/cara-a-cara.html?a=Mariano%20Castro&b=Emanuel%20Gilardi" cac-m 390x844
```

READ both: the two names as links; the 7-row comparison table with the better value per row highlighted in blue (campeonatos/top8/podios/PL: higher; mejor puesto/promedio/ranking: lower); the coincidences marcador ("Se cruzaron en X torneos — … arriba N · … arriba M") + the list of those tournaments with each puesto and the higher one highlighted; nav shows "Cara a cara"; no overflow at 390px. Also screenshot the empty state `http://localhost:3000/cara-a-cara.html` → READ: "Elegí dos jugadores para compararlos." Fix concrete issues, re-screenshot.

- [ ] **Step 6: Verify interactions (puppeteer, temp script deleted after):** (a) with the `?a=&b=` URL, a comparison renders and the first player name's `<a>` href is `jugador.html?nombre=…`; (b) a coincidence row's href is `resultados.html?torneo=…`; (c) setting both inputs to the SAME player shows "Elegí dos jugadores distintos." Print the three facts.

- [ ] **Step 7: Commit**

```bash
git add cara-a-cara.html js/cara-a-cara.js js/layout.js tests/layout.test.mjs
git commit -m "feat: Cara a cara page - two-player head-to-head comparison"
```

---

### Task 3: Polish + deploy

**Files:** Modify any of `cara-a-cara.html`, `js/cara-a-cara.js`, `css/custom.css` (only if a fix is needed); none for deploy.

- [ ] **Step 1: Round 1** — screenshot the page desktop + mobile (`cac-pol-*`) for a real pair with coincidences AND a pair with none (to see the empty "Todavía no coincidieron" state). READ against: the comparison table reads clearly (three-column A | label | B, values aligned, winner highlight obvious but not garish); long names truncate not wrap in the header and rows; the coincidences marcador + list are legible, the "arriba N/M" numbers stand out; promedio shows 1 decimal, ranking/PL show "—" when a player isn't ranked; spacing consistent with the rest of the site; no overflow at 390px (the two-column pickers stack on mobile); nav "Cara a cara" active state on this page.
- [ ] **Step 2:** Fix concrete issues; re-screenshot (`cac-pol2-*`). `npm test` (N + 4).
- [ ] **Step 3: Commit** any polish fixes.

```bash
git add cara-a-cara.html js/cara-a-cara.js css/
git commit -m "polish: cara a cara visual refinement"
```

- [ ] **Step 4: Merge + deploy.** Merge the branch to `main` (after `npm test` green), push `origin main`.
- [ ] **Step 5: Live verify.** Poll https://l4gash.github.io/buta-tcg-web/cara-a-cara.html until fresh (puppeteer, cache disabled, wait for console signature). Confirm on the LIVE site: picking/`?a=&b=` renders the comparison with live data; names link to profiles; coincidence rows link to the right tournament results; "Cara a cara" nav item on all pages; no console errors on the page + a couple others. Screenshot desktop + mobile and READ. Report the live URL + what was verified.

---

## Self-Review (completed by plan author)

- **Spec coverage:** 7-stat side-by-side compare with per-row winner highlight (Task 2) ✓ · coincidences marcador + linked tournament list (Task 1-2) ✓ · two pickers backed by listaJugadores + shareable `?a=&b=` (Task 2) ✓ · names→profile, tournaments→resultados links (Task 2) ✓ · same-player + no-coincidence + not-chosen edge states (Task 2) ✓ · pure `caraACara` reusing historial/data/buscar with tests (Task 1) ✓ · nav entry (Task 2) ✓ · data-honesty (co-tops not match results) reflected in copy ✓ · verification: tests, ≥2 screenshot rounds incl. empty/same-player, puppeteer link checks, live check (Tasks 1-3) ✓ · out-of-scope (match results, profile button, >2 players, season filter, backend) respected ✓
- **Placeholder scan:** none — all code complete; temp puppeteer script described concretely and deleted.
- **Type consistency:** `caraACara(resultadosRows, rankingRows, nombreA, nombreB)` returns `{a, b, coincidencias:{total, aArriba, bArriba, torneos:[{torneo, puestoA, puestoB}]}}`; render consumes exactly those; `statsDe` fields (campeonatos/top8/podios/mejorPuesto/promedio/pos/pl) match `filaStat` calls; `listaJugadores` `{nombre}` used for datalist + `resolver`; nav entry `{archivo:'cara-a-cara.html', etiqueta:'Cara a cara'}` matches `PAGINAS` shape; page entry `js/cara-a-cara.js` matches the `<script src>`.
