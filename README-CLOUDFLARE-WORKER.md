# Meta-Agent: Cloudflare Worker Orchestration

A distributed meta-agent system that orchestrates 3 intelligent LLM assistants in a workflow:
1. **Admin Assistant** – Backend architect (Cloudflare Workers AI – Mistral-7B)
2. **Client Assistant** – UX/interaction flow designer
3. **Curier Assistant** – Delivery routing expert

## Architecture

```
┌────────────────────────────────────────────┐
│     Cloudflare Worker (meta-agent)        │
│               POST /run                    │
│         Orchestrator & Router              │
└────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Admin   │  │ Client  │  │ Curier  │
   │ HTTP    │  │ HTTP    │  │ HTTP    │
   │ Server  │  │ Server  │  │ Server  │
   └─────────┘  └─────────┘  └─────────┘
        ↓             ↓             ↓
   LLM Output   Screen Plans   Route Plans
```

## Setup

### 1. Local Development (Node.js Server + Worker Testing)

#### Start the HTTP Server (exposes assistants)
```bash
npm install express
npm run server
# Listens on http://localhost:3000
```

**Available Endpoints:**
- `POST /assistant/admin` – Backend architect
- `POST /assistant/client` – UX flow designer
- `POST /assistant/curier` – Delivery router
- `GET /health` – Server health check

#### Test HTTP Endpoints
```bash
node test-endpoints.js
```

### 2. Cloudflare Worker Deployment

#### Install Wrangler (Cloudflare CLI)
```bash
npm install -g @cloudflare/wrangler
# or: npm install --save-dev @cloudflare/wrangler
```

#### Create `wrangler.toml`
```toml
name = "meta-agent-worker"
main = "meta-agent.worker.js"
compatibility_date = "2024-01-01"

[env.production]
route = "https://meta-agent.example.com/*"
account_id = "YOUR_ACCOUNT_ID"
```

#### Deploy to Cloudflare
```bash
wrangler publish meta-agent.worker.js
# or: wrangler deploy
```

#### Update Backend URL in Worker
Edit `meta-agent.worker.js` line 5:
```javascript
const BACKEND_URL = 'https://your-production-domain.com'; // Update to production
```

## API Reference

### Request Format

**Endpoint:** `POST /run`

```json
{
  "goal": "order.create",
  "context": {
    "admin": {
      "domain": "delivery",
      "budget": "standard"
    },
    "client": {
      "platform": "mobile",
      "userType": "courier"
    },
    "curier": {
      "region": "city-center",
      "vehicleType": "bike"
    }
  }
}
```

### Response Format

**Success Response (HTTP 200)**
```json
{
  "status": "ok",
  "stepsExecuted": ["admin", "client", "curier"],
  "results": {
    "admin": {
      "assistant": "admin",
      "status": "ok",
      "analysis": "...",
      "confidence": 1,
      "risks": [],
      "llmProvider": "Cloudflare (Mistral-7b)",
      "firestoreProposal": {
        "collections": ["orders", "clients", "couriers"],
        "fields": { ... },
        "notes": [...]
      }
    },
    "client": {
      "assistant": "client",
      "clientPlan": {
        "screens": ["OrderCreation", "PickupDetails", ...],
        "actions": ["createOrder()", "selectPickupAddress()", ...],
        "notes": [...]
      }
    },
    "curier": {
      "assistant": "curier",
      "deliveryPlan": {
        "orders": [...],
        "routes": [...],
        "eta": {...},
        "notes": [...]
      }
    }
  },
  "conflicts": [],
  "nextActions": [
    "Review and implement Firestore schema from admin proposal",
    "Build UI screens according to client plan",
    "Configure delivery routing and ETA system"
  ],
  "timestamp": "2026-02-07T14:30:00Z"
}
```

**Error Response (HTTP 400/500)**
```json
{
  "status": "error",
  "message": "Orchestration failed",
  "errors": ["Admin assistant error: ...", "..."],
  "stepsExecuted": ["admin"],
  "results": { "admin": {...} },
  "timestamp": "2026-02-07T14:30:00Z"
}
```

## Usage Examples

### cURL

```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "order.create",
    "context": {
      "admin": {"domain": "delivery"},
      "client": {"platform": "mobile"},
      "curier": {"region": "city-center"}
    }
  }'
```

### Node.js / Fetch

