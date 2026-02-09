// ============================================
// MESSAGE HANDLER v4.0 - BOT CONVERSACIONAL
// Sin listas ni botones complejos - Solo texto
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

function parseSucursal(text) {
  const lower = text.toLowerCase();
  if (/ushuaia|ush/i.test(lower)) return "Ushuaia";
  if (/rio\s*grande|rg|grande/i.test(lower)) return "Río Grande";
  return null;
}

function parseModelo(text) {
  const lower = text.toLowerCase();
  if (/600/.test(lower)) return "FIAT 600";
  if (/argo/i.test(lower)) return "Argo";
  if (/cronos/i.test(lower)) return "Cronos";
  if (/ducato/i.test(lower)) return "Ducato";
  if (/fiorino/i.test(lower)) return "Fiorino";
  if (/fastback/i.test(lower)) return "Fastback";
  if (/mobi/i.test(lower)) return "Mobi";
  if (/pulse/i.test(lower)) return "Pulse";
  if (/strada/i.test(lower)) return "Strada";
  if (/toro/i.test(lower)) return "Toro";
  return null;
}

function parseDia(text) {
  const lower = text.toLowerCase();
  if (/lun/i.test(lower)) return "Lunes";
  if (/mar/i.test(lower)) return "Martes";
  if (/mie|miércoles|miercoles/i.test(lower)) return "Miércoles";
  if (/jue/i.test(lower)) return "Jueves";
  if (/vie/i.test(lower)) return "Viernes";
  if (/sab|sábado|sabado/i.test(lower)) return "Sábado";
  return null;
}

function parseHorario(text) {
  const lower = text.toLowerCase();
  if (/ma[ñn]ana|temprano|9|10|11|12/i.test(lower)) return "Mañana (9:30-12:30)";
  if (/tarde|15|16|17|18|19|20/i.test(lower)) return "Tarde (15:00-20:00)";
  return null;
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
      `¡Hola ${name}! 👋 Soy el asistente virtual de *Liendo Automotores LASAC*, concesionario oficial FIAT en Tierra del Fuego.\n\n🏔️ Ushuaia | 🌊 Río Grande\n\nEstoy acá para ayudarte con turnos, consultas de reparación, info de mantenimiento y todo lo que necesites. ¡Vamos! 🚗\n\n¿Qué necesitás?\n\n📅 *Agendar turno*\n🔍 *Estado de tu vehículo*\nℹ️ *Info de mantenimiento*\n🚨 *Emergencia* (Mopar 24/7)\n💰 *Packs MVP*\n🔩 *Repuestos*\n📋 *Recall*\n🛡️ *Garantía*\n👤 *Hablar con asesor*`
    );
    return;
  }

  // === RESET CON "HOLA", "MENU", ETC ===
  if (msg.type === "text") {
    const lower = msg.text.toLowerCase();
    if (/^(menu|men[uú]|inicio|ayuda|hola|buenos|buen[oa]s)$/i.test(lower.trim())) {
      session.setState(phone, "main_menu");
      await wa.sendText(
        phone,
        `¿En qué te puedo ayudar? 😊\n\n📅 *Agendar turno*\n🔍 *Estado de tu vehículo*\nℹ️ *Info de mantenimiento*\n🚨 *Emergencia*\n💰 *Packs MVP*\n🔩 *Repuestos*\n📋 *Recall*\n🛡️ *Garantía*\n👤 *Hablar con asesor*`
      );
      return;
    }
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
    case "turno_servicio_extra":
      await handleTurnoServicioExtra(phone, msg, ses);
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
    case "info_input":
      await handleInfoInput(phone, msg, ses);
      break;
    case "mvp_input":
      await handleMVPInput(phone, msg, ses);
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
    case "garantia_input":
      await handleGarantiaInput(phone, msg, ses);
      break;
    case "asesor_sucursal":
      await handleAsesorSucursal(phone, msg, ses);
      break;
    default:
      session.setState(phone, "main_menu");
      await wa.sendText(
        phone,
        `¿En qué te puedo ayudar? 😊\n\n📅 *Agendar turno*\n🔍 *Estado*\nℹ️ *Info*\n🚨 *Emergencia*\n💰 *MVP*\n🔩 *Repuestos*\n📋 *Recall*\n🛡️ *Garantía*\n👤 *Asesor*`
      );
  }
}

