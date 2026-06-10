# BUTA TCG v2 — Multi-torneo, alias de pago, comentario y marca de autoría

**Fecha:** 2026-06-10
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio v1 en producción (https://l4gash.github.io/buta-tcg-web/), spec v1 en `2026-06-09-buta-tcg-website-design.md`.

## Resumen

Cuatro mejoras al sitio en producción:

1. **Alias de transferencia** por torneo, visible en la ficha con botón de copiar.
2. **Campo comentario** opcional (≤100 caracteres) en la inscripción, para aclarar forma de pago.
3. **Múltiples torneos activos** simultáneos: tarjetas comparables + un único formulario con selector (mockup A aprobado).
4. **Marcas de autoría ocultas** en el código (4 marcadores) para poder demostrar copias del repo público.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| UX multi-torneo | Opción A: tarjetas por torneo + un solo formulario con selector. Botón de cada tarjeta preselecciona el torneo y baja al formulario. |
| Comentario | Opcional, máx. 100 caracteres (límite en navegador Y en servidor). |
| Alias | Columna `alias` por fila en la pestaña Torneos (puede repetirse o variar). Vacío = no se muestra. |
| Marca de agua | Enfoque "marcadores múltiples + sin licencia": 4 marcas independientes, repo sin LICENSE. |
| Conteo de cupos | Nueva acción `counts` (una llamada para todos los torneos activos); `count` singular se mantiene por compatibilidad. |

## 1. Cambios en la planilla (acciones de BUTA)

- **Torneos:** agregar columna `alias` (encabezado exacto, minúsculas) a la derecha de `estado`. Valor ej.: `buta.tcg`.
- **Inscripciones:** agregar columna `comentario` a la derecha de `konami_id`.
- Pueden coexistir varias filas con `estado = proximo`; la web las muestra en el orden de la planilla (cargarlas por fecha).
- Plantillas en `docs/sheets-template/*.csv` se actualizan con las nuevas columnas.

## 2. Cambios en Apps Script (`apps-script/Code.gs`)

- **doPost:** acepta campo opcional `comentario`. Normalización servidor: `String(...).replace(/[\r\n]+/g, ' ').trim().slice(0, 100)`. Se agrega como 5.ª celda del `appendRow`. Sin `comentario` → celda vacía.
- **doGet `action=counts`:** devuelve `{ ok: true, counts: { "<nombre torneo>": <inscriptos>, ... }, cupos: { "<nombre torneo>": <cupo_maximo>, ... } }` para todos los torneos con estado `proximo`/`próximo`. Una sola llamada llena todas las barras.
- **doGet `action=count`** (singular): se mantiene idéntico (compatibilidad con clientes cacheados).
- Requiere **repegar el script y crear NUEVA VERSIÓN de la implementación** (gotcha ya documentado en la guía). La URL `/exec` no cambia.

## 3. Cambios en el frontend

### js/data.js
- Nueva función pura `pickProximos(torneos)` (plural): devuelve **array** de todos los torneos con estado próximo, en orden de planilla. `pickProximo` singular queda como `pickProximos(t)[0] ?? null` (la usan páginas v1 hasta migrarlas; si tras la migración nadie la usa, se elimina).
- `FALLBACK_TORNEOS` gana el campo `alias: ''` (fallback sin alias).

### js/validation.js
- Nueva `validarComentario(c)`: acepta vacío/undefined; si hay texto, válido cuando `c.trim().length <= 100`.

### torneos.html + js/inscripcion.js
- **Tarjetas:** grilla `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (con 1 torneo: una tarjeta centrada ancho completo, layout actual). Cada tarjeta: nombre, 📅 fecha/hora, 📍 lugar, 🃏 formato/reglas, 💰 precio · 🏆 premios, barra de cupos, y si `alias` no está vacío: línea "💳 Transferencias: `alias`" + botón "Copiar" (usa `navigator.clipboard.writeText`; feedback "✓ Copiado" 2 s; si la API no está disponible, el alias se muestra igual y el botón se oculta).
- **Botón por tarjeta** "Inscribirme": setea el selector del formulario y hace scroll suave (`scrollIntoView`) al formulario.
- **Formulario único:** `<select>` de torneo (solo torneos activos; los llenos aparecen `disabled` con sufijo "— Cupo lleno"), nombre, Konami ID, y `<textarea maxlength="100" rows="2">` con contador `N/100` (actualizado en `input`) y placeholder "Ej: ya transferí / pago en efectivo el día del torneo (opcional)". El POST incluye `comentario` (string, puede ser vacío).
- **Cupos:** al cargar, una llamada `action=counts`; cada barra se llena con su conteo. Tras inscripción exitosa se actualiza solo la barra del torneo elegido (con el `count` de la respuesta, como hoy). Si `counts` falla, las barras muestran "X lugares" (cupo sin conteo), como hoy.
- **Estados sin cambio:** sin torneos activos → "Próximamente" + formulario oculto; sin APPS_SCRIPT_URL → mensaje de Instagram.
- Mensajes de error/éxito y validaciones existentes no cambian.

### index.html
- Sección "Próximo torneo" → "Próximos torneos" cuando hay más de uno: hasta 3 tarjetas compactas (nombre, fecha, lugar, link a Torneos). Con uno solo, igual que hoy. Con ninguno, igual que hoy.

### resultados.html / nosotros.html
- Sin cambios funcionales (solo reciben las marcas de autoría del punto 4).

## 4. Marcas de autoría

**Nota deliberada:** este documento se publica en el repo, así que NO detalla las marcas. La especificación completa (ubicación exacta, contenido y cómo demostrar cada una) vive únicamente en `marcas-de-autoria.txt` en la raíz local del proyecto, agregado a `.gitignore` antes de crear las marcas — ese archivo no se publica nunca.

Lineamientos públicos (sin revelar ubicaciones):
- Se incorporan **cuatro marcas independientes** de distinta naturaleza (una visible para quien lee código, tres camufladas), distribuidas en archivos distintos, de modo que borrar una no afecta a las demás.
- Una de ellas es semi-pública a propósito (firma simpática en la consola del navegador) — cumple doble función de marca y de contacto para desarrolladores curiosos.
- El repo **no** lleva archivo LICENSE (todos los derechos reservados por defecto). El README ya declara © BUTA TCG.
- Los tests que cubren las marcas usan nombres neutros (ej. "theme integrity constant") que no delatan su propósito.
- El plan de implementación (también público en el repo) referencia las marcas de forma genérica; el detalle operativo va solo en el archivo privado.

## Manejo de errores y compatibilidad

- Fila de torneo sin columna `alias` (planilla vieja): `t.alias` es `undefined` → la línea de transferencia no se renderiza. Nada se rompe si el código se publica antes de tocar la planilla.
- `action=counts` contra un Apps Script viejo (sin redeploy): responde `accion_invalida` → el cliente cae al modo "X lugares" sin conteo. El formulario sigue funcionando (doPost viejo ignora `comentario`; se pierde el comentario hasta el redeploy — aceptable durante la ventana de migración, se avisa al usuario que primero actualice el script).
- Comentario >100 en el servidor: se recorta (no se rechaza — el límite del navegador ya lo impide en el flujo normal; el recorte cubre POSTs directos).
- Torneo lleno seleccionado vía POST directo: ya cubierto por `lleno` (sin cambios).

## Verificación

- **Tests** (`node --test`): `pickProximos` (0, 1, n activos; mezcla con finalizados), `validarComentario` (vacío ok, 100 ok, 101 falla, espacios), más dos verificaciones de integridad con nombre neutro (cubren las marcas sin describirlas).
- **E2E con planilla real** (requiere acciones del usuario: columnas nuevas + redeploy del script + 2-3 torneos de prueba): inscripción con comentario → llega recortado a la 5.ª columna; inscripciones en torneos distintos con el mismo Konami ID → permitidas; duplicado dentro del mismo torneo → rechazado; cupo lleno por torneo → rechazado; `counts` llena todas las barras.
- **Visual:** screenshots móvil + escritorio de Torneos con 3 activos, con 1 activo y con 0; Inicio con 3 activos. Mínimo 2 rondas.
- **Deploy:** push a GitHub Pages y re-verificación de la URL pública (consola sin errores, marcas presentes).

## Fuera de alcance

- Pago online / verificación automática de transferencias.
- Panel de administración.
- Edición o cancelación de inscripciones desde la web.
- Marca de agua en imágenes (esteganografía).
