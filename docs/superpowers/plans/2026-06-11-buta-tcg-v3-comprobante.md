# BUTA TCG v3 — Comprobante opcional · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players optionally attach a payment-receipt photo during registration; the image is compressed in-browser and uploaded to BUTA's Google Drive via a decoupled second request, plus an informational WhatsApp note — per `docs/superpowers/specs/2026-06-11-buta-tcg-v3-comprobante-design.md`.

**Architecture:** Extends the live v2 site. New browser-only module `js/imagen.js` (validate + compress). `torneos.html` gains an optional file field with preview; `js/inscripcion.js` does a two-step submit (register, then if an image is staged, POST it separately). `apps-script/Code.gs` gains an `action:'comprobante'` branch that saves the file to a find-or-create Drive folder and links it in a new `comprobante` column. Everything is backward-compatible: the registration POST is unchanged, and missing column / old script never break registration.

**Tech Stack:** unchanged (Node 24 tests `npm test` = `node --test tests/*.test.mjs`; serve :3000; `node screenshot.mjs <url> [label] [WxH]`). Currently 16/16 tests green.

**Site is LIVE** at https://l4gash.github.io/buta-tcg-web/ against the real restricted sheet + deployed Apps Script. Work on a branch off `main`; do NOT push until the deploy task. The console signature ("🐗 BUTA TCG") is the deploy-freshness signal.

---

## File Structure

```
js/imagen.js              # NEW: validarImagen + comprimirImagen + constants (Task 1)
tests/imagen.test.mjs     # NEW: validarImagen + constants tests (Task 1)
apps-script/Code.gs       # + action=comprobante branch, Drive folder, sanitizar_ (Task 2)
docs/sheets-template/inscripciones.csv  # + comprobante column (Task 2)
docs/setup-google-sheets.md             # + "Actualización v3" section (Task 2)
torneos.html              # + optional file field, preview, WhatsApp note (Task 3)
js/inscripcion.js         # two-step submit, upload helper, file listeners (Task 3)
```

---

### Task 1: `js/imagen.js` — validate + compress (TDD on the pure parts)

**Files:**
- Create: `js/imagen.js`
- Test: `tests/imagen.test.mjs`

- [ ] **Step 1: Write failing tests `tests/imagen.test.mjs`:**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarImagen, MAX_LADO, CALIDAD, MAX_CRUDO_BYTES } from '../js/imagen.js';

test('validarImagen: vacío es válido (opcional)', () => {
  assert.deepEqual(validarImagen(null), { ok: true, vacio: true });
  assert.deepEqual(validarImagen(undefined), { ok: true, vacio: true });
});

test('validarImagen: acepta imágenes, rechaza otros tipos', () => {
  assert.equal(validarImagen({ type: 'image/jpeg', size: 1000 }).ok, true);
  assert.equal(validarImagen({ type: 'image/png', size: 1000 }).ok, true);
  assert.equal(validarImagen({ type: 'image/webp', size: 1000 }).ok, true);
  assert.equal(validarImagen({ type: 'application/pdf', size: 1000 }).motivo, 'tipo');
  assert.equal(validarImagen({ type: '', size: 1000 }).motivo, 'tipo');
});

test('validarImagen: rechaza archivos crudos enormes', () => {
  assert.equal(validarImagen({ type: 'image/jpeg', size: MAX_CRUDO_BYTES + 1 }).motivo, 'tamano');
  assert.equal(validarImagen({ type: 'image/jpeg', size: MAX_CRUDO_BYTES }).ok, true);
});

test('constantes de compresión razonables', () => {
  assert.ok(MAX_LADO >= 800 && MAX_LADO <= 2000);
  assert.ok(CALIDAD > 0 && CALIDAD <= 1);
  assert.ok(MAX_CRUDO_BYTES >= 1024 * 1024);
});
```

- [ ] **Step 2: Run `npm test` — new tests FAIL** (`Cannot find module ../js/imagen.js`).

- [ ] **Step 3: Create `js/imagen.js`:**

```js
// Preparación de la imagen de comprobante: validación (pura) + compresión (browser).
export const MAX_LADO = 1280;          // px del lado más largo tras redimensionar
export const CALIDAD = 0.7;            // calidad JPEG de salida
export const MAX_CRUDO_BYTES = 10 * 1024 * 1024; // tope del archivo original (antes de comprimir)
const MIMES_OK = ['image/jpeg', 'image/png', 'image/webp'];

