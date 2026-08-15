import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCookies } = vi.hoisted(() => ({
	mockCookies: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { logout } from "../logout";
import { ADMIN_SESSION_COOKIE } from "@/modules/admin-auth/constants/admin-auth.constants";

// ============================================================================
// TESTS
// ============================================================================

describe("logout", () => {
	beforeEach(() => {
		mockCookies.mockReset();
	});

	it("supprime le cookie de session et confirme", async () => {
		const cookieStore = { delete: vi.fn() };
		mockCookies.mockResolvedValue(cookieStore);

		const result = await logout();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(cookieStore.delete).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE);
	});

	it("retourne un ActionState d'erreur si la suppression lève (jamais d'exception)", async () => {
		mockCookies.mockResolvedValue({
			delete: vi.fn(() => {
				throw new Error("cookie store unavailable");
			}),
		});

		const result = await logout();

		expect(result.status).not.toBe(ActionStatus.SUCCESS);
		expect(result.message).toBeTruthy();
	});
});
