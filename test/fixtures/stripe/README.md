# Stripe webhook event fixtures

Fixtures JSON minimales pour chaque type d'event Stripe traité par `event-registry.ts`.

## Mise à jour

Pour resynchroniser une fixture avec la version actuelle de l'API Stripe :

```bash
# Capturer un event live depuis ton compte test
stripe events resend evt_xxx --print-json > test/fixtures/stripe/<event>.json

# Ou déclencher un event de référence
stripe trigger payment_intent.succeeded --print-json > test/fixtures/stripe/payment_intent.succeeded.json
```

⚠️ **N'utilise que des types réellement routés** (`getRegisteredEventTypes()`). L'exemple
de cette section montrait `checkout.session.completed` jusqu'à l'audit Stripe du
2026-08-04 — un event délibérément RETIRÉ du registry (le tunnel est PaymentIntents +
Elements, aucune Checkout Session n'est jamais créée). Le copier-coller produisait une
fixture non routable, qui casse la garde de complétude du contract test.

⚠️ Les fixtures actuelles sont **minimales et synthétiques** (suffisantes pour vérifier
le routing du registry). Pour des tests métier profonds (line_items, shipping, etc.),
préférer les payloads capturés via Stripe CLI.

### Dette connue — les shapes n'ont pas été re-capturées

Les 12 fixtures ont porté `"api_version": "2025-09-30.clover"` pendant que le SDK était
épinglé sur `2026-06-24.dahlia` (deux versions majeures d'écart). L'audit du 2026-08-04 a
aligné le champ sur la SSOT `STRIPE_API_VERSION` et posé l'assertion qui empêche la
dérive de recommencer — mais **les payloads eux-mêmes n'ont pas été régénérés** (Stripe
CLI absent de la machine). Ils restent donc écrits à la main d'après ce que les handlers
consomment, pas capturés depuis un compte `dahlia`.

Conséquence à connaître : un champ que `dahlia` aurait renommé, retiré ou dont il aurait
changé la sémantique ne serait PAS attrapé ici. Une passe `stripe trigger` sur les
12 types reste à faire.

**La CLI s'installe sans Homebrew** (constaté 2026-08-05 dans la doc fraîchement mirrorée) :
`npm i -g @stripe/cli`, publiée et à jour. Le seul obstacle restant est donc le
`stripe login` interactif contre le compte test — plus l'installation elle-même, qui avait
été notée comme le blocage.

## Contract test

`test/contract/stripe-events.test.ts` charge chaque fixture, vérifie qu'elle a la
structure minimale d'un `Stripe.Event` (type, id, data.object) et que le dispatcher
du registry route bien vers le handler attendu sans throw.

Si Stripe modifie un payload (champ requis ajouté/retiré), le test cassera : il faut
alors regénérer la fixture concernée.
