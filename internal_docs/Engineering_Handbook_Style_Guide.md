# Engineering Handbook – Style & Best Practices

## 1  Git & Branching
* Use `main` as default. Feature branches: `feat/<ticket‑id>‑short‑desc`.
* Squash‑merge with conventional commit messages:
  ```
  feat(api): add retry middleware
  fix(frontend): handle null price
  ```

## 2  Code Style
* **Python** – black 24.3, isort, mypy strict.  
* **Typescript** – eslint airbnb+prettier.  
* **Go** – gofumpt + staticcheck.

## 3  Testing Pyramid
| Layer | Target | Ratio |
|-------|--------|-------|
| Unit | Pure functions, utils | 70 % |
| Service | Business logic | 25 % |
| E2E | Critical flows | 5 % |

## 4  CI/CD Requirements
✅ Tests pass  
✅ Coverage > 80 %  
✅ Static analysis green (SonarCloud)  
✅ Security scan (Snyk) no critical vulns

## 5  Docs as Code
Write ADRs in `/docs/adr` Markdown, numbered chronologically (`adr‑008.md`).

-- Keep shipping, stay humble --