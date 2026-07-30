import { describe, it, expect } from "vitest";

/**
 * @regression STOCK-RESTOCK-REACTIVATE-001
 *
 * Audit « SKUs et variantes » (2026-07-30), P1-1.
 *
 * Le webhook d'encaissement désactive un SKU tombé à `inventory: 0`. Trois chemins
 * recréditaient du stock **sans jamais défaire cette désactivation** —
 * `cancel-order`, `process-refund`, `reconcile-refunds` — alors que les chemins
 * webhook (`restoreStockForOrder`, `markOrderAsCancelled`) le faisaient
 * correctement. Conséquence : rembourser ou annuler la dernière unité recréditait le
 * stock en laissant l'article invisible en vitrine (`GET_PRODUCT_SELECT` filtre
 * `isActive: true`), et sur un produit mono-SKU la PDP partait en `notFound()`.
 * L'e-mail « revenu en stock » émis juste après pointait donc sur un 404.
 *
 * La règle est ici pour être partagée par les 4 chemins. Son point délicat, et la
 * raison pour laquelle elle mérite un fichier : le discriminant est l'état d'AVANT le
 * crédit. Un SKU à `inventory > 0` et `isActive: false` a été retiré **à la main**
 * par l'admin — le ressusciter à l'occasion d'un remboursement remettrait en vente un
 * bijou volontairement dépublié.
 */

import { shouldReactivateAfterRestock } from "../restock-reactivation.service";

describe("STOCK-RESTOCK-REACTIVATE-001 — shouldReactivateAfterRestock", () => {
	it("réactive un SKU auto-désactivé par la vente (inactif + stock 0)", () => {
		expect(shouldReactivateAfterRestock({ isActive: false, inventory: 0 })).toBe(true);
	});

	it("NE réactive PAS un SKU dépublié à la main par l'admin (inactif + stock > 0)", () => {
		// Le cas qui interdit un simple `isActive: true` inconditionnel : ce bijou a
		// été retiré volontairement, un remboursement ne doit pas le remettre en vente.
		expect(shouldReactivateAfterRestock({ isActive: false, inventory: 5 })).toBe(false);
	});

	it("ne touche pas à un SKU déjà actif", () => {
		expect(shouldReactivateAfterRestock({ isActive: true, inventory: 0 })).toBe(false);
		expect(shouldReactivateAfterRestock({ isActive: true, inventory: 3 })).toBe(false);
	});

	it("est sûr sur un SKU absent (supprimé entre-temps)", () => {
		expect(shouldReactivateAfterRestock(undefined)).toBe(false);
		expect(shouldReactivateAfterRestock(null)).toBe(false);
	});
});
