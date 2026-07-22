// BUTA TCG — backend de inscripciones.
// Script VINCULADO a la planilla (Extensiones > Apps Script). Ver docs/setup-google-sheets.md
// doPost: inscribe {torneo, nombre, konami_id, comentario?} · sube comprobante {action:'comprobante', torneo, konami_id, nombre, imagen_b64, mime}
//         · sube decklist {action:'decklist', torneo, nombre, konami_id, archivo_b64, mime} · anota email {action:'aviso', email}.
// doGet: ?action=count&torneo=X (conteo de uno) · ?action=counts (conteos y cupos de todos los próximos)
//        · ?action=baja&email=X&token=Y (baja de los avisos, link firmado que va en cada mail).
// avisarNuevasFechas: corre solo cada 1 hora (disparador que instala instalarAvisos) y manda
//   el aviso por email cuando aparece un torneo 'proximo' sin marcar en la columna aviso_enviado.

// NOTA: el cliente web envía Content-Type text/plain a propósito — evita el preflight
// CORS que Apps Script no soporta. No cambiar a application/json.

const HOJA_TORNEOS = 'Torneos';
const HOJA_INSCRIPCIONES = 'Inscripciones';
const HOJA_DECKLISTS = 'Decklists';
const HOJA_AVISOS = 'Avisos';
const HOJA_OMEGA = 'Omega';
const OMEGA_API = 'https://duelistsunite.org/omega-web/v3/profile?id=';
const URL_TORNEOS_WEB = 'https://l4gash.github.io/buta-tcg-web/torneos.html';
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

// ---- Avisos de nueva fecha ----

// Secreto para firmar los links de baja. Se genera solo la primera vez y
// queda en las propiedades del script (no viaja en el código ni en la planilla).
function secreto_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('AVISOS_SECRETO');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('AVISOS_SECRETO', s);
  }
  return s;
}

// Firma corta del email: nadie puede dar de baja a otro sin conocer el secreto.
function tokenDe_(email) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email + secreto_());
  return bytes.slice(0, 6).map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

// Anota un email en la hoja Avisos (deduplicado, en minúsculas).
function guardarAviso_(datos) {
  const email = String(datos.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json_({ ok: false, error: 'datos_invalidos' });
  }
  const avisos = filas_(HOJA_AVISOS);
  const yaEstaba = avisos.rows.some(r => String(r.email || '').trim().toLowerCase() === email);
  if (!yaEstaba) avisos.sheet.appendRow([new Date(), email]);
  return json_({ ok: true, ya_estaba: yaEstaba });
}

// Da de baja un email si el token del link coincide. Devuelve una paginita
// HTML (el jugador llega acá clickeando el link del mail, no desde la web).
function darDeBaja_(p) {
  const email = String(p.email || '').trim().toLowerCase();
  const token = String(p.token || '');
  const pagina = (titulo, texto) => HtmlService.createHtmlOutput(
    '<body style="font-family:sans-serif;background:#05060f;color:#fff;display:grid;place-items:center;min-height:90vh;text-align:center">' +
    '<div><h2>' + titulo + '</h2><p style="color:#8b93b8">' + texto + '</p></div></body>');
  if (!email || tokenDe_(email) !== token) {
    return pagina('Link inválido', 'El link de baja no es válido o está incompleto.');
  }
  const avisos = filas_(HOJA_AVISOS);
  for (let i = avisos.rows.length - 1; i >= 0; i--) {
    if (String(avisos.rows[i].email || '').trim().toLowerCase() === email) {
      avisos.sheet.deleteRow(i + 2); // +2: la fila 1 es el encabezado
    }
  }
  return pagina('Listo 🐗', 'No te mandamos más avisos. Si te arrepentís, anotate de nuevo en la web.');
}

