import { describe, expect, it } from "vitest";

import {
	GET_ORDER_SELECT,
	GET_ORDER_SELECT_ADMIN,
	GET_ORDER_SELECT_CUSTOMER,
} from "../order.constants";

/**
 * @regression ORD-COMPLY-001 + ORD-COMPLY-004 (audit conformité 2026-05-27)
 *
 * Verrouille la minimisation RGPD du sélecteur customer :
 * - Pas d'IDs Stripe sensibles (cross-order fingerprint).
 * - Pas de history.metadata (peut contenir des PII anciennes).
 * - Pas de history.authorName (fuite identité admin interne).
 */
describe("GET_ORDER_SELECT_CUSTOMER", () => {
	it("does not expose stripePaymentIntentId / stripeCustomerId / stripeInvoiceId", () => {
		expect(GET_ORDER_SELECT_CUSTOMER).not.toHaveProperty("stripePaymentIntentId");
		expect(GET_ORDER_SELECT_CUSTOMER).not.toHaveProperty("stripeCustomerId");
		expect(GET_ORDER_SELECT_CUSTOMER).not.toHaveProperty("stripeInvoiceId");
	});

	it("keeps stripeCheckoutSessionId (needed for receipt URL)", () => {
		expect(GET_ORDER_SELECT_CUSTOMER.stripeCheckoutSessionId).toBe(true);
	});

	it("does not expose history.metadata or history.authorName", () => {
		const historySelect = GET_ORDER_SELECT_CUSTOMER.history.select;
		expect(historySelect).not.toHaveProperty("metadata");
		expect(historySelect).not.toHaveProperty("authorName");
	});

	it("keeps history.note + history.source + status transitions for legitimate display", () => {
		const historySelect = GET_ORDER_SELECT_CUSTOMER.history.select;
		expect(historySelect.note).toBe(true);
		expect(historySelect.source).toBe(true);
		expect(historySelect.action).toBe(true);
		expect(historySelect.newStatus).toBe(true);
	});
});

describe("GET_ORDER_SELECT (alias)", () => {
	it("points to GET_ORDER_SELECT_ADMIN (rétro-compat)", () => {
		expect(GET_ORDER_SELECT).toBe(GET_ORDER_SELECT_ADMIN);
	});
});

describe("GET_ORDER_SELECT_ADMIN", () => {
	it("exposes all Stripe IDs (admin scope)", () => {
		expect(GET_ORDER_SELECT_ADMIN.stripeCheckoutSessionId).toBe(true);
		expect(GET_ORDER_SELECT_ADMIN.stripePaymentIntentId).toBe(true);
		expect(GET_ORDER_SELECT_ADMIN.stripeCustomerId).toBe(true);
		expect(GET_ORDER_SELECT_ADMIN.stripeInvoiceId).toBe(true);
	});

	it("exposes history.metadata + history.authorName (admin scope)", () => {
		const historySelect = GET_ORDER_SELECT_ADMIN.history.select;
		expect(historySelect.metadata).toBe(true);
		expect(historySelect.authorName).toBe(true);
	});
});
