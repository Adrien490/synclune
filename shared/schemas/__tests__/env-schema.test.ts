import { describe, it, expect } from "vitest";
import { envSchema } from "../env.schema";

// ============================================================================
// HELPERS
// ============================================================================

/** Returns a complete valid environment object that satisfies every required field */
function validEnv(): Record<string, string> {
	return {
		DATABASE_URL: "postgresql://user:password@localhost:5432/synclune",
		BETTER_AUTH_SECRET: "a".repeat(32),
		BETTER_AUTH_URL: "https://synclune.fr",
		RESEND_API_KEY: "re_test_abcdefghijklmnop",
		RESEND_CONTACT_EMAIL: "contact@synclune.fr",
		STRIPE_SECRET_KEY: "sk_test_abcdefghijklmnop",
		STRIPE_WEBHOOK_SECRET: "whsec_abcdefghijklmnopqrstuvwxyz",
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abcdefghijklmnop",
		UPLOADTHING_TOKEN: "test-uploadthing-token",
		CRON_SECRET: "b".repeat(32),
		NODE_ENV: "development",
	};
}

// ============================================================================
// Valid env
// ============================================================================

describe("envSchema", () => {
	it("accepts a fully valid env object", () => {
		const result = envSchema.safeParse(validEnv());
		expect(result.success).toBe(true);
	});

	it("defaults NODE_ENV to development when not provided", () => {
		const env = validEnv();
		delete env.NODE_ENV;

		const result = envSchema.safeParse(env);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.NODE_ENV).toBe("development");
		}
	});

	// --------------------------------------------------------------------------
	// DATABASE_URL
	// --------------------------------------------------------------------------

	describe("DATABASE_URL", () => {
		it("rejects a non-URL string", () => {
			const result = envSchema.safeParse({ ...validEnv(), DATABASE_URL: "not-a-url" });
			expect(result.success).toBe(false);
		});

		it("rejects an empty string", () => {
			const result = envSchema.safeParse({ ...validEnv(), DATABASE_URL: "" });
			expect(result.success).toBe(false);
		});

		it("accepts a valid postgresql URL", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				DATABASE_URL: "postgresql://user:pass@host:5432/db",
			});
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// BETTER_AUTH_SECRET
	// --------------------------------------------------------------------------

	describe("BETTER_AUTH_SECRET", () => {
		it("rejects a secret shorter than 32 characters", () => {
			const result = envSchema.safeParse({ ...validEnv(), BETTER_AUTH_SECRET: "a".repeat(31) });
			expect(result.success).toBe(false);
		});

		it("accepts exactly 32 characters", () => {
			const result = envSchema.safeParse({ ...validEnv(), BETTER_AUTH_SECRET: "a".repeat(32) });
			expect(result.success).toBe(true);
		});

		it("accepts more than 32 characters", () => {
			const result = envSchema.safeParse({ ...validEnv(), BETTER_AUTH_SECRET: "a".repeat(64) });
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// RESEND_API_KEY
	// --------------------------------------------------------------------------

	describe("RESEND_API_KEY", () => {
		it("rejects a key not starting with re_", () => {
			const result = envSchema.safeParse({ ...validEnv(), RESEND_API_KEY: "sk_test_wrong" });
			expect(result.success).toBe(false);
		});

		it("rejects an empty string", () => {
			const result = envSchema.safeParse({ ...validEnv(), RESEND_API_KEY: "" });
			expect(result.success).toBe(false);
		});

		it("accepts a key starting with re_", () => {
			const result = envSchema.safeParse({ ...validEnv(), RESEND_API_KEY: "re_live_abc123" });
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// STRIPE_SECRET_KEY
	// --------------------------------------------------------------------------

	describe("STRIPE_SECRET_KEY", () => {
		it("rejects a key not starting with sk_", () => {
			const result = envSchema.safeParse({ ...validEnv(), STRIPE_SECRET_KEY: "pk_test_wrong" });
			expect(result.success).toBe(false);
		});

		it("accepts sk_test_ key", () => {
			const result = envSchema.safeParse({ ...validEnv(), STRIPE_SECRET_KEY: "sk_test_abc123" });
			expect(result.success).toBe(true);
		});

		it("accepts sk_live_ key", () => {
			const result = envSchema.safeParse({ ...validEnv(), STRIPE_SECRET_KEY: "sk_live_abc123" });
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// STRIPE_WEBHOOK_SECRET
	// --------------------------------------------------------------------------

	describe("STRIPE_WEBHOOK_SECRET", () => {
		it("rejects a secret not starting with whsec_", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				STRIPE_WEBHOOK_SECRET: "sk_test_wrong",
			});
			expect(result.success).toBe(false);
		});

		it("accepts a secret starting with whsec_", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				STRIPE_WEBHOOK_SECRET: "whsec_abc123def456",
			});
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
	// --------------------------------------------------------------------------

	describe("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", () => {
		it("rejects a key not starting with pk_", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "sk_test_wrong",
			});
			expect(result.success).toBe(false);
		});

		it("accepts pk_test_ key", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
			});
			expect(result.success).toBe(true);
		});

		it("accepts pk_live_ key", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc123",
			});
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// DEPLOY_DATE
	// --------------------------------------------------------------------------

	describe("DEPLOY_DATE", () => {
		it("is optional — omitted DEPLOY_DATE is accepted", () => {
			const env = validEnv();
			delete env.DEPLOY_DATE;

			const result = envSchema.safeParse(env);
			expect(result.success).toBe(true);
		});

		it("accepts a valid YYYY-MM-DD date", () => {
			const result = envSchema.safeParse({ ...validEnv(), DEPLOY_DATE: "2026-03-29" });
			expect(result.success).toBe(true);
		});

		it("rejects a date in DD/MM/YYYY format", () => {
			const result = envSchema.safeParse({ ...validEnv(), DEPLOY_DATE: "29/03/2026" });
			expect(result.success).toBe(false);
		});

		it("rejects a date in YYYY/MM/DD format", () => {
			const result = envSchema.safeParse({ ...validEnv(), DEPLOY_DATE: "2026/03/29" });
			expect(result.success).toBe(false);
		});

		it("rejects a plain text string", () => {
			const result = envSchema.safeParse({ ...validEnv(), DEPLOY_DATE: "march-2026" });
			expect(result.success).toBe(false);
		});

		it("rejects a partial date (YYYY-MM)", () => {
			const result = envSchema.safeParse({ ...validEnv(), DEPLOY_DATE: "2026-03" });
			expect(result.success).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Optional fields
	// --------------------------------------------------------------------------

	describe("optional fields", () => {
		it("accepts env without GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET", () => {
			const env = validEnv();
			delete env.GOOGLE_CLIENT_ID;
			delete env.GOOGLE_CLIENT_SECRET;

			const result = envSchema.safeParse(env);
			expect(result.success).toBe(true);
		});

		it("accepts env without NEXT_PUBLIC_SITE_URL", () => {
			const env = validEnv();
			delete env.NEXT_PUBLIC_SITE_URL;

			const result = envSchema.safeParse(env);
			expect(result.success).toBe(true);
		});

		it("accepts env without GEOAPIFY_API_KEY", () => {
			const env = validEnv();
			delete env.GEOAPIFY_API_KEY;

			const result = envSchema.safeParse(env);
			expect(result.success).toBe(true);
		});

		it("accepts env without NEXT_PUBLIC_SENTRY_DSN", () => {
			const env = validEnv();
			delete env.NEXT_PUBLIC_SENTRY_DSN;

			const result = envSchema.safeParse(env);
			expect(result.success).toBe(true);
		});

		it("validates NEXT_PUBLIC_SITE_URL must be a valid URL when provided", () => {
			const result = envSchema.safeParse({ ...validEnv(), NEXT_PUBLIC_SITE_URL: "not-a-url" });
			expect(result.success).toBe(false);
		});

		it("validates NEXT_PUBLIC_SENTRY_DSN must be a valid URL when provided", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				NEXT_PUBLIC_SENTRY_DSN: "not-a-url",
			});
			expect(result.success).toBe(false);
		});
	});
});
