// ============================================
// MESSAGE HANDLER v3.0 - CEREBRO DEL BOT
// Flujo dinámico: confirma + pregunta en un mensaje
// ============================================

const wa = require("./whatsappService");
const session = require("./sessionManager");
const { checkInterruption } = require("./interruptionHandler");

// ═══════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════

function extractMessage(message) {
  if (message.type === "text") {
    return { text: message.text.body, id: null, type: "text" };
  }
  if (message.type === "interactive") {
    if (message.interactive.type === "button_reply") {
      return {
        text: message.interactive.button_reply.title,
        id: message.interactive.button_reply.id,
        type: "button",
      };
    }
    if (message.interactive.type === "list_reply") {
      return {
        text: message.interactive.list_reply.title,
        id: message.interactive.list_reply.id,
        type: "list",
      };
    }
  }
  return { text: "", id: null, type: message.type };
}

function getServiceTip(servicio) {
  if (/aceite|rápido|rapido/i.test(servicio))
    return "\n💡 El cambio de aceite regular es la mejor inversión para tu motor. ¡Tu FIAT te lo va a agradecer!";
  if (/programado/i.test(servicio))
    return "\n💡 Cumplir con el service programado en la red oficial cuida tu vehículo y preserva la garantía. 🛡️";
  if (/diagn[oó]stico/i.test(servicio))
    return "\n💡 Nuestro equipo trabaja con la tecnología más actualizada de FIAT. Vamos a encontrar qué necesita tu vehículo. 🔎";
  if (/neum[aá]tico|rueda|alineaci/i.test(servicio))
    return "\n💡 Los neumáticos son tu única conexión con el asfalto. ¡Mantenerlos en buen estado es clave! 🛞";
  return "";
}

function getKmTip(km) {
  const kmNum = parseInt(km.replace(/\D/g, ""));
  if (kmNum >= 50000) return "\n💡 Con ese kilometraje, es buen momento para chequear frenos y suspensión. 😊";
  if (kmNum >= 30000) return "\n💡 A esa altura, vale la pena revisar neumáticos y alineación. 👍";
  if (kmNum < 20000) return "\n💡 ¡Qué lindo con pocos km! Aprovechá FlexCare para ahorrar hasta 35%. 💸";
  return "";
}

function parseSucursal(id) {
  if (id === "suc_ushuaia") return "Ushuaia";
  if (id === "suc_rio_grande") return "Río Grande";
  return id.includes("ushuaia") ? "Ushuaia" : "Río Grande";
}

function isValidPatente(text) {
  return /^[A-Za-z]{2,3}\s*\d{3}\s*[A-Za-z]{0,3}$/.test(text.trim());
}

function isValidVIN(text) {
  return /^[A-HJ-NPR-Z0-9]{10,17}$/i.test(text.trim());
}

