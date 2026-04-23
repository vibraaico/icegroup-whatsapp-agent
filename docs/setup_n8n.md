# Setup N8N en Railway

## 1. Crear servicio N8N en Railway

1. Ir a https://railway.app → New Project → Deploy from template → buscar **N8N**
   - O ir directo: https://railway.app/new/template/n8n
2. Click **Deploy**
3. Railway crea el contenedor N8N automáticamente

## 2. Configurar variables de entorno en Railway

En el servicio N8N → **Variables** → agregar:

```
META_ACCESS_TOKEN=tu_token_permanente
META_PHONE_NUMBER_ID=tu_phone_number_id
META_VERIFY_TOKEN=icegroup_verify_2024
ANTHROPIC_API_KEY=sk-ant-api03-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
N8N_ENCRYPTION_KEY=una_clave_aleatoria_segura_32chars
WEBHOOK_URL=https://tu-dominio.railway.app
NODE_FUNCTION_ALLOW_BUILTIN=*
NODE_FUNCTION_ALLOW_EXTERNAL=*
```

> ⚠️ `NODE_FUNCTION_ALLOW_BUILTIN=*` y `NODE_FUNCTION_ALLOW_EXTERNAL=*` son **obligatorios** para que los Code nodes puedan usar `fetch` y acceder a las variables de entorno.

## 3. Obtener la URL pública de Railway

En el servicio N8N → **Settings → Networking → Generate Domain**
Ejemplo: `https://icegroup-n8n-production.up.railway.app`

Esta URL la usarás en:
- Meta webhook URL
- Variable `WEBHOOK_URL` en Railway

## 4. Importar el workflow

1. Abre N8N en el navegador: `https://tu-dominio.railway.app`
2. Login con las credenciales iniciales
3. En el dashboard → **New Workflow** → menú (⋯) → **Import from File**
4. Sube el archivo `n8n/workflows/agente_icegroup.json`
5. El workflow se importa con todos los nodos configurados

## 5. Activar el workflow

1. Haz click en el toggle **Inactive → Active** (arriba a la derecha)
2. El workflow empieza a escuchar en:
   - `GET  https://tu-dominio.railway.app/webhook/whatsapp` → verificación Meta
   - `POST https://tu-dominio.railway.app/webhook/whatsapp` → mensajes entrantes

## 6. Verificar que funciona

Abre en el navegador:
```
https://tu-dominio.railway.app/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=icegroup_verify_2024&hub.challenge=TEST123
```
Debe responder: `TEST123`

Si responde correctamente, el webhook está listo para Meta.

## 7. Ajustar nodos HTTP si es necesario

Si los nodos `HTTP Claude API` o `HTTP Enviar WhatsApp` muestran error en el body:
1. Abre el nodo en N8N
2. En **Body** → selecciona **Raw** → **JSON**
3. Ingresa: `{{ $json.claudeBody }}` (para Claude) o `{{ $json.waBody }}` (para WhatsApp)

## Troubleshooting frecuente

| Error | Causa | Solución |
|---|---|---|
| `fetch is not defined` | Variables NODE_FUNCTION no configuradas | Agregar `NODE_FUNCTION_ALLOW_BUILTIN=*` en Railway |
| `$env.X is undefined` | Variable no está en Railway | Verificar nombre exacto en Railway Variables |
| `401 Unauthorized` (Claude) | API key incorrecta | Verificar `ANTHROPIC_API_KEY` en Railway |
| `401 Unauthorized` (Meta) | Token expirado | Generar nuevo token permanente en Meta |
| Workflow no procesa mensajes | Workflow inactivo | Activar el toggle en N8N |
