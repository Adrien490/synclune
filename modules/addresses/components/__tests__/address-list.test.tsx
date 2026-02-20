import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock React's use() to synchronously return the resolved value
const { mockUse } = vi.hoisted(() => ({
	mockUse: vi.fn(),
}));

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		use: mockUse,
	};
});

// Mock AddressCard to simplify rendering
vi.mock("../address-card", () => ({
	AddressCard: ({ address }: { address: { id: string; firstName: string; lastName: string } }) => (
		<div data-testid={`address-card-${address.id}`}>
			{address.firstName} {address.lastName}
		</div>
	),
}));

// Mock CreateAddressButton
vi.mock("../create-address-button", () => ({
	CreateAddressButton: ({ children }: { children?: React.ReactNode }) => (
		<button>{children || "Ajouter une adresse"}</button>
	),
}));

import { AddressList } from "../address-list";

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

function createAddress(id: string, firstName: string, lastName: string) {
	return {
		id,
		userId: "user-1",
		firstName,
		lastName,
		address1: "12 Rue de la Paix",
		address2: null,
		postalCode: "75001",
		city: "Paris",
		country: "FR",
		phone: "+33612345678",
		isDefault: id === "addr-1",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};
}

describe("AddressList", () => {
	it("renders the section header", () => {
		mockUse.mockReturnValue([]);

		render(<AddressList addressesPromise={Promise.resolve([])} />);

		expect(screen.getByText("Adresses enregistrées")).toBeDefined();
	});

	it("shows empty state when no addresses", () => {
		mockUse.mockReturnValue([]);

		render(<AddressList addressesPromise={Promise.resolve([])} />);

		expect(screen.getByText("Aucune adresse enregistrée")).toBeDefined();
		expect(screen.getByText("Ajouter une adresse")).toBeDefined();
	});

	it("shows empty state when addresses is null", () => {
		mockUse.mockReturnValue(null);

		render(<AddressList addressesPromise={Promise.resolve(null)} />);

		expect(screen.getByText("Aucune adresse enregistrée")).toBeDefined();
	});

	it("renders address cards when addresses exist", () => {
		const addresses = [
			createAddress("addr-1", "Marie", "Dupont"),
			createAddress("addr-2", "Jean", "Martin"),
		];
		mockUse.mockReturnValue(addresses);

		render(<AddressList addressesPromise={Promise.resolve(addresses)} />);

		expect(screen.getByTestId("address-card-addr-1")).toBeDefined();
		expect(screen.getByTestId("address-card-addr-2")).toBeDefined();
	});

	it("shows the 'Ajouter' button in header when addresses exist", () => {
		const addresses = [createAddress("addr-1", "Marie", "Dupont")];
		mockUse.mockReturnValue(addresses);

		render(<AddressList addressesPromise={Promise.resolve(addresses)} />);

		expect(screen.getByText("Ajouter")).toBeDefined();
	});

	it("hides the header 'Ajouter' button when no addresses", () => {
		mockUse.mockReturnValue([]);

		render(<AddressList addressesPromise={Promise.resolve([])} />);

		// Only the empty state button should exist, not the header one
		const buttons = screen.getAllByText(/Ajouter/);
		expect(buttons).toHaveLength(1);
		expect(buttons[0].textContent).toBe("Ajouter une adresse");
	});
});
