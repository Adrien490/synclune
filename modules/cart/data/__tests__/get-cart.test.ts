import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockGetCartSessionId,
	mockConnection,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		cart: { findFirst: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockGetCartSessionId: vi.fn(),
	mockConnection: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getCartSessionId: mockGetCartSessionId,
}));

vi.mock("next/server", () => ({
	connection: mockConnection,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cart", () => ({
	GET_CART_SELECT: { id: true, items: true },
}));

vi.mock("../../constants/cache", () => ({
	CART_CACHE_TAGS: {
		CART: (userId?: string, sessionId?: string) =>
			userId ? `cart-user-${userId}` : sessionId ? `cart-session-${sessionId}` : "cart-anonymous",
	},
}));

import { getCart, fetchCart } from "../get-cart";

// ============================================================================
// Factories
// ============================================================================

function makeCart(overrides: Record<string, unknown> = {}) {
	return {
		id: "cart-1",
		items: [],
		expiresAt: null,
		...overrides,
	};
}

function setupDefaults() {
	mockConnection.mockResolvedValue(undefined);
	mockGetSession.mockResolvedValue(null);
	mockGetCartSessionId.mockResolvedValue("session-abc");
	mockPrisma.cart.findFirst.mockResolvedValue(null);
}

// ============================================================================
// Tests: getCart
// ============================================================================

describe("getCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns cart for authenticated user using userId", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		const result = await getCart();

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-1" } })
		);
		expect(result).toEqual(makeCart());
	});

	it("returns cart for guest using sessionId", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetCartSessionId.mockResolvedValue("session-abc");
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart({ id: "guest-cart" }));

		const result = await getCart();

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { sessionId: "session-abc" } })
		);
		expect(result).toEqual(makeCart({ id: "guest-cart" }));
	});

	it("returns null on error thrown inside try block", async () => {
		mockGetSession.mockRejectedValue(new Error("Session service unavailable"));

		const result = await getCart();

		expect(result).toBeNull();
	});

	it("does not fetch sessionId when user is authenticated", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await getCart();

		expect(mockGetCartSessionId).not.toHaveBeenCalled();
	});

	it("fetches sessionId when user is not authenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		mockPrisma.cart.findFirst.mockResolvedValue(null);

		await getCart();

		expect(mockGetCartSessionId).toHaveBeenCalledOnce();
	});

	it("returns null when no session and no sessionId", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetCartSessionId.mockResolvedValue(null);

		const result = await getCart();

		expect(result).toBeNull();
		expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: fetchCart
// ============================================================================

describe("fetchCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.cart.findFirst.mockResolvedValue(null);
	});

	it("returns null when no userId and no sessionId", async () => {
		const result = await fetchCart(undefined, undefined);

		expect(result).toBeNull();
		expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
	});

	it("queries by userId when userId is provided", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await fetchCart("user-1", undefined);

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-1" } })
		);
	});

	it("queries by sessionId when no userId is provided", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await fetchCart(undefined, "session-xyz");

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { sessionId: "session-xyz" } })
		);
	});

	it("returns null for expired cart", async () => {
		const pastDate = new Date(Date.now() - 1000 * 60 * 60);
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart({ expiresAt: pastDate }));

		const result = await fetchCart("user-1", undefined);

		expect(result).toBeNull();
	});

	it("returns cart when expiresAt is null (no expiration)", async () => {
		const cart = makeCart({ expiresAt: null });
		mockPrisma.cart.findFirst.mockResolvedValue(cart);

		const result = await fetchCart("user-1", undefined);

		expect(result).toEqual(cart);
	});

	it("returns cart when not expired", async () => {
		const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
		const cart = makeCart({ expiresAt: futureDate });
		mockPrisma.cart.findFirst.mockResolvedValue(cart);

		const result = await fetchCart("user-1", undefined);

		expect(result).toEqual(cart);
	});

	it("returns null when cart is not found in DB", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);

		const result = await fetchCart("user-1", undefined);

		expect(result).toBeNull();
	});

	it("uses GET_CART_SELECT for the DB query", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await fetchCart("user-1", undefined);

		expect(mockPrisma.cart.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ select: { id: true, items: true } })
		);
	});

	it("calls cacheLife with cart profile", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await fetchCart("user-1", undefined);

		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("calls cacheTag with user-specific tag when userId provided", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await fetchCart("user-1", undefined);

		expect(mockCacheTag).toHaveBeenCalledWith("cart-user-user-1");
	});

	it("calls cacheTag with session-specific tag when sessionId provided", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(makeCart());

		await fetchCart(undefined, "session-xyz");

		expect(mockCacheTag).toHaveBeenCalledWith("cart-session-session-xyz");
	});
});