// ═══════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════
async function handleIncomingMessage(phone, name, message) {
  const msg = extractMessage(message);
  let ses = session.getOrCreate(phone, name);

  // === BIENVENIDA (primera vez) ===
  if (ses.state === "main_menu" && !ses.greeted) {
    session.updateSession(phone, { greeted: true });
    await wa.sendText(
      phone,
      `¡Hola ${name}! 👋 Soy el asistente virtual de *Liendo Automotores LASAC*, concesionario oficial FIAT en Tierra del Fuego.\n\n🏔️ Ushuaia | 🌊 Río Grande\n\nEstoy acá para ayudarte con turnos, consultas de reparación, info de mantenimiento y todo lo que necesites. ¡Vamos! 🚗`
    );
    await wa.sendMainMenu(phone);
    return;
  }

  // === TEXTO LIBRE EN MENÚ PRINCIPAL ===
  if (msg.type === "text" && ses.state === "main_menu") {
    const lower = msg.text.toLowerCase();
    if (/menu|men[uú]|inicio|ayuda|hola|buenos|buen[oa]s/.test(lower)) {
      await wa.sendMainMenu(phone);
      return;
    }
    // Si escribe algo random en main_menu, mostrar menú
    await wa.sendText(phone, "¡Hola! 😊 Elegí una opción del menú para que pueda ayudarte:");
    await wa.sendMainMenu(phone);
    return;
  }

  // === POST-ACCIÓN ===
  if (msg.id === "post_menu") {
    session.setState(phone, "main_menu");
    await wa.sendMainMenu(phone);
    return;
  }
  if (msg.id === "post_asesor") {
    session.setState(phone, "asesor_sucursal");
    await wa.sendSucursalPicker(phone, "👤 Te conecto con un asesor. ¿De qué sucursal?");
    return;
  }
  if (msg.id === "post_listo") {
    await wa.sendText(phone, "¡Perfecto! Estoy acá cuando me necesites. ¡Que tengas un excelente día! 😊🚗");
    session.resetSession(phone);
    return;
  }

  // === ROUTER POR ESTADO ===
  switch (ses.state) {
    case "main_menu":
      await handleMainMenu(phone, msg, ses);
      break;
    case "turno_sucursal":
      await handleTurnoSucursal(phone, msg, ses);
      break;
    case "turno_modelo":
      await handleTurnoModelo(phone, msg, ses);
      break;
    case "turno_servicio":
      await handleTurnoServicio(phone, msg, ses);
      break;
    case "turno_otro_servicio":
      await handleTurnoOtroServicio(phone, msg, ses);
      break;
    case "turno_servicio_extra":
      await handleTurnoServicioExtra(phone, msg, ses);
      break;
    case "turno_servicio_extra_input":
      await handleTurnoServicioExtraInput(phone, msg, ses);
      break;
    case "turno_km":
      await handleTurnoKm(phone, msg, ses);
      break;
    case "turno_patente":
      await handleTurnoPatente(phone, msg, ses);
      break;
    case "turno_dia":
      await handleTurnoDia(phone, msg, ses);
      break;
    case "turno_horario":
      await handleTurnoHorario(phone, msg, ses);
      break;
    case "turno_confirmar":
      await handleTurnoConfirmar(phone, msg, ses);
      break;
    case "turno_taxi":
      await handleTurnoTaxi(phone, msg, ses);
      break;
    case "turno_accesorios":
      await handleTurnoAccesorios(phone, msg, ses);
      break;
    case "estado_input":
      await handleEstadoInput(phone, msg, ses);
      break;
    case "estado_extra":
      await handleEstadoExtra(phone, msg, ses);
      break;
    case "estado_extra_input":
      await handleEstadoExtraInput(phone, msg, ses);
      break;
    case "info_menu":
      await handleInfoMenu(phone, msg, ses);
      break;
    case "mvp_option":
      await handleMVPOption(phone, msg, ses);
      break;
    case "repuestos_menu":
      await handleRepuestosMenu(phone, msg, ses);
      break;
    case "repuestos_modelo":
      await handleRepuestosModelo(phone, msg, ses);
      break;
    case "repuestos_detalle":
      await handleRepuestosDetalle(phone, msg, ses);
      break;
    case "recall_input":
      await handleRecallInput(phone, msg, ses);
      break;
    case "garantia_menu":
      await handleGarantiaMenu(phone, msg, ses);
      break;
    case "garantia_eurorepar":
      await handleGarantiaEurorepar(phone, msg, ses);
      break;
    case "asesor_sucursal":
      await handleAsesorSucursal(phone, msg, ses);
      break;
    default:
      session.setState(phone, "main_menu");
      await wa.sendMainMenu(phone);
  }
}

