# BUTA TCG — Pre-llenado de formulario con localStorage

**Fecha:** 2026-06-19
**Estado:** Aprobado por el usuario.

## Resumen

Pequeña mejora de UX: después de que un jugador se inscribe exitosamente a un torneo, el sitio guarda su nombre y Konami ID en `localStorage`. En la próxima visita a `torneos.html`, el formulario aparece pre-completado con esos datos. El jugador puede editarlos libremente; si envía con éxito datos distintos, `localStorage` se actualiza.

No hay autenticación, no hay cuentas, no hay infraestructura nueva. Los datos solo viven en el navegador del mismo dispositivo.

## Decisiones

| Tema | Decisión |
|---|---|
| Cuándo guardar | Solo tras respuesta `ok: true` del Apps Script. Nunca con datos inválidos o rechazados. |
| Qué guardar | `{ nombre, konami_id }` — solo el perfil del jugador, no el torneo. |
| Clave en localStorage | `buta_jugador` |
| Actualización | Si el jugador envía datos distintos y recibe `ok: true`, se sobreescribe el valor guardado. |
| Borrado | No hay UI de "olvidar mis datos" en esta fase — queda para una iteración futura si se pide. |
| Alcance | Solo `torneos.html`. No afecta otras páginas. |

## Flujo

1. Jugador entra a `torneos.html`.
2. JS lee `localStorage.getItem('buta_jugador')`. Si existe, pre-completa los campos `#nombre` y `#konami-id` del formulario.
3. Jugador revisa, ajusta si hace falta, y envía.
4. Si el Apps Script responde `{ ok: true }`: se llama `localStorage.setItem('buta_jugador', JSON.stringify({ nombre, konami_id }))` con los valores que se enviaron.
5. Si responde con error (duplicado, lleno, datos inválidos, red): no se toca `localStorage`.

## Cambios al código

Solo se modifica `js/inscripcion.js`:

- **Al inicializar** (DOMContentLoaded o equivalent): leer `buta_jugador` de `localStorage` y, si existe, setear `.value` de los dos campos.
- **En el handler de éxito**: después de mostrar "✓ Inscripción confirmada", guardar en `localStorage`.

No se modifica `apps-script/Code.gs`, ni ninguna página HTML, ni `js/data.js`, ni `js/config.js`.

## Fuera de alcance

- Auth real / "Sign in with Google".
- Sincronización entre dispositivos.
- Historial de torneos a los que se inscribió el jugador.
- UI de "recordar mis datos" con checkbox o botón de borrar.
