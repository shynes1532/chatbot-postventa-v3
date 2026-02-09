const express = require("express");
const dotenv = require("dotenv");
const session = require("./src/sessionManager");
const { handleIncomingMessage } = require("./src/messageHandler");

// Cargar .env SOLO en local. En Railway/producción se usan Variables del servicio.
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
app.use(express.json());

// ═══════════════════════════════════════════
// VALIDAR VARIABLES DE ENTORNO CRÍTICAS
// ═══════════════════════════════════════════
const requiredVars = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "VERIFY_TOKEN"];
const missing = requiredVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error("❌ FALTAN VARIABLES DE ENTORNO CRÍTICAS:");
  console.error(`   ${missing.join(", ")}`);
  console.error("   Configuralas en Railway → Variables o en .env local");
  process.exit(1);
}

// ═══════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Chatbot Posventa v3.0 - Liendo Automotores LASAC",
    version: "3.0.0",
    sucursales: ["Ushuaia", "Río Grande"],
    activeSessions: session.getActiveSessions(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => res.status(200).send("OK"));

// ═══════════════════════════════════════════
// WEBHOOK VERIFICATION (GET)
// ═══════════════════════════════════════════
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  console.warn("⚠️ Intento de verificación de webhook fallido");
  return res.sendStatus(403);
});

// ═══════════════════════════════════════════
// WEBHOOK EVENTS (POST)
// ═══════════════════════════════════════════
app.post("/webhook", async (req, res) => {
  // SIEMPRE responder 200 rápido a Meta (si no, reintenta)
  res.sendStatus(200);

  try {
    const body = req.body;

    if (
      body.object === "whatsapp_business_account" &&
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    ) {
      const change = body.entry[0].changes[0].value;
      const message = change.messages[0];
      const senderPhone = message.from;
      const senderName = change.contacts?.[0]?.profile?.name || "Cliente";

      console.log(
        `📩 ${senderName} (${senderPhone}): ${
          message.text?.body ||
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          message.type
        }`
      );

      await handleIncomingMessage(senderPhone, senderName, message);
    }
  } catch (error) {
    console.error("❌ Error procesando webhook:", error.message);
  }
});

// ═══════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  🚗 Chatbot Posventa v3.0 - LASAC          ║");
  console.log("║  📍 Ushuaia & Río Grande                   ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`🟢 Puerto: ${PORT}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`📱 Phone ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
  console.log(`🔗 Webhook listo en /webhook\n`);
});
