import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCookies, mockLogger } = vi.hoisted(() => ({
	mockCookies: vi.fn(),
	mockLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { login } from "../login";
import { verifySessionToken } from "@/modules/admin-auth/lib/session-token";
import {
	ADMIN_SESSION_COOKIE,
	ADMIN_SESSION_DURATION_MS,
} from "@/modules/admin-auth/constants/admin-auth.constants";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_PASSWORD = "correct-horse-battery-staple";
const AUTH_SECRET = "test-secret-at-least-32-characters-long!";

function makeFormData(password: string | undefined): FormData {
	const formData = new FormData();
	if (password !== undefined) formData.set("password", password);
	return formData;
}

function makeCookieStore() {
	return { set: vi.fn() };
}

// ============================================================================
// TESTS
// ============================================================================

describe("login", () => {
	let cookieStore: ReturnType<typeof makeCookieStore>;

	beforeEach(() => {
		cookieStore = makeCookieStore();
		mockCookies.mockReset();
		mockCookies.mockResolvedValue(cookieStore);
		vi.stubEnv("ADMIN_PASSWORD", ADMIN_PASSWORD);
		vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("pose un cookie de session signé avec le bon mot de passe", async () => {
		const result = await login(undefined, makeFormData(ADMIN_PASSWORD));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(cookieStore.set).toHaveBeenCalledOnce();

		const [name, token, options] = cookieStore.set.mock.calls[0]!;
		expect(name).toBe(ADMIN_SESSION_COOKIE);
		expect(verifySessionToken(token, AUTH_SECRET, Date.now())).toBe(true);
		expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
		// L'expiry du cookie navigateur et celui signé dans le jeton sont le même.
		expect(options.expires.getTime() - Date.now()).toBeGreaterThan(
			ADMIN_SESSION_DURATION_MS - 5000,
		);
		expect(options.expires.getTime() - Date.now()).toBeLessThanOrEqual(ADMIN_SESSION_DURATION_MS);
	});

	it("refuse un mauvais mot de passe (UNAUTHORIZED, aucun cookie)", async () => {
		const result = await login(undefined, makeFormData("definitivement-pas-le-bon"));

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(cookieStore.set).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalledOnce();
	});

	it("refuse un mot de passe vide (validation, sans toucher aux secrets)", async () => {
		const result = await login(undefined, makeFormData(""));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(cookieStore.set).not.toHaveBeenCalled();
	});

	it("est fail-closed sans ADMIN_PASSWORD : ERROR, aucun cookie", async () => {
		vi.stubEnv("ADMIN_PASSWORD", "");

		const result = await login(undefined, makeFormData(ADMIN_PASSWORD));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(cookieStore.set).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalledOnce();
	});

	it("est fail-closed sans AUTH_SECRET : ERROR même avec le bon mot de passe", async () => {
		vi.stubEnv("AUTH_SECRET", "");

		const result = await login(undefined, makeFormData(ADMIN_PASSWORD));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(cookieStore.set).not.toHaveBeenCalled();
	});
});
