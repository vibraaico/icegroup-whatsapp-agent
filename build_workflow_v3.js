// Workflow v3: usa bodyParameters con contentType:'json' en todos los HTTP nodes
const fs = require('fs');
const http = require('http');

const SUPABASE_URL  = 'https://cuhhlowsgpaghviovafv.supabase.co';
const SUPABASE_KEY  = 'SUPABASE_SERVICE_KEY_HERE';
const ANTHROPIC_KEY = 'ANTHROPIC_API_KEY_HERE';
const META_TOKEN    = 'META_ACCESS_TOKEN_HERE';
const META_PHONE_ID = '935645596303993';

const supaHeaders = params => ({
  sendHeaders: true,
  headerParameters: { parameters: [
    { name: 'apikey',        value: SUPABASE_KEY },
    { name: 'Authorization', value: 'Bearer ' + SUPABASE_KEY },
    { name: 'Content-Type',  value: 'application/json' },
    ...params
  ]}
});

const jsonBody = params => ({
  sendBody: true,
  contentType: 'json',
  bodyParameters: { parameters: params }
});

const workflow = {
  name: 'ICEGROUP WhatsApp Agent - Max',
  settings: { executionOrder: 'v1', saveManualExecutions: true },
  nodes: [
    // Verificación GET
    {
      id: 'wh-get', name: 'Webhook GET Verificacion', type: 'n8n-nodes-base.webhook', typeVersion: 1,
      position: [160, 160], webhookId: 'icegroup-wa-get',
      parameters: { httpMethod: 'GET', path: 'whatsapp', responseMode: 'responseNode', options: {} }
    },
    {
      id: 'code-verify', name: 'Code Verificacion Meta', type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [380, 160],
      parameters: { mode: 'runOnceForAllItems', jsCode: "const q=$input.first().json.query||{};\nif(q['hub.mode']==='subscribe'&&q['hub.verify_token']==='icegroup_verify_2024'){return [{json:{challenge:q['hub.challenge'],status:200}}];}\nreturn [{json:{challenge:'FORBIDDEN',status:403}}];" }
    },
    {
      id: 'resp-verify', name: 'Respond Verificacion', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
      position: [600, 160],
      parameters: { respondWith: 'text', responseBody: '={{ $json.challenge }}', options: { responseCode: '={{ $json.status }}' } }
    },

    // Flujo principal
    {
      id: 'wh-post', name: 'Webhook POST', type: 'n8n-nodes-base.webhook', typeVersion: 1,
      position: [160, 400], webhookId: 'icegroup-wa-post',
      parameters: { httpMethod: 'POST', path: 'whatsapp', responseMode: 'responseNode', options: {} }
    },
    {
      id: 'code-validar', name: 'Code Validar Mensaje', type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [380, 400],
      parameters: { mode: 'runOnceForAllItems', jsCode: "const b=$input.first().json.body;\nconst v=b?.entry?.[0]?.changes?.[0]?.value;\nconst m=v?.messages?.[0];\nreturn [{json:{valid:!!m&&m.type==='text'&&!v?.statuses,body:b}}];" }
    },
    {
      id: 'if-valid', name: 'IF Mensaje Valido', type: 'n8n-nodes-base.if', typeVersion: 2,
      position: [600, 400],
      parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ id: 'c1', leftValue: '={{ $json.valid }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }], combinator: 'and' } }
    },
    {
      id: 'resp-invalid', name: 'Respond OK Invalido', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
      position: [820, 560], parameters: { respondWith: 'json', responseBody: '{"status":"ok"}', options: { responseCode: 200 } }
    },
    {
      id: 'code-extraer', name: 'Code Extraer Datos', type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [820, 400],
      parameters: { mode: 'runOnceForAllItems', jsCode: "const b=$input.first().json.body;\nconst v=b.entry[0].changes[0].value;\nconst m=v.messages[0];\nconst c=v.contacts?.[0];\nreturn [{json:{telefono:m.from,mensaje:m.text.body,nombre_wa:c?.profile?.name||null,message_id:m.id}}];" }
    },

    // HTTP: Upsert Lead
    {
      id: 'http-upsert-lead', name: 'HTTP Upsert Lead', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
      position: [1040, 400],
      parameters: {
        method: 'POST',
        url: SUPABASE_URL + '/rest/v1/leads?on_conflict=telefono',
        ...supaHeaders([{ name: 'Prefer', value: 'resolution=merge-duplicates,return=representation' }]),
        ...jsonBody([
          { name: 'telefono', value: '={{ $json.telefono }}' },
          { name: 'nombre',   value: '={{ $json.nombre_wa }}' },
          { name: 'estado',   value: 'nuevo' }
        ]),
        options: {}
      }
    },

    // HTTP: Get Historial (fullResponse = siempre 1 item)
    {
      id: 'http-historial', name: 'HTTP Get Historial', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
      position: [1260, 400],
      parameters: {
        method: 'GET',
        url: SUPABASE_URL + '/rest/v1/conversaciones?lead_id=eq.={{ $json.id }}&order=created_at.asc&limit=20&select=rol,mensaje',
        ...supaHeaders([]),
        options: { response: { response: { fullResponse: true } } }
      }
    },

    // Code: Construir contexto para Claude (sin env vars)
    {
      id: 'code-claude-ctx', name: 'Code Construir Contexto', type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [1480, 400],
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: [
          "const hData = $input.first().json;",
          "const lead  = $('HTTP Upsert Lead').first().json;",
          "const msg   = $('Code Extraer Datos').first().json;",
          "const hist  = Array.isArray(hData.body) ? hData.body : [];",
          "const nombre = lead.nombre || msg.nombre_wa || 'amigo';",
          "const sys = 'Eres Max, asesor comercial de ICEGROUP Colombia. " +
            "PRODUCTOS: Maquina granizadora $5.600.000 + 2 bolsas gratis 9L. " +
            "Insumos CON licor $50.000/bolsa 9L. SIN licor $40.000/bolsa 9L. " +
            "PAGO: Bancolombia Ahorros 50378474733 ICEGROUP COLOMBIA. " +
            "LOGISTICA: https://wa.me/message/YA7Y2IV7VEVSD1 (sabores los confirma logistica). " +
            "REGLAS: Habla de TU siempre. Max 4 lineas por mensaje. " +
            "NUNCA inventes precios ni condiciones. " +
            "Califica al cliente antes de dar info masiva. " +
            "Abre siempre con una patada voladora, NUNCA con en que te puedo ayudar. " +
            "Usa el nombre del cliente constantemente. " +
            "Cliente actual: ' + nombre;",
          "const messages = [",
          "  ...hist.map(h => ({ role: h.rol, content: h.mensaje })),",
          "  { role: 'user', content: msg.mensaje }",
          "];",
          "return [{json:{",
          "  system: sys,",
          "  messages: messages,",
          "  lead_id: lead.id,",
          "  lead_nombre: lead.nombre,",
          "  lead_estado: lead.estado || 'nuevo',",
          "  telefono: msg.telefono,",
          "  mensaje_usuario: msg.mensaje",
          "}}];"
        ].join('\n')
      }
    },

    // HTTP: Claude API — usa bodyParameters con contentType json
    {
      id: 'http-claude', name: 'HTTP Claude API', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
      position: [1700, 400],
      parameters: {
        method: 'POST',
        url: 'https://api.anthropic.com/v1/messages',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'x-api-key',        value: ANTHROPIC_KEY },
          { name: 'anthropic-version', value: '2023-06-01' },
          { name: 'content-type',      value: 'application/json' }
        ]},
        ...jsonBody([
          { name: 'model',      value: 'claude-sonnet-4-20250514' },
          { name: 'max_tokens', value: '500' },
          { name: 'system',     value: '={{ $json.system }}' },
          { name: 'messages',   value: '={{ $json.messages }}' }
        ]),
        options: {}
      }
    },

    // Code: Extraer respuesta
    {
      id: 'code-resp', name: 'Code Procesar Respuesta', type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [1920, 400],
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: [
          "const cr = $input.first().json;",
          "const p  = $('Code Construir Contexto').first().json;",
          "const respuesta = cr.content?.[0]?.text || 'En este momento estamos atendiendo tu mensaje. En un momento te respondemos!';",
          "let estado = null;",
          "const r = respuesta.toLowerCase();",
          "if (r.includes('50378474733') || r.includes('bienvenido')) estado = 'cerrado';",
          "else if (r.includes('ciudad') || r.includes('negocio') || r.includes('llamas')) estado = 'en_conversacion';",
          "else if (r.includes('pago') || r.includes('granizados') || r.includes('mes')) estado = 'calificado';",
          "return [{json:{respuesta,estado_nuevo:estado,lead_id:p.lead_id,lead_estado:p.lead_estado,telefono:p.telefono,mensaje_usuario:p.mensaje_usuario}}];"
        ].join('\n')
      }
    },

    // HTTP: Guardar mensaje usuario
    {
      id: 'http-save-user', name: 'HTTP Save User Msg', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
      position: [2140, 300],
      parameters: {
        method: 'POST',
        url: SUPABASE_URL + '/rest/v1/conversaciones',
        ...supaHeaders([{ name: 'Prefer', value: 'return=minimal' }]),
        ...jsonBody([
          { name: 'lead_id', value: '={{ $json.lead_id }}' },
          { name: 'rol',     value: 'user' },
          { name: 'mensaje', value: '={{ $json.mensaje_usuario }}' }
        ]),
        options: {}
      }
    },

    // HTTP: Guardar respuesta agente
    {
      id: 'http-save-agent', name: 'HTTP Save Agent Msg', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
      position: [2140, 480],
      parameters: {
        method: 'POST',
        url: SUPABASE_URL + '/rest/v1/conversaciones',
        ...supaHeaders([{ name: 'Prefer', value: 'return=minimal' }]),
        ...jsonBody([
          { name: 'lead_id', value: "={{ $('Code Procesar Respuesta').first().json.lead_id }}" },
          { name: 'rol',     value: 'assistant' },
          { name: 'mensaje', value: "={{ $('Code Procesar Respuesta').first().json.respuesta }}" }
        ]),
        options: {}
      }
    },

    // HTTP: Enviar WhatsApp
    {
      id: 'http-wa', name: 'HTTP Enviar WhatsApp', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
      position: [2360, 400],
      parameters: {
        method: 'POST',
        url: 'https://graph.facebook.com/v19.0/' + META_PHONE_ID + '/messages',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'Authorization', value: 'Bearer ' + META_TOKEN },
          { name: 'Content-Type',  value: 'application/json' }
        ]},
        ...jsonBody([
          { name: 'messaging_product', value: 'whatsapp' },
          { name: 'recipient_type',    value: 'individual' },
          { name: 'to',               value: "={{ $('Code Procesar Respuesta').first().json.telefono }}" },
          { name: 'type',             value: 'text' },
          { name: 'text',             value: "={{ { preview_url: false, body: $('Code Procesar Respuesta').first().json.respuesta } }}" }
        ]),
        options: {}
      }
    },

    // Respond OK
    {
      id: 'resp-ok', name: 'Respond OK', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
      position: [2580, 400],
      parameters: { respondWith: 'json', responseBody: '{"status":"ok"}', options: { responseCode: 200 } }
    }
  ],
  connections: {
    'Webhook GET Verificacion': { main: [[{ node: 'Code Verificacion Meta',  type: 'main', index: 0 }]] },
    'Code Verificacion Meta':   { main: [[{ node: 'Respond Verificacion',    type: 'main', index: 0 }]] },
    'Webhook POST':             { main: [[{ node: 'Code Validar Mensaje',    type: 'main', index: 0 }]] },
    'Code Validar Mensaje':     { main: [[{ node: 'IF Mensaje Valido',       type: 'main', index: 0 }]] },
    'IF Mensaje Valido':        { main: [[{ node: 'Code Extraer Datos', type: 'main', index: 0 }], [{ node: 'Respond OK Invalido', type: 'main', index: 0 }]] },
    'Code Extraer Datos':       { main: [[{ node: 'HTTP Upsert Lead',        type: 'main', index: 0 }]] },
    'HTTP Upsert Lead':         { main: [[{ node: 'HTTP Get Historial',      type: 'main', index: 0 }]] },
    'HTTP Get Historial':       { main: [[{ node: 'Code Construir Contexto', type: 'main', index: 0 }]] },
    'Code Construir Contexto':  { main: [[{ node: 'HTTP Claude API',         type: 'main', index: 0 }]] },
    'HTTP Claude API':          { main: [[{ node: 'Code Procesar Respuesta', type: 'main', index: 0 }]] },
    'Code Procesar Respuesta':  { main: [[{ node: 'HTTP Save User Msg',      type: 'main', index: 0 }]] },
    'HTTP Save User Msg':       { main: [[{ node: 'HTTP Save Agent Msg',     type: 'main', index: 0 }]] },
    'HTTP Save Agent Msg':      { main: [[{ node: 'HTTP Enviar WhatsApp',    type: 'main', index: 0 }]] },
    'HTTP Enviar WhatsApp':     { main: [[{ node: 'Respond OK',              type: 'main', index: 0 }]] }
  }
};

