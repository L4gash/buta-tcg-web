# Marcas de agua ocultas v2 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sembrar 3 marcas de agua ocultas (preimagen de hash, mismo `REV`) en el sitio estático, disfrazadas de código funcional, sin tocar las 4 marcas-canario existentes.

**Architecture:** Una frase secreta con sal aleatoria produce `REV = SHA256(frase)[:24]`. La frase vive solo en `marcas-de-autoria.txt` (gitignored); el repo solo contiene `REV`. El mismo `REV` se embebe en `js/theme.js` (DOM `data-rev`), `css/custom.css` (`--rev`) y el `<meta name="build">` de las 5 páginas. Tests de integridad verifican presencia, formato, consistencia entre archivos y ausencia de la subcadena `buta`.

**Tech Stack:** HTML estático, CSS, JS ES modules, `node --test` (test runner nativo), `crypto` de Node.

---

### Task 1: Generar el secreto y el REV (kit privado)

**Files:**
- Modify: `marcas-de-autoria.txt` (gitignored — NO entra al repo)

- [ ] **Step 1: Generar frase secreta + REV y anexar al kit privado**

Correr este comando una sola vez. Genera una sal aleatoria, arma la frase, calcula el `REV` y lo anexa al archivo privado:

```bash
node -e '
const crypto = require("crypto");
const salt = crypto.randomBytes(16).toString("hex");
const phrase = `BUTA TCG :: original @butatcg (Cordoba, AR) :: ${salt}`;
const rev = crypto.createHash("sha256").update(phrase).digest("hex").slice(0, 24);
const fs = require("fs");
const block = `

=== MARCAS OCULTAS v2 (2026-06-30) — preimagen de hash ===
Frase secreta: ${phrase}
REV (SHA256[:24]): ${rev}
Ubicaciones: js/theme.js (data-rev), css/custom.css (--rev), <meta name=\"build\"> en las 5 paginas .html
Verificar: node -e "console.log(require(\x27crypto\x27).createHash(\x27sha256\x27).update(\x27<frase>\x27).digest(\x27hex\x27).slice(0,24))"
`;
fs.appendFileSync("marcas-de-autoria.txt", block);
console.log("REV=" + rev);
'
```

Expected: imprime `REV=` seguido de 24 caracteres hex (ej. `REV=a4f9c1e0b7d3...`). **Anotá ese valor**: en las tareas siguientes se lo llama `REV24`.

- [ ] **Step 2: Confirmar que el kit NO está trackeado por git**

Run: `git check-ignore marcas-de-autoria.txt`
Expected: imprime `marcas-de-autoria.txt` (confirmando que está ignorado). Si no imprime nada, DETENERSE — el secreto no debe commitearse.

- [ ] **Step 3: (sin commit)** Esta tarea no genera cambios en archivos trackeados; no hay nada que commitear.

---

### Task 2: Tests de integridad para las 3 marcas nuevas

**Files:**
- Modify: `tests/integrity.test.mjs`

- [ ] **Step 1: Escribir los tests que fallan**

Anexar al final de `tests/integrity.test.mjs` (reemplazar `REV24_AQUI` por el valor de Task 1):

```javascript
import { readdirSync } from 'node:fs';

const REV = 'REV24_AQUI'; // valor generado en Task 1 (SHA256 de la frase secreta, 24 hex)

test('rev tiene formato de 24 hex', () => {
  assert.match(REV, /^[0-9a-f]{24}$/, 'REV debe ser 24 caracteres hex');
});

test('rev no contiene la subcadena "buta"', () => {
  assert.ok(!/buta/i.test(REV), 'REV no debe contener "buta"');
});

test('M1: theme.js escribe data-rev con el REV', () => {
  const src = readFileSync('js/theme.js', 'utf8');
  assert.ok(src.includes(REV), 'theme.js no contiene el REV');
  assert.match(src, /dataset\.rev\s*=/, 'theme.js no setea dataset.rev');
});

test('M2: custom.css define --rev con el REV', () => {
  const css = readFileSync('css/custom.css', 'utf8');
  assert.ok(new RegExp(`--rev:\\s*"${REV}"`).test(css), 'custom.css no define --rev con el REV');
});

test('M3: las 5 paginas tienen <meta name="build"> con el REV', () => {
  const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
  assert.equal(pages.length, 5, 'se esperaban 5 paginas .html');
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    assert.ok(
      new RegExp(`<meta name="build" content="${REV}"\\s*/?>`).test(html),
      `${p} no tiene el meta build con el REV`,
    );
  }
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npm test`
Expected: los 5 tests nuevos FALLAN (theme.js / css / html todavía no tienen el REV). Los 2 tests viejos (`_integrity`, `--btcg-k`) siguen PASANDO.

