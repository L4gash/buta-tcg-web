// BUTA TCG — backend de inscripciones.
// Script VINCULADO a la planilla (Extensiones > Apps Script). Ver docs/setup-google-sheets.md
// doPost: inscribe {torneo, nombre, konami_id, comentario?} · sube comprobante {action:'comprobante', torneo, konami_id, nombre, imagen_b64, mime}
//         · sube decklist {action:'decklist', torneo, nombre, konami_id, archivo_b64, mime}.
// doGet: ?action=count&torneo=X (conteo de uno) · ?action=counts (conteos y cupos de todos los próximos).

// NOTA: el cliente web envía Content-Type text/plain a propósito — evita el preflight
// CORS que Apps Script no soporta. No cambiar a application/json.

const HOJA_TORNEOS = 'Torneos';
const HOJA_INSCRIPCIONES = 'Inscripciones';
const HOJA_DECKLISTS = 'Decklists';
const CARPETA_COMPROBANTES = 'BUTA TCG - Comprobantes';
const MAX_BYTES_COMPROBANTE = 1.5 * 1024 * 1024;
const MIMES_COMPROBANTE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// ID de la carpeta fija "BUTA TCG - Decklist" en Drive (no se busca por nombre
// como la de comprobantes: es una carpeta puntual que ya existe, con una
// subcarpeta por torneo adentro). Sacado de la URL que compartiste:
// https://drive.google.com/drive/folders/<ESTE_ID>
const CARPETA_DECKLIST_ID = '1mg2xh0QON1lVP5mJYh7YDHQixeOH1NjZ';
const MAX_BYTES_DECKLIST_IMAGEN = 1.5 * 1024 * 1024; // ya viene comprimida del navegador
const MAX_BYTES_DECKLIST_PDF = 5 * 1024 * 1024;      // el PDF se sube sin comprimir
const MIMES_DECKLIST = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Evita que Sheets interprete texto libre como fórmula (=, +, -, @): se antepone
// el apóstrofe que Sheets usa para "tratar como texto literal".
function celdaSegura_(texto) {
  return /^[=+\-@\t]/.test(texto) ? "'" + texto : texto;
}

// Nombre de archivo seguro: solo letras/números/guiones, recortado.
function sanitizar_(texto) {
  return String(texto).replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
}

// Busca o crea la carpeta de comprobantes en el Drive del dueño del script.
function carpetaComprobantes_() {
  const it = DriveApp.getFoldersByName(CARPETA_COMPROBANTES);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_COMPROBANTES);
}

// Ejecutá esta función UNA vez desde el editor (desplegable de funciones → autorizarDrive →
// ▶ Ejecutar) para conceder el permiso de Google Drive. Como toca Drive, Google muestra el
// cartel "Se requiere autorización": aceptalo. De paso crea la carpeta de comprobantes.
function autorizarDrive() {
  const carpeta = carpetaComprobantes_();
  Logger.log('Carpeta de comprobantes lista: ' + carpeta.getUrl());
  return carpeta.getUrl();
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

// Subcarpeta del torneo dentro de la carpeta fija de decklists (una por
// torneo, para poder mandarle la carpeta completa a un juez o archivarla).
function carpetaDecklistTorneo_(torneo) {
  const raiz = DriveApp.getFolderById(CARPETA_DECKLIST_ID);
  const it = raiz.getFoldersByName(torneo);
  return it.hasNext() ? it.next() : raiz.createFolder(torneo);
}

// Guarda la decklist en Drive y registra el envío en la hoja Decklists.
// Solo acepta cargas de: (a) un torneo con decklist_habilitado="sí" y
// (b) un Konami ID ya inscripto a ese torneo (columna konami_id de Inscripciones).
function guardarDecklist_(datos) {
  const konamiId = String(datos.konami_id || '').trim();
  const torneo = String(datos.torneo || '').trim();
  const nombre = String(datos.nombre || '').trim();
  const mime = String(datos.mime || '');
  const b64 = String(datos.archivo_b64 || '');

  if (nombre.length < 3 || !/^\d{10}$/.test(konamiId) || !torneo || !b64 || !MIMES_DECKLIST[mime]) {
    return json_({ ok: false, error: 'datos_invalidos' });
  }

  const t = filas_(HOJA_TORNEOS).rows.find(r => r.nombre === torneo);
  const habilitado = t && /^s[ií]$/i.test(String(t.decklist_habilitado || '').trim());
  if (!habilitado) {
    return json_({ ok: false, error: 'decklist_deshabilitado' });
  }

  const inscripto = filas_(HOJA_INSCRIPCIONES).rows.some(r => r.torneo === torneo && r.konami_id === konamiId);
  if (!inscripto) {
    return json_({ ok: false, error: 'no_inscripto' });
  }

  let bytes;
  try { bytes = Utilities.base64Decode(b64); }
  catch (err) { return json_({ ok: false, error: 'datos_invalidos' }); }

  const tope = mime === 'application/pdf' ? MAX_BYTES_DECKLIST_PDF : MAX_BYTES_DECKLIST_IMAGEN;
  if (bytes.length > tope) {
    return json_({ ok: false, error: 'archivo_grande' });
  }

  const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd-HHmm');
  const nombreArch = sanitizar_(nombre) + '__' + konamiId + '__' + fecha + '.' + MIMES_DECKLIST[mime];
  const blob = Utilities.newBlob(bytes, mime, nombreArch);
  const url = carpetaDecklistTorneo_(torneo).createFile(blob).getUrl();

  // Upsert por (torneo, konami_id): permite corregir un envío anterior sin
  // acumular filas duplicadas.
  const dl = filas_(HOJA_DECKLISTS);
  const fila = dl.rows.findIndex(r => r.torneo === torneo && r.konami_id === konamiId);
  const registro = [new Date(), torneo, celdaSegura_(nombre), "'" + konamiId, url];
  if (fila === -1) dl.sheet.appendRow(registro);
  else dl.sheet.getRange(fila + 2, 1, 1, registro.length).setValues([registro]);

  return json_({ ok: true, url: url });
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
    // Convención: estado debe ser exactamente "proximo"/"próximo" (la web filtra por igualdad exacta).
    if (e.parameter.action === 'counts') {
      const proximos = filas_(HOJA_TORNEOS).rows.filter(function (r) {
        const est = String(r.estado).toLowerCase();
        return est.indexOf('proximo') === 0 || est.indexOf('próximo') === 0;
      });
      const insc = filas_(HOJA_INSCRIPCIONES).rows;
      const counts = {};
      const cupos = {};
      proximos.forEach(function (t) {
        counts[t.nombre] = insc.filter(function (r) { return r.torneo === t.nombre; }).length;
        cupos[t.nombre] = Number(t.cupo_maximo);
      });
      return json_({ ok: true, counts: counts, cupos: cupos });
    }
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

    if (datos.action === 'comprobante') {
      return guardarComprobante_(datos);
    }
    if (datos.action === 'decklist') {
      return guardarDecklist_(datos);
    }

    const nombre = String(datos.nombre || '').trim();
    const konamiId = String(datos.konami_id || '').trim();
    const torneo = String(datos.torneo || '').trim();
    const comentario = String(datos.comentario || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 100);

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

    insc.sheet.appendRow([new Date(), torneo, celdaSegura_(nombre), "'" + konamiId, celdaSegura_(comentario)]);
    return json_({ ok: true, count: delTorneo.length + 1, cupo: Number(t.cupo_maximo) });
  } catch (err) {
    return json_({ ok: false, error: 'config_error' });
  } finally {
    lock.releaseLock();
  }
}
