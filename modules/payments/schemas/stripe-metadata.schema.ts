import { z } from "zod";
import { logger } from "@/shared/lib/logger";

/**
 * Schéma de la metadata PaymentIntent écrite par Synclune (frontière de confiance).
 *
 * Writers :
 * - `initialize-payment.ts` (create) : `{ userId: cuid | "guest", guestSessionId?: uuid v4 }`
 * - `confirm-checkout.ts` (update)   : `+ { orderId: cuid, orderNumber }`
 * - Legacy flow Checkout Session     : `order_id` (snake_case)
 *
 * `looseObject` : les clés inconnues sont préservées (Stripe.Metadata est un
 * sac clé/valeur libre — d'autres clés peuvent coexister, ex. `reason` posé
 * par l'auto-refund orphelin).
 */
export const paymentIntentMetadataSchema = z.looseObject({
	// Champs de RÉSOLUTION (lookup Prisma paramétré, introuvable → skip/fallback) :
	// borne de longueur seulement. Un format strict (cuid) droppérait un id
	// légitime au moindre drift de format et ferait skipper le handler
	// (ex. refund manqué sur payment_intent.canceled) — fail-soft borné.
	orderId: z.string().min(1).max(64).optional(),
	// Legacy Checkout Session flow (snake_case)
	order_id: z.string().min(1).max(64).optional(),
	orderNumber: z.string().min(1).max(64).optional(),
	// Champs d'OWNERSHIP (comparés à l'identité du caller) : format strict —
	// un champ malformé est droppé → undefined → deny, comportement sûr.
	userId: z.union([z.literal("guest"), z.cuid2()]).optional(),
	guestSessionId: z.uuidv4().optional(),
});

export type PaymentIntentMetadata = z.infer<typeof paymentIntentMetadataSchema>;

/**
 * Parse fail-open PAR CHAMP de la metadata d'un PaymentIntent.
 *
 * Un webhook ne doit JAMAIS crasher sur une metadata malformée : un champ
 * invalide est droppé (`undefined`) et les champs valides sont conservés.
 * Pour les checks d'ownership (`userId`/`guestSessionId`), un champ droppé
 * donne `undefined` → `ownerMatch` false → deny, comportement sûr.
 *
 * ⚠️ Ne PAS utiliser ce parse pour une garde de PRÉSENCE fail-closed
 * (ex. « refuser si `metadata.orderId` existe ») : un orderId malformé serait
 * droppé et la garde contournée — tester la clé brute dans ce cas.
 */
export function parsePaymentIntentMetadata(
	metadata: Record<string, string> | null | undefined,
	context?: { paymentIntentId?: string },
): PaymentIntentMetadata {
	const input = metadata ?? {};
	const result = paymentIntentMetadataSchema.safeParse(input);
	if (result.success) return result.data;

	const invalidKeys = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
	const sanitized: Record<string, string> = { ...input };
	for (const key of invalidKeys) delete sanitized[key];

	logger.warn("[STRIPE] PaymentIntent metadata partiellement invalide — champs droppés", {
		service: "payments",
		invalidKeys,
		...context,
	});

	const reparsed = paymentIntentMetadataSchema.safeParse(sanitized);
	return reparsed.success ? reparsed.data : {};
}
