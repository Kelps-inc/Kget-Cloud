# Workflow de Desenvolvimento

## Branches

```
main        → produção (Railway). Nunca commitar direto.
develop     → staging / integração. Base para PRs do junior.
feat/KGE-XX → feature branch por issue Linear
fix/KGE-XX  → bug fix branch
```

## Fluxo de uma feature

```
1. Pegar issue no Linear (KGE-XX)
2. Criar branch:
   git checkout develop
   git pull
   git checkout -b feat/KGE-XX-nome-da-feature

3. Implementar + escrever testes
4. Commitar (conventional commits obrigatório):
   feat(identity): add register-user use-case (KGE-5)

5. Abrir PR → develop
6. CI roda automaticamente (lint + type-check + bun test + cargo test)
7. Review obrigatório (1 aprovação mínima)
8. Merge após CI verde + aprovação

9. Deploy para produção:
   PR develop → main (feito pelo senior)
```

## Conventional Commits

Formato: `type(scope): descrição breve (KGE-XX)`

| Type | Quando usar |
|------|-------------|
| `feat` | Nova feature |
| `fix` | Bug fix |
| `refactor` | Refactor sem mudar comportamento |
| `test` | Adicionar/corrigir testes |
| `chore` | Deps, configs, CI |
| `docs` | Documentação |
| `perf` | Melhoria de performance |
| `ci` | Mudanças no pipeline |

## Proteção de branches no GitHub

Configure em **Settings → Branches → Branch protection rules** para `main` e `develop`:

- [x] Require a pull request before merging
- [x] Require approvals: **1**
- [x] Require status checks to pass: `Lint & Type-check`, `API Tests (Bun)`, `Web Tests (Bun)`, `Rust Agent (cargo test)`, `Railway Docker build`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

## Secrets no Railway

Configure em **Railway → Project → Variables** (nunca no código):

```
DATABASE_URL
REDIS_URL
JWT_SECRET
API_URL
WEB_URL
OPENAI_API_KEY
ABACATEPAY_API_KEY
ABACATEPAY_WEBHOOK_SECRET
STORAGE_PROVIDER
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
```

## Secrets no GitHub Actions

Configure em **GitHub → Settings → Secrets and variables → Actions**:

```
RAILWAY_TOKEN     → Project Token do Railway para o ambiente de produção
DATABASE_URL      → valor de DATABASE_PUBLIC_URL do PostgreSQL Railway (para migrate deploy no GitHub Actions)
```

Configure também em **Variables → Repository variables** se os serviços no Railway não se chamarem exatamente `api` e `web`:

```
RAILWAY_API_SERVICE=@kget-cloud/api
RAILWAY_WEB_SERVICE=@kget-cloud/web
```

No Railway, cada serviço deve apontar para seu arquivo:

```
API → infra/railway/api.railway.json
Web → infra/railway/web.railway.json
```

Os start commands esperados são:

```
API → bunx prisma migrate deploy && node dist/main
Web → node apps/web/server.js
```

### Setup automatizado do GitHub

Com o `gh` autenticado em uma conta com permissão de admin no repositório, é possível aplicar os secrets, variables e branch protection com:

```bash
gh auth login -h github.com -s repo,workflow

export RAILWAY_TOKEN="..."
export DATABASE_URL="..."
export RAILWAY_API_SERVICE="api"
export RAILWAY_WEB_SERVICE="web"

bash scripts/configure-github-ci.sh
```

Se o repositório privado ainda não tiver GitHub Pro, pule a proteção de branch por enquanto:

```bash
SKIP_BRANCH_PROTECTION=1 bash scripts/configure-github-ci.sh
```

Use um Project Token criado em **Railway → Project → Settings → Tokens**, porque o CLI usa `RAILWAY_TOKEN` para ações de projeto em CI/CD. Para o secret `DATABASE_URL` do GitHub, copie o valor público do PostgreSQL do Railway (`DATABASE_PUBLIC_URL`), já que o `prisma migrate deploy` roda fora da rede Railway. Dentro dos serviços Railway, mantenha a variável `DATABASE_URL` interna/privada. Se algum valor apareceu em print, gere um novo token/senha antes de configurar produção.

## Para o dev junior

- Trabalha sempre em `feat/KGE-XX` branches a partir de `develop`
- PR sempre para `develop`, nunca para `main`
- Não tem acesso de push direto em `main` nem `develop` (branch protection)
- Dúvidas sobre arquitetura DDD: ver `docs/architecture.md`
- Antes de qualquer commit: `bun run lint && bun run test` localmente
