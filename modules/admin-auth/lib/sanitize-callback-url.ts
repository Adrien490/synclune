/**
 * Seules les destinations admin sont des cibles de redirection valides après
 * connexion.
 *
 * Deux gardes :
 * - préfixe `/admin` strict — `/admin-x` ne matche pas, `//evil.com` et les URL
 *   absolues non plus (anti open-redirect) ;
 * - aucun segment `..` ni antislash — `/admin/../confidentialite` passe le test
 *   de préfixe mais le navigateur le normalise HORS de l'admin. Même origine,
 *   donc bénin, mais une URL de redirection ne se négocie pas.
 */
export function sanitizeCallbackURL(callbackURL: string | undefined): string {
	if (!callbackURL) return "/admin";
	if (!/^\/admin(\/|$)/.test(callbackURL)) return "/admin";
	if (callbackURL.includes("\\") || callbackURL.split("/").includes("..")) return "/admin";
	return callbackURL;
}
