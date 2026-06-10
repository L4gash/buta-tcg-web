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
4. 💡 Si cerraste el diálogo sin copiar la URL: Implementar → **Gestionar implementaciones** y ahí la ves de nuevo.
5. 💡 Si algún día editás el código del script, los cambios NO se aplican solos: tenés que ir a
   Implementar → Gestionar implementaciones → ✏️ Editar → Versión: **Nueva versión** → Implementar.

## Paso 5 — Pegar las 3 URLs en la web
Abrí el archivo `js/config.js` del sitio y pegá cada link entre las comillas:

    export const TORNEOS_CSV_URL = 'LINK DEL PASO 2 (Torneos)';
    export const RESULTADOS_CSV_URL = 'LINK DEL PASO 2 (Resultados)';
    export const APPS_SCRIPT_URL = 'LINK DEL PASO 4';

Listo. Para anunciar un torneo nuevo: agregá una fila en `Torneos` con estado `proximo`.
Para cargar resultados: agregá filas en `Resultados` (la columna `foto` lleva solo el
nombre del archivo subido a `assets/results/` del sitio). Las inscripciones aparecen
solas en la pestaña `Inscripciones`.

Ojo: el nombre en `Torneos` (ej: "YACS Córdoba") y el nombre en `Resultados` (ej: "YACS Córdoba 06/12")
son independientes — en Resultados conviene incluir la fecha para distinguir las ediciones.

## Probar que todo funciona
1. En `Torneos`, poné un torneo con estado `proximo` y cupo_maximo 2.
2. En la web, inscribite con un nombre y un Konami ID de prueba → debe decir "✓ Inscripción confirmada" y aparecer la fila en `Inscripciones`.
3. Repetí con el MISMO Konami ID → debe decir "ya está inscripto".
4. Inscribí un segundo jugador distinto y luego un tercero → el tercero debe ver "El cupo está lleno".
5. Borrá las filas de prueba de `Inscripciones` y dejá el torneo como corresponda.

## Actualización v2 (alias de pago + comentarios + varios torneos)

Si tu planilla ya estaba funcionando con la versión anterior, hacé esto una sola vez:

1. En la pestaña `Torneos`, escribí `alias` en la celda K1 (a la derecha de `estado`).
   En cada torneo, poné en esa columna el alias de transferencia (ej: `buta.tcg`).
   Si la dejás vacía, la web simplemente no muestra la línea de transferencias.
2. En la pestaña `Inscripciones`, escribí `comentario` en la celda E1 (a la derecha de `konami_id`).
3. Repegá TODO el archivo `apps-script/Code.gs` actualizado en Extensiones → Apps Script y guardá.
4. ⚠️ Implementar → Gestionar implementaciones → ✏️ Editar → Versión: **Nueva versión** → Implementar.
   (Sin este paso, el script viejo sigue corriendo y los comentarios no se guardan.)
5. Ahora podés tener varios torneos con estado `proximo` a la vez: la web los muestra todos
   y cada jugador elige a cuál inscribirse. Cargalos en orden de fecha (la web respeta el orden de las filas).
