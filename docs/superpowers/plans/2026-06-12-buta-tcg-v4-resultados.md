# BUTA TCG v4 — Resultados sin foto obligatoria · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Resultados page render photo-less top rows as clean compact cards (no broken image, no lightbox) and show the deck line only when there's a deck, per `docs/superpowers/specs/2026-06-12-buta-tcg-v4-resultados-design.md`.

**Architecture:** Pure-frontend change to the live v3 static site. Two new pure helpers in `js/data.js` (`tieneFoto`, `deckVisible`, unit-tested in Node). `js/resultados.js` `tarjeta()` branches: rows with a photo keep today's interactive image card + lightbox; rows without a photo render a non-interactive compact card. No backend, no sheet-schema, no Apps Script changes.

**Tech Stack:** unchanged (Node 24 tests `npm test` = `node --test tests/*.test.mjs`; serve :3000; `node screenshot.mjs <url> [label] [WxH]`). Currently 20/20 tests green.

**Site is LIVE** at https://l4gash.github.io/buta-tcg-web/ . Work on a branch off `main`; do NOT push until the deploy task. The console signature ("🐗 BUTA TCG") is the deploy-freshness signal.

---

## File Structure

```
js/data.js            # + tieneFoto, deckVisible pure helpers (Task 1)
tests/data.test.mjs   # + tests for both helpers (Task 1)
js/resultados.js      # tarjeta() branches photo vs photo-less; deck line conditional (Task 2)
docs/setup-google-sheets.md  # "cargar resultados" workflow note (Task 3)
```

---

### Task 1: Pure helpers `tieneFoto` + `deckVisible` (TDD)

**Files:**
- Modify: `js/data.js`
- Test: `tests/data.test.mjs`

- [ ] **Step 1: Append failing tests to `tests/data.test.mjs`** (add `tieneFoto, deckVisible` to the existing import on line 3, which currently is `import { pickProximos, groupResultados, FALLBACK_TORNEOS, FALLBACK_RESULTADOS, esc } from '../js/data.js';`):

```js
test('tieneFoto: true solo con valor no vacío tras trim', () => {
  assert.equal(tieneFoto({ foto: 'mariano.jpg' }), true);
  assert.equal(tieneFoto({ foto: '  x.jpg ' }), true);
  assert.equal(tieneFoto({ foto: '' }), false);
  assert.equal(tieneFoto({ foto: '   ' }), false);
  assert.equal(tieneFoto({}), false);
});

test('deckVisible: true salvo vacío o guion', () => {
  assert.equal(deckVisible('Snake-Eye'), true);
  assert.equal(deckVisible('  Branded '), true);
  assert.equal(deckVisible(''), false);
  assert.equal(deckVisible('   '), false);
  assert.equal(deckVisible('—'), false);
  assert.equal(deckVisible(' — '), false);
  assert.equal(deckVisible(undefined), false);
  assert.equal(deckVisible(null), false);
});
```

- [ ] **Step 2: Run `npm test` — the 2 new tests FAIL** (`tieneFoto`/`deckVisible` not exported). The other 20 still pass.

- [ ] **Step 3: Implement in `js/data.js`.** Insert these exports immediately after the `esc` export (after line 75, before the `// Firma del sitio` block):

```js

// ¿La fila de resultado tiene foto cargada?
export const tieneFoto = (r) => String(r?.foto ?? '').trim() !== '';

// ¿Mostrar la línea de deck? (vacío o "—" => no)
export const deckVisible = (deck) => {
  const d = String(deck ?? '').trim();
  return d !== '' && d !== '—';
};
```

- [ ] **Step 4: Run `npm test` — all pass** (20 + 2 = 22).

- [ ] **Step 5: Commit**

```bash
git add js/data.js tests/data.test.mjs
git commit -m "feat: tieneFoto and deckVisible result helpers"
```

---

### Task 2: `tarjeta()` branches photo vs compact (no broken image, no lightbox)

**Files:**
- Modify: `js/resultados.js`

Current `js/resultados.js` (for reference — you are replacing the import line and the `tarjeta` function):

- Line 1: `import { loadResultados, groupResultados, esc } from './data.js';`
- Line 4: `const src = (foto) => (foto.includes('/') ? foto : 'assets/results/' + foto);`
- Lines 7-22: `function tarjeta(r, destacada = false) { ... }` — currently always emits a `<button class="tarjeta-resultado" data-foto ...>` with an `<img>` and a "Top X · Deck: Y" line.

