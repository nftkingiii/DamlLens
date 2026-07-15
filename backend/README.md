# DamlLens Backend

Small Node backend that hides the Canton/Daml Ledger API ceremony behind UI-friendly endpoints.

It supports:

- validating a bearer token against the gRPC Ledger API
- querying visible active contracts through JSON Ledger API v2
- fetching update/event details through gRPC `UpdateService.GetUpdateById`
- creating an Invoice workflow contract
- exercising Invoice workflow choices
- converting raw ledger updates into DamlLens-ready timeline, contract, party, and alert JSON

## Requirements

- Node.js 20+
- `grpcurl` installed and available on PATH
- A short-lived HackCanton DevNet bearer token

## Setup

```powershell
cd "C:\Users\HP\Canton Hack\backend"
Copy-Item .env.example .env
```

Keep `DAMLLENS_BEARER_TOKEN` empty unless you are testing locally. Prefer sending the token from the frontend as an `Authorization: Bearer <token>` header.

## Run

```powershell
node src/server.js
```

Server starts on:

```text
http://127.0.0.1:8787
```

## Useful Routes

### Health

```http
GET /health
```

### Public runtime config

```http
GET /api/config
```

Returns non-secret defaults: API URLs, package ID, party ID, and known live demo update IDs.

### Validate connection

```http
POST /api/connect/validate
Authorization: Bearer <token>
Content-Type: application/json

{}
```

Optional body overrides:

```json
{
  "grpcApi": "ledger-api-grpc.participant.hackcanton-01.devnet.naas.noders.services:443",
  "jsonApi": "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services:443",
  "partyId": "...",
  "packageId": "..."
}
```

### Analyze the live Invoice Financing demo

```http
POST /api/demo/live-invoice
Authorization: Bearer <token>
Content-Type: application/json

{}
```

This fetches the real DevNet update IDs we created today and returns:

- summary
- metrics
- current state
- timeline
- contracts
- parties
- alerts

### Query active contracts

```http
POST /api/contracts/active
Authorization: Bearer <token>
Content-Type: application/json

{}
```

Optional template filter:

```json
{
  "template": {
    "moduleName": "DamlLens.InvoiceFinance",
    "entityName": "OverdueInvoice"
  }
}
```

### Fetch and analyze one update

```http
POST /api/updates/get
Authorization: Bearer <token>
Content-Type: application/json

{
  "updateId": "1220ef08430c2afd6573fc92d52c231ce25c4436344f9d82046059ea5adc0298d9d2"
}
```

### Fetch and analyze multiple updates

```http
POST /api/analyze/updates
Authorization: Bearer <token>
Content-Type: application/json

{
  "updateIds": [
    "12204f1f603639aebf0bfc3fbb2a7c378593d0d4b6c2bba50a445d0f635106a3081c",
    "1220b448947bbcd6de775ab4f042aacfedc6593629547f76cb080409be314e5a0584",
    "1220a7294450e3c1a669f1c17fe9ab4d3eb2ddded480af3ed214e9a6e22beed02f0c",
    "1220f5901f6e1244d59de2e9596aec15a46e173a24a139311afd0e74f3562f15b6af",
    "1220ef08430c2afd6573fc92d52c231ce25c4436344f9d82046059ea5adc0298d9d2"
  ]
}
```

### Create a new Invoice

```http
POST /api/workflows/invoice/create
Authorization: Bearer <token>
Content-Type: application/json

{}
```

### Start and immediately analyze a user-scoped workflow

The personal mode executes the full sample path with the connected user's primary party in every
role. Shared mode creates the initial Invoice with another party as buyer and stops until that buyer
authorizes the next choice.

```http
POST /api/workflows/invoice/start
Authorization: Bearer <token>
Content-Type: application/json

{ "mode": "personal" }
```

```json
{
  "mode": "shared",
  "buyerPartyId": "buyer-party::namespace"
}
```

Optional body:

```json
{
  "supplier": "party-id",
  "buyer": "party-id",
  "amount": "125000.00",
  "currency": "USD",
  "dueDate": 20649,
  "description": "Tokenized invoice for shipment INV-2048"
}
```

### Exercise an Invoice workflow choice

```http
POST /api/workflows/invoice/exercise
Authorization: Bearer <token>
Content-Type: application/json

{
  "template": "Invoice",
  "contractId": "contract-id",
  "choice": "AcceptInvoice"
}
```

For `RequestFinancing`:

```json
{
  "template": "AcceptedInvoice",
  "contractId": "contract-id",
  "choice": "RequestFinancing",
  "choiceFields": {
    "financier": {
      "type": "party",
      "value": "party-id"
    }
  }
}
```

## Security Notes

- Do not commit real tokens.
- Do not put long-lived secrets in `.env`.
- Frontend should pass short-lived bearer tokens to the backend per request.
- For production, put this backend behind auth and restrict CORS.
