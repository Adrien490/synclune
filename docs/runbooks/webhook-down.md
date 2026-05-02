# Runbook — Webhook Stripe en panne

## Symptômes

- Sentry : pic d'issues taggées `route: api/webhooks/stripe` ou `service: webhook-stripe`.
- Stripe Dashboard → Developers → Webhooks : taux d'échec > 0 % sur l'endpoint `/api/webhooks/stripe`.
- Commandes payées mais restant en `PENDING` côté DB (paiement Stripe OK mais `Order.paymentStatus` non mis à jour).
- Emails de confirmation non envoyés malgré paiement réussi.

## Diagnostic rapide

1. **Vérifier la santé du service** :

   ```bash
   curl https://synclune.fr/api/health
   ```

   → 200 attendu, sinon DB ou Stripe down.

2. **Logs Vercel** (route `api/webhooks/stripe`) :
   - `Invalid webhook signature` → secret désynchronisé entre Stripe et `STRIPE_WEBHOOK_SECRET`.
   - `WebhookEvent already processed` → idempotence OK, pas un bug.
   - `Anti-replay window exceeded` → événement Stripe trop ancien (> 5 min) — normal en cas de retry massif.

3. **Stripe Dashboard** → événement → onglet "Webhook attempts" :
   - 4xx : bug applicatif (signature, anti-replay, schéma payload).
   - 5xx : erreur runtime → cf. Sentry pour stack.

## Actions correctives

### Cas 1 — Signature invalide

1. Aller sur Stripe Dashboard → Webhooks → endpoint Synclune.
2. Cliquer "Reveal signing secret".
3. Mettre à jour `STRIPE_WEBHOOK_SECRET` dans Vercel (Production + Preview).
4. Redeploy.

### Cas 2 — Erreur runtime (5xx)

1. Identifier le handler en cause (Sentry tag `eventType` = `payment_intent.succeeded`, `charge.refunded`, …).
2. Stripe retry automatiquement pendant 3 jours avec backoff exponentiel — laisser le système se rattraper.
3. Si erreur permanente : corriger le bug, deploy, puis dans Stripe Dashboard → "Replay" sur les événements `failed`.

### Cas 3 — DB ou Stripe down

- Vercel restera à `503` tant que `/api/health` est rouge.
- Stripe va retry — ne rien faire, surveiller.
- Si > 1h : escalade infra (Neon/Stripe status page).

## Rollback

Si déploiement récent suspect :

```bash
gh release list --limit 5
# Identifier le tag pré-incident
vercel rollback <deployment-url>
```

## Vérification post-fix

1. Stripe Dashboard → "Send test webhook" → `payment_intent.succeeded` → 200 OK.
2. Sentry : plus de nouvelles issues sur `api/webhooks/stripe` depuis 15 min.
3. Une commande de test passe checkout → confirmation email reçu.
