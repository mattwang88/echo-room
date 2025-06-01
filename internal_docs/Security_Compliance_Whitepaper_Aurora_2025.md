# Security & Compliance Whitepaper – Aurora Platform (May 2025)

> Detailed exposition of Aurora's security controls, compliance certifications,
> and shared responsibility model.

## Table of Contents
1. Executive Summary  
2. Architectural Overview  
3. Data Protection  
4. Identity & Access Management  
5. Network Security  
6. Development Lifecycle & DevSecOps  
7. Compliance Framework Mapping  
8. Incident Response  
9. Penetration Test Results (2025 Q1)  
10. Physical Security  
11. Business Continuity & DR  
12. Audit & Monitoring  
13. Customer Responsibilities  
14. Appendix: Encryption Inventory

## 1  Executive Summary
Aurora inherits Acme’s multi‑tenant zero‑trust architecture. Data is
encrypted in transit and at rest (TLS 1.3, AES‑256‑GCM). Aurora is certified
under **SOC 2 Type II** and included in our **ISO 27001** statement of
applicability. PCI DSS scope: **out‑of‑scope** (no cardholder data stored).

## 2  Architectural Overview
```
[Client] --TLS13--> [CloudFront + WAF] --mTLS--> [Ingest Gateway]
[Gateway] --TLS--> [Kafka] --IAM--> [Flink Cluster] --> [Feature Store]
```
Tenants share control plane but have dedicated Kafka topics partitioned by
tenant‑id. Feature Store uses row‑level policies enforced via
Lake Formation.

## 3  Data Protection
### 3.1 Encryption at Rest & In Transit
| Storage Layer | Algorithm | KMS Key Rotation |
|---------------|-----------|------------------|
| S3 Raw Events | AES‑256‑GCM | 365 days |
| RDS Aurora | AES‑256 TDE | Automatic |
| Flink Checkpoints | AES‑256‑CTR | 90 days |
| Backups | AES‑256‑GCM | 30 days |

### 3.2 Data Masking
PII fields (`customer_email`, `phone`) are hashed or tokenised before export.

### 3.3 Key Management
Customer Managed Keys (CMKs) are supported; otherwise keys managed by AWS KMS
in separate account.

## 4  Identity & Access Management
• SSO via SAML 2.0/OIDC with SCIM provisioning.  
• Role Based Access Control with attribute constraints (`tenant_id`).  
• Admin actions require WebAuthn FIDO2 MFA.

## 5  Network Security
* Layer‑7 WAF rules block OWASP Top‑10, CVE feeds auto‑updated.  
* Private subnets using S3 VPC endpoint – no direct Internet egress.  
* Bastion hosts replaced by AWS SSM Session Manager.

## 6  Development Lifecycle & DevSecOps
| Phase | Control | Tool |
|-------|---------|------|
| Planning | Threat modelling | OWASP Threat Dragon |
| Code | SAST | Semgrep, SonarQube |
| Build | SBOM generation | Syft |
| Test | DAST | OWASP ZAP |
| Release | Provenance attestation | Sigstore Cosign |
| Runtime | Container scanning | Trivy (cron) |

## 7  Compliance Framework Mapping
| Control | SOC 2 | ISO 27001 | GDPR | HIPAA |
|---------|-------|-----------|-------|-------|
| Encryption | CC6.1 | A.10 | Art.32 | §164.312 |
| Access Reviews | CC6.3 | A.9.2 | Art.5‑1(f) | §164.308 |
| DR | CC7.2 | A.17 | Art.32 | §164.308 |

## 8  Incident Response
* 24 × 7 PagerDuty, SEV‑1 RTO ≤ 30 min.  
* Post‑mortems follow “blameless” template, published internally.

## 9  Penetration Test Results (Q1 2025)
* Vendor: NCC Group.  
* Findings: Critical 0, High 1, Medium 3, Low 12 (resolved).  
* CVE‑2025‑12789 (Grafana) patched within 24 h.

## 10  Physical Security
Aurora is hosted entirely in AWS; see AWS SOC reports.

## 11  Business Continuity & DR
• Daily multi‑AZ snapshots; RPO < 4 h.  
• Region failover test Feb 2025 – 134 min to full customer traffic.

## 12  Audit & Monitoring
* CloudTrail events aggregated to Security Lake (7 year retention).  
* Anomaly detection via GuardDuty, alerts in Slack #security‑alerts.

## 13  Customer Responsibilities
• Configure IAM principals, rotate credentials.  
• Review audit logs; respond to GuardDuty delegated findings.

## 14  Appendix: Encryption Inventory
| Component | Data | Encryption | Rotation |
|-----------|------|------------|----------|
| Kafka | messages | AES‑256 SSE‑KMS | 1 year |
| Redshift | tables | AES‑256 | 3 years |
| Logs | S3 Glacier | AES‑256 | 7 years |

-- End --