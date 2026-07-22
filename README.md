# DamlLens

DamlLens turns Canton/Daml ledger activity into readable workflow timelines, contract state, party authority, and risk alerts.

## Product capabilities

- Secure Noders OIDC login with automatic primary-party resolution.
- User-scoped active-contract discovery with optional 15-second live refresh.
- Generated action inbox based on Daml controller roles and connected-party authority.
- Multi-party invoice progression across supplier, buyer, and financier sessions.
- Timeline, contract inventory, party-role map, and normalized ledger evidence.
- Evidence-linked risk and time-in-state alerts.
- Secure DAR upload and semantic decoding for templates, fields, choices, visibility, authority, and likely transitions.
- Connected package verification and reviewed-model fallback when a DAR is unavailable.
- Local snapshots, Markdown report export, native sharing, and product feedback.
- Production origin restrictions, endpoint pinning, rate limits, payload caps, and gRPC timeouts.

The practical hybrid decoder validates each uploaded DAR with the pinned Daml 3.5.2 compiler, inspects its Daml-LF structure, and normalizes the result into DamlLens's workflow model. Live ledger evidence remains the source of truth for runtime party values and contract history. Authority inferred from static package structure is labeled by confidence, while dynamic expressions are resolved conservatively at runtime. Unknown templates still receive generic event and contract interpretation, and the included reviewed manifest remains available as a fallback.

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

The backend Docker image installs `grpcurl` and the pinned Daml 3.5.2 compiler, so real Canton gRPC calls and DAR decoding work in Railway. Users authenticate through the configured Noders OIDC login; credentials are entered only on the identity provider's page and are not carried by DamlLens.
