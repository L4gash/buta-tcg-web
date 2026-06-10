# BUTA TCG Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the BUTA TCG multi-page static website (Spanish) with Google Sheets-backed tournament data, online registration, and past-results galleries, per the approved spec at `docs/superpowers/specs/2026-06-09-buta-tcg-website-design.md`.

**Architecture:** Four static HTML pages styled with Tailwind CDN + a shared theme file ("Neón Duelista" dark/neon aesthetic). Vanilla JS ES modules read tournament/result data from published Google Sheets CSVs with embedded fallback data, and submit registrations to a Google Apps Script Web App. No build step; pure functions are unit-tested with `node --test`.

**Tech Stack:** HTML + Tailwind CSS (CDN), vanilla JS (ES modules), Node 24 (dev tooling: `node --test`, puppeteer for screenshots, sharp for image optimization), Google Sheets + Apps Script (data + registration backend).

**IMPORTANT — CLAUDE.md compliance:** Before writing any frontend code (Tasks 6–10), the executor MUST invoke the `frontend-design` skill, serve via `node serve.mjs` on localhost:3000 (never `file:///`), and screenshot with `node screenshot.mjs http://localhost:3000/...`. Anti-generic guardrails from CLAUDE.md apply to all pages. **Note:** CLAUDE.md references puppeteer at `C:/Users/nateh/...` — that path belongs to another machine and does not exist here; Task 1 installs puppeteer locally in this project instead.

**Language:** All user-facing text is Spanish (Argentina). Code identifiers and commits in English/Spanish as shown.

---

## File Structure

```
/ (project root)
├── package.json                 # dev deps: puppeteer, sharp
├── serve.mjs                    # static server :3000 (Task 1)
├── screenshot.mjs               # puppeteer screenshots (Task 1)
├── index.html                   # Inicio (Task 6)
├── torneos.html                 # Torneos + inscripción (Task 7)
├── resultados.html              # Resultados + lightbox (Task 8)
├── nosotros.html                # Nosotros (Task 9)
├── css/custom.css               # grain, glows, fonts, focus states (Task 4)
├── js/
│   ├── theme.js                 # tailwind.config tokens (Task 4)
│   ├── config.js                # CSV/Apps Script URLs (empty = fallback) (Task 4)
│   ├── csv.js                   # CSV parser (pure, tested) (Task 3)
│   ├── validation.js            # nombre/Konami ID validators (pure, tested) (Task 3)
│   ├── data.js                  # fetch + fallback + pure selectors (tested) (Task 4)
│   ├── inscripcion.js           # registration form logic (Task 7)
│   └── resultados.js            # results rendering + lightbox (Task 8)
├── assets/
│   ├── logo-butatcg.png         # (Task 2)
│   ├── yacs.jpg                 # (Task 2)
│   └── results/*.jpg            # 8 optimized top photos (Task 2)
├── scripts/optimize-images.mjs  # one-off sharp pipeline (Task 2)
├── apps-script/Code.gs          # paste-into-Google backend (Task 5)
├── docs/
│   ├── setup-google-sheets.md   # 5-step setup guide for BUTA (Task 5)
│   └── sheets-template/         # seed CSVs: torneos, resultados, inscripciones (Task 5)
└── tests/
    ├── csv.test.mjs             # (Task 3)
    ├── validation.test.mjs      # (Task 3)
    └── data.test.mjs            # (Task 4)
```

Header/footer markup is intentionally duplicated across the 4 pages (no build step, no JS-injected chrome — content visible without JS). Keep them byte-identical except the highlighted nav item.

---

### Task 1: Dev tooling — package.json, serve.mjs, screenshot.mjs

**Files:**
- Create: `package.json`
- Create: `serve.mjs`
- Create: `screenshot.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Init npm and install dev deps**

```bash
npm init -y
npm install --save-dev puppeteer sharp
```

Expected: `node_modules/` created, puppeteer downloads Chrome (~150 MB, may take a few minutes).

- [ ] **Step 2: Append to `.gitignore`**

Append these lines to the existing `.gitignore`:

```
node_modules/
assets-src/
```

- [ ] **Step 3: Edit `package.json`** — set `"type": "module"` and a test script. Replace the generated scripts/type fields so the file contains at minimum:

```json
{
  "name": "buta-tcg-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "serve": "node serve.mjs"
  },
  "devDependencies": {
    "puppeteer": "*",
    "sharp": "*"
  }
}
```

(Keep the actual versions npm wrote; only ensure `type`, `scripts` are as above.)

- [ ] **Step 4: Create `serve.mjs`**

```js
// Static file server for local development. Serves the project root at :3000.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
}).listen(PORT, () => console.log(`BUTA TCG dev server: http://localhost:${PORT}`));
```

- [ ] **Step 5: Create `screenshot.mjs`**

Usage: `node screenshot.mjs <url> [label] [WIDTHxHEIGHT]` — default viewport 1440x900; pass `390x844` for mobile. Saves to `./temporary screenshots/screenshot-N[-label].png`, auto-incremented, never overwritten.

```js
import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const [url, label, size] = process.argv.slice(2);
if (!url) { console.error('Usage: node screenshot.mjs <url> [label] [WIDTHxHEIGHT]'); process.exit(1); }
const [width, height] = (size ?? '1440x900').split('x').map(Number);

const DIR = 'temporary screenshots';
await mkdir(DIR, { recursive: true });
const nums = (await readdir(DIR))
  .map((f) => f.match(/^screenshot-(\d+)/)?.[1])
  .filter(Boolean)
  .map(Number);
const n = nums.length ? Math.max(...nums) + 1 : 1;
const out = join(DIR, `screenshot-${n}${label ? `-${label}` : ''}.png`);

const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: out, fullPage: true });
} finally {
  await browser.close();
}
console.log(out);
```

- [ ] **Step 6: Verify server + screenshot pipeline**

Create a throwaway `index.html` containing exactly `<h1>BUTA TCG</h1>`, then:

```bash
node serve.mjs   # run in background
node screenshot.mjs http://localhost:3000 smoke
```

Expected: prints `temporary screenshots\screenshot-1-smoke.png`; the PNG shows "BUTA TCG". Read the PNG with the Read tool to confirm. Delete the throwaway `index.html` after (the real one comes in Task 6). Leave the server running for the rest of the plan.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json serve.mjs screenshot.mjs .gitignore
git commit -m "chore: dev tooling - static server, screenshot pipeline, test runner"
```

---

### Task 2: Asset pipeline — optimized images with web-safe names

**Files:**
- Create: `scripts/optimize-images.mjs`
- Create (generated): `assets/logo-butatcg.png`, `assets/yacs.jpg`, `assets/results/*.jpg` (8 files)

- [ ] **Step 1: Create `scripts/optimize-images.mjs`**

Source images live in `Buta TCG/` (folder with spaces, ~2.2 MB each). Outputs go to `assets/`, resized to max 1000 px wide, JPEG quality 80.

```js
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'Buta TCG';
const photos = [
  ['Mariano Castro Top 1.jpg', 'mariano-castro-top-1.jpg'],
  ['Juan Gordillo top 2.jpg', 'juan-gordillo-top-2.jpg'],
  ['Pedro Torres top 3.jpg', 'pedro-torres-top-3.jpg'],
  ['Top 4 Juan pablo ynfantes.jpg', 'juan-pablo-ynfantes-top-4.jpg'],
  ['Rodo top 5.jpg', 'rodo-top-5.jpg'],
  ['Ricardo Jara Top 6.jpg', 'ricardo-jara-top-6.jpg'],
  ['Alexis Juncos Top 7.jpg', 'alexis-juncos-top-7.jpg'],
  ['Enzo Alfonzo Top 8.jpg', 'enzo-alfonzo-top-8.jpg'],
];

await mkdir('assets/results', { recursive: true });
for (const [src, out] of photos) {
  await sharp(`${SRC}/${src}`).resize({ width: 1000, withoutEnlargement: true })
    .jpeg({ quality: 80 }).toFile(`assets/results/${out}`);
  console.log(out);
}
await sharp(`${SRC}/logo butatcg.png`).resize({ width: 480, withoutEnlargement: true })
  .png().toFile('assets/logo-butatcg.png');
await sharp(`${SRC}/YACS.jpg`).resize({ width: 700, withoutEnlargement: true })
  .jpeg({ quality: 80 }).toFile('assets/yacs.jpg');
console.log('done');
```

