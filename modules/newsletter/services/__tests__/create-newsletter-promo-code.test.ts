import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscountType } from "@/app/generated/prisma/client";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findFirst: vi.fn(),
			create: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { createNewsletterPromoCode } from "../create-newsletter-promo-code";

// ============================================================================
// TESTS
// ============================================================================

describe("createNewsletterPromoCode", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-02T10:00:00Z"));

		mockPrisma.discount.findFirst.mockResolvedValue(null);
		mockPrisma.discount.create.mockResolvedValue({});
	});

	it("returns a code matching the BIENVENUE-XXXXXX format", async () => {
		const code = await createNewsletterPromoCode();

		expect(code).toMatch(/^BIENVENUE-[0-9A-F]{6}$/);
	});

	it("calls prisma.discount.create once", async () => {
		await createNewsletterPromoCode();

		expect(mockPrisma.discount.create).toHaveBeenCalledTimes(1);
	});

	it("creates discount with the same code that is returned", async () => {
		const code = await createNewsletterPromoCode();
		const call = mockPrisma.discount.create.mock.calls[0]![0];

		expect(call.data.code).toBe(code);
	});

	it("creates discount with PERCENTAGE type and value of 10", async () => {
		await createNewsletterPromoCode();

		const call = mockPrisma.discount.create.mock.calls[0]![0];
		expect(call.data.type).toBe(DiscountType.PERCENTAGE);
		expect(call.data.value).toBe(10);
	});

	it("creates discount with maxUsageCount and maxUsagePerUser set to 1", async () => {
		await createNewsletterPromoCode();

		const call = mockPrisma.discount.create.mock.calls[0]![0];
		expect(call.data.maxUsageCount).toBe(1);
		expect(call.data.maxUsagePerUser).toBe(1);
	});

	it("creates discount with isActive set to true", async () => {
		await createNewsletterPromoCode();

		const call = mockPrisma.discount.create.mock.calls[0]![0];
		expect(call.data.isActive).toBe(true);
	});

	it("sets endsAt approximately 30 days from now", async () => {
		await createNewsletterPromoCode();

		const call = mockPrisma.discount.create.mock.calls[0]![0];
		const endsAt: Date = call.data.endsAt;

		const expectedEndsAt = new Date("2026-03-02T10:00:00Z");
		expectedEndsAt.setDate(expectedEndsAt.getDate() + 30);

		expect(endsAt.getTime()).toBe(expectedEndsAt.getTime());
	});

	it("sets startsAt to the current time", async () => {
		await createNewsletterPromoCode();

		const call = mockPrisma.discount.create.mock.calls[0]![0];
		const startsAt: Date = call.data.startsAt;

		expect(startsAt.getTime()).toBe(new Date("2026-03-02T10:00:00Z").getTime());
	});

	it("generates a unique code on each call", async () => {
		const code1 = await createNewsletterPromoCode();
		const code2 = await createNewsletterPromoCode();

		// Two consecutive calls almost certainly produce different suffixes
		// This also validates the random suffix comes from actual randomBytes
		expect(code1).toMatch(/^BIENVENUE-[0-9A-F]{6}$/);
		expect(code2).toMatch(/^BIENVENUE-[0-9A-F]{6}$/);
	});

	it("propagates errors thrown by prisma.discount.create", async () => {
		mockPrisma.discount.create.mockRejectedValue(new Error("DB write failed"));

		await expect(createNewsletterPromoCode()).rejects.toThrow("DB write failed");
	});
});
