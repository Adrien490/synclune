import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetCurrentUser, mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockGetCurrentUser: vi.fn(),
	mockPrisma: {
		newsletterSubscriber: {
			findFirst: vi.fn(),
		},
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/modules/users/data/get-current-user", () => ({
	getCurrentUser: mockGetCurrentUser,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));
vi.mock("../constants/subscriber.constants", () => ({
	GET_NEWSLETTER_STATUS_DEFAULT_SELECT: { status: true },
}));
vi.mock("../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: {
		LIST: "newsletter-subscribers-list",
		USER_STATUS: (userId: string) => `newsletter-user-${userId}`,
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { getSubscriptionStatus, fetchSubscriptionStatus } from "../get-subscription-status";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_USER_ID = "user_cm1234567890abcde";
const VALID_EMAIL = "user@example.com";

function createUser(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_USER_ID,
		email: VALID_EMAIL,
		name: "Test User",
		...overrides,
	};
}

// ============================================================================
// TESTS: getSubscriptionStatus
// ============================================================================

describe("getSubscriptionStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	// -------------------------------------------------------------------------
	// No user
	// -------------------------------------------------------------------------

	it("should return not subscribed when there is no authenticated user", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: false,
			email: null,
			isConfirmed: false,
		});
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
	});

	it("should return not subscribed when user is undefined", async () => {
		mockGetCurrentUser.mockResolvedValue(undefined);

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: false,
			email: null,
			isConfirmed: false,
		});
	});

	// -------------------------------------------------------------------------
	// User with no email
	// -------------------------------------------------------------------------

	it("should return not subscribed when user has no email", async () => {
		mockGetCurrentUser.mockResolvedValue(createUser({ email: null }));

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: false,
			email: null,
			isConfirmed: false,
		});
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
	});

	it("should return not subscribed when user email is empty string", async () => {
		mockGetCurrentUser.mockResolvedValue(createUser({ email: "" }));

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: false,
			email: null,
			isConfirmed: false,
		});
	});

	// -------------------------------------------------------------------------
	// Subscribed: CONFIRMED status
	// -------------------------------------------------------------------------

	it("should return isSubscribed true when subscriber status is CONFIRMED", async () => {
		mockGetCurrentUser.mockResolvedValue(createUser());
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({ status: "CONFIRMED" });

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: true,
			email: VALID_EMAIL,
			isConfirmed: true,
		});
	});

	// -------------------------------------------------------------------------
	// Not subscribed: PENDING status
	// -------------------------------------------------------------------------

	it("should return isSubscribed false when subscriber status is PENDING", async () => {
		mockGetCurrentUser.mockResolvedValue(createUser());
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({ status: "PENDING" });

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: false,
			email: VALID_EMAIL,
			isConfirmed: false,
		});
	});

	it("should return isSubscribed false when subscriber status is UNSUBSCRIBED", async () => {
		mockGetCurrentUser.mockResolvedValue(createUser());
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({ status: "UNSUBSCRIBED" });

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: false,
			email: VALID_EMAIL,
			isConfirmed: false,
		});
	});

	// -------------------------------------------------------------------------
	// Subscriber not found
	// -------------------------------------------------------------------------

	it("should return isSubscribed false when no subscriber record exists for the user", async () => {
		mockGetCurrentUser.mockResolvedValue(createUser());
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		const result = await getSubscriptionStatus();

		expect(result).toEqual({
			isSubscribed: false,
			email: VALID_EMAIL,
			isConfirmed: false,
		});
	});

	// -------------------------------------------------------------------------
	// Returns email from user
	// -------------------------------------------------------------------------

	it("should include the user email in the response", async () => {
		mockGetCurrentUser.mockResolvedValue(createUser({ email: "custom@domain.fr" }));
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({ status: "CONFIRMED" });

		const result = await getSubscriptionStatus();

		expect(result.email).toBe("custom@domain.fr");
	});
});

// ============================================================================
// TESTS: fetchSubscriptionStatus
// ============================================================================

describe("fetchSubscriptionStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	// -------------------------------------------------------------------------
	// Returns subscriber
	// -------------------------------------------------------------------------

	it("should return subscriber when found by email", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({ status: "CONFIRMED" });

		const result = await fetchSubscriptionStatus(VALID_EMAIL, VALID_USER_ID);

		expect(result).toEqual({ status: "CONFIRMED" });
	});

	it("should return null when no subscriber found for the given email", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		const result = await fetchSubscriptionStatus("unknown@domain.fr", VALID_USER_ID);

		expect(result).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Query by email and notDeleted
	// -------------------------------------------------------------------------

	it("should query subscriber by email excluding soft-deleted records", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		await fetchSubscriptionStatus(VALID_EMAIL, VALID_USER_ID);

		expect(mockPrisma.newsletterSubscriber.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					email: VALID_EMAIL,
					deletedAt: null,
				}),
			}),
		);
	});

	it("should use GET_NEWSLETTER_STATUS_DEFAULT_SELECT to select only status", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		await fetchSubscriptionStatus(VALID_EMAIL, VALID_USER_ID);

		expect(mockPrisma.newsletterSubscriber.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { status: true },
			}),
		);
	});

	// -------------------------------------------------------------------------
	// Returns null on DB error
	// -------------------------------------------------------------------------

	it("should return null when DB throws an error", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB error"));

		const result = await fetchSubscriptionStatus(VALID_EMAIL, VALID_USER_ID);

		expect(result).toBeNull();
	});

	it("should not throw when DB throws; it returns null instead", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("Connection timeout"));

		await expect(fetchSubscriptionStatus(VALID_EMAIL, VALID_USER_ID)).resolves.toBeNull();
	});
});