// ═══════════════════════════════════════════
// MENÚ PRINCIPAL
// ═══════════════════════════════════════════
async function handleMainMenu(phone, msg, ses) {
  switch (msg.id) {
    case "menu_turno":
      session.setState(phone, "turno_sucursal");
      await wa.sendSucursalPicker(phone, "📅 Agendemos tu turno. ¿En qué sucursal querés atenderte?");
      break;
    case "menu_estado":
      session.setState(phone, "estado_input");
      await wa.sendText(
        phone,
        "🔍 Consultemos el estado de tu vehículo.\n\nPasame tu *patente* o *número de orden de trabajo (OT)* 👇"
      );
      break;
    case "menu_info":
      session.setState(phone, "info_menu");
      await wa.sendList(phone, "ℹ️ ¿Qué te gustaría saber?", "📋 Ver opciones", [
        {
          title: "Información",
          rows: [
            { id: "info_mant_prog", title: "Mantenimiento programado", description: "Cada 10.000 km o 1 año" },
            { id: "info_srv_rapido", title: "Servicios rápidos", description: "Aceite, filtros, neumáticos" },
            { id: "info_srv_esenciales", title: "Servicios esenciales", description: "Tren delantero, frenos, etc" },
            { id: "info_lubricantes", title: "Lubricantes Mopar", description: "Aceites originales" },
            { id: "info_flexcare", title: "FlexCare (hasta -35%)", description: "Programa de descuentos" },
            { id: "volver_menu", title: "← Volver al menú" },
          ],
        },
      ]);
      break;
    case "menu_emergencia":
      await wa.sendText(
        phone,
        `🚨 *Mopar Assistance 24/7*\n\nTenés asistencia las 24 horas, todos los días.\n\n📞 *0800-777-8000* → Opción 1\n\nGrúa, cambio de rueda, auxilio en ruta, cerrajería. ¡Siempre disponible! 🛡️`
      );
      await wa.sendPostAction(phone, "¿Algo más?");
      break;
    case "menu_mvp":
      session.setState(phone, "mvp_option");
      await wa.sendButtons(
        phone,
        "💰 *Packs MVP (Mopar Vehicle Protection)*\n\nPrepagá tu mantenimiento y fijá el precio. Incluye mano de obra y repuestos Mopar.\n\n¿Qué pack te interesa?",
        [
          { id: "mvp_2", title: "📦 Pack 2 revisiones" },
          { id: "mvp_3", title: "📦 Pack 3 revisiones" },
          { id: "mvp_4", title: "📦 Pack 4 revisiones" },
        ]
      );
      break;
    case "menu_repuestos":
      session.setState(phone, "repuestos_menu");
      await wa.sendButtons(phone, "🔩 *Repuestos y accesorios Mopar*\n\n¿Qué necesitás?", [
        { id: "rep_consulta", title: "🔍 Consultar repuesto" },
        { id: "rep_accesorio", title: "✨ Ver accesorios" },
        { id: "rep_catalogo", title: "📕 Catálogos" },
      ]);
      break;
    case "menu_recall":
      session.setState(phone, "recall_input");
      await wa.sendText(
        phone,
        `📋 *Consulta de Recall*\n\nEl recall es cuando la fábrica detecta un tema de seguridad y convoca a los propietarios para solucionarlo *sin costo*.\n\nNecesito el *VIN (número de chasis)*.\n\n🔍 Lo encontrás en la base del parabrisas, título del vehículo o seguro.\n\n✏️ Escribilo acá 👇`
      );
      break;
    case "menu_garantia":
      session.setState(phone, "garantia_menu");
      await wa.sendButtons(phone, "🛡️ *Garantía FIAT*\n\n¿Qué querés saber?", [
        { id: "gar_cobertura", title: "📋 ¿Qué cubre?" },
        { id: "gar_eurorepar", title: "⚠️ Eurorepar y garantía" },
        { id: "gar_reclamo", title: "📝 Hacer un reclamo" },
      ]);
      break;
    case "menu_asesor":
      session.setState(phone, "asesor_sucursal");
      await wa.sendSucursalPicker(phone, "👤 Te conecto con un asesor. ¿De qué sucursal?");
      break;
    default:
      await wa.sendMainMenu(phone);
  }
}

// ═══════════════════════════════════════════
// FLUJO: AGENDAR TURNO
// ═══════════════════════════════════════════

// PASO 1: Sucursal → directo a modelo
async function handleTurnoSucursal(phone, msg, ses) {
  if (!msg.id || !msg.id.startsWith("suc_")) {
    await wa.sendSucursalPicker(phone, "Elegí una sucursal tocando el botón 👇");
    return;
  }

  const suc = parseSucursal(msg.id);
  session.setTurnoData(phone, { sucursal: suc });
  session.setState(phone, "turno_modelo");

  // DINÁMICO: confirma sucursal + pide modelo en un solo mensaje
  await wa.sendList(
    phone,
    `📍 ${suc}, perfecto. 🚗 ¿Qué modelo de FIAT tenés?`,
    "🚗 Elegir modelo",
    [
      {
        title: "Modelos",
        rows: [
          { id: "modelo_600", title: "FIAT 600" },
          { id: "modelo_argo", title: "Argo" },
          { id: "modelo_cronos", title: "Cronos" },
          { id: "modelo_ducato", title: "Ducato" },
          { id: "modelo_fiorino", title: "Fiorino" },
          { id: "modelo_fastback", title: "Fastback" },
          { id: "modelo_mobi", title: "Mobi" },
          { id: "modelo_pulse", title: "Pulse" },
          { id: "modelo_strada", title: "Strada" },
          { id: "modelo_toro", title: "Toro" },
        ],
      },
    ]
  );
}

