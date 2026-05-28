# Runbook de déploiement production — Synclune

Procédure end-to-end pour mettre Synclune en production (premier déploiement) et
pour les déploiements ultérieurs. Référence l'audit DevOps du 2026-05-28
(`~/.claude/plans/tu-es-un-auditeur-swirling-phoenix.md`).

---

## Vue d'ensemble du pipeline

```
git push main
    │
    ├──▶ GitHub Actions CI  (lint / typecheck / tests / build / e2e)
    │
    └──▶ Vercel deploy      (build Next.js + Edge functions + Cron jobs)
              │
              └──▶ Production live

Migrations DB : workflow GitHub Actions séparé déclenché MANUELLEMENT
                (`.github/workflows/migrate-deploy.yml`) AVANT le push main
                contenant la migration.
```

---

## J-7 — Pré-requis externes

| Plateforme  | Action                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Domaine** | DNS A/AAAA + ACME challenge → Vercel. CNAME pour sous-domaine si besoin.                                                |
| **Neon**    | Project prod créé, `DATABASE_URL` (pooler) et `DATABASE_URL_UNPOOLED` (direct) notées. **Vérifier la région** (cf J-1). |
| **Stripe**  | Compte activé (pas test). Webhook endpoint enregistré → `https://synclune.fr/api/webhooks/stripe`. Noter `whsec_…`.     |
| **Resend**  | Domaine `synclune.fr` ajouté + DKIM/SPF/DMARC verts dans le dashboard. Noter API key.                                   |
| **Sentry**  | Project créé. DSN + Auth token (rôle "Release Production"). Org/project slugs.                                          |
| **GitHub**  | Repository secrets configurés (cf. tableau J-1).                                                                        |
| **Vercel**  | Project lié au repo. Plan Pro ou supérieur si crons + analytics.                                                        |

---

## J-1 — Configuration des secrets

### Vercel Project Settings → Environment Variables (Production)

Tous les secrets `(requis prod)` du `.env.example` doivent être configurés sur
Vercel. Vérifier en particulier :

| Variable                               | Notes                                                        |
| -------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`                         | URL Neon **pooler** (PgBouncer).                             |
| `BETTER_AUTH_SECRET`                   | ≥32 chars. Régénéré pour la prod (jamais la valeur dev).     |
| `BETTER_AUTH_URL`                      | `https://synclune.fr` (pas localhost).                       |
| `STRIPE_SECRET_KEY`                    | `sk_live_…` (jamais `sk_test_…`).                            |
| `STRIPE_WEBHOOK_SECRET`                | `whsec_…` correspondant à l'endpoint **prod**.               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | `pk_live_…`.                                                 |
| `RESEND_API_KEY`                       | API key prod (limite domaine vérifié).                       |
| `RESEND_CONTACT_EMAIL`                 | `contact@synclune.fr` (doit matcher le domaine vérifié).     |
| `UPLOADTHING_TOKEN`                    | Token UploadThing **prod**.                                  |
| `CRON_SECRET`                          | ≥32 chars. Différent du secret dev.                          |
| `NEXT_PUBLIC_SENTRY_DSN`               | DSN du project Sentry.                                       |
| `SENTRY_ORG`, `SENTRY_PROJECT`         | Pour upload sourcemaps.                                      |
| `SENTRY_AUTH_TOKEN`                    | Scope `project:releases`. Build-time only.                   |
| `HEALTHCHECK_TOKEN`                    | ≥32 chars. À transmettre à la sonde externe (UptimeRobot…).  |
| `EMAIL_ADMIN_BCC`                      | Email fallback pour alertes critiques (optionnel mais reco). |
| `VENDOR_SIRET` / `VENDOR_VAT_NUMBER` … | Mentions légales factures — **obligatoire** avant émission.  |
| `VENDOR_EINVOICING_PLATFORM_ID`        | À renseigner dès contrat PDP signé (cible sept 2027).        |
| `INVOICE_PROVIDER`                     | `local` jusqu'à activation PDP, puis `pdp-xxx`.              |

### GitHub Actions secrets (Settings → Secrets and variables → Actions)

