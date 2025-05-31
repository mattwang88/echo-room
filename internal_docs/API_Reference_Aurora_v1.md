# Aurora Public API – v1 Reference
**Base URL:** `https://api.acme.io/v1/`

## Auth
Header: `Authorization: Bearer <token>` (OAuth2 client‑credentials)

## Endpoints
### 1  /stock/alerts
`GET /stock/alerts?sku=<sku>&since=<timestamp>`  
Returns JSON array of low‑stock alerts.

**200 Response**
```json
[
  {
    "sku": "SKU‑123",
    "warehouse": "DE‑HAM",
    "predicted_oos_at": "2025‑05‑31T22:00:00Z",
    "probability": 0.94
  }
]
```

### 2  /ingest/events
`POST /ingest/events`
Payload: NDJSON, one event per line.

| Field | Type | Notes |
|-------|------|-------|
| `tenant_id` | string | GUID |
| `event_type` | string | e.g. `order.created` |
| `payload` | object | arbitrary |

**Responses**
* `202` – accepted  
* `400` – validation error  
* `429` – rate‑limited (Retry‑After header)

## Rate Limits
Default: 15 K RPS / tenant. Burst tokens: request via Support.