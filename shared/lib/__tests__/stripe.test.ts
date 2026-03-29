import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const mocks = vi.hoisted(() => {
	const mockExecute = vi.fn();

	// Stripe is always called with `new`, so we need a class-style mock
	const MockStripeClass = vi.fn(function (this: Record<string, unknown>) {
		this.__mock = true;
	});

	return {
		mockExecute,
		mockStripeConstructor: MockStripeClass,
		mockLoggerError: vi.fn(),
		mockLoggerInfo: vi.fn(),
		mockLoggerWarn: vi.fn(),
		mockLoggerDebug: vi.fn(),
		mockCircuitBreaker: {
			execute: mockExecute,
		},
	};
});

vi.mock("stripe", () => ({
	default: mocks.mockStripeConstructor,
}));

vi.mock("@/shared/lib/circuit-breaker", () => ({
	stripeCircuitBreaker: mocks.mockCircuitBreaker,
	CircuitBreakerError: class CircuitBreakerError extends Error {
		constructor(serviceName: string) {
			super(`Circuit breaker OPEN for ${serviceName} — service temporarily unavailable`);
			this.name = "CircuitBreakerError";
		}
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: mocks.mockLoggerInfo,
		warn: mocks.mockLoggerWarn,
		error: mocks.mockLoggerError,
		debug: mocks.mockLoggerDebug,
	},
}));

// Import after mocks are in place
import {
	getVendorLegalInfo,
	getInvoiceFooter,
	withStripeCircuitBreaker,
	CircuitBreakerError,
} from "../stripe";

// ============================================================================
// Tests: getVendorLegalInfo()
// ============================================================================