// Valida el archivo elegido. file == null => válido (el adjunto es opcional).
export function validarImagen(file) {
  if (file == null) return { ok: true, vacio: true };
  if (!MIMES_OK.includes(file.type)) return { ok: false, motivo: 'tipo' };
  if (file.size > MAX_CRUDO_BYTES) return { ok: false, motivo: 'tamano' };
  return { ok: true };
}

// Comprime a JPEG y devuelve { b64, mime }. Solo navegador (usa canvas/createImageBitmap).
export async function comprimirImagen(file, { maxLado = MAX_LADO, calidad = CALIDAD } = {}) {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', calidad));
  const b64 = await blobABase64(blob);
  return { b64, mime: 'image/jpeg' };
}

function blobABase64(blob) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result).split(',')[1]); // descarta el prefijo data:...,
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}
```

- [ ] **Step 4: Run `npm test` — all pass** (16 + 4 = 20).

- [ ] **Step 5: Commit**

```bash
git add js/imagen.js tests/imagen.test.mjs
git commit -m "feat: image validation and in-browser compression module"
```

---

### Task 2: Apps Script v3 — `comprobante` action, Drive folder, templates, migration guide

**Files:**
- Modify: `apps-script/Code.gs`
- Modify: `docs/sheets-template/inscripciones.csv`
- Modify: `docs/setup-google-sheets.md`

- [ ] **Step 1: In `apps-script/Code.gs`, add constants** after the existing `const HOJA_INSCRIPCIONES = 'Inscripciones';` line:

```js
const CARPETA_COMPROBANTES = 'BUTA TCG - Comprobantes';
const MAX_BYTES_COMPROBANTE = 1.5 * 1024 * 1024;
const MIMES_COMPROBANTE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
```

- [ ] **Step 2: Add helpers** after the existing `celdaSegura_` function:

```js
// Nombre de archivo seguro: solo letras/números/guiones, recortado.
function sanitizar_(texto) {
  return String(texto).replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
}

// Busca o crea la carpeta de comprobantes en el Drive del dueño del script.
function carpetaComprobantes_() {
  const it = DriveApp.getFoldersByName(CARPETA_COMPROBANTES);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_COMPROBANTES);
}

// Guarda el comprobante en Drive y escribe su link en la fila de la inscripción.
function guardarComprobante_(datos) {
  const konamiId = String(datos.konami_id || '').trim();
  const torneo = String(datos.torneo || '').trim();
  const nombre = String(datos.nombre || '').trim();
  const mime = String(datos.mime || '');
  const b64 = String(datos.imagen_b64 || '');

  if (!torneo || !/^\d{10}$/.test(konamiId) || !b64 || !MIMES_COMPROBANTE[mime]) {
    return json_({ ok: false, error: 'datos_invalidos' });
  }
  let bytes;
  try { bytes = Utilities.base64Decode(b64); }
  catch (err) { return json_({ ok: false, error: 'datos_invalidos' }); }
  if (bytes.length > MAX_BYTES_COMPROBANTE) {
    return json_({ ok: false, error: 'archivo_grande' });
  }

  const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd-HHmm');
  const nombreArch = sanitizar_(torneo) + '__' + sanitizar_(nombre) + '__' + konamiId + '__' + fecha + '.' + MIMES_COMPROBANTE[mime];
  const blob = Utilities.newBlob(bytes, mime, nombreArch);
  const url = carpetaComprobantes_().createFile(blob).getUrl();

  const insc = filas_(HOJA_INSCRIPCIONES);
  const col = insc.header.indexOf('comprobante'); // 0-based; -1 si la columna no existe
  let sinFila = true;
  if (col !== -1) {
    for (let i = 0; i < insc.rows.length; i++) {
      const r = insc.rows[i];
      if (r.torneo === torneo && r.konami_id === konamiId) {
        insc.sheet.getRange(i + 2, col + 1).setValue(url); // +2: la fila 1 es el encabezado
        sinFila = false;
        break;
      }
    }
  }
  return json_({ ok: true, sinFila: sinFila });
}
```

- [ ] **Step 3: Branch `doPost` to the comprobante path.** In `doPost`, immediately after the JSON parse block (after the `catch (err) { return json_({ ok: false, error: 'datos_invalidos' }); }` line and before `const nombre = ...`), insert:

```js
    if (datos.action === 'comprobante') {
      return guardarComprobante_(datos);
    }
