# Marcas de agua ocultas v2 — diseño

Fecha: 2026-06-30

## Problema

El sitio ya tiene 4 marcas de autoría (documentadas en `marcas-de-autoria.txt`),
pero todas comparten una debilidad: contienen literalmente la cadena `BUTA` /
`butatcg` (en claro, en base64 o en hex). Un copión que haga *find-replace* del
nombre, o que borre comentarios, las elimina —muchas veces sin darse cuenta de
que existían—. Queremos marcas adicionales **más ocultas** que sobrevivan a ese
nivel de limpieza y que den **prueba forense** del origen.

Alcance acordado: **solo el sitio estático** (HTML / CSS / JS). No se tocan el
backend de Apps Script ni los datos de respaldo.

## Mecanismo central: preimagen de hash

En vez de esconder el texto "BUTA", escondemos una constante que **parece un
hash de build** pero es en realidad la preimagen de un secreto que solo posee el
dueño:

1. Se elige una **frase secreta** con sal aleatoria, p. ej.
   `"BUTA TCG :: original @butatcg :: <16 bytes aleatorios en hex>"`.
2. Se calcula `REV = SHA256(frase)` y se toman los **primeros 24 caracteres hex**
   (96 bits). Ese valor parece un etag / commit hash inocuo.
3. La **frase secreta nunca entra al repo**: vive solo en
   `marcas-de-autoria.txt` (ya está en `.gitignore`). El repo solo contiene el
   `REV` (que por sí solo no revela nada).

Propiedades:

- **No contiene `buta`** → inmune a find-replace del nombre.
- **Parece código funcional** → no se borra como "código muerto".
- **Prueba matemática**: ante una copia que contenga ese `REV`, el dueño revela
  la frase; cualquiera corre el SHA-256 y confirma que arranca con ese valor.
  Producir una preimagen de 96 bits por azar es ~1 en 2⁹⁶: inviable.

## Las 3 marcas nuevas

Mismo `REV`, tres disfraces distintos en tres archivos, para redundancia:

| # | Archivo | Disfraz | Forma concreta |
|---|---|---|---|
| M1 | `js/theme.js` | build hash en el DOM | `document.documentElement.dataset.rev = REV` → render `<html data-rev="…">` |
| M2 | `css/custom.css` | token de versión del design system | `:root { --rev: "…" }` junto a los demás tokens |
| M3 | las 4 páginas `.html` | meta tag estándar | `<meta name="build" content="…">` en el `<head>` |

M1 es la principal: queda "en uso" (escrita al DOM), así que no se percibe como
sobrante. M2 y M3 son inertes pero con apariencia legítima.

## Canarios (señuelo)

Las **4 marcas actuales se dejan tal cual**. Funcionan como señuelo sacrificable:
un copión que las encuentra y borra se siente "limpio" y deja intactas las 3
nuevas. Costo de mantenerlas: cero.

## Kit de prueba (privado, fuera de git)

En `marcas-de-autoria.txt` se documenta:

- la(s) frase(s) secreta(s) y la sal,
- el `REV` resultante,
- la ubicación exacta de cada marca nueva (M1–M3),
- el comando de verificación:
  `node -e "console.log(require('crypto').createHash('sha256').update('<frase>').digest('hex'))"`

## Fuera de alcance (YAGNI)

- Nada en el backend de Apps Script ni en los CSV de respaldo.
- Sin caracteres de ancho cero (frágiles ante minificación / copy-paste).
- Sin marcas "load-bearing" que rompan el sitio si se eliminan.

## Verificación

- El sitio sigue renderizando igual (las marcas son invisibles para el usuario).
- `<html data-rev="…">` aparece en el DOM tras cargar cualquier página.
- `getComputedStyle(document.documentElement).getPropertyValue('--rev')` devuelve el `REV`.
- Cada `.html` tiene el `<meta name="build">` con el `REV`.
- El `REV` del repo coincide con `SHA256(frase secreta)[:24]` calculado desde el kit privado.
- Ninguna marca nueva contiene la subcadena `buta` (case-insensitive).
