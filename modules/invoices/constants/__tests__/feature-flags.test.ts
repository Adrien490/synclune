import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_XML = process.env.INVOICE_ENABLE_XML;
const ORIGINAL_EREPORTING = process.env.INVOICE_ENABLE_EREPORTING;

function restoreEnv() {
	if (ORIGINAL_XML === undefined) delete process.env.INVOICE_ENABLE_XML;
	else process.env.INVOICE_ENABLE_XML = ORIGINAL_XML;
	if (ORIGINAL_EREPORTING === undefined) delete process.env.INVOICE_ENABLE_EREPORTING;
	else process.env.INVOICE_ENABLE_EREPORTING = ORIGINAL_EREPORTING;
}

describe("INVOICE_FEATURE_FLAGS", () => {
	beforeEach(() => vi.resetModules());

	afterEach(() => {
		restoreEnv();
		vi.resetModules();
	});

	it("defaults to all false when env vars are unset", async () => {
		delete process.env.INVOICE_ENABLE_XML;
		delete process.env.INVOICE_ENABLE_EREPORTING;
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_xml).toBe(false);
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(false);
	});

	it("parses 'true' (case-insensitive) as enabled", async () => {
		process.env.INVOICE_ENABLE_XML = "TRUE";
		process.env.INVOICE_ENABLE_EREPORTING = "true";
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_xml).toBe(true);
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(true);
	});

	it("parses '1' and 'yes' as enabled", async () => {
		process.env.INVOICE_ENABLE_XML = "1";
		process.env.INVOICE_ENABLE_EREPORTING = "yes";
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_xml).toBe(true);
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(true);
	});

	it("treats arbitrary strings as disabled (fail-closed)", async () => {
		process.env.INVOICE_ENABLE_XML = "maybe";
		process.env.INVOICE_ENABLE_EREPORTING = "0";
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_xml).toBe(false);
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(false);
	});
});
