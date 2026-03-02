import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewsletterStatus } from "@/app/generated/prisma/client";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockUpdateTag, mockGetNewsletterInvalidationTags } = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
	mockGetNewsletterInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/newsletter/constants/cache", () => ({
	getNewsletterInvalidationTags: mockGetNewsletterInvalidationTags,
}));

import { unsubscribeByToken } from "../unsubscribe-by-token";

// ============================================================================
// HELPERS
// ============================================================================

function makeSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub-1",
		userId: "user-1",
		status: NewsletterStatus.CONFIRMED,
		unsubscribeToken: "valid-token",
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("unsubscribeByToken", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
		]);
	});

	it("returns false when no subscriber is found for the token", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		const result = await unsubscribeByToken("unknown-token");

		expect(result).toBe(false);
	});

	it("queries by token with notDeleted filter", async () => {
		await unsubscribeByToken("some-token");

		expect(mockPrisma.newsletterSubscriber.findFirst).toHaveBeenCalledWith({
			where: {
				unsubscribeToken: "some-token",
				deletedAt: null,
			},
		});
	});

	it("returns true when subscriber is found but already unsubscribed", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.UNSUBSCRIBED }),
		);

		const result = await unsubscribeByToken("valid-token");

		expect(result).toBe(true);
	});

	it("does not call update when subscriber is already UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.UNSUBSCRIBED }),
		);

		await unsubscribeByToken("valid-token");

		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("does not invalidate cache when subscriber is already UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.UNSUBSCRIBED }),
		);

		await unsubscribeByToken("valid-token");

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns true when subscriber is found and status is CONFIRMED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.CONFIRMED }),
		);

		const result = await unsubscribeByToken("valid-token");

		expect(result).toBe(true);
	});

	it("updates subscriber status to UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());

		await unsubscribeByToken("valid-token");

		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sub-1" },
				data: expect.objectContaining({
					status: NewsletterStatus.UNSUBSCRIBED,
				}),
			}),
		);
	});

	it("sets unsubscribedAt to current date when updating", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-02T10:00:00Z"));

		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());

		await unsubscribeByToken("valid-token");

		const call = mockPrisma.newsletterSubscriber.update.mock.calls[0]![0];
		expect(call.data.unsubscribedAt).toBeInstanceOf(Date);
		expect((call.data.unsubscribedAt as Date).getTime()).toBe(
			new Date("2026-03-02T10:00:00Z").getTime(),
		);

		vi.useRealTimers();
	});

	it("calls getNewsletterInvalidationTags with the subscriber userId", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ userId: "user-42" }),
		);

		await unsubscribeByToken("valid-token");

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith("user-42");
	});

	it("calls getNewsletterInvalidationTags with undefined when userId is null", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber({ userId: null }));

		await unsubscribeByToken("valid-token");

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith(undefined);
	});

	it("invalidates all returned cache tags", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());
		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
			"newsletter-user-user-1",
		]);

		await unsubscribeByToken("valid-token");

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user-1");
	});

	it("propagates errors thrown by prisma.newsletterSubscriber.findFirst", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB read error"));

		await expect(unsubscribeByToken("some-token")).rejects.toThrow("DB read error");
	});

	it("propagates errors thrown by prisma.newsletterSubscriber.update", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());
		mockPrisma.newsletterSubscriber.update.mockRejectedValue(new Error("DB update error"));

		await expect(unsubscribeByToken("valid-token")).rejects.toThrow("DB update error");
	});
});
