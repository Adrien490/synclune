import type Stripe from "stripe";

/**
 * SSOT de la version d'API Stripe.
 *
 * Épingler la version est le **premier** point de la checklist de mise en
 * production de Stripe : sans elle, toutes les requêtes suivent le réglage du
 * compte, qui peut bouger depuis le Dashboard sans qu'aucun déploiement n'ait
 * lieu. Le SDK typé (`stripe@22.x`) porte déjà cette version par défaut ; la
 * déclarer explicitement rend le couplage visible et versionné.
 *
 * ⚠️ Cette constante existe parce que le littéral vivait en **quatre exemplaires**
 * — deux dans `shared/lib/stripe.ts`, un dans son commentaire, un dans
 * `app/api/health/route.ts`, qui se reconstruit un client à part (avec ses
 * propres `maxNetworkRetries: 0` / `timeout: 5000`, d'où la duplication). Un seul
 * test en couvrait un seul : la copie du health check pouvait dériver
 * indéfiniment, et un healthcheck vert sur une version différente de celle du
 * tunnel de paiement est un signal qui ment.
 *
 * ⚠️ Ce module ne doit avoir AUCUN effet de bord : `shared/lib/stripe.ts`
 * instancie un client au niveau module (`new Stripe(process.env…!)`), ce que le
 * healthcheck évite délibérément. C'est pourquoi la constante vit ici et non
 * là-bas.
 *
 * Monter de version : lire `docs/stripe/06-api-versioning.md` (changelog), bumper
 * ici, et vérifier que le SDK installé la connaît — le type `Stripe.LatestApiVersion`
 * ci-dessous fait échouer `tsc` sur une valeur que le SDK n'expose pas.
 */
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-06-24.dahlia";