- [ ] **Step 2: Run it**

```bash
node scripts/optimize-images.mjs
```

Expected: prints the 8 filenames + `done`. Verify with `ls assets/results` → 8 files, each well under 400 KB.

- [ ] **Step 3: Commit**

```bash
git add scripts/optimize-images.mjs assets/
git commit -m "feat: optimized brand and tournament photo assets"
```

---

### Task 3: Pure data utilities — CSV parser and validators (TDD)

**Files:**
- Create: `js/csv.js`, `js/validation.js`
- Test: `tests/csv.test.mjs`, `tests/validation.test.mjs`

- [ ] **Step 1: Write failing tests `tests/csv.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../js/csv.js';

test('parses header + rows into objects', () => {
  const rows = parseCsv('nombre,puesto\nMariano Castro,1\nJuan Gordillo,2');
  assert.deepEqual(rows, [
    { nombre: 'Mariano Castro', puesto: '1' },
    { nombre: 'Juan Gordillo', puesto: '2' },
  ]);
});

test('handles quoted fields with commas and escaped quotes', () => {
  const rows = parseCsv('lugar,nota\n"Cinerama, Córdoba","dijo ""topeé"" ayer"');
  assert.deepEqual(rows, [{ lugar: 'Cinerama, Córdoba', nota: 'dijo "topeé" ayer' }]);
});

test('handles CRLF and skips blank trailing lines', () => {
  const rows = parseCsv('a,b\r\n1,2\r\n\r\n');
  assert.deepEqual(rows, [{ a: '1', b: '2' }]);
});

test('handles newlines inside quoted fields', () => {
  const rows = parseCsv('a,b\n"línea 1\nlínea 2",x');
  assert.deepEqual(rows, [{ a: 'línea 1\nlínea 2', b: 'x' }]);
});
```

- [ ] **Step 2: Write failing tests `tests/validation.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarNombre, validarKonamiId } from '../js/validation.js';

test('nombre: requires at least 3 chars after trim', () => {
  assert.equal(validarNombre('  Juan Pérez  '), true);
  assert.equal(validarNombre('Jo'), false);
  assert.equal(validarNombre('   '), false);
  assert.equal(validarNombre(''), false);
});

test('konami id: exactly 10 digits', () => {
  assert.equal(validarKonamiId('0123456789'), true);
  assert.equal(validarKonamiId(' 0123456789 '), true); // tolerates padding
  assert.equal(validarKonamiId('123456789'), false);   // 9 digits
  assert.equal(validarKonamiId('12345678901'), false); // 11 digits
  assert.equal(validarKonamiId('12345abcde'), false);
  assert.equal(validarKonamiId(''), false);
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module .../js/csv.js` (and validation.js).

- [ ] **Step 4: Implement `js/csv.js`**

```js
// Minimal RFC-4180 CSV parser. First row is the header; returns array of objects.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const cleaned = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (cleaned.length < 2) return [];
  const header = cleaned[0].map((h) => h.trim());
  return cleaned.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
```

- [ ] **Step 5: Implement `js/validation.js`**

```js
export function validarNombre(nombre) {
  return typeof nombre === 'string' && nombre.trim().length >= 3;
}

export function validarKonamiId(id) {
  return typeof id === 'string' && /^\d{10}$/.test(id.trim());
}
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add js/csv.js js/validation.js tests/
git commit -m "feat: CSV parser and form validators with tests"
```

---

### Task 4: Data layer, config, theme tokens, custom CSS

**Files:**
- Create: `js/config.js`, `js/data.js`, `js/theme.js`, `css/custom.css`
- Test: `tests/data.test.mjs`

- [ ] **Step 1: Create `js/config.js`**

```js
// URLs del backend de datos. Vacías = la web usa los datos de respaldo embebidos.
// Instrucciones para completarlas: docs/setup-google-sheets.md
export const TORNEOS_CSV_URL = '';
export const RESULTADOS_CSV_URL = '';
export const APPS_SCRIPT_URL = '';
export const INSTAGRAM_URL = 'https://www.instagram.com/butatcg/';
```

- [ ] **Step 2: Write failing tests `tests/data.test.mjs`** (pure selectors only — fetch paths are exercised manually in the browser)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickProximo, groupResultados, FALLBACK_TORNEOS, FALLBACK_RESULTADOS } from '../js/data.js';

test('pickProximo returns first torneo with estado proximo, else null', () => {
  assert.equal(pickProximo([{ estado: 'finalizado' }]), null);
  const t = [{ nombre: 'A', estado: 'finalizado' }, { nombre: 'B', estado: 'proximo' }];
  assert.equal(pickProximo(t).nombre, 'B');
  assert.equal(pickProximo([]), null);
});

test('groupResultados groups by torneo and sorts by puesto numerically', () => {
  const rows = [
    { torneo: 'YACS', puesto: '10', nombre: 'X' },
    { torneo: 'YACS', puesto: '2', nombre: 'Y' },
    { torneo: 'Otro', puesto: '1', nombre: 'Z' },
  ];
  const g = groupResultados(rows);
  assert.deepEqual(Object.keys(g), ['YACS', 'Otro']);
  assert.deepEqual(g.YACS.map((r) => r.puesto), ['2', '10']);
});

