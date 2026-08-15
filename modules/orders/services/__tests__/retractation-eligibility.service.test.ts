import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
	getRetractationIneligibilityReason,
	getRetractationDaysRemaining,
	WITHDRAWAL_PERIOD_DAYS,
} from "../retractation-eligibility.service";
import type { OrderStatus, RetractationStatus } from "@/app/generated/prisma/enums";

// ============================================================================
// Helpers — sauvetage de return-eligibility.service.test.ts (lot 2), adapté au
// schéma lean : la fenêtre court depuis shippedAt, la demande est 1-1.
// ============================================================================

interface OrderInput {
	status: OrderStatus;
	shippedAt: Date | null;
	retractation: { status: RetractationStatus } | null;
}

const NOW = new Date("2026-02-23T12:00:00Z");
const SHIPPED_WITHIN_PERIOD = new Date("2026-02-20T12:00:00Z"); // il y a 3 jours
const SHIPPED_JUST_BEFORE_EXPIRY = new Date("2026-02-09T12:00:00.001Z"); // ~14 j, encore dedans
const SHIPPED_EXACTLY_ON_BOUNDARY = new Date("2026-02-09T12:00:00Z"); // exactement 14 j, expiré
const SHIPPED_EXPIRED = new Date("2026-02-01T12:00:00Z"); // il y a 22 jours

function makeOrder(overrides: Partial<OrderInput> = {}): OrderInput {
	return {
		status: "SHIPPED",
		shippedAt: SHIPPED_WITHIN_PERIOD,
		retractation: null,
		...overrides,
	};
}

// ============================================================================
// getRetractationIneligibilityReason
// ============================================================================

describe("getRetractationIneligibilityReason", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("statut de commande", () => {
		it("éligible pour une commande SHIPPED dans la fenêtre", () => {
			expect(getRetractationIneligibilityReason(makeOrder())).toBeNull();
		});

		it("NOT_PAID pour une commande PENDING", () => {
			expect(getRetractationIneligibilityReason(makeOrder({ status: "PENDING" }))).toBe("NOT_PAID");
		});

		it("NOT_PAID pour une commande CANCELLED", () => {
			expect(getRetractationIneligibilityReason(makeOrder({ status: "CANCELLED" }))).toBe(
				"NOT_PAID",
			);
		});

		it("NOT_PAID pour une commande déjà REFUNDED (plus rien à rembourser)", () => {
			expect(getRetractationIneligibilityReason(makeOrder({ status: "REFUNDED" }))).toBe(
				"NOT_PAID",
			);
		});

		it("NOT_SHIPPED pour une commande PAID pas encore expédiée", () => {
			expect(
				getRetractationIneligibilityReason(makeOrder({ status: "PAID", shippedAt: null })),
			).toBe("NOT_SHIPPED");
		});

		it("NOT_SHIPPED quand SHIPPED sans shippedAt (incohérence de données)", () => {
			expect(getRetractationIneligibilityReason(makeOrder({ shippedAt: null }))).toBe(
				"NOT_SHIPPED",
			);
		});
	});

	describe("fenêtre de 14 jours", () => {
		it("éligible juste avant l'expiration", () => {
			expect(
				getRetractationIneligibilityReason(makeOrder({ shippedAt: SHIPPED_JUST_BEFORE_EXPIRY })),
			).toBeNull();
		});

		it("DEADLINE_EXCEEDED exactement à la frontière (>= deadline)", () => {
			expect(
				getRetractationIneligibilityReason(makeOrder({ shippedAt: SHIPPED_EXACTLY_ON_BOUNDARY })),
			).toBe("DEADLINE_EXCEEDED");
		});

		it("DEADLINE_EXCEEDED bien après la fenêtre", () => {
			expect(getRetractationIneligibilityReason(makeOrder({ shippedAt: SHIPPED_EXPIRED }))).toBe(
				"DEADLINE_EXCEEDED",
			);
		});
	});

	describe("demande existante", () => {
		it.each(["RECEIVED", "ACKNOWLEDGED", "AWAITING_RETURN", "REFUNDED"] as const)(
			"ALREADY_REQUESTED quand une demande %s existe",
			(status) => {
				expect(getRetractationIneligibilityReason(makeOrder({ retractation: { status } }))).toBe(
					"ALREADY_REQUESTED",
				);
			},
		);

		it("éligible malgré une demande REJECTED (nouvelle demande possible dans la fenêtre)", () => {
			expect(
				getRetractationIneligibilityReason(makeOrder({ retractation: { status: "REJECTED" } })),
			).toBeNull();
		});
	});
});

// ============================================================================
// getRetractationDaysRemaining
// ============================================================================

describe("getRetractationDaysRemaining", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("retourne 0 sans date d'expédition", () => {
		expect(getRetractationDaysRemaining(null)).toBe(0);
	});

	it("retourne les jours restants dans la fenêtre", () => {
		// Expédiée il y a 3 jours → 14 - 3 = 11 restants
		expect(getRetractationDaysRemaining(SHIPPED_WITHIN_PERIOD)).toBe(WITHDRAWAL_PERIOD_DAYS - 3);
	});

	it("retourne 0 après l'expiration (jamais négatif)", () => {
		expect(getRetractationDaysRemaining(SHIPPED_EXPIRED)).toBe(0);
	});
});
