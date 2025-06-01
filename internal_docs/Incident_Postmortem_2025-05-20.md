# Incident Postmortem – Service Outage on 2025‑05‑20
**Severity:** SEV‑1  
**Duration:** 08:41–09:54 UTC (1 h 13 m)  
**Affected services:** Public API v3, Dashboard

## 1  Summary
A mis‑configured feature flag rollout caused a surge of 502 errors
(up to 96 %) across the EU region. Customer impact: delayed order
processing and failed webhook callbacks.

## 2  Timeline (UTC)
| Time | Event |
|------|-------|
| 08:41 | Alertmanager page: “API 5xx > 20 %” |
| 08:46 | Eng on‑call confirms global API failout |
| 08:49 | Rollback initiated, but stuck in canary loop |
| 09:02 | Flag percentage set to 0 % – errors drop |
| 09:18 | All regions stable, start RCA |
| 09:54 | Incident resolved, status page green |

## 3  Root Cause
Flag `orders.newProcessor.enabled` was pushed to 50 % traffic
without enabling the prerequisite Kafka topic creation. The new
processor hard‑failed on missing topic, returning 502 upstream.

## 4  What Went Well
* Alerting fired within 2 m of error spike.
* Slack #/incident channel auto‑created, SREs joined quickly.

## 5  What Went Wrong
* Pre‑flight dependency checks missing in rollout script.
* Rollback playbook lacked “force‑skip canary” step.
* Status page update delayed (published 23 m after start).

## 6  Actions Items
| # | Owner | Priority | Due |
|---|-------|----------|-----|
| 1 | SRE | Add automatic dependency validator to flag‑push (PRD) | 2025‑06‑05 |
| 2 | Platform Eng | Implement canary force‑abort CLI | 2025‑06‑12 |
| 3 | Comms | Automate status page update via API | 2025‑06‑01 |

## 7  Follow‑Up
Schedule “blameless postmortem” meeting by 2025‑05‑27.