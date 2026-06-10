import { loadTorneos, pickProximo, esc } from './data.js';
import { validarNombre, validarKonamiId } from './validation.js';
import { APPS_SCRIPT_URL, INSTAGRAM_URL } from './config.js';

const MENSAJES = {
  ok: '✓ ¡Inscripción confirmada! Nos vemos en el torneo.',
  duplicado: 'Este Konami ID ya está inscripto en el torneo.',
  lleno: 'El cupo está lleno. Escribinos por Instagram por lista de espera.',
  datos_invalidos: 'Revisá los datos: nombre completo y Konami ID de 10 números.',
  torneo_invalido: 'La inscripción a este torneo no está abierta.',
  red: 'Error de conexión. Esperá unos segundos e intentá de nuevo.',
};

const $ = (id) => document.getElementById(id);
const fmtFecha = (iso) => {
  const [y, m, d] = (iso ?? '').split('-').map(Number);
  if (!y) return iso ?? '';
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

function renderFicha(t, count) {
  const cupo = Number(t.cupo_maximo) || 0;
  const tieneConteo = typeof count === 'number';
  const pct = tieneConteo && cupo ? Math.min(100, Math.round((count / cupo) * 100)) : 0;
  $('ficha-torneo').innerHTML = `
    <div class="rounded-2xl border border-primario/40 bg-tinta/70 p-6 shadow-glow-azul sm:p-8">
      <h2 class="font-display text-2xl font-bold italic text-white">${esc(t.nombre)}</h2>
      <dl class="mt-5 grid gap-4 font-body text-humo sm:grid-cols-2">
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">📅 Fecha y hora</dt><dd class="mt-1 text-white">${fmtFecha(t.fecha)} · ${esc(t.hora)} hs</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">📍 Lugar</dt><dd class="mt-1 text-white">${esc(t.lugar)}</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">🃏 Formato y reglas</dt><dd class="mt-1 text-white">${esc(t.formato)}<br />${esc(t.reglas)}</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">💰 Precio · 🏆 Premios</dt><dd class="mt-1 text-white">${esc(t.precio || 'A confirmar')}<br />${esc(t.premios)}</dd></div>
      </dl>
      <div class="mt-6">
        <div class="flex justify-between font-body text-sm text-humo">
          <span>👥 Cupos</span>
          <span id="texto-cupos" class="font-semibold text-white">${tieneConteo ? `${count} / ${cupo} anotados` : `${cupo} lugares`}</span>
        </div>
        <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-noche"><div class="h-full rounded-full bg-gradient-to-r from-primario to-violeta" style="width:${pct}%"></div></div>
      </div>
    </div>`;
}

function renderSinTorneo() {
  $('ficha-torneo').innerHTML = `
    <div class="rounded-2xl border border-borde bg-tinta/70 p-8 text-center shadow-card">
      <p class="font-display text-xl font-bold italic text-white">Próximamente nuevo torneo</p>
      <p class="mt-3 font-body leading-[1.7] text-humo">Estamos preparando la próxima fecha. Seguinos en
        <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" class="text-primario-glow underline hover:opacity-80">Instagram</a> para enterarte antes que nadie.</p>
    </div>`;
  $('seccion-inscripcion').hidden = true;
}

function mostrarMensaje(tipo) {
  const el = $('mensaje-resultado');
  el.textContent = MENSAJES[tipo] ?? MENSAJES.red;
  el.className = `rounded-lg px-4 py-3 font-body text-sm ${tipo === 'ok'
    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
    : 'bg-red-950/80 text-red-300 border border-red-700/50'}`;
  el.classList.remove('hidden');
}

async function consultarCupos(torneo) {
  if (!APPS_SCRIPT_URL) return null;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=count&torneo=${encodeURIComponent(torneo)}`);
    const data = await res.json();
    return data.ok ? data.count : null;
  } catch { return null; }
}

const torneos = await loadTorneos();
const prox = pickProximo(torneos);

if (!prox) {
  renderSinTorneo();
} else {
  renderFicha(prox, null);
  consultarCupos(prox.nombre).then((c) => { if (typeof c === 'number') renderFicha(prox, c); });

  if (!APPS_SCRIPT_URL) {
    $('form-inscripcion').innerHTML = `<p class="font-body leading-[1.7] text-humo">La inscripción online estará disponible muy pronto.
      Mientras tanto, anotate por <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" class="text-primario-glow underline hover:opacity-80">Instagram</a>.</p>`;
  } else {
    $('form-inscripcion').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const nombre = $('nombre').value;
      const konamiId = $('konami-id').value.trim();
      let valido = true;
      for (const [id, ok] of [['nombre', validarNombre(nombre)], ['konami-id', validarKonamiId(konamiId)]]) {
        document.querySelector(`[data-error-for="${id}"]`).classList.toggle('hidden', ok);
        if (!ok) valido = false;
      }
      if (!valido) return;

      const btn = $('btn-inscribir');
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ torneo: prox.nombre, nombre: nombre.trim(), konami_id: konamiId }),
        });
        const data = await res.json();
        if (data.ok) {
          mostrarMensaje('ok');
          $('form-inscripcion').reset();
          renderFicha(prox, data.count);
        } else {
          mostrarMensaje(data.error);
        }
      } catch {
        mostrarMensaje('red');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar inscripción';
      }
    });
  }
}
