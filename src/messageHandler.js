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

  // Guardar en Google Sheets
  await sheets.guardarTurno({
    nombre: ses.name,
    telefono: ses.phone,
    sucursal: td.sucursal,
    modelo: td.modelo,
    servicio: td.servicio,
    km: td.km,
    patente: td.patente,
    dia: td.dia,
    horario: td.horario,
    servicioExtra: td.servicioExtra,
    taxi: td.taxi,
    accesorios: td.accesorios
  });

  session.setState(phone, "turno_taxi");
  await wa.sendText(
    phone,
    `✅ ¡Solicitud registrada con éxito! 🎉\n\nUn asesor de servicio se va a comunicar con vos para confirmar día y horario exacto.\n\n📞 Te contactamos en nuestro horario:\n🕐 L-V 9:30 a 12:30 / 15:00 a 20:00\n🕐 Sáb 9:30 a 12:30\n\n🚕 Una cosa más... ¿Vas a necesitar un *taxi* cuando dejes tu vehículo?\n\n(Escribí *sí* o *no*) 👇`
  );
}