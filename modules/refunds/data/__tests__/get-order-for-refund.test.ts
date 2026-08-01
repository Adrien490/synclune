import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/refund.constants", () => ({
	GET_ORDER_FOR_REFUND_SELECT: { id: true, orderNumber: true, items: true },
}));

// ⚠️ PAS de mock hand-written : ce test assert sur les tags posés par le fetcher, donc
// un miroir manuel des constantes le rendrait aveugle à un tag ajouté à la SSOT — c'est
// précisément le cas de `DETAIL(orderId)`, ajouté parce que ce fetcher lit
// `status`/`paymentStatus`. On charge le vrai module.

vi.mock("../../schemas/refund.schemas", () => ({
	getOrderForRefundSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				orderId: (data as { orderId?: string }).orderId ?? "order-cuid-001",
			},
		})),
	},
}));

import { getOrderForRefund } from "../get-order-for-refund";
import { getOrderForRefundSchema } from "../../schemas/refund.schemas";

const mockSchema = getOrderForRefundSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-cuid-001",
		orderNumber: "ORD-001",
		customerEmail: "client@example.com",
		customerName: "Jane Doe",
		total: 9900,
		paymentStatus: "PAID",
		stripePaymentIntentId: "pi_abc123",
		items: [],
		refunds: [],
		...overrides,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
	mockSchema.safeParse.mockReturnValue({
		success: true,
		data: { orderId: "order-cuid-001" },
	});
}

// ============================================================================
// Tests: getOrderForRefund
// ============================================================================

describe("getOrderForRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "orderId requis" }] },
		});

		const result = await getOrderForRefund({});

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(result).toBeNull();
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});

	it("returns order for admin user", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());

		const result = await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(result).toEqual(makeOrder());
	});

	it("returns null when order does not exist", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(result).toBeNull();
	});

	it("passes orderId from validated params to DB query", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { orderId: "order-cuid-999" },
		});
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ id: "order-cuid-999" }));

		await getOrderForRefund({ orderId: "order-cuid-999" });

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "order-cuid-999" }),
			}),
		);
	});

	it("includes notDeleted filter in where clause", async () => {
		await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("uses GET_ORDER_FOR_REFUND_SELECT for the DB query", async () => {
		await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, orderNumber: true, items: true },
			}),
		);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(mockCacheLife).toHaveBeenCalledWith("user");
	});

	// `DETAIL(orderId)` en plus de `REFUNDS(orderId)` : ce fetcher lit
	// `status`/`paymentStatus`/`fulfillmentStatus`, et `/remboursements/nouveau` s'en sert
	// comme garde d'accès. Sans lui, aucun des mutateurs de statut (mark-as-paid,
	// mark-as-shipped, transitions webhook…) n'invalidait cette entrée — le bouton
	// « Rembourser » renvoyait alors l'admin sur un détail commande qui, lui, affichait
	// déjà le nouveau statut.
	it("calls cacheTag with the per-order refunds tag AND the order detail tag", async () => {
		await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(mockCacheTag).toHaveBeenCalledWith(
			"order-refunds-order-cuid-001",
			"order-detail-order-cuid-001",
		);
	});

	it("returns null on DB error", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("DB connection failed"));

		const result = await getOrderForRefund({ orderId: "order-cuid-001" });

		expect(result).toBeNull();
	});
});
