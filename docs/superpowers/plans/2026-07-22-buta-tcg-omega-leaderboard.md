# Omega Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Omega" page: a leaderboard of BUTA players' YGO Omega (Duelists Unite) ratings, auto-refreshed server-side from Omega's public API, per `docs/superpowers/specs/2026-07-22-buta-tcg-omega-leaderboard-design.md`.

**Architecture:** A new Google Sheet tab ("Omega") where the admin pastes a player's Omega profile link. An Apps Script time trigger (`refrescarOmega`) fetches each player's data from `https://duelistsunite.org/omega-web/v3/profile?id=<discordId>` (server-side — no CORS) and writes rating/W/L back to the sheet. The page reads the sheet's published CSV (like Ranking/Resultados) and renders a leaderboard. Pure calc (`omega-calc.js`, unit-tested) derives tier/win-rate/matches; the entry (`omega.js`) renders.

**Tech Stack:** unchanged. Node 24 tests `npm test` = `node --test tests/*.test.mjs`; `node serve.mjs` (:3000); `node screenshot.mjs <url> [label] [WxH]`; compiled Tailwind (`css/tailwind.css`, rebuilt via `npm run build:css`). Run `npm test` first to record the green baseline (call it N — currently 116).

**Site is LIVE** at https://l4gash.github.io/buta-tcg-web/. Work on a branch off `main`; do NOT push until the deploy task. Console signature "🐗 BUTA TCG" is the deploy-freshness signal.

**Conventions (verified in this codebase):**
- `js/data.js`: `fetchCsv(url, fallback)` downloads a published CSV and returns parsed rows (via `js/csv.js` `parseCsv`), or `fallback` if the url is empty/fails/returns nothing. Loaders are one-liners: `export const loadX = () => fetchCsv(X_CSV_URL, FALLBACK_X)`. `esc` escapes `&<>"`.
- `js/config.js`: holds the CSV URLs. Empty string = page falls back to embedded data.
- `js/layout.js`: `PAGINAS` is the single nav source; `tests/layout.test.mjs` asserts the exact archivo list.
- Pure calc lives in its own side-effect-free module + a DOM entry named after the page (e.g. `records-calc.js` + `records.js`). Page chrome is copied verbatim from `ranking.html`.
- `apps-script/Code.gs`: backend the admin manually syncs to the Google Apps Script editor. Helper `filas_(nombreHoja)` returns `{ sheet, header, rows }` where each row is an object keyed by the header. `celdaSegura_(texto)` prefixes `'` to text that Sheets might read as a formula. Install-trigger functions follow the `instalarAvisos()` pattern (delete existing triggers for the handler, then create).

**Data honesty:** the Omega API returns live public data that can't be gamed (it's the source of truth). We use the **TCG** fields.

---

## File Structure

```
js/omega-calc.js            # NEW: pure tierDeRating / winRate / construirLeaderboard (Task 1)
tests/omega-calc.test.mjs   # NEW: tests (Task 1)
js/config.js                # + OMEGA_CSV_URL constant (Task 2)
js/data.js                  # + FALLBACK_OMEGA + loadOmega (Task 2)
omega.html                  # NEW: page (Task 2)
js/omega.js                 # NEW: render entry (Task 2)
js/layout.js                # + "Omega" nav entry (Task 2)
tests/layout.test.mjs       # updated exact-list assertion (Task 2)
apps-script/Code.gs         # + refrescarOmega + instalarOmega (Task 3)
docs/setup-google-sheets.md # + "Omega" tab + trigger setup section (Task 3)
```

---

### Task 1: Pure `js/omega-calc.js` — TDD

**Files:**
- Create: `js/omega-calc.js`
- Test: `tests/omega-calc.test.mjs`

- [ ] **Step 0: Baseline.** `npm test`, note passing count N (expected 116). All green.

- [ ] **Step 1: Write failing tests `tests/omega-calc.test.mjs`:**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierDeRating, winRate, construirLeaderboard } from '../js/omega-calc.js';

