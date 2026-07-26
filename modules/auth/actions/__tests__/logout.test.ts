import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAuth, mockHeaders, mockSuccess, mockError } = vi.hoisted(() => ({
	mockAuth: {
		api: {
			signOut: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	success: mockSuccess,
	error: mockError,
	handleActionError: (_err: unknown, msg: string) => ({
		status: "error",
		message: msg,
	}),
}));

import { logout } from "../logout";

// ============================================================================
// TESTS
// ============================================================================

describe("logout", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers());
		mockAuth.api.signOut.mockResolvedValue({});

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

	it("should call auth.api.signOut with the request headers", async () => {
		const headersList = new Headers({ cookie: "session=abc" });
		mockHeaders.mockResolvedValue(headersList);
		await logout();
		expect(mockAuth.api.signOut).toHaveBeenCalledOnce();
		expect(mockAuth.api.signOut).toHaveBeenCalledWith({ headers: headersList });
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
