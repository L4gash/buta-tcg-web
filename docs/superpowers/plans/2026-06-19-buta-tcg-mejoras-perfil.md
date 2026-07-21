# BUTA TCG — Mejoras al perfil de jugador · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 improvements to the existing player-profile page — extra stat chips, clickable history rows that deep-link to the tournament/decklist, and a ranking-zone badge — per `docs/superpowers/specs/2026-06-19-buta-tcg-mejoras-perfil-design.md`.

**Architecture:** Pure-frontend change to the live static site. Two new pure helpers (`temporadaDeTorneo` in `js/temporadas.js`, `medallaOPuesto` in `js/historial.js`), both unit-tested. `js/jugador.js` gains chips + zone badge + turns history rows into links. `js/resultados.js` honors `?torneo=&jugador=` query params (select season+tournament, optionally auto-open that player's decklist lightbox). No backend, no sheets, no Apps Script.

**Tech Stack:** unchanged (Node 24 tests `npm test` = `node --test tests/*.test.mjs`; serve :3000; `node screenshot.mjs <url> [label] [WxH]`). Run `npm test` first to record the current green baseline (call it N tests).

**Site is LIVE** at https://l4gash.github.io/buta-tcg-web/ . Work on a branch off `main`; do NOT push until the deploy task. Console signature "🐗 BUTA TCG" is the deploy-freshness signal.

**Existing code (verified):**
- `js/jugador.js`: builds the profile. `chip(valor, etiqueta)` helper; `chips` array currently = Ranking, Puntos de liga, Campeonatos, Podios, Promedio. Has `filaRanking` (or undefined) and `stats = estadisticasDe(historial)` (`{fechas, campeonatos, podios, mejorPuesto, promedioPuesto}`). `nombreMostrar` is the display name. `filaFecha(h)` renders a `<div>` per history row. The header block has the name `<h1>` + "Compartir perfil" button.
- `js/historial.js`: pure helpers, exports include `estadisticasDe`.
- `js/temporadas.js`: pure helpers; `temporadaDe(row)` returns the row's season label (default `Temporada 1`).
- `js/ranking-zonas.js`: `zonaDe(pos)` → `'clasifica'|'repechaje'|null`.
- `js/resultados.js`: top-level module. In the `else` block it defines `verTemporada(temporada)`, `seleccionar(nombreTorneo)`, and ends that block with `verTemporada(temporadas.at(-1))`. `tarjeta(r, destacada)` renders photo cards as `<button class="tarjeta-resultado" data-foto data-alt>`. Lightbox listeners are wired at the very END of the module (delegated `click` on `.tarjeta-resultado`).

---

## File Structure

```
js/temporadas.js       # + temporadaDeTorneo (Task 1)
js/historial.js        # + medallaOPuesto (Task 1)
tests/temporadas.test.mjs   # + temporadaDeTorneo tests (Task 1)
tests/historial.test.mjs    # + medallaOPuesto tests (Task 1)
js/jugador.js          # + 4 chips, zone badge, history rows as links (Task 2)
js/resultados.js       # data-jugador on cards + ?torneo=&jugador= deep-link (Task 3)
```

---

### Task 1: Pure helpers `temporadaDeTorneo` + `medallaOPuesto` (TDD)

**Files:**
- Modify: `js/temporadas.js`, `js/historial.js`
- Test: `tests/temporadas.test.mjs`, `tests/historial.test.mjs`

- [ ] **Step 0: Baseline.** Run `npm test`, note the passing count N. All green.

- [ ] **Step 1: Append failing test to `tests/temporadas.test.mjs`** (add `temporadaDeTorneo` to the existing import from `../js/temporadas.js`):

```js
test('temporadaDeTorneo: devuelve la temporada del torneo, o null', () => {
  const rows = [
    { torneo: 'Fecha Vieja', puesto: '1', nombre: 'A' },
    { torneo: 'Fecha Vieja', puesto: '2', nombre: 'B' },
    { torneo: 'Fecha Nueva', puesto: '1', nombre: 'A', temporada: 'Temporada 2' },
  ];
  assert.equal(temporadaDeTorneo(rows, 'Fecha Vieja'), 'Temporada 1');
  assert.equal(temporadaDeTorneo(rows, 'Fecha Nueva'), 'Temporada 2');
  assert.equal(temporadaDeTorneo(rows, 'No Existe'), null);
  assert.equal(temporadaDeTorneo([], 'x'), null);
});
```

- [ ] **Step 2: Append failing test to `tests/historial.test.mjs`** (add `medallaOPuesto` to the existing import from `../js/historial.js`):

```js
test('medallaOPuesto: medalla para 1-3, #n para el resto, — si null', () => {
  assert.equal(medallaOPuesto(1), '🥇');
  assert.equal(medallaOPuesto(2), '🥈');
  assert.equal(medallaOPuesto(3), '🥉');
  assert.equal(medallaOPuesto(5), '#5');
  assert.equal(medallaOPuesto(null), '—');
  assert.equal(medallaOPuesto(undefined), '—');
});
```

- [ ] **Step 3: Run `npm test` — the 2 new tests FAIL** (functions not exported). Rest green.

- [ ] **Step 4: Implement `temporadaDeTorneo` in `js/temporadas.js`.** Add after `filasDeTemporada`:

```js
// La temporada a la que pertenece un torneo (primera fila que coincide), o null.
export function temporadaDeTorneo(rows, torneo) {
  const fila = (rows ?? []).find((r) => r?.torneo === torneo);
  return fila ? temporadaDe(fila) : null;
}
```

- [ ] **Step 5: Implement `medallaOPuesto` in `js/historial.js`.** Add near the other exports (it is pure, no DOM):

```js
// Medalla para el podio, "#n" para el resto, "—" si no hay puesto.
export function medallaOPuesto(puesto) {
  const MED = { 1: '🥇', 2: '🥈', 3: '🥉' };
  if (puesto == null) return '—';
  return MED[Number(puesto)] ?? `#${puesto}`;
}
```

- [ ] **Step 6: Run `npm test` — all pass** (N + 2).

- [ ] **Step 7: Commit**

```bash
git add js/temporadas.js js/historial.js tests/temporadas.test.mjs tests/historial.test.mjs
git commit -m "feat: temporadaDeTorneo and medallaOPuesto pure helpers"
```

---

### Task 2: Profile chips, zone badge, clickable history rows (`js/jugador.js`)

**Files:**
- Modify: `js/jugador.js`

- [ ] **Step 1: Import the new helpers.** In `js/jugador.js`, update the imports:
  - Add `medallaOPuesto` to the existing import from `./historial.js`.
  - Add a new import line: `import { zonaDe } from './ranking-zonas.js';`

- [ ] **Step 2: Rebuild the `chips` array.** Find the block that builds `chips` (currently Ranking / Puntos de liga / Campeonatos / Podios / Promedio) and replace it with the 9-chip version, keeping the ranking-dependent ones conditional on `filaRanking`:

```js
      const promedioTexto = stats.promedioPuesto == null ? '—' : stats.promedioPuesto.toFixed(1);
      const chips = [
        filaRanking ? chip(`#${esc(filaRanking.Pos)}`, 'Ranking') : '',
        filaRanking ? chip(esc(filaRanking['PL Totales'] ?? '0'), 'Puntos de liga') : '',
        filaRanking ? chip(esc(filaRanking['Torneos Jugados'] ?? '0'), 'Torneos jugados') : '',
        filaRanking ? chip(esc(filaRanking['Victorias'] ?? '0'), 'Victorias') : '',
        chip(stats.fechas, stats.fechas === 1 ? 'Top 8' : 'Top 8'),
        chip(stats.campeonatos, stats.campeonatos === 1 ? 'Campeonato' : 'Campeonatos'),
        chip(stats.podios, 'Podios'),
        chip(medallaOPuesto(stats.mejorPuesto), 'Mejor resultado'),
        chip(promedioTexto, 'Promedio de puesto'),
      ].filter(Boolean).join('');
