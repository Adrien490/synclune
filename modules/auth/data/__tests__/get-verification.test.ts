import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheAuthVerifications, mockCacheLife, mockCacheTag } =
	vi.hoisted(() => ({
		mockPrisma: {
			verification: { findUnique: vi.fn() },
		},
		mockIsAdmin: vi.fn(),
		mockCacheAuthVerifications: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/modules/auth/utils/cache.utils", () => ({
	cacheAuthVerifications: mockCacheAuthVerifications,
}));

vi.mock("@/modules/auth/constants/verification.constants", () => ({
	GET_VERIFICATION_SELECT: {
		id: true,
		identifier: true,
		value: true,
		expiresAt: true,
		createdAt: true,
		updatedAt: true,
	},
}));

vi.mock("@/modules/auth/schemas/verification.schemas", () => ({
	getVerificationSchema: {
		safeParse: vi.fn((params) => {
			if (params?.id && typeof params.id === "string" && params.id.trim().length > 0) {
				return { success: true, data: { id: params.id } };
			}
			return { success: false, error: { errors: [{ message: "Invalid id" }] } };
		}),
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

import { getVerification, fetchVerification } from "../get-verification";

// ============================================================================
// Factories
// ============================================================================

function makeDbVerification(overrides: Record<string, unknown> = {}) {
	return {
		id: "verif-1",
		identifier: "test@example.com",
		value: "abcdef1234",
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

// ============================================================================
// Tests: maskVerificationValue — tested through fetchVerification result
// ============================================================================

describe("maskVerificationValue — via fetchVerification results", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when value is null", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(makeDbVerification({ value: null }));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBeNull();
	});

	it("returns null when value is undefined", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(makeDbVerification({ value: undefined }));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBeNull();
	});

	it("returns null when value is an empty string", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(makeDbVerification({ value: "" }));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBeNull();
	});

	it("returns first...last for value with exactly 6 chars", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(makeDbVerification({ value: "abcdef" }));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBe("a...f");
	});

	it("returns first...last for single char value", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(makeDbVerification({ value: "x" }));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBe("x...x");
	});

	it("returns first...last for value shorter than 6 chars", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(makeDbVerification({ value: "abc" }));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBe("a...c");
	});

	it("returns first4...last2 for value with exactly 7 chars", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(makeDbVerification({ value: "abcdefg" }));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBe("abcd...fg");
	});

	it("returns first4...last2 for value longer than 6 chars", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(
			makeDbVerification({ value: "abcdef1234" }),
		);

		const result = await fetchVerification({ id: "verif-1" });

		expect(result?.valueMasked).toBe("abcd...34");
	});
});

// ============================================================================
// Tests: fetchVerification — DB behavior
// ============================================================================

describe("fetchVerification — DB behavior", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when verification is not found", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(null);

		const result = await fetchVerification({ id: "nonexistent" });

		expect(result).toBeNull();
	});

	it("returns verification with valueMasked when found", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(
			makeDbVerification({ value: "abcdef1234" }),
		);

		const result = await fetchVerification({ id: "verif-1" });

		expect(result).not.toBeNull();
		expect(result?.valueMasked).toBeDefined();
	});

	it("strips raw value field from result", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(
			makeDbVerification({ value: "abcdef1234" }),
		);

		const result = await fetchVerification({ id: "verif-1" });

		expect(result).not.toHaveProperty("value");
	});

	it("preserves raw fields alongside valueMasked", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(
			makeDbVerification({ id: "verif-99", identifier: "user@test.com" }),
		);

		const result = await fetchVerification({ id: "verif-99" });

		expect(result).toMatchObject({
			id: "verif-99",
			identifier: "user@test.com",
		});
	});

	it("returns null on DB error without throwing", async () => {
		mockPrisma.verification.findUnique.mockRejectedValue(new Error("DB connection failed"));

		const result = await fetchVerification({ id: "verif-1" });

		expect(result).toBeNull();
	});

	it("calls cacheAuthVerifications", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(null);

		await fetchVerification({ id: "verif-1" });

		expect(mockCacheAuthVerifications).toHaveBeenCalled();
	});

	it("queries by the provided id", async () => {
		mockPrisma.verification.findUnique.mockResolvedValue(null);

		await fetchVerification({ id: "verif-specific" });

		expect(mockPrisma.verification.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "verif-specific" } }),
		);
	});
});

// ============================================================================
// Tests: getVerification — authentication and validation
// ============================================================================

describe("getVerification — authentication", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.verification.findUnique.mockResolvedValue(null);
	});

	it("returns null when params are invalid (missing id)", async () => {
		const result = await getVerification({});

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
	});

	it("returns null when params have empty id", async () => {
		const result = await getVerification({ id: "" });

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
	});

	it("returns null when not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getVerification({ id: "verif-1" });

		expect(result).toBeNull();
		expect(mockPrisma.verification.findUnique).not.toHaveBeenCalled();
	});

	it("returns verification with valueMasked when admin and record exists", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.verification.findUnique.mockResolvedValue(
			makeDbVerification({ value: "abcdef1234" }),
		);

		const result = await getVerification({ id: "verif-1" });

		expect(result).not.toBeNull();
		expect(result).toHaveProperty("valueMasked");
	});

	it("returns null when admin but record not found", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.verification.findUnique.mockResolvedValue(null);

		const result = await getVerification({ id: "nonexistent" });

		expect(result).toBeNull();
	});

	it("strips value field from result when admin retrieves verification", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.verification.findUnique.mockResolvedValue(
			makeDbVerification({ value: "abcdef1234" }),
		);

		const result = await getVerification({ id: "verif-1" });

		expect(result).not.toHaveProperty("value");
	});
});