```javascript
const response = await fetch('http://localhost:3000/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    goal: 'order.create',
    context: {
      admin: { domain: 'delivery' },
      client: { platform: 'mobile' },
      curier: { region: 'city-center' }
    }
  })
});

const result = await response.json();
console.log(result);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/run',
    json={
        'goal': 'order.create',
        'context': {
            'admin': {'domain': 'delivery'},
            'client': {'platform': 'mobile'},
            'curier': {'region': 'city-center'}
        }
    }
)

print(response.json())
```

## Orchestration Flow

1. **Admin Phase** → Backend schema design
   - Receives: `goal` + `context.admin`
   - Returns: Firestore schema proposal

2. **Client Phase** → UX flow design
   - Receives: `goal` + `context.client` + **admin output**
   - Returns: Screen definitions & actions
   - Uses admin schema to inform screen data

3. **Curier Phase** → Route optimization
   - Receives: `goal` + `context.curier` + **client output**
   - Returns: Delivery routes & ETAs
   - Uses client screens to determine UX integration

## Error Handling

The worker gracefully handles:
- Missing `goal` parameter → HTTP 400
- Assistant timeouts (30s) → Returns partial results
- HTTP failures → Automatic fallback
- JSON parsing errors → Descriptive error message
- Network unavailability → Timeout with collected results

## Timeout & Retry Logic

- **Per-assistant timeout:** 30 seconds
- **Fail-fast strategy:** If admin fails, orchestration stops
- **Partial results:** Returns completed steps even if later steps fail

## Monitoring & Debugging

Enable debug logging in `meta-agent.worker.js`:

```javascript
// Line 8 (in orchestrateAssistants):
console.log('📋 Step 1: Calling admin assistant...');
console.log('✅ Admin assistant completed');
```

View logs with:
```bash
wrangler tail meta-agent-worker
```

## File Structure

```
meta-agent/
├── package.json              # Project config + dependencies
├── server.js                 # HTTP server (Express) exposing assistants
├── meta-agent.worker.js      # Cloudflare Worker orchestrator
├── test-endpoints.js         # Test all endpoints
├── index.js                  # CLI entry point (Node.js)
├── metaAgent.js              # Local orchestrator (Node.js)
├── assistants/
│   ├── admin.js              # Backend architect (LLM)
│   ├── client.js             # UX flow designer
│   └── curier.js             # Delivery router
├── prompts/
│   ├── admin.md              # Admin assistant prompt
│   ├── client.md             # Client assistant prompt
│   └── curier.md             # Curier assistant prompt
├── .env                      # Credentials (Cloudflare, Groq, OpenAI)
└── README.md                 # This file
```

## Configuration

### Environment Variables (.env)

```
# Cloudflare Workers AI
CLOUDFLARE_API_TOKEN=xxxxx
CLOUDFLARE_ACCOUNT_ID=xxxxx

# Fallback LLM Providers (used if CF unavailable)
GROQ_API_KEY=xxxxx
OPENAI_API_KEY=xxxxx

# Use admin assistant only for Cloudflare
# client & curier use rule-based fallback

# Server Port (optional)
PORT=3000
```

### Cloudflare Worker Environment (wrangler.toml)

```toml
[env.production]
vars = { BACKEND_URL = "https://api.example.com" }
```

## Production Deployment Checklist

- [ ] Update `BACKEND_URL` in `meta-agent.worker.js`
- [ ] Set `wrangler.toml` account_id & route
- [ ] Test endpoints with production data
- [ ] Enable error logging & monitoring
- [ ] Set up rate limiting (optional)
- [ ] Add authentication/authorization (optional)
- [ ] Monitor Cloudflare Analytics
- [ ] Test timeout scenarios
- [ ] Validate JSON parsing edge cases

## Common Issues

### Issue: Worker returns "Backend unavailable"
**Solution:** Ensure server.js is running and BACKEND_URL is correct

### Issue: 30-second timeout
**Solution:** Check server logs; assistants taking too long. Consider caching.

### Issue: Partial results (only admin completed)
**Solution:** Check /assistant/client and /assistant/curier endpoints individually

### Issue: JSON parsing errors
**Solution:** Ensure assistants return valid JSON; use `test-endpoints.js` to debug

## Performance Metrics

- **Admin assistant:** ~5-10s (LLM inference)
- **Client assistant:** ~2-3s (rule-based)
- **Curier assistant:** ~2-3s (rule-based)
- **Total orchestration:** ~10-20s (sequential)

**Future optimization:** Parallelize client & curier calls (they don't depend on each other)

## License

MIT
