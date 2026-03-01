import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetOrderForReviewRequest,
	mockSendReviewRequestEmail,
	mockHandleActionError,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { update: vi.fn() },
	},
	mockGetOrderForReviewRequest: vi.fn(),
	mockSendReviewRequestEmail: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));
vi.mock("../../data/get-order-for-review-request", () => ({
	getOrderForReviewRequest: mockGetOrderForReviewRequest,
}));
vi.mock("@/modules/emails/services/review-emails", () => ({
	sendReviewRequestEmail: mockSendReviewRequestEmail,
}));
vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://synclune.fr",
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
	ROUTES: { NOTIFICATIONS: { UNSUBSCRIBE: "/notifications/unsubscribe" } },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	success: vi.fn((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg })),
	notFound: vi.fn((entity: string) => ({
		status: ActionStatus.NOT_FOUND,
		message: `${entity} introuvable`,
	})),
	error: vi.fn((msg: string) => ({ status: ActionStatus.ERROR, message: msg })),
	validationError: vi.fn((msg: string) => ({
		status: ActionStatus.VALIDATION_ERROR,
		message: msg,
	})),
	handleActionError: mockHandleActionError,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		EMAIL_FAILED: "Erreur envoi email",
	},
}));

import {
	executeReviewRequestEmail,
	sendReviewRequestEmailInternal,
} from "../send-review-request-email.service";

// ============================================================================
// HELPERS
// ============================================================================

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-0001",
		fulfillmentStatus: "DELIVERED",
		user: { email: "client@example.com", name: "Marie" },
		items: [
			{
				review: null,
				sku: {
					product: { id: "prod-1", title: "Bracelet Lune", slug: "bracelet-lune" },
					color: { name: "Or" },
					material: { name: "Argent 925" },
					size: "M",
					images: [{ url: "https://cdn.example.com/img.jpg" }],
				},
			},
		],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("executeReviewRequestEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetOrderForReviewRequest.mockResolvedValue(makeOrder());
		mockSendReviewRequestEmail.mockResolvedValue({ success: true });
		mockPrisma.order.update.mockResolvedValue({});
	});

	it("returns notFound when order does not exist", async () => {
		mockGetOrderForReviewRequest.mockResolvedValue(null);
		const result = await executeReviewRequestEmail("order-1");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("returns validationError when order not DELIVERED", async () => {
		mockGetOrderForReviewRequest.mockResolvedValue(makeOrder({ fulfillmentStatus: "SHIPPED" }));
		const result = await executeReviewRequestEmail("order-1");
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("livree");
	});

	it("returns validationError when user has no email", async () => {
		mockGetOrderForReviewRequest.mockResolvedValue(
			makeOrder({ user: { email: null, name: "Marie" } }),
		);
		const result = await executeReviewRequestEmail("order-1");
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("email");
	});

	it("returns validationError when all products already reviewed", async () => {
		mockGetOrderForReviewRequest.mockResolvedValue(
			makeOrder({
				items: [
					{
						review: { id: "rev-1" },
						sku: {
							product: { id: "prod-1", title: "Bracelet", slug: "bracelet" },
							color: null,
							material: null,
							size: null,
							images: [],
						},
					},
				],
			}),
		);
		const result = await executeReviewRequestEmail("order-1");
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("deja un avis");
	});

	it("sets optimistic lock BEFORE sending email", async () => {
		const callOrder: string[] = [];
		mockPrisma.order.update.mockImplementation(() => {
			callOrder.push("update");
			return Promise.resolve({});
		});
		mockSendReviewRequestEmail.mockImplementation(() => {
			callOrder.push("sendEmail");
			return Promise.resolve({ success: true });
		});

		await executeReviewRequestEmail("order-1");

		expect(callOrder[0]).toBe("update");
		expect(callOrder[1]).toBe("sendEmail");
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: { reviewRequestSentAt: expect.any(Date) },
			}),
		);
	});

	it("rolls back reviewRequestSentAt when email send fails", async () => {
		mockSendReviewRequestEmail.mockResolvedValue({ success: false });

		const result = await executeReviewRequestEmail("order-1");

		expect(result.status).toBe(ActionStatus.ERROR);
		// First call: set optimistic lock; second call: rollback
		expect(mockPrisma.order.update).toHaveBeenCalledTimes(2);
		expect(mockPrisma.order.update).toHaveBeenLastCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: { reviewRequestSentAt: null },
			}),
		);
	});

	it("deduplicates products when same product ordered multiple times", async () => {
		mockGetOrderForReviewRequest.mockResolvedValue(
			makeOrder({
				items: [
					{
						review: null,
						sku: {
							product: { id: "prod-1", title: "Bracelet Lune", slug: "bracelet-lune" },
							color: { name: "Or" },
							material: null,
							size: "S",
							images: [{ url: "https://cdn.example.com/img1.jpg" }],
						},
					},
					{
						review: null,
						sku: {
							product: { id: "prod-1", title: "Bracelet Lune", slug: "bracelet-lune" },
							color: { name: "Argent" },
							material: null,
							size: "M",
							images: [{ url: "https://cdn.example.com/img2.jpg" }],
						},
					},
				],
			}),
		);

		await executeReviewRequestEmail("order-1");

		const emailCall = mockSendReviewRequestEmail.mock.calls[0]![0];
		// Should only have 1 product (deduped by product ID)
		expect(emailCall.products).toHaveLength(1);
		expect(emailCall.products[0].title).toBe("Bracelet Lune");
	});

	it("sends email with correct parameters on success", async () => {
		const result = await executeReviewRequestEmail("order-1");

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSendReviewRequestEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				customerName: "Marie",
				orderNumber: "SYN-2026-0001",
				products: expect.arrayContaining([
					expect.objectContaining({
						title: "Bracelet Lune",
						slug: "bracelet-lune",
						skuVariants: "Or · Argent 925 · M",
					}),
				]),
			}),
		);
	});
});

describe("sendReviewRequestEmailInternal", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetOrderForReviewRequest.mockResolvedValue(makeOrder());
		mockSendReviewRequestEmail.mockResolvedValue({ success: true });
		mockPrisma.order.update.mockResolvedValue({});
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("delegates to executeReviewRequestEmail", async () => {
		const result = await sendReviewRequestEmailInternal("order-1");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("catches errors and calls handleActionError", async () => {
		mockGetOrderForReviewRequest.mockRejectedValue(new Error("DB error"));
		const result = await sendReviewRequestEmailInternal("order-1");
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur envoi email");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
