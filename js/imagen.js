// Preparación de la imagen de comprobante: validación (pura) + compresión (browser).
export const MAX_LADO = 1280;          // px del lado más largo tras redimensionar
export const CALIDAD = 0.7;            // calidad JPEG de salida
export const MAX_CRUDO_BYTES = 10 * 1024 * 1024; // tope del archivo original (antes de comprimir)
const MIMES_OK = ['image/jpeg', 'image/png', 'image/webp'];

// Valida el archivo elegido. file == null => válido (el adjunto es opcional).
export function validarImagen(file) {
  if (file == null) return { ok: true, vacio: true };
  if (!MIMES_OK.includes(file.type)) return { ok: false, motivo: 'tipo' };
  if (file.size > MAX_CRUDO_BYTES) return { ok: false, motivo: 'tamano' };
  return { ok: true };
}

// Comprime a JPEG y devuelve { b64, mime }. Solo navegador (usa canvas/createImageBitmap).
export async function comprimirImagen(file, { maxLado = MAX_LADO, calidad = CALIDAD } = {}) {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', calidad));
  const b64 = await blobABase64(blob);
  return { b64, mime: 'image/jpeg' };
}

function blobABase64(blob) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result).split(',')[1]); // descarta el prefijo data:...,
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}
