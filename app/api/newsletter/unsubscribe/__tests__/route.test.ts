import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockAjNewsletterUnsubscribe,
	mockPrisma,
	mockUpdateTag,
	mockGetNewsletterInvalidationTags,
} = vi.hoisted(() => ({
	mockAjNewsletterUnsubscribe: {
		protect: vi.fn(),
	},
	mockPrisma: {
		newsletterSubscriber: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
	mockGetNewsletterInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/arcjet", () => ({
	ajNewsletterUnsubscribe: mockAjNewsletterUnsubscribe,
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

vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: {
		PENDING: "PENDING",
		CONFIRMED: "CONFIRMED",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}));

import { POST } from "../route";

// ============================================================================
// Helpers
// ============================================================================

const VALID_TOKEN = "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5";

function makeRequest(token?: string) {
	const url = new URL("http://localhost:3000/api/newsletter/unsubscribe");
	if (token) {
		url.searchParams.set("token", token);
	}
	return new Request(url.toString(), { method: "POST" });
}

function makeSubscriber(status = "CONFIRMED") {
	return {
		id: "sub-1",
		email: "user@example.com",
		status,
		unsubscribeToken: VALID_TOKEN,
	};
}

function allowRequest() {
	mockAjNewsletterUnsubscribe.protect.mockResolvedValue({
		isDenied: () => false,
	});
}

function denyRequest() {
	mockAjNewsletterUnsubscribe.protect.mockResolvedValue({
		isDenied: () => true,
	});
}

// ============================================================================
// Tests: POST /api/newsletter/unsubscribe
// ============================================================================

describe("POST /api/newsletter/unsubscribe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		allowRequest();
		mockGetNewsletterInvalidationTags.mockReturnValue(["newsletter-subscribers-list"]);
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber());
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
	});

	// ========================================================================
	// RFC 8058 compliance - always returns 200
	// ========================================================================

	describe("RFC 8058 compliance", () => {
		it("returns 200 for valid unsubscribe request", async () => {
			const response = await POST(makeRequest(VALID_TOKEN));

			expect(response.status).toBe(200);
		});

		it("returns 200 when rate limited (denied by Arcjet)", async () => {
			denyRequest();

			const response = await POST(makeRequest(VALID_TOKEN));

			expect(response.status).toBe(200);
		});

		it("returns 200 for missing token", async () => {
			const response = await POST(makeRequest());

			expect(response.status).toBe(200);
		});

		it("returns 200 for invalid token format", async () => {
			const response = await POST(makeRequest("not-a-uuid"));

			expect(response.status).toBe(200);
		});

		it("returns 200 when subscriber not found", async () => {
			mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

			const response = await POST(makeRequest(VALID_TOKEN));

			expect(response.status).toBe(200);
		});

		it("returns 200 when database throws", async () => {
			mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB error"));

			const response = await POST(makeRequest(VALID_TOKEN));

			expect(response.status).toBe(200);
		});
	});

	// ========================================================================
	// Rate limiting
	// ========================================================================

	describe("rate limiting", () => {
		it("does not query database when rate limited", async () => {
			denyRequest();

			await POST(makeRequest(VALID_TOKEN));

			expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// Token validation
	// ========================================================================

	describe("token validation", () => {
		it("does not query database for missing token", async () => {
			await POST(makeRequest());

			expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
		});

		it("does not query database for invalid token", async () => {
			await POST(makeRequest("invalid"));

			expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// Successful unsubscribe
	// ========================================================================

	describe("successful unsubscribe", () => {
		it("looks up subscriber by token", async () => {
			await POST(makeRequest(VALID_TOKEN));

			expect(mockPrisma.newsletterSubscriber.findFirst).toHaveBeenCalledWith({
				where: {
					unsubscribeToken: VALID_TOKEN,
					deletedAt: null,
				},
			});
		});

		it("updates subscriber status to UNSUBSCRIBED", async () => {
			await POST(makeRequest(VALID_TOKEN));

			expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith({
				where: { id: "sub-1" },
				data: {
					status: "UNSUBSCRIBED",
					unsubscribedAt: expect.any(Date),
				},
			});
		});

		it("invalidates newsletter cache tags", async () => {
			mockGetNewsletterInvalidationTags.mockReturnValue([
				"newsletter-subscribers-list",
				"newsletter-user-123",
			]);

			await POST(makeRequest(VALID_TOKEN));

			expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
			expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-123");
		});
	});

	// ========================================================================
	// Idempotency
	// ========================================================================

	describe("idempotency", () => {
		it("does not update already unsubscribed subscriber", async () => {
			mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber("UNSUBSCRIBED"));

			await POST(makeRequest(VALID_TOKEN));

			expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
		});

		it("does not invalidate cache when already unsubscribed", async () => {
			mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber("UNSUBSCRIBED"));

			await POST(makeRequest(VALID_TOKEN));

			expect(mockUpdateTag).not.toHaveBeenCalled();
		});

		it("does not update when subscriber not found", async () => {
			mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

			await POST(makeRequest(VALID_TOKEN));

			expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// Pending subscriber
	// ========================================================================

	describe("pending subscriber", () => {
		it("unsubscribes a pending subscriber", async () => {
			mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(makeSubscriber("PENDING"));

			await POST(makeRequest(VALID_TOKEN));

			expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: "UNSUBSCRIBED" }),
				}),
			);
		});
	});
});
