# Stripe webhook event fixtures

Fixtures JSON minimales pour chaque type d'event Stripe traité par `event-registry.ts`.

## Mise à jour

Pour resynchroniser une fixture avec la version actuelle de l'API Stripe :

```bash
# Capturer un event live depuis ton compte test
stripe events resend evt_xxx --print-json > test/fixtures/stripe/<event>.json

# Ou déclencher un event de référence
stripe trigger checkout.session.completed --print-json > test/fixtures/stripe/checkout.session.completed.json
```

⚠️ Les fixtures actuelles sont **minimales et synthétiques** (suffisantes pour vérifier
le routing du registry). Pour des tests métier profonds (line_items, shipping, etc.),
préférer les payloads capturés via Stripe CLI.

## Contract test

`test/contract/stripe-events.test.ts` charge chaque fixture, vérifie qu'elle a la
structure minimale d'un `Stripe.Event` (type, id, data.object) et que le dispatcher
du registry route bien vers le handler attendu sans throw.

Si Stripe modifie un payload (champ requis ajouté/retiré), le test cassera : il faut
alors regénérer la fixture concernée.