test('tierDeRating: cada borde de la escalera', () => {
  const nombre = (r) => tierDeRating(r).nombre;
  assert.equal(nombre(49), 'Iron');
  assert.equal(nombre(50), 'Bronze');
  assert.equal(nombre(199), 'Bronze');
  assert.equal(nombre(200), 'Silver');
  assert.equal(nombre(350), 'Gold');
  assert.equal(nombre(600), 'Platinum');
  assert.equal(nombre(999), 'Platinum');
  assert.equal(nombre(1000), 'Diamond');
  assert.equal(nombre(1450), 'Master');
  assert.equal(nombre(2000), 'Omega');
  assert.match(tierDeRating(1200).clase, /\S/); // trae una clase de color no vacía
});

test('winRate: porcentaje con 1 decimal, null si no jugó', () => {
  assert.equal(winRate(90, 74), 54.9);
  assert.equal(winRate(1, 0), 100);
  assert.equal(winRate(0, 0), null);
  assert.equal(winRate('3', '1'), 75); // tolera strings del CSV
});

test('construirLeaderboard: filtra, ordena por rating y numera', () => {
  const rows = [
    { id: '1', nombre: 'A', nombre_buta: 'Ana Liga', rating: '1233', wins: '91', loses: '74', draws: '0', estado: 'ok' },
    { id: '2', nombre: 'B', nombre_buta: '', rating: '1620', wins: '210', loses: '120', draws: '2', estado: 'ok' },
    { id: '3', nombre: 'Pendiente', rating: '', wins: '', loses: '', draws: '', estado: 'link inválido' }, // se descarta
  ];
  const lb = construirLeaderboard(rows);
  assert.equal(lb.length, 2);
  assert.deepEqual(lb.map((p) => p.nombre), ['B', 'A']);        // 1620 antes que 1233
  assert.deepEqual(lb.map((p) => p.puesto), [1, 2]);
  assert.equal(lb[1].matches, 91 + 74 + 0);                     // wins+loses+draws
  assert.equal(lb[1].winRate, 54.9);
  assert.equal(lb[1].tier.nombre, 'Diamond');
  assert.equal(lb[0].tier.nombre, 'Master');
  assert.equal(lb[1].nombreButa, 'Ana Liga');                   // se preserva
  assert.equal(lb[0].nombreButa, '');
});
```

- [ ] **Step 2: Run `npm test` — the new tests FAIL** (`Cannot find module ../js/omega-calc.js`). Rest green.

- [ ] **Step 3: Create `js/omega-calc.js`:**

```js
// Cálculo puro del leaderboard de Omega (sin DOM ni fetch).
// Los datos vienen de la planilla "Omega" (la refresca el backend desde la API de Omega).

// Escalera de tiers por rating (tomada del cliente de YGO Omega). `clase` = color
// temático por tier; se escriben como strings literales para que el scanner de
// Tailwind los incluya al compilar css/tailwind.css.
const TIERS = [
  { min: 2000, nombre: 'Omega', clase: 'text-fuchsia-400 bg-fuchsia-400/10' },
  { min: 1450, nombre: 'Master', clase: 'text-violeta-glow bg-violeta/15' },
  { min: 1000, nombre: 'Diamond', clase: 'text-primario-glow bg-primario/15' },
  { min: 600, nombre: 'Platinum', clase: 'text-teal-300 bg-teal-300/10' },
  { min: 350, nombre: 'Gold', clase: 'text-oro bg-oro/15' },
  { min: 200, nombre: 'Silver', clase: 'text-slate-300 bg-slate-300/10' },
  { min: 50, nombre: 'Bronze', clase: 'text-amber-600 bg-amber-600/10' },
  { min: 0, nombre: 'Iron', clase: 'text-zinc-400 bg-zinc-400/10' },
];

export function tierDeRating(rating) {
  const r = Number(rating) || 0;
  return TIERS.find((t) => r >= t.min);
}

export function winRate(wins, loses) {
  const w = Number(wins) || 0;
  const l = Number(loses) || 0;
  if (w + l === 0) return null;
  return Math.round((w / (w + l)) * 1000) / 10; // 1 decimal
}

