import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_EREPORTING = process.env.INVOICE_ENABLE_EREPORTING;

function restoreEnv() {
	if (ORIGINAL_EREPORTING === undefined) delete process.env.INVOICE_ENABLE_EREPORTING;
	else process.env.INVOICE_ENABLE_EREPORTING = ORIGINAL_EREPORTING;
}

describe("INVOICE_FEATURE_FLAGS", () => {
	beforeEach(() => vi.resetModules());

	afterEach(() => {
		restoreEnv();
		vi.resetModules();
	});

	it("defaults to false when env var is unset", async () => {
		delete process.env.INVOICE_ENABLE_EREPORTING;
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(false);
	});

	it("parses 'true' (case-insensitive) as enabled", async () => {
		process.env.INVOICE_ENABLE_EREPORTING = "TRUE";
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(true);
	});

	it("parses '1' and 'yes' as enabled", async () => {
		process.env.INVOICE_ENABLE_EREPORTING = "yes";
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(true);
	});

	it("treats arbitrary strings as disabled (fail-closed)", async () => {
		process.env.INVOICE_ENABLE_EREPORTING = "maybe";
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(false);
	});
});
