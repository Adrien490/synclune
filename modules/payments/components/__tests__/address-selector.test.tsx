import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))

vi.mock("lucide-react", () => ({
	MapPin: ({ className }: { className?: string }) => (
		<svg data-testid="map-pin-icon" className={className} />
	),
}))

// ─── Import under test ───────────────────────────────────────────────────────

import { AddressSelector } from "../address-selector"
import type { UserAddress } from "@/modules/addresses/types/user-addresses.types"

afterEach(cleanup)

// ─── Fixtures ────────────────────────────────────────────────────────────────

function createAddress(overrides: Partial<UserAddress> = {}): UserAddress {
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
	} as unknown as UserAddress
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AddressSelector", () => {
	describe("rendering conditions", () => {
		it("returns null when only one address is provided", () => {
			const addresses = [createAddress()]
			const { container } = render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(container.firstChild).toBeNull()
		})

		it("returns null when addresses array is empty", () => {
			const { container } = render(
				<AddressSelector
					addresses={[]}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(container.firstChild).toBeNull()
		})

		it("renders when two or more addresses are provided", () => {
			const addresses = [
				createAddress({ id: "addr-1" }),
				createAddress({ id: "addr-2", firstName: "Jean", lastName: "Martin" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(screen.getByRole("group")).toBeInTheDocument()
		})
	})

	describe("fieldset and legend", () => {
		it("renders a fieldset element", () => {
			const addresses = [
				createAddress({ id: "addr-1" }),
				createAddress({ id: "addr-2" }),
			]

			const { container } = render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(container.querySelector("fieldset")).not.toBeNull()
		})

		it("renders the legend with correct label", () => {
			const addresses = [
				createAddress({ id: "addr-1" }),
				createAddress({ id: "addr-2" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(screen.getByText("Adresses enregistrées")).toBeInTheDocument()
		})
	})

	describe("address display", () => {
		it("renders all addresses when multiple provided", () => {
			const addresses = [
				createAddress({ id: "addr-1", firstName: "Marie", lastName: "Dupont" }),
				createAddress({ id: "addr-2", firstName: "Jean", lastName: "Martin" }),
				createAddress({ id: "addr-3", firstName: "Sophie", lastName: "Bernard" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(screen.getByText("Marie Dupont")).toBeInTheDocument()
			expect(screen.getByText("Jean Martin")).toBeInTheDocument()
			expect(screen.getByText("Sophie Bernard")).toBeInTheDocument()
		})

		it("shows full name as firstName + lastName joined by space", () => {
			const addresses = [
				createAddress({ id: "addr-1", firstName: "Marie", lastName: "Dupont" }),
				createAddress({ id: "addr-2", firstName: "Jean" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(screen.getByText("Marie Dupont")).toBeInTheDocument()
		})

		it("shows address line as address1 and city joined by comma", () => {
			const addresses = [
				createAddress({ id: "addr-1", address1: "12 Rue de la Paix", city: "Paris" }),
				createAddress({ id: "addr-2", address1: "5 Avenue Victor Hugo", city: "Lyon" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(screen.getByText("12 Rue de la Paix, Paris")).toBeInTheDocument()
		})

		it("filters out empty parts from address line", () => {
			const addresses = [
				createAddress({ id: "addr-1", address1: "12 Rue de la Paix", city: "" }),
				createAddress({ id: "addr-2" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			// With empty city, the comma should not appear
			expect(screen.getByText("12 Rue de la Paix")).toBeInTheDocument()
		})
	})

	describe("default address badge", () => {
		it("shows 'Par défaut' badge for the default address", () => {
			const addresses = [
				createAddress({ id: "addr-1", isDefault: true }),
				createAddress({ id: "addr-2", isDefault: false }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(screen.getByText("Par défaut")).toBeInTheDocument()
		})

		it("does not show 'Par défaut' badge for non-default addresses", () => {
			const addresses = [
				createAddress({ id: "addr-1", isDefault: false }),
				createAddress({ id: "addr-2", isDefault: false }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			expect(screen.queryByText("Par défaut")).toBeNull()
		})

		it("shows 'Par défaut' badge only once when one address is default", () => {
			const addresses = [
				createAddress({ id: "addr-1", isDefault: true }),
				createAddress({ id: "addr-2", isDefault: false }),
				createAddress({ id: "addr-3", isDefault: false }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			const badges = screen.getAllByText("Par défaut")
			expect(badges).toHaveLength(1)
		})
	})

	describe("selection behavior", () => {
		it("calls onSelectAddress with the address when a radio is changed", async () => {
			const user = userEvent.setup()
			const onSelectAddress = vi.fn()
			const addr1 = createAddress({ id: "addr-1", firstName: "Marie", lastName: "Dupont" })
			const addr2 = createAddress({ id: "addr-2", firstName: "Jean", lastName: "Martin" })
			const addresses = [addr1, addr2]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId="addr-1"
					onSelectAddress={onSelectAddress}
				/>
			)

			const radios = screen.getAllByRole("radio")
			await user.click(radios[1])

			expect(onSelectAddress).toHaveBeenCalledWith(addr2)
		})

		it("marks the selected address radio as checked", () => {
			const addresses = [
				createAddress({ id: "addr-1" }),
				createAddress({ id: "addr-2" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId="addr-1"
					onSelectAddress={vi.fn()}
				/>
			)

			const radios = screen.getAllByRole("radio") as HTMLInputElement[]
			expect(radios[0].checked).toBe(true)
			expect(radios[1].checked).toBe(false)
		})

		it("marks no radio as checked when selectedAddressId is null", () => {
			const addresses = [
				createAddress({ id: "addr-1" }),
				createAddress({ id: "addr-2" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			const radios = screen.getAllByRole("radio") as HTMLInputElement[]
			expect(radios[0].checked).toBe(false)
			expect(radios[1].checked).toBe(false)
		})
	})

	describe("radio input attributes", () => {
		it("uses 'saved-address' as the radio group name for all radios", () => {
			const addresses = [
				createAddress({ id: "addr-1" }),
				createAddress({ id: "addr-2" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			const radios = screen.getAllByRole("radio") as HTMLInputElement[]
			expect(radios[0].name).toBe("saved-address")
			expect(radios[1].name).toBe("saved-address")
		})

		it("sets the radio value to the address id", () => {
			const addresses = [
				createAddress({ id: "addr-abc" }),
				createAddress({ id: "addr-xyz" }),
			]

			render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			const radios = screen.getAllByRole("radio") as HTMLInputElement[]
			expect(radios[0].value).toBe("addr-abc")
			expect(radios[1].value).toBe("addr-xyz")
		})

		it("hides radio inputs visually via sr-only class", () => {
			const addresses = [
				createAddress({ id: "addr-1" }),
				createAddress({ id: "addr-2" }),
			]

			const { container } = render(
				<AddressSelector
					addresses={addresses}
					selectedAddressId={null}
					onSelectAddress={vi.fn()}
				/>
			)

			const radios = container.querySelectorAll('input[type="radio"]')
			expect(radios[0].className).toContain("sr-only")
		})
	})
})
