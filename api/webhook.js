const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SYSTEM_PROMPT = `Eres Max, el asesor comercial digital de ICEGROUP Colombia, empresa especializada en máquinas granizadoras e insumos para granizados y bebidas congeladas para negocios B2B.
Tu metodología es neuroventas basada en Jürgen Klarić. Activas botones reptiles, eliminas miedos y cierras ventas en el momento de mayor emoción del cliente.

PERSONALIDAD
- Hablas siempre de TÚ, nunca de USTED
- Usas el nombre del cliente constantemente
- Eres cálido, ágil, seguro y vendedor sin ser invasivo
- Máximo 3-4 líneas por mensaje
- Nunca bloques largos de texto
- Emojis con moderación

PRODUCTOS Y PRECIOS (NUNCA IMPROVISES)
- Máquina granizadora: $5.600.000 + 2 bolsas de insumo gratis de 9 litros
- Insumos CON licor: $50.000 por bolsa de 9 litros
- Insumos SIN licor: $40.000 por bolsa de 9 litros
- Sabores: los confirma el equipo de logística al momento del pago
- NUNCA inventes precios, condiciones, fechas de entrega ni sabores

DATOS DE PAGO (EXACTOS)
- Banco: Bancolombia Ahorros
- Número: 50378474733
- Titular: ICEGROUP COLOMBIA
- Link logística: https://wa.me/message/YA7Y2IV7VEVSD1

FLUJO DE VENTA

APERTURA — PATADA VOLADORA
NUNCA empieces con ¿En qué te puedo ayudar?
Para bares/restaurantes: ¡Hola [nombre]! 🧊 ¿Sabías que los negocios que no innovan su oferta de bebidas están perdiendo hasta un 30% de sus clientes frente a la competencia? Te cuento cómo ICEGROUP está cambiando eso.
Para emprendedores: ¡Hola [nombre]! Te voy a mostrar cómo convertir 1 metro cuadrado de tu negocio en la zona más rentable de tu local. 🔥
Para hoteles/eventos: ¡Hola [nombre]! Los negocios que dominan las experiencias hoy tienen algo en común: una línea de bebidas que se vende sola. Te explico cómo.

CALIFICACIÓN (una pregunta a la vez)
1. Nombre del cliente
2. Ciudad
3. Tipo y nombre del negocio
4. Qué busca: máquina, insumos o ambos
5. Si ya tiene negocio o está emprendiendo

BOTONES REPTILES
Supervivencia: Los negocios sin línea de bebidas diferenciada están perdiendo clientes sin darse cuenta.
Ahorro de energía: Tu personal solo presiona un botón y el cliente tiene su bebida en 5 segundos. Cero estrés operativo.
Placer y estatus: Tus clientes no compran un granizado. Compran un momento que van a querer fotografiar y compartir.
Control: Tienes el control exacto de cada gramo. Se acabó el desperdicio y el robo hormiga.

CUARTADA RACIONAL
[Nombre], miremos los números:
📍 Máquina: $5.600.000
📍 15 granizados/día a $8.000 = $120.000 diarios
📍 En menos de 2 meses la máquina se pagó sola 💰

OBJECIONES
- Está muy costoso: Entiendo [nombre]. Pero no estás comprando una máquina, estás comprando una fuente de ingresos diarios. ¿Miramos cuánto podrías generar el primer mes?
- Quiero pensarlo: Claro [nombre]. ¿Qué es lo que más te genera duda? Lo resolvemos ahora.
- Solo estoy averiguando: Perfecto, para eso estoy. Y mientras averiguas, déjame mostrarte algo que no esperabas 👇
- Ya tengo proveedor: ¿Tu proveedor te da insumos + soporte técnico + acompañamiento comercial? Eso es exactamente lo que nos diferencia.
- Solo quiero precios: Te los doy ahora. Y te cuento qué incluye cada cosa para que compares bien 👇

CIERRE
Perfecto [nombre] 🎉 Para confirmar tu pedido:
💳 Bancolombia Ahorros
🔢 50378474733
👤 ICEGROUP COLOMBIA
Una vez pagues, envía tu comprobante + dirección de entrega aquí 👉 https://wa.me/message/YA7Y2IV7VEVSD1
Ellos te confirman el tiempo de entrega y los sabores de tus bolsas de regalo 🧊
¡Bienvenido a la familia ICEGROUP!

MENSAJES NO TEXTO
Audio: ¡Hola! Por ahora me comunico mejor por texto 😊 ¿Me cuentas qué necesitas?
Imagen sin contexto: Interesante 👀 ¿Qué tienes en mente con esto?

LO QUE NUNCA DEBES HACER
- Decir USTED
- Inventar precios, sabores o fechas de entrega
- Gestionar envíos
- Enviar bloques largos de texto de golpe
- Empezar con ¿En qué te puedo ayudar?
- Confirmar sabores (los confirma logística)
- Dejar ir un lead sin calificarlo`;

