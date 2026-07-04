// Genera los íconos de la PWA a partir del logo. Correr: node scripts/generar-iconos-pwa.mjs
// - icon-192 / icon-512: logo centrado sobre fondo noche.
// - icon-512-maskable: igual pero con el logo al 70% (zona segura de Android).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const LOGO = 'assets/logo-butatcg.png';
const FONDO = { r: 5, g: 6, b: 15, alpha: 1 }; // --noche #05060f
const SALIDA = 'assets/icons';

mkdirSync(SALIDA, { recursive: true });

async function icono(tamano, escalaLogo, nombre) {
  const logo = await sharp(LOGO)
    .resize(Math.round(tamano * escalaLogo), Math.round(tamano * escalaLogo), { fit: 'contain', background: { ...FONDO, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: tamano, height: tamano, channels: 4, background: FONDO } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`${SALIDA}/${nombre}`);
  console.log(`OK: ${SALIDA}/${nombre}`);
}

await icono(192, 0.82, 'icon-192.png');
await icono(512, 0.82, 'icon-512.png');
await icono(512, 0.70, 'icon-512-maskable.png');
