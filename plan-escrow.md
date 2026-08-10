
Este documento tiene el objetivo de explicar, la implementación para hacer que custodio funcione 

Esto lo haremos gracias a fintoc , que nos ayudar a generar el escrow en nuestra plataforma quiero que primero entiendas , como funciona y como nos puede ayudar fintoc para ello , te compartiré , los pasos mas importantes para generar esto es importante que los entiendas , para generar una plataforma segura , confiable y siguiendo la docuemtnacion de fintoc 


Te lo explico paso a paso, enfocado en Chile (tu caso):

Paso 1: Obtener tu API Key de test
En el dashboard, ve a Developers → API Keys. Copia tu secret key de test (sk_test_...).
 

Te adjunto las credenciales para que las pongas en variables de entorno 

	Public key	pk_test_yFntx41VWxbHxthaRkyAFcngA99sdc-SBbeLq57Jw5Y

Secret key	Secret key	sk_test_yUVHnz-sat9vQstf8fGtX4zxLTT8NTLJrRbPx3kK86z

Paso 2: Generar y registrar JWS Keys
Los endpoints que mueven plata requieren firma JWS (JSON Web Signature) para garantizar integridad y autenticidad.
Genera el par de llaves con estos comandos:
openssl genrsa -out private_key.pem 2048
openssl rsa -in private_key.pem -outform PEM -pubout -out public_key.pem
Luego sube la llave pública en el dashboard: API Keys → JWS Public Keys → Add JWS Key.
La llave privada nunca la compartas, queda en tu servidor.

Paso 3: Identificar tu Account
Ya tienes tu Account (acc_3HHTPtRggA2HLJ4XswwkHBfTp2m) con su root account number 17855239734870. Cada cuenta chilena tiene un root_account_number que recibe las transferencias inbound.

Paso 4: Recibir plata (Inbound Transfer)
Cuando un comprador transfiere a tu account number, Fintoc detecta la transferencia automáticamente.
Fintoc envía un evento transfer.inbound.succeeded cada vez que recibes una transferencia. Tu webhook lo captura y tu backend registra el pago.
Para probar en test, simulas la recepción así:
curl --request POST \
  --url https://api.fintoc.com/v2/simulate/receive_transfer \
  --header 'Authorization: TU_SK_TEST' \
  --header 'content-type: application/json' \
  --data '{
    "account_number_id": "TU_ACCOUNT_NUMBER_ID",
    "amount": 50000,
    "currency": "CLP"
  }'

Paso 5: Enviar plata (Outbound Transfer - la "liberación")
Este es el paso clave de tu escrow. Cuando confirmas la entrega, haces un POST /v2/transfers con la firma JWS.
Para Chile, el objeto counterparty requiere 5 campos: holder_id (RUT), holder_name, account_number, account_type (checking_account o sight_account) e institution_id (código del banco).
Ejemplo:
curl --request POST \
  --url https://api.fintoc.com/v2/transfers \
  --header 'Authorization: TU_SK_TEST' \
  --header 'Fintoc-JWS-Signature: TU_FIRMA_JWS' \
  --header 'Idempotency-Key: un-uuid-unico' \
  --header 'content-type: application/json' \
  --data '{
    "amount": 47500,
    "currency": "CLP",
    "account_id": "acc_3HHTPtRggA2HLJ4XswwkHBfTp2m",
    "comment": "Liberación escrow orden #123",
    "counterparty": {
      "holder_id": "12.345.678-9",
      "holder_name": "Juan Vendedor",
      "account_number": "123456789",
      "account_type": "checking_account",
      "institution_id": "cl_banco_de_chile"
    }
  }'
(En este ejemplo, de $50.000 liberas $47.500 al vendedor = 95%, y $2.500 queda como tu comisión)

Paso 6: Configurar Webhooks
Fintoc envía transfer.outbound.succeeded cuando la transferencia se completa. Los eventos clave que debes escuchar:
Evento	Qué significa
transfer.inbound.succeeded	Llegó plata del comprador
transfer.outbound.succeeded	Se liberó la plata al vendedor/comprador
transfer.outbound.rejected	El banco destino rechazó la transferencia
transfer.outbound.failed	Error en el procesamiento
Paso 7: Usar Idempotency Keys
Fintoc soporta idempotencia para que puedas reintentar transfers sin crear duplicados. Incluye el header Idempotency-Key en cada request. Esto es crítico para tu escrow: si falla la conexión, reenvías con la misma key y no se duplica la transferencia.

Tips para tu escrow con los SDKs
Si usas Node o Python, los SDKs firman automáticamente los requests JWS:
// Node
const { Fintoc } = require('fintoc');
const fintoc = new Fintoc('sk_test_...', './private_key.pem');

// Liberar al vendedor
const transfer = await fintoc.v2.transfers.create({
  idempotency_key: 'orden-123-liberacion',
  amount: 47500,
  currency: 'CLP',
  account_id: 'acc_3HHTPtRggA2HLJ4XswwkHBfTp2m',
  comment: 'Liberación escrow orden #123',
  counterparty: {
    holder_id: '12.345.678-9',
    holder_name: 'Juan Vendedor',
    account_number: '123456789',
    account_type: 'checking_account',
    institution_id: 'cl_banco_de_chile'
  }
});
¿Quieres que profundicemos en algún paso en particular?