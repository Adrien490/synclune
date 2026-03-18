import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockBuildVerificationWhereClause,
	mockCacheAuthVerifications,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		verification: { findMany: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockBuildVerificationWhereClause: vi.fn(),
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

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/modules/auth/services/verification-query-builder", () => ({
	buildVerificationWhereClause: mockBuildVerificationWhereClause,
}));

vi.mock("@/modules/auth/utils/cache.utils", () => ({
	cacheAuthVerifications: mockCacheAuthVerifications,
}));

vi.mock("@/modules/auth/constants/verification.constants", () => ({
	GET_VERIFICATIONS_DEFAULT_SELECT: {
		id: true,
		identifier: true,
		expiresAt: true,
		createdAt: true,
		updatedAt: true,
	},
	GET_VERIFICATIONS_DEFAULT_PER_PAGE: 50,
	GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE: 200,
	GET_VERIFICATIONS_DEFAULT_SORT_BY: "createdAt",
	GET_VERIFICATIONS_DEFAULT_SORT_ORDER: "desc",
	GET_VERIFICATIONS_SORT_FIELDS: ["createdAt", "updatedAt", "expiresAt"],
}));

vi.mock("@/modules/auth/schemas/verification.schemas", () => ({
	getVerificationsSchema: {
		safeParse: vi.fn((params) => ({ success: true, data: params })),
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

import { getVerifications } from "../get-verifications";
import { getVerificationsSchema } from "@/modules/auth/schemas/verification.schemas";

// ============================================================================
// Factories
// ============================================================================

function makeValidParams(overrides: Record<string, unknown> = {}) {
	return {
		cursor: undefined,
		direction: "forward" as const,
		perPage: 50,
		sortBy: "createdAt",
		sortOrder: "desc" as const,
		filters: {},
		...overrides,
	};
}

function makeRawVerification(overrides: Record<string, unknown> = {}) {
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

function makePaginationInfo(overrides: Record<string, unknown> = {}) {
	return {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
		...overrides,
	};
}

// ============================================================================
// Tests: getVerifications — authentication guards
// ============================================================================

describe("getVerifications — authentication", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(false);
		mockBuildVerificationWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 51 });
		mockPrisma.verification.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: makePaginationInfo(),
		});
	});

	it("throws when not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getVerifications(makeValidParams())).rejects.toThrow("Admin access required");
	});

	it("resolves when admin", async () => {
		mockIsAdmin.mockResolvedValue(true);

		await expect(getVerifications(makeValidParams())).resolves.toBeDefined();
	});
});

// ============================================================================
// Tests: getVerifications — param validation
// ============================================================================

describe("getVerifications — param validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		mockBuildVerificationWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 51 });
		mockPrisma.verification.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: makePaginationInfo(),
		});
	});

	it("throws when schema validation fails", async () => {
		vi.mocked(getVerificationsSchema.safeParse).mockReturnValueOnce({
			success: false,
			error: { errors: [{ message: "Invalid" }] },
		} as ReturnType<typeof getVerificationsSchema.safeParse>);

		await expect(getVerifications(makeValidParams())).rejects.toThrow("Invalid parameters");
	});

	it("proceeds when schema validation succeeds", async () => {
		vi.mocked(getVerificationsSchema.safeParse).mockReturnValueOnce({
			success: true,
			data: makeValidParams(),
		} as ReturnType<typeof getVerificationsSchema.safeParse>);

		await expect(getVerifications(makeValidParams())).resolves.toBeDefined();
	});
});

// ============================================================================
// Tests: maskValue — tested through getVerifications result
// ============================================================================

