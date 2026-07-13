// Suscripción a avisos de nueva fecha: guarda el email en la hoja Avisos de
// la planilla (acción 'aviso' del Apps Script). El envío de los mails lo hace
// un disparador horario del lado del script — acá solo se anota la dirección.
import { validarEmail } from './validation.js';
import { APPS_SCRIPT_URL } from './config.js';

const MENSAJES = {
  ok: '✓ ¡Listo! Te avisamos cuando se anuncie una fecha nueva.',
  ya_estaba: '✓ Ese email ya estaba en la lista — te vamos a avisar igual.',
  datos_invalidos: 'Revisá el email: tiene que ser tipo tu@email.com.',
  red: 'Error de conexión. Esperá unos segundos e intentá de nuevo.',
};

const $ = (id) => document.getElementById(id);

function mostrarMensaje(tipo) {
  const el = $('mensaje-avisos');
  el.textContent = MENSAJES[tipo] ?? MENSAJES.red;
  el.className = `mx-auto mt-3 max-w-md rounded-lg px-4 py-3 font-body text-sm ${tipo === 'ok' || tipo === 'ya_estaba'
    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
    : 'bg-red-950/80 text-red-300 border border-red-700/50'}`;
  el.classList.remove('hidden');
}

if (typeof document !== 'undefined') {
  const seccion = $('seccion-avisos');
  if (seccion && APPS_SCRIPT_URL) {
    seccion.hidden = false;

    // Si este navegador ya se anotó, lo recordamos para pre-llenar.
    const guardado = localStorage.getItem('buta_aviso_email') ?? '';
    if (guardado) $('aviso-email').value = guardado;

    $('form-avisos').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = $('aviso-email').value.trim();
      const esValido = validarEmail(email);
      document.querySelector('[data-error-for="aviso-email"]').classList.toggle('hidden', esValido);
      $('aviso-email').setAttribute('aria-invalid', esValido ? 'false' : 'true');
      if (!esValido) return;

      const btn = $('btn-avisar');
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'aviso', email }),
        });
        const data = await res.json();
        if (data.ok) {
          localStorage.setItem('buta_aviso_email', email);
          mostrarMensaje(data.ya_estaba ? 'ya_estaba' : 'ok');
        } else {
          mostrarMensaje(data.error);
        }
      } catch {
        mostrarMensaje('red');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Avisame';
      }
    });
  }
}
