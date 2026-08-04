/**
 * Utilitaires pour la navigation admin et vitrine
 */

import { ROUTES } from "@/shared/constants/urls";

/**
 * Une page de détail produit (`/creations/<slug>`) appartient au rayon `/produits`.
 *
 * SSOT de cette correspondance, partagée par `useActiveNavbarItem` (nav desktop
 * et menu sheet, qui ont un item « Créations » distinct d'un item « Collections »)
 * et par {@link isCatalogueRoute}. Elle vivait en littéral dans le hook ; l'écrire
 * deux fois est exactement ce qui a laissé la barre du bas diverger.
 */
export function isProductDetailRoute(pathname: string): boolean {
	return pathname.startsWith(ROUTES.SHOP.PRODUCT_DETAIL_PREFIX + "/");
}

/**
 * Le rayon catalogue ENTIER : `/produits`, ses sous-pages par type, les fiches
 * `/creations/*` et les collections.
 *
 * ⚠️ À n'employer que sur une surface qui ne possède **qu'un seul onglet** pour
 * tout le catalogue — c'est le cas de la barre du bas, et c'est pour ça qu'elle
 * ne peut pas réutiliser `useActiveNavbarItem` telle quelle : la nav desktop a
 * des entrées « Créations » et « Collections » séparées, où allumer les deux à la
 * fois serait faux.
 *
 * Pourquoi cette fonction existe (audit design 2026-08-04, P1) : la barre du bas
 * décidait son onglet Accueil par `pathname === "/"` en égalité stricte, et aucun
 * de ses onglets ne pouvait représenter le catalogue. Mesuré route par route :
 * `/` allumé, `/favoris` allumé, **`/produits` rien**, **`/cgv` rien**. Sur les
 * pages où la cliente passe le plus de temps, la navigation principale ne
 * répondait jamais à « où suis-je ».
 *
 * Volontairement basée sur le seul `pathname` : `useActiveNavbarItem` lit aussi
 * `useSearchParams()`, ce qui imposerait une frontière `Suspense` autour de la
 * barre — or aucun de ses onglets n'a de query param à discriminer.
 */
export function isCatalogueRoute(pathname: string): boolean {
	return (
		pathname === ROUTES.SHOP.PRODUCTS ||
		pathname.startsWith(ROUTES.SHOP.PRODUCTS + "/") ||
		isProductDetailRoute(pathname) ||
		pathname === ROUTES.SHOP.COLLECTIONS ||
		pathname.startsWith(ROUTES.SHOP.COLLECTIONS + "/")
	);
}

/**
 * Vérifie si une URL est active en comparant les segments de path
 *
 * - Pour /admin (dashboard), seule la route exacte est active
 * - Pour les autres routes, le préfixe est vérifié
 *
 * @param pathname - Pathname actuel (ex: "/admin/catalogue/produits")
 * @param url - URL à vérifier (ex: "/admin/catalogue")
 * @returns true si la route est active
 *
 * @example
 * ```ts
 * isRouteActive("/admin/catalogue/produits", "/admin/catalogue") // true
 * isRouteActive("/admin/catalogue/produits", "/admin") // false (dashboard = exact match)
 * isRouteActive("/admin/ventes", "/admin/ventes") // true (exact match)
 * ```
 */
export function isRouteActive(pathname: string, url: string): boolean {
	// Route exacte
	if (pathname === url) return true;

	// Le dashboard (/admin) ne doit être actif que sur la route exacte
	if (url === "/admin") return false;

	// Pour les autres routes, vérifier le préfixe
	return pathname.startsWith(url + "/");
}
