import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression checkout-stripe-lazy-2026-05-28
 *
 * Garantit que `CheckoutStripeSection` (qui embarque `@stripe/react-stripe-js`
 * ≈ 100 KB gzip) est chargé via `next/dynamic` depuis `checkout-form-body.tsx`,
 * et non en import statique. Un import statique réintègre Stripe au First
 * Load JS de `/paiement` et fait éclater le budget size-limit `Checkout`
 * (130 KB).
 *
 * Cf. plan d'audit PERF-AUDIT-003 (2026-05-28).
 */

const REPO_ROOT = process.cwd();
const FORM_BODY_PATH = join(REPO_ROOT, "modules/payments/components/checkout-form-body.tsx");

describe("Checkout — Stripe bundle lazy-loaded", () => {
	const source = readFileSync(FORM_BODY_PATH, "utf-8");

	it("checkout-form-body.tsx importe next/dynamic", () => {
		expect(source).toMatch(/import\s+dynamic\s+from\s+["']next\/dynamic["']/);
	});

	it("CheckoutStripeSection est wrappé dans dynamic() avec ssr: false", () => {
		// Match : dynamic(() => import("./checkout-stripe-section")..., { ssr: false, ... })
		const dynamicCall =
			/const\s+CheckoutStripeSection\s*=\s*dynamic\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*["']\.\/checkout-stripe-section["']\s*\)/;
		expect(source).toMatch(dynamicCall);
		expect(source).toMatch(/ssr:\s*false/);
	});

	it("aucun import statique de CheckoutStripeSection ne subsiste", () => {
		// Strip block + line comments avant la recherche pour éviter les faux
		// positifs documentaires (le bloc dynamic() ci-dessus contient le nom).
		const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
		const staticImport =
			/import\s*\{[^}]*\bCheckoutStripeSection\b[^}]*\}\s*from\s*["']\.\/checkout-stripe-section["']/;
		expect(stripped).not.toMatch(staticImport);
	});

	it("PaymentSectionSkeleton est utilisé comme fallback dynamic", () => {
		expect(source).toMatch(/loading:\s*\(\s*\)\s*=>\s*<PaymentSectionSkeleton\s*\/>/);
	});
});