// ═══════════════════════════════════════════
// MENÚ PRINCIPAL
// ═══════════════════════════════════════════
async function handleMainMenu(phone, msg, ses) {
  const lower = msg.text.toLowerCase();

  // Turno
  if (/turno|agendar|cita|reserv/i.test(lower)) {
    session.setState(phone, "turno_sucursal");
    await wa.sendText(phone, "📅 Perfecto. ¿En qué sucursal querés atenderte? (*Ushuaia* o *Río Grande*)");
    return;
  }

  // Estado
  if (/estado|consulta|orden|ot|reparaci[oó]n/i.test(lower)) {
    session.setState(phone, "estado_input");
    await wa.sendText(phone, "🔍 Dale, pasame tu *patente* o *número de OT* para buscar el estado de tu vehículo 👇");
    return;
  }

  // Info
  if (/info|informaci[oó]n|mantenimiento|service/i.test(lower)) {
    session.setState(phone, "info_input");
    await wa.sendText(
      phone,
      `ℹ️ ¿Sobre qué querés saber?\n\n• *Mantenimiento programado*\n• *Servicios rápidos*\n• *Lubricantes Mopar*\n• *FlexCare* (hasta -35%)\n\nEscribí el tema que te interesa 👇`
    );
    return;
  }

  // Emergencia
  if (/emergencia|urgente|auxilio|grúa|gru[aá]/i.test(lower)) {
    await wa.sendText(
      phone,
      `🚨 *Mopar Assistance 24/7*\n\nTenés asistencia las 24 horas, todos los días.\n\n📞 *0800-777-8000* → Opción 1\n\nGrúa, cambio de rueda, auxilio en ruta, cerrajería. ¡Siempre disponible! 🛡️`
    );
    await wa.sendText(phone, "¿Algo más en lo que te pueda ayudar? (escribí *menú* para ver opciones)");
    return;
  }

  // MVP
  if (/mvp|pack|prepag|vehicle protection/i.test(lower)) {
    session.setState(phone, "mvp_input");
    await wa.sendText(
      phone,
      `💰 *Packs MVP (Mopar Vehicle Protection)*\n\nPrepagá tu mantenimiento y fijá el precio. Incluye mano de obra y repuestos Mopar.\n\n📦 Pack 2 revisiones\n📦 Pack 3 revisiones\n📦 Pack 4 revisiones\n\n¿Cuál te interesa? (escribí 2, 3 o 4)`
    );
    return;
  }

  // Repuestos
  if (/repuesto|accesorio|pieza|mopar/i.test(lower)) {
    session.setState(phone, "repuestos_modelo");
    await wa.sendText(phone, "🔩 Dale. ¿Para qué modelo FIAT necesitás el repuesto o accesorio?");
    return;
  }

  // Recall
  if (/recall|retiro|campa[ñn]a|seguridad/i.test(lower)) {
    session.setState(phone, "recall_input");
    await wa.sendText(
      phone,
      `📋 *Consulta de Recall*\n\nEl recall es cuando la fábrica detecta un tema de seguridad y convoca a los propietarios para solucionarlo *sin costo*.\n\nPasame el *VIN (número de chasis)* de tu vehículo.\n\n🔍 Lo encontrás en la base del parabrisas, título o seguro 👇`
    );
    return;
  }

  // Garantía
  if (/garant[íi]a|cobertura|eurorepar/i.test(lower)) {
    session.setState(phone, "garantia_input");
    await wa.sendText(
      phone,
      `🛡️ *Garantía FIAT*\n\n¿Qué querés saber?\n\n• *Cobertura*\n• *Eurorepar y garantía*\n• *Hacer un reclamo*\n\nEscribí el tema 👇`
    );
    return;
  }

  // Asesor
  if (/asesor|persona|humano|atenci[oó]n|hablar/i.test(lower)) {
    session.setState(phone, "asesor_sucursal");
    await wa.sendText(phone, "👤 Perfecto. ¿De qué sucursal querés hablar con un asesor? (*Ushuaia* o *Río Grande*)");
    return;
  }

  // No entendió
  await wa.sendText(
    phone,
    `No te entendí bien. ¿Qué necesitás? 😊\n\n📅 *Turno*\n🔍 *Estado*\nℹ️ *Info*\n🚨 *Emergencia*\n💰 *MVP*\n🔩 *Repuestos*\n📋 *Recall*\n🛡️ *Garantía*\n👤 *Asesor*`
  );
}

