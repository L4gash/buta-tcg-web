import { parseCsv } from './csv.js';
import { TORNEOS_CSV_URL, RESULTADOS_CSV_URL, RANKING_CSV_URL } from './config.js';

// ---- Datos de respaldo (se muestran si la planilla no está configurada o no responde) ----
export const FALLBACK_TORNEOS = [{
  nombre: 'YACS Córdoba',
  fecha: '2025-12-06',
  hora: '10:00',
  lugar: 'Córdoba, Argentina',
  formato: 'Avanzado TCG · suizo + top cut',
  reglas: 'Banlist TCG vigente',
  precio: '',
  premios: 'Premios para el top',
  cupo_maximo: '32',
  estado: 'finalizado',
  alias: '',
  decklist_habilitado: '',
}];

const foto = (f) => `assets/results/${f}`;
export const FALLBACK_RESULTADOS = [
  { torneo: 'YACS Córdoba 06/12', puesto: '1', nombre: 'Mariano Castro', deck: '—', foto: foto('mariano-castro-top-1.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '2', nombre: 'Juan Gordillo', deck: '—', foto: foto('juan-gordillo-top-2.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '3', nombre: 'Pedro Torres', deck: '—', foto: foto('pedro-torres-top-3.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '4', nombre: 'Juan Pablo Ynfantes', deck: '—', foto: foto('juan-pablo-ynfantes-top-4.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '5', nombre: 'Rodo', deck: '—', foto: foto('rodo-top-5.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '6', nombre: 'Ricardo Jara', deck: '—', foto: foto('ricardo-jara-top-6.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '7', nombre: 'Alexis Juncos', deck: '—', foto: foto('alexis-juncos-top-7.jpg') },
  { torneo: 'YACS Córdoba 06/12', puesto: '8', nombre: 'Enzo Alfonzo', deck: '—', foto: foto('enzo-alfonzo-top-8.jpg') },
];

// ---- Selectores puros ----
export function pickProximos(torneos) {
  return torneos.filter((t) => {
    const e = (t.estado ?? '').trim().toLowerCase();
    return e === 'proximo' || e === 'próximo';
  });
}

// Alias de compatibilidad: módulos v1 cacheados por el navegador durante la ventana
// del deploy todavía importan pickProximo (singular). No usar en código nuevo.
export const pickProximo = (torneos) => pickProximos(torneos)[0] ?? null;

// Torneos con la carga de decklist habilitada por el organizador (columna
// decklist_habilitado = "si"/"sí" en la planilla, cualquier capitalización).
export function pickHabilitadosDecklist(torneos) {
  return torneos.filter((t) => /^s[ií]$/i.test((t.decklist_habilitado ?? '').trim()));
}

// El orden de los grupos sigue el orden de las filas del CSV: cargar los torneos de más viejo a más nuevo.
export function groupResultados(rows) {
  const out = {};
  for (const r of rows) (out[r.torneo] ??= []).push(r);
  for (const k of Object.keys(out)) out[k].sort((a, b) => Number(a.puesto) - Number(b.puesto));
  return out;
}

// ---- Carga remota con fallback ----
async function fetchCsv(url, fallback) {
  if (!url) return fallback;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return fallback;
    const rows = parseCsv(await res.text());
    return rows.length ? rows : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

export const loadTorneos = () => fetchCsv(TORNEOS_CSV_URL, FALLBACK_TORNEOS);
export const loadResultados = () => fetchCsv(RESULTADOS_CSV_URL, FALLBACK_RESULTADOS);

// ---- Ranking de liga (2º planilla) ----
export const FALLBACK_RANKING = [
  { Pos: '1', Jugador: 'Juanny Gordillo', 'Torneos Jugados': '3', 'PL Totales': '46', 'Ultima fecha': 'domingo 14/6' },
  { Pos: '2', Jugador: 'Alex Herrera', 'Torneos Jugados': '3', 'PL Totales': '43', 'Ultima fecha': 'domingo 14/6' },
  { Pos: '3', Jugador: 'Mariano Castro', 'Torneos Jugados': '3', 'PL Totales': '38', 'Ultima fecha': 'domingo 14/6' },
  { Pos: '4', Jugador: 'Gaston Gimenez', 'Torneos Jugados': '2', 'PL Totales': '36', 'Ultima fecha': 'sábado 13/6' },
  { Pos: '5', Jugador: 'Charly Ramallo', 'Torneos Jugados': '3', 'PL Totales': '31', 'Ultima fecha': 'domingo 14/6' },
];

// Descarta filas de relleno (sin nombre de jugador).
export const filtrarRanking = (rows) => rows.filter((r) => String(r?.Jugador ?? '').trim() !== '');

export const loadRanking = () => fetchCsv(RANKING_CSV_URL, FALLBACK_RANKING);

// ---- Utilidad de render ----
// Escapa texto antes de interpolarlo en innerHTML (los datos vienen de la planilla de BUTA,
// pero escapar evita sorpresas si alguna celda trae HTML).
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ¿La fila de resultado tiene foto cargada?
export const tieneFoto = (r) => String(r?.foto ?? '').trim() !== '';

// ¿Mostrar la línea de deck? (vacío o "—" => no)
export const deckVisible = (deck) => {
  const d = String(deck ?? '').trim();
  return d !== '' && d !== '—';
};

// Firma del sitio (visible en la consola del navegador)
if (typeof window !== 'undefined') {
  console.log(
    '%c🐗 BUTA TCG',
    'color:#5b8cff;font-weight:bold;font-size:14px',
    '— sitio original. ¿Sos dev? Escribinos: instagram.com/butatcg'
  );
}
