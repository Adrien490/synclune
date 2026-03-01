import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockGetSession, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: { findMany: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../constants/cache", () => ({
	CUSTOMIZATION_CACHE_TAGS: {
		USER_REQUESTS: (userId: string) => `customization-requests-user-${userId}`,
	},
}));

import { getUserCustomizationRequests } from "../get-user-customization-requests";

// ============================================================================
// Factories
// ============================================================================

function makeRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "req-1",
		createdAt: new Date("2024-03-01"),
		productTypeLabel: "Bracelet",
		details: "Gravure initiales",
		status: "PENDING",
		respondedAt: null,
		inspirationProducts: [],
		...overrides,
	};
}

function makeRequestWithProduct(overrides: Record<string, unknown> = {}) {
	return makeRequest({
		inspirationProducts: [
			{
				id: "prod-1",
				title: "Bracelet Or",
				slug: "bracelet-or",
				skus: [
					{
						images: [{ url: "https://example.com/image.jpg" }],
					},
				],
			},
		],
		...overrides,
	});
}

function setupDefaults() {
	mockGetSession.mockResolvedValue(null);
	mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
}

// ============================================================================
// Tests: getUserCustomizationRequests
// ============================================================================

describe("getUserCustomizationRequests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when no session exists", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getUserCustomizationRequests();

		expect(result).toBeNull();
		expect(mockPrisma.customizationRequest.findMany).not.toHaveBeenCalled();
	});

	it("returns null when session has no user", async () => {
		mockGetSession.mockResolvedValue({ user: null });

		const result = await getUserCustomizationRequests();

		expect(result).toBeNull();
		expect(mockPrisma.customizationRequest.findMany).not.toHaveBeenCalled();
	});

	it("returns null when session user has no id", async () => {
		mockGetSession.mockResolvedValue({ user: { id: undefined } });

		const result = await getUserCustomizationRequests();

		expect(result).toBeNull();
	});

	it("returns requests for authenticated user", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([makeRequest()]);

		const result = await getUserCustomizationRequests();

		expect(result).toHaveLength(1);
	});

	it("returns empty array when user has no requests", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		const result = await getUserCustomizationRequests();

		expect(result).toEqual([]);
	});

	it("filters requests by userId", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-42" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		await getUserCustomizationRequests();

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-42" }),
			}),
		);
	});

	it("excludes soft-deleted requests", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		await getUserCustomizationRequests();

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("orders requests by createdAt descending", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		await getUserCustomizationRequests();

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { createdAt: "desc" } }),
		);
	});

	it("returns request with inspiration products", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([makeRequestWithProduct()]);

		const result = await getUserCustomizationRequests();

		expect(result?.[0]?.inspirationProducts).toHaveLength(1);
		expect(result?.[0]?.inspirationProducts[0]).toMatchObject({
			id: "prod-1",
			title: "Bracelet Or",
			slug: "bracelet-or",
		});
	});

	it("returns empty array on DB error without throwing", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockRejectedValue(new Error("DB timeout"));

		const result = await getUserCustomizationRequests();

		expect(result).toEqual([]);
	});

	it("calls cacheLife with dashboard profile", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		await getUserCustomizationRequests();

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with user-specific requests tag", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		await getUserCustomizationRequests();

		expect(mockCacheTag).toHaveBeenCalledWith("customization-requests-user-user-1");
	});

	it("calls cacheTag with correct tag for different user IDs", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-xyz" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		await getUserCustomizationRequests();

		expect(mockCacheTag).toHaveBeenCalledWith("customization-requests-user-user-xyz");
	});

	it("does not call cache functions when user is unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);

		await getUserCustomizationRequests();

		expect(mockCacheLife).not.toHaveBeenCalled();
		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	it("selects only the required fields from the DB", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		await getUserCustomizationRequests();

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					id: true,
					status: true,
					createdAt: true,
					productTypeLabel: true,
					details: true,
					respondedAt: true,
					inspirationProducts: expect.any(Object),
				}),
			}),
		);
	});
});
