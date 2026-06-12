# BUTA TCG v3 — Comprobante de pago opcional (subida de imagen)

**Fecha:** 2026-06-11
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio v2 en producción (https://l4gash.github.io/buta-tcg-web/), specs previos en `2026-06-09` (v1) y `2026-06-10` (v2).

## Resumen

Permitir que, al inscribirse, el jugador **adjunte de forma opcional** una foto/captura del comprobante de transferencia. La imagen se comprime en el navegador y se sube a una carpeta privada del Google Drive de BUTA mediante el Apps Script existente, en una **segunda petición desacoplada** de la inscripción. Se agrega además una **nota informativa** que invita a enviar el comprobante por WhatsApp al organizador, sin exponer ningún número.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Arquitectura de subida | Dos pasos desacoplados: inscripción primero (como hoy), luego una segunda petición con la imagen. La inscripción nunca depende de la subida. |
| Obligatoriedad | El comprobante es **opcional**. |
| Tipos de archivo | Solo imágenes (JPG/PNG/WEBP). Sin PDF. |
| Si la subida falla | La inscripción queda guardada igual; se muestra "envialo por WhatsApp al organizador". |
| Almacenamiento | Carpeta `BUTA TCG - Comprobantes` en el Drive de BUTA (busca-o-crea por nombre, sin IDs manuales). |
| Vínculo con la inscripción | Nueva columna `comprobante` en `Inscripciones` con el link al archivo. |
| Nota WhatsApp | Texto informativo, sin link ni número. |

## 1. Backend (Apps Script `apps-script/Code.gs`)

### Nueva columna
- `Inscripciones` gana la columna `comprobante` (columna F, después de `comentario`). Guarda la URL del archivo en Drive, o queda vacía.

### Carpeta de Drive
- Helper `carpetaComprobantes_()`: busca una carpeta llamada `BUTA TCG - Comprobantes` en la raíz del Drive del dueño del script; si no existe, la crea. Devuelve el `Folder`. Se memoiza dentro de la ejecución.

### Nueva rama en `doPost`
Al inicio de `doPost` (tras parsear el JSON, dentro del lock existente o en su propio manejo), si `datos.action === 'comprobante'`:
1. Validar `torneo` no vacío, `konami_id` de 10 dígitos, `imagen_b64` no vacío, `mime` ∈ {image/jpeg, image/png, image/webp}.
2. Decodificar base64; si el tamaño supera `MAX_BYTES` (1.5 MB), responder `{ ok:false, error:'archivo_grande' }`.
3. Construir `Blob` con el mime y un nombre `sanitizar_(torneo)__sanitizar_(nombre)__konamiId__yyyy-MM-dd-HHmm.<ext>`.
4. `carpetaComprobantes_().createFile(blob)`; obtener `getUrl()`.
5. Buscar en `Inscripciones` la fila cuyo `torneo` y `konami_id` coincidan (única por la regla de duplicados); escribir la URL en su columna `comprobante`. Si no se encuentra la fila (caso borde), igual se guarda el archivo y se responde ok con una marca `sinFila:true` (el archivo no se pierde).
6. Responder `{ ok:true }` (o `{ ok:true, sinFila:true }`).

La rama de inscripción normal (sin `action` o `action` distinto) queda **idéntica** a v2, incluida la validación, el `celdaSegura_`, el conteo y el `appendRow` de 5 celdas (la 6.ª, `comprobante`, queda vacía en el alta y se completa en el paso 2).

### Helper `sanitizar_(texto)`
Reemplaza todo lo que no sea `[A-Za-z0-9-]` por `-`, recorta a ~40 chars. Para nombres de archivo seguros.

### Límites/seguridad
- `MAX_BYTES = 1.5 * 1024 * 1024`.
- Solo mimes de imagen en lista blanca.
- La carpeta es privada (Drive del dueño). La retención/borrado queda a criterio de BUTA.

## 2. Frontend

### `torneos.html`
Agregar, dentro del `<form id="form-inscripcion">`, después del bloque de comentario y antes del botón:

- `label` "Comprobante de pago (opcional)".
- `input#comprobante type="file" accept="image/*"` (oculto visualmente o estilizado) con un botón/área de selección accesible.
- Contenedor `#comprobante-preview` (oculto por defecto): miniatura + nombre de archivo + botón "Quitar".
- `p#comprobante-nota` con el texto: "Opcional. Si transferiste, adjuntá la captura acá o envianos el comprobante por WhatsApp al organizador."
- `p#comprobante-error` (oculto, role=alert) para "El archivo debe ser una imagen" / "La imagen es demasiado grande".

### `js/imagen.js` (módulo nuevo, responsabilidad única: preparar la imagen)
- `validarImagen(file)`: devuelve `{ ok:true }` o `{ ok:false, motivo:'tipo'|'tamano' }`. Acepta `file == null` como `{ ok:true, vacio:true }` (opcional). Rechaza no-imágenes y archivos crudos > 10 MB (antes de comprimir).
- `comprimirImagen(file, { maxLado=1280, calidad=0.7 })`: Promesa que resuelve `{ b64, mime:'image/jpeg' }` usando `createImageBitmap` + `<canvas>` + `toBlob`. (Browser-only; no se testea en Node — se prueba en E2E.)
- Constantes exportadas (`MAX_LADO`, `CALIDAD`, `MAX_CRUDO_BYTES`) para que los tests verifiquen los valores esperados.

### `js/inscripcion.js`
- Importar de `./imagen.js` y de `./config.js` (sin cambios en config).
- Estado: `let imagenLista = null;` (guarda `{ b64, mime }` tras seleccionar y comprimir, o `null`).
- Listener `change` en `#comprobante`: corre `validarImagen`; si falla, muestra `#comprobante-error` y limpia; si ok y hay archivo, comprime, guarda en `imagenLista`, muestra preview. Botón "Quitar" → `imagenLista = null`, oculta preview, resetea el input.
- En el `submit`, tras la inscripción exitosa (donde hoy se hace `mostrarMensaje('ok')`):
  - Si `imagenLista`: cambiar botón a "Inscripto ✓ subiendo comprobante…", hacer `POST` con `{ action:'comprobante', torneo, konami_id, nombre, imagen_b64, mime }`.
    - Respuesta `ok` → `mostrarMensaje('ok_comprobante')`.
    - Falla (red o `!ok`) → `mostrarMensaje('ok_sin_comprobante')`.
  - Si no hay imagen: `mostrarMensaje('ok')` como hoy.
  - Limpiar `imagenLista`, preview e input en el reset.
- Nuevos textos en `MENSAJES`:
  - `ok_comprobante`: "✓ ¡Inscripción confirmada! Comprobante recibido."
  - `ok_sin_comprobante`: "✓ ¡Inscripción confirmada! No pudimos subir el comprobante — envialo por WhatsApp al organizador."

El flujo de cupos/duplicado/lleno y el resto del submit no cambian. El comprobante se sube siempre con `text/plain` (mismo truco anti-preflight CORS).

## 3. Datos y compatibilidad

- Si la columna `comprobante` no existe (planilla vieja): la rama de inscripción sigue funcionando; la subida de comprobante, si llega, escribiría en una columna inexistente → el script debe tolerarlo (si no encuentra el índice de `comprobante`, guarda el archivo igual y omite escribir el link, respondiendo `ok` con `sinFila`/`sinColumna`). Nada rompe la inscripción.
- Si el Apps Script viejo (sin la rama `comprobante`) recibe `action:'comprobante'`: al ignorar el campo `action`, lo trata como un alta normal; como la fila ya existe (mismo torneo + konami_id), responde `{ ok:false, error:'duplicado' }`. El cliente trata cualquier `!ok` del paso 2 como "no se pudo subir" y muestra el mensaje de WhatsApp. La inscripción del paso 1 ya está guardada. Aceptable durante la ventana de migración (se resuelve al redeployar).
- Plantilla `docs/sheets-template/inscripciones.csv` se actualiza a `timestamp,torneo,nombre,konami_id,comentario,comprobante`.
- `docs/setup-google-sheets.md` gana una sección "Actualización v3 (comprobantes)".

## 4. Verificación

- **Tests** (`node --test`): `validarImagen` (null→vacío ok; tipo no-imagen→falla; >10 MB→falla; imagen válida→ok) y verificación de las constantes de compresión. Nombre de test neutro para no inflar.
- **E2E real** (acciones del usuario: columna `comprobante` + redeploy + autorizar Drive): inscripción con imagen de prueba → archivo en la carpeta de Drive + link en la fila; inscripción sin imagen → ok; subida forzada a fallar (URL inválida temporal) → mensaje de WhatsApp y la inscripción igual guardada. Confirmación manual del usuario de que ve el archivo en Drive.
- **Visual:** screenshots del formulario con el campo nuevo y el preview (móvil + escritorio), mínimo 2 rondas.
- **Deploy:** push a GitHub Pages + verificación en vivo (consola sin errores, firma presente).

## Fuera de alcance

- PDF u otros formatos no-imagen.
- Verificación automática del contenido del comprobante (montos, validación bancaria).
- Galería/visor de comprobantes en la web (se ven desde Drive).
- Exponer número de WhatsApp o botón directo (solo nota informativa).
- Borrado/retención automática de comprobantes (manual por BUTA).
