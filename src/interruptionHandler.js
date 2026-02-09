// ============================================
// DETECTOR DE INTERRUPCIONES v3.0
// Responde preguntas en medio de un flujo
// sin perder el estado de la conversación
// ============================================

const QUESTION_PATTERNS = [
  /\bqu[eé]\s+(es|son|significa|quiere decir|incluye|cubre|cuesta|sale|vale)\b/i,
  /\bc[oó]mo\s+(funciona|es|hago|puedo|se|llego)\b/i,
  /\bcu[aá]nto\s+(sale|cuesta|vale|tarda|demora|dura|tiempo)\b/i,
  /\bcu[aá]l\s+(es|son)\b/i,
  /\bd[oó]nde\s+(est[aá]|queda|lo encuentro)\b/i,
  /\bpor\s*qu[eé]\b/i,
  /\bcu[aá]ndo\b/i,
  /\bse puede\b/i,
  /\btienen\b/i,
  /\bhacen\b/i,
  /\bofrecen\b/i,
  /\baceptan\b/i,
  /\bnecesito saber\b/i,
  /\bme (pod[eé]s|pueden) (decir|explicar|contar)\b/i,
  /\?$/,
];

const TEXT_INPUT_STATES = [
  "turno_patente",
  "turno_otro_servicio",
  "turno_servicio_extra_input",
  "estado_input",
  "estado_extra_input",
  "recall_input",
  "repuestos_detalle",
];

const QUICK_ANSWERS = {
  flexcare: `💸 *FlexCare* es un programa exclusivo de FIAT que te ofrece *descuentos de hasta 35%* en el mantenimiento de tu vehículo.\n\nEs la forma más inteligente de ahorrar sin resignar calidad ni garantía. ¡Un golazo! ⚽\n\nUn asesor te puede dar todos los detalles de cómo activarlo para tu modelo.`,
  mantenimiento: `🔧 El *mantenimiento programado* son las revisiones periódicas según lo que indica la fábrica.\n\n📋 Se hace cada *10.000 km o 1 año* (lo que ocurra primero).\n✅ Incluye: cambios de aceite y filtros, inspección completa según grilla del modelo, ajustes y diagnóstico.\n\n🛡️ Cumplir con estos services en la red oficial *preserva tu garantía*.`,
  mvp: `💰 *MVP (Mopar Vehicle Protection)* son packs prepagos de mantenimiento a precio fijo.\n\n📦 Podés comprar packs de 2, 3 o 4 revisiones anticipadas.\n✅ Incluye mano de obra especializada y repuestos originales Mopar con garantía de fábrica.\n💡 Beneficio: fijás el costo futuro y planificás tu gasto de mantenimiento.`,
  horario: `⏰ *Horarios de atención*:\n\n📅 Lunes a Viernes: 9:30 a 12:30 / 15:00 a 20:00\n📅 Sábados: 9:30 a 12:30\n🚫 Domingos: cerrado\n\n🏔️ Ushuaia | 🌊 Río Grande`,
  emergencia: `🚨 *Emergencia 24/7*:\n\nTenés *Mopar Assistance* las 24 horas, todos los días.\n\n📞 *0800-777-8000*\nOpción 1 para asistencia\n\nGrúa, cambio de rueda, auxilio en ruta, cerrajería. ¡Siempre disponible!`,
  garantia: `🛡️ *Garantía de fábrica FIAT:*\n\n✅ Cubre defectos de fabricación y materiales\n✅ Se mantiene realizando services en red oficial\n✅ Con repuestos originales Mopar\n\n⚠️ *MUY IMPORTANTE:* Si tu vehículo está en garantía y usás repuestos alternativos (ej: Eurorepar), *perdés la garantía*.`,
  eurorepar: `⚠️ *Eurorepar y garantía:*\n\n❌ Vehículo *EN GARANTÍA* + Eurorepar = *pierde garantía*\n✅ Eurorepar es ideal para vehículos *fuera de garantía* (viene con 6 meses de garantía propia)\n🛡️ Si tu FIAT está en garantía → siempre *repuestos Mopar*`,
  mopar: `🔧 *Repuestos Mopar*:\n\nSon los repuestos *originales de fábrica* para FIAT.\n\n✅ Calidad garantizada\n✅ Compatibilidad 100%\n✅ Preservan garantía del vehículo\n\nTrabajamos exclusivamente con Mopar en nuestra red oficial.`,
  recall: `📋 *Recall (llamado a revisión)*:\n\nEs cuando la fábrica detecta un tema de seguridad o calidad en un lote de vehículos y convoca a los propietarios para solucionarlo sin costo.\n\n✅ La reparación es *gratuita*\n🔍 Consultalo con el *VIN (número de chasis)* de tu vehículo`,
  service: `🔧 *Service / Mantenimiento:*\n\n📍 Cada *10.000 km o 1 año* (lo que ocurra primero)\n✅ Inspección completa según grilla del modelo\n✅ Cambios de fluidos y filtros\n✅ Controles de seguridad y diagnóstico\n\n🛡️ Hacerlo en red oficial *preserva tu garantía*`,
  repuestos: `🔩 *Repuestos y accesorios:*\n\nTenemos *catálogos completos* de repuestos y accesorios Mopar para cada modelo.\n\n✅ Protecciones, estribos, alfombras\n✅ Barras porta equipaje\n✅ Detalles de confort y estilo\n\nUn asesor te puede mandar el catálogo específico para tu FIAT.`,
  patente: `🔢 *Formato de patente:*\n\nLas patentes argentinas tienen estos formatos:\n\n• Nuevo: *AB123CD*\n• Viejo: *ABC123*\n\nSi no te acordás, fijate en el seguro, VTV o título del auto.`,
  vin: `🔍 *VIN (número de chasis):*\n\nEs un código único de 17 caracteres que identifica tu vehículo.\n\n📍 Lo encontrás en:\n• Base del parabrisas (mirando desde afuera)\n• Título del vehículo\n• Comprobante de seguro\n• Puerta del conductor (etiqueta)`,
};

