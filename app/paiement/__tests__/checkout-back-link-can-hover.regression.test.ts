/**
 * @regression checkout-back-link-can-hover
 *
 * Garantit que le `<CheckoutBackLink>` du header /paiement utilise le préfixe
 * `can-hover:` sur ses classes hover (anti sticky-hover iOS Safari : le `:hover`
 * reste collé après tap sur les devices sans hover natif). Pattern récurrent
 * du repo (cf. admin-mobile-header, navbar).
 *
 * Si ce test casse : ne PAS retirer `can-hover:`. Vérifier qu'on n'a pas
 * réintroduit `hover:` brut sur un élément interactif.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const backLink = readFileSync(
	join(__dirname, "..", "_components", "checkout-back-link.tsx"),
	"utf8",
);

describe("checkout back link can-hover gate (regression)", () => {
	it("ne contient pas de hover: brut sans préfixe can-hover:", () => {
		// Match `hover:` non précédé par `can-hover:`, `group-hover:` ou `motion-safe:can-hover:`
		const rawHoverMatches = backLink.match(/(?<!can-)(?<!group-)(?<!:)\bhover:/g) ?? [];
		expect(rawHoverMatches).toEqual([]);
	});

	it("applique can-hover: sur les classes hover background/color", () => {
		expect(backLink).toMatch(/can-hover:hover:text-foreground/);
		expect(backLink).toMatch(/can-hover:hover:bg-muted\/60/);
	});

	it("utilise l'utility focus-ring SSOT (pas de ring-2 ring-primary brut)", () => {
		expect(backLink).toMatch(/focus-ring/);
		expect(backLink).not.toMatch(/focus-visible:ring-2\s+focus-visible:ring-primary/);
	});
});