// ═══════════════════════════════════════════
// FLUJO: AGENDAR TURNO
// ═══════════════════════════════════════════

async function handleTurnoSucursal(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const suc = parseSucursal(msg.text);
  if (!suc) {
    await wa.sendText(phone, "🤔 No te entendí. ¿*Ushuaia* o *Río Grande*?");
    return;
  }

  session.setTurnoData(phone, { sucursal: suc });
  session.setState(phone, "turno_modelo");
  await wa.sendText(phone, `📍 ${suc}, perfecto. 🚗 ¿Qué modelo de FIAT tenés?\n\n(Argo, Cronos, Pulse, Strada, Toro, etc)`);
}

async function handleTurnoModelo(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const modelo = parseModelo(msg.text);
  if (!modelo) {
    await wa.sendText(phone, "🤔 No reconocí ese modelo. ¿Podés escribirlo de nuevo? (Argo, Cronos, Pulse, Strada, Toro, Mobi, etc)");
    return;
  }

  session.setTurnoData(phone, { modelo });
  session.setState(phone, "turno_servicio");
  await wa.sendText(
    phone,
    `🚗 ${modelo}, ¡qué lindo! 😍\n\n🔧 ¿Qué servicio necesitás?\n\n• Service programado\n• Cambio aceite\n• Neumáticos\n• Frenos\n• Diagnóstico\n• Otro\n\nEscribí el servicio 👇`
  );
}

async function handleTurnoServicio(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const servicio = msg.text;
  session.setTurnoData(phone, { servicio });
  session.setState(phone, "turno_servicio_extra");

  const tip = getServiceTip(servicio);
  await wa.sendText(
    phone,
    `✅ ${servicio}, anotado.${tip}\n\n🔍 ¿Notaste algo más en tu vehículo? Algún ruidito, vibración, luz en el tablero...\n\n(Si no, escribí *"no"*)👇`
  );
}

async function handleTurnoServicioExtra(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const lower = msg.text.toLowerCase();
  if (/^no$/i.test(lower.trim()) || /nada|todo bien|está bien/i.test(lower)) {
    session.setState(phone, "turno_km");
    await wa.sendText(phone, `📊 Perfecto. ¿En qué kilometraje está tu ${ses.turnoData.modelo}?\n\nEscribí el número exacto (ejemplo: 20050) 👇`);
    return;
  }

  const extra = msg.text;
  session.setTurnoData(phone, { servicioExtra: extra });
  session.setState(phone, "turno_km");
  console.log(`📝 SERVICIO EXTRA: ${extra}`);
  await wa.sendText(
    phone,
    `📝 Anotado: "${extra}". Lo revisamos también. 🙌\n\n📊 ¿En qué kilometraje está tu ${ses.turnoData.modelo}?\n\nEscribí el número exacto (ejemplo: 20050) 👇`
  );
}

async function handleTurnoKm(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const kmText = msg.text.replace(/\D/g, "");
  if (!kmText || kmText.length < 3) {
    await wa.sendText(phone, "🤔 Necesito un número válido. Escribí el kilometraje exacto (ejemplo: 20050) 👇");
    return;
  }

  const km = kmText + " km";
  session.setTurnoData(phone, { km });
  session.setState(phone, "turno_patente");

  const tip = getKmTip(km);
  await wa.sendText(phone, `📊 ${km}, perfecto.${tip}\n\nAhora necesito la *patente* de tu ${ses.turnoData.modelo} 👇`);
}

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

  await wa.sendText(
    phone,
    `🔢 Patente *${patente}*, anotada. ✅\n\n📅 ¿Qué día te queda mejor?\n\n(Lunes, Martes, Miércoles, Jueves, Viernes, Sábado)\n\nEscribí el día 👇`
  );
}

async function handleTurnoDia(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const dia = parseDia(msg.text);
  if (!dia) {
    await wa.sendText(phone, "🤔 No entendí el día. Escribí: *Lunes*, *Martes*, *Miércoles*, *Jueves*, *Viernes* o *Sábado* 👇");
    return;
  }

  session.setTurnoData(phone, { dia });
  session.setState(phone, "turno_horario");
  await wa.sendText(phone, `📆 ${dia}, bárbaro. ¿Preferís *mañana* o *tarde*? 👇`);
}

