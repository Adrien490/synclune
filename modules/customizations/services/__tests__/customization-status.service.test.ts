import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	CustomizationRequestStatus: {
		PENDING: "PENDING",
		IN_PROGRESS: "IN_PROGRESS",
		COMPLETED: "COMPLETED",
		CANCELLED: "CANCELLED",
	},
}));

import {
	canTransitionTo,
	getAvailableTransitions,
	isFinalStatus,
} from "../customization-status.service";

describe("canTransitionTo", () => {
	describe("from PENDING", () => {
		it("should allow transition to IN_PROGRESS", () => {
			expect(canTransitionTo("PENDING", "IN_PROGRESS")).toBe(true);
		});

		it("should allow transition to COMPLETED", () => {
			expect(canTransitionTo("PENDING", "COMPLETED")).toBe(true);
		});

		it("should allow transition to CANCELLED", () => {
			expect(canTransitionTo("PENDING", "CANCELLED")).toBe(true);
		});

		it("should not allow transition to PENDING (same status)", () => {
			expect(canTransitionTo("PENDING", "PENDING")).toBe(false);
		});
	});

	describe("from IN_PROGRESS", () => {
		it("should allow transition to COMPLETED", () => {
			expect(canTransitionTo("IN_PROGRESS", "COMPLETED")).toBe(true);
		});

		it("should allow transition to CANCELLED", () => {
			expect(canTransitionTo("IN_PROGRESS", "CANCELLED")).toBe(true);
		});

		it("should not allow transition to PENDING", () => {
			expect(canTransitionTo("IN_PROGRESS", "PENDING")).toBe(false);
		});

		it("should not allow transition to IN_PROGRESS (same status)", () => {
			expect(canTransitionTo("IN_PROGRESS", "IN_PROGRESS")).toBe(false);
		});
	});

	describe("from COMPLETED (final state)", () => {
		it("should not allow transition to any status", () => {
			expect(canTransitionTo("COMPLETED", "PENDING")).toBe(false);
			expect(canTransitionTo("COMPLETED", "IN_PROGRESS")).toBe(false);
			expect(canTransitionTo("COMPLETED", "CANCELLED")).toBe(false);
			expect(canTransitionTo("COMPLETED", "COMPLETED")).toBe(false);
		});
	});

	describe("from CANCELLED (final state)", () => {
		it("should not allow transition to any status", () => {
			expect(canTransitionTo("CANCELLED", "PENDING")).toBe(false);
			expect(canTransitionTo("CANCELLED", "IN_PROGRESS")).toBe(false);
			expect(canTransitionTo("CANCELLED", "COMPLETED")).toBe(false);
			expect(canTransitionTo("CANCELLED", "CANCELLED")).toBe(false);
		});
	});
});

describe("getAvailableTransitions", () => {
	it("should return 3 transitions for PENDING", () => {
		const transitions = getAvailableTransitions("PENDING");

		expect(transitions).toHaveLength(3);
		expect(transitions).toContain("IN_PROGRESS");
		expect(transitions).toContain("COMPLETED");
		expect(transitions).toContain("CANCELLED");
	});

	it("should return 2 transitions for IN_PROGRESS", () => {
		const transitions = getAvailableTransitions("IN_PROGRESS");

		expect(transitions).toHaveLength(2);
		expect(transitions).toContain("COMPLETED");
		expect(transitions).toContain("CANCELLED");
	});

	it("should return empty array for COMPLETED", () => {
		expect(getAvailableTransitions("COMPLETED")).toHaveLength(0);
	});

	it("should return empty array for CANCELLED", () => {
		expect(getAvailableTransitions("CANCELLED")).toHaveLength(0);
	});
});

describe("isFinalStatus", () => {
	it("should return true for COMPLETED", () => {
		expect(isFinalStatus("COMPLETED")).toBe(true);
	});

	it("should return true for CANCELLED", () => {
		expect(isFinalStatus("CANCELLED")).toBe(true);
	});

	it("should return false for PENDING", () => {
		expect(isFinalStatus("PENDING")).toBe(false);
	});

	it("should return false for IN_PROGRESS", () => {
		expect(isFinalStatus("IN_PROGRESS")).toBe(false);
	});
});
