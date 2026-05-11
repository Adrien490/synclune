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

		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
	});

	it("renders the address lines", () => {
		render(<AddressCard address={createAddress()} />);

		expect(screen.getByText("12 Rue de la Paix")).toBeInTheDocument();
		expect(screen.getByText("75001 Paris")).toBeInTheDocument();
	});

	it("renders address2 when present", () => {
		render(<AddressCard address={createAddress({ address2: "Bâtiment B" })} />);

		expect(screen.getByText("Bâtiment B")).toBeInTheDocument();
	});

	it("does not render address2 when null", () => {
		render(<AddressCard address={createAddress({ address2: null })} />);

		expect(screen.queryByText("Bâtiment B")).toBeNull();
	});

	it("shows default badge when isDefault is true", () => {
		render(<AddressCard address={createAddress({ isDefault: true })} />);

		expect(screen.getByText("Par défaut")).toBeInTheDocument();
	});

	it("hides default badge when isDefault is false", () => {
		render(<AddressCard address={createAddress({ isDefault: false })} />);

		expect(screen.queryByText("Par défaut")).toBeNull();
	});

	it("renders the actions component", () => {
		render(<AddressCard address={createAddress()} />);

		expect(screen.getByTestId("actions-addr-1")).toBeInTheDocument();
	});

	describe("phone formatting", () => {
		it("formats +33 international numbers with spaces", () => {
			render(<AddressCard address={createAddress({ phone: "+33612345678" })} />);

			expect(screen.getByText("+33 6 12 34 56 78")).toBeInTheDocument();
		});

		it("formats 0X national numbers using the address country", () => {
			render(<AddressCard address={createAddress({ phone: "0612345678", country: "FR" })} />);

			// libphonenumber-js normalizes national input to international form
			expect(screen.getByText("+33 6 12 34 56 78")).toBeInTheDocument();
		});

		it("formats non-FR numbers using their international prefix", () => {
			render(<AddressCard address={createAddress({ phone: "+4915112345678", country: "DE" })} />);

			expect(screen.getByText("+49 1511 2345678")).toBeInTheDocument();
		});

		it("formats landline numbers using the address country", () => {
			render(<AddressCard address={createAddress({ phone: "0145678901", country: "FR" })} />);

			expect(screen.getByText("+33 1 45 67 89 01")).toBeInTheDocument();
		});

		it("falls back to the raw value when parsing fails", () => {
			render(<AddressCard address={createAddress({ phone: "not-a-phone", country: "FR" })} />);

			expect(screen.getByText("not-a-phone")).toBeInTheDocument();
		});
	});
});
