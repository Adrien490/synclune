import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockGetSession,
	mockGetUserOrdersSchema,
	mockFetchUserOrders,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockGetUserOrdersSchema: { safeParse: vi.fn() },
	mockFetchUserOrders: vi.fn(),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("../../schemas/user-orders.schemas", () => ({
	getUserOrdersSchema: mockGetUserOrdersSchema,
}));

vi.mock("../fetch-user-orders", () => ({
	fetchUserOrders: mockFetchUserOrders,
}));

// Must be imported after mocks
import { getUserOrders } from "../get-user-orders";

// ============================================================================
// Shared helpers
// ============================================================================

const EMPTY_RESULT = {
	orders: [],
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
};

const DEFAULT_VALIDATED_PARAMS = {
	sortBy: "created-descending",
	perPage: 10,
	cursor: undefined,
	direction: "forward",
	search: undefined,
};

// ============================================================================
// Tests: getUserOrders
// ============================================================================

describe("getUserOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockGetUserOrdersSchema.safeParse.mockReturnValue({
			success: true,
			data: DEFAULT_VALIDATED_PARAMS,
		});
		mockFetchUserOrders.mockResolvedValue({
			orders: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
	});

	it("returns empty result when there is no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getUserOrders();

		expect(result).toEqual(EMPTY_RESULT);
		expect(mockFetchUserOrders).not.toHaveBeenCalled();
	});

	it("returns empty result when session has no user id", async () => {
		mockGetSession.mockResolvedValue({ user: {} });

		const result = await getUserOrders();

		expect(result).toEqual(EMPTY_RESULT);
		expect(mockFetchUserOrders).not.toHaveBeenCalled();
	});

	it("returns empty result when session user id is undefined", async () => {
		mockGetSession.mockResolvedValue({ user: { id: undefined } });

		const result = await getUserOrders();

		expect(result).toEqual(EMPTY_RESULT);
		expect(mockFetchUserOrders).not.toHaveBeenCalled();
	});

	it("returns empty result when schema validation fails", async () => {
		mockGetUserOrdersSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "Invalid sort field" }] },
		});

		const result = await getUserOrders({ sortBy: "invalid" as never });

		expect(result).toEqual(EMPTY_RESULT);
		expect(mockFetchUserOrders).not.toHaveBeenCalled();
	});

	it("calls fetchUserOrders with userId and validated params", async () => {
		await getUserOrders({ sortBy: "created-descending" });

		expect(mockFetchUserOrders).toHaveBeenCalledWith("user-1", DEFAULT_VALIDATED_PARAMS);
	});

	it("passes empty object to safeParse when no params provided", async () => {
		await getUserOrders();

		expect(mockGetUserOrdersSchema.safeParse).toHaveBeenCalledWith({});
	});

	it("passes provided params to safeParse", async () => {
		const params = { sortBy: "total-descending" as const, perPage: 20 };

		await getUserOrders(params);

		expect(mockGetUserOrdersSchema.safeParse).toHaveBeenCalledWith(params);
	});

	it("returns the result from fetchUserOrders", async () => {
		const expected = {
			orders: [{ id: "order-1" }],
			pagination: {
				nextCursor: "order-1",
				prevCursor: null,
				hasNextPage: true,
				hasPreviousPage: false,
			},
		};
		mockFetchUserOrders.mockResolvedValue(expected);

		const result = await getUserOrders();

		expect(result).toEqual(expected);
	});
});
