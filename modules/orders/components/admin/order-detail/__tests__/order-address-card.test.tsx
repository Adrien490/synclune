import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	MapPin: () => <svg aria-hidden="true" />,
	Phone: () => <svg aria-hidden="true" />,
}));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ label }: any) => <button aria-label={`Copier ${label}`} />,
}));

import { OrderAddressCard } from "../order-address-card";

afterEach(cleanup);

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		shippingFirstName: "Marie",
		shippingLastName: "Dupont",
		shippingAddress1: "12 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "France",
		shippingPhone: null,
		...overrides,
	} as any;
}

describe("OrderAddressCard", () => {
	it("renders title Adresse de livraison", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("Adresse de livraison")).toBeInTheDocument();
	});

	it("shows full name", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
	});

	it("shows address line 1", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("12 rue de la Paix")).toBeInTheDocument();
	});

	it("shows postal code and city", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("75001 Paris")).toBeInTheDocument();
	});

	it("shows address2 when present", () => {
		render(<OrderAddressCard order={createOrder({ shippingAddress2: "Appartement 3B" })} />);
		expect(screen.getByText("Appartement 3B")).toBeInTheDocument();
	});

	it("hides address2 when null", () => {
		render(<OrderAddressCard order={createOrder({ shippingAddress2: null })} />);
		expect(screen.queryByText(/Appartement/)).toBeNull();
	});

	it("shows phone when shippingPhone is present", () => {
		render(<OrderAddressCard order={createOrder({ shippingPhone: "+33698765432" })} />);
		expect(screen.getByText("+33698765432")).toBeInTheDocument();
	});

	it("hides phone when shippingPhone is null", () => {
		render(<OrderAddressCard order={createOrder({ shippingPhone: null })} />);
		expect(screen.queryByText(/\+336/)).toBeNull();
	});
});
