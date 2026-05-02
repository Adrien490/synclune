# Runbook — Remboursement bloqué

## Symptômes

- Refund créé en DB avec `status: PROCESSING` depuis > 30 min.
- Client se plaint de ne pas avoir reçu son remboursement.
- Sentry : `service: refunds` issues répétées.
- Stripe Dashboard → Refunds : status `failed` ou pas de refund Stripe correspondant.

## Diagnostic rapide

1. **Statut DB du Refund** :

   ```sql
   SELECT id, "stripeRefundId", status, "failureReason", "createdAt"
   FROM "Refund"
   WHERE "createdAt" > NOW() - INTERVAL '24 hours'
   ORDER BY "createdAt" DESC;
   ```

2. **Statut Stripe** : récupérer `stripeRefundId` puis Stripe Dashboard → Refunds → ID.
   - `succeeded` côté Stripe mais `PROCESSING` côté DB → webhook `charge.refunded` non reçu (cf. webhook-down.md).
   - `failed` côté Stripe → cause dans `failure_reason` (insufficient funds, expired card, lost dispute…).
   - Pas de refund Stripe → l'appel API a échoué avant la création.

3. **Logs Vercel** filtre `service: refunds` ou `action: process-refund`.

## Actions correctives

### Cas 1 — Webhook reçu mais pas appliqué

1. Stripe Dashboard → événement → "Replay".
2. Vérifier en DB que `Refund.status` passe à `COMPLETED`.

### Cas 2 — Refund Stripe failed (insufficient funds, etc.)

1. Marquer le refund DB en `FAILED` avec `failureReason`.
2. Contacter le client : informer + proposer un autre moyen (virement manuel via support).
3. Action admin : `/admin/marketing/refunds` → ouvrir le drawer → "Réessayer" si la cause est transient.

### Cas 3 — Stripe API error pendant création

1. Sentry stack trace → identifier le type d'erreur Stripe.
2. Si `card_error` : permanent, marquer FAILED.
3. Si `rate_limit_error` ou `api_connection_error` : retry manuel (cron `sync-async-payments` ne couvre pas les refunds — action manuelle requise).

## Rollback

Le refund Stripe est **idempotent** via `idempotencyKey: refund_${id}` :
réessayer la même action ne crée jamais de double remboursement.

## Vérification post-fix

1. `Refund.status === COMPLETED` en DB.
2. Email de confirmation `refund-confirmed-email.tsx` envoyé (vérif Resend dashboard).
3. Stripe Dashboard → Refund → `succeeded`.
