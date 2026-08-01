import { forbidden, unauthorized } from "next/navigation";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { ActionStatus } from "@/shared/types/server-action";

/**
 * Garde d'autorisation d'une page `app/admin/**`. Une ligne par page :
 *
 * ```tsx
 * export default async function MaPageAdmin() {
 *   await assertAdminPage();
 *   // …
 * }
 * ```
 *
 * ## Pourquoi chaque page et pas seulement le layout
 *
 * `app/admin/layout.tsx` appelle déjà `requireAdminWithUser()`. Ça ne suffit pas,
 * pour deux raisons qui se cumulent :
 *
 * 1. **Un layout partagé n'est pas ré-exécuté** lors d'une navigation client entre
 *    deux routes qui le partagent (rendu partiel de l'App Router). Sa garde ne
 *    protège donc de façon certaine que le chargement dur.
 * 2. **`proxy.ts` est fail-open** : dès que le cookie-cache Better Auth a expiré,
 *    il ne connaît plus le rôle et laisse passer, en s'appuyant explicitement sur
 *    « les pages/actions admin DOIVENT toujours utiliser `requireAdmin()` »
 *    (`proxy.ts`, étape 4). Au 2026-07-31, **aucune** des 50 pages admin ne le
 *    faisait : la prémisse du fail-open était fausse. Ce helper la rend vraie.
 *
 * ## Coût
 *
 * Nul en pratique : `getSession()` et `fetchUserForAuth()` sont tous deux enveloppés
 * dans `cache()` (React, portée = la requête). Layout + page + fetchers partagent
 * la même résolution de session et la même lecture utilisateur.
 *
 * Verrouillé par `app/admin/__tests__/admin-page-auth-guard.regression.test.ts`,
 * volontairement SANS allowlist : classer fetcher par fetcher ce qui est « donnée
 * publique » (les matériaux alimentent aussi les filtres de `/produits`) ou
 * « donnée admin » est exactement le genre d'arbitrage qui se re-perd.
 */
export async function assertAdminPage(): Promise<void> {
	// `requireAdminWithUser()` et pas `requireAdmin()` : seul le premier distingue
	// « pas de session » (401) de « session non-admin » (403). `requireAdmin()`
	// répond FORBIDDEN dans les deux cas, ce qui afficherait la page « accès
	// refusé » à une visiteuse simplement déconnectée, au lieu de l'envoyer se
	// connecter. Même coût : les deux passent par le `fetchUserForAuth` mémoïsé.
	const admin = await requireAdminWithUser();
	if (!("error" in admin)) return;

	// Parité stricte avec `app/admin/layout.tsx`.
	if (admin.error.status === ActionStatus.UNAUTHORIZED) unauthorized();
	forbidden();
}