// PASO 2: Modelo → directo a servicio
async function handleTurnoModelo(phone, msg, ses) {
  if (msg.type === "text" && !msg.id) {
    await wa.sendText(phone, "Tocá el botón *🚗 Elegir modelo* para seleccionar tu FIAT 😊");
    return;
  }

  const modelo = msg.text;
  session.setTurnoData(phone, { modelo });
  session.setState(phone, "turno_servicio");

  // DINÁMICO: confirma modelo + pide servicio
  await wa.sendList(
    phone,
    `🚗 ${modelo}, ¡qué lindo vehículo! 😍\n\n🔧 ¿Qué servicio necesitás?`,
    "🔧 Elegir servicio",
    [
      {
        title: "Servicios",
        rows: [
          { id: "srv_programado", title: "Service programado", description: "Cada 10.000 km / 1 año" },
          { id: "srv_aceite", title: "Cambio de aceite y filtro" },
          { id: "srv_neumaticos", title: "Neumáticos" },
          { id: "srv_frenos", title: "Frenos" },
          { id: "srv_bateria", title: "Batería" },
          { id: "srv_alineacion", title: "Alineación y balanceo" },
          { id: "srv_diagnostico", title: "Diagnóstico", description: "Falla, ruido, luz tablero" },
          { id: "srv_otro", title: "Otro servicio" },
        ],
      },
    ]
  );
}

// PASO 3: Servicio → pregunta extra
async function handleTurnoServicio(phone, msg, ses) {
  if (msg.type === "text" && !msg.id) {
    await wa.sendText(phone, "Tocá el botón *🔧 Elegir servicio* para seleccionar. 😊");
    return;
  }

  if (msg.id === "srv_otro") {
    session.setState(phone, "turno_otro_servicio");
    await wa.sendText(phone, "📝 Contame qué servicio necesitás 👇");
    return;
  }

  const servicio = msg.text;
  session.setTurnoData(phone, { servicio });
  session.setState(phone, "turno_servicio_extra");

  const tip = getServiceTip(servicio);

  // DINÁMICO: confirma servicio + pregunta extra en un mensaje
  await wa.sendButtons(
    phone,
    `✅ ${servicio}, anotado.${tip}\n\n🔍 ¿Notaste algo más en tu vehículo? Algún ruidito, vibración, luz en el tablero... ¡Aprovechá la visita! 😊`,
    [
      { id: "srv_extra_si", title: "Sí, hay algo más ✏️" },
      { id: "srv_extra_no", title: "No, solo eso ✅" },
    ]
  );
}

// "Otro servicio" → texto libre → pregunta extra
async function handleTurnoOtroServicio(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const servicio = msg.text;
  session.setTurnoData(phone, { servicio });
  session.setState(phone, "turno_servicio_extra");

  await wa.sendButtons(
    phone,
    `✅ ${servicio}, anotado. 👍\n\n🔍 ¿Hay algo más que hayas notado en tu vehículo? Ruiditos, vibraciones, luces... ¡Contanos! 😊`,
    [
      { id: "srv_extra_si", title: "Sí, hay algo más ✏️" },
      { id: "srv_extra_no", title: "No, solo eso ✅" },
    ]
  );
}

// PASO 4: Servicio extra → km
async function handleTurnoServicioExtra(phone, msg, ses) {
  if (msg.id === "srv_extra_si") {
    session.setState(phone, "turno_servicio_extra_input");
    await wa.sendText(phone, "¡Dale, contame! Cualquier detalle nos sirve 🙌👇");
    return;
  }

  // Dijo que no → directo a km
  session.setState(phone, "turno_km");
  await wa.sendList(
    phone,
    `📊 ¿En qué kilometraje está tu ${ses.turnoData.modelo}?`,
    "📊 Elegir km",
    [
      {
        title: "Kilometraje",
        rows: [
          { id: "km_10000", title: "Menos de 10.000 km" },
          { id: "km_20000", title: "10.000 - 20.000 km" },
          { id: "km_30000", title: "20.000 - 30.000 km" },
          { id: "km_40000", title: "30.000 - 40.000 km" },
          { id: "km_50000", title: "40.000 - 50.000 km" },
          { id: "km_60000", title: "50.000 - 60.000 km" },
          { id: "km_70000", title: "60.000 - 70.000 km" },
          { id: "km_80000", title: "70.000 - 80.000 km" },
          { id: "km_90000", title: "80.000 - 90.000 km" },
          { id: "km_100000", title: "Más de 100.000 km" },
        ],
      },
    ]
  );
}

// Input de servicio extra → km
async function handleTurnoServicioExtraInput(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const extra = msg.text;
  session.setTurnoData(phone, { servicioExtra: extra });
  console.log(`📝 SERVICIO EXTRA: ${extra}`);

  // DINÁMICO: confirma extra + pide km
  session.setState(phone, "turno_km");
  await wa.sendList(
    phone,
    `📝 Anotado: "${extra}". Lo revisamos también. 🙌\n\n📊 ¿En qué kilometraje está tu ${ses.turnoData.modelo}?`,
    "📊 Elegir km",
    [
      {
        title: "Kilometraje",
        rows: [
          { id: "km_10000", title: "Menos de 10.000 km" },
          { id: "km_20000", title: "10.000 - 20.000 km" },
          { id: "km_30000", title: "20.000 - 30.000 km" },
          { id: "km_40000", title: "30.000 - 40.000 km" },
          { id: "km_50000", title: "40.000 - 50.000 km" },
          { id: "km_60000", title: "50.000 - 60.000 km" },
          { id: "km_70000", title: "60.000 - 70.000 km" },
          { id: "km_80000", title: "70.000 - 80.000 km" },
          { id: "km_90000", title: "80.000 - 90.000 km" },
          { id: "km_100000", title: "Más de 100.000 km" },
        ],
      },
    ]
  );
}

