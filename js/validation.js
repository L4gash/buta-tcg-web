export function validarNombre(nombre) {
  return typeof nombre === 'string' && nombre.trim().length >= 3;
}

export function validarKonamiId(id) {
  return typeof id === 'string' && /^\d{10}$/.test(id.trim());
}
