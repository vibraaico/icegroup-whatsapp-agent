# Setup WhatsApp Cloud API (Meta)

## 1. Crear App en Meta for Developers

1. Ir a https://developers.facebook.com
2. **My Apps → Create App**
3. Tipo: **Business**
4. Nombre: `ICEGROUP WhatsApp Agent`
5. Click **Create App**

## 2. Agregar WhatsApp al App

1. En el dashboard de la app → **Add Products**
2. Busca **WhatsApp** → Click **Set Up**
3. Selecciona o crea un **WhatsApp Business Account**

## 3. Registrar el número de WhatsApp

1. En **WhatsApp → Getting Started**
2. Sección **Step 5: Add a phone number**
3. Click **Add phone number**
4. Ingresa el número de ICEGROUP Colombia
5. Verifica con el código OTP que llega por SMS/llamada

## 4. Generar Token Permanente

> ⚠️ El token temporal expira en 24h. Usa un token permanente para producción.

1. Ve a **Business Settings → System Users**
2. Crea un **System User** con rol Admin
3. Asigna el WhatsApp Business Account a este System User con permisos `whatsapp_business_messaging`
4. Click **Generate Token** → selecciona la app
5. Permisos mínimos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. **Sin fecha de expiración**
7. Copia y guarda el token → es tu `META_ACCESS_TOKEN`

## 5. Obtener Phone Number ID

1. En **WhatsApp → API Setup**
2. Sección **Step 1** → verás el **Phone Number ID**
3. Cópialo → es tu `META_PHONE_NUMBER_ID`

## 6. Configurar el Webhook

1. En **WhatsApp → Configuration → Webhook**
2. Click **Edit**
3. **Callback URL:**
   ```
   https://tu-dominio.railway.app/webhook/whatsapp
   ```
4. **Verify Token:** el mismo valor que pusiste en `META_VERIFY_TOKEN` (ej: `icegroup_verify_2024`)
5. Click **Verify and Save**
   - Meta hace un GET a tu URL con el token
   - N8N responde con el challenge
   - Si todo está bien, aparece ✅ Verified

## 7. Suscribir a eventos

Una vez verificado el webhook:
1. Click **Manage** junto a los Webhook Fields
2. Activa: **messages** ✅
3. Click **Done**

## 8. Agregar número al modo Live

Para recibir mensajes de cualquier número (no solo los de prueba):
1. Ve a **App Review → Permissions and Features**
2. Solicita aprobación de `whatsapp_business_messaging`
3. O, para empezar a operar, en **WhatsApp → Getting Started** puedes agregar números de prueba

> En modo desarrollo, solo números agregados manualmente pueden enviarte mensajes.
> Para producción real, necesitas aprobar la app con Meta.

## Datos finales que necesitas tener guardados:

```
META_ACCESS_TOKEN=     # Token permanente del System User
META_PHONE_NUMBER_ID=  # ID del número en la sección API Setup
META_VERIFY_TOKEN=     # El que tú definiste (ej: icegroup_verify_2024)
WABA_ID=               # WhatsApp Business Account ID (para referencia)
```
