import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShelfBar, ShelfBarButton } from "../shelf-bar";

afterEach(cleanup);

describe("ShelfBar", () => {
	it("rend un nav nommé, collant sous --navbar-height-static (jamais la variante non-static)", () => {
		render(<ShelfBar aria-label="Actions">contenu</ShelfBar>);

		const nav = screen.getByRole("navigation", { name: "Actions" });
		expect(nav.className).toContain("sticky");
		expect(nav.className).toContain("top-[var(--navbar-height-static)]");
		// La variante non-static se contractait au défilement — bug payé deux fois.
		expect(nav.className).not.toContain("var(--navbar-height)]");
	});

	it("porte la peau « tranche d'étagère » et sa matérialisation", () => {
		render(<ShelfBar aria-label="Actions">contenu</ShelfBar>);

		const nav = screen.getByRole("navigation", { name: "Actions" });
		expect(nav.className).toContain("polaroid-paper");
		expect(nav.className).toContain("shadow-paper");
		expect(nav.className).toContain("shelf-materialize");
	});
});

describe("ShelfBarButton", () => {
	it("garde la cible tactile 44 px (h-11)", () => {
		render(<ShelfBarButton>Trier</ShelfBarButton>);
		expect(screen.getByRole("button", { name: "Trier" }).className).toContain("h-11");
	});

	it("actif : rotation posée", () => {
		render(<ShelfBarButton active>Trier</ShelfBarButton>);

		const button = screen.getByRole("button", { name: "Trier" });
		expect(button.className).toContain("-rotate-1");
	});

	it("l'accent teinte l'état actif (classes littérales)", () => {
		render(
			<ShelfBarButton active accent="sun">
				Filtrer
			</ShelfBarButton>,
		);
		expect(screen.getByRole("button", { name: "Filtrer" }).className).toContain(
			"border-brand-sun/40",
		);
	});

	it("le badge compteur est visible mais muet (aria-hidden) — le nombre appartient au nom accessible", () => {
		render(
			<ShelfBarButton active count={3} aria-label="Filtrer — 3 filtres actifs">
				Filtrer
			</ShelfBarButton>,
		);

		const button = screen.getByRole("button", { name: "Filtrer — 3 filtres actifs" });
		const badge = [...button.querySelectorAll('[aria-hidden="true"]')].find(
			(el) => el.textContent === "3",
		);
		expect(badge).toBeDefined();
	});
});
