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
			<CheckoutSection title="Contact">
				<p>content</p>
			</CheckoutSection>,
		);
		expect(container.querySelector("section")).toBeInTheDocument();
	});

	it("renders the title as h2", () => {
		render(
			<CheckoutSection title="Livraison">
				<p>content</p>
			</CheckoutSection>,
		);
		expect(screen.getByRole("heading", { level: 2, name: "Livraison" })).toBeInTheDocument();
	});

	it("renders children", () => {
		render(
			<CheckoutSection title="Contact">
				<p data-testid="child-content">Mon contenu</p>
			</CheckoutSection>,
		);
		expect(screen.getByTestId("child-content")).toBeInTheDocument();
	});

	it("renders correct title text", () => {
		render(
			<CheckoutSection title="Paiement">
				<span />
			</CheckoutSection>,
		);
		expect(screen.getByText("Paiement")).toBeInTheDocument();
	});
});
