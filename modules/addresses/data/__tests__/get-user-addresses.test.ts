import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockGetSession, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		address: { findMany: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../constants/user-addresses.constants", () => ({
	GET_USER_ADDRESSES_DEFAULT_SELECT: {
		id: true,
		userId: true,
		firstName: true,
		lastName: true,
		address1: true,
		address2: true,
		postalCode: true,
		city: true,
		country: true,
		phone: true,
		isDefault: true,
		createdAt: true,
		updatedAt: true,
	},
}));

vi.mock("../constants/cache", () => ({
	ADDRESSES_CACHE_TAGS: {
		USER_ADDRESSES: (userId: string) => `addresses-user-${userId}`,
	},
}));

import { getUserAddresses, fetchUserAddresses } from "../get-user-addresses";

// ============================================================================
// Factories
// ============================================================================

function makeAddress(overrides: Record<string, unknown> = {}) {
	return {
		id: "addr-1",
		userId: "user-1",
		firstName: "Jean",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: null,
		postalCode: "75001",
		city: "Paris",
		country: "FR",
		phone: "+33600000000",
		isDefault: false,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

function setupDefaults() {
	mockGetSession.mockResolvedValue(null);
	mockPrisma.address.findMany.mockResolvedValue([]);
}

// ============================================================================
// Tests: getUserAddresses
// ============================================================================

describe("getUserAddresses", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when no session exists", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getUserAddresses();

		expect(result).toBeNull();
		expect(mockPrisma.address.findMany).not.toHaveBeenCalled();
	});

	it("returns addresses for authenticated user", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.address.findMany.mockResolvedValue([makeAddress()]);

		const result = await getUserAddresses();

		expect(result).toHaveLength(1);
	});

	it("passes userId to fetchUserAddresses", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-42" } });
		mockPrisma.address.findMany.mockResolvedValue([]);

		await getUserAddresses();

		expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-42" } }),
		);
	});

	it("returns empty array when user has no addresses", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.address.findMany.mockResolvedValue([]);

		const result = await getUserAddresses();

		expect(result).toEqual([]);
	});
});

// ============================================================================
// Tests: fetchUserAddresses
// ============================================================================

describe("fetchUserAddresses", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.address.findMany.mockResolvedValue([]);
	});

	it("returns empty array when user has no addresses", async () => {
		mockPrisma.address.findMany.mockResolvedValue([]);

		const result = await fetchUserAddresses("user-1");

		expect(result).toEqual([]);
	});

	it("returns all addresses for the given user", async () => {
		const addresses = [
			makeAddress({ id: "addr-1", address1: "12 Rue de la Paix" }),
			makeAddress({ id: "addr-2", address1: "5 Avenue Foch" }),
		];
		mockPrisma.address.findMany.mockResolvedValue(addresses);

		const result = await fetchUserAddresses("user-1");

		expect(result).toHaveLength(2);
	});

	it("dedupes addresses sharing the same address1/postalCode/city/country signature", async () => {
		const addresses = [
			makeAddress({ id: "addr-1", isDefault: true }),
			makeAddress({ id: "addr-2", isDefault: false }),
			makeAddress({ id: "addr-3", address1: "5 Avenue Foch" }),
		];
		mockPrisma.address.findMany.mockResolvedValue(addresses);

		const result = await fetchUserAddresses("user-1");

		// 2 distinct visible addresses (default first kept, dup dropped)
		expect(result).toHaveLength(2);
		expect(result[0]?.id).toBe("addr-1");
		expect(result[1]?.id).toBe("addr-3");
	});

	it("treats trailing whitespace and case as duplicates", async () => {
		const addresses = [
			makeAddress({ id: "addr-1", address1: "12 Rue de la Paix", city: "Paris" }),
			makeAddress({ id: "addr-2", address1: "  12 Rue de la Paix  ", city: "PARIS" }),
		];
		mockPrisma.address.findMany.mockResolvedValue(addresses);

		const result = await fetchUserAddresses("user-1");

		expect(result).toHaveLength(1);
	});

	it("queries DB with correct userId filter", async () => {
		await fetchUserAddresses("user-99");

		expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-99" } }),
		);
	});

	it("orders by isDefault descending then createdAt descending", async () => {
		await fetchUserAddresses("user-1");

		expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
			}),
		);
	});

	it("uses the default address select", async () => {
		await fetchUserAddresses("user-1");

		expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					id: true,
					userId: true,
					firstName: true,
					isDefault: true,
				}),
			}),
		);
	});

	it("returns default address first when mixed addresses", async () => {
		const nonDefault = makeAddress({ id: "addr-regular", isDefault: false });
		const defaultAddr = makeAddress({ id: "addr-default", isDefault: true });
		// Prisma ordering is mocked; simulate the expected output order
		mockPrisma.address.findMany.mockResolvedValue([defaultAddr, nonDefault]);

		const result = await fetchUserAddresses("user-1");

		expect(result[0]?.isDefault).toBe(true);
	});

	it("calls cacheLife with the user profile", async () => {
		await fetchUserAddresses("user-1");

		expect(mockCacheLife).toHaveBeenCalledWith("user");
	});

	it("calls cacheTag with user-specific addresses tag", async () => {
		await fetchUserAddresses("user-1");

		expect(mockCacheTag).toHaveBeenCalledWith("addresses-user-user-1");
	});

	it("calls cacheTag with correct tag for different user IDs", async () => {
		await fetchUserAddresses("user-abc");

		expect(mockCacheTag).toHaveBeenCalledWith("addresses-user-user-abc");
	});
});