```

(Note: the "Top 8" label is intentionally the same singular/plural; kept as a ternary for consistency with the surrounding code style — leave as one label `'Top 8'`.)

- [ ] **Step 3: Add the zone badge to the header.** In the header template (the centered block with the `<h1>` and the "Compartir perfil" button), compute the badge before building the template and insert it right AFTER the compartir button. Add this before the `$('perfil-jugador').innerHTML = ...` assignment (in the `else` branch where the profile renders):

```js
      const zona = filaRanking ? zonaDe(Number(filaRanking.Pos)) : null;
      const insigniaZona = zona === 'clasifica'
        ? '<p class="mt-4 inline-block rounded-full border border-oro/60 bg-oro/10 px-4 py-1.5 font-body text-sm font-semibold text-oro shadow-glow-violeta">✅ Clasifica al torneo de campeones</p>'
        : zona === 'repechaje'
        ? '<p class="mt-4 inline-block rounded-full border border-violeta/50 bg-violeta/10 px-4 py-1.5 font-body text-sm font-semibold text-violeta-glow">🔁 Zona de repechaje (9°–16°)</p>'
        : '';
```

Then, in the header template, add `${insigniaZona}` on its own line right after the "Compartir perfil" `</button>` and before the closing `</div>` of the centered header block. For example the header becomes:

```js
        <div class="text-center">
          <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Perfil de jugador</p>
          <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">${esc(nombreMostrar)}</h1>
          <button type="button" id="btn-compartir" class="mt-5 rounded-full border border-primario/50 px-5 py-2 font-body text-sm font-semibold text-primario-glow hover:bg-primario/10">Compartir perfil</button>
          ${insigniaZona ? `<div>${insigniaZona}</div>` : ''}
        </div>