```

(The branch runs inside the existing `try`/`finally`, so the script lock is held during the Drive write + row update — prevents races. The registration path below is unchanged.)

- [ ] **Step 4: Update the header comment** (lines 3-4) to:

```js
// doPost: inscribe {torneo, nombre, konami_id, comentario?} · sube comprobante {action:'comprobante', torneo, konami_id, nombre, imagen_b64, mime}.
// doGet: ?action=count&torneo=X (conteo de uno) · ?action=counts (conteos y cupos de todos los próximos).
```

- [ ] **Step 5: Verify Code.gs parses:** `node -e "new Function(require('fs').readFileSync('apps-script/Code.gs','utf8'))"` → exit 0, no output.

- [ ] **Step 6: Update `docs/sheets-template/inscripciones.csv`** to exactly:

```csv
timestamp,torneo,nombre,konami_id,comentario,comprobante
```

- [ ] **Step 7: Append to `docs/setup-google-sheets.md`** (new final section):

```markdown
## Actualización v3 (comprobante de pago opcional)

Permite que el jugador adjunte una foto del comprobante al inscribirse; se guarda en tu Drive.

1. En la pestaña `Inscripciones`, escribí `comprobante` en la celda F1 (a la derecha de `comentario`).
2. Repegá TODO el `apps-script/Code.gs` actualizado en Extensiones → Apps Script y guardá.
3. ⚠️ Implementar → Gestionar implementaciones → ✏️ Editar → Versión: **Nueva versión** → Implementar.
4. La primera vez que alguien suba un comprobante, Google te va a pedir **autorizar un permiso
   nuevo** (acceso a tu Drive): aceptalo una vez. Se crea sola una carpeta llamada
   `BUTA TCG - Comprobantes` en tu Drive con todos los comprobantes (privada, solo la ves vos).
5. El adjunto es **opcional**: quien no suba foto se inscribe igual, y la columna `comprobante`
   de esa fila queda vacía. Si alguien la sube, ahí aparece el link al archivo.
```

- [ ] **Step 8: Run `npm test` (20/20, unaffected) and commit:**

```bash
git add apps-script/Code.gs docs/sheets-template/inscripciones.csv docs/setup-google-sheets.md
git commit -m "feat: receipt upload action saving to Drive with sheet link"
```

---

### Task 3: Torneos form + two-step submit

**Files:**
- Modify: `torneos.html`
- Modify: `js/inscripcion.js`

- [ ] **Step 1: In `torneos.html`,** insert this new field block inside `<form id="form-inscripcion">`, BETWEEN the comentario `<div>` (the one whose last child is `<p id="contador-comentario">…0/100</p>`) and the `<button type="submit" id="btn-inscribir">`:

```html
          <div>
            <label for="comprobante" class="font-body text-sm font-semibold text-humo">Comprobante de pago <span class="font-normal text-humo/70">(opcional)</span></label>
            <input id="comprobante" name="comprobante" type="file" accept="image/*"
              class="mt-1.5 block w-full cursor-pointer rounded-lg border border-borde bg-noche px-4 py-3 font-body text-sm text-humo file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primario file:px-4 file:py-1.5 file:font-display file:text-xs file:font-semibold file:text-white hover:file:opacity-90 focus:border-primario" />
            <div id="comprobante-preview" class="mt-2 hidden items-center gap-3 rounded-lg border border-borde bg-noche/60 p-2">
              <img id="comprobante-thumb" alt="Vista previa del comprobante" class="h-12 w-12 rounded object-cover" />
              <span id="comprobante-nombre" class="min-w-0 flex-1 truncate font-body text-xs text-humo"></span>
              <button type="button" id="comprobante-quitar" class="shrink-0 rounded-full border border-borde px-3 py-1 font-body text-xs text-humo hover:border-primario hover:text-white">Quitar</button>
            </div>
            <p id="comprobante-nota" class="mt-1.5 font-body text-xs leading-[1.6] text-humo/70">Opcional. Si transferiste, adjuntá la captura acá o envianos el comprobante por WhatsApp al organizador.</p>
            <p id="comprobante-error" data-error-for="comprobante" role="alert" class="mt-1.5 hidden font-body text-sm text-red-400"></p>
          </div>
```

- [ ] **Step 2: In `js/inscripcion.js`,** add the import after the existing imports (line 3):

```js
import { validarImagen, comprimirImagen } from './imagen.js';
```

- [ ] **Step 3:** Add two message strings to the `MENSAJES` object (after the `ok:` line):

```js
  ok_comprobante: '✓ ¡Inscripción confirmada! Comprobante recibido.',
  ok_sin_comprobante: '✓ ¡Inscripción confirmada! No pudimos subir el comprobante — envialo por WhatsApp al organizador.',
