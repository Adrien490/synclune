import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockCacheLife,
	mockCacheTag,
	mockBuildRefundWhereClause,
	mockGetSortDirection,
	mockBuildCursorPagination,
	mockProcessCursorResults,
} = vi.hoisted(() => ({
	mockPrisma: {
		refund: { findMany: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildRefundWhereClause: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
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
	GET_REFUNDS_SELECT: { id: true, amount: true, status: true, order: true },
	GET_REFUNDS_DEFAULT_PER_PAGE: 10,
	GET_REFUNDS_MAX_RESULTS_PER_PAGE: 100,
	SORT_OPTIONS: {
		CREATED_DESC: "created-descending",
		CREATED_ASC: "created-ascending",
		AMOUNT_DESC: "amount-descending",
		AMOUNT_ASC: "amount-ascending",
		STATUS_ASC: "status-ascending",
		STATUS_DESC: "status-descending",
	},
	SORT_LABELS: {},
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
	},
}));

vi.mock("../../schemas/refund.schemas", () => ({
	getRefundsSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				cursor: undefined,
				direction: "forward",
				perPage: 10,
				sortBy: "created-descending",
				...(data as object),
			},
		})),
	},
	refundFiltersSchema: {},
	refundSortBySchema: {},
}));

vi.mock("../../services/refund-query-builder", () => ({
	buildRefundWhereClause: mockBuildRefundWhereClause,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

import { getRefunds } from "../get-refunds";
import { getRefundsSchema } from "../../schemas/refund.schemas";

const mockSchema = getRefundsSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

const emptyPagination = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-cuid-001",
		orderId: "order-cuid-001",
		amount: 4900,
		currency: "eur",
		reason: "CUSTOMER_REQUEST",
		status: "PENDING",
		createdAt: new Date("2024-01-15"),
		order: {
			id: "order-cuid-001",
			orderNumber: "ORD-001",
			customerEmail: "a@b.com",
			customerName: "Jane",
			total: 9900,
		},
		_count: { items: 1 },
		...overrides,
	};
}

function makeValidParams() {
	return {
		cursor: undefined,
		direction: "forward" as const,
		perPage: 10,
		sortBy: "created-descending",
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockBuildRefundWhereClause.mockReturnValue({});
	mockGetSortDirection.mockReturnValue("desc");
	mockBuildCursorPagination.mockReturnValue({ take: 11 });
	mockPrisma.refund.findMany.mockResolvedValue([makeRefund()]);
	mockProcessCursorResults.mockReturnValue({
		items: [makeRefund()],
		pagination: emptyPagination,
	});
	mockSchema.safeParse.mockReturnValue({
		success: true,
		data: makeValidParams(),
	});
}

// ============================================================================
// Tests: getRefunds
// ============================================================================

describe("getRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty result when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "sortBy invalide" }] },
		});

		const result = await getRefunds(makeValidParams() as never);

		expect(result.refunds).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
		expect(mockIsAdmin).not.toHaveBeenCalled();
	});

	it("returns empty result when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getRefunds(makeValidParams() as never);

		expect(result.refunds).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
	});

	it("returns refunds for admin user", async () => {
		const refund = makeRefund();
		mockProcessCursorResults.mockReturnValue({
			items: [refund],
			pagination: emptyPagination,
		});

		const result = await getRefunds(makeValidParams() as never);

		expect(result.refunds).toEqual([refund]);
	});

	it("returns empty list when no refunds found", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: emptyPagination,
		});

		const result = await getRefunds(makeValidParams() as never);

		expect(result.refunds).toEqual([]);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getRefunds(makeValidParams() as never);

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with orders-list tag", async () => {
		await getRefunds(makeValidParams() as never);

		expect(mockCacheTag).toHaveBeenCalledWith("orders-list");
	});

	it("uses GET_REFUNDS_SELECT for the DB query", async () => {
		await getRefunds(makeValidParams() as never);

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, amount: true, status: true, order: true },
			}),
		);
	});

	it("passes where clause from buildRefundWhereClause to DB query", async () => {
		mockBuildRefundWhereClause.mockReturnValue({ status: "PENDING" });

		await getRefunds(makeValidParams() as never);

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { status: "PENDING" },
			}),
		);
	});

	it("orders by createdAt for created-descending sort", async () => {
		mockGetSortDirection.mockReturnValue("desc");
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), sortBy: "created-descending" },
		});

		await getRefunds(makeValidParams() as never);

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ createdAt: "desc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by amount for amount-descending sort", async () => {
		mockGetSortDirection.mockReturnValue("desc");
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), sortBy: "amount-descending" },
		});

		await getRefunds(makeValidParams() as never);

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ amount: "desc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by status for status-ascending sort", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), sortBy: "status-ascending" },
		});

		await getRefunds(makeValidParams() as never);

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ status: "asc" }, { id: "asc" }],
			}),
		);
	});

	it("passes cursor config from buildCursorPagination to DB query", async () => {
		mockBuildCursorPagination.mockReturnValue({ take: 11, skip: 1, cursor: { id: "refund-prev" } });

		await getRefunds(makeValidParams() as never);

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 11,
				skip: 1,
				cursor: { id: "refund-prev" },
			}),
		);
	});

	it("calls processCursorResults with DB results and pagination params", async () => {
		const refunds = [makeRefund()];
		mockPrisma.refund.findMany.mockResolvedValue(refunds);
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), cursor: "some-cursor", direction: "forward" },
		});

		await getRefunds(makeValidParams() as never);

		expect(mockProcessCursorResults).toHaveBeenCalledWith(refunds, 10, "forward", "some-cursor");
	});

	it("returns empty result on DB error", async () => {
		mockPrisma.refund.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getRefunds(makeValidParams() as never);

		expect(result.refunds).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
	});

	it("caps perPage at GET_REFUNDS_MAX_RESULTS_PER_PAGE (100)", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), perPage: 999 },
		});

		await getRefunds(makeValidParams() as never);

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
	});

	it("uses default perPage when perPage is 0", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), perPage: 0 },
		});

		await getRefunds(makeValidParams() as never);

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
	});
});