```

- [ ] **Step 4: Make history rows clickable links.** Replace the `filaFecha(h)` function so each row is an `<a>` to the tournament (carrying the player name):

```js
function filaFecha(h, nombreJugador) {
  const pos = Number(h.puesto);
  const medalla = MEDALLAS[pos] ?? `#${esc(h.puesto)}`;
  const deck = String(h.deck ?? '').trim();
  const conDeck = deck && deck !== '—';
  const url = `resultados.html?torneo=${encodeURIComponent(h.torneo)}&jugador=${encodeURIComponent(nombreJugador)}`;
  return `
    <a href="${url}" class="flex items-center gap-3 border-t border-borde px-4 py-3 hover:bg-primario/5">
      <span class="w-10 shrink-0 text-center font-display text-lg font-bold ${pos === 1 ? 'text-oro' : 'text-white'}">${medalla}</span>
      <span class="min-w-0 flex-1 truncate font-body text-sm text-white">${esc(h.torneo)}</span>
      ${conDeck ? `<span class="shrink-0 rounded-full bg-primario/15 px-3 py-1 font-body text-xs font-semibold text-primario-glow">${esc(deck)}</span>` : ''}
      <span aria-hidden="true" class="shrink-0 font-body text-sm text-humo">→</span>
    </a>`;
}
```

Update the two call sites that map history items to `filaFecha` (inside the `segmentos...map(...)` template) to pass `nombreMostrar`: change `.map(filaFecha)` to `.map((h) => filaFecha(h, nombreMostrar))`.

- [ ] **Step 5: Verify visually.** Server on :3000 (check; start `node serve.mjs` in background only if down). Screenshot the profile of a top-8 player and a lower player:

```bash
node screenshot.mjs "http://localhost:3000/jugador.html?nombre=Juanny%20Gordillo" perfil-mej
node screenshot.mjs "http://localhost:3000/jugador.html?nombre=Juanny%20Gordillo" perfil-mej-m 390x844
```

READ both: 9 chips present (Ranking, Puntos, Torneos jugados, Victorias, Top 8, Campeonatos, Podios, Mejor resultado, Promedio) laid out cleanly (2 rows on desktop, no overflow on mobile); the zone badge appears under the name (Juanny is #2 → "Clasifica"); each history row shows a `→` and highlights on hover. Also screenshot a player likely outside top 16 to confirm NO badge (pick a low-ranked name from the ranking, e.g. one near the bottom) — READ it.

- [ ] **Step 6: `npm test` (N+2) and commit**

```bash
git add js/jugador.js
git commit -m "feat: profile stat chips, zone badge, clickable history rows"
```

---

### Task 3: Resultados deep-link `?torneo=&jugador=` (`js/resultados.js`)

**Files:**
- Modify: `js/resultados.js`

- [ ] **Step 1: Tag photo cards with the player name.** In `tarjeta(r, destacada)`, the photo-card `<button>` (the `if (tieneFoto(r))` branch) — add a `data-jugador` attribute so a specific player's decklist can be located. Change the opening button tag to include:

```js
      <button type="button" data-foto="${esc(src(r.foto))}" data-alt="${altText}" data-jugador="${esc(r.nombre)}"
```

(leave the rest of that button unchanged).

- [ ] **Step 2: Read the deep-link params and drive the initial view.** Find the line at the end of the `else` block:

```js
  verTemporada(temporadas.at(-1)); // arranca en la temporada actual (la última del CSV)
```

Replace it with:

```js
  // Deep-link opcional desde el perfil: ?torneo=...&jugador=...
  const params = new URLSearchParams(location.search);
  const torneoParam = params.get('torneo');
  const tempDeParam = torneoParam ? temporadaDeTorneo(todas, torneoParam) : null;

  if (tempDeParam) {
    verTemporada(tempDeParam);
    seleccionar(torneoParam);
    $('podio').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    verTemporada(temporadas.at(-1)); // arranca en la temporada actual (la última del CSV)
  }
