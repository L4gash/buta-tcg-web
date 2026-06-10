// URLs del backend de datos. Vacías = la web usa los datos de respaldo embebidos.
// Instrucciones para completarlas: docs/setup-google-sheets.md
// Planilla BUTA TCG — pestañas Torneos y Resultados publicadas con "Publicar en la web"
// (formato CSV). Funcionan aunque la planilla tenga el acceso general Restringido.
const PUB_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROTsV7sHcVdub_fPhqRufMOFZvL-xQya8CitXOUMTrDiluoUdQOmc7n58YZ8gTG_glzx5JHjjrgqNH/pub';
export const TORNEOS_CSV_URL = `${PUB_BASE}?gid=0&single=true&output=csv`;
export const RESULTADOS_CSV_URL = `${PUB_BASE}?gid=1243856349&single=true&output=csv`;
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwdiSGsebn7WSb2y8MSvIvLpO98imO2skiLUibwrB4jQBV2m-QT311tsNq_5Qe6InOG/exec';
export const INSTAGRAM_URL = 'https://www.instagram.com/butatcg/';