// Corre cada 1 hora (disparador de instalarAvisos): busca torneos 'proximo'
// sin marcar en la columna aviso_enviado y manda UN email por suscriptor
// listando todas las fechas nuevas juntas (cuida la cuota diaria de Gmail).
function avisarNuevasFechas() {
  const t = filas_(HOJA_TORNEOS);
  const col = t.header.indexOf('aviso_enviado');
  if (col === -1) return; // columna no configurada: no hacemos nada

  const pendientes = [];
  t.rows.forEach(function (r, i) {
    const est = String(r.estado).toLowerCase();
    const esProximo = est.indexOf('proximo') === 0 || est.indexOf('próximo') === 0;
    if (esProximo && !String(r.aviso_enviado || '').trim()) pendientes.push({ fila: i + 2, torneo: r });
  });
  if (!pendientes.length) return;

  const subs = filas_(HOJA_AVISOS).rows
    .map(r => String(r.email || '').trim().toLowerCase())
    .filter(Boolean);

  // Si no alcanza la cuota de hoy, no marcamos nada: se reintenta en la próxima corrida.
  if (subs.length && MailApp.getRemainingDailyQuota() < subs.length) return;

  const lineas = pendientes.map(function (p) {
    const tt = p.torneo;
    return '• ' + tt.nombre + '\n  ' + tt.fecha + ' · ' + tt.hora + ' hs · ' + tt.lugar +
      (String(tt.precio || '').trim() ? '\n  Precio: ' + tt.precio : '');
  }).join('\n\n');

  const asunto = pendientes.length === 1
    ? '🐗 Nueva fecha de BUTA TCG: ' + pendientes[0].torneo.nombre
    : '🐗 ' + pendientes.length + ' fechas nuevas de BUTA TCG';
  const urlScript = ScriptApp.getService().getUrl();

  subs.forEach(function (email) {
    const baja = urlScript + '?action=baja&email=' + encodeURIComponent(email) + '&token=' + tokenDe_(email);
    const cuerpo = '¡Se viene torneo!\n\n' + lineas +
      '\n\nInscribite en: ' + URL_TORNEOS_WEB +
      '\n\n—\nBUTA TCG · Córdoba, Argentina\nPara dejar de recibir estos avisos: ' + baja;
    try { MailApp.sendEmail(email, asunto, cuerpo); }
    catch (err) { /* dirección rebotada/inválida: seguimos con el resto */ }
  });

  const marca = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  pendientes.forEach(function (p) { t.sheet.getRange(p.fila, col + 1).setValue(marca); });
}

// Ejecutá esta función UNA vez desde el editor (como autorizarDrive) para
// instalar el disparador horario y autorizar el permiso de envío de mails.
// Es idempotente: si ya había un disparador, lo reemplaza.
function instalarAvisos() {
  secreto_();
  ScriptApp.getProjectTriggers()
    .filter(tr => tr.getHandlerFunction() === 'avisarNuevasFechas')
    .forEach(tr => ScriptApp.deleteTrigger(tr));
  ScriptApp.newTrigger('avisarNuevasFechas').timeBased().everyHours(1).create();
  Logger.log('Listo: cada 1 hora se revisa si hay fechas nuevas para avisar. Quedan ' +
    MailApp.getRemainingDailyQuota() + ' mails de cuota hoy.');
}

// ---- Leaderboard de Omega (Duelists Unite) ----
// Recorre la hoja "Omega": por cada fila con un link de perfil, saca el Discord ID,
// pega a la API pública de Omega (server-side, sin CORS) y escribe rating/W/L/estado.
// El admin solo carga la columna `link` (y opcional `nombre_buta`); el resto lo llena esto.
function refrescarOmega() {
  const om = filas_(HOJA_OMEGA);
  const cols = ['link', 'id', 'nombre', 'rating', 'wins', 'loses', 'draws', 'lastlogin', 'actualizado', 'estado'];
  const idx = {};
  cols.forEach(function (c) { idx[c] = om.header.indexOf(c); });
  if (idx.link === -1) return; // hoja sin la columna link: no hacemos nada

  om.rows.forEach(function (r, i) {
    const fila = i + 2; // +2: la fila 1 es el encabezado
    const set = function (col, val) { if (idx[col] !== -1) om.sheet.getRange(fila, idx[col] + 1).setValue(val); };
    const link = String(r.link || '').trim();
    if (!link) return;
    const m = link.match(/profile\/(\d+)/) || link.match(/(\d{15,})/);
    if (!m) { set('estado', 'link inválido'); return; }
    const id = m[1];
    try {
      const res = UrlFetchApp.fetch(OMEGA_API + encodeURIComponent(id), { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) { set('estado', 'http ' + res.getResponseCode()); return; }
      const payload = JSON.parse(res.getContentText());
      const data = payload && payload.data;
      if (!data || data.success === false) { set('estado', 'sin datos'); return; }
      set('id', "'" + id); // apóstrofe: Sheets guarda el ID largo como texto, no como número
      set('nombre', celdaSegura_(String(data.displayname || data.username || '')));
      set('rating', Math.round(Number(data.tcgrating) || 0));
      set('wins', Number(data.tcgwins) || 0);
      set('loses', Number(data.tcgloses) || 0);
      set('draws', Number(data.tcgdraws) || 0);
      set('lastlogin', String(data.lastlogin || ''));
      set('actualizado', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));
      set('estado', 'ok');
    } catch (err) {
      set('estado', 'error');
    }
  });
}

// Ejecutá esta función UNA vez desde el editor (como instalarAvisos) para instalar
// el disparador que refresca Omega cada 12 h y correrlo una vez ahora. Idempotente.
function instalarOmega() {
  ScriptApp.getProjectTriggers()
    .filter(function (tr) { return tr.getHandlerFunction() === 'refrescarOmega'; })
    .forEach(function (tr) { ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger('refrescarOmega').timeBased().everyHours(12).create();
  refrescarOmega();
  Logger.log('Omega: refresco instalado (cada 12 h) y ejecutado una vez.');
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
    if (e.parameter.action === 'baja') {
      return darDeBaja_(e.parameter);
    }
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
    if (datos.action === 'aviso') {
      return guardarAviso_(datos);
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
