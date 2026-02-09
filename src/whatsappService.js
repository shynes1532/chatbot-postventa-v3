// ============================================
// SERVICIO DE WHATSAPP v3.0 - Meta Cloud API
// Envío de mensajes: texto, botones, listas
// + Selector dinámico de días hábiles
// ============================================

const axios = require("axios");

const API_URL = "https://graph.facebook.com/v21.0";

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function getUrl() {
  return `${API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

// ═══════════════════════════════════════════
// ENVIAR TEXTO SIMPLE
// ═══════════════════════════════════════════
async function sendText(to, text) {
  try {
    await axios.post(
      getUrl(),
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      { headers: getHeaders() }
    );
    console.log(`✅ Texto enviado a ${to}`);
  } catch (error) {
    console.error("❌ Error enviando texto:", error.response?.data || error.message);
  }
}

// ═══════════════════════════════════════════
// ENVIAR BOTONES INTERACTIVOS (máx 3)
// ═══════════════════════════════════════════
async function sendButtons(to, bodyText, buttons) {
  try {
    await axios.post(
      getUrl(),
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: {
            buttons: buttons.map((btn) => ({
              type: "reply",
              reply: { id: btn.id, title: btn.title },
            })),
          },
        },
      },
      { headers: getHeaders() }
    );
    console.log(`✅ Botones enviados a ${to}`);
  } catch (error) {
    console.error("❌ Error enviando botones:", error.response?.data || error.message);
  }
}

// ═══════════════════════════════════════════
// ENVIAR LISTA INTERACTIVA (hasta 10 opciones)
// ═══════════════════════════════════════════
async function sendList(to, bodyText, buttonText, sections) {
  try {
    await axios.post(
      getUrl(),
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: bodyText },
          action: {
            button: buttonText,
            sections: sections,
          },
        },
      },
      { headers: getHeaders() }
    );
    console.log(`✅ Lista enviada a ${to}`);
  } catch (error) {
    console.error("❌ Error enviando lista:", error.response?.data || error.message);
  }
}

// ═══════════════════════════════════════════
// ENVIAR MENÚ PRINCIPAL
// ═══════════════════════════════════════════
async function sendMainMenu(phone) {
  await sendList(
    phone,
    "¿En qué puedo ayudarte? Elegí una opción:",
    "📋 Ver opciones",
    [
      {
        title: "Servicios",
        rows: [
          { id: "menu_turno", title: "📅 Agendar turno", description: "Programá tu visita al taller" },
          { id: "menu_estado", title: "🔍 Estado de reparación", description: "Consultá tu vehículo" },
          { id: "menu_info", title: "ℹ️ Info de mantenimiento", description: "Servicios, FlexCare, lubricantes" },
        ],
      },
      {
        title: "Atención",
        rows: [
          { id: "menu_emergencia", title: "🚨 Emergencia 24/7", description: "Mopar Assistance" },
          { id: "menu_mvp", title: "💰 Packs MVP prepago", description: "2, 3 o 4 revisiones" },
          { id: "menu_repuestos", title: "🔩 Repuestos y accesorios", description: "Consultas y catálogos" },
        ],
      },
      {
        title: "Otros",
        rows: [
          { id: "menu_recall", title: "📋 Consulta de Recall", description: "Por VIN/chasis" },
          { id: "menu_garantia", title: "🛡️ Garantía", description: "Cobertura y reclamos" },
          { id: "menu_asesor", title: "👤 Hablar con asesor", description: "Atención personalizada" },
        ],
      },
    ]
  );
}

// ═══════════════════════════════════════════
// ENVIAR SELECTOR DE SUCURSAL
// ═══════════════════════════════════════════
async function sendSucursalPicker(phone, text = "¿De qué sucursal?") {
  await sendButtons(phone, text, [
    { id: "suc_ushuaia", title: "🏔️ Ushuaia" },
    { id: "suc_rio_grande", title: "🌊 Río Grande" },
  ]);
}

// ═══════════════════════════════════════════
// SELECTOR DINÁMICO DE DÍAS HÁBILES
// Genera los próximos 6 días hábiles (L-S)
// ═══════════════════════════════════════════
function getNextBusinessDays(count = 6) {
  const days = [];
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Empezar desde mañana (hora Argentina UTC-3)
  const now = new Date();
  const argTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const date = new Date(argTime);
  date.setDate(date.getDate() + 1);

  while (days.length < count) {
    const dayOfWeek = date.getDay();
    // Lunes a Sábado (1-6), excluir Domingo (0)
    if (dayOfWeek !== 0) {
      const dayNum = date.getDate();
      const monthNum = date.getMonth();
      const dayName = dayNames[dayOfWeek];
      const isSaturday = dayOfWeek === 6;

      days.push({
        id: `dia_${dayNum}_${monthNum + 1}`,
        title: `${dayName} ${dayNum}/${String(monthNum + 1).padStart(2, "0")}`,
        description: isSaturday ? "9:30 a 12:30" : "9:30-12:30 / 15:00-20:00",
        label: `${dayName} ${dayNum} de ${monthNames[monthNum]}`,
      });
    }
    date.setDate(date.getDate() + 1);
  }

  return days;
}

async function sendDiaPicker(phone, bodyText) {
  const days = getNextBusinessDays(6);
  await sendList(phone, bodyText, "📅 Ver días disponibles", [
    {
      title: "Próximos días",
      rows: days.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
      })),
    },
  ]);
}

// ═══════════════════════════════════════════
// POST-ACCIÓN
// ═══════════════════════════════════════════
async function sendPostAction(phone, text = "¿Algo más en lo que te pueda ayudar?") {
  await sendButtons(phone, text, [
    { id: "post_menu", title: "🏠 Ver menú" },
    { id: "post_asesor", title: "👤 Hablar con asesor" },
    { id: "post_listo", title: "✅ Listo, gracias" },
  ]);
}

module.exports = {
  sendText,
  sendButtons,
  sendList,
  sendMainMenu,
  sendSucursalPicker,
  sendDiaPicker,
  sendPostAction,
};
