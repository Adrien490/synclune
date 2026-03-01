import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		refund: { findUnique: vi.fn() },
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
	GET_REFUND_SELECT: { id: true, orderId: true, amount: true, status: true, items: true },
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
	},
}));

vi.mock("../../schemas/refund.schemas", () => ({
	getRefundSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				id: (data as { id?: string }).id ?? "refund-cuid-001",
			},
		})),
	},
}));

import { getRefundById } from "../get-refund";
import { getRefundSchema } from "../../schemas/refund.schemas";

const mockSchema = getRefundSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-cuid-001",
		orderId: "order-cuid-001",
		stripeRefundId: "re_abc123",
		amount: 4900,
		currency: "eur",
		reason: "CUSTOMER_REQUEST",
		status: "PENDING",
		failureReason: null,
		note: null,
		createdBy: "admin@example.com",
		processedAt: null,
		createdAt: new Date("2024-01-15"),
		updatedAt: new Date("2024-01-15"),
		order: {
			id: "order-cuid-001",
			orderNumber: "ORD-001",
			customerEmail: "client@example.com",
			customerName: "Jane Doe",
			total: 9900,
			stripePaymentIntentId: "pi_abc123",
		},
		items: [],
		...overrides,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockPrisma.refund.findUnique.mockResolvedValue(makeRefund());
	mockSchema.safeParse.mockReturnValue({
		success: true,
		data: { id: "refund-cuid-001" },
	});
}

// ============================================================================
// Tests: getRefundById
// ============================================================================

describe("getRefundById", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "id invalide" }] },
		});

		const result = await getRefundById({});

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
		expect(mockPrisma.refund.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getRefundById({ id: "refund-cuid-001" });

		expect(result).toBeNull();
		expect(mockPrisma.refund.findUnique).not.toHaveBeenCalled();
	});

	it("returns refund for admin user", async () => {
		const refund = makeRefund();
		mockPrisma.refund.findUnique.mockResolvedValue(refund);

		const result = await getRefundById({ id: "refund-cuid-001" });

		expect(result).toEqual(refund);
	});

	it("returns null when refund does not exist", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		const result = await getRefundById({ id: "refund-cuid-001" });

		expect(result).toBeNull();
	});

	it("queries by refund id", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { id: "refund-cuid-999" },
		});

		await getRefundById({ id: "refund-cuid-999" });

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "refund-cuid-999" }),
			}),
		);
	});

	it("includes notDeleted filter in where clause", async () => {
		await getRefundById({ id: "refund-cuid-001" });

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("uses GET_REFUND_SELECT for the DB query", async () => {
		await getRefundById({ id: "refund-cuid-001" });

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, orderId: true, amount: true, status: true, items: true },
			}),
		);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getRefundById({ id: "refund-cuid-001" });

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with orders-list and refund-specific tags in a single call", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { id: "refund-cuid-001" },
		});

		await getRefundById({ id: "refund-cuid-001" });

		// The source calls cacheTag(ORDERS_CACHE_TAGS.LIST, ORDERS_CACHE_TAGS.REFUNDS(params.id))
		// which passes both tags as separate arguments to a single cacheTag call
		expect(mockCacheTag).toHaveBeenCalledWith("orders-list", "order-refunds-refund-cuid-001");
	});

	it("returns null on DB error", async () => {
		mockPrisma.refund.findUnique.mockRejectedValue(new Error("DB connection failed"));

		const result = await getRefundById({ id: "refund-cuid-001" });

		expect(result).toBeNull();
	});
});