test('fallback data: YACS tournament and 8 results present', () => {
  assert.equal(FALLBACK_TORNEOS[0].nombre, 'YACS Córdoba');
  assert.equal(FALLBACK_RESULTADOS.length, 8);
  assert.equal(FALLBACK_RESULTADOS[0].nombre, 'Mariano Castro');
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module .../js/data.js`.

- [ ] **Step 4: Implement `js/data.js`**

```js
import { parseCsv } from './csv.js';
import { TORNEOS_CSV_URL, RESULTADOS_CSV_URL } from './config.js';

// ---- Datos de respaldo (se muestran si la planilla no está configurada o no responde) ----
export const FALLBACK_TORNEOS = [{
  nombre: 'YACS Córdoba',
  fecha: '2025-12-06',
  hora: '10:00',
  lugar: 'Córdoba, Argentina',
  formato: 'Avanzado TCG · suizo + top cut',
  reglas: 'Banlist TCG vigente',
  precio: '',
  premios: 'Premios para el top',
  cupo_maximo: '32',
  estado: 'finalizado',
}];

const foto = (f) => `assets/results/${f}`;
export const FALLBACK_RESULTADOS = [
  { torneo: 'YACS Córdoba 06/12', puesto: '1', nombre: 'Mariano Castro', deck: '—', foto: foto('mariano-castro-top-1.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '2', nombre: 'Juan Gordillo', deck: '—', foto: foto('juan-gordillo-top-2.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '3', nombre: 'Pedro Torres', deck: '—', foto: foto('pedro-torres-top-3.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '4', nombre: 'Juan Pablo Ynfantes', deck: '—', foto: foto('juan-pablo-ynfantes-top-4.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '5', nombre: 'Rodo', deck: '—', foto: foto('rodo-top-5.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '6', nombre: 'Ricardo Jara', deck: '—', foto: foto('ricardo-jara-top-6.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '7', nombre: 'Alexis Juncos', deck: '—', foto: foto('alexis-juncos-top-7.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '8', nombre: 'Enzo Alfonzo', deck: '—', foto: foto('enzo-alfonzo-top-8.jpg') },
];

// ---- Selectores puros ----
export function pickProximo(torneos) {
  return torneos.find((t) => (t.estado ?? '').trim().toLowerCase() === 'proximo'
    || (t.estado ?? '').trim().toLowerCase() === 'próximo') ?? null;
}

export function groupResultados(rows) {
  const out = {};
  for (const r of rows) (out[r.torneo] ??= []).push(r);
  for (const k of Object.keys(out)) out[k].sort((a, b) => Number(a.puesto) - Number(b.puesto));
  return out;
}

// ---- Carga remota con fallback ----
async function fetchCsv(url, fallback) {
  if (!url) return fallback;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return fallback;
    const rows = parseCsv(await res.text());
    return rows.length ? rows : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

export const loadTorneos = () => fetchCsv(TORNEOS_CSV_URL, FALLBACK_TORNEOS);
export const loadResultados = () => fetchCsv(RESULTADOS_CSV_URL, FALLBACK_RESULTADOS);
```

Note: in the Resultados sheet, BUTA fills the `foto` column with just the filename (e.g. `mariano-castro-top-1.jpg`); rendering code (Task 8) prefixes `assets/results/` when the value doesn't already contain a `/`. Fallback rows ship with the prefix included.

- [ ] **Step 5: Run tests, verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Create `js/theme.js`** (loaded right after the Tailwind CDN script on every page)

```js
tailwind.config = {
  theme: {
    extend: {
      colors: {
        noche: '#05060f',        // fondo base
        tinta: '#0c0f22',        // superficies elevadas
        borde: '#1c2142',        // bordes sutiles
        primario: { DEFAULT: '#2d5bff', glow: '#5b8cff', oscuro: '#1a3acc' },
        violeta: { DEFAULT: '#8a3ffc', glow: '#b07cff' },
        oro: '#d4a728',
        humo: '#8b93b8',         // texto secundario
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-azul': '0 0 24px rgba(91,140,255,.35), 0 4px 24px rgba(45,91,255,.25)',
        'glow-violeta': '0 0 24px rgba(176,124,255,.3)',
        'card': '0 2px 8px rgba(5,6,15,.6), 0 8px 32px rgba(45,91,255,.08)',
      },
    },
  },
};
```

- [ ] **Step 7: Create `css/custom.css`**

```css
/* Fondo holográfico: radiales superpuestos + grano SVG */
body {
  background-color: #05060f;
  background-image:
    radial-gradient(ellipse 80% 50% at 20% -10%, rgba(138, 63, 252, 0.18), transparent 60%),
    radial-gradient(ellipse 70% 50% at 85% 20%, rgba(45, 91, 255, 0.16), transparent 55%),
    radial-gradient(ellipse 90% 60% at 50% 110%, rgba(45, 91, 255, 0.10), transparent 60%);
  background-attachment: fixed;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

main, header, footer { position: relative; z-index: 2; }

/* Estados interactivos obligatorios */
a, button, [role='button'], input, select {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid #5b8cff;
  outline-offset: 3px;
  border-radius: 4px;
}
button:active, a:active { transform: scale(0.97); }

/* Texto neón para títulos destacados */
.texto-neon { text-shadow: 0 0 28px rgba(91, 140, 255, 0.55); }
.texto-neon-violeta { text-shadow: 0 0 28px rgba(176, 124, 255, 0.5); }

/* Tratamiento de fotos: overlay + color */
.foto-marco { position: relative; overflow: hidden; }
.foto-marco::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(5, 6, 15, 0.6), transparent 55%),
    linear-gradient(135deg, rgba(45, 91, 255, 0.18), rgba(138, 63, 252, 0.12));
  mix-blend-mode: multiply;
  pointer-events: none;
}

/* Skeleton de carga */
@keyframes pulso { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
.skeleton { animation: pulso 1.6s ease-in-out infinite; background: #1c2142; border-radius: 8px; }
```

- [ ] **Step 8: Commit**

```bash
git add js/config.js js/data.js js/theme.js css/custom.css tests/data.test.mjs
git commit -m "feat: data layer with Google Sheets CSV + fallbacks, theme tokens"
```

---

### Task 5: Google Apps Script backend, sheet template, setup guide

**Files:**
- Create: `apps-script/Code.gs`
- Create: `docs/sheets-template/torneos.csv`, `docs/sheets-template/resultados.csv`, `docs/sheets-template/inscripciones.csv`
- Create: `docs/setup-google-sheets.md`

- [ ] **Step 1: Create `apps-script/Code.gs`**

```js
// BUTA TCG — backend de inscripciones.
// Script VINCULADO a la planilla (Extensiones > Apps Script). Ver docs/setup-google-sheets.md
// doPost: inscribe {torneo, nombre, konami_id}. doGet: ?action=count&torneo=X devuelve el conteo.

// NOTA: el cliente web envía Content-Type text/plain a propósito — evita el preflight
// CORS que Apps Script no soporta. No cambiar a application/json.

const HOJA_TORNEOS = 'Torneos';
const HOJA_INSCRIPCIONES = 'Inscripciones';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function filas_(nombreHoja) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if (!sheet) throw new Error('Hoja no encontrada: ' + nombreHoja);
  const values = sheet.getDataRange().getValues();
  const header = values[0].map(String);
  return { sheet, header, rows: values.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, String(r[i])]))) };
}

function contar_(torneo) {
  return filas_(HOJA_INSCRIPCIONES).rows.filter(r => r.torneo === torneo).length;
}

function doGet(e) {
  try {
    if (e.parameter.action === 'count') {
      const torneo = e.parameter.torneo || '';
      const t = filas_(HOJA_TORNEOS).rows.find(r => r.nombre === torneo);
      return json_({ ok: true, count: contar_(torneo), cupo: t ? Number(t.cupo_maximo) : null });
    }
    return json_({ ok: false, error: 'accion_invalida' });
  } catch (err) {
    return json_({ ok: false, error: 'config_error' });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let datos;
    try { datos = JSON.parse(e.postData.contents); }
    catch (err) { return json_({ ok: false, error: 'datos_invalidos' }); }

    const nombre = String(datos.nombre || '').trim();
    const konamiId = String(datos.konami_id || '').trim();
    const torneo = String(datos.torneo || '').trim();

    if (nombre.length < 3 || !/^\d{10}$/.test(konamiId) || !torneo) {
      return json_({ ok: false, error: 'datos_invalidos' });
    }

    const t = filas_(HOJA_TORNEOS).rows.find(r => r.nombre === torneo);
    const estado = t ? String(t.estado).toLowerCase() : '';
    if (!t || (estado.indexOf('proximo') !== 0 && estado.indexOf('próximo') !== 0)) {
      return json_({ ok: false, error: 'torneo_invalido' });
    }

    const insc = filas_(HOJA_INSCRIPCIONES);
    const delTorneo = insc.rows.filter(r => r.torneo === torneo);
    if (delTorneo.some(r => r.konami_id === konamiId)) {
      return json_({ ok: false, error: 'duplicado' });
    }
    if (delTorneo.length >= Number(t.cupo_maximo)) {
      return json_({ ok: false, error: 'lleno' });
    }

    insc.sheet.appendRow([new Date(), torneo, nombre, "'" + konamiId]);
    return json_({ ok: true, count: delTorneo.length + 1, cupo: Number(t.cupo_maximo) });
  } catch (err) {
    return json_({ ok: false, error: 'config_error' });
  } finally {
    lock.releaseLock();
  }
}
```

(The leading apostrophe on `konami_id` keeps Sheets from stripping leading zeros.)

- [ ] **Step 2: Create seed CSVs in `docs/sheets-template/`**

`torneos.csv`:

```csv
nombre,fecha,hora,lugar,formato,reglas,precio,premios,cupo_maximo,estado
YACS Córdoba,2025-12-06,10:00,"Córdoba, Argentina",Avanzado TCG · suizo + top cut,Banlist TCG vigente,,Premios para el top,32,finalizado
```

`resultados.csv`:

```csv
torneo,puesto,nombre,deck,foto
YACS Córdoba 06/12,1,Mariano Castro,—,mariano-castro-top-1.jpg
YACS Córdoba 06/12,2,Juan Gordillo,—,juan-gordillo-top-2.jpg
YACS Córdoba 06/12,3,Pedro Torres,—,pedro-torres-top-3.jpg
YACS Córdoba 06/12,4,Juan Pablo Ynfantes,—,juan-pablo-ynfantes-top-4.jpg
YACS Córdoba 06/12,5,Rodo,—,rodo-top-5.jpg
YACS Córdoba 06/12,6,Ricardo Jara,—,ricardo-jara-top-6.jpg
YACS Córdoba 06/12,7,Alexis Juncos,—,alexis-juncos-top-7.jpg
YACS Córdoba 06/12,8,Enzo Alfonzo,—,enzo-alfonzo-top-8.jpg
```

`inscripciones.csv`:

```csv
timestamp,torneo,nombre,konami_id
```

- [ ] **Step 3: Create `docs/setup-google-sheets.md`** — the 5-step guide, written for a non-technical user, in Spanish:

```markdown
# Conectar la web de BUTA TCG con tu Google Sheet (5 pasos)

La web funciona sin esto (muestra los datos de respaldo), pero para anunciar torneos
nuevos y recibir inscripciones necesitás conectar tu planilla. Tardás ~15 minutos y es gratis.

## Paso 1 — Crear la planilla
1. Entrá a https://sheets.google.com con la cuenta de BUTA y creá una planilla llamada **BUTA TCG**.
2. Creá 3 pestañas con estos nombres EXACTOS: `Torneos`, `Inscripciones`, `Resultados`.
3. Importá en cada pestaña el CSV correspondiente de la carpeta `docs/sheets-template/`
   (Archivo → Importar → Subir → "Reemplazar hoja actual"). Eso deja las columnas y los
   datos del YACS ya cargados.

## Paso 2 — Publicar Torneos y Resultados como CSV
1. Archivo → Compartir → **Publicar en la web**.
2. En el desplegable elegí la pestaña `Torneos`, formato **Valores separados por comas (.csv)**, y Publicar. Copiá el link.
3. Repetí para la pestaña `Resultados`. Copiá ese link también.
4. ⚠️ NO publiques la pestaña `Inscripciones` (tiene datos personales).

## Paso 3 — Instalar el script de inscripciones
1. En la planilla: Extensiones → **Apps Script**.
2. Borrá el contenido del editor y pegá TODO el archivo `apps-script/Code.gs` de este proyecto.
3. Guardá (ícono de disquete).

## Paso 4 — Publicar el script como Web App
1. Botón **Implementar** → Nueva implementación → tipo **Aplicación web**.
2. Configurá: "Ejecutar como": **Yo** · "Quién tiene acceso": **Cualquier usuario**.
3. Implementar → autorizá los permisos cuando los pida → copiá la **URL de la aplicación web** (termina en `/exec`).

## Paso 5 — Pegar las 3 URLs en la web
Abrí el archivo `js/config.js` del sitio y pegá cada link entre las comillas:

    export const TORNEOS_CSV_URL = 'LINK DEL PASO 2 (Torneos)';
    export const RESULTADOS_CSV_URL = 'LINK DEL PASO 2 (Resultados)';
    export const APPS_SCRIPT_URL = 'LINK DEL PASO 4';

Listo. Para anunciar un torneo nuevo: agregá una fila en `Torneos` con estado `proximo`.
Para cargar resultados: agregá filas en `Resultados` (la columna `foto` lleva solo el
nombre del archivo subido a `assets/results/` del sitio). Las inscripciones aparecen
solas en la pestaña `Inscripciones`.
```

- [ ] **Step 4: Commit**

```bash
git add apps-script/ docs/sheets-template/ docs/setup-google-sheets.md
git commit -m "feat: Apps Script registration backend, sheet template, setup guide"
```

---

## Shared page chrome (used verbatim in Tasks 6–9)

Every page uses this `<head>` block (only `<title>` changes) and this header/footer (only the `aria-current` nav item changes). Defined once here; **repeat it exactly in each page** — do not deviate between pages.

`<head>` template:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BUTA TCG — Torneos de Yu-Gi-Oh! en Córdoba</title>
  <meta name="description" content="BUTA TCG organiza torneos de Yu-Gi-Oh! Trading Card Game en Córdoba, Argentina. Inscribite online y mirá los resultados." />
  <link rel="icon" type="image/png" href="assets/logo-butatcg.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="js/theme.js"></script>
  <link rel="stylesheet" href="css/custom.css" />
</head>
```

Header (example for Inicio; move `aria-current="page"` + the `text-white` class to the active page's link, others use `text-humo`):

```html
<header class="sticky top-0 z-40 border-b border-borde/60 bg-noche/80 backdrop-blur-md">
  <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Principal">
    <a href="index.html" class="flex items-center gap-2 hover:opacity-80">
      <img src="assets/logo-butatcg.png" alt="Logo BUTA TCG" class="h-9 w-9 object-contain" />
      <span class="font-display text-lg font-bold italic tracking-tight text-white">BUTA <span class="text-primario-glow">TCG</span></span>
    </a>
    <div class="flex items-center gap-1 font-body text-sm sm:gap-2">
      <a href="index.html" aria-current="page" class="rounded-md px-2 py-1.5 text-white hover:text-primario-glow sm:px-3">Inicio</a>
      <a href="torneos.html" class="rounded-md px-2 py-1.5 text-humo hover:text-primario-glow sm:px-3">Torneos</a>
      <a href="resultados.html" class="rounded-md px-2 py-1.5 text-humo hover:text-primario-glow sm:px-3">Resultados</a>
      <a href="nosotros.html" class="rounded-md px-2 py-1.5 text-humo hover:text-primario-glow sm:px-3">Nosotros</a>
    </div>
  </nav>
</header>
```

Footer:

```html
<footer class="mt-20 border-t border-borde/60 py-10">
  <div class="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center font-body text-sm text-humo">
    <a href="https://www.instagram.com/butatcg/" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-full border border-borde bg-tinta px-5 py-2.5 font-semibold text-white shadow-card hover:border-primario hover:shadow-glow-azul">
      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.3-.1-1.2-.1-1.6-.1-4.8s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.3-.4 1.2-.1 1.6-.1 4.8-.1zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.4-.6.7-.8 1.2-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.4.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.4.6-.7.8-1.2.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zm6.2-8.2a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z"/></svg>
      @butatcg
    </a>
    <p>© 2026 BUTA TCG · Torneos de Yu-Gi-Oh! Trading Card Game · Córdoba, Argentina</p>
    <p class="text-xs text-humo/60">Yu-Gi-Oh! es marca registrada de Konami. Este sitio no está afiliado a Konami.</p>
  </div>
</footer>
```

`<body>` always opens as: `<body class="min-h-screen bg-noche font-body text-white antialiased">`.

---

### Task 6: Inicio — `index.html`

**Files:**
- Create: `index.html`

**Reminder:** invoke the `frontend-design` skill before this task if not already done this session. Server must be running (`node serve.mjs`).

- [ ] **Step 1: Create `index.html`** with the shared chrome and these four sections inside `<main class="mx-auto max-w-6xl px-4">`:

```html
<!-- HERO -->
<section class="flex flex-col items-center pb-16 pt-14 text-center sm:pt-20">
  <img src="assets/logo-butatcg.png" alt="" class="h-28 w-28 object-contain sm:h-36 sm:w-36" style="filter: drop-shadow(0 0 32px rgba(91,140,255,.5));" />
  <p class="mt-6 font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">⚡ It's time to duel</p>
  <h1 class="texto-neon mt-3 max-w-3xl font-display text-4xl font-bold italic leading-tight text-white sm:text-6xl" style="letter-spacing:-0.03em;">
    Torneos de Yu-Gi-Oh! <span class="text-primario-glow">TCG</span> en Córdoba
  </h1>
  <p class="mt-5 max-w-xl font-body text-base leading-[1.7] text-humo sm:text-lg">
    BUTA TCG organiza torneos presenciales con transmisión en vivo, premios y la mejor comunidad duelista de Córdoba.
  </p>
  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
    <a href="torneos.html" class="rounded-full bg-gradient-to-r from-primario to-violeta px-8 py-3.5 font-display font-bold italic text-white shadow-glow-azul hover:opacity-90">Inscribirme al próximo torneo</a>
    <a href="resultados.html" class="rounded-full border border-borde bg-tinta px-8 py-3.5 font-display font-semibold text-humo shadow-card hover:border-primario hover:text-white">Ver resultados</a>
  </div>
</section>

<!-- PRÓXIMO TORNEO (poblado por JS) -->
<section aria-labelledby="prox-titulo" class="py-10">
  <h2 id="prox-titulo" class="font-display text-2xl font-bold italic text-white" style="letter-spacing:-0.03em;">Próximo torneo</h2>
  <div id="proximo-torneo" class="mt-4">
    <div class="skeleton h-28 w-full"></div>
  </div>
</section>

<!-- ÚLTIMO CAMPEÓN (poblado por JS) -->
<section aria-labelledby="campeon-titulo" class="py-10">
  <h2 id="campeon-titulo" class="font-display text-2xl font-bold italic text-white" style="letter-spacing:-0.03em;">Último campeón</h2>
  <div id="ultimo-campeon" class="mt-4">
    <div class="skeleton h-40 w-full"></div>
  </div>
</section>

<!-- BUTA EN 3 LÍNEAS -->
<section class="rounded-2xl border border-borde bg-tinta/70 p-8 shadow-card sm:p-10">
  <h2 class="font-display text-2xl font-bold italic text-white" style="letter-spacing:-0.03em;">¿Qué es <span class="text-primario-glow">BUTA</span>?</h2>
  <p class="mt-4 max-w-2xl font-body leading-[1.7] text-humo">
    Somos una tienda de TCG sin local físico que vive donde están los duelistas: organizamos torneos de
    Yu-Gi-Oh! en Córdoba, los transmitimos en vivo y armamos sorteos junto a la comunidad.
  </p>
  <a href="nosotros.html" class="mt-6 inline-block rounded-full border border-primario/50 px-6 py-2.5 font-display font-semibold text-primario-glow hover:bg-primario/10">Conocenos →</a>
</section>
```

- [ ] **Step 2: Add the page module** (before `</body>`):

```html
<script type="module">
  import { loadTorneos, loadResultados, pickProximo, groupResultados } from './js/data.js';

  const fmtFecha = (iso) => {
    const [y, m, d] = (iso ?? '').split('-').map(Number);
    if (!y) return iso ?? '';
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const torneos = await loadTorneos();
  const prox = pickProximo(torneos);
  const cont = document.getElementById('proximo-torneo');
  cont.innerHTML = prox
    ? `<a href="torneos.html" class="block rounded-2xl border border-primario/40 bg-tinta/70 p-6 shadow-glow-azul hover:opacity-90 sm:p-8">
         <p class="font-display text-xl font-bold italic text-white">${prox.nombre}</p>
         <p class="mt-2 font-body text-humo">📅 ${fmtFecha(prox.fecha)} · ${prox.hora} hs &nbsp; 📍 ${prox.lugar}</p>
         <p class="mt-3 inline-block rounded-full bg-primario/15 px-4 py-1.5 font-body text-sm font-semibold text-primario-glow">Ver detalles e inscribirme →</p>
       </a>`
    : `<div class="rounded-2xl border border-borde bg-tinta/70 p-6 shadow-card sm:p-8">
         <p class="font-display text-lg font-semibold text-white">Próximamente nuevo torneo</p>
         <p class="mt-2 font-body text-humo">Seguinos en <a href="https://www.instagram.com/butatcg/" target="_blank" rel="noopener" class="text-primario-glow underline hover:opacity-80">Instagram</a> para enterarte antes que nadie.</p>
       </div>`;

  const grupos = groupResultados(await loadResultados());
  const ultimo = Object.values(grupos).at(-1) ?? [];
  const campeon = ultimo.find((r) => r.puesto === '1');
  const camp = document.getElementById('ultimo-campeon');
  if (campeon) {
    const src = campeon.foto.includes('/') ? campeon.foto : `assets/results/${campeon.foto}`;
    camp.innerHTML = `
      <a href="resultados.html" class="flex flex-col items-stretch gap-5 rounded-2xl border border-oro/40 bg-tinta/70 p-5 shadow-card hover:opacity-90 sm:flex-row sm:items-center sm:p-6">
        <div class="foto-marco h-48 w-full shrink-0 rounded-xl sm:h-36 sm:w-36"><img src="${src}" alt="Foto de ${campeon.nombre}, campeón" class="h-full w-full rounded-xl object-cover object-top" /></div>
        <div>
          <p class="font-body text-xs font-semibold uppercase tracking-[0.25em] text-oro">🏆 Campeón · ${campeon.torneo}</p>
          <p class="mt-2 font-display text-2xl font-bold italic text-white">${campeon.nombre}</p>
          <p class="mt-1 font-body text-humo">Deck: ${campeon.deck}</p>
          <p class="mt-3 font-body text-sm font-semibold text-primario-glow">Ver el top completo →</p>
        </div>
      </a>`;
  } else {
    camp.innerHTML = '<p class="font-body text-humo">Todavía no hay resultados cargados.</p>';
  }
</script>
```

- [ ] **Step 3: Screenshot desktop + mobile and review**

```bash
node screenshot.mjs http://localhost:3000/index.html inicio-desktop
node screenshot.mjs http://localhost:3000/index.html inicio-movil 390x844
```

Read both PNGs. Check against spec/guardrails: hero glow visible, skeleton replaced by YACS fallback data, champion card shows Mariano Castro with photo, no default Tailwind blues, spacing consistent. Fix and re-screenshot until clean.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: home page with hero, next tournament, last champion"
```

---

### Task 7: Torneos — `torneos.html` + `js/inscripcion.js`

**Files:**
- Create: `torneos.html`
- Create: `js/inscripcion.js`

- [ ] **Step 1: Create `torneos.html`** with shared chrome (nav highlight on Torneos) and this `<main class="mx-auto max-w-3xl px-4">`:

```html
<section class="pb-4 pt-12 text-center">
  <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Próximo torneo</p>
  <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">Prepará tu mejor deck</h1>
</section>

<!-- FICHA (poblada por JS) -->
<section id="ficha-torneo" class="py-8">
  <div class="skeleton h-64 w-full"></div>
</section>

<!-- INSCRIPCIÓN -->
<section id="seccion-inscripcion" class="py-8">
  <div class="rounded-2xl border border-borde bg-tinta/70 p-6 shadow-card sm:p-8">
    <h2 class="font-display text-2xl font-bold italic text-white" style="letter-spacing:-0.03em;">Inscripción</h2>
    <form id="form-inscripcion" class="mt-6 flex flex-col gap-5" novalidate>
      <div>
        <label for="nombre" class="font-body text-sm font-semibold text-humo">Nombre completo</label>
        <input id="nombre" name="nombre" type="text" autocomplete="name" required
          class="mt-1.5 w-full rounded-lg border border-borde bg-noche px-4 py-3 font-body text-white placeholder-humo/50 focus:border-primario"
          placeholder="Ej: Yugi Muto" />
        <p data-error-for="nombre" class="mt-1.5 hidden font-body text-sm text-red-400">Ingresá tu nombre completo (mínimo 3 letras).</p>
      </div>
      <div>
        <label for="konami-id" class="font-body text-sm font-semibold text-humo">Konami ID (10 dígitos)</label>
        <input id="konami-id" name="konami_id" type="text" inputmode="numeric" maxlength="10" required
          class="mt-1.5 w-full rounded-lg border border-borde bg-noche px-4 py-3 font-body text-white placeholder-humo/50 focus:border-primario"
          placeholder="Ej: 0123456789" />
        <p data-error-for="konami-id" class="mt-1.5 hidden font-body text-sm text-red-400">El Konami ID son exactamente 10 números (figura en tu tarjeta de Konami).</p>
      </div>
      <button type="submit" id="btn-inscribir"
        class="rounded-full bg-gradient-to-r from-primario to-violeta px-8 py-3.5 font-display font-bold italic text-white shadow-glow-azul hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
        Confirmar inscripción
      </button>
      <p id="mensaje-resultado" role="status" aria-live="polite" class="hidden rounded-lg px-4 py-3 font-body text-sm"></p>
    </form>
  </div>
</section>
```

- [ ] **Step 2: Create `js/inscripcion.js`**

```js
import { loadTorneos, pickProximo } from './data.js';
import { validarNombre, validarKonamiId } from './validation.js';
import { APPS_SCRIPT_URL, INSTAGRAM_URL } from './config.js';

const MENSAJES = {
  ok: '✓ ¡Inscripción confirmada! Nos vemos en el torneo.',
  duplicado: 'Este Konami ID ya está inscripto en el torneo.',
  lleno: 'El cupo está lleno. Escribinos por Instagram por lista de espera.',
  datos_invalidos: 'Revisá los datos: nombre completo y Konami ID de 10 números.',
  torneo_invalido: 'La inscripción a este torneo no está abierta.',
  red: 'Error de conexión. Esperá unos segundos e intentá de nuevo.',
};

const $ = (id) => document.getElementById(id);
const fmtFecha = (iso) => {
  const [y, m, d] = (iso ?? '').split('-').map(Number);
  if (!y) return iso ?? '';
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

function renderFicha(t, count) {
  const cupo = Number(t.cupo_maximo) || 0;
  const tieneConteo = typeof count === 'number';
  const pct = tieneConteo && cupo ? Math.min(100, Math.round((count / cupo) * 100)) : 0;
  $('ficha-torneo').innerHTML = `
    <div class="rounded-2xl border border-primario/40 bg-tinta/70 p-6 shadow-glow-azul sm:p-8">
      <h2 class="font-display text-2xl font-bold italic text-white">${t.nombre}</h2>
      <dl class="mt-5 grid gap-4 font-body text-humo sm:grid-cols-2">
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">📅 Fecha y hora</dt><dd class="mt-1 text-white">${fmtFecha(t.fecha)} · ${t.hora} hs</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">📍 Lugar</dt><dd class="mt-1 text-white">${t.lugar}</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">🃏 Formato y reglas</dt><dd class="mt-1 text-white">${t.formato}<br />${t.reglas}</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">💰 Precio · 🏆 Premios</dt><dd class="mt-1 text-white">${t.precio || 'A confirmar'}<br />${t.premios}</dd></div>
      </dl>
      <div class="mt-6">
        <div class="flex justify-between font-body text-sm text-humo">
          <span>👥 Cupos</span>
          <span id="texto-cupos" class="font-semibold text-white">${tieneConteo ? `${count} / ${cupo} anotados` : `${cupo} lugares`}</span>
        </div>
        <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-noche"><div class="h-full rounded-full bg-gradient-to-r from-primario to-violeta" style="width:${pct}%"></div></div>
      </div>
    </div>`;
}

function renderSinTorneo() {
  $('ficha-torneo').innerHTML = `
    <div class="rounded-2xl border border-borde bg-tinta/70 p-8 text-center shadow-card">
      <p class="font-display text-xl font-bold italic text-white">Próximamente nuevo torneo</p>
      <p class="mt-3 font-body leading-[1.7] text-humo">Estamos preparando la próxima fecha. Seguinos en
        <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener" class="text-primario-glow underline hover:opacity-80">Instagram</a> para enterarte antes que nadie.</p>
    </div>`;
  $('seccion-inscripcion').hidden = true;
}

function mostrarMensaje(tipo) {
  const el = $('mensaje-resultado');
  el.textContent = MENSAJES[tipo] ?? MENSAJES.red;
  el.className = `rounded-lg px-4 py-3 font-body text-sm ${tipo === 'ok'
    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
    : 'bg-red-950/80 text-red-300 border border-red-700/50'}`;
  el.classList.remove('hidden');
}

async function consultarCupos(torneo) {
  if (!APPS_SCRIPT_URL) return null;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=count&torneo=${encodeURIComponent(torneo)}`);
    const data = await res.json();
    return data.ok ? data.count : null;
  } catch { return null; }
}

const torneos = await loadTorneos();
const prox = pickProximo(torneos);

if (!prox) {
  renderSinTorneo();
} else {
  renderFicha(prox, null);
  consultarCupos(prox.nombre).then((c) => { if (typeof c === 'number') renderFicha(prox, c); });

  if (!APPS_SCRIPT_URL) {
    $('form-inscripcion').innerHTML = `<p class="font-body leading-[1.7] text-humo">La inscripción online estará disponible muy pronto.
      Mientras tanto, anotate por <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener" class="text-primario-glow underline hover:opacity-80">Instagram</a>.</p>`;
  } else {
    $('form-inscripcion').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const nombre = $('nombre').value;
      const konamiId = $('konami-id').value.trim();
      let valido = true;
      for (const [id, ok] of [['nombre', validarNombre(nombre)], ['konami-id', validarKonamiId(konamiId)]]) {
        document.querySelector(`[data-error-for="${id}"]`).classList.toggle('hidden', ok);
        if (!ok) valido = false;
      }
      if (!valido) return;

      const btn = $('btn-inscribir');
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ torneo: prox.nombre, nombre: nombre.trim(), konami_id: konamiId }),
        });
        const data = await res.json();
        if (data.ok) {
          mostrarMensaje('ok');
          $('form-inscripcion').reset();
          renderFicha(prox, data.count);
        } else {
          mostrarMensaje(data.error);
        }
      } catch {
        mostrarMensaje('red');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar inscripción';
      }
    });
  }
}
```

Load it from `torneos.html` before `</body>`: `<script type="module" src="js/inscripcion.js"></script>`

- [ ] **Step 3: Verify both states in the browser**

With `config.js` URLs empty (current state), the YACS fallback has `estado: finalizado`, so the page must show "Próximamente nuevo torneo" and hide the form:

```bash
node screenshot.mjs http://localhost:3000/torneos.html torneos-sin-proximo
```

Then temporarily edit `js/data.js` FALLBACK_TORNEOS to `estado: 'proximo'`, reload, and verify ficha + form render (form shows the "inscripción por Instagram pronto" message because `APPS_SCRIPT_URL` is empty):

```bash
node screenshot.mjs http://localhost:3000/torneos.html torneos-con-proximo
node screenshot.mjs http://localhost:3000/torneos.html torneos-movil 390x844
```

Read PNGs, fix visual issues, **revert `estado` to `finalizado`**, run `npm test` (must still pass).

- [ ] **Step 4: Commit**

```bash
git add torneos.html js/inscripcion.js
git commit -m "feat: tournaments page with live capacity and registration form"
```

---

### Task 8: Resultados — `resultados.html` + `js/resultados.js`

**Files:**
- Create: `resultados.html`
- Create: `js/resultados.js`

- [ ] **Step 1: Create `resultados.html`** with shared chrome (nav highlight on Resultados) and `<main class="mx-auto max-w-6xl px-4">`:

```html
<section class="pb-4 pt-12 text-center">
  <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Salón de la fama</p>
  <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">Resultados de torneos</h1>
  <div class="mt-8 flex justify-center">
    <select id="selector-torneo" aria-label="Elegir torneo"
      class="rounded-lg border border-borde bg-tinta px-4 py-2.5 font-body text-white focus:border-primario"></select>
  </div>
