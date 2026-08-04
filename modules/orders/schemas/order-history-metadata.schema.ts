import { z } from "zod";

/**
 * Clés interdites dans OrderHistory.metadata.
 *
 * Cf. audit conformité 2026-05-27 — ORD-COMPLY-006.
 *
 * `metadata` est exposé côté client via GET_ORDER_SELECT_CUSTOMER (cf.
 * order.constants.ts) — toute clé contenant des PII fuite dans l'espace
 * client. Cette regex bloque préventivement les noms de champs sensibles
 * pour éviter une régression silencieuse à l'ajout d'une nouvelle action
 * admin (ex: future `merge-orders` qui pousserait `mergedFromUserEmail`).
 *
 * NB : seules les CLÉS sont vérifiées, pas les valeurs (pour éviter les
 * faux positifs sur des champs `note` libres). L'idée est de stopper les
 * structures connues du type `{ previousEmail: ... }` qui sont les vecteurs
 * de fuite réels (cf. update-order-customer-info.ts:88-107).
 */
const FORBIDDEN_KEY_PATTERN =
	/(email|phone|address1|address2|postalCode|address\b|street|firstName|lastName|fullName|customerName|customerEmail|shippingPhone|fiscalNumber|tva|vatNumber|iban|cardNumber|cvv|password|token|secret|apiKey|ssn|nir|niss)/i;

function findForbiddenKey(value: unknown, path: string[] = []): string | null {
	if (value === null || typeof value !== "object") return null;
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			const found = findForbiddenKey(value[i], [...path, String(i)]);
			if (found) return found;
		}
		return null;
	}
	for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
		if (FORBIDDEN_KEY_PATTERN.test(key)) {
			return [...path, key].join(".");
		}
		const found = findForbiddenKey(child, [...path, key]);
		if (found) return found;
	}
	return null;
}

/**
 * Valide qu'un payload `OrderHistory.metadata` ne contient aucune clé PII.
 * Retourne le résultat Zod (typer `unknown` pour rester compatible avec
 * `Prisma.InputJsonValue`).
 */
export const orderHistoryMetadataSchema = z.unknown().superRefine((value, ctx) => {
	if (value === undefined || value === null) return;
	const offending = findForbiddenKey(value);
	if (offending) {
		ctx.addIssue({
			code: "custom",
			message: `OrderHistory.metadata cannot contain PII-like key: "${offending}". This field is exposed to customers via GET_ORDER_SELECT_CUSTOMER.`,
			path: offending.split("."),
		});
	}
});
