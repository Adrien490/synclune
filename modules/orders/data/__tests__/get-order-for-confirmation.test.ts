import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findFirst: vi.fn() },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		CONFIRMATION: (orderId: string) => `order-confirmation-${orderId}`,
	},
}));

// Must be imported after mocks
import { getOrderForConfirmation } from "../get-order-for-confirmation";

// ============================================================================
// Factories
// ============================================================================

// A valid cuid2 - 24 lowercase alphanumeric chars starting with a letter
const VALID_ORDER_ID = "clh1234567890abcdefghijk";
const VALID_ORDER_NUMBER = "ORD-2024-0001";

function makeConfirmationOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_ORDER_ID,
		userId: null, // EINV-SEC-001 : par défaut guest order pour ne pas casser les tests existants
		orderNumber: VALID_ORDER_NUMBER,
		subtotal: 9900,
		shippingCost: 500,
		discountAmount: 0,
		total: 10400,
		paymentStatus: "PAID",
		shippingFirstName: "Jean",
		shippingLastName: "Dupont",
		shippingAddress1: "1 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingPhone: "+33612345678",
		items: [],
		...overrides,
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("getOrderForConfirmation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findFirst.mockResolvedValue(makeConfirmationOrder());
	});

	describe("input validation", () => {
		it("returns null when orderId is not a valid cuid2", async () => {
			const result = await getOrderForConfirmation("not-a-valid-cuid2", VALID_ORDER_NUMBER);

			expect(result).toBeNull();
			expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		});

		it("returns null when orderId is an empty string", async () => {
			const result = await getOrderForConfirmation("", VALID_ORDER_NUMBER);

			expect(result).toBeNull();
			expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		});

		it("returns null when orderNumber is an empty string", async () => {
			const result = await getOrderForConfirmation(VALID_ORDER_ID, "");

			expect(result).toBeNull();
			expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		});

		it("returns null when both params are empty strings", async () => {
			const result = await getOrderForConfirmation("", "");

			expect(result).toBeNull();
			expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		});

		it("proceeds to DB query when both params are valid", async () => {
			await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			expect(mockPrisma.order.findFirst).toHaveBeenCalledOnce();
		});
	});

	describe("database query", () => {
		it("queries by both id AND orderNumber (double verification)", async () => {
			await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						id: VALID_ORDER_ID,
						orderNumber: VALID_ORDER_NUMBER,
					}),
				}),
			);
		});

		it("applies the notDeleted filter (deletedAt: null)", async () => {
			await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ deletedAt: null }),
				}),
			);
		});

		it("includes id in the where clause", async () => {
			await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			const call = mockPrisma.order.findFirst.mock.calls[0]![0];
			expect(call.where.id).toBe(VALID_ORDER_ID);
		});

		it("includes orderNumber in the where clause", async () => {
			await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			const call = mockPrisma.order.findFirst.mock.calls[0]![0];
			expect(call.where.orderNumber).toBe(VALID_ORDER_NUMBER);
		});
	});

	describe("return values", () => {
		it("returns the order when both id and orderNumber match", async () => {
			const order = makeConfirmationOrder();
			mockPrisma.order.findFirst.mockResolvedValue(order);

			const result = await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			expect(result).toEqual(order);
		});

		it("returns null when the order is not found", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(null);

			const result = await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			expect(result).toBeNull();
		});

		it("returns null when only id matches but orderNumber does not (prevents enumeration)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(null);

			const result = await getOrderForConfirmation(VALID_ORDER_ID, "ORD-WRONG-NUMBER");

			expect(result).toBeNull();
		});
	});

	describe("error handling", () => {
		it("returns null when the DB throws an error", async () => {
			mockPrisma.order.findFirst.mockRejectedValue(new Error("DB connection failed"));

			const result = await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			expect(result).toBeNull();
		});

		it("returns null when the DB throws a non-Error value", async () => {
			mockPrisma.order.findFirst.mockRejectedValue("unexpected string error");

			const result = await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER);

			expect(result).toBeNull();
		});

		it("does not propagate DB exceptions", async () => {
			mockPrisma.order.findFirst.mockRejectedValue(new Error("Prisma timeout"));

			await expect(getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER)).resolves.toBeNull();
		});
	});

	describe("EINV-SEC-001 ownership check", () => {
		const OWNER_USER_ID = "user_aaa111";
		const OTHER_USER_ID = "user_bbb222";

		it("returns the order when order.userId matches sessionUserId", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(
				makeConfirmationOrder({ userId: OWNER_USER_ID }),
			);

			const result = await getOrderForConfirmation(
				VALID_ORDER_ID,
				VALID_ORDER_NUMBER,
				OWNER_USER_ID,
			);

			expect(result).not.toBeNull();
			expect(result?.userId).toBe(OWNER_USER_ID);
		});

		it("returns null when order.userId differs from sessionUserId (cross-user IDOR)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(
				makeConfirmationOrder({ userId: OWNER_USER_ID }),
			);

			const result = await getOrderForConfirmation(
				VALID_ORDER_ID,
				VALID_ORDER_NUMBER,
				OTHER_USER_ID,
			);

			expect(result).toBeNull();
		});

		it("returns null when order has userId but caller has no session (anonymous IDOR)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(
				makeConfirmationOrder({ userId: OWNER_USER_ID }),
			);

			const result = await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER, undefined);

			expect(result).toBeNull();
		});

		it("returns the guest order (userId === null) even without session", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeConfirmationOrder({ userId: null }));

			const result = await getOrderForConfirmation(VALID_ORDER_ID, VALID_ORDER_NUMBER, undefined);

			expect(result).not.toBeNull();
		});

		it("returns the guest order (userId === null) with any logged-in session", async () => {
			mockPrisma.order.findFirst.mockResolvedValue(makeConfirmationOrder({ userId: null }));

			const result = await getOrderForConfirmation(
				VALID_ORDER_ID,
				VALID_ORDER_NUMBER,
				OTHER_USER_ID,
			);

			expect(result).not.toBeNull();
		});
	});
});