| Secret                                                                               | Usage                                |
| ------------------------------------------------------------------------------------ | ------------------------------------ |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED`                                             | Workflow `migrate-deploy.yml` + e2e. |
| `BETTER_AUTH_SECRET` …                                                               | Workflow `e2e-smoke` et `e2e`.       |
| `E2E_ADMIN_EMAIL/PASSWORD`                                                           | Comptes Playwright (DB seedée).      |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | E2E (mode test).                     |
| `RESEND_API_KEY` / `UPLOADTHING_TOKEN`                                               | E2E.                                 |

### Vérifier la région Vercel ↔ Neon

`vercel.json` impose `cdg1` (Paris). Vérifier que Neon est en EU
(eu-central-1 ou eu-west-1). Si Neon est en US, soit déplacer Neon, soit
modifier `vercel.json` pour aligner (`iad1` pour US-East). Latence cible
< 50 ms app↔DB.

---

## J0 — Premier déploiement

### 1. Pré-flight (local)

```bash
# 1.1 — Build production local doit passer
NODE_ENV=production pnpm build

# 1.2 — Validation env vars Zod (boot fail-fast si une requise manque)
pnpm tsx -e "import('./shared/lib/env').then(() => console.log('env OK'))"

# 1.3 — Toute la suite de tests verte
pnpm test:critical
pnpm e2e --grep @smoke
```

### 2. Appliquer les migrations en prod

```bash
# Via GitHub Actions UI :
#   Actions → "Migrate database (prod)" → Run workflow
#   target: prod
#   dry_run: true   # première passe pour voir les migrations en attente
```

Vérifier la liste affichée. Puis relancer avec `dry_run: false` pour
appliquer.

Alternative locale (déconseillée — moins traçable) :

```bash
DATABASE_URL=$NEON_DIRECT_URL pnpm dlx prisma migrate deploy
```

### 3. Premier deploy Vercel

```bash
# Si auto-deploy push main activé :
git push origin main

# Sinon, depuis l'UI Vercel : Deployments → Promote preview to production
```

### 4. Vérifications post-deploy

```bash
# 4.1 — Healthcheck public
curl https://synclune.fr/api/health
# attendu : {"status":"ok"}

# 4.2 — Healthcheck détaillé (avec token)
curl "https://synclune.fr/api/health?token=$HEALTHCHECK_TOKEN" | jq
# attendu : status=ok + services.database/stripe/resend tous "ok"

# 4.3 — Sentry tunnel atteint
curl https://synclune.fr/monitoring -X POST -d '{}'
# attendu : 200 (corps vide OK)

# 4.4 — Crons Vercel actifs
# Vercel Dashboard → Project → Cron Jobs → vérifier que les 22 crons
# sont listés et que le dernier run est récent (max 30 min pour
# retry-webhooks).

# 4.5 — Stripe webhook reçu
# Dashboard Stripe → Developers → Webhooks → cliquer l'endpoint prod
# → "Send test event" (payment_intent.succeeded) → vérifier 2xx.

# 4.6 — Resend domain authentifié
# Resend Dashboard → Domains → synclune.fr → DKIM/SPF/DMARC tous verts.

# 4.7 — Premier email transactionnel
# Faire une commande test avec une carte Stripe test live :
#   carte 4242 4242 4242 4242 → 12/34 → CVC 123
# Vérifier dans Resend Dashboard que l'email a été envoyé.
# Vérifier que NEXT_PUBLIC_SENTRY_DSN capture les erreurs (Sentry → Issues).
```

---

## Déploiements ultérieurs

### Sans migration DB

```bash
git push origin main
# Vercel auto-deploy
# → vérif rapide : curl /api/health
```

### Avec migration DB

```bash
# 1. Créer la migration en local
DATABASE_URL=$LOCAL_DB pnpm prisma migrate dev --name add_foo_field

# 2. AJOUTER LE down.sql paire (obligatoire — CLAUDE.md §Migrations)
echo "ALTER TABLE foo DROP COLUMN bar;" > prisma/migrations/<timestamp>_add_foo_field/down.sql

# 3. Commit + push main (l'app va référencer la colonne, mais le code
#    qui l'utilise n'est pas encore appelé tant que la migration n'est
#    pas appliquée — ordering safe pour add column nullable)

# 4. AVANT que Vercel finisse le build, déclencher la migration :
#    GitHub Actions → "Migrate database (prod)" → Run workflow

