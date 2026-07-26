import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("lucide-react", () => ({
	MapPin: () => <svg data-testid="icon-map-pin" />,
}));

import { OrderAddressesCard } from "../order-addresses-card";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function createOrder(
	overrides: Partial<{
		shippingFirstName: string;
		shippingLastName: string;
		shippingAddress1: string;
		shippingAddress2: string | null;
		shippingPostalCode: string;
		shippingCity: string;
		shippingCountry: string;
		shippingPhone: string;
	}> = {},
) {
	return {
		shippingFirstName: "Marie",
		shippingLastName: "Dupont",
		shippingAddress1: "12 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		// Code ISO 2 lettres — la seule forme que `VarChar(2)` peut contenir.
		// L'ancienne fixture "France" était impossible en base et masquait
		// l'absence de conversion.
		shippingCountry: "FR",
		shippingPhone: "+33 6 12 34 56 78",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderAddressesCard", () => {
	it("renders 'Adresse de livraison' heading", () => {
		render(<OrderAddressesCard order={createOrder()} />);
		expect(screen.getByRole("heading", { name: /Adresse de livraison/i })).toBeInTheDocument();
	});

	it("shows the shipping first and last name", () => {
		render(
			<OrderAddressesCard
				order={createOrder({ shippingFirstName: "Marie", shippingLastName: "Dupont" })}
			/>,
		);
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
	});

	it("shows the shipping address line 1", () => {
		render(<OrderAddressesCard order={createOrder({ shippingAddress1: "12 rue de la Paix" })} />);
		expect(screen.getByText("12 rue de la Paix")).toBeInTheDocument();
	});

	it("shows city and postal code together", () => {
		render(
			<OrderAddressesCard
				order={createOrder({ shippingPostalCode: "75001", shippingCity: "Paris" })}
			/>,
		);
		expect(screen.getByText("75001 Paris")).toBeInTheDocument();
	});

	// `shippingCountry` est un `VarChar(2)` : la carte rendait la colonne brute,
	// donc « FR ». La fixture d'origine passait « France » — une valeur que la
	// base ne peut pas contenir — et validait donc un bug.
	it("traduit le code pays ISO en nom français", () => {
		render(<OrderAddressesCard order={createOrder({ shippingCountry: "FR" })} />);
		expect(screen.getByText("France")).toBeInTheDocument();
		expect(screen.queryByText("FR")).not.toBeInTheDocument();
	});

	it("traduit aussi les autres pays livrés", () => {
		render(<OrderAddressesCard order={createOrder({ shippingCountry: "BE" })} />);
		expect(screen.getByText("Belgique")).toBeInTheDocument();
	});

	// Repli lisible plutôt qu'un `undefined` muet sur un code hors périmètre.
	it("affiche le code brut si le pays est inconnu", () => {
		render(<OrderAddressesCard order={createOrder({ shippingCountry: "ZZ" })} />);
		expect(screen.getByText("ZZ")).toBeInTheDocument();
	});

	it("shows address line 2 when provided", () => {
		render(<OrderAddressesCard order={createOrder({ shippingAddress2: "Appartement 4B" })} />);
		expect(screen.getByText("Appartement 4B")).toBeInTheDocument();
	});

	it("does not render address line 2 when null", () => {
		render(<OrderAddressesCard order={createOrder({ shippingAddress2: null })} />);
		expect(screen.queryByText("Appartement")).not.toBeInTheDocument();
	});

	it("shows the phone number", () => {
		render(<OrderAddressesCard order={createOrder({ shippingPhone: "+33 6 12 34 56 78" })} />);
		expect(screen.getByText("+33 6 12 34 56 78")).toBeInTheDocument();
	});

	it("renders the MapPin icon in the heading", () => {
		render(<OrderAddressesCard order={createOrder()} />);
		expect(screen.getByTestId("icon-map-pin")).toBeInTheDocument();
	});
});
