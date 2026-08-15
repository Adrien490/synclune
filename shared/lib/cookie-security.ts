/**
 * SSOT du flag `secure` des cookies applicatifs (cart, wishlist, guest-session,
 * admin_session, recherches récentes, FAB).
 *
 * En production le cookie est `Secure` (HTTPS). L'exception E2E existe parce
 * que la suite Playwright tourne contre un BUILD DE PROD servi en
 * `http://localhost:3000` : Chromium accepte un cookie `Secure` posé depuis
 * localhost (origine « trustworthy »), mais **WebKit le refuse en silence** —
 * le serveur répond Set-Cookie, Safari le jette, et chaque toggle favoris/
 * panier redevient un no-op. C'est ce qui a fait échouer ~30 specs webkit au
 * lot 7 (wishlist, toasts, product-to-cart) alors que Chromium était vert.
 *
 * Même précédent que `E2E_ALLOW_SEED_IMAGES` (next.config.ts) : un flag opt-in
 * explicite, jamais actif sans être posé dans l'environnement du serveur.
 * Runtime (pas inliné au build) : `E2E_INSECURE_COOKIES=1 pnpm start` suffit.
 */
export function shouldUseSecureCookies(): boolean {
	if (process.env.E2E_INSECURE_COOKIES === "1") return false;
	return process.env.NODE_ENV === "production";
}
