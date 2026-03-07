import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: { findFirst: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../constants/cache", () => ({
	cacheCustomizationDetail: (id: string) => {
		mockCacheLife("dashboard");
		mockCacheTag(`customization-request-${id}`);
	},
}));

import { getCustomizationRequest } from "../get-customization-request";

// ============================================================================
// Factories
// ============================================================================

function makeDetailRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "req-1",
		createdAt: new Date("2024-03-01"),
		updatedAt: new Date("2024-03-01"),
		firstName: "Marie",
		email: "marie@example.com",
		phone: "+33612345678",
		productTypeLabel: "Bracelet",
		productType: { id: "pt-1", label: "Bracelet", slug: "bracelet" },
		details: "Bracelet avec gravure initiales",
		status: "PENDING",
		adminNotes: null,
		respondedAt: null,
		inspirationMedias: [],
		inspirationProducts: [],
		...overrides,
	};
}

function setupDefaults() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockPrisma.customizationRequest.findFirst.mockResolvedValue(null);
}

// ============================================================================
// Tests: getCustomizationRequest
// ============================================================================

describe("getCustomizationRequest", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	// ──────────── Auth guard ────────────

	it("returns null when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "FORBIDDEN", message: "Non autorisé" } });

		const result = await getCustomizationRequest("req-1");

		expect(result).toBeNull();
		expect(mockPrisma.customizationRequest.findFirst).not.toHaveBeenCalled();
	});

	it("does not call cache functions when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "FORBIDDEN", message: "Non autorisé" } });

		await getCustomizationRequest("req-1");

		expect(mockCacheLife).not.toHaveBeenCalled();
		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	// ──────────── Cache ────────────

	it("calls cacheLife with dashboard profile", async () => {
		await getCustomizationRequest("req-1");

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with detail tag including the request ID", async () => {
		await getCustomizationRequest("req-42");

		expect(mockCacheTag).toHaveBeenCalledWith("customization-request-req-42");
	});

	it("uses different cache tags for different IDs", async () => {
		await getCustomizationRequest("req-abc");

		expect(mockCacheTag).toHaveBeenCalledWith("customization-request-req-abc");
	});

	// ──────────── Query ────────────

	it("queries by ID and excludes soft-deleted records", async () => {
		await getCustomizationRequest("req-1");

		expect(mockPrisma.customizationRequest.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "req-1", deletedAt: null },
			}),
		);
	});

	it("returns the request when found", async () => {
		const request = makeDetailRequest();
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(request);

		const result = await getCustomizationRequest("req-1");

		expect(result).toEqual(request);
	});

	it("returns null when request is not found", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(null);

		const result = await getCustomizationRequest("nonexistent");

		expect(result).toBeNull();
	});

	// ──────────── Select fields ────────────

	it("selects productType with id, label, and slug", async () => {
		await getCustomizationRequest("req-1");

		expect(mockPrisma.customizationRequest.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					productType: {
						select: { id: true, label: true, slug: true },
					},
				}),
			}),
		);
	});

	it("selects inspirationMedias ordered by position", async () => {
		await getCustomizationRequest("req-1");

		expect(mockPrisma.customizationRequest.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					inspirationMedias: {
						select: { id: true, url: true, blurDataUrl: true, altText: true },
						orderBy: { position: "asc" },
					},
				}),
			}),
		);
	});

	it("selects inspirationProducts with default SKU image", async () => {
		await getCustomizationRequest("req-1");

		expect(mockPrisma.customizationRequest.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					inspirationProducts: {
						select: {
							id: true,
							title: true,
							slug: true,
							skus: {
								where: { isDefault: true },
								take: 1,
								select: {
									id: true,
									images: {
										where: { isPrimary: true },
										take: 1,
										select: { url: true },
									},
								},
							},
						},
					},
				}),
			}),
		);
	});

	it("selects all required scalar fields", async () => {
		await getCustomizationRequest("req-1");

		expect(mockPrisma.customizationRequest.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					id: true,
					createdAt: true,
					updatedAt: true,
					firstName: true,
					email: true,
					phone: true,
					productTypeLabel: true,
					details: true,
					status: true,
					adminNotes: true,
					respondedAt: true,
				}),
			}),
		);
	});

	// ──────────── Data ────────────

	it("returns request with inspiration products and SKU images", async () => {
		const request = makeDetailRequest({
			inspirationProducts: [
				{
					id: "prod-1",
					title: "Bracelet Or",
					slug: "bracelet-or",
					skus: [
						{
							id: "sku-1",
							images: [{ url: "https://example.com/image.jpg" }],
						},
					],
				},
			],
		});
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(request);

		const result = await getCustomizationRequest("req-1");

		expect(result?.inspirationProducts).toHaveLength(1);
		expect(result?.inspirationProducts[0]).toMatchObject({
			id: "prod-1",
			title: "Bracelet Or",
		});
	});

	it("returns request with productType when linked", async () => {
		const request = makeDetailRequest({
			productType: { id: "pt-1", label: "Collier", slug: "collier" },
		});
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(request);

		const result = await getCustomizationRequest("req-1");

		expect(result?.productType).toEqual({ id: "pt-1", label: "Collier", slug: "collier" });
	});

	// ──────────── Error handling ────────────

	it("returns null on DB error without throwing", async () => {
		mockPrisma.customizationRequest.findFirst.mockRejectedValue(new Error("DB unavailable"));

		const result = await getCustomizationRequest("req-1");

		expect(result).toBeNull();
	});
});
