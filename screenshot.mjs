import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const [url, label, size] = process.argv.slice(2);
if (!url) { console.error('Usage: node screenshot.mjs <url> [label] [WIDTHxHEIGHT]'); process.exit(1); }
const [width, height] = (size ?? '1440x900').split('x').map(Number);

const DIR = 'temporary screenshots';
await mkdir(DIR, { recursive: true });
const nums = (await readdir(DIR))
  .map((f) => f.match(/^screenshot-(\d+)/)?.[1])
  .filter(Boolean)
  .map(Number);
const n = nums.length ? Math.max(...nums) + 1 : 1;
const out = join(DIR, `screenshot-${n}${label ? `-${label}` : ''}.png`);

const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: out, fullPage: true });
} finally {
  await browser.close();
}
console.log(out);