describe("maskValue — via getVerifications results", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		vi.mocked(getVerificationsSchema.safeParse).mockImplementation((params) => ({
			success: true,
			data: params as ReturnType<typeof makeValidParams>,
		}));
		mockBuildVerificationWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 51 });
	});

	function setupVerificationResult(value: string) {
		const rawVerification = makeRawVerification({ value });
		mockPrisma.verification.findMany.mockResolvedValue([rawVerification]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawVerification],
			pagination: makePaginationInfo(),
		});
	}

	it("returns '***' for value with exactly 4 chars", async () => {
		setupVerificationResult("abcd");

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]?.valuePreview).toBe("***");
	});

	it("returns '***' for value shorter than 4 chars", async () => {
		setupVerificationResult("abc");

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]?.valuePreview).toBe("***");
	});

	it("returns '***' for single char value", async () => {
		setupVerificationResult("x");

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]?.valuePreview).toBe("***");
	});

	it("returns first2***last2 for value with 5 chars", async () => {
		setupVerificationResult("abcde");

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]?.valuePreview).toBe("ab***de");
	});

	it("returns first2***last2 for value longer than 4 chars", async () => {
		setupVerificationResult("abcdef1234");

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]?.valuePreview).toBe("ab***34");
	});

	it("value field is stripped from verification results", async () => {
		setupVerificationResult("abcdef1234");

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]).not.toHaveProperty("value");
	});
});

// ============================================================================
// Tests: getVerifications — enriched fields
// ============================================================================

describe("getVerifications — enriched fields", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		vi.mocked(getVerificationsSchema.safeParse).mockImplementation((params) => ({
			success: true,
			data: params as ReturnType<typeof makeValidParams>,
		}));
		mockBuildVerificationWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 51 });
	});

	it("isExpired is true when expiresAt is in the past", async () => {
		const pastDate = new Date(Date.now() - 1000 * 60 * 60);
		const rawVerification = makeRawVerification({ expiresAt: pastDate });
		mockPrisma.verification.findMany.mockResolvedValue([rawVerification]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawVerification],
			pagination: makePaginationInfo(),
		});

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]?.isExpired).toBe(true);
	});

	it("isExpired is false when expiresAt is in the future", async () => {
		const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
		const rawVerification = makeRawVerification({ expiresAt: futureDate });
		mockPrisma.verification.findMany.mockResolvedValue([rawVerification]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawVerification],
			pagination: makePaginationInfo(),
		});

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]?.isExpired).toBe(false);
	});

	it("verification result contains valuePreview and isExpired fields", async () => {
		const rawVerification = makeRawVerification();
		mockPrisma.verification.findMany.mockResolvedValue([rawVerification]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawVerification],
			pagination: makePaginationInfo(),
		});

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]).toHaveProperty("valuePreview");
		expect(result.verifications[0]).toHaveProperty("isExpired");
	});

	it("verification result preserves raw fields alongside enriched ones", async () => {
		const rawVerification = makeRawVerification({ id: "verif-99", identifier: "user@test.com" });
		mockPrisma.verification.findMany.mockResolvedValue([rawVerification]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawVerification],
			pagination: makePaginationInfo(),
		});

		const result = await getVerifications(makeValidParams());

		expect(result.verifications[0]).toMatchObject({
			id: "verif-99",
			identifier: "user@test.com",
		});
	});
});

// ============================================================================
// Tests: getVerifications — error handling
// ============================================================================

describe("getVerifications — error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		vi.mocked(getVerificationsSchema.safeParse).mockImplementation((params) => ({
			success: true,
			data: params as ReturnType<typeof makeValidParams>,
		}));
		mockBuildVerificationWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 51 });
	});

	it("returns empty verifications with empty pagination on DB error", async () => {
		mockPrisma.verification.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getVerifications(makeValidParams());

		expect(result.verifications).toEqual([]);
		expect(result.pagination).toMatchObject({
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
		});
	});

	it("calls cacheAuthVerifications before attempting DB query", async () => {
		mockPrisma.verification.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: makePaginationInfo(),
		});

		await getVerifications(makeValidParams());

		expect(mockCacheAuthVerifications).toHaveBeenCalled();
	});
});