export function construirLeaderboard(rows) {
  return (rows ?? [])
    .filter((r) => String(r?.estado ?? '').trim().toLowerCase() === 'ok' && Number.isFinite(Number(r?.rating)))
    .map((r) => {
      const wins = Number(r.wins) || 0;
      const loses = Number(r.loses) || 0;
      const draws = Number(r.draws) || 0;
      const rating = Math.round(Number(r.rating));
      return {
        id: String(r.id ?? '').trim(),
        nombre: String(r.nombre ?? '').trim(),
        nombreButa: String(r.nombre_buta ?? '').trim(),
        rating,
        tier: tierDeRating(rating),
        winRate: winRate(wins, loses),
        wins,
        loses,
        draws,
        matches: wins + loses + draws,
      };
    })
    .sort((a, b) => b.rating - a.rating)
    .map((p, i) => ({ ...p, puesto: i + 1 }));
}
```

- [ ] **Step 4: Run `npm test` — all pass** (N + 3).

- [ ] **Step 5: Commit**

```bash
git add js/omega-calc.js tests/omega-calc.test.mjs
git commit -m "feat: omega-calc pure module (tier/win-rate/leaderboard)"
```

---

### Task 2: Page `omega.html` + render `js/omega.js` + data loader + nav

**Files:**
- Modify: `js/config.js`, `js/data.js`, `js/layout.js`, `tests/layout.test.mjs`, `css/tailwind.css` (rebuild)
- Create: `omega.html`, `js/omega.js`

- [ ] **Step 1: Add the CSV URL constant to `js/config.js`.** After the `RANKING_CSV_URL` line, add:

```js
// Leaderboard de Omega (pestaña "Omega" de la planilla principal, publicada como CSV).
// Vacío = la página muestra "todavía no hay jugadores". Completar con la URL publicada real.
export const OMEGA_CSV_URL = '';
```

- [ ] **Step 2: Add the loader to `js/data.js`.** Change the import on line 2 to include `OMEGA_CSV_URL`:

```js
import { TORNEOS_CSV_URL, RESULTADOS_CSV_URL, RANKING_CSV_URL, OMEGA_CSV_URL } from './config.js';
```

Then, right after the `loadRanking` definition (line 90), add:

```js
// ---- Leaderboard de Omega (Duelists Unite) ----
// Sin datos de respaldo: si la planilla no está configurada, la página muestra
// su estado vacío (no inventamos jugadores).
export const FALLBACK_OMEGA = [];
export const loadOmega = () => fetchCsv(OMEGA_CSV_URL, FALLBACK_OMEGA);
```

- [ ] **Step 3: Create `omega.html`** by copying `ranking.html`'s chrome VERBATIM (read it first): the full `<head>` (authorship build comment, OG/meta tags, manifest/theme-color/apple-touch-icon, `css/tailwind.css`, `js/theme.js`, `css/custom.css`), and in the body `<script type="module" src="js/layout.js">` as the FIRST module, `#site-header`, `#site-footer`, `<div id="volver">`. Change ONLY:
  - `<title>` → `Omega — BUTA TCG`; the meta description + `og:title`/`og:description`/`og:url` (→ `.../omega.html`) to Omega-leaderboard text, e.g. description "Leaderboard de YGO Omega de la comunidad de BUTA TCG: rating, tier y win rate de cada jugador."
  - `<main class="mx-auto max-w-3xl px-4">` containing exactly:

```html
    <div id="volver" class="pt-4"></div>

    <section class="pb-4 pt-12 text-center">
      <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Omega</p>
      <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">Leaderboard de Omega</h1>
      <p class="mx-auto mt-4 max-w-xl font-body text-sm leading-[1.7] text-humo">El rating en YGO Omega (Duelists Unite) de los jugadores de la comunidad. Los datos salen de Omega y se actualizan periódicamente.</p>
    </section>

    <section id="leaderboard" class="py-6"></section>

    <p class="pb-10 text-center font-body text-xs text-humo">¿Jugás en Omega y querés aparecer? Mandanos tu perfil por <a href="https://www.instagram.com/butatcg/" target="_blank" rel="noopener noreferrer" class="text-primario-glow hover:underline">Instagram</a>.</p>
```

  - Entry script (last module before `</body>`): `<script type="module" src="js/omega.js"></script>`

