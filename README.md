# ICEGROUP WhatsApp Sales Agent — Max

Agente de ventas automatizado para WhatsApp. Responde como **Max**, el asesor comercial de ICEGROUP Colombia usando neuroventas (metodología Jürgen Klarić). Registra cada lead y conversación en Supabase.

## Stack

| Capa | Tecnología |
|---|---|
| Canal | WhatsApp Cloud API (Meta) |
| Orquestación | N8N self-hosted en Railway |
| IA | Claude claude-sonnet-4-20250514 (Anthropic) |
| Base de datos | Supabase (PostgreSQL) |
| Código fuente | GitHub |

## Estructura del proyecto

```
icegroup-whatsapp-agent/
├── .env.example                          # Variables requeridas
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql        # Schema completo de la DB
├── n8n/
│   └── workflows/
│       └── agente_icegroup.json          # Workflow N8N importable
└── docs/
    ├── setup_supabase.md                 # Paso 1: configurar Supabase
    ├── setup_n8n.md                      # Paso 2: configurar N8N en Railway
    └── setup_meta.md                     # Paso 3: configurar WhatsApp API
```

## Flujo del agente

```
WhatsApp (cliente)
    ↓  POST
Webhook N8N
    ↓
[Validar] → ¿Es mensaje de texto real? → NO → Respond 200
    ↓ SÍ
[Extraer] telefono, mensaje, nombre_wa
    ↓
[Supabase] GET lead → existe? → NO → crear lead nuevo
    ↓
[Supabase] GET historial últimos 20 mensajes
    ↓
[Claude] Construir prompt con historial + sistema Max
    ↓
[Claude API] claude-sonnet-4-20250514 → respuesta Max
    ↓
[Supabase] Guardar mensaje usuario + respuesta agente
[Supabase] Actualizar estado lead si cambió
    ↓
[WhatsApp API] Enviar respuesta al cliente
    ↓
Respond 200 a Meta
```

## Instalación (orden obligatorio)

### Paso 1 — Supabase
Ver [docs/setup_supabase.md](docs/setup_supabase.md)
- Crear proyecto en Supabase
- Ejecutar `001_initial_schema.sql`
- Copiar URL y service key

### Paso 2 — N8N en Railway
Ver [docs/setup_n8n.md](docs/setup_n8n.md)
- Deploy N8N desde template en Railway
- Configurar variables de entorno
- Importar `agente_icegroup.json`
- Activar el workflow

### Paso 3 — Meta WhatsApp
Ver [docs/setup_meta.md](docs/setup_meta.md)
- Crear app en developers.facebook.com
- Registrar número con OTP
- Generar token permanente
- Configurar webhook a la URL de Railway
- Suscribir al evento `messages`

## Variables de entorno requeridas

```env
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_VERIFY_TOKEN=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NODE_FUNCTION_ALLOW_BUILTIN=*
NODE_FUNCTION_ALLOW_EXTERNAL=*
```

## Criterios de aceptación

- [x] Responde en menos de 10 segundos
- [x] Solo procesa mensajes de texto (ignora status updates y audios)
- [x] Usa precios exactos: máquina $5.6M, insumos $40K/$50K
- [x] Califica al lead antes de dar info masiva
- [x] Al cerrar entrega datos de pago exactos + link logística
- [x] Cada conversación queda registrada en Supabase
- [x] Estado del lead se actualiza: nuevo → en_conversacion → calificado → cerrado
- [x] Audio/imagen reciben respuesta educada
- [x] Status updates de Meta no disparan el flujo
- [x] GET de verificación responde con hub.challenge

## Productos y precios (referencia)

| Producto | Precio |
|---|---|
| Máquina granizadora | $5.600.000 + 2 bolsas 9L gratis |
| Insumos CON licor | $50.000 / bolsa 9L |
| Insumos SIN licor | $40.000 / bolsa 9L |

**Datos de pago:** Bancolombia Ahorros · 50378474733 · ICEGROUP COLOMBIA  
**Logística:** https://wa.me/message/YA7Y2IV7VEVSD1
