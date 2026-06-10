import { loadTorneos, pickProximos, esc } from './data.js';
import { validarNombre, validarKonamiId, validarComentario } from './validation.js';
import { APPS_SCRIPT_URL, INSTAGRAM_URL } from './config.js';

const MENSAJES = {
  ok: '✓ ¡Inscripción confirmada! Nos vemos en el torneo.',
  duplicado: 'Este Konami ID ya está inscripto en ese torneo.',
  lleno: 'El cupo de ese torneo está lleno. Escribinos por Instagram por lista de espera.',
  datos_invalidos: 'Revisá los datos: nombre completo y Konami ID de 10 números.',
  torneo_invalido: 'La inscripción a ese torneo no está abierta.',
  red: 'Error de conexión. Esperá unos segundos e intentá de nuevo.',
};

const $ = (id) => document.getElementById(id);
const fmtFecha = (iso) => {
  const [y, m, d] = (iso ?? '').split('-').map(Number);
  if (!y) return iso ?? '';
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

let proximos = [];
let conteos = {}; // nombre torneo -> inscriptos (number) cuando se conoce

const estaLleno = (t) => {
  const cupo = Number(t.cupo_maximo) || 0;
  return typeof conteos[t.nombre] === 'number' && cupo > 0 && conteos[t.nombre] >= cupo;
};

function tarjetaTorneo(t) {
  const cupo = Number(t.cupo_maximo) || 0;
  const count = conteos[t.nombre];
  const tieneConteo = typeof count === 'number';
  const pct = tieneConteo && cupo ? Math.min(100, Math.round((count / cupo) * 100)) : 0;
  const lleno = estaLleno(t);
  const alias = (t.alias ?? '').trim();
  const puedeCopiar = !!navigator.clipboard;
  return `
    <article class="flex flex-col rounded-2xl border ${lleno ? 'border-borde' : 'border-primario/40'} bg-tinta/70 p-6 ${lleno ? 'shadow-card' : 'shadow-glow-azul'}">
      <h3 class="font-display text-xl font-bold italic text-white">${esc(t.nombre)}</h3>
      <dl class="mt-4 grid gap-3 font-body text-sm text-humo">
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">📅 Fecha y hora</dt><dd class="mt-0.5 text-white">${esc(fmtFecha(t.fecha))} · ${esc(t.hora)} hs</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">📍 Lugar</dt><dd class="mt-0.5 text-white">${esc(t.lugar)}</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">🃏 Formato y reglas</dt><dd class="mt-0.5 text-white">${esc(t.formato)}<br />${esc(t.reglas)}</dd></div>
        <div><dt class="text-xs font-semibold uppercase tracking-widest text-humo/70">💰 Precio · 🏆 Premios</dt><dd class="mt-0.5 text-white">${esc(t.precio || 'A confirmar')}<br />${esc(t.premios)}</dd></div>
      </dl>
      ${alias ? `
      <div class="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-borde bg-noche/60 px-3 py-2 font-body text-sm text-humo">
        <span>💳 Transferencias: <strong class="text-white">${esc(alias)}</strong></span>
        ${puedeCopiar ? `<button type="button" class="btn-copiar-alias rounded-full border border-primario/50 px-3 py-1 text-xs font-semibold text-primario-glow hover:bg-primario/10" data-alias="${esc(alias)}">Copiar</button>` : ''}
      </div>` : ''}
      <div class="mt-4">
        <div class="flex justify-between font-body text-sm text-humo">
          <span>👥 Cupos</span>
          <span class="font-semibold text-white" data-cupos-de="${esc(t.nombre)}">${tieneConteo ? `${count} / ${cupo} anotados` : `${cupo} lugares`}</span>
        </div>
        <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-noche"><div class="h-full rounded-full bg-gradient-to-r from-primario to-violeta" style="width:${pct}%"></div></div>
      </div>
      <button type="button" class="btn-elegir-torneo mt-5 rounded-full ${lleno ? 'cursor-not-allowed border border-borde text-humo/60' : 'bg-gradient-to-r from-primario to-violeta text-white shadow-glow-azul hover:opacity-90'} px-6 py-2.5 font-display font-semibold italic" data-torneo="${esc(t.nombre)}" ${lleno ? 'disabled' : ''}>
        ${lleno ? 'Cupo lleno' : 'Inscribirme ↓'}
      </button>
    </article>`;
}

function renderTorneos() {
  const el = $('lista-torneos');
  // Ajustamos la clase de columnas al número real de torneos para evitar
  // columnas vacías cuando hay menos de 3 (e.g. 2 en lg queda lopsided).
  const cols = proximos.length >= 3 ? 'grid gap-5 md:grid-cols-2 lg:grid-cols-3'
    : proximos.length === 2 ? 'grid gap-5 md:grid-cols-2'
    : 'grid gap-5';
  el.className = cols;
  el.innerHTML = proximos.map(tarjetaTorneo).join('');
}

function renderSelector() {
  const sel = $('torneo-select');
  const previo = sel.value;
  sel.innerHTML = proximos.map((t) => {
    const lleno = estaLleno(t);
    return `<option value="${esc(t.nombre)}" ${lleno ? 'disabled' : ''}>${esc(t.nombre)}${lleno ? ' — Cupo lleno' : ''}</option>`;
  }).join('');
  const previoValido = proximos.some((t) => t.nombre === previo && !estaLleno(t));
  if (previoValido) sel.value = previo;
  else {
    const libre = proximos.find((t) => !estaLleno(t));
    if (libre) sel.value = libre.nombre;
  }

  const todasLlenas = proximos.every(estaLleno);
  const btn = $('btn-inscribir');
  if (btn) {
    btn.disabled = todasLlenas;
    btn.textContent = todasLlenas ? 'Cupos completos' : 'Confirmar inscripción';
  }
}

function renderSinTorneos() {
  $('lista-torneos').innerHTML = `
    <div class="rounded-2xl border border-borde bg-tinta/70 p-8 text-center shadow-card md:col-span-2 lg:col-span-3">
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

async function consultarConteos() {
  if (!APPS_SCRIPT_URL) return null;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=counts`);
    const data = await res.json();
    return data.ok && data.counts ? data.counts : null;
  } catch { return null; }
}

