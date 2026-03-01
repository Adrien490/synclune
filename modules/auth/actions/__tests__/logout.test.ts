import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockHeaders,
	mockGetSessionInvalidationTags,
	mockUpdateTag,
	mockSuccess,
	mockError,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			getSession: vi.fn(),
			signOut: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockGetSessionInvalidationTags: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/constants/cache-tags", () => ({
	getSessionInvalidationTags: mockGetSessionInvalidationTags,
}));
vi.mock("@/shared/lib/actions", () => ({
	success: mockSuccess,
	error: mockError,
}));

import { logout } from "../logout";

// ============================================================================
// TESTS
// ============================================================================

describe("logout", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers());
		mockAuth.api.getSession.mockResolvedValue(null);
		mockAuth.api.signOut.mockResolvedValue({});
		mockGetSessionInvalidationTags.mockReturnValue([`session-${VALID_USER_ID}`]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	it("should return success on successful logout", async () => {
		const result = await logout();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Déconnexion");
	});

	it("should call auth.api.signOut", async () => {
		await logout();
		expect(mockAuth.api.signOut).toHaveBeenCalledOnce();
	});

	it("should invalidate cache tags when session has userId", async () => {
		mockAuth.api.getSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		await logout();
		expect(mockGetSessionInvalidationTags).toHaveBeenCalledWith(VALID_USER_ID);
		expect(mockUpdateTag).toHaveBeenCalledWith(`session-${VALID_USER_ID}`);
	});

	it("should call updateTag for each tag returned by getSessionInvalidationTags", async () => {
		const tags = [`session-${VALID_USER_ID}`, `session-extra-${VALID_USER_ID}`];
		mockGetSessionInvalidationTags.mockReturnValue(tags);
		mockAuth.api.getSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		await logout();
		expect(mockUpdateTag).toHaveBeenCalledTimes(tags.length);
		tags.forEach((tag) => expect(mockUpdateTag).toHaveBeenCalledWith(tag));
	});

	it("should succeed when session is null (no logged-in user)", async () => {
		mockAuth.api.getSession.mockResolvedValue(null);
		const result = await logout();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockGetSessionInvalidationTags).not.toHaveBeenCalled();
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should succeed when session has no userId", async () => {
		mockAuth.api.getSession.mockResolvedValue({ user: {} });
		const result = await logout();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockGetSessionInvalidationTags).not.toHaveBeenCalled();
	});

	it("should silently catch cache invalidation errors and still complete logout", async () => {
		mockAuth.api.getSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockGetSessionInvalidationTags.mockImplementation(() => {
			throw new Error("Cache error");
		});
		const result = await logout();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockAuth.api.signOut).toHaveBeenCalledOnce();
	});

	it("should return error when signOut throws", async () => {
		mockAuth.api.signOut.mockRejectedValue(new Error("Sign out failed"));
		const result = await logout();
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déconnexion");
	});

	it("should return error when headers call throws", async () => {
		mockHeaders.mockRejectedValue(new Error("Headers unavailable"));
		const result = await logout();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