```

- [ ] **Step 3: Import the helper.** Add `temporadaDeTorneo` to the existing import from `./temporadas.js` at the top of `js/resultados.js` (currently `import { listaTemporadas, filasDeTemporada, resumenTemporada } from './temporadas.js';`).

- [ ] **Step 4: Auto-open the player's decklist.** At the VERY END of the module (AFTER the lightbox listeners are wired — i.e. after the `document.addEventListener('keydown', ...)` lightbox block), append:

```js
// Si el deep-link trae un jugador y su decklist existe en el torneo abierto, la muestra.
const jugadorParam = new URLSearchParams(location.search).get('jugador');
if (jugadorParam) {
  const card = document.querySelector(`.tarjeta-resultado[data-jugador="${window.CSS && CSS.escape ? CSS.escape(jugadorParam) : jugadorParam}"]`);
  card?.click();
}
```

(The card's own delegated `click` handler opens the lightbox. `CSS.escape` guards odd characters in names.)

- [ ] **Step 5: Verify the deep-link (puppeteer).** Server on :3000. Write a temp script `tmp-deeplink.mjs` (delete after) that:
  1. Goes to `http://localhost:3000/resultados.html?torneo=<a real tournament name with a decklist photo>&jugador=<that player>`; waits; asserts the selected fecha in the carrusel matches the torneo AND `#lightbox` computed display is `flex` (decklist auto-opened). Use a torneo/jugador you know has a photo (e.g. the YACS 06/12 champion "Mariano Castro" if that data is live; otherwise pick any tournament whose result row has a `foto`). Print both facts.
  2. Goes to `http://localhost:3000/resultados.html?torneo=Torneo%20Inexistente&jugador=Nadie`; asserts the page still renders (a fecha is selected, no console error). Print "fallback OK".
  Expected: deep-link selects the right tournament + opens the lightbox; bad param falls back cleanly. Delete `tmp-deeplink.mjs`.

- [ ] **Step 6: End-to-end from the profile (puppeteer).** Temp script: open `jugador.html?nombre=Juanny%20Gordillo`, click the first history row link, assert navigation to `resultados.html` with the right `?torneo=` and that a fecha is selected. Delete the temp script.

- [ ] **Step 7: `npm test` (N+2) and commit**

```bash
git add js/resultados.js
git commit -m "feat: deep-link Resultados to a tournament and player decklist from the profile"
```

---

### Task 4: Polish + deploy

**Files:** Modify any of `js/jugador.js`, `css/custom.css` (only if a fix is needed); none for deploy.

- [ ] **Step 1: Round 1** — screenshot the profile (desktop + mobile) for a clasifica player, a repechaje player, and a player with no ranking row (results-only). READ against: the 9 chips read clearly and wrap cleanly (numbers legible, labels not cramped); "Mejor resultado" shows a medal/`#n` correctly; the zone badge stands out but doesn't clash; history rows clearly look clickable (hover + `→`); spacing consistent with the rest of the site; no overflow at 390px. Also confirm a results-only player hides Ranking/Puntos/Torneos/Victorias chips and shows no badge.
- [ ] **Step 2:** Fix concrete issues; re-screenshot (round 2). `npm test` (N+2).
- [ ] **Step 3: Commit** any polish fixes.

```bash
git add js/jugador.js css/
git commit -m "polish: profile improvements visual refinement"
```

- [ ] **Step 4: Merge + deploy.** Merge the branch to `main` (after `npm test` green), push `origin main`.
- [ ] **Step 5: Live verify.** Poll https://l4gash.github.io/buta-tcg-web/jugador.html?nombre=Juanny%20Gordillo until fresh (puppeteer, cache disabled, wait for console signature). Confirm: the 9 chips + zone badge render; clicking a history row opens the right tournament on the live Resultados (and the decklist if present); no console errors across the profile and Resultados pages. Screenshot and READ. Report the live URL + what was verified.

---

## Self-Review (completed by plan author)

- **Spec coverage:** +4 chips (Torneos jugados, Victorias, Top 8, Mejor resultado) with ranking-dependent ones conditional (Task 2) ✓ · zone badge clasifica/repechaje/none (Task 2) ✓ · history rows link to `resultados.html?torneo=&jugador=` (Task 2) ✓ · Resultados reads the params, selects season+tournament, scrolls, auto-opens the player's decklist, falls back on unknown torneo (Task 3) ✓ · `temporadaDeTorneo` + `medallaOPuesto` pure helpers with tests (Task 1) ✓ · verification: tests, ≥2 screenshot rounds incl. no-ranking + no-badge cases, puppeteer deep-link + fallback, live check (Tasks 1-4) ✓ · out-of-scope (deck-chip cleanup, global stats, seasons model, backend) respected ✓
- **Placeholder scan:** none — all code complete; temp puppeteer scripts are described concretely and deleted.
- **Type consistency:** `temporadaDeTorneo(rows, torneo)` and `medallaOPuesto(puesto)` names/signatures match across Tasks 1-3; `filaFecha(h, nombreJugador)` new signature updated at both call sites; `data-jugador` added in Task 3 Step 1 is what Task 3 Step 4 selects; chips use `filaRanking['Torneos Jugados']`/`['Victorias']` (exact sheet column names) and `stats.fechas`/`stats.mejorPuesto` (existing `estadisticasDe` fields).
