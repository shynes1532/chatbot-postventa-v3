// ============================================
// GESTOR DE SESIONES v3.0
// Almacena el estado de conversación de cada usuario
// ============================================

const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

function getSession(phone) {
  const session = sessions.get(phone);
  if (session && Date.now() - session.lastActivity > SESSION_TIMEOUT) {
    sessions.delete(phone);
    return null;
  }
  if (session) session.lastActivity = Date.now();
  return session || null;
}

function createSession(phone, name) {
  const session = {
    phone,
    name,
    state: "main_menu",
    turnoData: {},
    lastActivity: Date.now(),
    createdAt: Date.now(),
  };
  sessions.set(phone, session);
  return session;
}

function getOrCreate(phone, name = "Cliente") {
  let session = getSession(phone);
  if (!session) session = createSession(phone, name);
  return session;
}

function updateSession(phone, updates) {
  const session = getSession(phone);
  if (!session) return null;
  Object.assign(session, updates, { lastActivity: Date.now() });
  return session;
}

function setState(phone, state) {
  return updateSession(phone, { state });
}

function setTurnoData(phone, data) {
  const session = getSession(phone);
  if (!session) return null;
  Object.assign(session.turnoData, data);
  session.lastActivity = Date.now();
  return session;
}

function resetTurno(phone) {
  return updateSession(phone, { turnoData: {} });
}

function resetSession(phone) {
  sessions.delete(phone);
}

function getActiveSessions() {
  return sessions.size;
}

// Limpieza periódica
setInterval(() => {
  const now = Date.now();
  for (const [phone, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`🗑️ Sesión expirada: ${phone}`);
      sessions.delete(phone);
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  getSession,
  createSession,
  getOrCreate,
  updateSession,
  setState,
  setTurnoData,
  resetTurno,
  resetSession,
  getActiveSessions,
};