# 5. Vérifier le statut final
curl "https://synclune.fr/api/health?token=$HEALTHCHECK_TOKEN" | jq
```

**Règle d'or — migrations expand/contract** : pour les changements
breaking (drop column, rename, NOT NULL sur colonne existante),
déployer en deux étapes :

1. **Expand** : ajouter la nouvelle colonne nullable + code qui écrit
   dans l'ancienne ET la nouvelle.
2. **Contract** : après backfill + déploiement, retirer l'ancienne
   colonne.

---

## Rollback

### App seule (pas de migration)

1. Vercel Dashboard → Deployments → précédent deployment → "Promote to
   production". Effet immédiat (< 30 s).

### App + migration DB

| Scénario                                       | Procédure                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Migration récente (≥ 2025-11-24, `down.sql` ✓) | Promote ancien deployment Vercel + exécuter `down.sql` côté Neon. |
| Migration historique (pas de `down.sql`)       | Neon PITR — restore avant la migration (perte des nouveaux rows). |
| Donnée corrompue sans migration                | Neon PITR (rétention 7j sur free, 30j sur paid).                  |

#### Procédure PITR Neon

```bash
# 1. Identifier le point à restaurer (Neon Dashboard → Branches → main
#    → Restore → choisir un timestamp UTC).
# 2. Créer un branch de restore (Neon le fait automatiquement).
# 3. Pointer DATABASE_URL_UNPOOLED sur le branch restoré.
# 4. Verify côté app via /api/health?token=...
# 5. Si OK, promouvoir le branch en `main` (Neon UI).
```

---

## Kill-switch PWA (Service Worker buggé)

Si une version du service worker (`app/sw.ts`) est déployée et casse
l'expérience utilisateur, les users gardent l'ancienne version en cache
tant qu'ils ne ferment pas tous les onglets.

### Procédure d'urgence

1. **Identifier** : Sentry > Issues filtrées par `serwist` ou erreurs
   `TypeError` en boucle sur les routes `/`.
2. **Déployer un SW « kill-switch »** : remplacer temporairement
   `app/sw.ts` par :
   ```ts
   self.addEventListener("install", (event) => {
   	event.waitUntil(self.skipWaiting());
   });
   self.addEventListener("activate", (event) => {
   	event.waitUntil(
   		(async () => {
   			await self.registration.unregister();
   			const clients = await self.clients.matchAll();
   			clients.forEach((client) => client.navigate(client.url));
   		})(),
   	);
   });
   ```
3. Push + deploy. Les browsers vont télécharger ce SW, le faire `skipWaiting`,
   puis lors de l'activation appeler `unregister()` et reload la page.
4. Une fois propagé (24-48h selon le trafic), restaurer le SW normal.

**Prévention** : tester `pnpm build && pnpm start` localement + DevTools

> Application > Service Workers avant tout merge touchant `app/sw.ts`.

---

## Monitoring opérationnel

| Outil            | URL                                     | Alerte                           |
| ---------------- | --------------------------------------- | -------------------------------- |
| Sentry           | Dashboard project                       | Email + Slack si > 10 events/min |
| Vercel Logs      | Project → Logs                          | Filtré 4xx/5xx                   |
| Stripe Dashboard | Developers → Webhooks                   | Webhook failures > 5/min         |
| Resend           | Logs → Failed/Bounced                   | Bounce rate > 5%                 |
| Neon             | Dashboard → Branches → Compute          | CPU > 80%, connections > 80      |
| Healthcheck      | sonde externe → `/api/health?token=...` | Status ≠ ok pendant 2 min        |

### Alertes admin emails (auto)

Le service `modules/emails/services/admin-emails.ts` envoie à
`RESEND_CONTACT_EMAIL` (+ `EMAIL_ADMIN_BCC` si défini) sur :

- `payment_failed` / `refund_failed`
- `webhook_failed` (3 retries Stripe épuisés)
- `cron_failed` (any cron with errored > 0)
- `stuck_orders` (PROCESSING > 7j, SHIPPED > 14j)
- `dispute` créé/clos
- `invoice_failed` / `invoice_sequence_overflow` (Art. 286 CGI)
- `ereporting_stuck` (batch DGFiP bloqué)
- `pdf_archive_failed`

---

## Checklist de validation rapide (post-deploy)

```bash
# Score readiness : tout doit être vert.
curl -fsS https://synclune.fr/api/health > /dev/null && echo "✓ health"
curl -fsS https://synclune.fr/sitemap.xml | head -1 | grep -q xml && echo "✓ sitemap"
curl -fsS https://synclune.fr/robots.txt | head -1 && echo "✓ robots"
curl -fsS -o /dev/null -w "%{http_code}\n" https://synclune.fr/   # 200
curl -fsS -o /dev/null -w "%{http_code}\n" https://synclune.fr/creations  # 200
curl -fsS -o /dev/null -w "%{http_code}\n" https://synclune.fr/admin  # 302 (redirect login)
```