- [ ] **Step 1: Update the import** on line 1 to add the two helpers:

```js
import { loadResultados, groupResultados, esc, tieneFoto, deckVisible } from './data.js';
```

- [ ] **Step 2: Replace the entire `tarjeta` function** (lines 7-22) with this version:

```js
function tarjeta(r, destacada = false) {
  const medalla = MEDALLAS[Number(r.puesto)] ?? `#${esc(r.puesto)}`;
  const esCampeon = Number(r.puesto) === 1;
  const borde = esCampeon ? 'border-oro/60 shadow-glow-violeta' : 'border-borde shadow-card';
  const lineaDeck = deckVisible(r.deck)
    ? `<p class="font-body text-sm text-humo">Top ${esc(r.puesto)} · Deck: ${esc(r.deck)}</p>`
    : `<p class="font-body text-sm text-humo">Top ${esc(r.puesto)}</p>`;
  const nombreLinea = `<p class="font-display ${destacada ? 'text-xl' : 'text-base'} font-bold italic text-white">${medalla} ${esc(r.nombre)}</p>`;

  // Con foto: tarjeta interactiva con imagen + lightbox (igual que hoy).
  if (tieneFoto(r)) {
    const altText = `Decklist de ${esc(r.nombre)} (Top ${esc(r.puesto)})`;
    return `
      <button type="button" data-foto="${esc(src(r.foto))}" data-alt="${altText}"
        class="tarjeta-resultado group block w-full rounded-2xl border ${borde} bg-tinta/70 p-3 text-left hover:border-primario">
        <div class="foto-marco ${destacada ? 'h-72 sm:h-96' : 'h-56'} rounded-xl">
          <img src="${esc(src(r.foto))}" alt="${altText}" loading="${destacada ? 'eager' : 'lazy'}"${destacada ? ' fetchpriority="high"' : ''} class="h-full w-full rounded-xl object-cover object-top" />
        </div>
        <div class="px-2 pb-1 pt-3">
          ${nombreLinea}
          ${lineaDeck}
        </div>
      </button>`;
  }

  // Sin foto: tarjeta compacta NO interactiva (sin imagen, sin lightbox).
  return `
    <div class="rounded-2xl border ${borde} bg-tinta/70 ${destacada ? 'p-6' : 'p-4'} text-center">
      <p class="font-display ${destacada ? 'text-3xl' : 'text-2xl'} leading-none">${medalla}</p>
      <div class="mt-2">
        ${nombreLinea}
        ${lineaDeck}
      </div>
    </div>`;
}
```

Note: `src` (line 4), `MEDALLAS` (line 5), `render`, and the lightbox listeners stay unchanged. The compact card has no `tarjeta-resultado` class and no `data-foto`, so the existing delegated lightbox click handler (`closest('.tarjeta-resultado')`) ignores it automatically.

- [ ] **Step 3: Verify the normal-tournament state.** Server on :3000 (check; start `node serve.mjs` background only if down). TEMPORARILY edit `FALLBACK_RESULTADOS` in `js/data.js` to a realistic normal Top 8 (same `torneo`, puestos 1-8; only puesto 1 has `foto: 'mariano-castro-top-1.jpg'` and `deck: 'Snake-Eye'`; puesto 2 `deck: 'Branded'` no foto; puestos 3-8 `foto: ''` and `deck: '—'`; keep the 8 nombres). Also TEMPORARILY blank `RESULTADOS_CSV_URL` in `js/config.js` so the fallback is used. Then:

```bash
node screenshot.mjs http://localhost:3000/resultados.html v4-normal
node screenshot.mjs http://localhost:3000/resultados.html v4-normal-m 390x844
```

READ both: champion (puesto 1) shows the big image + gold border + "Top 1 · Deck: Snake-Eye"; puesto 2 is a compact card showing "🥈 ... / Top 2 · Deck: Branded" (deck shown, no image); puestos 3-8 are compact cards with just "Top N" (no "Deck: —", no broken image). No broken-image icons anywhere. Podium layout intact (champion centered on desktop).

- [ ] **Step 4: Verify lightbox only fires on photo cards.** Puppeteer one-liner (temp file ok, delete after): click the champion card → `#lightbox` becomes `flex`; click a compact card (puesto 5) → `#lightbox` stays `hidden` (it's not a `.tarjeta-resultado`). Expected: `flex` then `hidden`.

