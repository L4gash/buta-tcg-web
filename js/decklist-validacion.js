// Validación pura del archivo de decklist. A diferencia del comprobante de
// pago, acá el archivo es obligatorio: sin decklist no tiene sentido el envío.
// Imagen: se comprime en el navegador (igual que el comprobante, ver imagen.js)
// así que su tope de tamaño es el de la imagen cruda (MAX_CRUDO_BYTES).
// PDF: se sube tal cual, sin comprimir, así que necesita su propio tope.
import { MAX_CRUDO_BYTES } from './imagen.js';

const MIMES_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MIME_PDF = 'application/pdf';
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export function validarArchivoDecklist(file) {
  if (file == null) return { ok: false, motivo: 'requerido' };
  if (file.type === MIME_PDF) {
    if (file.size > MAX_PDF_BYTES) return { ok: false, motivo: 'tamano' };
    return { ok: true, tipo: 'pdf' };
  }
  if (MIMES_IMAGEN.includes(file.type)) {
    if (file.size > MAX_CRUDO_BYTES) return { ok: false, motivo: 'tamano' };
    return { ok: true, tipo: 'imagen' };
  }
  return { ok: false, motivo: 'tipo' };
}