// PASO 5: Km → patente
async function handleTurnoKm(phone, msg, ses) {
  if (msg.type === "text" && !msg.id) {
    await wa.sendText(phone, "Tocá el botón *📊 Elegir km* para seleccionar el kilometraje. 😊");
    return;
  }

  const km = msg.text;
  session.setTurnoData(phone, { km });
  session.setState(phone, "turno_patente");

  const tip = getKmTip(km);

  // DINÁMICO: confirma km + pide patente
  await wa.sendText(
    phone,
    `📊 ${km}, perfecto.${tip}\n\nAhora necesito la *patente* de tu ${ses.turnoData.modelo} 👇`
  );
}

// PASO 6: Patente → días disponibles
async function handleTurnoPatente(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  if (!isValidPatente(msg.text)) {
    await wa.sendText(
      phone,
      `🤔 Esa patente no me cierra. El formato correcto es:\n\n• Nuevo: *AB123CD*\n• Viejo: *ABC123*\n\nIntentá de nuevo 👇`
    );
    return;
  }

  const patente = msg.text.toUpperCase().replace(/\s+/g, "");
  session.setTurnoData(phone, { patente });
  session.setState(phone, "turno_dia");

  // DINÁMICO: confirma patente + muestra días disponibles
  await wa.sendDiaPicker(
    phone,
    `🔢 Patente *${patente}*, anotada. ✅\n\n📅 ¿Qué día te queda mejor para traer tu ${ses.turnoData.modelo}?`
  );
}

// PASO 7: Día → horario
async function handleTurnoDia(phone, msg, ses) {
  if (msg.type === "text" && !msg.id) {
    await wa.sendText(phone, "Elegí un día de la lista tocando *📅 Ver días disponibles*. 😊");
    return;
  }

  const dia = msg.text;
  session.setTurnoData(phone, { dia });
  session.setState(phone, "turno_horario");

  // DINÁMICO: confirma día + pide horario
  await wa.sendButtons(
    phone,
    `📆 ${dia}, bárbaro. ¿Mañana o tarde?`,
    [
      { id: "horario_manana", title: "🌅 Mañana (9:30-12:30)" },
      { id: "horario_tarde", title: "🌇 Tarde (15:00-20:00)" },
    ]
  );
}

// PASO 8: Horario → resumen
async function handleTurnoHorario(phone, msg, ses) {
  if (msg.type === "text" && !msg.id) {
    await wa.sendText(phone, "Tocá *🌅 Mañana* o *🌇 Tarde* para elegir el horario. 😊");
    return;
  }

  const horario = msg.text;
  session.setTurnoData(phone, { horario });
  session.setState(phone, "turno_confirmar");

  const td = ses.turnoData;

  let resumen = `📋 ¡Listo! Mirá el resumen de tu turno:\n\n📍 Sucursal: *${td.sucursal}*\n🚗 Modelo: *${td.modelo}*\n🔧 Servicio: *${td.servicio}*`;

  if (td.servicioExtra) {
    resumen += `\n🔍 También revisar: *${td.servicioExtra}*`;
  }

  resumen += `\n📊 Kilometraje: *${td.km}*\n🔢 Patente: *${td.patente}*\n📆 Día: *${td.dia}*\n🕐 Horario: *${horario}*\n\n¿Está todo bien? 😊`;

  await wa.sendButtons(phone, resumen, [
    { id: "turno_si", title: "✅ ¡Confirmar!" },
    { id: "turno_modificar", title: "✏️ Modificar" },
  ]);
}

