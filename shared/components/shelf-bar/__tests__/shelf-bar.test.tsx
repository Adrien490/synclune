import { useRef } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShelfBar, ShelfBarButton, ShelfBarToolbar } from "../shelf-bar";
import { useToolbarRovingFocus } from "../use-toolbar-roving-focus";

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

describe("ShelfBarToolbar", () => {
	it("est une toolbar horizontale nommée", () => {
		render(<ShelfBarToolbar aria-label="Gestes" />);

		const toolbar = screen.getByRole("toolbar", { name: "Gestes" });
		expect(toolbar.getAttribute("aria-orientation")).toBe("horizontal");
	});
});

describe("ShelfBarButton", () => {
	it("garde la cible tactile 44 px (h-11)", () => {
		render(<ShelfBarButton>Trier</ShelfBarButton>);
		expect(screen.getByRole("button", { name: "Trier" }).className).toContain("h-11");
	});

	it("actif + showTape : ruban décoratif présent, rotation posée", () => {
		render(
			<ShelfBarButton active showTape>
				Trier
			</ShelfBarButton>,
		);

		const button = screen.getByRole("button", { name: "Trier" });
		expect(button.className).toContain("-rotate-1");
		// Le ruban est purement décoratif — il ne doit rien annoncer.
		expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
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

describe("useToolbarRovingFocus", () => {
	function Harness() {
		const a = useRef<HTMLButtonElement>(null);
		const b = useRef<HTMLButtonElement>(null);
		const c = useRef<HTMLButtonElement>(null);
		const { getRovingProps } = useToolbarRovingFocus([a, b, c]);
		return (
			<div role="toolbar" aria-label="Gestes">
				<button ref={a} {...getRovingProps(0)}>
					Un
				</button>
				<button ref={b} {...getRovingProps(1)}>
					Deux
				</button>
				<button ref={c} {...getRovingProps(2)}>
					Trois
				</button>
			</div>
		);
	}

	it("un seul arrêt de tabulation, qui suit le focus (roving tabindex)", () => {
		render(<Harness />);

		const toolbar = screen.getByRole("toolbar", { name: "Gestes" });
		const [un, deux, trois] = within(toolbar).getAllByRole("button");
		expect(un!.tabIndex).toBe(0);
		expect(deux!.tabIndex).toBe(-1);
		expect(trois!.tabIndex).toBe(-1);

		fireEvent.focus(deux!);
		expect(un!.tabIndex).toBe(-1);
		expect(deux!.tabIndex).toBe(0);
	});

	// La navigation par flèches dérive l'anneau d'`offsetParent`, qui vaut
	// toujours `null` en jsdom : le comportement clavier réel est couvert par
	// `e2e/a11y/keyboard-navigation.spec.ts` sur la barre du catalogue.
});