// Copiar alias (delegado: las tarjetas se re-renderizan)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-copiar-alias');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.alias);
    const original = btn.textContent;
    btn.textContent = '✓ Copiado';
    setTimeout(() => { btn.textContent = original; }, 2000);
  } catch { /* sin permiso de portapapeles: no hacemos nada */ }
});

// Elegir torneo desde una tarjeta (delegado)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-elegir-torneo');
  if (!btn || btn.disabled) return;
  $('torneo-select').value = btn.dataset.torneo;
  $('seccion-inscripcion').scrollIntoView({ behavior: 'smooth' });
});

const torneos = await loadTorneos();
proximos = pickProximos(torneos);

if (!proximos.length) {
  renderSinTorneos();
} else {
  renderTorneos();
  renderSelector();

  let inscripcionConfirmada = false;
  consultarConteos().then((c) => {
    if (c && !inscripcionConfirmada) {
      conteos = c;
      renderTorneos();
      renderSelector();
    }
  });

  if (!APPS_SCRIPT_URL) {
    $('form-inscripcion').innerHTML = `<p class="font-body leading-[1.7] text-humo">La inscripción online estará disponible muy pronto.
      Mientras tanto, anotate por <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" class="text-primario-glow underline hover:opacity-80">Instagram</a>.</p>`;
  } else {
    $('comentario').addEventListener('input', (e) => {
      $('contador-comentario').textContent = `${e.target.value.length}/100`;
    });
    $('konami-id').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });

    $('form-inscripcion').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const torneo = $('torneo-select').value;
      const nombre = $('nombre').value;
      const konamiId = $('konami-id').value.trim();
      const comentario = $('comentario').value.replace(/[\r\n]+/g, ' ').trim().slice(0, 100);
      let valido = true;
      for (const [id, ok] of [['nombre', validarNombre(nombre)], ['konami-id', validarKonamiId(konamiId)]]) {
        document.querySelector(`[data-error-for="${id}"]`).classList.toggle('hidden', ok);
        $(id).setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) valido = false;
      }
      if (!validarComentario(comentario)) valido = false; // inalcanzable con maxlength, defensa extra
      if (!valido || !torneo) return;

      const btn = $('btn-inscribir');
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ torneo, nombre: nombre.trim(), konami_id: konamiId, comentario }),
        });
        const data = await res.json();
        if (data.ok) {
          inscripcionConfirmada = true;
          conteos[torneo] = data.count;
          mostrarMensaje('ok');
          $('form-inscripcion').reset();
          $('contador-comentario').textContent = '0/100';
          renderTorneos();
          renderSelector();
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