</section>

<section id="podio" class="py-8"><div class="skeleton h-72 w-full"></div></section>
<section id="grilla-top" class="py-4"></section>

<!-- Lightbox -->
<div id="lightbox" class="fixed inset-0 z-50 hidden items-center justify-center bg-noche/95 p-4" role="dialog" aria-modal="true" aria-label="Foto ampliada">
  <button id="cerrar-lightbox" class="absolute right-4 top-4 rounded-full border border-borde bg-tinta px-4 py-2 font-body text-sm text-white hover:border-primario" aria-label="Cerrar">✕ Cerrar</button>
  <img id="lightbox-img" src="" alt="" class="max-h-[90vh] max-w-full rounded-xl object-contain" />
</div>
```

- [ ] **Step 2: Create `js/resultados.js`**

```js
import { loadResultados, groupResultados } from './data.js';

const $ = (id) => document.getElementById(id);
const src = (foto) => (foto.includes('/') ? foto : `assets/results/${foto}`);
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function tarjeta(r, destacada = false) {
  const medalla = MEDALLAS[Number(r.puesto)] ?? `#${r.puesto}`;
  const borde = Number(r.puesto) === 1 ? 'border-oro/60 shadow-glow-violeta' : 'border-borde shadow-card';
  return `
    <button type="button" data-foto="${src(r.foto)}" data-nombre="${r.nombre}"
      class="tarjeta-resultado group block w-full rounded-2xl border ${borde} bg-tinta/70 p-3 text-left hover:border-primario">
      <div class="foto-marco ${destacada ? 'h-72 sm:h-96' : 'h-56'} rounded-xl">
        <img src="${src(r.foto)}" alt="Decklist de ${r.nombre}" loading="lazy" class="h-full w-full rounded-xl object-cover object-top" />
      </div>
      <div class="px-2 pb-1 pt-3">
        <p class="font-display ${destacada ? 'text-xl' : 'text-base'} font-bold italic text-white">${medalla} ${r.nombre}</p>
        <p class="font-body text-sm text-humo">Top ${r.puesto} · Deck: ${r.deck}</p>
      </div>
    </button>`;
}

