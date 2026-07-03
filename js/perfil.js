// Lectura segura de lo que el sitio guarda del jugador en localStorage.
// Funciones puras: reciben el string crudo y devuelven un valor confiable.

// Perfil guardado tras una inscripción exitosa ({ nombre, konami_id }) o null.
export function leerPerfilGuardado(raw) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== 'object' || obj === null) return null;
    const nombre = String(obj.nombre ?? '');
    const konami_id = String(obj.konami_id ?? '');
    if (!nombre && !konami_id) return null;
    return { nombre, konami_id };
  } catch {
    return null;
  }
}

// Mapa { nombreTorneo: true } de torneos a los que este navegador ya se
// inscribió. Basura o formato inesperado => objeto vacío.
export function leerInscripciones(raw) {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}
