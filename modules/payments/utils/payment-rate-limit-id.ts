import { getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { normalizeEmail } from "@/shared/utils/normalize-email";

/**
 * Actions de paiement disposant de leur propre budget de rate limit.
 *
 * ⚠️ Ce préfixe reste PORTEUR après la correction de KI-004 (2026-07-31), et ne doit
 * pas être retiré comme une redondance apparente.
 *
 * Depuis KI-004, `checkRateLimit` mêle le `name` du preset à la clé
 * (`ratelimit:<name>:<identifier>`), ce qui isole les compteurs de deux presets
 * DIFFÉRENTS. Mais `initializePayment` et `confirmCheckout` partagent le MÊME preset
 * (`PAYMENT_LIMITS.CREATE_SESSION`) : le nom de config seul les remettrait sur une
 * clé commune, ré-introduisant exactement le bug décrit ci-dessous. Seul ce préfixe
 * par action les sépare.
 *
 * Conséquence assumée : la clé porte deux segments d'action
 * (`ratelimit:checkout-create-session:checkout-init:user:x`). Redondant à la lecture,
 * mais strictement plus sûr que les deux alternatives.
 *
 * Contexte d'origine (avant KI-004) : la clé ne portait QUE l'identifiant, si bien que
 * deux actions passant le même identifiant nu partageaient littéralement un compteur —
 * et la FENÊTRE appartenait à la première entrée créée, pas à l'appelant.
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
