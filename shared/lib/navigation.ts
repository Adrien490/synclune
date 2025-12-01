/**
 * Utilitaires pour la navigation admin
 */

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
