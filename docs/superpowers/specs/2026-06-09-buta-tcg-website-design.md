# BUTA TCG — Diseño del sitio web

**Fecha:** 2026-06-09
**Estado:** Aprobado por el usuario (diseño verbal); pendiente revisión del documento escrito.

## Resumen

Sitio web profesional para **BUTA TCG**, tienda de TCG sin local físico que organiza torneos de Yu-Gi-Oh! Trading Card Game en Córdoba, Argentina. El sitio presenta a BUTA, anuncia el próximo torneo con inscripción online, y muestra los resultados de torneos anteriores con las fotos reales de los tops.

Idioma del sitio: **español (Argentina)**.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Arquitectura | Sitio estático: HTML multi-página + Tailwind CDN + JS vanilla. Sin build, sin servidor propio. |
| Inscripción | Formulario propio en la web → Google Apps Script → Google Sheet. |
| Resultados y torneos | Se leen desde pestañas publicadas como CSV de la misma Google Sheet. |
| Estética | "Neón Duelista": fondo casi negro, brillos azul-violeta holográficos, energía anime/gamer. |
| Estructura | 4 páginas: Inicio, Torneos, Resultados, Nosotros. |
| Tienda/e-commerce | Fuera de alcance en esta fase. Ventas siguen por canales actuales. |
| Redes | Solo Instagram (https://www.instagram.com/butatcg/). Sin WhatsApp/Discord públicos para evitar spam. |
| Hosting | Decisión diferida: por ahora solo local. El sitio es 100 % estático, compatible con cualquier hosting gratuito (Netlify/Vercel/GitHub Pages) cuando se decida publicar. |

## Páginas

Las 4 páginas comparten header (logo jabalí + navegación: Inicio · Torneos · Resultados · Nosotros) y footer (Instagram, © BUTA TCG).

### 1. Inicio (`index.html`)
- **Hero:** logo del jabalí, título principal ("Torneos de Yu-Gi-Oh! TCG en Córdoba" o similar), CTA "Inscribirme al próximo torneo" → Torneos.
- **Próximo torneo:** tarjeta con fecha, lugar y cupos restantes (datos en vivo de la planilla) → enlace a Torneos.
- **Último campeón:** foto del Top 1 más reciente, nombre y deck → enlace a Resultados.
- **BUTA en 3 líneas:** resumen breve → enlace a Nosotros.

### 2. Torneos (`torneos.html`)
- **Ficha del próximo torneo:** fecha y hora, lugar, formato y reglas (suizo, banlist, etc.), precio de inscripción, premios, y barra de cupos "X / Y anotados" calculada automáticamente.
- **Formulario de inscripción:** campos Nombre completo y Konami ID + botón Confirmar.
- Si no hay torneo con estado `próximo` en la planilla, la página muestra "Próximamente nuevo torneo — seguinos en Instagram" y oculta el formulario.

### 3. Resultados (`resultados.html`)
- **Selector de torneo** (ej.: "YACS Córdoba · 06/12"). Con un solo torneo cargado, el selector existe igual para que escale solo agregando filas.
- **Podio:** Top 1 destacado en grande con tratamiento dorado; Top 2 y 3 medianos.
- **Grilla Top 4–8:** tarjetas con foto, nombre, puesto y deck.
- **Lightbox:** clic en cualquier foto la amplía (las fotos incluyen la decklist completa).

### 4. Nosotros (`nosotros.html`)
- **¿Quién es BUTA?:** logo grande + historia: tienda de TCG sin local físico que organiza torneos de Yu-Gi-Oh! en Córdoba.
- **¿Qué hacemos?:** tres bloques: 🏆 torneos organizados, 📹 transmisiones en vivo, 🎁 sorteos y colaboraciones (ej.: Ragnarok x BUTA).
- **Seguinos:** botón grande a Instagram @butatcg.

## Arquitectura de datos

Una sola Google Sheet propiedad de BUTA con 3 pestañas:

### Pestaña `Torneos` (publicada como CSV, solo lectura)
| Columna | Ejemplo |
|---|---|
| nombre | YACS Córdoba |
| fecha | 2026-07-12 |
| hora | 10:00 |
| lugar | Cinerama, Córdoba |
| formato | Avanzado TCG, suizo + top cut |
| reglas | Banlist vigente TCG |
| precio | $5000 |
| premios | Sobres + trofeo al Top 1 |
| cupo_maximo | 32 |
| estado | proximo / finalizado |

### Pestaña `Inscripciones` (privada, escrita por Apps Script)
| Columna | Ejemplo |
|---|---|
| timestamp | 2026-06-09 18:32 |
| torneo | YACS Córdoba |
| nombre | Juan Pérez |
| konami_id | 0123456789 |

No se publica: contiene datos personales. La web solo recibe el **conteo** de inscriptos (lo devuelve el Apps Script).

### Pestaña `Resultados` (publicada como CSV, solo lectura)
| Columna | Ejemplo |
|---|---|
| torneo | YACS Córdoba 06/12 |
| puesto | 1 |
| nombre | Mariano Castro |
| deck | (arquetipo del mazo) |
| foto | mariano-castro-top-1.jpg |

Las fotos viven en `assets/results/` dentro del sitio (se copian y renombran desde las JPG existentes del proyecto).

### Datos iniciales
La planilla arranca cargada con el torneo YACS Córdoba 06/12 (estado `finalizado`) y sus 8 resultados reales: Mariano Castro (1), Juan Gordillo (2), Pedro Torres (3), Juan Pablo Ynfantes (4), Rodo (5), Ricardo Jara (6), Alexis Juncos (7), Enzo Alfonzo (8). Los arquetipos de deck se completan con lo visible en las fotos de decklist o quedan como "—" hasta que BUTA los cargue.

## Flujo de inscripción

1. El jugador completa Nombre completo + Konami ID y envía.
2. JS valida en el navegador: campos no vacíos, Konami ID solo números (10 dígitos).
3. POST al Web App de Google Apps Script.
4. El script valida del lado servidor:
   - Konami ID no repetido para ese torneo → error "Este Konami ID ya está inscripto".
   - Conteo de inscriptos < cupo_maximo → error "Cupo lleno".
   - Si pasa, agrega la fila y responde OK con el nuevo conteo.
5. La web muestra el resultado: "✓ Inscripción confirmada", o el mensaje de error correspondiente, o "Error de conexión, intentá de nuevo" si la red falla.

**Entregable extra:** instructivo corto (5 pasos) para que BUTA cree la planilla desde la plantilla, instale el Apps Script y pegue la URL del Web App en un archivo de configuración del sitio (`js/config.js`).

## Manejo de errores de datos

- Si los CSV de Torneos/Resultados no cargan (red, planilla no configurada): las secciones dinámicas muestran contenido estático de respaldo (el YACS 06/12 embebido) en vez de quedar vacías.
- Si no hay torneo `proximo`: mensaje "Próximamente" en Inicio y Torneos; formulario oculto.
- Mientras cargan los datos: estados de carga discretos (skeleton/spinner), nunca pantalla en blanco.

## Sistema visual ("Neón Duelista")

- **Paleta:** fondo #05060f (negro profundo); primario: azul eléctrico derivado del logo del jabalí, con glow neón; secundario: violeta para degradados holográficos azul→violeta; dorado reservado para campeones y podios. Nunca paleta Tailwind por defecto.
- **Tipografía:** display agresiva/itálica para títulos (estilo torneo-anime) + sans limpia para cuerpo. Tracking apretado (-0.03em) en títulos grandes, line-height 1.7 en cuerpo.
- **Texturas:** degradados radiales superpuestos estilo "agujero negro" (como los posts del YACS) + grano sutil vía filtro SVG.
- **Profundidad:** sistema de capas base → elevado → flotante; sombras coloreadas (tinte azul) de baja opacidad, nunca shadow-md plano.
- **Interacciones:** hover con glow neón, focus-visible y active en todo elemento clicable; animaciones solo de transform/opacity con easing tipo spring; nunca transition-all.
- **Imágenes:** fotos de tops con overlay degradado (from-black/60) y capa de tratamiento de color con mix-blend-multiply.
- **Responsive:** mobile-first (el tráfico llega principalmente desde Instagram en el celular).

## Assets

| Asset | Origen | Uso |
|---|---|---|
| Logo jabalí | `Buta TCG/logo butatcg.png` | Header, hero, favicon |
| Fotos Top 1–8 | `Buta TCG/*.jpg` (8 archivos) | Página Resultados |
| Logo YACS | `Buta TCG/YACS.jpg` | Tarjeta del torneo en Resultados |

Los archivos se copian a `assets/` con nombres web-safe (sin espacios, en minúsculas). Las JPG de ~2 MB se redimensionan/comprimen para web.

## Estructura de archivos del sitio

```
/ (raíz del proyecto)
├── index.html
├── torneos.html
├── resultados.html
├── nosotros.html
├── js/
│   ├── config.js        (URLs de la planilla y del Apps Script)
│   ├── data.js          (lectura de CSV + fallbacks)
│   └── inscripcion.js   (validación y envío del formulario)
├── assets/
│   ├── logo-butatcg.png
│   └── results/         (fotos de tops optimizadas)
├── apps-script/
│   └── Code.gs          (script listo para pegar en Google)
└── docs/
    ├── setup-google-sheets.md  (instructivo de 5 pasos)
    └── superpowers/specs/      (este documento)
```

## Verificación

- Servidor local (`node serve.mjs`, puerto 3000) + capturas automatizadas (`node screenshot.mjs`) de cada página en viewport móvil y escritorio.
- Mínimo 2 rondas de comparación visual corrigiendo espaciados, tamaños, colores y jerarquía.
- Prueba end-to-end del formulario contra una planilla real de prueba: inscripción exitosa, duplicado rechazado, cupo lleno rechazado, campos inválidos rechazados, y fallo de red mostrando el mensaje correcto.
- Verificación de fallbacks: el sitio se ve completo aun sin la planilla configurada.

## Fuera de alcance (esta fase)

- Tienda / catálogo / pagos online.
- Panel de administración (todo se administra desde Google Sheets).
- Rankings acumulados entre torneos.
- Integración con WhatsApp/Discord.
- Publicación en hosting (queda listo para deploy; la decisión de dónde publicar es posterior).
