/**
 * @regression DISC-USAGE-001
 *
 * `maxUsagePerUser` doit être évalué sur les DEUX compteurs d'identité
 * (`userCount` ET `emailCount`), jamais l'un OU l'autre selon la présence de
 * `userId`.
 *
 * Bug d'origine : `checkDiscountEligibility` testait `userCount` quand `userId`
 * était présent et ne consultait `emailCount` que dans la branche invité. Un
 * usage invité étant enregistré avec `DiscountUsage.userId = NULL`, il devenait
 * invisible dès que le client créait un compte avec le même email — offrant une
 * redemption supplémentaire par code et par personne (fuite financière).
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

describe("@regression DISC-USAGE-001 — maxUsagePerUser cross-identity", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-17T12:00:00Z"));
	});

	it("rejette un utilisateur connecté dont l'usage passé était en invité (même email)", () => {
		// Scénario de la fuite : commande invité avec alice@example.com
		// (DiscountUsage.userId = NULL) puis création de compte et 2ᵉ commande.
		// userCount = 0 (l'usage invité n'a pas de userId), emailCount = 1.
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({ userId: "user-1", customerEmail: "alice@example.com" });
		const usageCounts = { userCount: 0, emailCount: 1 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(false);
		expect(result.error).toBe("Vous avez déjà utilisé ce code promo");
	});

	it("rejette dès que l'un des deux compteurs atteint la limite (userId seul saturé)", () => {
		const discount = makeDiscount({ maxUsagePerUser: 2 });
		const context = makeContext({ userId: "user-1", customerEmail: "alice@example.com" });
		const usageCounts = { userCount: 2, emailCount: 0 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(false);
	});

	it("ne double-compte pas : deux compteurs à 1 avec une limite de 2 restent éligibles", () => {
		// Une même commande est comptée par les deux compteurs (userId + email).
		// Le max, pas la somme — sinon un usage unique consommerait 2 slots.
		const discount = makeDiscount({ maxUsagePerUser: 2 });
		const context = makeContext({ userId: "user-1", customerEmail: "alice@example.com" });
		const usageCounts = { userCount: 1, emailCount: 1 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(true);
	});

	it("laisse passer sans aucune identité (vérification différée à la création de commande)", () => {
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({ userId: undefined, customerEmail: undefined });
		const usageCounts = { userCount: 0, emailCount: 0 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(true);
	});

	it("reste inactif quand maxUsagePerUser est null, quels que soient les compteurs", () => {
		const discount = makeDiscount({ maxUsagePerUser: null });
		const context = makeContext({ userId: "user-1", customerEmail: "alice@example.com" });
		const usageCounts = { userCount: 99, emailCount: 99 };

		const result = checkDiscountEligibility(discount, context, usageCounts);

		expect(result.eligible).toBe(true);
	});
});
