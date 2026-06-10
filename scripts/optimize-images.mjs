import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'Buta TCG';
const photos = [
  ['Mariano Castro Top 1.jpg', 'mariano-castro-top-1.jpg'],
  ['Juan Gordillo top 2.jpg', 'juan-gordillo-top-2.jpg'],
  ['Pedro Torres top 3.jpg', 'pedro-torres-top-3.jpg'],
  ['Top 4 Juan pablo ynfantes.jpg', 'juan-pablo-ynfantes-top-4.jpg'],
  ['Rodo top 5.jpg', 'rodo-top-5.jpg'],
  ['Ricardo Jara Top 6.jpg', 'ricardo-jara-top-6.jpg'],
  ['Alexis Juncos Top 7.jpg', 'alexis-juncos-top-7.jpg'],
  ['Enzo Alfonzo Top 8.jpg', 'enzo-alfonzo-top-8.jpg'],
];

await mkdir('assets/results', { recursive: true });
for (const [src, out] of photos) {
  await sharp(`${SRC}/${src}`).resize({ width: 1000, withoutEnlargement: true })
    .jpeg({ quality: 80 }).toFile(`assets/results/${out}`);
  console.log(out);
}
await sharp(`${SRC}/logo butatcg.png`).resize({ width: 480, withoutEnlargement: true })
  .png().toFile('assets/logo-butatcg.png');
await sharp(`${SRC}/YACS.jpg`).resize({ width: 700, withoutEnlargement: true })
  .jpeg({ quality: 80 }).toFile('assets/yacs.jpg');
console.log('done');