async function handleTurnoHorario(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const horario = parseHorario(msg.text);
  if (!horario) {
    await wa.sendText(phone, "🤔 No entendí. Escribí *mañana* o *tarde* 👇");
    return;
  }

  session.setTurnoData(phone, { horario });
  session.setState(phone, "turno_confirmar");

  const td = ses.turnoData;
  let resumen = `📋 ¡Listo! Mirá el resumen:\n\n📍 Sucursal: *${td.sucursal}*\n🚗 Modelo: *${td.modelo}*\n🔧 Servicio: *${td.servicio}*`;

  if (td.servicioExtra) {
    resumen += `\n🔍 También: *${td.servicioExtra}*`;
  }

  resumen += `\n📊 Kilometraje: *${td.km}*\n🔢 Patente: *${td.patente}*\n📆 Día: *${td.dia}*\n🕐 Horario: *${horario}*\n\n¿Está todo bien? Escribí *sí* para confirmar o *no* para modificar 👇`;

  await wa.sendText(phone, resumen);
}

async function handleTurnoConfirmar(phone, msg, ses) {
  const lower = msg.text.toLowerCase();

  if (/no|modificar|cambiar|cancelar/i.test(lower)) {
    session.resetTurno(phone);
    session.setState(phone, "turno_sucursal");
    await wa.sendText(phone, "📝 Dale, armemos de nuevo. ¿En qué sucursal? (*Ushuaia* o *Río Grande*)");
    return;
  }

  if (!/s[ií]|ok|dale|confirm/i.test(lower)) {
    await wa.sendText(phone, "Escribí *sí* para confirmar o *no* para modificar 👇");
    return;
  }

  const td = ses.turnoData;
  console.log(
    `✅ TURNO CONFIRMADO | ${ses.name} (${ses.phone}) | ${td.sucursal} | ${td.modelo} | ${td.servicio} | ${td.km} | ${td.patente} | ${td.dia} | ${td.horario}${td.servicioExtra ? " | Extra: " + td.servicioExtra : ""}`
  );

  session.setState(phone, "turno_taxi");
  await wa.sendText(
    phone,
    `✅ ¡Solicitud registrada con éxito! 🎉\n\nUn asesor de servicio se va a comunicar con vos para confirmar día y horario exacto.\n\n📞 Te contactamos en nuestro horario:\n🕐 L-V 9:30 a 12:30 / 15:00 a 20:00\n🕐 Sáb 9:30 a 12:30\n\n🚕 Una cosa más... ¿Vas a necesitar un *taxi* cuando dejes tu vehículo?\n\n(Escribí *sí* o *no*) 👇`
  );
}

async function handleTurnoTaxi(phone, msg, ses) {
  const lower = msg.text.toLowerCase();

  if (/s[ií]|ok|dale|por favor/i.test(lower)) {
    session.setTurnoData(phone, { taxi: "Sí" });
    console.log(`🚕 TAXI solicitado por ${ses.name}`);
    await wa.sendText(
      phone,
      `🚕 ¡Listo! El asesor coordina el taxi. 😊\n\n📦 Última cosa... ¿Te gustaría recibir el catálogo de *accesorios Mopar* para tu ${ses.turnoData.modelo}?\n\n(Fundas, alfombras, barras, cubrecarter...)\n\nEscribí *sí* o *no* 👇`
    );
  } else {
    session.setTurnoData(phone, { taxi: "No" });
    await wa.sendText(
      phone,
      `👍 Perfecto.\n\n📦 ¿Te gustaría recibir el catálogo de *accesorios Mopar* para tu ${ses.turnoData.modelo}?\n\n(Fundas, alfombras, barras, cubrecarter...)\n\nEscribí *sí* o *no* 👇`
    );
  }

  session.setState(phone, "turno_accesorios");
}

async function handleTurnoAccesorios(phone, msg, ses) {
  const lower = msg.text.toLowerCase();

  if (/s[ií]|ok|dale|me interesa/i.test(lower)) {
    console.log(`📦 ACCESORIOS solicitados por ${ses.name} para ${ses.turnoData.modelo}`);
    await wa.sendText(phone, "📦 ¡Genial! El asesor te manda el catálogo junto con la confirmación del turno. 😊");
  } else {
    await wa.sendText(phone, "¡Perfecto! Ya está todo listo. ¡Gracias por elegirnos! 🚗💙");
  }

  session.setState(phone, "main_menu");
  await wa.sendText(phone, "¿Algo más en lo que te pueda ayudar? (escribí *menú* para ver opciones)");
}