```

- [ ] **Step 4:** Add the upload helper at module scope (e.g., right after the `consultarConteos` function definition):

```js
async function subirComprobante(torneo, konamiId, nombre, imagen) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'comprobante', torneo, konami_id: konamiId, nombre, imagen_b64: imagen.b64, mime: imagen.mime }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 5:** Inside the `else` block (the `APPS_SCRIPT_URL` truthy branch, where the comentario/konami listeners and the submit handler live), declare the staged-image state and wire the file listeners. Add this immediately after the existing `$('konami-id').addEventListener('input', ...)` block:

```js
    let imagenLista = null; // { b64, mime } tras comprimir, o null

    $('comprobante').addEventListener('change', async (e) => {
      const file = e.target.files[0] ?? null;
      const err = $('comprobante-error');
      const v = validarImagen(file);
      if (v.vacio) {
        imagenLista = null;
        $('comprobante-preview').classList.add('hidden');
        $('comprobante-preview').classList.remove('flex');
        err.classList.add('hidden');
        return;
      }
      if (!v.ok) {
        err.textContent = v.motivo === 'tipo' ? 'El archivo debe ser una imagen (JPG/PNG).' : 'La imagen es demasiado grande (máx. 10 MB).';
        err.classList.remove('hidden');
        e.target.value = '';
        imagenLista = null;
        $('comprobante-preview').classList.add('hidden');
        $('comprobante-preview').classList.remove('flex');
        return;
      }
      err.classList.add('hidden');
      try {
        imagenLista = await comprimirImagen(file);
        $('comprobante-thumb').src = `data:${imagenLista.mime};base64,${imagenLista.b64}`;
        $('comprobante-nombre').textContent = file.name;
        $('comprobante-preview').classList.remove('hidden');
        $('comprobante-preview').classList.add('flex');
      } catch {
        err.textContent = 'No se pudo procesar la imagen. Probá con otra.';
        err.classList.remove('hidden');
        imagenLista = null;
      }
    });

    $('comprobante-quitar').addEventListener('click', () => {
      imagenLista = null;
      $('comprobante').value = '';
      $('comprobante-preview').classList.add('hidden');
      $('comprobante-preview').classList.remove('flex');
    });
```

- [ ] **Step 6:** Replace the success branch of the submit handler. Find:

```js
        if (data.ok) {
          inscripcionConfirmada = true;
          conteos[torneo] = data.count;
          mostrarMensaje('ok');
          $('form-inscripcion').reset();
          $('contador-comentario').textContent = '0/100';
          renderTorneos();
          renderSelector();
        } else {
```

Replace with:

```js
        if (data.ok) {
          inscripcionConfirmada = true;
          conteos[torneo] = data.count;
          if (imagenLista) {
            btn.textContent = 'Inscripto ✓ subiendo comprobante…';
            const subio = await subirComprobante(torneo, konamiId, nombre.trim(), imagenLista);
            mostrarMensaje(subio ? 'ok_comprobante' : 'ok_sin_comprobante');
          } else {
            mostrarMensaje('ok');
          }
          $('form-inscripcion').reset();
          $('contador-comentario').textContent = '0/100';
          imagenLista = null;
          $('comprobante-preview').classList.add('hidden');
          $('comprobante-preview').classList.remove('flex');
          renderTorneos();
          renderSelector();
        } else {
```

(The `finally` block already resets `btn.textContent = 'Confirmar inscripción'` and re-enables it, so the "subiendo…" label is transient — correct.)

