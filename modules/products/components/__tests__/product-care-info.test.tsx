import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stub shipping service so tests don't depend on external constants
vi.mock("@/modules/orders/services/shipping.service", () => ({
	formatShippingPrice: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/modules/orders/constants/shipping-rates", () => ({
	SHIPPING_RATES: {
		FR: { amount: 499 },
		EU: { amount: 950 },
	},
}));

// Use real Radix Accordion — behaviour is what we're testing
import { ProductCareInfo } from "../product-care-info";

afterEach(cleanup);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProductCareInfo", () => {
	it("renders both accordion triggers (Livraison and Entretien)", () => {
		render(<ProductCareInfo />);

		expect(screen.getByRole("button", { name: /Livraison/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Entretien/i })).toBeInTheDocument();
	});

	it("opens the Livraison section by default and displays shipping prices", () => {
		render(<ProductCareInfo />);

		// FR rate: 499 cents → "4.99 €", EU rate: 950 cents → "9.50 €"
		expect(screen.getByText("4.99 €")).toBeInTheDocument();
		expect(screen.getByText("9.50 €")).toBeInTheDocument();
	});

	it("expands the Entretien section on click and shows care tips", async () => {
		const user = userEvent.setup();
		render(<ProductCareInfo />);

		const careButton = screen.getByRole("button", { name: /Entretien/i });
		await user.click(careButton);

		expect(screen.getByText(/Évitez l'eau/i)).toBeInTheDocument();
	});

	it("shows the silver-specific care tip when primaryMaterial includes 'argent'", async () => {
		const user = userEvent.setup();
		render(<ProductCareInfo primaryMaterial="Argent 925" />);

		const careButton = screen.getByRole("button", { name: /Entretien/i });
		await user.click(careButton);

		expect(screen.getByText(/chiffon anti-oxydation/i)).toBeInTheDocument();
	});

	it("shows the gold-specific care tip when primaryMaterial includes 'or'", async () => {
		const user = userEvent.setup();
		render(<ProductCareInfo primaryMaterial="Or 18 carats" />);

		const careButton = screen.getByRole("button", { name: /Entretien/i });
		await user.click(careButton);

		expect(screen.getByText(/eau tiède/i)).toBeInTheDocument();
	});

	it("does not show material-specific tips when no primaryMaterial is given", async () => {
		const user = userEvent.setup();
		render(<ProductCareInfo />);

		const careButton = screen.getByRole("button", { name: /Entretien/i });
		await user.click(careButton);

		expect(screen.queryByText(/chiffon anti-oxydation/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/eau tiède/i)).not.toBeInTheDocument();
	});
});