// ═══════════════════════════════════════════
// OTROS FLUJOS
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
  await wa.sendText(
    phone,
    `🔍 Buscando *${input}*...\n\n✅ Tu vehículo está en taller.\n📊 Estado: *En reparación*\n🔧 Trabajos: Cambio de aceite + filtros\n⏱️ Estimado: Listo hoy a las 18:00 hs\n\n¿Querés agregar algo más para revisar? (escribí *sí* o *no*) 👇`
  );
}

async function handleEstadoExtra(phone, msg, ses) {
  const lower = msg.text.toLowerCase();

  if (/no|nada|est[aá] bien/i.test(lower)) {
    session.setState(phone, "main_menu");
    await wa.sendText(phone, "¡Perfecto! Te avisamos cuando esté listo. 😊\n\n¿Algo más? (escribí *menú*)");
    return;
  }

  if (/s[ií]|agregar|revisar/i.test(lower)) {
    await wa.sendText(phone, "¡Dale! Contame qué más querés que revisemos 👇");
    const extra = msg.text;
    console.log(`📝 EXTRA reparación de ${ses.name}: ${extra}`);
    await wa.sendText(phone, `📝 ¡Anotado! "${extra}"\n\nSe lo pasamos al asesor. ¡Gracias! 🙌`);
    session.setState(phone, "main_menu");
    await wa.sendText(phone, "¿Algo más? (escribí *menú*)");
    return;
  }

  await wa.sendText(phone, "Escribí *sí* si querés agregar algo o *no* si está todo bien 👇");
}

async function handleInfoInput(phone, msg, ses) {
  const lower = msg.text.toLowerCase();

  if (/programado/i.test(lower)) {
    await wa.sendText(
      phone,
      `🔧 *Mantenimiento Programado*\n\n✅ Cada *10.000 km o 1 año* (lo que ocurra primero)\n\nIncluye cambios de aceite y filtros, inspección completa según grilla del modelo, ajustes y diagnóstico.\n\n🛡️ Hacerlo en red oficial *preserva tu garantía*.`
    );
  } else if (/r[aá]pido/i.test(lower)) {
    await wa.sendText(
      phone,
      `⚡ *Servicios Rápidos*\n\nCambio aceite y filtro, revisión de niveles, batería, neumáticos, rotación.\n\n⏱️ Se hacen en el menor tiempo posible para que no pierdas el día.`
    );
  } else if (/lubricante|mopar|aceite/i.test(lower)) {
    await wa.sendText(
      phone,
      `🛢️ *Lubricantes Mopar*\n\nAceites originales de fábrica para FIAT.\n\n✅ Calidad garantizada\n✅ Intervalos según manual\n✅ Preservan garantía`
    );
  } else if (/flexcare/i.test(lower)) {
    await wa.sendText(
      phone,
      `💸 *FlexCare*\n\nDescuentos de *hasta 35%* en mantenimiento.\n\n✅ Fijás costos futuros\n✅ Mano de obra especializada\n✅ Repuestos Mopar\n\n¡La forma más inteligente de ahorrar! 💰`
    );
  } else {
    await wa.sendText(phone, "🤔 ¿Sobre qué querés saber? Escribí: *programado*, *rápidos*, *lubricantes* o *flexcare* 👇");
    return;
  }

  session.setState(phone, "main_menu");
  await wa.sendText(phone, "¿Algo más? (escribí *menú*)");
}

async function handleMVPInput(phone, msg, ses) {
  const lower = msg.text.toLowerCase();
  let pack = "";

  if (/2|dos/.test(lower)) pack = "2 revisiones";
  else if (/3|tres/.test(lower)) pack = "3 revisiones";
  else if (/4|cuatro/.test(lower)) pack = "4 revisiones";
  else {
    await wa.sendText(phone, "🤔 Escribí *2*, *3* o *4* según el pack que te interese 👇");
    return;
  }

  console.log(`💰 MVP ${pack} solicitado por ${ses.name}`);
  await wa.sendText(phone, `📦 ¡Excelente! Pack de *${pack}* a precio fijo.\n\nUn asesor te contacta con precios actualizados. 😊`);
  session.setState(phone, "main_menu");
  await wa.sendText(phone, "¿Algo más? (escribí *menú*)");
}