function render(resultados) {
  const podio = resultados.filter((r) => Number(r.puesto) <= 3);
  const resto = resultados.filter((r) => Number(r.puesto) > 3);
  $('podio').innerHTML = `
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div class="sm:col-span-2 lg:col-span-1 lg:order-2">${podio[0] ? tarjeta(podio[0], true) : ''}</div>
      <div class="lg:order-1 lg:self-end">${podio[1] ? tarjeta(podio[1]) : ''}</div>
      <div class="lg:order-3 lg:self-end">${podio[2] ? tarjeta(podio[2]) : ''}</div>
    </div>`;
  $('grilla-top').innerHTML = resto.length
    ? `<h2 class="font-display text-xl font-bold italic text-white" style="letter-spacing:-0.03em;">Top ${podio.length + 1}–${resultados.length}</h2>
       <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">${resto.map((r) => tarjeta(r)).join('')}</div>`
    : '';
  for (const btn of document.querySelectorAll('.tarjeta-resultado')) {
    btn.addEventListener('click', () => {
      $('lightbox-img').src = btn.dataset.foto;
      $('lightbox-img').alt = `Decklist de ${btn.dataset.nombre}`;
      $('lightbox').classList.replace('hidden', 'flex');
    });
  }
}

const grupos = groupResultados(await loadResultados());
const nombres = Object.keys(grupos);
const sel = $('selector-torneo');

