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
		shippingCountry: "France",
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

	it("shows the shipping country", () => {
		render(<OrderAddressesCard order={createOrder({ shippingCountry: "France" })} />);
		expect(screen.getByText("France")).toBeInTheDocument();
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
