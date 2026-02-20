import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock AddressCardActions to avoid deep dependency chain
vi.mock("../address-card-actions", () => ({
	AddressCardActions: ({ address }: { address: { id: string } }) => (
		<button data-testid={`actions-${address.id}`}>Actions</button>
	),
}));

// Mock cn utility
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { AddressCard } from "../address-card";

afterEach(cleanup);

function createAddress(overrides: Record<string, unknown> = {}) {
	return {
		id: "addr-1",
		userId: "user-1",
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: null,
		postalCode: "75001",
		city: "Paris",
		country: "FR",
		phone: "+33612345678",
		isDefault: false,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

describe("AddressCard", () => {
	it("renders the full name", () => {
		render(<AddressCard address={createAddress()} />);

		expect(screen.getByText("Marie Dupont")).toBeDefined();
	});

	it("renders the address lines", () => {
		render(<AddressCard address={createAddress()} />);

		expect(screen.getByText("12 Rue de la Paix")).toBeDefined();
		expect(screen.getByText("75001 Paris")).toBeDefined();
	});

	it("renders address2 when present", () => {
		render(
			<AddressCard address={createAddress({ address2: "Bâtiment B" })} />
		);

		expect(screen.getByText("Bâtiment B")).toBeDefined();
	});

	it("does not render address2 when null", () => {
		render(<AddressCard address={createAddress({ address2: null })} />);

		expect(screen.queryByText("Bâtiment B")).toBeNull();
	});

	it("shows default badge when isDefault is true", () => {
		render(
			<AddressCard address={createAddress({ isDefault: true })} />
		);

		expect(screen.getByText("Par défaut")).toBeDefined();
	});

	it("hides default badge when isDefault is false", () => {
		render(<AddressCard address={createAddress({ isDefault: false })} />);

		expect(screen.queryByText("Par défaut")).toBeNull();
	});

	it("renders the actions component", () => {
		render(<AddressCard address={createAddress()} />);

		expect(screen.getByTestId("actions-addr-1")).toBeDefined();
	});

	describe("phone formatting", () => {
		it("formats +33 international numbers with spaces", () => {
			render(
				<AddressCard address={createAddress({ phone: "+33612345678" })} />
			);

			expect(screen.getByText("+33 6 12 34 56 78")).toBeDefined();
		});

		it("formats 0X national numbers with spaces", () => {
			render(
				<AddressCard address={createAddress({ phone: "0612345678" })} />
			);

			expect(screen.getByText("06 12 34 56 78")).toBeDefined();
		});

		it("returns unformatted phone for non-FR numbers", () => {
			render(
				<AddressCard address={createAddress({ phone: "+4915112345678" })} />
			);

			expect(screen.getByText("+4915112345678")).toBeDefined();
		});

		it("formats landline numbers correctly", () => {
			render(
				<AddressCard address={createAddress({ phone: "0145678901" })} />
			);

			expect(screen.getByText("01 45 67 89 01")).toBeDefined();
		});
	});
});
