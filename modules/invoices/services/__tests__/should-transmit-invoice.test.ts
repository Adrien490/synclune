import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shouldTransmitInvoice } from "../should-transmit-invoice";

const ENV_KEYS = [
	"INVOICE_ENABLE_PROVIDER_TRANSMISSION",
	"INVOICE_TRANSMISSION_CANARY_PERCENT",
	"INVOICE_TRANSMISSION_MIN_AMOUNT",
] as const;

const originals: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
	for (const k of ENV_KEYS) {
		originals[k] = process.env[k];
		delete process.env[k];
	}
});

afterEach(() => {
	for (const k of ENV_KEYS) {
		const v = originals[k];
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
});

describe("shouldTransmitInvoice — kill-switch", () => {
	it("returns false when INVOICE_ENABLE_PROVIDER_TRANSMISSION is unset", () => {
		expect(shouldTransmitInvoice({ orderId: "ord_abc", orderTotal: 10000 })).toBe(false);
	});

	it("returns false when kill-switch is 'false'", () => {
		process.env.INVOICE_ENABLE_PROVIDER_TRANSMISSION = "false";
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "100";
		expect(shouldTransmitInvoice({ orderId: "ord_abc", orderTotal: 10000 })).toBe(false);
	});

	it("returns false when canary is 0 even if global is ON", () => {
		process.env.INVOICE_ENABLE_PROVIDER_TRANSMISSION = "true";
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "0";
		expect(shouldTransmitInvoice({ orderId: "ord_abc", orderTotal: 10000 })).toBe(false);
	});
});

describe("shouldTransmitInvoice — canary determinism", () => {
	beforeEach(() => {
		process.env.INVOICE_ENABLE_PROVIDER_TRANSMISSION = "true";
	});

	it("returns true for any order when canary is 100", () => {
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "100";
		for (const id of ["a", "b", "c", "ord_xyz123"]) {
			expect(shouldTransmitInvoice({ orderId: id, orderTotal: 10000 })).toBe(true);
		}
	});

	it("same orderId yields same decision across calls (deterministic)", () => {
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "30";
		const first = shouldTransmitInvoice({ orderId: "ord_stable", orderTotal: 10000 });
		const second = shouldTransmitInvoice({ orderId: "ord_stable", orderTotal: 10000 });
		const third = shouldTransmitInvoice({ orderId: "ord_stable", orderTotal: 10000 });
		expect(first).toBe(second);
		expect(second).toBe(third);
	});

	it("distributes ~uniformly over 10000 ids when canary=50", () => {
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "50";
		let inCanary = 0;
		for (let i = 0; i < 10_000; i++) {
			if (shouldTransmitInvoice({ orderId: `ord_${i}`, orderTotal: 10000 })) inCanary++;
		}
		// Bin théorique : 5000 ± marge (3-sigma) ≈ ±150. Tolérance large pour
		// éviter flake. Si on observe < 4500 ou > 5500, le hash est cassé.
		expect(inCanary).toBeGreaterThan(4500);
		expect(inCanary).toBeLessThan(5500);
	});
});

describe("shouldTransmitInvoice — minimum amount", () => {
	beforeEach(() => {
		process.env.INVOICE_ENABLE_PROVIDER_TRANSMISSION = "true";
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "100";
	});

	it("blocks orders below INVOICE_TRANSMISSION_MIN_AMOUNT", () => {
		process.env.INVOICE_TRANSMISSION_MIN_AMOUNT = "5000";
		expect(shouldTransmitInvoice({ orderId: "ord_low", orderTotal: 4999 })).toBe(false);
		expect(shouldTransmitInvoice({ orderId: "ord_high", orderTotal: 5000 })).toBe(true);
	});

	it("ignores MIN_AMOUNT when unset", () => {
		expect(shouldTransmitInvoice({ orderId: "ord_any", orderTotal: 1 })).toBe(true);
	});
});

describe("shouldTransmitInvoice — env edge cases", () => {
	it("clamps canary > 100 to 100 (treats invalid env as full canary)", () => {
		process.env.INVOICE_ENABLE_PROVIDER_TRANSMISSION = "true";
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "999";
		expect(shouldTransmitInvoice({ orderId: "ord_abc", orderTotal: 10000 })).toBe(true);
	});

	it("treats non-numeric canary as 0 (fail-closed)", () => {
		process.env.INVOICE_ENABLE_PROVIDER_TRANSMISSION = "true";
		process.env.INVOICE_TRANSMISSION_CANARY_PERCENT = "garbage";
		expect(shouldTransmitInvoice({ orderId: "ord_abc", orderTotal: 10000 })).toBe(false);
	});
});
