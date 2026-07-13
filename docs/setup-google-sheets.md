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

⚠️ **REGLA DE ORO: cada torneo necesita un nombre ÚNICO** (incluí la fecha, ej: "Buta Córdoba 13/06").
Todo el sistema identifica los torneos por su nombre: si dos torneos activos se llaman igual,
las inscripciones se mezclan, el cupo se comparte y un jugador no puede anotarse a los dos.
Si ya pasó: renombrá los torneos en `Torneos` y actualizá la columna `torneo` de las
inscripciones existentes en `Inscripciones` (Ctrl+H, buscar y reemplazar) para que coincidan.

## Actualización v3 (comprobante de pago opcional)

Permite que el jugador adjunte una foto del comprobante al inscribirse; se guarda en tu Drive.

1. En la pestaña `Inscripciones`, escribí `comprobante` en la celda F1 (a la derecha de `comentario`).
2. Repegá TODO el `apps-script/Code.gs` actualizado en Extensiones → Apps Script y guardá.
3. ⚠️ Implementar → Gestionar implementaciones → ✏️ Editar → Versión: **Nueva versión** → Implementar.
4. **Autorizá el permiso de Drive** (una sola vez): en el editor de Apps Script, en el
   desplegable de funciones (arriba, al lado de "Depuración") elegí **`autorizarDrive`** y clic
   en **▶ Ejecutar**. Google muestra "Se requiere autorización" → Revisar permisos → elegí la
   cuenta de BUTA → (si dice "Google no verificó esta app": Configuración avanzada → Ir al
   proyecto) → **Permitir** el acceso a Google Drive. Eso crea sola la carpeta
   `BUTA TCG - Comprobantes` en tu Drive (privada, solo la ves vos).
   ⚠️ Importante: hacé esto ANTES o DESPUÉS del deploy, pero si lo hacés después, volvé a
   **Implementar → Gestionar implementaciones → Nueva versión** para que la web tome el permiso.
5. El adjunto es **opcional**: quien no suba foto se inscribe igual, y la columna `comprobante`
   de esa fila queda vacía. Si alguien la sube, ahí aparece el link al archivo.

## Actualización v5 (carga de decklist para torneos importantes)

Permite habilitar, torneo por torneo, que los inscriptos suban su decklist (imagen o PDF)
a una carpeta de Drive dedicada. Pensado para fechas importantes (ej: el YACS).

1. En la pestaña `Torneos`, escribí `decklist_habilitado` en la celda L1 (a la derecha de `alias`).
   Para el/los torneos donde quieras pedir decklist, poné `si` en esa columna. Vacío o `no` = deshabilitado.
2. Creá una pestaña nueva llamada EXACTO `Decklists` e importá
   `docs/sheets-template/decklists.csv` (deja solo la fila de encabezado; el script agrega filas solo).
3. Repegá TODO el `apps-script/Code.gs` actualizado en Extensiones → Apps Script y guardá.
4. ⚠️ Implementar → Gestionar implementaciones → ✏️ Editar → Versión: **Nueva versión** → Implementar.
5. La carpeta de Drive ya está fija en el código (`BUTA TCG - Decklist`, la misma que compartiste) —
   no hace falta autorizar Drive de nuevo si ya lo hiciste para el comprobante de pago (mismo permiso).
   Si nunca lo hiciste: repetí el paso de `autorizarDrive` de la sección de comprobante, arriba.
6. Adentro de esa carpeta, el script crea sola una subcarpeta por torneo (con el nombre EXACTO
   del torneo) la primera vez que alguien sube una decklist para esa fecha.
7. **Solo puede subir decklist quien ya esté inscripto** a ese torneo con el mismo Konami ID
   (se valida contra `Inscripciones`). Si vuelve a subir, se reemplaza el envío anterior en
   `Decklists` — no se acumulan filas duplicadas.
8. La web solo muestra la sección "Decklist" en `torneos.html` cuando hay al menos un torneo
   habilitado; si no, queda oculta sola.

