const http = require('http');

const payload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '3097157073824436',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: '935645596303993' },
        contacts: [{ profile: { name: 'Diego' }, wa_id: '573300112233' }],
        messages: [{
          from: '573300112233',
          id: 'wamid.final001',
          timestamp: '' + Math.floor(Date.now() / 1000),
          type: 'text',
          text: { body: 'Hola! Tengo una heladería en Medellín y quiero información de la máquina granizadora' }
        }]
      },
      field: 'messages'
    }]
  }]
};

const buf = Buffer.from(JSON.stringify(payload));
const req = http.request({
  hostname: 'localhost', port: 5678,
  path: '/webhook/whatsapp', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': buf.length }
}, r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', () => console.log('Webhook respondió:', r.statusCode, d));
});
req.write(buf);
req.end();
console.log('Mensaje enviado...');
