/**
 * Helpers de cache partagés — SSOT du choix de directive et d'API d'invalidation.
 *
 * Pour les helpers spécifiques aux modules, voir :
 * - modules/products/utils/cache.utils.ts
 * - modules/collections/utils/cache.utils.ts
 * - modules/users/utils/cache.utils.ts
 *
 * ============================================================================
 * `"use cache"` vs `"use cache: private"` — ce qui décide vraiment
 * ============================================================================
 *
 * **La clé de cache, ce sont les ARGUMENTS.** Next la construit à partir de
 * « build ID + hash de la fonction + arguments sérialisés + variables de closure ».
 * Une fonction publique qui reçoit `userId` en argument ne peut donc PAS servir
 * l'entrée d'un client à un autre : deux `userId` = deux entrées.
 *
 * ⚠️ Un `cacheTag()` n'est PAS la clé. Confondre les deux avait fait basculer 25
 * fetchers en `private` au nom d'un risque IDOR qui n'existait pas (audit
 * 2026-07-31 — le motif d'origine vivait dans `modules/auth/data/get-session.ts`,
 * supprimé avec l'espace client le 2026-08-01 ; la résolution de session vit
 * désormais dans `modules/auth/lib/get-current-session.ts`, mémoïsée par `cache()`
 * de React et non par une directive Next).
 *
 * Le vrai critère est donc la CONFIDENTIALITÉ, et il se paie :
 *
 * | Directive             | Cache serveur | Shell statique | Portée              |
 * | --------------------- | ------------- | -------------- | ------------------- |
 * | `"use cache"`         | oui           | inclus         | partagée            |
 * | `"use cache: private"`| **aucun**     | **exclu**      | navigateur du client|
 *
 * `private` n'est jamais stocké côté serveur (mémoire du navigateur uniquement,
 * non persistée au rechargement) : la requête repart en base à CHAQUE rendu
 * serveur. À réserver aux données nominatives. Pour du catalogue ou un agrégat,
 * préférer `"use cache"` même quand l'identité sert de paramètre — cf. l'allowlist
 * `PUBLIC_IDENTITY_SCOPED_CACHES` de `cache-scoping.regression.test.ts`.
 *
 * ⚠️ Le dépôt ne compte AUCUN `"use cache: private"` en production (état vérifié
 * au 2026-08-07), et ce n'est pas un oubli. Ni le panier ni les favoris n'en
 * relèvent depuis leur passage en cookie (2026-08-04 / 2026-08-03) : le cookie
 * porte les ids, et seule leur matérialisation catalogue est cachée — en PUBLIC,
 * keyée sur ces ids. Il n'y a plus de compte client, donc plus de « commandes
 * client », et la session admin n'est pas cachée du tout (`cache()` de React,
 * portée requête). Corollaire : toute entrée du dépôt est joignable par un
 * `updateTag`/`revalidateTag`, y compris depuis un cron ou un webhook.
 *
 * Deux corollaires sur `private` :
 * - `cacheLife()` n'y gouverne que le cache client (le routeur impose 30 s de
 *   `stale` minimum) ;
 * - une invalidation émise depuis un cron ou un webhook ne peut PAS l'atteindre :
 *   le cache visé est dans le navigateur d'un autre utilisateur.
 */

import { cacheLife, cacheTag, revalidateTag, updateTag } from "next/cache";

/**
 * Configure le cache avec le profil `user` (2min stale, 1min revalidate, 10min expire)
 *
 * Utilisé par les fetchers du dashboard admin (données agrégées).
 *
 * @param tag - Tag de cache optionnel pour l'invalidation ciblée
 *
 * @example
 * ```ts
 * async function fetchData() {
 *   "use cache"
 *   cacheDashboard("my-dashboard-tag")
 *   return prisma.data.findMany()
 * }
 * ```
 */
export function cacheDashboard(tag?: string): void {
	cacheLife("user");
	if (tag) {
		cacheTag(tag);
	}
}

// ============================================
// INVALIDATION — le choix de l'API dépend du CONTEXTE D'EXÉCUTION
// ============================================

/**
 * Invalide des tags depuis une **Server Action** (`"use server"`).
 *
 * Sémantique `updateTag` : expiration immédiate + read-your-own-writes — la réponse
 * de l'action indique au routeur client de rafraîchir, donc l'utilisateur voit sa
 * propre mutation sans attendre.
 *
 * ⚠️ N'appeler QUE depuis une Server Action. Ailleurs, `updateTag` **throw**
 * (`E872`) : cf. `revalidateTagsInBackground` ci-dessous.
 *
 * @param tags - Tags à invalider (tableau, Set, ou tout itérable)
 */
export function updateTagsAfterMutation(tags: Iterable<string>): void {
	for (const tag of tags) {
		updateTag(tag);
	}
}

/**
 * Invalide des tags depuis un contexte **NON-Server-Action** : route handler,
 * cron (`app/api/cron/<job>/route.ts`), webhook Stripe, callback `after()`,
 * hook Better Auth.
 *
 * **Pourquoi cette fonction existe** (audit « usage cache Next.js » 2026-07-31) :
 * `updateTag()` lève une exception hors Server Action. Next teste la route en
 * cours d'exécution, pas le module où l'appel est écrit —
 * `node_modules/next/dist/server/web/spec-extension/revalidate.js:53` :
 *
 * ```js
 * if (!workStore || workStore.page.endsWith('/route')) { throw ... } // E872
 * ```
 *
 * Déléguer l'appel à un `services/` ne change donc rien : invoqué depuis
 * `app/api/cron/<job>/route.ts`, `page` finit par `/route` → throw. Les 14 fichiers
 * concernés avaient tous migré de `revalidateTag` vers `updateTag` (audit
 * 2026-07-06) ; conséquence : plus AUCUNE invalidation ne s'exécutait après un
 * paiement Stripe (tâche `INVALIDATE_CACHE` en `FAILED` silencieux) ni dans les
 * crons (500 + alerte admin les jours de travail réel).
 *
 * **Pourquoi `{ expire: 0 }` et pas `"max"`** : le profil built-in `max` vaut
 * `{ stale: 300, revalidate: 30j, expire: 365j }` — stale-while-revalidate, donc
 * l'entrée périmée continuerait d'être servie. Inacceptable pour du stock ou un
 * statut de commande. `expire: 0` produit l'expiration immédiate que `updateTag`
 * visait, et évite le warning de dépréciation de `revalidateTag(tag)` à un seul
 * argument.
 *
 * ⚠️ Sans effet sur les entrées `"use cache: private"` : elles ne sont jamais
 * stockées côté serveur (cache mémoire du navigateur uniquement), donc un cron ne
 * peut pas les atteindre. Ce n'est pas un défaut de cette fonction — c'est la
 * sémantique de la directive.
 *
 * @param tags - Tags à invalider (tableau, Set, ou tout itérable)
 */
export function revalidateTagsInBackground(tags: Iterable<string>): void {
	for (const tag of tags) {
		revalidateTag(tag, { expire: 0 });
	}
}