## Actualización v6 (temporadas de la liga)

Permite archivar los resultados por temporada: la web muestra por defecto la temporada
en curso, y las anteriores quedan accesibles con un selector (sin perder nada).

1. En la pestaña `Resultados`, escribí `temporada` en la celda F1 (a la derecha de `foto`).
2. Las filas viejas se pueden dejar VACÍAS: la web las agrupa sola como "Temporada 1".
3. Cuando arranque la temporada siguiente, cargá las filas nuevas con `Temporada 2` en esa
   columna (y así sucesivamente). Con que la columna tenga el mismo texto EXACTO en todas
   las filas de esa temporada alcanza — la web arma el selector sola.
4. No hay que tocar el Apps Script ni redeployar nada: los resultados se leen por CSV.
5. El perfil de cada jugador conserva TODO su historial, agrupado por temporada.
   El gráfico "El meta de Córdoba" y el panel "Los números de la temporada" muestran
   la temporada seleccionada.

Ojo: el ranking de liga (la otra planilla) es de la temporada en curso — al cerrar una
temporada, sacale una copia si querés conservar la tabla final antes de resetear los puntos.

## Actualización v7 (avisos de nueva fecha por email)

Los jugadores dejan su email en la web ("🔔 Avisame cuando abra una nueva fecha") y,
cuando cargás un torneo nuevo con estado `proximo`, un robot les manda el aviso solo
(revisa la planilla cada 1 hora). Cada mail lleva su link de baja.

1. En la pestaña `Torneos`, escribí `aviso_enviado` en la celda M1 (a la derecha de
   `decklist_habilitado`). NO la llenes vos: el script pone ahí la fecha/hora cuando
   manda el aviso de ese torneo. (Si querés re-avisar un torneo, borrá esa celda.)
2. Creá una pestaña nueva llamada EXACTO `Avisos` e importá `docs/sheets-template/avisos.csv`
   (queda solo el encabezado `timestamp,email`; las suscripciones aparecen solas).
3. Repegá TODO el `apps-script/Code.gs` actualizado en Extensiones → Apps Script y guardá.
4. ⚠️ Implementar → Gestionar implementaciones → ✏️ Editar → Versión: **Nueva versión** → Implementar.
5. **Instalá el robot** (una sola vez): en el editor de Apps Script, en el desplegable de
   funciones elegí **`instalarAvisos`** y clic en **▶ Ejecutar**. Google va a pedir permisos
   nuevos (enviar email como vos + administrar disparadores): aceptalos igual que hiciste
   con `autorizarDrive`. Eso deja corriendo la revisión horaria.
6. Los mails salen de tu cuenta de Google. La cuota gratuita es ~100 mails/día: si la lista
   crece más que eso, el robot espera al día siguiente y reintenta solo (no se pierde nada).
7. Para probar: anotá tu propio email en la web, cargá un torneo de prueba con estado
   `proximo`, y en el editor ejecutá `avisarNuevasFechas` a mano (así no esperás la hora).
   Te tiene que llegar el mail y la celda `aviso_enviado` de ese torneo queda marcada.

## Cargar resultados de un torneo (v4)

1. En la pestaña `Resultados`, agregá una fila por cada jugador del top con: `torneo`
   (el nombre EXACTO del torneo), `puesto` (1, 2, 3…), `nombre`, y `deck` solo si lo sabés.
2. Dejá la columna `foto` **vacía** en todos: las filas sin foto se ven como tarjetas
   compactas (puesto + nombre + deck), sin imagen rota. El "deck" aparece solo si lo cargaste.
3. **Decklist del campeón (o de quien tenga):** mandale la imagen al desarrollador. Él la sube
   al sitio y te dice qué nombre poner en la celda `foto` de esa fila. Recién ahí esa tarjeta
   muestra la imagen (clickeable, se agranda). El resto del top queda compacto.
4. La página se actualiza sola al editar la planilla (no hay que tocar el sitio para el texto).
