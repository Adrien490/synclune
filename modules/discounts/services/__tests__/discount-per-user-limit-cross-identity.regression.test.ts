/**
 * @regression DISC-USAGE-001
 *
 * `maxUsagePerUser` doit être évalué sur l'EMAIL DE COMMANDE dès qu'il est
 * présent — jamais court-circuité par un autre signal d'identité.
 *
 * Bug d'origine (2026) : `checkDiscountEligibility` testait `userCount` quand
 * `userId` était présent et ne consultait `emailCount` que dans la branche
 * invité. Un usage invité étant enregistré sans compte, il devenait invisible
 * dès que le client se connectait avec le même email — offrant une redemption
 * supplémentaire par code et par personne (fuite financière).
 *
 * Depuis le Lot 0 (SIMPLIFICATION.md S1.5, 2026-08-03), `DiscountUsage.userId`
 * n'existe plus : l'email de commande est la SEULE identité de la limite, pour
 * une session admin comme pour une invitée. La fuite d'origine ne peut se
 * reproduire que si une future évolution réintroduit un compteur par identité
 * secondaire consulté À LA PLACE de l'email — ce fichier verrouille donc que
 * l'email présent est toujours consulté, et que son compteur saturé rejette.
 *
 * Toute modification de ce fichier requiert une review explicite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { checkDiscountEligibility } from "../discount-eligibility.service";
import type { DiscountValidation, DiscountApplicationContext } from "../../types/discount.types";

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		NOT_ACTIVE: "Ce code promo n'est plus actif",
		NOT_YET_ACTIVE: "Ce code promo n'est pas encore actif",
		EXPIRED: "Ce code promo a expiré",
		MAX_USAGE_REACHED: "Ce code promo a atteint sa limite d'utilisation",
		USER_MAX_USAGE_REACHED: "Vous avez déjà utilisé ce code promo",
		MIN_ORDER_NOT_MET: "Commande minimum de {amount}€ requise",
	},
}));

function makeDiscount(overrides: Record<string, unknown> = {}): DiscountValidation {
	return {
		id: "discount-1",
		code: "PROMO10",
		type: "PERCENTAGE" as DiscountValidation["type"],
		value: 10,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		isActive: true,
		startsAt: new Date("2026-01-01T00:00:00Z"),
		endsAt: null,
		...overrides,
	} as DiscountValidation;
}

function makeContext(
	overrides: Partial<DiscountApplicationContext> = {},
): DiscountApplicationContext {
	return { subtotal: 5000, ...overrides };
}

describe("@regression DISC-USAGE-001 — maxUsagePerUser par email de commande", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-17T12:00:00Z"));
	});

	it("rejette quand l'email de commande a déjà consommé la limite (usage invité passé)", () => {
		// Scénario de la fuite d'origine : commande invitée avec alice@example.com,
		// puis 2ᵉ tentative — quel que soit le canal — avec le même email.
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({ customerEmail: "alice@example.com" });
		const usageCounts = { emailCount: 1 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(false);
		expect(result.error).toBe("Vous avez déjà utilisé ce code promo");
	});

	it("reste éligible sous la limite", () => {
		const discount = makeDiscount({ maxUsagePerUser: 2 });
		const context = makeContext({ customerEmail: "alice@example.com" });
		const usageCounts = { emailCount: 1 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(true);
	});

	it("laisse passer sans email (vérification différée à la création de commande)", () => {
		// Le filet final est le re-check transactionnel d'order-creation.service.ts,
		// qui compte par Order.customerEmail sous lock.
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({ customerEmail: undefined });
		const usageCounts = { emailCount: 0 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(true);
	});

	it("laisse passer quand usageCounts n'a pas été résolu par l'appelant", () => {
		// Même différé : un appelant qui ne peut pas compter (pas d'I/O) ne doit
		// pas bloquer — la création de commande re-vérifie sous lock.
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({ customerEmail: "alice@example.com" });

		const result = checkDiscountEligibility(discount, context, undefined);

		expect(result.eligible).toBe(true);
	});

	it("reste inactif quand maxUsagePerUser est null, quel que soit le compteur", () => {
		const discount = makeDiscount({ maxUsagePerUser: null });
		const context = makeContext({ customerEmail: "alice@example.com" });
		const usageCounts = { emailCount: 99 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(true);
	});
});
