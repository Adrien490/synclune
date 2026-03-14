import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCookieGet, mockCookieSet } = vi.hoisted(() => ({
	mockCookieGet: vi.fn(),
	mockCookieSet: vi.fn(),
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn().mockResolvedValue({
		get: mockCookieGet,
		set: mockCookieSet,
	}),
}));

// ============================================================================
// Import under test (after mocks are set up)
// ============================================================================

import { updateInstallPrompt } from "../update-install-prompt";
import {
	INSTALL_PROMPT_COOKIE_NAME,
	INSTALL_PROMPT_MAX_DISMISSALS,
} from "@/shared/constants/install-prompt";

// ============================================================================
// Helpers
// ============================================================================

function makeCookieValue(v: number, d: number, p: boolean): string {
	return JSON.stringify({ v, d, p });
}

function setCookie(value: string) {
	mockCookieGet.mockReturnValue({ value });
}

function clearCookie() {
	mockCookieGet.mockReturnValue(undefined);
}

// ============================================================================
// Tests
// ============================================================================

describe("updateInstallPrompt", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearCookie();
	});

	// --------------------------------------------------------------------------
	// Missing / absent cookie — defaults
	// --------------------------------------------------------------------------

	describe("missing cookie", () => {
		it("starts from zero for a visit action when no cookie is present", async () => {
			const result = await updateInstallPrompt({ action: "visit" });

			expect(result.visitCount).toBe(1);
			expect(result.dismissCount).toBe(0);
			expect(result.permanentlyDismissed).toBe(false);
		});

		it("starts from zero for a dismiss action when no cookie is present", async () => {
			const result = await updateInstallPrompt({ action: "dismiss" });

			expect(result.visitCount).toBe(0);
			expect(result.dismissCount).toBe(1);
			expect(result.permanentlyDismissed).toBe(false);
		});

		it("starts from zero for an install action when no cookie is present", async () => {
			const result = await updateInstallPrompt({ action: "install" });

			expect(result.visitCount).toBe(0);
			expect(result.dismissCount).toBe(0);
			expect(result.permanentlyDismissed).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// Malformed cookie — fallback to defaults
	// --------------------------------------------------------------------------

	describe("malformed cookie", () => {
		it("falls back to defaults when cookie value is invalid JSON", async () => {
			setCookie("not-valid-json{{");

			const result = await updateInstallPrompt({ action: "visit" });

			expect(result.visitCount).toBe(1);
			expect(result.dismissCount).toBe(0);
			expect(result.permanentlyDismissed).toBe(false);
		});

		it("falls back to defaults when cookie JSON is valid but schema is wrong", async () => {
			setCookie(JSON.stringify({ wrong: true }));

			const result = await updateInstallPrompt({ action: "visit" });

			expect(result.visitCount).toBe(1);
			expect(result.dismissCount).toBe(0);
			expect(result.permanentlyDismissed).toBe(false);
		});

		it("falls back to defaults when cookie value is an empty string", async () => {
			setCookie("");

			const result = await updateInstallPrompt({ action: "dismiss" });

			expect(result.dismissCount).toBe(1);
		});
	});

	// --------------------------------------------------------------------------
	// visit action
	// --------------------------------------------------------------------------

	describe("visit action", () => {
		it("increments visitCount by 1", async () => {
			setCookie(makeCookieValue(3, 0, false));

			const result = await updateInstallPrompt({ action: "visit" });

			expect(result.visitCount).toBe(4);
		});

		it("does not change dismissCount on visit", async () => {
			setCookie(makeCookieValue(1, 2, false));

			const result = await updateInstallPrompt({ action: "visit" });

			expect(result.dismissCount).toBe(2);
		});

		it("does not change permanentlyDismissed on visit", async () => {
			setCookie(makeCookieValue(5, 0, false));

			const result = await updateInstallPrompt({ action: "visit" });

			expect(result.permanentlyDismissed).toBe(false);
		});

		it("preserves an existing permanentlyDismissed=true on visit", async () => {
			setCookie(makeCookieValue(5, 3, true));

			const result = await updateInstallPrompt({ action: "visit" });

			expect(result.permanentlyDismissed).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// dismiss action
	// --------------------------------------------------------------------------

	describe("dismiss action", () => {
		it("increments dismissCount by 1", async () => {
			setCookie(makeCookieValue(0, 1, false));

			const result = await updateInstallPrompt({ action: "dismiss" });

			expect(result.dismissCount).toBe(2);
		});

		it("does not change visitCount on dismiss", async () => {
			setCookie(makeCookieValue(4, 0, false));

			const result = await updateInstallPrompt({ action: "dismiss" });

			expect(result.visitCount).toBe(4);
		});

		it("does not set permanentlyDismissed when dismissCount is below the threshold", async () => {
			setCookie(makeCookieValue(0, INSTALL_PROMPT_MAX_DISMISSALS - 2, false));

			const result = await updateInstallPrompt({ action: "dismiss" });

			expect(result.permanentlyDismissed).toBe(false);
		});

		it(`sets permanentlyDismissed=true when dismissCount reaches ${INSTALL_PROMPT_MAX_DISMISSALS}`, async () => {
			setCookie(makeCookieValue(0, INSTALL_PROMPT_MAX_DISMISSALS - 1, false));

			const result = await updateInstallPrompt({ action: "dismiss" });

			expect(result.dismissCount).toBe(INSTALL_PROMPT_MAX_DISMISSALS);
			expect(result.permanentlyDismissed).toBe(true);
		});

		it("keeps permanentlyDismissed=true when already set before dismiss", async () => {
			setCookie(makeCookieValue(0, INSTALL_PROMPT_MAX_DISMISSALS, true));

			const result = await updateInstallPrompt({ action: "dismiss" });

			expect(result.permanentlyDismissed).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// install action
	// --------------------------------------------------------------------------

	describe("install action", () => {
		it("sets permanentlyDismissed=true regardless of previous state", async () => {
			setCookie(makeCookieValue(5, 0, false));

			const result = await updateInstallPrompt({ action: "install" });

			expect(result.permanentlyDismissed).toBe(true);
		});

		it("does not change visitCount on install", async () => {
			setCookie(makeCookieValue(7, 1, false));

			const result = await updateInstallPrompt({ action: "install" });

			expect(result.visitCount).toBe(7);
		});

		it("does not change dismissCount on install", async () => {
			setCookie(makeCookieValue(0, 2, false));

			const result = await updateInstallPrompt({ action: "install" });

			expect(result.dismissCount).toBe(2);
		});

		it("is idempotent when permanentlyDismissed was already true", async () => {
			setCookie(makeCookieValue(3, 3, true));

			const result = await updateInstallPrompt({ action: "install" });

			expect(result.permanentlyDismissed).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// Cookie persistence
	// --------------------------------------------------------------------------

	describe("cookie persistence", () => {
		it("writes the updated state to the cookie with the correct name", async () => {
			clearCookie();

			await updateInstallPrompt({ action: "visit" });

			expect(mockCookieSet).toHaveBeenCalledOnce();
			const [name] = mockCookieSet.mock.calls[0]!;
			expect(name).toBe(INSTALL_PROMPT_COOKIE_NAME);
		});

		it("writes JSON containing the updated visit count", async () => {
			setCookie(makeCookieValue(2, 0, false));

			await updateInstallPrompt({ action: "visit" });

			const [, value] = mockCookieSet.mock.calls[0]!;
			const parsed = JSON.parse(value as string);
			expect(parsed.v).toBe(3);
		});

		it("sets httpOnly=true on the cookie", async () => {
			clearCookie();

			await updateInstallPrompt({ action: "visit" });

			const [, , options] = mockCookieSet.mock.calls[0]!;
			expect((options as Record<string, unknown>).httpOnly).toBe(true);
		});

		it("sets sameSite=strict on the cookie", async () => {
			clearCookie();

			await updateInstallPrompt({ action: "visit" });

			const [, , options] = mockCookieSet.mock.calls[0]!;
			expect((options as Record<string, unknown>).sameSite).toBe("strict");
		});

		it("sets path=/ on the cookie", async () => {
			clearCookie();

			await updateInstallPrompt({ action: "visit" });

			const [, , options] = mockCookieSet.mock.calls[0]!;
			expect((options as Record<string, unknown>).path).toBe("/");
		});
	});

	// --------------------------------------------------------------------------
	// Return value shape
	// --------------------------------------------------------------------------

	describe("return value shape", () => {
		it("always returns the three expected fields", async () => {
			const result = await updateInstallPrompt({ action: "visit" });

			expect(result).toHaveProperty("visitCount");
			expect(result).toHaveProperty("dismissCount");
			expect(result).toHaveProperty("permanentlyDismissed");
		});

		it("returns numbers for visitCount and dismissCount", async () => {
			const result = await updateInstallPrompt({ action: "visit" });

			expect(typeof result.visitCount).toBe("number");
			expect(typeof result.dismissCount).toBe("number");
		});

		it("returns a boolean for permanentlyDismissed", async () => {
			const result = await updateInstallPrompt({ action: "install" });

			expect(typeof result.permanentlyDismissed).toBe("boolean");
		});
	});
});
