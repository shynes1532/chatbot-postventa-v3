# 🚗 Chatbot Posventa v3.0 - Liendo Automotores LASAC

Bot de WhatsApp para el departamento de posventa. Concesionario oficial FIAT en Tierra del Fuego.

## ✅ Mejoras v3.0

- **Flujo dinámico:** cada respuesta confirma + pregunta lo siguiente (sin esperas innecesarias)
- **Selección de servicio:** corregido, ya no se saltea
- **Pregunta extra:** "¿Notaste algo más en tu vehículo?"
- **Calendario dinámico:** muestra los próximos 6 días hábiles reales (L-S)
- **Horario:** botones Mañana / Tarde
- **Resumen completo:** todos los datos correctos
- **Taxi + accesorios:** al final del flujo
- **Validaciones:** pide usar botones cuando corresponde

## 📁 Estructura

```
chatbot-postventa-v3/
├── index.js                     # Servidor Express + webhooks
├── src/
│   ├── messageHandler.js        # Flujos de conversación (cerebro)
│   ├── whatsappService.js       # Meta API + selector de días dinámico
│   ├── sessionManager.js        # Sesiones en memoria (30min timeout)
│   └── interruptionHandler.js   # Respuestas rápidas sin perder flujo
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🚀 Deploy en Railway

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Bot posventa v3.0"
git remote add origin https://github.com/TU-USUARIO/chatbot-postventa-v3.git
git branch -M main
git push -u origin main
```

### 2. Deploy en Railway

1. Ir a https://railway.app → New Project → Deploy from GitHub
2. Seleccionar el repo `chatbot-postventa-v3`
3. Variables de entorno:

```
WHATSAPP_TOKEN=token_permanente
WHATSAPP_PHONE_NUMBER_ID=284828081383301
WHATSAPP_BUSINESS_ACCOUNT_ID=296345730226665
VERIFY_TOKEN=liendo_postventa_2026
PORT=3000
NODE_ENV=production
```

4. Settings → Networking → Generate Domain
5. Copiar la URL

### 3. Configurar Webhook en Meta

1. Ir a https://developers.facebook.com/apps/25540878658916440/whatsapp-business/wa-settings/
2. Editar webhook:
   - URL: `https://TU-URL-RAILWAY.up.railway.app/webhook`
   - Token: `liendo_postventa_2026`
3. Verificar y guardar
4. Activar toggle **"messages"** → Suscrito

## 📊 Flujo de turno

```
Saludo → Menú → Sucursal → Modelo → Servicio → ¿Algo más? → Km → Patente → Día → Horario → Resumen → Confirmar → Taxi → Accesorios → Cierre
```

## 🔧 Credenciales

- **App ID:** 25540878658916440
- **Phone Number ID:** 284828081383301
- **WABA ID:** 296345730226665
- **Número:** +54 9 2964 46-5050

---

**Liendo Automotores LASAC** - Concesionario Oficial FIAT
📍 Ushuaia & Río Grande, Tierra del Fuego
