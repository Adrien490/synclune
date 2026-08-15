import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCookies, mockLogger } = vi.hoisted(() => ({
	mockCookies: vi.fn(),
	mockLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("next/headers", () => ({ cookies: mockCookies }));
// `connection()` force le rendu dynamique avant Date.now() — inerte en test.
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { hasValidAdminSession } from "../admin-session";
import { signSessionToken } from "../session-token";

// ============================================================================
// HELPERS
// ============================================================================

const SECRET = "test-secret-at-least-32-characters-long!";

function makeCookieStore(value?: string) {
	return {
		get: vi.fn().mockReturnValue(value !== undefined ? { value } : undefined),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("hasValidAdminSession", () => {
	beforeEach(() => {
		mockCookies.mockReset();
		mockLogger.error.mockReset();
		vi.stubEnv("AUTH_SECRET", SECRET);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("accepte un cookie signé non expiré", async () => {
		mockCookies.mockResolvedValue(makeCookieStore(signSessionToken(Date.now() + 60_000, SECRET)));

		await expect(hasValidAdminSession()).resolves.toBe(true);
	});

	it("refuse un cookie expiré", async () => {
		mockCookies.mockResolvedValue(makeCookieStore(signSessionToken(Date.now() - 1000, SECRET)));

		await expect(hasValidAdminSession()).resolves.toBe(false);
	});

	it("refuse un cookie signé avec un autre secret", async () => {
		mockCookies.mockResolvedValue(
			makeCookieStore(signSessionToken(Date.now() + 60_000, "another-secret-32-characters-long!!")),
		);

		await expect(hasValidAdminSession()).resolves.toBe(false);
	});

	it("refuse en l'absence de cookie", async () => {
		mockCookies.mockResolvedValue(makeCookieStore());

		await expect(hasValidAdminSession()).resolves.toBe(false);
	});

	it("est fail-closed sans AUTH_SECRET : refuse même un cookie bien formé, et logue", async () => {
		// Un secret absent ne doit JAMAIS ouvrir l'admin — la réponse est false
		// AVANT toute lecture de cookie.
		vi.stubEnv("AUTH_SECRET", "");
		mockCookies.mockResolvedValue(makeCookieStore(signSessionToken(Date.now() + 60_000, SECRET)));

		await expect(hasValidAdminSession()).resolves.toBe(false);
		expect(mockLogger.error).toHaveBeenCalledOnce();
	});
});
