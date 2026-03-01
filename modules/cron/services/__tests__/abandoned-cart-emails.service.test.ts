import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockSendAbandonedCartEmail } = vi.hoisted(() => ({
	mockPrisma: {
		cart: { findMany: vi.fn(), update: vi.fn() },
	},
	mockSendAbandonedCartEmail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));
vi.mock("@/modules/emails/services/cart-emails", () => ({
	sendAbandonedCartEmail: mockSendAbandonedCartEmail,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn().mockReturnValue("https://synclune.fr/panier"),
	ROUTES: { SHOP: { CART: "/panier" }, NOTIFICATIONS: { UNSUBSCRIBE: "/desinscription" } },
}));
vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_DEADLINE_MS: 5000,
	BATCH_SIZE_MEDIUM: 25,
	EMAIL_THROTTLE_MS: 0, // No throttle in tests
}));

import { sendAbandonedCartEmails } from "../abandoned-cart-emails.service";

// ============================================================================
// HELPERS
// ============================================================================

function makeCart(overrides: Record<string, unknown> = {}) {
	return {
		id: "cart-1",
		user: { email: "client@example.com", name: "Marie" },
		items: [
			{
				quantity: 1,
				priceAtAdd: 4999,
				sku: {
					inventory: 10,
					color: { name: "Or" },
					material: { name: "Argent 925" },
					product: { title: "Bracelet Lune" },
				},
			},
		],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("sendAbandonedCartEmails", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.cart.findMany.mockResolvedValue([]);
		mockPrisma.cart.update.mockResolvedValue({});
		mockSendAbandonedCartEmail.mockResolvedValue({ success: true });
	});

	it("returns zero counts when no abandoned carts found", async () => {
		const result = await sendAbandonedCartEmails();

		expect(result).toEqual({
			found: 0,
			sent: 0,
			errors: 0,
			hasMore: false,
		});
	});

	it("queries carts updated more than 2h ago with correct filters", async () => {
		await sendAbandonedCartEmails();

		const call = mockPrisma.cart.findMany.mock.calls[0]![0];
		expect(call.where.userId).toEqual({ not: null });
		expect(call.where.abandonedEmailSentAt).toBeNull();
		expect(call.where.updatedAt.lt).toBeInstanceOf(Date);
		expect(call.where.items).toEqual({ some: {} });
		expect(call.take).toBe(25);
	});

	it("marks out-of-stock carts as sent without sending email", async () => {
		const outOfStockCart = makeCart({
			items: [
				{
					quantity: 1,
					priceAtAdd: 4999,
					sku: {
						inventory: 0,
						color: null,
						material: null,
						product: { title: "Bracelet" },
					},
				},
			],
		});
		mockPrisma.cart.findMany.mockResolvedValue([outOfStockCart]);

		const result = await sendAbandonedCartEmails();

		expect(mockSendAbandonedCartEmail).not.toHaveBeenCalled();
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cart-1" },
				data: { abandonedEmailSentAt: expect.any(Date) },
			}),
		);
		expect(result.sent).toBe(0);
	});

	it("sends email for carts with available items", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([makeCart()]);

		const result = await sendAbandonedCartEmails();

		expect(mockSendAbandonedCartEmail).toHaveBeenCalledTimes(1);
		expect(mockSendAbandonedCartEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				customerName: "Marie",
				items: expect.arrayContaining([
					expect.objectContaining({
						productTitle: "Bracelet Lune",
						quantity: 1,
						price: 4999,
					}),
				]),
			}),
		);
		expect(result.sent).toBe(1);
	});

	it("filters out-of-stock items from cart before sending", async () => {
		const mixedCart = makeCart({
			items: [
				{
					quantity: 1,
					priceAtAdd: 4999,
					sku: {
						inventory: 5,
						color: { name: "Or" },
						material: null,
						product: { title: "In Stock Item" },
					},
				},
				{
					quantity: 1,
					priceAtAdd: 2999,
					sku: {
						inventory: 0,
						color: null,
						material: null,
						product: { title: "Out Of Stock Item" },
					},
				},
			],
		});
		mockPrisma.cart.findMany.mockResolvedValue([mixedCart]);

		await sendAbandonedCartEmails();

		const emailCall = mockSendAbandonedCartEmail.mock.calls[0]![0];
		expect(emailCall.items).toHaveLength(1);
		expect(emailCall.items[0].productTitle).toBe("In Stock Item");
	});

	it("calculates total correctly from filtered items", async () => {
		const cart = makeCart({
			items: [
				{
					quantity: 2,
					priceAtAdd: 3000,
					sku: {
						inventory: 5,
						color: null,
						material: null,
						product: { title: "Item A" },
					},
				},
				{
					quantity: 1,
					priceAtAdd: 5000,
					sku: {
						inventory: 3,
						color: null,
						material: null,
						product: { title: "Item B" },
					},
				},
			],
		});
		mockPrisma.cart.findMany.mockResolvedValue([cart]);

		await sendAbandonedCartEmails();

		const emailCall = mockSendAbandonedCartEmail.mock.calls[0]![0];
		expect(emailCall.total).toBe(11000); // 3000*2 + 5000*1
	});

	it("marks cart as sent after successful email", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([makeCart()]);

		await sendAbandonedCartEmails();

		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cart-1" },
				data: { abandonedEmailSentAt: expect.any(Date) },
			}),
		);
	});

	it("counts errors when email send fails", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([makeCart()]);
		mockSendAbandonedCartEmail.mockResolvedValue({ success: false, error: "Send failed" });

		const result = await sendAbandonedCartEmails();

		expect(result.sent).toBe(0);
		expect(result.errors).toBe(1);
	});

	it("counts errors when email throws", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([makeCart()]);
		mockSendAbandonedCartEmail.mockRejectedValue(new Error("Network error"));

		const result = await sendAbandonedCartEmails();

		expect(result.sent).toBe(0);
		expect(result.errors).toBe(1);
	});

	it("returns hasMore=true when batch is full", async () => {
		const carts = Array.from({ length: 25 }, (_, i) => makeCart({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(carts);

		const result = await sendAbandonedCartEmails();

		expect(result.hasMore).toBe(true);
	});

	it("returns hasMore=false when batch is not full", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([makeCart()]);

		const result = await sendAbandonedCartEmails();

		expect(result.hasMore).toBe(false);
	});

	it("stops early when BATCH_DEADLINE_MS exceeded", async () => {
		const carts = Array.from({ length: 5 }, (_, i) => makeCart({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(carts);

		// First email takes longer than deadline
		let callCount = 0;
		mockSendAbandonedCartEmail.mockImplementation(async () => {
			callCount++;
			if (callCount === 1) {
				// Simulate time passing beyond deadline
				vi.spyOn(Date, "now").mockReturnValue(Date.now() + 10000);
			}
			return { success: true };
		});

		const result = await sendAbandonedCartEmails();

		// Should have processed at most 2 carts (1st succeeds, then deadline check triggers)
		expect(result.sent).toBeLessThanOrEqual(2);
		expect(mockSendAbandonedCartEmail.mock.calls.length).toBeLessThanOrEqual(2);
	});

	it("handles mixed success and failure across multiple carts", async () => {
		const carts = [
			makeCart({ id: "cart-1" }),
			makeCart({ id: "cart-2" }),
			makeCart({ id: "cart-3" }),
		];
		mockPrisma.cart.findMany.mockResolvedValue(carts);
		mockSendAbandonedCartEmail
			.mockResolvedValueOnce({ success: true })
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValueOnce({ success: true });

		const result = await sendAbandonedCartEmails();

		expect(result).toEqual({
			found: 3,
			sent: 2,
			errors: 1,
			hasMore: false,
		});
	});
});