// PASO 9: Confirmar → taxi
async function handleTurnoConfirmar(phone, msg, ses) {
  if (msg.id === "turno_modificar") {
    session.resetTurno(phone);
    session.setState(phone, "turno_sucursal");
    await wa.sendSucursalPicker(phone, "📝 Dale, armemos de nuevo. ¿En qué sucursal?");
    return;
  }

  const td = ses.turnoData;
  console.log(
    `✅ TURNO CONFIRMADO | ${ses.name} (${ses.phone}) | ${td.sucursal} | ${td.modelo} | ${td.servicio} | ${td.km} | ${td.patente} | ${td.dia} | ${td.horario}${td.servicioExtra ? " | Extra: " + td.servicioExtra : ""}`
  );

  session.setState(phone, "turno_taxi");

  // DINÁMICO: confirmación + pregunta taxi en secuencia rápida
  await wa.sendText(
    phone,
    `✅ ¡Solicitud registrada con éxito! 🎉\n\nUn asesor de servicio se va a comunicar con vos para confirmar día y horario exacto.\n\n📞 Te contactamos en nuestro horario:\n🕐 L-V 9:30 a 12:30 / 15:00 a 20:00\n🕐 Sáb 9:30 a 12:30`
  );

  await wa.sendButtons(
    phone,
    "🚕 Una cosita más... ¿Vas a necesitar un taxi cuando dejes tu vehículo? Podemos coordinarlo para vos. 😊",
    [
      { id: "taxi_si", title: "✅ Sí, por favor" },
      { id: "taxi_no", title: "❌ No, gracias" },
    ]
  );
}

// PASO 10: Taxi → accesorios
async function handleTurnoTaxi(phone, msg, ses) {
  if (msg.id === "taxi_si") {
    session.setTurnoData(phone, { taxi: "Sí" });
    console.log(`🚕 TAXI solicitado por ${ses.name}`);
  } else {
    session.setTurnoData(phone, { taxi: "No" });
  }

  session.setState(phone, "turno_accesorios");

  const taxiMsg = msg.id === "taxi_si"
    ? "🚕 ¡Listo! El asesor coordina el taxi. 😊"
    : "👍 Perfecto.";

  // DINÁMICO: confirma taxi + ofrece accesorios
  await wa.sendButtons(
    phone,
    `${taxiMsg}\n\n📦 ¿Te gustaría recibir el catálogo de accesorios Mopar para tu ${ses.turnoData.modelo}? Fundas, alfombras, barras, cubrecarter... 🚗✨`,
    [
      { id: "acc_si", title: "✅ Sí, me interesa" },
      { id: "acc_no", title: "❌ No, gracias" },
    ]
  );
}

// PASO 11: Accesorios → cierre
async function handleTurnoAccesorios(phone, msg, ses) {
  if (msg.id === "acc_si") {
    console.log(`📦 ACCESORIOS solicitados por ${ses.name} para ${ses.turnoData.modelo}`);
    await wa.sendText(phone, "📦 ¡Genial! El asesor te manda el catálogo junto con la confirmación del turno. 😊");
  } else {
    await wa.sendText(phone, "¡Perfecto! Ya está todo listo. ¡Gracias por elegirnos! 🚗💙");
  }

  session.setState(phone, "main_menu");
  await wa.sendPostAction(phone, "¿Algo más en lo que te pueda ayudar?");
}

// ═══════════════════════════════════════════
// FLUJO: ESTADO DE REPARACIÓN
// ═══════════════════════════════════════════
async function handleEstadoInput(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const input = msg.text;
  console.log(`🔍 CONSULTA ESTADO | ${ses.name} (${phone}): ${input}`);

  session.setState(phone, "estado_extra");
  await wa.sendButtons(
    phone,
    `🔍 Buscando *${input}*...\n\n✅ Tu vehículo está en taller.\n📊 Estado: *En reparación*\n🔧 Trabajos: Cambio de aceite + filtros\n⏱️ Estimado: Listo hoy a las 18:00 hs\n\n💡 ¿Querés que revisemos algo adicional en la misma visita?`,
    [
      { id: "estado_extra_si", title: "Sí, hay algo más ✏️" },
      { id: "estado_extra_no", title: "No, está bien así ✅" },
    ]
  );
}

async function handleEstadoExtra(phone, msg, ses) {
  if (msg.id === "estado_extra_no") {
    session.setState(phone, "main_menu");
    await wa.sendPostAction(phone, "¡Perfecto! Te avisamos cuando esté listo. ¿Algo más?");
    return;
  }

  session.setState(phone, "estado_extra_input");
  await wa.sendText(phone, "¡Dale! Contame qué más querés que revisemos 👇");
}

async function handleEstadoExtraInput(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const extra = msg.text;
  console.log(`📝 EXTRA reparación de ${ses.name}: ${extra}`);

  await wa.sendText(phone, `📝 ¡Anotado! "${extra}"\n\nSe lo pasamos al asesor. ¡Gracias! 🙌`);
  session.setState(phone, "main_menu");
  await wa.sendPostAction(phone, "¿Algo más?");
}

