/**
 * @regression checkout-layout-focus-ring
 *
 * Garantit que le `/paiement/layout` utilise :
 * - L'utility `focus-ring` SSOT (globals.css:17) sur le skip-link, pas un
 *   stack `focus-visible:ring-2 focus-visible:ring-offset-2` brut (drift SSOT).
 * - Le décor de fond fixed est hoisté dans le layout (pas dupliqué dans
 *   confirmation/annulation).
 *
 * Si ce test casse : importer `focus-ring` (déjà adopté par button/input/fab/
 * navbar/admin-menu).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const layout = readFileSync(join(__dirname, "..", "layout.tsx"), "utf8");
const confirmationPage = readFileSync(join(__dirname, "..", "confirmation", "page.tsx"), "utf8");
const cancelPage = readFileSync(join(__dirname, "..", "annulation", "page.tsx"), "utf8");

describe("checkout layout focus-ring SSOT (regression)", () => {
	it("le skip-link utilise focus-ring (pas ring-2/ring-offset-2 brut)", () => {
		expect(layout).toMatch(/focus-ring/);
		expect(layout).not.toMatch(/focus-visible:ring-2\s+focus-visible:ring-offset-2/);
	});

	it("le décor de fond est rendu dans le layout (hoist)", () => {
		expect(layout).toMatch(/from-primary\/5 to-secondary\/5[^"]*fixed inset-0 -z-10/);
	});

	it("le décor de fond n'est PLUS dupliqué dans confirmation/annulation", () => {
		expect(confirmationPage).not.toMatch(/from-primary\/5 to-secondary\/5 fixed inset-0/);
		expect(cancelPage).not.toMatch(/from-primary\/5 to-secondary\/5 fixed inset-0/);
	});
});