---

### Task 3: M1 — data-rev en theme.js

**Files:**
- Modify: `js/theme.js`

- [ ] **Step 1: Agregar la escritura de data-rev al final de theme.js**

Anexar al final de `js/theme.js` (reemplazar `REV24` por el valor de Task 1):

```javascript

// Revisión de assets (build hash); se expone en el DOM para diagnóstico de caché.
const __rev = 'REV24';
if (typeof document !== 'undefined') {
  document.documentElement.dataset.rev = __rev;
}
```

- [ ] **Step 2: Correr el test M1**

Run: `node --test --test-name-pattern="M1" tests/integrity.test.mjs`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add js/theme.js tests/integrity.test.mjs
git commit -m "feat: marca oculta M1 (data-rev) + tests de integridad v2"
```

---

### Task 4: M2 — variable --rev en custom.css

**Files:**
- Modify: `css/custom.css:1`

- [ ] **Step 1: Agregar la variable --rev junto a la clave de tema existente**

En `css/custom.css`, reemplazar la línea 1:

```css
:root { --btcg-k: "42555441-544347"; } /* clave de tema, no editar */
```

por (reemplazar `REV24` por el valor de Task 1):

```css
:root { --btcg-k: "42555441-544347"; --rev: "REV24"; } /* claves de tema, no editar */
```

- [ ] **Step 2: Correr el test M2**

Run: `node --test --test-name-pattern="M2" tests/integrity.test.mjs`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add css/custom.css
git commit -m "feat: marca oculta M2 (--rev en custom.css)"
```

---

### Task 5: M3 — meta build en las 5 páginas

**Files:**
- Modify: `index.html`, `torneos.html`, `resultados.html`, `ranking.html`, `nosotros.html` (el `<head>` de cada una)

- [ ] **Step 1: Agregar el meta build en cada página**

En cada uno de los 5 archivos `.html`, agregar esta línea dentro del `<head>`, justo después de la etiqueta `<meta name="description" ...>` (reemplazar `REV24` por el valor de Task 1):

```html
  <meta name="build" content="REV24" />
```

Repetir en: `index.html`, `torneos.html`, `resultados.html`, `ranking.html`, `nosotros.html`.

- [ ] **Step 2: Correr el test M3 y la suite completa**

Run: `npm test`
Expected: TODOS los tests PASAN (los 2 viejos canarios + los 5 nuevos).

- [ ] **Step 3: Commit**

```bash
git add index.html torneos.html resultados.html ranking.html nosotros.html
git commit -m "feat: marca oculta M3 (meta build) en las 5 paginas"
```

---

### Task 6: Verificación final en el navegador

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar el server (si no está corriendo)**

Run: `node serve.mjs` (en background)

- [ ] **Step 2: Verificar las marcas en una página servida**

Abrir `http://localhost:3000` y en la consola del navegador correr:

```javascript
console.log('data-rev:', document.documentElement.dataset.rev);
console.log('--rev:', getComputedStyle(document.documentElement).getPropertyValue('--rev').trim());
console.log('meta build:', document.querySelector('meta[name="build"]').content);
```

Expected: los tres imprimen el mismo `REV24`. El sitio se ve idéntico (las marcas son invisibles).

- [ ] **Step 3: Verificar la preimagen desde el kit privado**

Run (reemplazar `<frase>` por la frase secreta guardada en `marcas-de-autoria.txt`):
`node -e "console.log(require('crypto').createHash('sha256').update('<frase>').digest('hex').slice(0,24))"`
Expected: imprime exactamente el `REV24` embebido en los archivos.
