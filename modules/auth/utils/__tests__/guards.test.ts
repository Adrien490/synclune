import { describe, it, expect, vi } from "vitest";

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn(),
}));

import { isAdmin } from "../guards";
import { getSession } from "@/modules/auth/lib/get-current-session";

// ============================================================================
// isAdmin
// ============================================================================

describe("isAdmin", () => {
	it("returns true when session user role is ADMIN", async () => {
		vi.mocked(getSession).mockResolvedValue({ user: { role: "ADMIN" } } as never);
		expect(await isAdmin()).toBe(true);
	});

	it("returns false when session user role is USER", async () => {
		vi.mocked(getSession).mockResolvedValue({ user: { role: "USER" } } as never);
		expect(await isAdmin()).toBe(false);
	});

	it("returns false when session is null", async () => {
		vi.mocked(getSession).mockResolvedValue(null);
		expect(await isAdmin()).toBe(false);
	});

	it("returns false when getSession throws", async () => {
		vi.mocked(getSession).mockRejectedValue(new Error("auth error"));
		expect(await isAdmin()).toBe(false);
	});
});
