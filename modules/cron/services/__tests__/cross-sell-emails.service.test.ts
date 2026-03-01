import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockSendCrossSellEmail } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn(), update: vi.fn() },
		product: { findMany: vi.fn() },
	},
	mockSendCrossSellEmail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/emails/services/cross-sell-emails", () => ({
	sendCrossSellEmail: mockSendCrossSellEmail,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
	ROUTES: {
		SHOP: { PRODUCTS: "/produits" },
		NOTIFICATIONS: { UNSUBSCRIBE: "/notifications/unsubscribe" },
	},
}));
vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_DEADLINE_MS: 5000,
	BATCH_SIZE_MEDIUM: 25,
	EMAIL_THROTTLE_MS: 0,
}));
vi.mock("@/app/generated/prisma/client", () => ({
	FulfillmentStatus: { DELIVERED: "DELIVERED" },
}));

import { sendCrossSellEmails } from "../cross-sell-emails.service";

// ============================================================================
// HELPERS
// ============================================================================

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-0001",
		userId: "user-1",
		user: { email: "client@example.com", name: "Marie" },
		items: [
			{
				productId: "prod-1",
				sku: {
					product: {
						typeId: "type-bague",
						collections: [{ collectionId: "col-ete" }],
					},
				},
			},
		],
		...overrides,
	};
}

function makeSuggestion(overrides: Record<string, unknown> = {}) {
	return {
		title: "Collier Etoile",
		slug: "collier-etoile",
		skus: [
			{
				priceInclTax: 5999,
				images: [{ url: "https://cdn.example.com/collier.jpg" }],
			},
		],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("sendCrossSellEmails", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.order.update.mockResolvedValue({});
		mockPrisma.product.findMany.mockResolvedValue([]);
		mockSendCrossSellEmail.mockResolvedValue({ success: true });
	});

	it("returns zero counts when no orders to process", async () => {
		const result = await sendCrossSellEmails();

		expect(result).toEqual({
			found: 0,
			sent: 0,
			skipped: 0,
			errors: 0,
			hasMore: false,
		});
	});

	it("queries delivered orders with correct filters", async () => {
		await sendCrossSellEmails();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where.fulfillmentStatus).toBe("DELIVERED");
		expect(call.where.crossSellEmailSentAt).toBeNull();
		expect(call.where.userId).toEqual({ not: null });
		expect(call.where.actualDelivery.lt).toBeInstanceOf(Date);
		expect(call.where.actualDelivery.gt).toBeInstanceOf(Date);
		expect(call.take).toBe(25);
	});

	it("skips orders with no matching product type or collection", async () => {
		const orderWithNoTypes = makeOrder({
			items: [
				{
					productId: "prod-1",
					sku: {
						product: {
							typeId: null,
							collections: [],
						},
					},
				},
			],
		});
		mockPrisma.order.findMany.mockResolvedValue([orderWithNoTypes]);

		const result = await sendCrossSellEmails();

		expect(result.skipped).toBe(1);
		expect(result.sent).toBe(0);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: { crossSellEmailSentAt: expect.any(Date) },
			}),
		);
		expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
	});

	it("skips and marks as sent when no suggestions found", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.product.findMany.mockResolvedValue([]);

		const result = await sendCrossSellEmails();

		expect(result.skipped).toBe(1);
		expect(result.sent).toBe(0);
		expect(mockSendCrossSellEmail).not.toHaveBeenCalled();
		// Should still mark as sent to avoid re-processing
		expect(mockPrisma.order.update).toHaveBeenCalled();
	});

	it("sends email with correct product suggestions", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.product.findMany.mockResolvedValue([makeSuggestion()]);

		const result = await sendCrossSellEmails();

		expect(result.sent).toBe(1);
		expect(mockSendCrossSellEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				customerName: "Marie",
				products: expect.arrayContaining([
					expect.objectContaining({
						title: "Collier Etoile",
						price: 5999,
						productUrl: "https://synclune.fr/produits/collier-etoile",
					}),
				]),
			}),
		);
	});

	it("sets optimistic lock BEFORE sending email", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.product.findMany.mockResolvedValue([makeSuggestion()]);

		const callOrder: string[] = [];
		mockPrisma.order.update.mockImplementation(() => {
			callOrder.push("update");
			return Promise.resolve({});
		});
		mockSendCrossSellEmail.mockImplementation(() => {
			callOrder.push("sendEmail");
			return Promise.resolve({ success: true });
		});

		await sendCrossSellEmails();

		// The optimistic lock update should happen before email send
		const updateBeforeSend = callOrder.indexOf("update");
		const sendIndex = callOrder.indexOf("sendEmail");
		expect(updateBeforeSend).toBeLessThan(sendIndex);
	});

	it("rolls back crossSellEmailSentAt on email send failure", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.product.findMany.mockResolvedValue([makeSuggestion()]);
		mockSendCrossSellEmail.mockResolvedValue({ success: false });

		const result = await sendCrossSellEmails();

		expect(result.errors).toBe(1);
		expect(result.sent).toBe(0);
		// Should have 2 updates: optimistic lock + rollback
		expect(mockPrisma.order.update).toHaveBeenCalledTimes(2);
		expect(mockPrisma.order.update).toHaveBeenLastCalledWith(
			expect.objectContaining({
				where: { id: "order-1" },
				data: { crossSellEmailSentAt: null },
			}),
		);
	});

	it("counts errors when email throws", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.product.findMany.mockResolvedValue([makeSuggestion()]);
		mockSendCrossSellEmail.mockRejectedValue(new Error("Network error"));

		const result = await sendCrossSellEmails();

		expect(result.errors).toBe(1);
		expect(result.sent).toBe(0);
	});

	it("skips orders with no user email", async () => {
		const orderNoEmail = makeOrder({ user: null });
		mockPrisma.order.findMany.mockResolvedValue([orderNoEmail]);

		const result = await sendCrossSellEmails();

		expect(result.sent).toBe(0);
		expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
	});

	it("excludes already-purchased products from suggestions query", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.product.findMany.mockResolvedValue([makeSuggestion()]);

		await sendCrossSellEmails();

		const productQuery = mockPrisma.product.findMany.mock.calls[0]![0];
		expect(productQuery.where.id.notIn).toContain("prod-1");
	});

	it("returns hasMore=true when batch is full", async () => {
		const orders = Array.from({ length: 25 }, (_, i) => makeOrder({ id: `order-${i}` }));
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockPrisma.product.findMany.mockResolvedValue([makeSuggestion()]);

		const result = await sendCrossSellEmails();

		expect(result.hasMore).toBe(true);
	});

	it("handles mixed results across multiple orders", async () => {
		const orders = [
			makeOrder({ id: "order-1" }),
			makeOrder({
				id: "order-2",
				items: [
					{
						productId: "prod-2",
						sku: { product: { typeId: null, collections: [] } },
					},
				],
			}),
			makeOrder({ id: "order-3" }),
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockPrisma.product.findMany.mockResolvedValue([makeSuggestion()]);
		mockSendCrossSellEmail
			.mockResolvedValueOnce({ success: true })
			.mockResolvedValueOnce({ success: true });

		const result = await sendCrossSellEmails();

		expect(result.found).toBe(3);
		expect(result.sent).toBe(2);
		expect(result.skipped).toBe(1);
		expect(result.errors).toBe(0);
	});
});
