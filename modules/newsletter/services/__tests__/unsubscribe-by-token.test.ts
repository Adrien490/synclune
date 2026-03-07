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

const VALID_TOKEN = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const VALID_TOKEN_2 = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";

function makeSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub-1",
		userId: "user-1",
		status: NewsletterStatus.CONFIRMED,
		unsubscribeToken: VALID_TOKEN,
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

	it("returns false for an invalid UUID token without querying the database", async () => {
		const result = await unsubscribeByToken("not-a-uuid");

		expect(result).toBe(false);
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
	});

	it("returns false when no subscriber is found for a valid token", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		const result = await unsubscribeByToken(VALID_TOKEN);

		expect(result).toBe(false);
	});

	it("queries by token with notDeleted filter", async () => {
		await unsubscribeByToken(VALID_TOKEN_2);

		expect(mockPrisma.newsletterSubscriber.findFirst).toHaveBeenCalledWith({
			where: {
				unsubscribeToken: VALID_TOKEN_2,
				deletedAt: null,
			},
		});
	});

	it("returns true when subscriber is found but already unsubscribed", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.UNSUBSCRIBED }),
		);

		const result = await unsubscribeByToken(VALID_TOKEN);

		expect(result).toBe(true);
	});

	it("does not call update when subscriber is already UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.UNSUBSCRIBED }),
		);

		await unsubscribeByToken(VALID_TOKEN);

		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("does not invalidate cache when subscriber is already UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.UNSUBSCRIBED }),
		);

		await unsubscribeByToken(VALID_TOKEN);

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns true when subscriber is found and status is CONFIRMED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			makeSubscriber({ status: NewsletterStatus.CONFIRMED }),
		);

		const result = await unsubscribeByToken(VALID_TOKEN);

		expect(result).toBe(true);
	});

	it("updates subscriber status to UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());

		await unsubscribeByToken(VALID_TOKEN);

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

		await unsubscribeByToken(VALID_TOKEN);

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

		await unsubscribeByToken(VALID_TOKEN);

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith("user-42");
	});

	it("calls getNewsletterInvalidationTags with undefined when userId is null", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber({ userId: null }));

		await unsubscribeByToken(VALID_TOKEN);

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith(undefined);
	});

	it("invalidates all returned cache tags", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());
		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
			"newsletter-user-user-1",
		]);

		await unsubscribeByToken(VALID_TOKEN);

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user-1");
	});

	it("propagates errors thrown by prisma.newsletterSubscriber.findFirst", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB read error"));

		await expect(unsubscribeByToken(VALID_TOKEN)).rejects.toThrow("DB read error");
	});

	it("propagates errors thrown by prisma.newsletterSubscriber.update", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());
		mockPrisma.newsletterSubscriber.update.mockRejectedValue(new Error("DB update error"));

		await expect(unsubscribeByToken(VALID_TOKEN)).rejects.toThrow("DB update error");
	});
});
