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

	// --------------------------------------------------------------------------
	// VENDOR_* — facturation électronique vendeur (Synclune)
	// --------------------------------------------------------------------------
	describe("VENDOR_SIREN", () => {
		it("accepts 9 digits without spaces", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIREN: "839183027" });
			expect(result.success).toBe(true);
		});

		it("accepts 9 digits with spaces (format INSEE)", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIREN: "839 183 027" });
			expect(result.success).toBe(true);
		});

		it("rejects fewer than 9 digits", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIREN: "83918302" });
			expect(result.success).toBe(false);
		});

		it("rejects letters", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIREN: "839ABC027" });
			expect(result.success).toBe(false);
		});

		it("rejects 14 digits (SIRET instead of SIREN)", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIREN: "83918302700037" });
			expect(result.success).toBe(false);
		});

		it("accepts env without VENDOR_SIREN (default in getVendorLegalInfo kicks in)", () => {
			const result = envSchema.safeParse(validEnv());
			expect(result.success).toBe(true);
		});
	});

	describe("VENDOR_SIRET", () => {
		it("accepts 14 digits without spaces", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIRET: "83918302700037" });
			expect(result.success).toBe(true);
		});

		it("accepts 14 digits with spaces (format INSEE)", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIRET: "839 183 027 00037" });
			expect(result.success).toBe(true);
		});

		it("rejects 9 digits (SIREN instead of SIRET)", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIRET: "839183027" });
			expect(result.success).toBe(false);
		});

		it("rejects letters mixed in", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_SIRET: "8391830270003A" });
			expect(result.success).toBe(false);
		});
	});

	describe("VENDOR_VAT_NUMBER", () => {
		it("accepts standard French VAT FR + 2 digits + 9 digits", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_VAT_NUMBER: "FR35839183027" });
			expect(result.success).toBe(true);
		});

		it("accepts FR + 2 letters key (allowed by EU spec)", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_VAT_NUMBER: "FR3A839183027" });
			expect(result.success).toBe(true);
		});

		it("rejects missing country prefix", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_VAT_NUMBER: "35839183027" });
			expect(result.success).toBe(false);
		});

		it("rejects non-FR country prefix", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_VAT_NUMBER: "DE35839183027" });
			expect(result.success).toBe(false);
		});

		it("rejects lowercase fr (case sensitive)", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_VAT_NUMBER: "fr35839183027" });
			expect(result.success).toBe(false);
		});
	});

	describe("VENDOR_APE_CODE", () => {
		it("accepts NN.NNL format", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_APE_CODE: "47.91B" });
			expect(result.success).toBe(true);
		});

		it("rejects missing dot", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_APE_CODE: "4791B" });
			expect(result.success).toBe(false);
		});

		it("rejects lowercase letter", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_APE_CODE: "47.91b" });
			expect(result.success).toBe(false);
		});

		it("rejects missing trailing letter", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_APE_CODE: "47.91" });
			expect(result.success).toBe(false);
		});
	});

	describe("VENDOR_EMAIL", () => {
		it("accepts a valid email", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_EMAIL: "contact@synclune.fr" });
			expect(result.success).toBe(true);
		});

		it("rejects an invalid email", () => {
			const result = envSchema.safeParse({ ...validEnv(), VENDOR_EMAIL: "not-an-email" });
			expect(result.success).toBe(false);
		});
	});

	describe("VENDOR_INSURANCE_CONTACT", () => {
		it("accepts a valid email", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				VENDOR_INSURANCE_CONTACT: "ins@synclune.fr",
			});
			expect(result.success).toBe(true);
		});

		it("rejects an invalid email", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				VENDOR_INSURANCE_CONTACT: "not-an-email",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("Synclune production defaults are schema-valid", () => {
		// Garantit que les défauts hard-codés dans `getVendorLegalInfo` (shared/lib/
		// stripe.ts) restent compatibles si on bascule vers `env.VENDOR_*`.
		it("accepts the current production values", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				VENDOR_LEGAL_NAME: "TADDEI LEANE - Entrepreneur Individuel",
				VENDOR_TRADE_NAME: "Synclune",
				VENDOR_SIRET: "839 183 027 00037",
				VENDOR_SIREN: "839 183 027",
				VENDOR_VAT_NUMBER: "FR35839183027",
				VENDOR_APE_CODE: "47.91B",
				VENDOR_FULL_ADDRESS: "77 Boulevard du Tertre, 44100 Nantes, France",
				VENDOR_EMAIL: "contact@synclune.fr",
				VENDOR_INSURANCE_CONTACT: "contact@synclune.fr",
			});
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// INVOICE_PROVIDER + transmission flags (Phase 5 — réforme 2026-2027)
	// --------------------------------------------------------------------------

	describe("INVOICE_PROVIDER", () => {
		it("defaults to 'local' when not provided", () => {
			const result = envSchema.safeParse(validEnv());
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.INVOICE_PROVIDER).toBe("local");
			}
		});

		it("accepts each supported provider id", () => {
			for (const provider of ["local", "mock", "chorus-pro", "pdp-xxx"]) {
				const result = envSchema.safeParse({ ...validEnv(), INVOICE_PROVIDER: provider });
				expect(result.success).toBe(true);
			}
		});

		it("rejects an unknown provider id at boot (fail-fast)", () => {
			const result = envSchema.safeParse({ ...validEnv(), INVOICE_PROVIDER: "garbage" });
			expect(result.success).toBe(false);
		});

		it("rejects a typo on a known provider id", () => {
			// Typo case mentionné dans EINV-PROVIDER-007.
			const result = envSchema.safeParse({ ...validEnv(), INVOICE_PROVIDER: "pdp-XYZ" });
			expect(result.success).toBe(false);
		});
	});

	describe("INVOICE_TRANSMISSION_CANARY_PERCENT", () => {
		it("accepts 0 (disabled)", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				INVOICE_TRANSMISSION_CANARY_PERCENT: "0",
			});
			expect(result.success).toBe(true);
		});

		it("accepts 100 (full rollout)", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				INVOICE_TRANSMISSION_CANARY_PERCENT: "100",
			});
			expect(result.success).toBe(true);
		});

		it("rejects values > 100", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				INVOICE_TRANSMISSION_CANARY_PERCENT: "101",
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric values", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				INVOICE_TRANSMISSION_CANARY_PERCENT: "fifty",
			});
			expect(result.success).toBe(false);
		});

		it("rejects negative values (regex anchors)", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				INVOICE_TRANSMISSION_CANARY_PERCENT: "-5",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("INVOICE_TRANSMISSION_MIN_AMOUNT", () => {
		it("accepts a positive integer (centimes)", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				INVOICE_TRANSMISSION_MIN_AMOUNT: "5000",
			});
			expect(result.success).toBe(true);
		});

		it("rejects non-integer values", () => {
			const result = envSchema.safeParse({
				...validEnv(),
				INVOICE_TRANSMISSION_MIN_AMOUNT: "50.00",
			});
			expect(result.success).toBe(false);
		});
	});
});