- [ ] **Step 4: Create `js/omega.js`:**

```js
import { loadOmega, esc } from './data.js';
import { construirLeaderboard } from './omega-calc.js';

const perfilOmega = (id) => `https://tournament.duelistsunite.org/#/profile/${encodeURIComponent(id)}`;

function nombreHtml(p) {
  const nombre = esc(p.nombre || '—');
  return p.nombreButa
    ? `<a href="jugador.html?nombre=${encodeURIComponent(p.nombreButa)}" class="truncate font-display font-bold italic text-white hover:text-primario-glow">${nombre}</a>`
    : `<span class="block truncate font-display font-bold italic text-white">${nombre}</span>`;
}

function filaHtml(p) {
  return `
    <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-borde px-4 py-3 first:border-t-0">
      <span class="w-6 shrink-0 text-center font-display text-sm font-bold text-humo">${p.puesto}</span>
      <div class="min-w-0">
        ${nombreHtml(p)}
        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs text-humo">
          <span class="rounded-full px-2 py-0.5 font-semibold ${p.tier.clase}">${p.tier.nombre}</span>
          ${p.winRate == null ? '' : `<span>${p.winRate}% WR</span>`}
          <span>${p.wins}–${p.loses}${p.draws ? `–${p.draws}` : ''}</span>
          <a href="${perfilOmega(p.id)}" target="_blank" rel="noopener noreferrer" class="text-primario-glow hover:underline">Omega ↗</a>
        </div>
      </div>
      <span class="shrink-0 font-display text-xl font-bold text-primario-glow">${p.rating}</span>
    </div>`;
}

const cont = document.getElementById('leaderboard');
try {
  const jugadores = construirLeaderboard(await loadOmega());
  cont.innerHTML = jugadores.length
    ? `<div class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">${jugadores.map(filaHtml).join('')}</div>`
    : '<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-10 text-center font-body text-humo shadow-card">Todavía no hay jugadores cargados.</p>';
} catch {
  cont.innerHTML = '<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-10 text-center font-body text-humo shadow-card">No se pudieron cargar los datos. Probá recargar.</p>';
}
```

Before trusting the imports: confirm `js/data.js` exports `loadOmega` (added in Step 2) and `esc`, and `js/omega-calc.js` exports `construirLeaderboard`. Adapt if reality differs (report any change).

- [ ] **Step 5: Add the nav entry in `js/layout.js`.** In `PAGINAS`, insert immediately AFTER the `ranking.html` entry and BEFORE the `jugadores.html` entry:

```js
  { archivo: 'omega.html', etiqueta: 'Omega' },