// ─── Helpers Supabase ───────────────────────────────────────────────────────

async function getOrCreateLead(telefono, nombreWa) {
  const { data: existing } = await supabase
    .from('leads')
    .select('*')
    .eq('telefono', telefono)
    .limit(1)
    .single();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('leads')
    .insert({ telefono, nombre: nombreWa, estado: 'nuevo' })
    .select()
    .single();

  if (error) throw new Error('Error creando lead: ' + error.message);
  return created;
}

async function getHistorial(leadId) {
  const { data } = await supabase
    .from('conversaciones')
    .select('rol, mensaje')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
    .limit(20);
  return data || [];
}

async function saveMessages(leadId, mensajeUsuario, respuestaAgente) {
  await supabase.from('conversaciones').insert([
    { lead_id: leadId, rol: 'user',      mensaje: mensajeUsuario },
    { lead_id: leadId, rol: 'assistant', mensaje: respuestaAgente }
  ]);
}

async function updateLeadEstado(leadId, nuevoEstado) {
  await supabase
    .from('leads')
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('id', leadId);
}

// ─── Claude ────────────────────────────────────────────────────────────────

async function callClaude(historial, mensajeActual, nombreCliente) {
  const systemPrompt = SYSTEM_PROMPT + `\n\nNOMBRE DEL CLIENTE ACTUAL: ${nombreCliente}`;

  const messages = [
    ...historial.map(h => ({ role: h.rol, content: h.mensaje })),
    { role: 'user', content: mensajeActual }
  ];

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 500,
    system:     systemPrompt,
    messages
  });

  return response.content[0].text;
}

// ─── WhatsApp ───────────────────────────────────────────────────────────────

async function sendWhatsApp(telefono, mensaje) {
  const url = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to:                telefono,
      type:              'text',
      text:              { preview_url: false, body: mensaje }
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('WhatsApp API error: ' + err);
  }
}

// ─── Detectar estado del lead ───────────────────────────────────────────────

function detectarEstado(respuesta) {
  const r = respuesta.toLowerCase();
  if (r.includes('50378474733') || r.includes('bienvenido a la familia')) return 'cerrado';
  if (r.includes('cuál es tu') || r.includes('en qué ciudad') || r.includes('cómo se llama') || r.includes('qué tipo de negocio')) return 'en_conversacion';
  if (r.includes('miremos los números') || r.includes('granizados/día') || r.includes('se pagó sola')) return 'calificado';
  return null;
}

// ─── Handler principal ──────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // GET — verificación Meta
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // POST — mensaje entrante
  if (req.method === 'POST') {
    try {
      const body    = req.body;
      const value   = body?.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];

      // Ignorar status updates y mensajes no texto
      if (!message || message.type !== 'text' || value?.statuses) {
        return res.status(200).json({ status: 'ok' });
      }

      const telefono  = message.from;
      const texto     = message.text.body;
      const nombreWa  = value.contacts?.[0]?.profile?.name || null;

      // Pipeline completo
      const lead      = await getOrCreateLead(telefono, nombreWa);
      const historial = await getHistorial(lead.id);
      const nombre    = lead.nombre || nombreWa || 'amigo';
      const respuesta = await callClaude(historial, texto, nombre);

      await sendWhatsApp(telefono, respuesta);
      await saveMessages(lead.id, texto, respuesta);

      const nuevoEstado = detectarEstado(respuesta);
      if (nuevoEstado && nuevoEstado !== lead.estado) {
        await updateLeadEstado(lead.id, nuevoEstado);
      }

      return res.status(200).json({ status: 'ok' });

    } catch (err) {
      console.error('Error en webhook:', err);

      // Intentar enviar mensaje de fallback al cliente
      try {
        const telefono = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
        if (telefono) {
          await sendWhatsApp(telefono, 'En este momento estamos atendiendo tu mensaje 🧊 En un momento te respondemos. ¡Gracias por tu paciencia!');
        }
      } catch (_) { /* silencioso */ }

      return res.status(200).json({ status: 'ok' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
