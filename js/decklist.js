// Carga de decklist para torneos importantes (habilitados por el organizador
// con decklist_habilitado="sí" en la planilla). Solo participantes ya
// inscriptos pueden cargar: el backend valida torneo + Konami ID contra
// Inscripciones antes de guardar el archivo en Drive.
import { loadTorneos, pickHabilitadosDecklist, esc } from './data.js';
import { validarNombre, validarKonamiId } from './validation.js';
import { validarArchivoDecklist } from './decklist-validacion.js';
import { comprimirImagen, blobABase64 } from './imagen.js';
import { leerPerfilGuardado } from './perfil.js';
import { APPS_SCRIPT_URL } from './config.js';

const MENSAJES = {
  ok: '✓ ¡Decklist recibida! Gracias por cargarla.',
  datos_invalidos: 'Revisá los datos: nombre completo y Konami ID de 10 números.',
  decklist_deshabilitado: 'Ese torneo no tiene la carga de decklist habilitada.',
  no_inscripto: 'No encontramos tu inscripción a ese torneo con ese Konami ID. Inscribite primero, o revisá que el ID sea el mismo.',
  archivo_invalido: 'El archivo tiene que ser una imagen (jpg/png/webp) o un PDF.',
  archivo_grande: 'El archivo es demasiado pesado.',
  red: 'Error de conexión. Esperá unos segundos e intentá de nuevo.',
};

const $ = (id) => document.getElementById(id);

function mostrarMensaje(tipo) {
  const el = $('mensaje-decklist');
  el.textContent = MENSAJES[tipo] ?? MENSAJES.red;
  el.className = `rounded-lg px-4 py-3 font-body text-sm ${tipo === 'ok'
    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
    : 'bg-red-950/80 text-red-300 border border-red-700/50'}`;
  el.classList.remove('hidden');
}

if (typeof document !== 'undefined') {
  const seccion = $('seccion-decklist');
  if (seccion) {
    const torneos = await loadTorneos();
    const habilitados = APPS_SCRIPT_URL ? pickHabilitadosDecklist(torneos) : [];

    if (!habilitados.length) {
      seccion.hidden = true;
    } else {
      seccion.hidden = false;
      $('decklist-torneo-select').innerHTML = habilitados.map((t) => `<option value="${esc(t.nombre)}">${esc(t.nombre)}</option>`).join('');

      const perfil = leerPerfilGuardado(localStorage.getItem('buta_jugador'));
      if (perfil) {
        $('decklist-nombre').value = perfil.nombre;
        $('decklist-konami-id').value = perfil.konami_id;
      }
      $('decklist-konami-id').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });

      let archivoListo = null; // { b64, mime } tras procesar, o null
      let token = 0;

      $('decklist-archivo').addEventListener('change', async (e) => {
        const miToken = ++token;
        const file = e.target.files[0] ?? null;
        const err = $('decklist-archivo-error');
        const v = validarArchivoDecklist(file);
        if (!v.ok) {
          err.textContent = v.motivo === 'tipo' ? 'El archivo tiene que ser una imagen (jpg/png/webp) o un PDF.'
            : v.motivo === 'tamano' ? 'El archivo es demasiado pesado.'
            : 'Elegí un archivo.';
          err.classList.remove('hidden');
          $('decklist-archivo').setAttribute('aria-invalid', 'true');
          archivoListo = null;
          return;
        }
        err.classList.add('hidden');
        $('decklist-archivo').setAttribute('aria-invalid', 'false');
        try {
          archivoListo = v.tipo === 'imagen'
            ? await comprimirImagen(file)
            : { b64: await blobABase64(file), mime: 'application/pdf' };
          if (miToken !== token) return; // una selección más nueva la reemplazó
        } catch {
          err.textContent = 'No se pudo procesar el archivo. Probá con otro.';
          err.classList.remove('hidden');
          archivoListo = null;
        }
      });

      $('form-decklist').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const torneo = $('decklist-torneo-select').value;
        const nombre = $('decklist-nombre').value;
        const konamiId = $('decklist-konami-id').value.trim();

        let valido = true;
        for (const [id, ok] of [['decklist-nombre', validarNombre(nombre)], ['decklist-konami-id', validarKonamiId(konamiId)]]) {
          document.querySelector(`[data-error-for="${id}"]`).classList.toggle('hidden', ok);
          $(id).setAttribute('aria-invalid', ok ? 'false' : 'true');
          if (!ok) valido = false;
        }
        const errArchivo = $('decklist-archivo-error');
        if (!archivoListo) {
          errArchivo.textContent = 'Elegí un archivo (imagen o PDF).';
          errArchivo.classList.remove('hidden');
          valido = false;
        }
        if (!valido || !torneo) return;

        const btn = $('btn-subir-decklist');
        btn.disabled = true;
        btn.textContent = 'Enviando…';
        try {
          const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'decklist',
              torneo,
              nombre: nombre.trim(),
              konami_id: konamiId,
              archivo_b64: archivoListo.b64,
              mime: archivoListo.mime,
            }),
          });
          const data = await res.json();
          if (data.ok) {
            mostrarMensaje('ok');
            $('form-decklist').reset();
            archivoListo = null;
          } else {
            mostrarMensaje(data.error);
          }
        } catch {
          mostrarMensaje('red');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Subir decklist';
        }
      });
    }
  }
}