const json = JSON.stringify(workflow);
fs.writeFileSync('n8n/workflows/agente_icegroup.json', json, 'utf8');
console.log('Workflow v3 generado:', Buffer.byteLength(json), 'bytes');

// Deploy
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNGY5MDQwOC1iNTEyLTQ1YzctOTlmNS1mODJiYzI0ODAzYTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWQ1NDdiMmItZjQwZS00MWQwLTgxNDEtNmJiNmE1MmYyY2FiIiwiaWF0IjoxNzc2OTc0NzQ3LCJleHAiOjE3ODQ2OTI4MDB9.rgY2iU70CBjCXy-3R5fTXbSvGwa3YlrwHnRLgk3Rciw';

function api(method, path, body) {
  return new Promise(resolve => {
    const buf = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8') : null;
    const r = http.request({ hostname:'localhost', port:5678, path, method,
      headers:{'X-N8N-API-KEY':apiKey,'Content-Type':'application/json',...(buf?{'Content-Length':buf.length}:{})} },
      res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d));}catch{resolve({raw:d.substring(0,100)});} }); });
    if (buf) r.write(buf); r.end();
  });
}

async function deploy() {
  // Remove old
  const list = await api('GET', '/api/v1/workflows?limit=10');
  for (const wf of (list.data || [])) {
    await api('POST', '/api/v1/workflows/' + wf.id + '/deactivate', {});
    await api('DELETE', '/api/v1/workflows/' + wf.id);
    console.log('Eliminado:', wf.name);
  }

  // Import new
  const buf = Buffer.from(json, 'utf8');
  const result = await new Promise(resolve => {
    const r = http.request({ hostname:'localhost', port:5678, path:'/api/v1/workflows', method:'POST',
      headers:{'X-N8N-API-KEY':apiKey,'Content-Type':'application/json; charset=utf-8','Content-Length':buf.length} },
      res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d));}catch(e){resolve({raw:d.substring(0,300)});} }); });
    r.write(buf); r.end();
  });

  if (!result.id) { console.log('Error importando:', JSON.stringify(result)); return; }
  console.log('Importado ID:', result.id, result.name);

  const act = await api('POST', '/api/v1/workflows/' + result.id + '/activate', {});
  console.log('Activo:', act.active);
  return result.id;
}

deploy();