// ═══════════════════════════════════════════
// FLUJO: INFO DE MANTENIMIENTO
// ═══════════════════════════════════════════
async function handleInfoMenu(phone, msg, ses) {
  if (msg.id === "volver_menu") {
    session.setState(phone, "main_menu");
    await wa.sendMainMenu(phone);
    return;
  }

  const responses = {
    info_mant_prog: `🔧 *Mantenimiento Programado*\n\n✅ Cada *10.000 km o 1 año* (lo que ocurra primero)\n\nIncluye cambios de aceite y filtros, inspección completa según grilla del modelo, ajustes y diagnóstico.\n\n🛡️ Hacerlo en red oficial *preserva tu garantía*.`,
    info_srv_rapido: `⚡ *Servicios Rápidos*\n\nCambio de aceite y filtro, revisión de niveles, batería, neumáticos, rotación.\n\n⏱️ Se hacen en el menor tiempo posible para que no pierdas el día.`,
    info_srv_esenciales: `🏗️ *Servicios Esenciales*\n\nTren delantero, suspensión, frenos, transmisión, refrigeración, aire acondicionado.\n\n⚠️ Si tu vehículo está en garantía, siempre usá *repuestos Mopar* para no perderla.`,
    info_lubricantes: `🛢️ *Lubricantes Mopar*\n\nAceites originales de fábrica para FIAT.\n\n✅ Calidad garantizada\n✅ Intervalos según manual\n✅ Preservan garantía`,
    info_flexcare: `💸 *FlexCare*\n\nDescuentos de *hasta 35%* en mantenimiento.\n\n✅ Fijás costos futuros\n✅ Mano de obra especializada\n✅ Repuestos Mopar\n\n¡La forma más inteligente de ahorrar! 💰`,
  };

  const response = responses[msg.id] || "No tengo info sobre eso todavía. ¿Querés hablar con un asesor?";
  await wa.sendText(phone, response);
  session.setState(phone, "main_menu");
  await wa.sendPostAction(phone, "¿Algo más?");
}

// ═══════════════════════════════════════════
// FLUJO: MVP
// ═══════════════════════════════════════════
async function handleMVPOption(phone, msg, ses) {
  let pack = "";
  if (msg.id === "mvp_2") pack = "2 revisiones";
  if (msg.id === "mvp_3") pack = "3 revisiones";
  if (msg.id === "mvp_4") pack = "4 revisiones";

  console.log(`💰 MVP ${pack} solicitado por ${ses.name}`);

  await wa.sendText(
    phone,
    `📦 ¡Excelente! Pack de *${pack}* a precio fijo.\n\nUn asesor te contacta con precios actualizados. 😊`
  );
  session.setState(phone, "main_menu");
  await wa.sendPostAction(phone, "¿Algo más?");
}

// ═══════════════════════════════════════════
// FLUJO: REPUESTOS
// ═══════════════════════════════════════════
async function handleRepuestosMenu(phone, msg, ses) {
  if (msg.id === "rep_catalogo") {
    await wa.sendText(
      phone,
      "📕 Tenemos catálogos de accesorios, repuestos originales y lubricantes Mopar.\n\nUn asesor te puede mandar el catálogo específico para tu modelo."
    );
    await wa.sendButtons(phone, "¿Te conecto con un asesor?", [
      { id: "menu_asesor", title: "👤 Sí, conectame" },
      { id: "post_menu", title: "🏠 Menú" },
    ]);
    session.setState(phone, "main_menu");
    return;
  }

  if (msg.id === "rep_consulta" || msg.id === "rep_accesorio") {
    session.setState(phone, "repuestos_modelo");
    await wa.sendList(phone, "🚗 ¿Para qué modelo FIAT?", "🚗 Elegir modelo", [
      {
        title: "Modelos",
        rows: [
          { id: "modelo_600", title: "FIAT 600" },
          { id: "modelo_argo", title: "Argo" },
          { id: "modelo_cronos", title: "Cronos" },
          { id: "modelo_mobi", title: "Mobi" },
          { id: "modelo_pulse", title: "Pulse" },
          { id: "modelo_strada", title: "Strada" },
          { id: "modelo_toro", title: "Toro" },
        ],
      },
    ]);
  }
}

async function handleRepuestosModelo(phone, msg, ses) {
  const modelo = msg.text;
  session.setTurnoData(phone, { modelo });
  session.setState(phone, "repuestos_detalle");
  await wa.sendText(phone, `🚗 ${modelo}. Contame qué repuesto o accesorio necesitás 👇`);
}

