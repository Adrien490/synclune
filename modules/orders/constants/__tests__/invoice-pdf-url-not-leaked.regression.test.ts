/**
 * @regression einv-sec-011-invoice-pdf-url-not-leaked
 *
 * `Order.invoicePdfUrl` est une URL UploadThing publique-by-default (signée par
 * UploadThing mais accessible sans authentification si l'URL est connue). Elle
 * doit rester strictement côté serveur, jamais exposée dans une réponse
 * customer-facing.
 *
 * Garde-fou : si un refactor ajoute `invoicePdfUrl: true` à un select consommé
 * par un endpoint customer, ce test pète immédiatement. Pas un test de logique,
 * un test de surface d'attaque.
 *
 * Cf. audit sécurité 2026-05-28 — EINV-SEC-011.
 */

import { describe, expect, it } from "vitest";

import {
	GET_ORDERS_SELECT,
	GET_ORDER_SELECT_CUSTOMER,
} from "@/modules/orders/constants/order.constants";

/**
 * Récursivement vérifie qu'une clé n'apparaît pas dans un objet Prisma select.
 * Le format Prisma utilise des objets imbriqués via `select`/`include`, on doit
 * les traverser pour ne pas rater une fuite nested.
 */
function selectContainsKey(node: unknown, key: string): boolean {
	if (node === null || typeof node !== "object") return false;
	const obj = node as Record<string, unknown>;
	if (key in obj && obj[key] !== false && obj[key] !== undefined) return true;
	for (const value of Object.values(obj)) {
		if (selectContainsKey(value, key)) return true;
	}
	return false;
}

describe("EINV-SEC-011 — invoicePdfUrl / invoicePdfHash not exposed client-side", () => {
	const FORBIDDEN_KEYS = ["invoicePdfUrl", "invoicePdfHash", "invoiceDataSnapshot"] as const;

	const CUSTOMER_SELECTS: Array<{ name: string; select: unknown }> = [
		{ name: "GET_ORDER_SELECT_CUSTOMER", select: GET_ORDER_SELECT_CUSTOMER },
		{ name: "GET_ORDERS_SELECT (list)", select: GET_ORDERS_SELECT },
	];

	for (const { name, select } of CUSTOMER_SELECTS) {
		for (const key of FORBIDDEN_KEYS) {
			it(`${name} must NOT expose '${key}'`, () => {
				expect(selectContainsKey(select, key)).toBe(false);
			});
		}
	}
});
