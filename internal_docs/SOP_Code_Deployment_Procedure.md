# Standard Operating Procedure – Code Deployment

**Applies to:** Aurora platform & micro‑services  
**Last updated:** 2025‑05‑29

## 1  Pre‑Deployment
1. Merge PR to `main`; ensure semantic version bump.  
2. Verify CI pipeline green and “Ready to Deploy” tag set by Release Mgr.  
3. Announce planned deploy in #deploy‑coord (template `/deploy‑announce`).

## 2  Deployment Steps
1. Trigger GitHub Action “deploy‑prod” with commit SHA & version.  
2. Observe ArgoCD sync status; wait until all pods healthy.  
3. Run smoke tests (`smoke/<service>.sh`).  
4. Update status‑page component to “Degraded” if smoke fails.

## 3  Rollback
If p95 latency > 1 s or error‑rate > 2 % after 5 m:  
* Click “Rollback” in ArgoCD UI → previous healthy SHA.  
* Post rollback summary in #deploy‑coord.

## 4  Post‑Deployment
• Close announcement thread with ✅.  
• Tag release in Jira.  
• Create follow‑up ticket for residual tasks (DB migrations, etc.).

## 5  Versioning
Use SemVer X.Y.Z where X = breaking, Y = feature, Z = patch.