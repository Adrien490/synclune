import { unauthorized } from "next/navigation";
import { hasValidAdminSession } from "@/modules/admin-auth/lib/admin-session";

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
 * 1. **Un layout partagé n'est pas ré-exécuté** lors d'une navigation client
 *    entre deux routes qui le partagent (rendu partiel de l'App Router). Sa
 *    garde ne protège de façon certaine que le chargement dur.
 * 2. **`proxy.ts` ne vérifie que la PRÉSENCE du cookie**, pas sa signature
 *    (pré-filtrage UX sans crypto). La validation HMAC réelle vit ici.
 *
 * ## Coût
 *
 * Nul en pratique : `hasValidAdminSession()` est enveloppé dans `cache()`
 * (React, portée = la requête). Layout + page + fetchers partagent la même
 * validation de cookie.
 *
 * Depuis la migration lean (lot 1), il n'y a plus de distinction 401/403 : un
 * cookie absent, falsifié ou expiré produit le même état « non connectée » —
 * `unauthorized()` envoie vers `app/unauthorized.tsx`, qui propose la connexion.
 *
 * Verrouillé par `app/admin/__tests__/admin-page-auth-guard.regression.test.ts`.
 */
export async function assertAdminPage(): Promise<void> {
	if (await hasValidAdminSession()) return;
	unauthorized();
}
