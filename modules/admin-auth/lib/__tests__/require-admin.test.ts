import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHasValidAdminSession } = vi.hoisted(() => ({
	mockHasValidAdminSession: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/admin-session", () => ({
	hasValidAdminSession: mockHasValidAdminSession,
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { requireAdmin, requireAdminApiRoute, isAdmin } from "../require-admin";

// ============================================================================
// TESTS
// ============================================================================

describe("requireAdmin", () => {
	beforeEach(() => {
		mockHasValidAdminSession.mockReset();
	});

	it("retourne { admin: true } avec une session valide", async () => {
		mockHasValidAdminSession.mockResolvedValue(true);

		await expect(requireAdmin()).resolves.toEqual({ admin: true });
	});

	it("retourne un ActionState UNAUTHORIZED sans session (pattern early-return)", async () => {
		mockHasValidAdminSession.mockResolvedValue(false);

		const result = await requireAdmin();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			// UNAUTHORIZED et pas FORBIDDEN : « plus de distinction 401/403 »
			// (auth maison) vaut aussi entre les deux helpers.
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
			expect(result.error.message).toBeTruthy();
		}
	});
});

describe("requireAdminApiRoute", () => {
	beforeEach(() => {
		mockHasValidAdminSession.mockReset();
	});

	it("retourne { admin: true } avec une session valide", async () => {
		mockHasValidAdminSession.mockResolvedValue(true);

		await expect(requireAdminApiRoute()).resolves.toEqual({ admin: true });
	});

	it("retourne une Response 401 sans session", async () => {
		mockHasValidAdminSession.mockResolvedValue(false);

		const result = await requireAdminApiRoute();

		expect("response" in result).toBe(true);
		if ("response" in result) {
			expect(result.response.status).toBe(401);
		}
	});
});

describe("isAdmin", () => {
	beforeEach(() => {
		mockHasValidAdminSession.mockReset();
	});

	it("relaie la validation de session", async () => {
		mockHasValidAdminSession.mockResolvedValue(true);

		await expect(isAdmin()).resolves.toBe(true);
	});

	it("retombe sur false si la validation lève (branche de privilège optionnelle)", async () => {
		mockHasValidAdminSession.mockRejectedValue(new Error("boom"));

		await expect(isAdmin()).resolves.toBe(false);
	});
});
