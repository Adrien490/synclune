import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAuth,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockSuccess,
	mockNotFound,
	mockBuildUserDataExport,
} = vi.hoisted(() => ({
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockBuildUserDataExport: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	USER_LIMITS: { EXPORT_DATA: "user-export-data" },
}));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
}));
vi.mock("../../services/build-user-data-export.service", () => ({
	buildUserDataExport: mockBuildUserDataExport,
}));
vi.mock("../../types/rgpd.types", () => ({}));

import { exportUserData } from "../export-user-data";

// ============================================================================
// HELPERS
// ============================================================================

const MOCK_EXPORT_DATA = {
	exportedAt: "2026-01-01T00:00:00.000Z",
	profile: {
		name: "Marie Dupont",
		email: "marie@example.com",
		createdAt: "2026-01-01T00:00:00.000Z",
		termsAcceptedAt: null,
	},
	addresses: [],
	orders: [],
	wishlist: [],
	discountUsages: [],
	newsletter: null,
	reviews: [],
	sessions: [],
	customizationRequests: [],
};

// ============================================================================
// TESTS
// ============================================================================

describe("exportUserData", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "marie@example.com", name: "Marie" },
		});
		mockBuildUserDataExport.mockResolvedValue(MOCK_EXPORT_DATA);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} non trouve`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return not found when user does not exist", async () => {
		mockBuildUserDataExport.mockResolvedValue(null);
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should succeed and include user data", async () => {
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Données exportées avec succès", MOCK_EXPORT_DATA);
	});

	it("should call buildUserDataExport with user id", async () => {
		await exportUserData();
		expect(mockBuildUserDataExport).toHaveBeenCalledWith(VALID_USER_ID);
	});

	it("should include exportedAt timestamp", async () => {
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		const callArgs = mockSuccess.mock.calls[0]!;
		expect(callArgs[1]).toHaveProperty("exportedAt");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockBuildUserDataExport.mockRejectedValue(new Error("DB crash"));
		const result = await exportUserData();
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
