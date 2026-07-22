// URLs del backend de datos. Vacías = la web usa los datos de respaldo embebidos.
// Instrucciones para completarlas: docs/setup-google-sheets.md
// Planilla BUTA TCG — pestañas Torneos y Resultados publicadas con "Publicar en la web"
// (formato CSV). Funcionan aunque la planilla tenga el acceso general Restringido.
const PUB_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROTsV7sHcVdub_fPhqRufMOFZvL-xQya8CitXOUMTrDiluoUdQOmc7n58YZ8gTG_glzx5JHjjrgqNH/pub';
export const TORNEOS_CSV_URL = `${PUB_BASE}?gid=0&single=true&output=csv`;
export const RESULTADOS_CSV_URL = `${PUB_BASE}?gid=1243856349&single=true&output=csv`;
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwdiSGsebn7WSb2y8MSvIvLpO98imO2skiLUibwrB4jQBV2m-QT311tsNq_5Qe6InOG/exec';
// Ranking de liga (2º planilla pública, pestaña de puntos). Leída como CSV vía gviz.
export const RANKING_CSV_URL = 'https://docs.google.com/spreadsheets/d/1N4S4eMmxVJxxyXVrOQpSI1vg3-u_LrC3o3b9ZzHRriY/gviz/tq?tqx=out:csv&gid=2006498169';
// Leaderboard de Omega (pestaña "Omega" de la planilla principal, publicada como CSV).
// Vacío = la página muestra "todavía no hay jugadores".
export const OMEGA_CSV_URL = `${PUB_BASE}?gid=1437418583&single=true&output=csv`;
export const INSTAGRAM_URL = 'https://www.instagram.com/butatcg/';