function isQuestion(text) {
  return QUESTION_PATTERNS.some((pattern) => pattern.test(text));
}

function getQuickAnswer(text) {
  const lower = text.toLowerCase();
  if (/flexcare|flex|descuento|35%/.test(lower)) return QUICK_ANSWERS.flexcare;
  if (/mantenimiento programado|service programado/.test(lower)) return QUICK_ANSWERS.mantenimiento;
  if (/mvp|pack|prepago/.test(lower)) return QUICK_ANSWERS.mvp;
  if (/horario|atienden|abr[ií]|cierr/.test(lower)) return QUICK_ANSWERS.horario;
  if (/emergencia|24|7|urgencia|grua|asistencia/.test(lower)) return QUICK_ANSWERS.emergencia;
  if (/garant[ií]a/.test(lower) && !lower.includes("eurorepar")) return QUICK_ANSWERS.garantia;
  if (/eurorepar/.test(lower)) return QUICK_ANSWERS.eurorepar;
  if (/mopar|original|repuesto/.test(lower)) return QUICK_ANSWERS.mopar;
  if (/recall|llamado|revisi[oó]n/.test(lower)) return QUICK_ANSWERS.recall;
  if (/service|servicio|revisi[oó]n/.test(lower) && !lower.includes("emergencia")) return QUICK_ANSWERS.service;
  if (/accesorio|cat[aá]logo/.test(lower)) return QUICK_ANSWERS.repuestos;
  if (/patente|chapa|dominio/.test(lower) && !lower.match(/[a-z]{2,3}\s*\d{3}/i)) return QUICK_ANSWERS.patente;
  if (/vin|chasis|n[uú]mero.*chasis/.test(lower)) return QUICK_ANSWERS.vin;
  return null;
}

function getResumeMessage(state, turnoData) {
  switch (state) {
    case "turno_patente":
      return `\n\n---\n\nNecesito la *patente* de tu ${turnoData?.modelo || "vehículo"}.`;
    case "turno_otro_servicio":
      return "\n\n---\n\nVolvamos a tu turno. Contame qué servicio necesitás.";
    case "turno_servicio_extra_input":
      return "\n\n---\n\nVolvamos. ¿Qué notaste en tu vehículo que querés que revisemos?";
    case "estado_input":
      return "\n\n---\n\nAhora sí, pasame tu *patente* o *número de OT*.";
    case "estado_extra_input":
      return "\n\n---\n\nContame qué más querés que revisemos.";
    case "recall_input":
      return "\n\n---\n\nPasame el *número de VIN/chasis* para la consulta de recall.";
    case "repuestos_detalle":
      return `\n\n---\n\nContame qué repuesto o accesorio necesitás para tu *${turnoData?.modelo || "FIAT"}*.`;
    default:
      return "";
  }
}

function checkInterruption(text, state, turnoData) {
  if (!TEXT_INPUT_STATES.includes(state)) return null;
  if (!isQuestion(text)) return null;
  const answer = getQuickAnswer(text);
  if (!answer) return null;
  const resume = getResumeMessage(state, turnoData);
  return `¡Buena pregunta! 😊\n\n${answer}${resume}`;
}

module.exports = {
  checkInterruption,
  isQuestion,
  getQuickAnswer,
  TEXT_INPUT_STATES,
};
