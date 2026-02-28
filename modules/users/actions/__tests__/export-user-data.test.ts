import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockSuccess,
	mockNotFound,
} = vi.hoisted(() => ({
	mockPrisma: { user: { findUnique: vi.fn() } },
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
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
vi.mock("../../types/rgpd.types", () => ({}));

import { exportUserData } from "../export-user-data";

// ============================================================================
// HELPERS
// ============================================================================

function createFullUser() {
	return {
		id: VALID_USER_ID,
		name: "Marie Dupont",
		email: "marie@example.com",
		createdAt: new Date("2026-01-01"),
		addresses: [],
		orders: [],
		wishlist: null,
		discountUsages: [],
		newsletterSubscription: null,
		reviews: [],
		sessions: [],
		customizationRequests: [],
	};
}

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
		mockPrisma.user.findUnique.mockResolvedValue(createFullUser());

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
		mockPrisma.user.findUnique.mockResolvedValue(null);
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should succeed and include user data", async () => {
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("export"),
			expect.objectContaining({ profile: expect.any(Object) }),
		);
	});

	it("should fetch user with all related data", async () => {
		await exportUserData();
		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_USER_ID },
				include: expect.objectContaining({
					addresses: expect.any(Object),
					orders: expect.any(Object),
				}),
			}),
		);
	});

	it("should include exportedAt timestamp", async () => {
		const result = await exportUserData();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		// The success call should include exportedAt in the data
		const callArgs = mockSuccess.mock.calls[0]!;
		expect(callArgs[1]).toHaveProperty("exportedAt");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await exportUserData();
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