describe("getVendorLegalInfo", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("default values", () => {
		it("returns the default company_legal_name when env var is not set", () => {
			delete process.env.VENDOR_LEGAL_NAME;
			const info = getVendorLegalInfo();
			expect(info.company_legal_name).toBe("TADDEI LEANE - Entrepreneur Individuel");
		});

		it("returns the default company_trade_name when env var is not set", () => {
			delete process.env.VENDOR_TRADE_NAME;
			const info = getVendorLegalInfo();
			expect(info.company_trade_name).toBe("Synclune");
		});

		it("returns the default company_siret when env var is not set", () => {
			delete process.env.VENDOR_SIRET;
			const info = getVendorLegalInfo();
			expect(info.company_siret).toBe("839 183 027 00037");
		});

		it("returns the default company_siren when env var is not set", () => {
			delete process.env.VENDOR_SIREN;
			const info = getVendorLegalInfo();
			expect(info.company_siren).toBe("839 183 027");
		});

		it("returns the default company_vat when env var is not set", () => {
			delete process.env.VENDOR_VAT_NUMBER;
			const info = getVendorLegalInfo();
			expect(info.company_vat).toBe("FR35839183027");
		});

		it("returns the default company_ape when env var is not set", () => {
			delete process.env.VENDOR_APE_CODE;
			const info = getVendorLegalInfo();
			expect(info.company_ape).toBe("47.91B");
		});

		it("returns the default company_address when env var is not set", () => {
			delete process.env.VENDOR_FULL_ADDRESS;
			const info = getVendorLegalInfo();
			expect(info.company_address).toBe("77 Boulevard du Tertre, 44100 Nantes, France");
		});

		it("returns the default company_email when env var is not set", () => {
			delete process.env.VENDOR_EMAIL;
			const info = getVendorLegalInfo();
			expect(info.company_email).toBe("contact@synclune.fr");
		});

		it("returns the default insurance_company when env var is not set", () => {
			delete process.env.VENDOR_INSURANCE_COMPANY;
			const info = getVendorLegalInfo();
			expect(info.insurance_company).toBe("En cours de souscription");
		});

		it("returns the default insurance_contact when env var is not set", () => {
			delete process.env.VENDOR_INSURANCE_CONTACT;
			const info = getVendorLegalInfo();
			expect(info.insurance_contact).toBe("contact@synclune.fr");
		});

		it("returns the default insurance_coverage when env var is not set", () => {
			delete process.env.VENDOR_INSURANCE_COVERAGE;
			const info = getVendorLegalInfo();
			expect(info.insurance_coverage).toBe("France");
		});

		it("returns the default vat_exemption when env var is not set", () => {
			delete process.env.VENDOR_VAT_EXEMPTION_TEXT;
			const info = getVendorLegalInfo();
			expect(info.vat_exemption).toBe("TVA non applicable, art. 293 B du CGI");
		});

		it("returns the default late_payment_penalty_rate when env var is not set", () => {
			delete process.env.VENDOR_LATE_PAYMENT_PENALTY_RATE;
			const info = getVendorLegalInfo();
			expect(info.late_payment_penalty_rate).toBe("12,40%");
		});

		it("returns the default recovery_fee when env var is not set", () => {
			delete process.env.VENDOR_RECOVERY_FEE;
			const info = getVendorLegalInfo();
			expect(info.recovery_fee).toBe("40 €");
		});

		it("returns the default operation_nature when env var is not set", () => {
			delete process.env.VENDOR_OPERATION_NATURE;
			const info = getVendorLegalInfo();
			expect(info.operation_nature).toBe("Livraison de biens");
		});

		it("returns the default registry when env var is not set", () => {
			delete process.env.VENDOR_REGISTRY;
			const info = getVendorLegalInfo();
			expect(info.registry).toBe("Inscrite au Répertoire National des Entreprises (RNE)");
		});
	});

	describe("env overrides", () => {
		it("uses VENDOR_LEGAL_NAME when set", () => {
			process.env.VENDOR_LEGAL_NAME = "DUPONT MARIE - EI";
			const info = getVendorLegalInfo();
			expect(info.company_legal_name).toBe("DUPONT MARIE - EI");
		});

		it("uses VENDOR_TRADE_NAME when set", () => {
			process.env.VENDOR_TRADE_NAME = "MaBoutique";
			const info = getVendorLegalInfo();
			expect(info.company_trade_name).toBe("MaBoutique");
		});

		it("uses VENDOR_SIRET when set", () => {
			process.env.VENDOR_SIRET = "123 456 789 00012";
			const info = getVendorLegalInfo();
			expect(info.company_siret).toBe("123 456 789 00012");
		});

		it("uses VENDOR_SIREN when set", () => {
			process.env.VENDOR_SIREN = "123 456 789";
			const info = getVendorLegalInfo();
			expect(info.company_siren).toBe("123 456 789");
		});

		it("uses VENDOR_VAT_NUMBER when set", () => {
			process.env.VENDOR_VAT_NUMBER = "FR12345678901";
			const info = getVendorLegalInfo();
			expect(info.company_vat).toBe("FR12345678901");
		});

		it("uses VENDOR_APE_CODE when set", () => {
			process.env.VENDOR_APE_CODE = "62.01Z";
			const info = getVendorLegalInfo();
			expect(info.company_ape).toBe("62.01Z");
		});

		it("uses VENDOR_FULL_ADDRESS when set", () => {
			process.env.VENDOR_FULL_ADDRESS = "1 Rue de la Paix, 75001 Paris, France";
			const info = getVendorLegalInfo();
			expect(info.company_address).toBe("1 Rue de la Paix, 75001 Paris, France");
		});

		it("uses VENDOR_EMAIL when set", () => {
			process.env.VENDOR_EMAIL = "hello@example.com";
			const info = getVendorLegalInfo();
			expect(info.company_email).toBe("hello@example.com");
		});

		it("uses VENDOR_INSURANCE_COMPANY when set", () => {
			process.env.VENDOR_INSURANCE_COMPANY = "AXA France";
			const info = getVendorLegalInfo();
			expect(info.insurance_company).toBe("AXA France");
		});

		it("uses VENDOR_INSURANCE_CONTACT when set", () => {
			process.env.VENDOR_INSURANCE_CONTACT = "axa@example.com";
			const info = getVendorLegalInfo();
			expect(info.insurance_contact).toBe("axa@example.com");
		});

		it("uses VENDOR_INSURANCE_COVERAGE when set", () => {
			process.env.VENDOR_INSURANCE_COVERAGE = "France et Union Européenne";
			const info = getVendorLegalInfo();
			expect(info.insurance_coverage).toBe("France et Union Européenne");
		});

		it("uses VENDOR_VAT_EXEMPTION_TEXT when set", () => {
			process.env.VENDOR_VAT_EXEMPTION_TEXT = "TVA applicable";
			const info = getVendorLegalInfo();
			expect(info.vat_exemption).toBe("TVA applicable");
		});

		it("uses VENDOR_LATE_PAYMENT_PENALTY_RATE when set", () => {
			process.env.VENDOR_LATE_PAYMENT_PENALTY_RATE = "15%";
			const info = getVendorLegalInfo();
			expect(info.late_payment_penalty_rate).toBe("15%");
		});

		it("uses VENDOR_RECOVERY_FEE when set", () => {
			process.env.VENDOR_RECOVERY_FEE = "80 €";
			const info = getVendorLegalInfo();
			expect(info.recovery_fee).toBe("80 €");
		});

		it("uses VENDOR_OPERATION_NATURE when set", () => {
			process.env.VENDOR_OPERATION_NATURE = "Prestation de services";
			const info = getVendorLegalInfo();
			expect(info.operation_nature).toBe("Prestation de services");
		});

		it("uses VENDOR_REGISTRY when set", () => {
			process.env.VENDOR_REGISTRY = "Inscrite au RCS de Paris";
			const info = getVendorLegalInfo();
			expect(info.registry).toBe("Inscrite au RCS de Paris");
		});
	});
});

