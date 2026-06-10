// URLs del backend de datos. Vacías = la web usa los datos de respaldo embebidos.
// Instrucciones para completarlas: docs/setup-google-sheets.md
// Planilla BUTA TCG (las URLs gviz leen una pestaña como CSV; requieren que la
// planilla sea visible por link, o reemplazarlas por los links de "Publicar en la web").
const SHEET_ID = '1pgf7hrbGzNFPQ3bkgf_R5ixmWh4Ezlg6N-KhJMl0DJ8';
export const TORNEOS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Torneos`;
export const RESULTADOS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Resultados`;
export const APPS_SCRIPT_URL = '';
export const INSTAGRAM_URL = 'https://www.instagram.com/butatcg/';
