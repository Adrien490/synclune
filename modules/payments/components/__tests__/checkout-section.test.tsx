import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutSection } from "../checkout-section";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CheckoutSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a section element", () => {
		const { container } = render(
			<CheckoutSection title="Contact" accent="rose">
				<p>content</p>
			</CheckoutSection>,
		);
		expect(container.querySelector("section")).toBeInTheDocument();
	});

	it("renders the title as h2", () => {
		render(
			<CheckoutSection title="Livraison" accent="lavender">
				<p>content</p>
			</CheckoutSection>,
		);
		expect(screen.getByRole("heading", { level: 2, name: "Livraison" })).toBeInTheDocument();
	});

	it("renders children", () => {
		render(
			<CheckoutSection title="Contact" accent="rose">
				<p data-testid="child-content">Mon contenu</p>
			</CheckoutSection>,
		);
		expect(screen.getByTestId("child-content")).toBeInTheDocument();
	});

	it("renders correct title text", () => {
		render(
			<CheckoutSection title="Paiement" accent="sun">
				<span />
			</CheckoutSection>,
		);
		expect(screen.getByText("Paiement")).toBeInTheDocument();
	});

	it("porte l'accent de l'étape sur la section elle-même", () => {
		// C'est `[data-accent]` qui expose `--section-accent` / `--section-soft`
		// (app/styles/section-accents.css) : sans lui sur la section, le filet
		// retombe silencieusement sur le rose de `--primary` partout.
		const { container } = render(
			<CheckoutSection title="Livraison" accent="lavender">
				<p>content</p>
			</CheckoutSection>,
		);
		expect(container.querySelector("section")).toHaveAttribute("data-accent", "lavender");
	});

	it("n'affiche le repère « complété » que sur demande, avec une icône", () => {
		const { rerender, container } = render(
			<CheckoutSection title="Contact" accent="rose">
				<p>content</p>
			</CheckoutSection>,
		);
		expect(screen.queryByText("complété")).not.toBeInTheDocument();

		rerender(
			<CheckoutSection title="Contact" accent="rose" isComplete>
				<p>content</p>
			</CheckoutSection>,
		);
		expect(screen.getByText("complété")).toBeInTheDocument();
		// Un état qui ne se distingue QUE par la couleur n'existe pas (WCAG 1.4.1) :
		// le mot et l'icône portent l'information, le vert ne fait que la doubler.
		expect(container.querySelector("svg")).toBeInTheDocument();
	});
});