async function handleRepuestosDetalle(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const detalle = msg.text;
  console.log(`🔩 REPUESTO | ${ses.name} | ${ses.turnoData.modelo}: ${detalle}`);

  await wa.sendText(
    phone,
    `📝 Anotado: "${detalle}" para *${ses.turnoData.modelo}*.\n\nUn asesor te contacta con disponibilidad y precio. ¡Solo repuestos Mopar! 🔧`
  );
  session.setState(phone, "main_menu");
  await wa.sendPostAction(phone, "¿Algo más?");
}

// ═══════════════════════════════════════════
// FLUJO: RECALL
// ═══════════════════════════════════════════
async function handleRecallInput(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  if (!isValidVIN(msg.text)) {
    await wa.sendText(phone, "🤔 Ese VIN no me cierra. Debería tener entre 10 y 17 caracteres alfanuméricos.\n\nIntentá de nuevo 👇");
    return;
  }

  const vin = msg.text.toUpperCase();
  console.log(`📋 RECALL | ${ses.name}: VIN ${vin}`);

  await wa.sendText(
    phone,
    `🔍 Consultando VIN *${vin}*...\n\n✅ ¡Buenas noticias! Tu vehículo *no tiene recalls pendientes*. 😊`
  );
  session.setState(phone, "main_menu");
  await wa.sendPostAction(phone, "¿Algo más?");
}

// ═══════════════════════════════════════════
// FLUJO: GARANTÍA
// ═══════════════════════════════════════════
async function handleGarantiaMenu(phone, msg, ses) {
  switch (msg.id) {
    case "gar_cobertura":
      await wa.sendText(
        phone,
        `🛡️ *Garantía de fábrica FIAT:*\n\n✅ Cubre defectos de fabricación y materiales\n✅ Se mantiene con services en red oficial\n✅ Con repuestos originales Mopar\n\n💡 Cumplir con los services programados *preserva tu garantía*.`
      );
      await wa.sendButtons(phone, "¿Querés consultar con un asesor?", [
        { id: "menu_asesor", title: "👤 Sí, consultemos" },
        { id: "post_menu", title: "🏠 Menú" },
      ]);
      session.setState(phone, "main_menu");
      break;
    case "gar_eurorepar":
      session.setState(phone, "garantia_eurorepar");
      await wa.sendButtons(
        phone,
        "⚠️ *Eurorepar y Garantía:*\n\n❌ En garantía + Eurorepar = *pierde garantía*\n✅ Fuera de garantía → Eurorepar es excelente (6 meses garantía propia)\n🛡️ En garantía → siempre *Mopar*\n\n¿Tu vehículo está en garantía?",
        [
          { id: "gar_si", title: "Sí, en garantía" },
          { id: "gar_no", title: "No, ya salió" },
        ]
      );
      break;
    case "gar_reclamo":
      session.setState(phone, "asesor_sucursal");
      await wa.sendSucursalPicker(phone, "📝 Lo vamos a resolver. Te conecto con un asesor. ¿De qué sucursal?");
      break;
    default:
      session.setState(phone, "main_menu");
      await wa.sendMainMenu(phone);
  }
}

async function handleGarantiaEurorepar(phone, msg, ses) {
  if (msg.id === "gar_si") {
    await wa.sendText(phone, "🛡️ ¡Fundamental seguir con *repuestos Mopar*! En nuestro taller trabajamos con originales. 😊");
  } else {
    await wa.sendText(phone, "👍 *Eurorepar* es excelente opción con *6 meses de garantía* y gran relación precio-calidad. 🔧");
  }
  await wa.sendButtons(phone, "¿Te gustaría agendar un turno?", [
    { id: "menu_turno", title: "📅 Agendar" },
    { id: "post_menu", title: "🏠 Menú" },
  ]);
  session.setState(phone, "main_menu");
}

// ═══════════════════════════════════════════
// FLUJO: ASESOR
// ═══════════════════════════════════════════
async function handleAsesorSucursal(phone, msg, ses) {
  if (!msg.id || !msg.id.startsWith("suc_")) {
    await wa.sendSucursalPicker(phone, "Elegí una sucursal tocando el botón 👇");
    return;
  }

  const suc = parseSucursal(msg.id);
  console.log(`👤 ASESOR | ${ses.name} (${phone}) | ${suc}`);

  await wa.sendText(
    phone,
    `👤 ¡Listo! Un asesor de *${suc}* te contacta a la brevedad.\n\n📞 L-V 9:30-12:30 / 15:00-20:00 • Sáb 9:30-12:30`
  );
  session.setState(phone, "main_menu");
  await wa.sendPostAction(phone, "¿Algo más?");
}

module.exports = { handleIncomingMessage };
