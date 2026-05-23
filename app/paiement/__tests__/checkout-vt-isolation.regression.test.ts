/**
 * @regression checkout-vt-isolation
 *
 * Garantit que `viewTransitionName: "checkout-pay-cta"` n'est plus appliqué à la
 * Card complète sur les pages confirmation/annulation. Incident pré-audit : le
 * shared name produisait un morph button (48px) → card (~600px) disgracieux à
 * chaque navigation post-paiement.
 *
 * Le name reste exclusivement sur le PayButton (`modules/payments/components/pay-button.tsx`).
 *
 * Si ce test casse : ne PAS remettre le name sur la Card. Le fade par défaut Next.js
 * est volontairement préféré au morph cross-page.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const confirmationPage = readFileSync(join(__dirname, "..", "confirmation", "page.tsx"), "utf8");
const cancelPage = readFileSync(join(__dirname, "..", "annulation", "page.tsx"), "utf8");
const payButton = readFileSync(
	join(__dirname, "..", "..", "..", "modules", "payments", "components", "pay-button.tsx"),
	"utf8",
);

describe("checkout view-transition isolation (regression)", () => {
	it("confirmation/page.tsx n'expose plus le VT shared", () => {
		expect(confirmationPage).not.toMatch(/viewTransitionName:\s*"checkout-pay-cta"/);
	});

	it("annulation/page.tsx n'expose plus le VT shared", () => {
		expect(cancelPage).not.toMatch(/viewTransitionName:\s*"checkout-pay-cta"/);
	});

	it("pay-button.tsx conserve l'unique VT shared", () => {
		expect(payButton).toMatch(/viewTransitionName:\s*"checkout-pay-cta"/);
	});
});
