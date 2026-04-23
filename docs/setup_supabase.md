# Setup Supabase

## 1. Crear proyecto
1. Ir a https://supabase.com → New project
2. Nombre: `icegroup-whatsapp`
3. Contraseña segura para la DB (guárdala)
4. Región: US East (más cercana a Colombia con buen latency)

## 2. Ejecutar el schema
1. En el dashboard → **SQL Editor** → New query
2. Pega el contenido de `supabase/migrations/001_initial_schema.sql`
3. Click **Run** — deben crearse 3 tablas: `leads`, `conversaciones`, `errores`

## 3. Copiar las credenciales
Ve a **Settings → API**:

| Variable | Dónde encontrarla |
|---|---|
| `SUPABASE_URL` | Project URL (ej: `https://abcxyz.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | `service_role` key (NO la `anon` key) |

> ⚠️ Usa siempre la `service_role` key en el backend — bypasea RLS y tiene permisos completos.

## 4. Verificar tablas
En **Table Editor** deben aparecer:
- `leads` — con columnas: id, telefono, nombre, ciudad, negocio_nombre, negocio_tipo, interes, es_emprendedor, estado, total_venta, created_at, updated_at
- `conversaciones` — con columnas: id, lead_id, rol, mensaje, created_at
- `errores` — con columnas: id, telefono, error_mensaje, payload, created_at

## 5. Desactivar RLS (para simplificar)
Para esta implementación inicial, desactiva Row Level Security en las 3 tablas:
- Click en cada tabla → **RLS disabled**

O bien, aplica políticas para permitir acceso al service_role (ya permitido por defecto con la service key).
