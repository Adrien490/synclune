import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockLoggerWarn } = vi.hoisted(() => ({
	mockLoggerWarn: vi.fn(),
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		warn: mockLoggerWarn,
		info: vi.fn(),
		error: vi.fn(),
	},
}));

import {
	AUTH_PASSWORD_CONFIG,
	AUTH_SESSION_CONFIG,
	AUTH_RATE_LIMIT_RULES,
	validateAuthEnvironment,
} from "../auth-env";

// ============================================================================
// AUTH_PASSWORD_CONFIG
// ============================================================================

describe("AUTH_PASSWORD_CONFIG", () => {
	it("has resetTokenExpiresIn of 3600 (1 hour)", () => {
		expect(AUTH_PASSWORD_CONFIG.resetTokenExpiresIn).toBe(3600);
	});

	it("has minLength of 8", () => {
		expect(AUTH_PASSWORD_CONFIG.minLength).toBe(8);
	});

	it("has maxLength of 128", () => {
		expect(AUTH_PASSWORD_CONFIG.maxLength).toBe(128);
	});
});

// ============================================================================
// AUTH_SESSION_CONFIG
// ============================================================================

describe("AUTH_SESSION_CONFIG", () => {
	it("has expiresIn of 7 days in seconds", () => {
		expect(AUTH_SESSION_CONFIG.expiresIn).toBe(60 * 60 * 24 * 7);
	});

	it("has updateAge of 1 day in seconds", () => {
		expect(AUTH_SESSION_CONFIG.updateAge).toBe(60 * 60 * 24);
	});

	it("has cookieCache enabled", () => {
		expect(AUTH_SESSION_CONFIG.cookieCache.enabled).toBe(true);
	});

	it("has cookieCache maxAge of 5 minutes", () => {
		expect(AUTH_SESSION_CONFIG.cookieCache.maxAge).toBe(60 * 5);
	});
});

// ============================================================================
// AUTH_RATE_LIMIT_RULES
// ============================================================================

describe("AUTH_RATE_LIMIT_RULES", () => {
	it("sign-in/email allows 5 requests per 60s window", () => {
		expect(AUTH_RATE_LIMIT_RULES["/sign-in/email"]).toEqual({ window: 60, max: 5 });
	});

	it("sign-up/email allows 3 requests per 60s window", () => {
		expect(AUTH_RATE_LIMIT_RULES["/sign-up/email"]).toEqual({ window: 60, max: 3 });
	});

	it("forget-password allows 3 requests per 60s window", () => {
		expect(AUTH_RATE_LIMIT_RULES["/forget-password"]).toEqual({ window: 60, max: 3 });
	});

	it("reset-password allows 5 requests per 60s window", () => {
		expect(AUTH_RATE_LIMIT_RULES["/reset-password"]).toEqual({ window: 60, max: 5 });
	});

	it("verify-email allows 5 requests per 60s window", () => {
		expect(AUTH_RATE_LIMIT_RULES["/verify-email"]).toEqual({ window: 60, max: 5 });
	});
});

// ============================================================================
// validateAuthEnvironment
// ============================================================================

describe("validateAuthEnvironment", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("when all required env vars are present", () => {
		it("does not throw", () => {
			process.env.BETTER_AUTH_SECRET = "secret-value";
			process.env.BETTER_AUTH_URL = "https://example.com";

			expect(() => validateAuthEnvironment()).not.toThrow();
		});

		it("does not call logger.warn", () => {
			process.env.BETTER_AUTH_SECRET = "secret-value";
			process.env.BETTER_AUTH_URL = "https://example.com";

			validateAuthEnvironment();

			expect(mockLoggerWarn).not.toHaveBeenCalled();
		});
	});

	describe("in production environment", () => {
		beforeEach(() => {
			// @ts-expect-error -- overriding NODE_ENV for test purposes
			process.env.NODE_ENV = "production";
		});

		it("throws when BETTER_AUTH_SECRET is missing", () => {
			delete process.env.BETTER_AUTH_SECRET;
			process.env.BETTER_AUTH_URL = "https://example.com";

			expect(() => validateAuthEnvironment()).toThrow(
				"Variables d'environnement manquantes pour l'authentification: BETTER_AUTH_SECRET",
			);
		});

		it("throws when BETTER_AUTH_URL is missing", () => {
			process.env.BETTER_AUTH_SECRET = "secret-value";
			delete process.env.BETTER_AUTH_URL;

			expect(() => validateAuthEnvironment()).toThrow(
				"Variables d'environnement manquantes pour l'authentification: BETTER_AUTH_URL",
			);
		});

		it("throws listing all missing vars when both are missing", () => {
			delete process.env.BETTER_AUTH_SECRET;
			delete process.env.BETTER_AUTH_URL;

			expect(() => validateAuthEnvironment()).toThrow("BETTER_AUTH_SECRET, BETTER_AUTH_URL");
		});

		it("does not call logger.warn in production", () => {
			delete process.env.BETTER_AUTH_SECRET;
			process.env.BETTER_AUTH_URL = "https://example.com";

			try {
				validateAuthEnvironment();
			} catch {
				// expected
			}

			expect(mockLoggerWarn).not.toHaveBeenCalled();
		});
	});

	describe("in development environment", () => {
		beforeEach(() => {
			// @ts-expect-error -- overriding NODE_ENV for test purposes
			process.env.NODE_ENV = "development";
		});

		it("does not throw when BETTER_AUTH_SECRET is missing", () => {
			delete process.env.BETTER_AUTH_SECRET;
			process.env.BETTER_AUTH_URL = "https://example.com";

			expect(() => validateAuthEnvironment()).not.toThrow();
		});

		it("calls logger.warn with missing var name", () => {
			delete process.env.BETTER_AUTH_SECRET;
			process.env.BETTER_AUTH_URL = "https://example.com";

			validateAuthEnvironment();

			expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining("BETTER_AUTH_SECRET"), {
				service: "auth-env",
			});
		});

		it("calls logger.warn listing all missing vars when both are absent", () => {
			delete process.env.BETTER_AUTH_SECRET;
			delete process.env.BETTER_AUTH_URL;

			validateAuthEnvironment();

			expect(mockLoggerWarn).toHaveBeenCalledWith(
				expect.stringContaining("BETTER_AUTH_SECRET, BETTER_AUTH_URL"),
				{ service: "auth-env" },
			);
		});
	});

	describe("in test environment", () => {
		beforeEach(() => {
			// @ts-expect-error -- overriding NODE_ENV for test purposes
			process.env.NODE_ENV = "test";
		});

		it("does not throw when vars are missing", () => {
			delete process.env.BETTER_AUTH_SECRET;
			delete process.env.BETTER_AUTH_URL;

			expect(() => validateAuthEnvironment()).not.toThrow();
		});

		it("calls logger.warn when vars are missing", () => {
			delete process.env.BETTER_AUTH_SECRET;
			delete process.env.BETTER_AUTH_URL;

			validateAuthEnvironment();

			expect(mockLoggerWarn).toHaveBeenCalledOnce();
		});
	});
});
