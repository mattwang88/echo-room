# Release Notes – Aurora 1.0.0 (2025‑09‑15)

🎉 **First GA release of Aurora real‑time analytics add‑on**

## Highlights
* Real‑time low‑stock predictions (stockout probability > 90 %).
* Web‑based Insights dashboard with filterable widgets.
* Stream Ingest API supports 30 K events/s sustained.

## Improvements
* Added configurable retention policy (7–30 days).  
* Optimised Flink checkpoint interval – reduced S3 cost ‑12 %.

## Bug Fixes
* Fixed race condition in Kafka offset manager.  
* Dashboard: resolved CSV export encoding issue (UTF‑8 BOM).

## Breaking Changes
* `/v1/ingest` renamed to `/v1/ingest/events`.  
* Deprecated field `sku_id` → use `sku`.

## Upgrade Notes
1. Update client SDK to ≥ 1.0.0.  
2. Switch endpoint in config.  
3. Verify ingestion metrics after deploy.

-- End --