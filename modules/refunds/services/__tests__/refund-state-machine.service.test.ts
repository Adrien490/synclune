import { describe, it, expect } from "vitest";

import { RefundStatus } from "@/app/generated/prisma/enums";
import {
	REFUND_TRANSITIONS,
	canTransition,
	isTerminalStatus,
} from "../refund-state-machine.service";

describe("refund-state-machine", () => {
	describe("REFUND_TRANSITIONS map", () => {
		it("covers every RefundStatus enum value", () => {
			for (const status of Object.values(RefundStatus)) {
				expect(REFUND_TRANSITIONS[status]).toBeDefined();
			}
		});

		it("targets of every transition are valid RefundStatus values", () => {
			const valid = new Set<string>(Object.values(RefundStatus));
			for (const [from, targets] of Object.entries(REFUND_TRANSITIONS)) {
				for (const target of targets) {
					expect(valid.has(target)).toBe(true);
					// guard against self-loops in case of accidental copy-paste
					expect(target).not.toBe(from);
				}
			}
		});
	});

	describe("canTransition — explicit allowed paths", () => {
		const allowed: Array<[RefundStatus, RefundStatus]> = [
			[RefundStatus.PENDING, RefundStatus.APPROVED],
			[RefundStatus.PENDING, RefundStatus.COMPLETED], // webhook shortcut (Stripe Dashboard)
			[RefundStatus.PENDING, RefundStatus.CANCELLED],
			[RefundStatus.PENDING, RefundStatus.FAILED],
			[RefundStatus.APPROVED, RefundStatus.COMPLETED],
			[RefundStatus.APPROVED, RefundStatus.FAILED],
			[RefundStatus.APPROVED, RefundStatus.CANCELLED],
			[RefundStatus.FAILED, RefundStatus.APPROVED],
			[RefundStatus.FAILED, RefundStatus.COMPLETED],
		];

		it.each(allowed)("allows %s → %s", (from, to) => {
			expect(canTransition(from, to)).toBe(true);
		});
	});

	describe("canTransition — forbidden paths (terminal & illegal regressions)", () => {
		const forbidden: Array<[RefundStatus, RefundStatus]> = [
			// COMPLETED is terminal
			[RefundStatus.COMPLETED, RefundStatus.PENDING],
			[RefundStatus.COMPLETED, RefundStatus.APPROVED],
			[RefundStatus.COMPLETED, RefundStatus.CANCELLED],
			[RefundStatus.COMPLETED, RefundStatus.FAILED],
			// CANCELLED is terminal
			[RefundStatus.CANCELLED, RefundStatus.PENDING],
			[RefundStatus.CANCELLED, RefundStatus.APPROVED],
			[RefundStatus.CANCELLED, RefundStatus.COMPLETED],
			[RefundStatus.CANCELLED, RefundStatus.FAILED],
			// APPROVED cannot regress to PENDING
			[RefundStatus.APPROVED, RefundStatus.PENDING],
			// FAILED cannot regress to PENDING/CANCELLED
			[RefundStatus.FAILED, RefundStatus.PENDING],
			[RefundStatus.FAILED, RefundStatus.CANCELLED],
		];

		it.each(forbidden)("forbids %s → %s", (from, to) => {
			expect(canTransition(from, to)).toBe(false);
		});
	});

	describe("isTerminalStatus", () => {
		it("returns true for COMPLETED / CANCELLED", () => {
			expect(isTerminalStatus(RefundStatus.COMPLETED)).toBe(true);
			expect(isTerminalStatus(RefundStatus.CANCELLED)).toBe(true);
		});

		it("returns false for PENDING / APPROVED / FAILED", () => {
			expect(isTerminalStatus(RefundStatus.PENDING)).toBe(false);
			expect(isTerminalStatus(RefundStatus.APPROVED)).toBe(false);
			expect(isTerminalStatus(RefundStatus.FAILED)).toBe(false);
		});
	});

	describe("matrice exhaustive 6×6 (36 cases)", () => {
		const statuses = Object.values(RefundStatus);

		it("every from×to pair returns a deterministic boolean", () => {
			for (const from of statuses) {
				for (const to of statuses) {
					expect(typeof canTransition(from, to)).toBe("boolean");
				}
			}
		});

		it("no status allows a transition to itself", () => {
			for (const status of statuses) {
				expect(canTransition(status, status)).toBe(false);
			}
		});
	});
});