- [ ] **Step 7: Verify in the browser.** Server on :3000 (start `node serve.mjs` background if down). The live sheet has active tournaments, so the form renders.

  - `node screenshot.mjs http://localhost:3000/torneos.html v3-form-vacio` → READ: the new "Comprobante de pago (opcional)" field + WhatsApp note appear below the comment field, above the submit button.
  - Puppeteer interaction (temp script, then delete): set a small generated PNG on `#comprobante` via `fileChooser`/`elementHandle.uploadFile`, confirm `#comprobante-preview` becomes visible (class no longer `hidden`) and `#comprobante-nombre` shows the filename; click `#comprobante-quitar` → preview hidden again. (Do NOT submit — we don't want a real registration; the full upload path is exercised in Task 5 E2E.)
  - `node screenshot.mjs http://localhost:3000/torneos.html v3-form-preview` after setting a file → READ: thumbnail + filename + Quitar button.
  - `node screenshot.mjs http://localhost:3000/torneos.html v3-form-m 390x844` → READ: field and preview fit, no overflow.

- [ ] **Step 8: `npm test` (20/20) and commit**

```bash
git add torneos.html js/inscripcion.js
git commit -m "feat: optional receipt field with preview and two-step upload"
```

---

### Task 4: Visual polish

**Files:** Modify any of `torneos.html`, `js/inscripcion.js`, `css/custom.css`.

- [ ] **Step 1:** With a staged preview image, screenshot torneos desktop + mobile (`v3-pol-*`). READ against: the file input styling matches the dark/neon theme (no default browser-gray button), preview row aligns (thumb + truncated name + Quitar on one line, no overflow at 390px), note text legible (contrast), spacing rhythm consistent with the other fields, focus-visible ring on the file input.
- [ ] **Step 2:** Fix concrete issues; re-screenshot (round 2). `npm test` 20/20.
- [ ] **Step 3: Commit** (only if changed)

```bash
git add -A torneos.html js/inscripcion.js css/
git commit -m "polish: receipt field visual refinement"
```

---

### Task 5: Sheet/script migration (USER ACTIONS) + live E2E

**Files:** none (coordination + verification).

- [ ] **Step 1:** Give the user the v3 migration checklist (Task 2 Step 7 section): add `comprobante` in `Inscripciones!F1`; repaste `Code.gs`; **deploy NEW VERSION**; be ready to authorize the Drive permission on first upload. Ask them to confirm done. (No test tournaments needed — the live sheet already has active ones; we'll register a clearly-labeled test player and delete it after.)
- [ ] **Step 2:** Confirm the deploy didn't break existing endpoints: `Invoke-WebRequest "<APPS_SCRIPT_URL>?action=counts"` still returns `{ok:true,...}`.
- [ ] **Step 3:** Browser E2E (puppeteer on http://localhost:3000/torneos.html against the REAL script): register a test player ("PRUEBA BORRAR v3", a real-looking 10-digit Konami ID not already used) on an active tournament WITH a small generated test image. Expect final message `✓ ¡Inscripción confirmada! Comprobante recibido.` Then ask the user to confirm: (a) the row appears in `Inscripciones` with a link in the `comprobante` column, (b) the file is in the `BUTA TCG - Comprobantes` Drive folder.
- [ ] **Step 4:** Failure path: with a direct POST of `action:'comprobante'` carrying `mime:'application/pdf'` → expect `{ok:false,error:'datos_invalidos'}` (server rejects non-image). And register a second test player WITHOUT an image → expect plain `ok` message and empty `comprobante` cell.
- [ ] **Step 5:** Ask the user to delete the test rows from `Inscripciones` and the test files from the Drive folder. Confirm before deploy.

---

### Task 6: Deploy + live verification

**Files:** none new.

- [ ] **Step 1:** Merge the branch to `main` (after `npm test` 20/20), push `origin main`.
- [ ] **Step 2:** Poll https://l4gash.github.io/buta-tcg-web/torneos.html until fresh (console signature present via a puppeteer console listener).
- [ ] **Step 3:** Live checks (puppeteer, cache disabled): all 4 pages no console errors; the receipt field renders on torneos; screenshot torneos desktop + mobile. READ them.
- [ ] **Step 4:** Report the live URL + what was verified. Remind the user that receipts are real financial data living in their private Drive folder (retention is their call).

---

## Self-Review (completed by plan author)

- **Spec coverage:** optional image upload, images-only, in-browser compression (T1) ✓ · decoupled two-step upload, register-first, fail-soft message (T3) ✓ · Drive find-or-create folder + `comprobante` column link + server validation/size cap/mime allowlist (T2) ✓ · WhatsApp note without number (T3 markup) ✓ · backward-compat: missing column → `sinFila` and registration intact; old script → `duplicado` on step 2 → WhatsApp message (T2 design, T5 failure path) ✓ · templates + migration guide + Drive auth note (T2) ✓ · tests for pure parts, E2E real, visual, deploy (T1, T4, T5, T6) ✓ · out-of-scope (PDF, auto-verify, gallery, exposing number, retention) respected ✓
- **Placeholder scan:** none — every code step is complete; the only "generate a small test image" steps (T3/T5) are puppeteer fixtures, described concretely enough.
- **Type consistency:** `validarImagen` returns `{ok, vacio?}|{ok:false, motivo:'tipo'|'tamano'}`; `comprimirImagen` → `{b64, mime}`; upload payload `{action:'comprobante', torneo, konami_id, nombre, imagen_b64, mime}` matches `guardarComprobante_` reads exactly; new `MENSAJES` keys `ok_comprobante`/`ok_sin_comprobante` used in T3 Step 6; element ids (`comprobante`, `comprobante-preview`, `comprobante-thumb`, `comprobante-nombre`, `comprobante-quitar`, `comprobante-nota`, `comprobante-error`) consistent between T3 markup and JS.
