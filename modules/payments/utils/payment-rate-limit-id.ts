import { getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { normalizeEmail } from "@/shared/utils/normalize-email";

/**
 * Actions de paiement disposant de leur propre budget de rate limit.
 *
 * Le préfixe fait partie de la CLÉ, pas de la décoration : `checkRateLimit` indexe son
 * compteur sur le seul identifiant (`ratelimit:${identifier}`), sans jamais y mêler le
 * nom de l'action ni sa config. Deux actions qui passent le même identifiant nu
 * partagent donc littéralement un compteur — et la FENÊTRE appartient à la première
 * entrée créée, pas à l'appelant.
 *
 * C'est ce qui rendait le couplage pénalisant : `initializePayment` et `confirmCheckout`
 * utilisaient `user:${userId}` nu, comme toutes les actions panier
 * (`modules/cart/lib/cart-rate-limit.ts`), toutes les actions favoris et
 * `validateDiscountCode`. Une visite sur `/paiement` plantait une fenêtre d'1 h
 * (CREATE_SESSION = 15/h), et 15 opérations quelconques sur cette clé — ajouts panier,
 * toggles favoris, validations de code — l'épuisaient : le bouton « Commander et payer »
 * répondait « Trop de tentatives » pour le reste de l'heure, sur une commande dont le
 * montant était déjà verrouillé. Le client ne pouvait plus payer du tout.
 *
 * `updatePaymentAmount` et `cancelOrphanPaymentIntent` préfixaient déjà leur branche
 * authentifiée — mais pas leur branche invité. Ce helper est désormais le seul chemin,
 * pour que les 4 actions ne puissent plus diverger.
 *
 * Audit checkout Stripe Elements 2026-07-30, F3.
 */
export type PaymentRateLimitAction =
	"checkout-init" | "checkout-confirm" | "update-amount" | "cancel-orphan";

interface PaymentRateLimitCaller {
	userId: string | null;
	sessionId?: string | null;
	/** Email invité, si déjà saisi — normalisé ici pour que la casse ne double pas le budget. */
	email?: string | null;
	ipAddress?: string | null;
}

/**
 * Construit un identifiant de rate limit **préfixé par l'action** pour le tunnel de
 * paiement.
 *
 * Ordre de résolution, du plus stable au plus grossier :
 *  1. `user:<id>` — compte authentifié ;
 *  2. `guest:<email>:<ip>` — invité ayant saisi son email (plus strict qu'une IP seule,
 *     qui plafonnerait ensemble tous les clients d'un même NAT) ;
 *  3. `getRateLimitIdentifier(...)` — session panier, puis IP, puis `anonymous`.
 *
 * ⚠️ L'appelant doit continuer de passer l'IP en 3ᵉ argument de `checkRateLimit` : le
 * préfixe empêche l'extraction automatique de l'IP depuis un identifiant `ip:…`
 * (`rate-limit.ts`), dont dépendent la whitelist/blacklist et le plafond global.
 */
export function buildPaymentRateLimitId(
	action: PaymentRateLimitAction,
	caller: PaymentRateLimitCaller,
): string {
	const { userId, sessionId = null, email = null, ipAddress = null } = caller;

	if (userId) return `${action}:user:${userId}`;
	if (email && ipAddress) return `${action}:guest:${normalizeEmail(email)}:${ipAddress}`;
	return `${action}:${getRateLimitIdentifier(null, sessionId, ipAddress)}`;
}