// ============================================================================
// Tests: getInvoiceFooter()
// ============================================================================

describe("getInvoiceFooter", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		// Clear all vendor env vars to use defaults
		const vendorKeys = [
			"VENDOR_LEGAL_NAME",
			"VENDOR_TRADE_NAME",
			"VENDOR_SIRET",
			"VENDOR_SIREN",
			"VENDOR_VAT_NUMBER",
			"VENDOR_APE_CODE",
			"VENDOR_FULL_ADDRESS",
			"VENDOR_EMAIL",
			"VENDOR_VAT_EXEMPTION_TEXT",
			"VENDOR_LATE_PAYMENT_PENALTY_RATE",
			"VENDOR_RECOVERY_FEE",
			"VENDOR_INSURANCE_COMPANY",
			"VENDOR_INSURANCE_CONTACT",
			"VENDOR_INSURANCE_COVERAGE",
			"VENDOR_REGISTRY",
			"VENDOR_OPERATION_NATURE",
		];
		for (const key of vendorKeys) {
			delete process.env[key];
		}
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("contains the company legal name", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("TADDEI LEANE - Entrepreneur Individuel");
	});

	it("contains the SIRET and SIREN on the same line", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("SIRET : 839 183 027 00037 • SIREN : 839 183 027");
	});

	it("contains the company address", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("77 Boulevard du Tertre, 44100 Nantes, France");
	});

	it("contains the VAT exemption text", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("TVA non applicable, art. 293 B du CGI");
	});

	it("contains the insurance coverage", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("Couverture géographique : France");
	});

	it("contains the operation nature", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("Nature de l'opération : Livraison de biens");
	});

	it("contains the late payment penalty rate", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("Pénalités de retard : 12,40% (taux minimum légal)");
	});

	it("contains the recovery fee", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("Indemnité forfaitaire de recouvrement : 40 €");
	});

	it("contains the registry mention", () => {
		const footer = getInvoiceFooter();
		expect(footer).toContain("Inscrite au Répertoire National des Entreprises (RNE)");
	});

	it("does not start or end with blank lines (is trimmed)", () => {
		const footer = getInvoiceFooter();
		expect(footer).toBe(footer.trim());
	});

	describe("insurance branch: pending subscription", () => {
		it("uses the single-line format when insurance_company is the default pending value", () => {
			// Default insurance_company is "En cours de souscription"
			const footer = getInvoiceFooter();
			expect(footer).toContain(
				"Assurance RC Pro : En cours de souscription - Pour toute question : contact@synclune.fr",
			);
		});

		it("does not include a separate Contact assureur line in the pending branch", () => {
			const footer = getInvoiceFooter();
			expect(footer).not.toContain("Contact assureur :");
		});
	});

	describe("insurance branch: active insurer", () => {
		beforeEach(() => {
			process.env.VENDOR_INSURANCE_COMPANY = "AXA France";
			process.env.VENDOR_INSURANCE_CONTACT = "sinistres@axa.fr";
		});

		it("uses the multi-line format when an actual insurer is provided", () => {
			const footer = getInvoiceFooter();
			expect(footer).toContain("Assurance RC Pro : AXA France");
			expect(footer).toContain("Contact assureur : sinistres@axa.fr");
		});

		it("does not include the single-line pending format", () => {
			const footer = getInvoiceFooter();
			expect(footer).not.toContain("Pour toute question :");
		});

		it("reflects the env-overridden insurance values in the footer", () => {
			process.env.VENDOR_INSURANCE_COVERAGE = "France et Belgique";
			const footer = getInvoiceFooter();
			expect(footer).toContain("Couverture géographique : France et Belgique");
		});
	});

	it("reflects all env overrides in the final output", () => {
		process.env.VENDOR_LEGAL_NAME = "MARTIN SOPHIE - EI";
		process.env.VENDOR_SIRET = "999 888 777 00011";
		process.env.VENDOR_SIREN = "999 888 777";
		process.env.VENDOR_FULL_ADDRESS = "10 Allée des Roses, 69000 Lyon, France";
		process.env.VENDOR_RECOVERY_FEE = "60 €";

		const footer = getInvoiceFooter();
		expect(footer).toContain("MARTIN SOPHIE - EI");
		expect(footer).toContain("SIRET : 999 888 777 00011 • SIREN : 999 888 777");
		expect(footer).toContain("10 Allée des Roses, 69000 Lyon, France");
		expect(footer).toContain("Indemnité forfaitaire de recouvrement : 60 €");
	});
});

