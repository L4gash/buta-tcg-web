// BUTA TCG — backend de inscripciones.
// Script VINCULADO a la planilla (Extensiones > Apps Script). Ver docs/setup-google-sheets.md
// doPost: inscribe {torneo, nombre, konami_id}. doGet: ?action=count&torneo=X devuelve el conteo.

// NOTA: el cliente web envía Content-Type text/plain a propósito — evita el preflight
// CORS que Apps Script no soporta. No cambiar a application/json.

const HOJA_TORNEOS = 'Torneos';
const HOJA_INSCRIPCIONES = 'Inscripciones';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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

    insc.sheet.appendRow([new Date(), torneo, nombre, "'" + konamiId, comentario]);
    return json_({ ok: true, count: delTorneo.length + 1, cupo: Number(t.cupo_maximo) });
  } catch (err) {
    return json_({ ok: false, error: 'config_error' });
  } finally {
    lock.releaseLock();
  }
}