if (!nombres.length) {
  $('podio').innerHTML = '<p class="text-center font-body text-humo">Todavía no hay resultados cargados.</p>';
} else {
  sel.innerHTML = nombres.map((n) => `<option value="${n}">${n}</option>`).join('');
  sel.value = nombres.at(-1);
  render(grupos[sel.value]);
  sel.addEventListener('change', () => render(grupos[sel.value]));
}

const cerrar = () => $('lightbox').classList.replace('flex', 'hidden');
$('cerrar-lightbox').addEventListener('click', cerrar);
$('lightbox').addEventListener('click', (e) => { if (e.target === $('lightbox')) cerrar(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
```

Load from `resultados.html`: `<script type="module" src="js/resultados.js"></script>`

- [ ] **Step 3: Screenshot and review**

```bash
node screenshot.mjs http://localhost:3000/resultados.html resultados-desktop
node screenshot.mjs http://localhost:3000/resultados.html resultados-movil 390x844
```

Read PNGs. Verify: podium shows Mariano (gold border, larger, center on desktop) flanked by Top 2/3; grid shows Top 4–8 (5 cards); photos have the gradient/multiply treatment; selector shows "YACS Córdoba 06/12". Fix and re-screenshot.

- [ ] **Step 4: Commit**

```bash
git add resultados.html js/resultados.js
git commit -m "feat: results page with podium, top grid, and lightbox"
```

---

### Task 9: Nosotros — `nosotros.html`

**Files:**
- Create: `nosotros.html`

- [ ] **Step 1: Create `nosotros.html`** with shared chrome (nav highlight on Nosotros) and `<main class="mx-auto max-w-4xl px-4">`:

```html
<section class="flex flex-col items-center pb-8 pt-12 text-center">
  <img src="assets/logo-butatcg.png" alt="Logo de BUTA TCG: un jabalí azul" class="h-32 w-32 object-contain" style="filter: drop-shadow(0 0 32px rgba(91,140,255,.5));" />
  <h1 class="texto-neon mt-6 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">¿Quién es <span class="text-primario-glow">BUTA</span>?</h1>
  <p class="mt-5 max-w-2xl font-body text-base leading-[1.7] text-humo sm:text-lg">
    BUTA TCG es una tienda de Trading Card Games sin local físico, nacida de la comunidad duelista de
    Córdoba. En vez de esperarte detrás de un mostrador, llevamos el juego a donde está la acción:
    organizamos torneos de Yu-Gi-Oh! TCG con organización profesional, arbitraje y premios.
  </p>
</section>

<section aria-labelledby="hacemos-titulo" class="py-10">
  <h2 id="hacemos-titulo" class="text-center font-display text-2xl font-bold italic text-white" style="letter-spacing:-0.03em;">¿Qué hacemos?</h2>
  <div class="mt-8 grid gap-5 sm:grid-cols-3">
    <div class="rounded-2xl border border-borde bg-tinta/70 p-6 shadow-card hover:border-primario/60">
      <p class="text-3xl">🏆</p>
      <h3 class="mt-3 font-display text-lg font-bold italic text-white">Torneos</h3>
      <p class="mt-2 font-body text-sm leading-[1.7] text-humo">Fechas presenciales en Córdoba con formato suizo + top cut, banlist al día e inscripción online.</p>
    </div>
    <div class="rounded-2xl border border-borde bg-tinta/70 p-6 shadow-card hover:border-primario/60">
      <p class="text-3xl">📹</p>
      <h3 class="mt-3 font-display text-lg font-bold italic text-white">Transmisiones</h3>
      <p class="mt-2 font-body text-sm leading-[1.7] text-humo">Las mesas destacadas se transmiten en vivo con overlay propio, para que nadie se pierda el duelo.</p>
    </div>
    <div class="rounded-2xl border border-borde bg-tinta/70 p-6 shadow-card hover:border-primario/60">
      <p class="text-3xl">🎁</p>
      <h3 class="mt-3 font-display text-lg font-bold italic text-white">Sorteos y colabs</h3>
      <p class="mt-2 font-body text-sm leading-[1.7] text-humo">Sorteos para la comunidad y colaboraciones con otras tiendas y organizadores, como Ragnarok x BUTA.</p>
    </div>
  </div>
</section>

<section class="py-10 text-center">
  <div class="rounded-2xl border border-primario/40 bg-tinta/70 p-8 shadow-glow-azul sm:p-12">
    <h2 class="font-display text-2xl font-bold italic text-white" style="letter-spacing:-0.03em;">Seguinos en Instagram</h2>
    <p class="mx-auto mt-3 max-w-md font-body leading-[1.7] text-humo">Fechas nuevas, resultados, sorteos y contenido de la comunidad. Todo pasa primero por acá.</p>
    <a href="https://www.instagram.com/butatcg/" target="_blank" rel="noopener"
      class="mt-6 inline-block rounded-full bg-gradient-to-r from-primario to-violeta px-10 py-4 font-display text-lg font-bold italic text-white shadow-glow-azul hover:opacity-90">@butatcg</a>
  </div>
</section>
```

- [ ] **Step 2: Screenshot and review**

```bash
node screenshot.mjs http://localhost:3000/nosotros.html nosotros-desktop
node screenshot.mjs http://localhost:3000/nosotros.html nosotros-movil 390x844
```

Read PNGs, check guardrails, fix, re-screenshot.

- [ ] **Step 3: Commit**

```bash
git add nosotros.html
git commit -m "feat: about page - quien es BUTA, que hacemos, Instagram CTA"
```

---

### Task 10: Visual polish — minimum 2 full comparison rounds

**Files:**
- Modify: any of `index.html`, `torneos.html`, `resultados.html`, `nosotros.html`, `css/custom.css`

- [ ] **Step 1: Round 1 — screenshot all 4 pages, desktop + mobile (8 shots)**

```bash
node screenshot.mjs http://localhost:3000/index.html r1-inicio
node screenshot.mjs http://localhost:3000/index.html r1-inicio-m 390x844
node screenshot.mjs http://localhost:3000/torneos.html r1-torneos
node screenshot.mjs http://localhost:3000/torneos.html r1-torneos-m 390x844
node screenshot.mjs http://localhost:3000/resultados.html r1-resultados
node screenshot.mjs http://localhost:3000/resultados.html r1-resultados-m 390x844
node screenshot.mjs http://localhost:3000/nosotros.html r1-nosotros
node screenshot.mjs http://localhost:3000/nosotros.html r1-nosotros-m 390x844
```

- [ ] **Step 2: Review each PNG with the Read tool against this checklist; note concrete issues** ("heading 32px should be ~40px", "card gap 12px should be 20px"):
  - Consistent header/footer across pages (byte-identical chrome)
  - Spacing rhythm consistent (section padding, card gaps)
  - Typography: display italic on headings with -0.03em, body line-height 1.7, no font soup
  - Colors: no default Tailwind blue/indigo anywhere; gold only on champion/podium
  - Photos: overlay + multiply treatment visible; object-top keeps player names in frame
  - Mobile: no horizontal overflow, tap targets ≥ 44px, text ≥ 14px
  - Every interactive element shows hover/focus/active styling
  - Skeletons never visible after load with fallback data

- [ ] **Step 3: Fix all noted issues, then Round 2 — re-screenshot all 8 and re-review**

Same commands with `r2-` labels. If issues remain, do round 3. Stop only when no visible issues remain.

- [ ] **Step 4: Run tests + commit**

```bash
npm test
git add -A index.html torneos.html resultados.html nosotros.html css/
git commit -m "polish: visual refinement pass across all pages"
```

---

### Task 11: Final verification

**Files:** none new.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 2: Fallback integrity check**

`js/config.js` URLs are empty (fallback mode — the deliverable state). Click through all 4 pages served from localhost:3000 (use screenshots of each route once more if anything changed since Task 10): every page renders complete content, no blank sections, no console errors. Check console errors via:

```bash
node -e "
import('puppeteer').then(async ({ default: p }) => {
  const b = await p.launch(); const pg = await b.newPage();
  const errs = [];
  pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  pg.on('pageerror', (e) => errs.push(String(e)));
  for (const u of ['index.html','torneos.html','resultados.html','nosotros.html']) {
    await pg.goto('http://localhost:3000/' + u, { waitUntil: 'networkidle0' });
  }
  console.log(errs.length ? 'ERRORES:\n' + errs.join('\n') : 'SIN ERRORES DE CONSOLA');
  await b.close();
});"
```

Expected: `SIN ERRORES DE CONSOLA`.

- [ ] **Step 3: Registration flow — document manual E2E**

The live form path requires BUTA's Google account (Apps Script deploy), so it cannot be E2E-tested here. Confirm `docs/setup-google-sheets.md` exists and includes a final manual test instruction; if the section is missing, append:

```markdown
## Probar que todo funciona
1. En `Torneos`, poné un torneo con estado `proximo` y cupo_maximo 2.
2. En la web, inscribite con un nombre y un Konami ID de prueba → debe decir "✓ Inscripción confirmada" y aparecer la fila en `Inscripciones`.
3. Repetí con el MISMO Konami ID → debe decir "ya está inscripto".
4. Inscribí un segundo jugador distinto y luego un tercero → el tercero debe ver "El cupo está lleno".
5. Borrá las filas de prueba de `Inscripciones` y dejá el torneo como corresponda.
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass"
git log --oneline
```

Expected: clean history of ~12 commits covering Tasks 1–11.

---

## Self-Review (completed by plan author)

- **Spec coverage:** 4 pages (Tasks 6–9) ✓ · data architecture + fallbacks (Task 4) ✓ · registration flow + all error states (Tasks 5, 7) ✓ · Apps Script + template + 5-step guide (Task 5) ✓ · seed YACS data with 8 real tops (Tasks 2, 4, 5) ✓ · Neón Duelista system + guardrails (Task 4 + chrome templates) ✓ · verification: screenshots ≥2 rounds, form-state tests, fallback check (Tasks 6–11) ✓ · out-of-scope items not implemented ✓
- **Placeholders:** none — every code step ships complete code; deck names use the explicit "—" convention from the spec.
- **Type consistency:** `parseCsv`, `validarNombre`, `validarKonamiId`, `pickProximo`, `groupResultados`, `loadTorneos`, `loadResultados`, `FALLBACK_*`, config exports, and Apps Script response shape (`{ok, count, cupo, error}`) are used with identical names/signatures across Tasks 3–8.