// ============================================================================
// Tests: getStripeClient()
// ============================================================================

describe("getStripeClient", () => {
	const originalEnv = process.env;

	// The module-level _stripeClient cache is shared across tests; we need to
	// reset it between tests via the module registry.
	beforeEach(async () => {
		vi.resetModules();
		process.env = { ...originalEnv };
		mocks.mockStripeConstructor.mockClear();
		mocks.mockLoggerError.mockClear();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns null when STRIPE_SECRET_KEY is not set", async () => {
		delete process.env.STRIPE_SECRET_KEY;

		const { getStripeClient: freshGetStripeClient } = await import("../stripe");
		const client = freshGetStripeClient();

		expect(client).toBeNull();
	});

	it("logs an error when STRIPE_SECRET_KEY is not set", async () => {
		delete process.env.STRIPE_SECRET_KEY;

		const { getStripeClient: freshGetStripeClient } = await import("../stripe");
		freshGetStripeClient();

		expect(mocks.mockLoggerError).toHaveBeenCalledWith(
			"STRIPE_SECRET_KEY environment variable is not set",
			undefined,
			{ service: "stripe" },
		);
	});

	it("returns a Stripe instance when STRIPE_SECRET_KEY is set", async () => {
		process.env.STRIPE_SECRET_KEY = "sk_test_abc123";

		const { getStripeClient: freshGetStripeClient } = await import("../stripe");
		const client = freshGetStripeClient();

		expect(client).not.toBeNull();
		expect(client).toBeInstanceOf(mocks.mockStripeConstructor);
	});

	it("instantiates Stripe with the correct API version and retry config", async () => {
		process.env.STRIPE_SECRET_KEY = "sk_test_abc123";

		const { getStripeClient: freshGetStripeClient } = await import("../stripe");
		freshGetStripeClient();

		expect(mocks.mockStripeConstructor).toHaveBeenCalledWith("sk_test_abc123", {
			apiVersion: "2026-03-25.dahlia",
			maxNetworkRetries: 2,
		});
	});

	it("caches the Stripe instance and only instantiates Stripe once", async () => {
		process.env.STRIPE_SECRET_KEY = "sk_test_abc123";

		const { getStripeClient: freshGetStripeClient } = await import("../stripe");

		const first = freshGetStripeClient();
		const second = freshGetStripeClient();

		expect(first).toBe(second);
		// Called once at module load (top-level `stripe`) + once by getStripeClient
		expect(mocks.mockStripeConstructor).toHaveBeenCalledTimes(2);
	});

	it("does not log an error when the key is present", async () => {
		process.env.STRIPE_SECRET_KEY = "sk_test_abc123";

		const { getStripeClient: freshGetStripeClient } = await import("../stripe");
		freshGetStripeClient();

		expect(mocks.mockLoggerError).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: withStripeCircuitBreaker()
// ============================================================================

describe("withStripeCircuitBreaker", () => {
	beforeEach(() => {
		mocks.mockExecute.mockReset();
	});

	it("delegates execution to stripeCircuitBreaker.execute", async () => {
		const fn = vi.fn().mockResolvedValue("result");
		mocks.mockExecute.mockImplementation((f: () => Promise<unknown>) => f());

		await withStripeCircuitBreaker(fn);

		expect(mocks.mockExecute).toHaveBeenCalledWith(fn);
	});

	it("returns the value resolved by the circuit breaker", async () => {
		mocks.mockExecute.mockResolvedValue("stripe-data");

		const result = await withStripeCircuitBreaker(() => Promise.resolve("stripe-data"));

		expect(result).toBe("stripe-data");
	});

	it("propagates errors thrown by the circuit breaker", async () => {
		const error = new CircuitBreakerError("Stripe");
		mocks.mockExecute.mockRejectedValue(error);

		await expect(withStripeCircuitBreaker(() => Promise.resolve("ok"))).rejects.toThrow(
			CircuitBreakerError,
		);
	});

	it("propagates errors thrown by the underlying function", async () => {
		const underlyingError = new Error("Stripe API failed");
		mocks.mockExecute.mockRejectedValue(underlyingError);

		await expect(withStripeCircuitBreaker(() => Promise.reject(underlyingError))).rejects.toThrow(
			"Stripe API failed",
		);
	});

	it("calls execute exactly once per invocation", async () => {
		mocks.mockExecute.mockResolvedValue("ok");

		await withStripeCircuitBreaker(() => Promise.resolve("ok"));
		await withStripeCircuitBreaker(() => Promise.resolve("ok"));

		expect(mocks.mockExecute).toHaveBeenCalledTimes(2);
	});
});

// ============================================================================
// Tests: CircuitBreakerError re-export
// ============================================================================

describe("CircuitBreakerError re-export", () => {
	it("is exported from stripe module", () => {
		expect(CircuitBreakerError).toBeDefined();
	});

	it("creates an error with the correct name", () => {
		const error = new CircuitBreakerError("Stripe");
		expect(error.name).toBe("CircuitBreakerError");
	});

	it("creates an error that is an instance of Error", () => {
		const error = new CircuitBreakerError("Stripe");
		expect(error).toBeInstanceOf(Error);
	});

	it("includes the service name in the message", () => {
		const error = new CircuitBreakerError("Stripe");
		expect(error.message).toContain("Stripe");
	});
});