```

- [ ] **Step 6: Update `tests/layout.test.mjs`.** The test `'PAGINAS incluye las 8 páginas del sitio'` asserts the exact archivo list. Update its title to "9 páginas" and insert `'omega.html'` after `'ranking.html'` in the expected array:

```js
test('PAGINAS incluye las 9 páginas del sitio', () => {
  assert.deepEqual(PAGINAS.map((p) => p.archivo), [
    'index.html', 'torneos.html', 'resultados.html', 'ranking.html', 'omega.html', 'jugadores.html', 'records.html', 'cara-a-cara.html', 'nosotros.html',
  ]);
});
```

Do NOT weaken any other assertion (the generic PAGINAS-iterating tests still pass). Run `npm test`; expect all green (N + 3).

- [ ] **Step 7: Rebuild the compiled CSS.** The new tier badge classes (`text-fuchsia-400`, `bg-fuchsia-400/10`, `bg-violeta/15`, `bg-primario/15`, `text-teal-300`, `bg-teal-300/10`, `bg-oro/15`, `text-slate-300`, `bg-slate-300/10`, `text-amber-600`, `bg-amber-600/10`, `text-zinc-400`, `bg-zinc-400/10`) plus the page's `tracking-[0.3em]` must be compiled. Run:

```bash
npm run build:css
```

Confirm `git status` shows `css/tailwind.css` modified. (If `build:css` is missing, check `package.json` scripts for the Tailwind build command and use that.)

- [ ] **Step 8: Visual verification (MANDATORY).** Since `OMEGA_CSV_URL` is empty, the page shows the empty state. To screenshot with data, TEMPORARILY put sample rows in `FALLBACK_OMEGA` in `js/data.js` (revert before commit):

```js
export const FALLBACK_OMEGA = [
  { id: '354099825249353738', nombre: 'MarianoCB', nombre_buta: 'Mariano Castro', rating: '1233', wins: '91', loses: '74', draws: '0', estado: 'ok' },
  { id: '111', nombre: 'ElProfe', nombre_buta: '', rating: '1620', wins: '210', loses: '120', draws: '2', estado: 'ok' },
  { id: '222', nombre: 'DiamondDude', nombre_buta: 'Juan Gordillo', rating: '1050', wins: '60', loses: '55', draws: '0', estado: 'ok' },
  { id: '333', nombre: 'PlatKid', nombre_buta: '', rating: '720', wins: '40', loses: '44', draws: '1', estado: 'ok' },
  { id: '444', nombre: 'BronzeBoi', nombre_buta: '', rating: '120', wins: '8', loses: '20', draws: '0', estado: 'ok' },
];
```

Ensure a dev server is running on :3000 (check first; `node serve.mjs` in the background only if down — verify it serves the BUTA index). Then:

```bash
node screenshot.mjs "http://localhost:3000/omega.html" omega
node screenshot.mjs "http://localhost:3000/omega.html" omega-m 390x844
```

READ both PNGs. Verify: rows sorted by rating desc (1620, 1233, 1050, 720, 120) with puesto 1–5; each tier badge shows with its color (Master purple, Diamond cyan, Platinum teal, Bronze amber); win-rate % and W–L present; "Omega ↗" links; "Mariano Castro" and "Juan Gordillo" render as BUTA-profile links while the others are plain text; rating in big cyan on the right; nav shows "Omega"; no horizontal overflow at 390px. Do at least 2 comparison rounds — fix concrete issues, re-screenshot.

Then screenshot the empty state: temporarily set `FALLBACK_OMEGA = []` again (its final state), reload, `node screenshot.mjs "http://localhost:3000/omega.html" omega-empty` → READ: shows "Todavía no hay jugadores cargados." and the Instagram note.

- [ ] **Step 9: Revert the sample data.** Ensure `FALLBACK_OMEGA` is back to `[]` in `js/data.js` (the empty array from Step 2). Confirm with `git diff js/data.js` that only the import + the `loadOmega`/`FALLBACK_OMEGA = []` additions remain — no sample rows.

- [ ] **Step 10: Interaction check (puppeteer, from project root so `puppeteer` resolves; delete the temp script after).** With sample rows temporarily restored OR by driving `construirLeaderboard` — simplest: temporarily set the sample `FALLBACK_OMEGA` again, then run a script `omega-check-tmp.mjs` in the project root that loads `http://localhost:3000/omega.html` and asserts: (a) a BUTA link href contains `jugador.html?nombre=`; (b) an Omega link href contains `tournament.duelistsunite.org/#/profile/`; (c) the first row's rating text is `1620`. Print PASS/FAIL, delete the script, and re-revert `FALLBACK_OMEGA` to `[]`.

- [ ] **Step 11: Run `npm test`** (N + 3, green) and confirm `git diff js/data.js` has no sample rows.

- [ ] **Step 12: Commit**

```bash
git add omega.html js/omega.js js/config.js js/data.js js/layout.js tests/layout.test.mjs css/tailwind.css
git commit -m "feat: Omega leaderboard page + loader + nav"
```

---

### Task 3: Apps Script backend `refrescarOmega` + trigger + docs

**Files:**
- Modify: `apps-script/Code.gs`, `docs/setup-google-sheets.md`

