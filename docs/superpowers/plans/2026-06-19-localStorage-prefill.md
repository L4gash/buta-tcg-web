# localStorage Pre-fill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Después de una inscripción exitosa, guardar nombre + Konami ID en `localStorage` y pre-llenar el formulario de torneos en visitas futuras del mismo dispositivo.

**Architecture:** Dos cambios de pocas líneas en `js/inscripcion.js`. Al cargar la página (y solo cuando `APPS_SCRIPT_URL` existe), se lee `localStorage.getItem('buta_jugador')` y se pre-completan los campos. En el handler de éxito del submit, se guarda el par `{ nombre, konami_id }`. No se toca ningún otro archivo.

**Tech Stack:** JS vanilla, localStorage nativo del browser, Node.js test runner (`node:test`) para el test de la función de parsing.

---

## Archivos

- Modificar: `js/inscripcion.js` (dos inserciones — lectura en init, escritura en success handler)
- Crear: `tests/perfil.test.mjs` (test de la función de parsing de localStorage)

---

### Task 1: Extraer y testear la función de lectura del perfil guardado

Los tests del proyecto son de funciones puras (sin DOM). Para poder testear la lógica de parsing de `localStorage` hay que extraerla como función pura en `inscripcion.js` y luego importarla en el test.

**Files:**
- Modify: `js/inscripcion.js` — agregar función `leerPerfilGuardado()`
- Create: `tests/perfil.test.mjs`

- [ ] **Step 1: Escribir el test que fallará**

Crear `tests/perfil.test.mjs` con el siguiente contenido:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Función pura a extraer de inscripcion.js — la importamos para testearla.
// leerPerfilGuardado(raw) recibe el string crudo de localStorage.getItem('buta_jugador')
// y devuelve { nombre, konami_id } o null si el valor es inválido/ausente.
import { leerPerfilGuardado } from '../js/inscripcion.js';

test('null cuando el storage está vacío', () => {
  assert.equal(leerPerfilGuardado(null), null);
});

test('null cuando el JSON es inválido', () => {
  assert.equal(leerPerfilGuardado('no-json'), null);
});

test('null cuando faltan ambos campos', () => {
  assert.equal(leerPerfilGuardado(JSON.stringify({})), null);
});

test('devuelve objeto con nombre y konami_id válidos', () => {
  const raw = JSON.stringify({ nombre: 'Juan Pérez', konami_id: '0123456789' });
  assert.deepEqual(leerPerfilGuardado(raw), { nombre: 'Juan Pérez', konami_id: '0123456789' });
});

test('devuelve objeto aunque falte konami_id (pre-llenado parcial)', () => {
  const raw = JSON.stringify({ nombre: 'Juan Pérez' });
  assert.deepEqual(leerPerfilGuardado(raw), { nombre: 'Juan Pérez', konami_id: '' });
});

test('devuelve objeto aunque falte nombre (pre-llenado parcial)', () => {
  const raw = JSON.stringify({ konami_id: '0123456789' });
  assert.deepEqual(leerPerfilGuardado(raw), { nombre: '', konami_id: '0123456789' });
});
```

- [ ] **Step 2: Correr el test para confirmar que falla**

```
node --test tests/perfil.test.mjs
```

Resultado esperado: `SyntaxError` o `Error [ERR_MODULE_NOT_FOUND]` — la función no existe todavía.

- [ ] **Step 3: Agregar `leerPerfilGuardado` al principio de `inscripcion.js` y exportarla**

En `js/inscripcion.js`, después de los `import` iniciales (línea ~4) y antes de `const MENSAJES`, insertar:

```js
export function leerPerfilGuardado(raw) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== 'object' || obj === null) return null;
    return { nombre: String(obj.nombre ?? ''), konami_id: String(obj.konami_id ?? '') };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Correr el test para confirmar que pasa**

```
node --test tests/perfil.test.mjs
```

Resultado esperado: 6 tests pasando, 0 fallos.

- [ ] **Step 5: Commit**

```
git add js/inscripcion.js tests/perfil.test.mjs
git commit -m "feat: extraer leerPerfilGuardado y testearla"
```

---

### Task 2: Pre-llenar el formulario al inicializar la página

Usar `leerPerfilGuardado` para leer `localStorage` y completar los campos `#nombre` y `#konami-id` antes de que el usuario interactúe.

