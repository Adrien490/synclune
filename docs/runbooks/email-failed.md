# Runbook — Emails non envoyés

## Symptômes

- Sentry : pic d'issues `service: send-email`.
- Logs `Circuit breaker OPEN, skipping email` → Resend a échoué 5× consécutives.
- Clients signalent ne pas recevoir confirmation commande / reset password.
- Resend Dashboard → 4xx/5xx en hausse.

## Diagnostic rapide

1. **Health check** :

   ```bash
   curl https://synclune.fr/api/health
   ```

   Body inclut l'état du circuit breaker Resend.

2. **Resend Dashboard** :
   - Status : https://status.resend.com
   - Logs → filtrer "failed" ou "bounced".
   - Domains → vérifier que le domaine est `verified`.

3. **Logs Vercel** filtre `service: send-email` :
   - `Circuit breaker OPEN` → cf. ci-dessous.
   - `RESEND_API_KEY not configured` → variable d'env manquante.
   - `bounced` / `complained` → adresse destinataire problématique (pas un bug serveur).

## Actions correctives

### Cas 1 — Resend down (CB ouvert)

- Le circuit breaker recovery est de 60 s. Attendre.
- Une fois Resend revenu : le CB passe `HALF_OPEN` → 1 succès → `CLOSED`.
- Les emails envoyés pendant l'ouverture du CB **sont perdus** (pas de DLQ DB à cette échelle).
- Action : prévenir l'admin via canal Slack/SMS si emails critiques (commande, refund) ont été perdus.

### Cas 2 — Bounce / complaint d'un destinataire

- Pas un incident système, action client unique.
- Marquer l'email comme invalide en DB si possible, contacter par autre canal.

### Cas 3 — `RESEND_API_KEY` manquante

1. Vercel → Settings → Environment Variables.
2. Ajouter `RESEND_API_KEY` (Production + Preview).
3. Redeploy.

### Cas 4 — Domaine non vérifié

- Resend Dashboard → Domains → ajouter les enregistrements DNS DKIM/SPF.
- Vérifier propagation : `dig TXT _dmarc.synclune.fr`.

## Rollback

Si déploiement récent a cassé l'envoi :

```bash
vercel rollback <deployment-url>
```

## Vérification post-fix

1. `/api/health` retourne `resend.circuitBreaker: "CLOSED"`.
2. Test : `curl -X POST https://synclune.fr/api/cron/test-email -H "Authorization: Bearer $CRON_SECRET"` (si endpoint test).
3. Sentry : plus d'issue `service: send-email` depuis 15 min.

## Note de scale

À 20–30 commandes/mois, **pas de DLQ DB** pour les emails échoués — les `CRITICAL_EMAIL_TASKS` (confirmation commande, refund) déclenchent une alerte admin via `sendAdminCronFailedAlert`. À partir de ~500 commandes/mois, restaurer un modèle Prisma `FailedEmailJob` + cron de retry deviendra rentable.
