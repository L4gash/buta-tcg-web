// Cuenta regresiva y link "Agregar al calendario" para los torneos. Funciones
// puras (sin DOM): las páginas las importan y los tests las ejecutan en Node.

const DIA_MS = 24 * 60 * 60 * 1000;
const DURACION_HS = 6; // duración estimada de una fecha (suizo + top cut)
const TIMEZONE = 'America/Argentina/Cordoba';

const parseFecha = (iso) => {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  return y && m && d ? { y, m, d } : null;
};

// '¡Es hoy!' / '¡Es mañana!' / 'Faltan N días' / '' (pasado o fecha inválida).
export function etiquetaCuentaRegresiva(fechaIso, ahora = new Date()) {
  const f = parseFecha(fechaIso);
  if (!f) return '';
  const medianocheTorneo = new Date(f.y, f.m - 1, f.d).getTime();
  const medianocheHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const dias = Math.round((medianocheTorneo - medianocheHoy) / DIA_MS);
  if (dias < 0) return '';
  if (dias === 0) return '¡Es hoy!';
  if (dias === 1) return '¡Es mañana!';
  return `Faltan ${dias} días`;
}

const pad = (n) => String(n).padStart(2, '0');

// Link de Google Calendar para el torneo, o null si la fecha no sirve.
// Con hora HH:MM crea un evento de DURACION_HS horas; sin hora, de día completo.
export function urlGoogleCalendar(t) {
  const f = parseFecha(t?.fecha);
  if (!f) return null;
  const ymd = `${f.y}${pad(f.m)}${pad(f.d)}`;
  const hm = String(t.hora ?? '').match(/^(\d{1,2}):(\d{2})/);

  let dates;
  if (hm) {
    const inicio = new Date(f.y, f.m - 1, f.d, Number(hm[1]), Number(hm[2]));
    const fin = new Date(inicio.getTime() + DURACION_HS * 60 * 60 * 1000);
    const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    dates = `${fmt(inicio)}/${fmt(fin)}`;
  } else {
    const sig = new Date(f.y, f.m - 1, f.d + 1);
    dates = `${ymd}/${sig.getFullYear()}${pad(sig.getMonth() + 1)}${pad(sig.getDate())}`;
  }

  const detalles = [t.formato, t.reglas, 'Organiza BUTA TCG — instagram.com/butatcg'].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: String(t.nombre ?? 'Torneo BUTA TCG'),
    dates,
    ctz: TIMEZONE,
    details: detalles,
    location: String(t.lugar ?? ''),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
