# DamlLens

DamlLens turns Canton/Daml ledger activity into readable workflow timelines, contract state, party authority, and risk alerts.

## Product capabilities

- Secure Noders OIDC login with automatic primary-party resolution.
- User-scoped active-contract discovery with optional 15-second live refresh.
- Generated action inbox based on Daml controller roles and connected-party authority.
- Multi-party invoice progression across supplier, buyer, and financier sessions.
- Timeline, contract inventory, party-role map, and normalized ledger evidence.
- Evidence-linked risk and time-in-state alerts.
- Connected package verification and an interpreted workflow manifest.
- Local snapshots, Markdown report export, native sharing, and product feedback.
- Production origin restrictions, endpoint pinning, rate limits, payload caps, and gRPC timeouts.

Unknown templates still receive generic event and contract interpretation. Rich choice generation requires a reviewed workflow manifest; the included manifest covers `DamlLens.InvoiceFinance`. Arbitrary DAR semantic decoding remains a future extension because it requires a Daml-LF package decoder rather than guessing from archive bytes.

## Project layout

- `frontend/` - React and TanStack Start landing page and product UI.
- `backend/` - Node.js API that connects to Canton through the JSON Ledger API and gRPC Ledger API.
- `daml/` - Daml workflow source.
- `.daml/dist/` - compiled DAR output after `dpm build`.
- `assets/` - shared brand assets.
- `prototype-archive/` - retired static prototype kept for reference only.

## Local development

Start the backend:

```powershell
cd "C:\Users\HP\Canton Hack\backend"
npm run dev
```

Start the frontend in another terminal:

```powershell
cd "C:\Users\HP\Canton Hack\frontend"
pnpm install
pnpm dev
```

The Vite development proxy sends `/backend` requests to `http://127.0.0.1:8787`.

Build the DAR from the project root:

```powershell
dpm build
```

## Railway deployment

Create one Railway project with two services connected to the same repository.

### Backend service

1. Set the service Root Directory to `/backend`.
2. Set the Config File Path to `/backend/railway.json`.
3. Railway will use `backend/Dockerfile` and expose `/health` for health checks.
4. Generate a public domain for the service.
5. Add these variables from `backend/.env.example`:
   - `DAMLLENS_GRPC_API`
   - `DAMLLENS_JSON_API`
   - `DAMLLENS_PARTY_ID`
   - `DAMLLENS_PACKAGE_ID`
   - `DAMLLENS_WORKFLOW_ID`
6. Do not set `PORT`; Railway supplies it. Do not store a user password or long-lived bearer token.

### Frontend service

1. Set the service Root Directory to `/frontend`.
2. Set the Config File Path to `/frontend/railway.json`.
3. Add `VITE_DAMLLENS_API_URL` with the backend's public URL, without a trailing slash.
4. Deploy or redeploy after setting that variable because Vite embeds it at build time.
5. Generate a public domain for the frontend.

Example:

```text
VITE_DAMLLENS_API_URL=https://damllens-backend-production.up.railway.app
```

The backend Docker image installs `grpcurl`, so real Canton gRPC calls work in Railway. Users should continue supplying their own short-lived bearer token through the UI.