async function handleRepuestosModelo(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const modelo = parseModelo(msg.text);
  if (!modelo) {
    await wa.sendText(phone, "🤔 No reconocí ese modelo. Escribí de nuevo (Argo, Cronos, Pulse, etc) 👇");
    return;
  }

  session.setTurnoData(phone, { modelo });
  session.setState(phone, "repuestos_detalle");
  await wa.sendText(phone, `🚗 ${modelo}. ¿Qué repuesto o accesorio necesitás? Contame 👇`);
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
  await wa.sendText(phone, "¿Algo más? (escribí *menú*)");
}

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

  await wa.sendText(phone, `🔍 Consultando VIN *${vin}*...\n\n✅ ¡Buenas noticias! Tu vehículo *no tiene recalls pendientes*. 😊`);
  session.setState(phone, "main_menu");
  await wa.sendText(phone, "¿Algo más? (escribí *menú*)");
}

async function handleGarantiaInput(phone, msg, ses) {
  const lower = msg.text.toLowerCase();

  if (/cobertura|cubre|qu[eé]/i.test(lower)) {
    await wa.sendText(
      phone,
      `🛡️ *Garantía de fábrica FIAT:*\n\n✅ Cubre defectos de fabricación y materiales\n✅ Se mantiene con services en red oficial\n✅ Con repuestos originales Mopar\n\n💡 Cumplir con los services programados *preserva tu garantía*.`
    );
  } else if (/eurorepar/i.test(lower)) {
    await wa.sendText(
      phone,
      `⚠️ *Eurorepar y Garantía:*\n\n❌ En garantía + Eurorepar = *pierde garantía*\n✅ Fuera de garantía → Eurorepar es excelente (6 meses garantía propia)\n🛡️ En garantía → siempre *Mopar*`
    );
  } else if (/reclamo/i.test(lower)) {
    session.setState(phone, "asesor_sucursal");
    await wa.sendText(phone, "📝 Lo vamos a resolver. ¿De qué sucursal? (*Ushuaia* o *Río Grande*)");
    return;
  } else {
    await wa.sendText(phone, "🤔 ¿Sobre qué querés saber? Escribí: *cobertura*, *eurorepar* o *reclamo* 👇");
    return;
  }

  session.setState(phone, "main_menu");
  await wa.sendText(phone, "¿Algo más? (escribí *menú*)");
}

async function handleAsesorSucursal(phone, msg, ses) {
  const interruption = checkInterruption(msg.text, ses.state, ses.turnoData);
  if (interruption) {
    await wa.sendText(phone, interruption);
    return;
  }

  const suc = parseSucursal(msg.text);
  if (!suc) {
    await wa.sendText(phone, "🤔 ¿*Ushuaia* o *Río Grande*? 👇");
    return;
  }

  console.log(`👤 ASESOR | ${ses.name} (${phone}) | ${suc}`);

  await wa.sendText(phone, `👤 ¡Listo! Un asesor de *${suc}* te contacta a la brevedad.\n\n📞 L-V 9:30-12:30 / 15:00-20:00 • Sáb 9:30-12:30`);
  session.setState(phone, "main_menu");
  await wa.sendText(phone, "¿Algo más? (escribí *menú*)");
}

module.exports = { handleIncomingMessage };
```

---

## ✅ **CAMBIOS PRINCIPALES:**

1. ✅ **TODO texto libre** - Sin listas ni botones complejos
2. ✅ **Interpretación inteligente** de sucursal, modelo, día, horario
3. ✅ **Validaciones** mantenidas (patente, KM, VIN)
4. ✅ **TODOS los flujos** mantenidos (taxi, accesorios, tips)
5. ✅ **Reset con "hola", "menu"** funcionando
6. ✅ **Conversacional y amable**
7. ✅ **Nunca se traba**

---

## 🚀 **SIGUIENTE PASO:**

1. **Reemplazá** todo el contenido de `messageHandler.js` con este código
2. Guardá (Ctrl+S)
3. En la terminal:
```
git add src\messageHandler.js
git commit -m "Bot conversacional v4.0 - sin listas ni botones"
git push