- [ ] **Step 5: Verify YACS backward-compat.** REVERT both `js/data.js` and `js/config.js` (`git checkout -- js/data.js js/config.js`; confirm `git diff` clean for both — note the Task 1 helper additions to data.js are already committed, so revert only drops the temporary FALLBACK edit). Screenshot `node screenshot.mjs http://localhost:3000/resultados.html v4-yacs` → READ: the live YACS (8 photos + decks) renders identical to before — all 8 are interactive image cards.

- [ ] **Step 6: `npm test` (22/22) and commit**

```bash
git add js/resultados.js
git commit -m "feat: compact cards for results without a decklist photo"
```

---

### Task 3: Update the results-loading workflow doc

**Files:**
- Modify: `docs/setup-google-sheets.md`

- [ ] **Step 1:** Find the existing paragraph near the top-level "Listo." section that explains loading results (it contains "Para cargar resultados: agregá filas en `Resultados`"). Append a new subsection at the END of the file:

```markdown
## Cargar resultados de un torneo (v4)

1. En la pestaña `Resultados`, agregá una fila por cada jugador del top con: `torneo`
   (el nombre EXACTO del torneo), `puesto` (1, 2, 3…), `nombre`, y `deck` solo si lo sabés.
2. Dejá la columna `foto` **vacía** en todos: las filas sin foto se ven como tarjetas
   compactas (puesto + nombre + deck), sin imagen rota. El "deck" aparece solo si lo cargaste.
3. **Decklist del campeón (o de quien tenga):** mandale la imagen al desarrollador. Él la sube
   al sitio y te dice qué nombre poner en la celda `foto` de esa fila. Recién ahí esa tarjeta
   muestra la imagen (clickeable, se agranda). El resto del top queda compacto.
4. La página se actualiza sola al editar la planilla (no hay que tocar el sitio para el texto).
```

- [ ] **Step 2: Commit**

```bash
git add docs/setup-google-sheets.md
git commit -m "docs: results loading workflow for photo-optional rows"
```

---

### Task 4: Polish pass + deploy

**Files:** Modify any of `js/resultados.js`, `css/custom.css` (only if a fix is needed); none for deploy.

- [ ] **Step 1:** Re-apply the temporary normal-Top-8 fallback (as in Task 2 Step 3) and screenshot desktop + mobile (`v4-pol-*`). READ against: compact cards align cleanly in the podium row next to the (taller) champion card without looking broken; the 4-8 grid mixes compact cards evenly; spacing/typography consistent with the rest of the site; gold border on champion visible; no `Deck: —` anywhere; no overflow at 390px. Fix concrete issues in `js/resultados.js`/`css` if any, re-screenshot (round 2). REVERT the temporary edits; `git diff` clean for js/data.js + js/config.js; `npm test` 22/22.
- [ ] **Step 2: Commit** any polish fixes (only if changed):

```bash
git add js/resultados.js css/
git commit -m "polish: results compact-card refinement"
```

- [ ] **Step 3: Merge + deploy.** Merge the branch to `main` (after `npm test` 22/22), push `origin main`.
- [ ] **Step 4: Live verify.** Poll https://l4gash.github.io/buta-tcg-web/resultados.html until fresh (console signature present via a puppeteer console listener, cache disabled). Confirm the live YACS still renders all 8 image cards and no console errors. Screenshot and READ. Report the live URL + what was verified.

---

## Self-Review (completed by plan author)

- **Spec coverage:** compact photo-less card / no broken image / no lightbox (Task 2) ✓ · deck line only when `deckVisible` (Tasks 1-2) ✓ · champion keeps gold + image (Task 2) ✓ · pure helpers `tieneFoto`/`deckVisible` + tests (Task 1) ✓ · no schema/backend change (nothing touches Apps Script/CSV columns) ✓ · dev-assisted photo hosting documented (Task 3) ✓ · verification: normal Top-8, YACS backward-compat, mixed-deck, mobile, ≥2 rounds (Tasks 2,4) ✓ · out-of-scope (upload form, schema change, extra zoom) respected ✓
- **Placeholder scan:** none — all code is complete; the temporary fallback edits are described concretely and reverted before commit.
- **Type consistency:** `tieneFoto(r)` takes a result row object and reads `.foto`; `deckVisible(deck)` takes the deck string — used consistently in Task 2. `src`, `MEDALLAS`, `render`, lightbox listeners unchanged. Compact card deliberately omits `tarjeta-resultado`/`data-foto` so the existing lightbox delegation skips it.