**Files:**
- Modify: `js/inscripcion.js` — inserción dentro del bloque `else { // APPS_SCRIPT_URL existe }`

- [ ] **Step 1: Ubicar el punto de inserción exacto**

En `js/inscripcion.js` buscar el bloque:

```js
  if (!APPS_SCRIPT_URL) {
    $('form-inscripcion').innerHTML = `...`;
  } else {
    $('comentario').addEventListener('input', ...
```

La inserción va al **inicio** del `else`, antes del primer `addEventListener`:

```js
  } else {
    // <<< INSERTAR AQUÍ
    $('comentario').addEventListener('input', ...
```

- [ ] **Step 2: Insertar el código de pre-llenado**

Reemplazar el inicio del bloque `else`:

```js
  } else {
    const perfil = leerPerfilGuardado(localStorage.getItem('buta_jugador'));
    if (perfil) {
      $('nombre').value = perfil.nombre;
      $('konami-id').value = perfil.konami_id;
    }

    $('comentario').addEventListener('input', (e) => {
```

No se cambia nada más del bloque — solo se agrega el pre-fill antes del primer addEventListener existente.

- [ ] **Step 3: Verificar manualmente en el browser**

1. Iniciar el servidor: `node serve.mjs`
2. Abrir `http://localhost:3000/torneos.html`
3. En DevTools > Application > Local Storage, agregar manualmente:
   - Key: `buta_jugador`
   - Value: `{"nombre":"Test Player","konami_id":"1234567890"}`
4. Recargar la página.
5. Verificar que el campo Nombre muestra "Test Player" y el campo Konami ID muestra "1234567890".
6. Limpiar el entry de localStorage (`Remove item`) y recargar — los campos deben quedar vacíos.

- [ ] **Step 4: Commit**

```
git add js/inscripcion.js
git commit -m "feat: pre-llenar formulario de inscripción desde localStorage"
```

---

### Task 3: Guardar el perfil en localStorage tras inscripción exitosa

Cuando el servidor responde `{ ok: true }`, guardar `{ nombre, konami_id }` en `localStorage`.

**Files:**
- Modify: `js/inscripcion.js` — una línea en el handler de éxito del submit

- [ ] **Step 1: Ubicar el punto de inserción exacto**

En `js/inscripcion.js`, dentro del submit handler, buscar:

```js
        if (data.ok) {
          inscripcionConfirmada = true;
          conteos[torneo] = data.count;
```

- [ ] **Step 2: Insertar el guardado justo después de `inscripcionConfirmada = true`**

```js
        if (data.ok) {
          inscripcionConfirmada = true;
          localStorage.setItem('buta_jugador', JSON.stringify({ nombre: nombre.trim(), konami_id: konamiId }));
          conteos[torneo] = data.count;
```

- [ ] **Step 3: Verificar el flujo completo**

Con el servidor corriendo (`node serve.mjs`) y el Apps Script configurado (o en su ausencia, editando manualmente localStorage):

**Path A — con Apps Script real:**
1. Abrir `http://localhost:3000/torneos.html`
2. Completar el formulario con un nombre y Konami ID válidos (10 dígitos) y enviar.
3. Tras ver "✓ ¡Inscripción confirmada!", abrir DevTools > Application > Local Storage.
4. Verificar que existe `buta_jugador` con `{ nombre: "...", konami_id: "..." }`.
5. Recargar la página y verificar que el formulario aparece pre-completado.

**Path B — sin Apps Script (simulación):**
1. En DevTools > Console, ejecutar: `localStorage.removeItem('buta_jugador')`
2. Recargar — campos vacíos. ✓
3. En Console: `localStorage.setItem('buta_jugador', JSON.stringify({ nombre: 'Mariano Castro', konami_id: '0123456789' }))`
4. Recargar — campos pre-llenados. ✓

- [ ] **Step 4: Correr todos los tests del proyecto para verificar que no se rompió nada**

```
node --test tests/
```

Resultado esperado: todos los tests pasando (validation, csv, integrity, perfil, imagen, data).

- [ ] **Step 5: Commit**

```
git add js/inscripcion.js
git commit -m "feat: guardar perfil del jugador en localStorage tras inscripción exitosa"
```
