/**
 * @regression checkout-cancel-heading-hierarchy
 *
 * Garantit que la page `/paiement/annulation` rend un <h1> visible (pas sr-only)
 * qui correspond au titre principal — pas un saut h1 sr-only → CardTitle (h4 par
 * défaut shadcn). Incident pré-audit : lecteur d'écran annonçait deux niveaux
 * sans h2/h3 intermédiaire.
 *
 * Si ce test casse : ne PAS restaurer `<h1 className="sr-only">`. Vérifier la
 * hiérarchie a11y avant de remplacer l'h1 visible par un autre niveau.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cancelPage = readFileSync(join(__dirname, "..", "annulation", "page.tsx"), "utf8");

describe("checkout cancel heading hierarchy (regression)", () => {
	it("ne contient pas de h1 sr-only", () => {
		expect(cancelPage).not.toMatch(/<h1\s+className="sr-only"/);
	});

	it("contient un h1 visible (data-slot=card-title)", () => {
		expect(cancelPage).toMatch(/<h1\s+data-slot="card-title"/);
	});

	it("ne consomme plus CardTitle (qui est un div h4 par défaut)", () => {
		expect(cancelPage).not.toMatch(/import.*CardTitle.*from/);
		expect(cancelPage).not.toMatch(/<CardTitle/);
	});
});
