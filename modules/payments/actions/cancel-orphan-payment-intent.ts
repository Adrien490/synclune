"use server";

import { getOrCreateGuestSessionId } from "@/modules/cart/lib/guest-session";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { buildPaymentRateLimitId } from "@/modules/payments/utils/payment-rate-limit-id";
import { parsePaymentIntentMetadata } from "@/modules/payments/schemas/stripe-metadata.schema";
import { paymentIntentIdSchema } from "@/modules/payments/schemas/checkout.schema";
import { stripe, withStripeCircuitBreaker } from "@/shared/lib/stripe";
import { headers } from "next/headers";
import { logger } from "@/shared/lib/logger";

/**
 * Best-effort cancellation of an orphaned Payment Intent.
 * Called when a tab re-init creates a new PI (cart hash changed).
 * Fire-and-forget — failure is non-critical since Stripe auto-cancels
 * uncaptured PIs after 7 days.
 *
 * Audit P2.3 — IDOR. Cette Server Action est appelable par n'importe quel client
 * avec n'importe quel `pi_…`. Sans contrôle, un attaquant connaissant le PI id
 * d'une victime (présent dans son `client_secret`) pourrait annuler son paiement
 * en cours. On vérifie donc l'OWNERSHIP via les metadata du PI (même session/user
 * que l'appelant) et on refuse un PI déjà lié à une commande (`metadata.orderId`).
 * Échecs silencieux (no-op) pour préserver la sémantique fire-and-forget — on ne
 * divulgue jamais l'existence/l'état d'un PI tiers.
 */
export async function cancelOrphanPaymentIntent(rawPaymentIntentId: unknown): Promise<void> {
	// `unknown` + parse Zod plutôt que `paymentIntentId: string` + `.startsWith()` :
	// le type était une promesse vide à une frontière RPC, et l'appel `.startsWith`
	// se faisait AVANT le `try` — un argument non-string produisait donc un
	// `TypeError` non rattrapé au lieu du no-op silencieux que documente ce fichier.
	const parsed = paymentIntentIdSchema.safeParse(rawPaymentIntentId);
	if (!parsed.success) return;
	const paymentIntentId = parsed.data;

	try {
		// 1. Resolve caller identity — session invité uniquement (migration lean, lot 1).
		const sessionId = await getOrCreateGuestSessionId();
		if (!sessionId) return;

		// 2. Rate limit (borne l'abus de l'API Stripe `cancel`).
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		// Comme `updatePaymentAmount` : la branche invité retombait sur un identifiant nu,
		// donc sur le compteur partagé avec le panier et les favoris (F3).
		const rateLimitId = buildPaymentRateLimitId("cancel-orphan", {
			userId: null,
			sessionId,
			ipAddress,
		});
		const rateLimit = await checkRateLimit(rateLimitId, PAYMENT_LIMITS.CANCEL_ORPHAN, ipAddress);
		if (!rateLimit.success) return;

		// 3. Ownership check via metadata (same logic as updatePaymentAmount).
		const pi = await withStripeCircuitBreaker(() =>
			stripe.paymentIntents.retrieve(paymentIntentId),
		);

		// Ne jamais annuler un PI déjà lié à une commande (un orphelin n'en a pas).
		// ⚠️ Garde de PRÉSENCE fail-closed : clé brute, PAS le parse Zod fail-open
		// (un orderId malformé serait droppé et la garde contournée).
		if (pi.metadata.orderId) return;

		// Zod boundary : champ malformé droppé → undefined → ownerMatch false (no-op)
		const piMetadata = parsePaymentIntentMetadata(pi.metadata, { paymentIntentId });
		const ownerMatch = piMetadata.guestSessionId === sessionId;
		if (!ownerMatch) return;

		// 4. Cancel (best-effort).
		await withStripeCircuitBreaker(() => stripe.paymentIntents.cancel(paymentIntentId));
	} catch {
		logger.info("Could not cancel orphan PI (may already be captured/canceled)", {
			service: "checkout",
			paymentIntentId,
		});
	}
}
