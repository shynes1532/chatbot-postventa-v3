// ============================================
// GOOGLE SHEETS SERVICE
// ============================================

const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1ZBluKJfWOO0jooVdS8N8oGoKawjae4iV';

// Configurar autenticación
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

// Guardar turno en Google Sheet
async function guardarTurno(turnoData) {
  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const fecha = new Date().toLocaleDateString('es-AR');
    const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const fila = [
      fecha,
      hora,
      turnoData.nombre,
      turnoData.telefono,
      turnoData.sucursal,
      turnoData.modelo,
      turnoData.servicio,
      turnoData.km,
      turnoData.patente,
      turnoData.dia,
      turnoData.horario,
      turnoData.servicioExtra || '',
      turnoData.taxi || 'No',
      turnoData.accesorios || 'No'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Datos!A:N',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [fila],
      },
    });

    console.log('✅ Turno guardado en Google Sheets');
    return true;
  } catch (error) {
    console.error('❌ Error guardando en Google Sheets:', error.message);
    return false;
  }
}

module.exports = { guardarTurno };