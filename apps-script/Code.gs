// BUTA TCG — backend de inscripciones.
// Script VINCULADO a la planilla (Extensiones > Apps Script). Ver docs/setup-google-sheets.md
// doPost: inscribe {torneo, nombre, konami_id}. doGet: ?action=count&torneo=X devuelve el conteo.

const HOJA_TORNEOS = 'Torneos';
const HOJA_INSCRIPCIONES = 'Inscripciones';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function filas_(nombreHoja) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  const values = sheet.getDataRange().getValues();
  const header = values[0].map(String);
  return { sheet, header, rows: values.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, String(r[i])]))) };
}

function contar_(torneo) {
  return filas_(HOJA_INSCRIPCIONES).rows.filter(r => r.torneo === torneo).length;
}

function doGet(e) {
  if (e.parameter.action === 'count') {
    const torneo = e.parameter.torneo || '';
    const t = filas_(HOJA_TORNEOS).rows.find(r => r.nombre === torneo);
    return json_({ ok: true, count: contar_(torneo), cupo: t ? Number(t.cupo_maximo) : null });
  }
  return json_({ ok: false, error: 'accion_invalida' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let datos;
    try { datos = JSON.parse(e.postData.contents); }
    catch (err) { return json_({ ok: false, error: 'datos_invalidos' }); }

    const nombre = String(datos.nombre || '').trim();
    const konamiId = String(datos.konami_id || '').trim();
    const torneo = String(datos.torneo || '').trim();

    if (nombre.length < 3 || !/^\d{10}$/.test(konamiId) || !torneo) {
      return json_({ ok: false, error: 'datos_invalidos' });
    }

    const estadoLower = (function () {
      const t = filas_(HOJA_TORNEOS).rows.find(r => r.nombre === torneo);
      return t ? { t: t, estado: String(t.estado).toLowerCase() } : null;
    })();
    if (!estadoLower || (estadoLower.estado.indexOf('proximo') !== 0 && estadoLower.estado.indexOf('próximo') !== 0)) {
      return json_({ ok: false, error: 'torneo_invalido' });
    }
    const t = estadoLower.t;

    const insc = filas_(HOJA_INSCRIPCIONES);
    const delTorneo = insc.rows.filter(r => r.torneo === torneo);
    if (delTorneo.some(r => r.konami_id === konamiId)) {
      return json_({ ok: false, error: 'duplicado' });
    }
    if (delTorneo.length >= Number(t.cupo_maximo)) {
      return json_({ ok: false, error: 'lleno' });
    }

    insc.sheet.appendRow([new Date(), torneo, nombre, "'" + konamiId]);
    return json_({ ok: true, count: delTorneo.length + 1, cupo: Number(t.cupo_maximo) });
  } finally {
    lock.releaseLock();
  }
}