There are no Node tests for Apps Script (it runs in Google's environment); this task adds the code and documents manual verification.

- [ ] **Step 1: Add the Omega refresh code to `apps-script/Code.gs`.** After the `HOJA_AVISOS` constant (near line 16) add:

```js
const HOJA_OMEGA = 'Omega';
const OMEGA_API = 'https://duelistsunite.org/omega-web/v3/profile?id=';
```

Then, just before the final `filas_` helper definition (the line `function filas_(nombreHoja) {`), add:

```js
// ---- Leaderboard de Omega (Duelists Unite) ----
// Recorre la hoja "Omega": por cada fila con un link de perfil, saca el Discord ID,
// pega a la API pública de Omega (server-side, sin CORS) y escribe rating/W/L/estado.
// El admin solo carga la columna `link` (y opcional `nombre_buta`); el resto lo llena esto.
function refrescarOmega() {
  const om = filas_(HOJA_OMEGA);
  const cols = ['link', 'id', 'nombre', 'rating', 'wins', 'loses', 'draws', 'lastlogin', 'actualizado', 'estado'];
  const idx = {};
  cols.forEach(function (c) { idx[c] = om.header.indexOf(c); });
  if (idx.link === -1) return; // hoja sin la columna link: no hacemos nada

  om.rows.forEach(function (r, i) {
    const fila = i + 2; // +2: la fila 1 es el encabezado
    const set = function (col, val) { if (idx[col] !== -1) om.sheet.getRange(fila, idx[col] + 1).setValue(val); };
    const link = String(r.link || '').trim();
    if (!link) return;
    const m = link.match(/profile\/(\d+)/) || link.match(/(\d{15,})/);
    if (!m) { set('estado', 'link inválido'); return; }
    const id = m[1];
    try {
      const res = UrlFetchApp.fetch(OMEGA_API + encodeURIComponent(id), { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) { set('estado', 'http ' + res.getResponseCode()); return; }
      const payload = JSON.parse(res.getContentText());
      const data = payload && payload.data;
      if (!data || data.success === false) { set('estado', 'sin datos'); return; }
      set('id', "'" + id); // apóstrofe: Sheets guarda el ID largo como texto, no como número
      set('nombre', celdaSegura_(String(data.displayname || data.username || '')));
      set('rating', Math.round(Number(data.tcgrating) || 0));
      set('wins', Number(data.tcgwins) || 0);
      set('loses', Number(data.tcgloses) || 0);
      set('draws', Number(data.tcgdraws) || 0);
      set('lastlogin', String(data.lastlogin || ''));
      set('actualizado', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));
      set('estado', 'ok');
    } catch (err) {
      set('estado', 'error');
    }
  });
}

// Ejecutá esta función UNA vez desde el editor (como instalarAvisos) para instalar
// el disparador que refresca Omega cada 12 h y correrlo una vez ahora. Idempotente.
function instalarOmega() {
  ScriptApp.getProjectTriggers()
    .filter(function (tr) { return tr.getHandlerFunction() === 'refrescarOmega'; })
    .forEach(function (tr) { ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger('refrescarOmega').timeBased().everyHours(12).create();
  refrescarOmega();
  Logger.log('Omega: refresco instalado (cada 12 h) y ejecutado una vez.');
}
```

- [ ] **Step 2: Document the setup in `docs/setup-google-sheets.md`.** Append a section (match the file's existing heading style — read it first):

```markdown
## Leaderboard de Omega

1. Creá una pestaña nueva llamada exactamente `Omega` con estos encabezados en la fila 1 (en este orden):
   `link | nombre_buta | id | nombre | rating | wins | loses | draws | lastlogin | actualizado | estado`
2. Publicá esa pestaña como CSV (Archivo → Compartir → Publicar en la web → esta hoja → CSV) y copiá la URL.
3. Pegá esa URL en `OMEGA_CSV_URL` de `js/config.js`.
4. En el editor de Apps Script, pegá el `Code.gs` actualizado y ejecutá `instalarOmega` una vez (autorizá el permiso de "conectarse a un servicio externo" que pide para UrlFetchApp). Queda refrescando cada 12 h.
5. Para sumar un jugador: pegá el link de su perfil de Omega (`tournament.duelistsunite.org/#/profile/…`) en la columna `link` (opcional: su nombre de la liga en `nombre_buta`). El resto se completa solo en el próximo refresco.
```

- [ ] **Step 3: Commit** (no code to test here — Apps Script isn't run by `npm test`; verify `npm test` still N+3 green since only Code.gs/docs changed):

```bash
git add apps-script/Code.gs docs/setup-google-sheets.md
git commit -m "feat: Apps Script refrescarOmega + trigger + setup docs"
```

---

### Task 4: Integration with the owner + deploy + live check

This task needs the site owner (real Google Sheet + Apps Script). Do it in the main session, coordinating with the user — NOT via a subagent.

- [ ] **Step 1: Merge to `main`.** After `npm test` is green (N + 3), merge the feature branch to `main` (fast-forward), but do NOT push yet.
- [ ] **Step 2: Ask the owner to do the sheet setup** (from `docs/setup-google-sheets.md` — the "Leaderboard de Omega" section): create + publish the `Omega` tab, and give you the published CSV URL. Set `OMEGA_CSV_URL` in `js/config.js` to that URL. Commit: `git commit -am "chore: set OMEGA_CSV_URL to published Omega tab"`.
- [ ] **Step 3: Ask the owner to paste the updated `apps-script/Code.gs` into the Apps Script editor and run `instalarOmega` once** (authorizing the external-request permission). Confirm the sheet fills (rating/W/L/estado=ok) for at least one pasted profile link — e.g. the MarianoCB example (`…/profile/354099825249353738`).
- [ ] **Step 4: Push.** `git push origin main`.
- [ ] **Step 5: Live verify.** Poll https://l4gash.github.io/buta-tcg-web/omega.html until fresh (puppeteer, cache disabled, wait for the "🐗 BUTA TCG" console signature). Confirm on the LIVE site: the leaderboard renders from the published CSV with real players sorted by rating; tier badges colored; Omega links open the right profile; BUTA links present where `nombre_buta` is set; "Omega" nav item on this and another page; no console errors. Screenshot desktop + mobile and READ. Report the live URL + what was verified.

---

## Self-Review (completed by plan author)

- **Spec coverage:** public Omega API by Discord ID, server-side (Task 3 `refrescarOmega`) ✓ · admin pastes link in "Omega" tab, no form (Task 3 docs + sheet) ✓ · time-trigger refresh every 12h (`instalarOmega`) ✓ · shows puesto/nombre/rating/tier(color)/win-rate/matches/Omega-link (Tasks 1–2) ✓ · optional `nombre_buta` → BUTA profile link (Tasks 1–2) ✓ · TCG fields ✓ · sort by rating desc (Task 1) ✓ · tier ladder Iron/Bronze/…/Omega at exact thresholds (Task 1 tests) ✓ · pure calc + tests (Task 1) ✓ · nav entry + layout test (Task 2) ✓ · empty/error states (Task 2) ✓ · user setup steps documented (Task 3) ✓ · verification: unit tests, ≥2 screenshot rounds incl. empty state, puppeteer link checks, live check (Tasks 1–4) ✓ · out-of-scope (self-service form, OCG, rating history) respected — none built ✓ · nav-density follow-up noted in spec, not built ✓
- **Placeholder scan:** none — all code complete; sample data is explicitly temporary with a revert step; temp puppeteer script described concretely and deleted.
- **Type consistency:** `construirLeaderboard` returns objects with `{ id, nombre, nombreButa, rating, tier:{nombre,clase}, winRate, wins, loses, draws, matches, puesto }`; `js/omega.js` consumes exactly those (`p.tier.clase`, `p.tier.nombre`, `p.nombreButa`, `p.winRate`, `p.wins`, `p.loses`, `p.draws`, `p.rating`, `p.puesto`, `p.id`). Sheet columns `link|nombre_buta|id|nombre|rating|wins|loses|draws|lastlogin|actualizado|estado` match what `refrescarOmega` writes (Task 3) and what `construirLeaderboard` reads (`estado`, `rating`, `wins`, `loses`, `draws`, `nombre`, `nombre_buta`, `id`) (Task 1). `loadOmega` (Task 2) ↔ `OMEGA_CSV_URL` (Task 2 config) ↔ `fetchCsv` (existing). Nav entry `{archivo:'omega.html', etiqueta:'Omega'}` matches `PAGINAS` shape and the layout-test list.
