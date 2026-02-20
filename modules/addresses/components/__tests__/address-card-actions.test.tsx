import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseDialog, mockUseAlertDialog, mockHandleSetDefault } = vi.hoisted(() => ({
	mockUseDialog: vi.fn(),
	mockUseAlertDialog: vi.fn(),
	mockHandleSetDefault: vi.fn(),
}));

// Mock Radix DropdownMenu to render children directly
vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuItem: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
		<button onClick={onClick} disabled={disabled} className={className}>{children}</button>
	),
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: mockUseDialog,
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: mockUseAlertDialog,
}));

vi.mock("../../hooks/use-set-default-address", () => ({
	useSetDefaultAddress: () => ({
		handle: mockHandleSetDefault,
		isPending: false,
	}),
}));

import { AddressCardActions } from "../address-card-actions";

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

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

function setupMocks() {
	const mockOpen = vi.fn();
	const mockDeleteOpen = vi.fn();

	mockUseDialog.mockReturnValue({ open: mockOpen, close: vi.fn(), isOpen: false, data: null });
	mockUseAlertDialog.mockReturnValue({ open: mockDeleteOpen, close: vi.fn(), isOpen: false, data: null });

	return { mockOpen, mockDeleteOpen };
}

describe("AddressCardActions", () => {
	it("renders the actions trigger button with sr-only label", () => {
		setupMocks();

		render(<AddressCardActions address={createAddress()} />);

		expect(screen.getByText("Actions pour Marie Dupont")).toBeDefined();
	});

	it("shows 'Définir par défaut' when address is not default", () => {
		setupMocks();

		render(<AddressCardActions address={createAddress({ isDefault: false })} />);

		expect(screen.getByText("Définir par défaut")).toBeDefined();
	});

	it("hides 'Définir par défaut' when address is already default", () => {
		setupMocks();

		render(<AddressCardActions address={createAddress({ isDefault: true })} />);

		expect(screen.queryByText("Définir par défaut")).toBeNull();
	});

	it("always shows 'Modifier' option", () => {
		setupMocks();

		render(<AddressCardActions address={createAddress()} />);

		expect(screen.getByText("Modifier")).toBeDefined();
	});

	it("always shows 'Supprimer' option", () => {
		setupMocks();

		render(<AddressCardActions address={createAddress()} />);

		expect(screen.getByText("Supprimer")).toBeDefined();
	});

	it("calls handleSetDefault with address id when clicking set default", () => {
		setupMocks();

		render(<AddressCardActions address={createAddress({ id: "addr-42" })} />);

		screen.getByText("Définir par défaut").closest("button")?.click();

		expect(mockHandleSetDefault).toHaveBeenCalledWith("addr-42");
	});

	it("opens edit dialog with address data when clicking modify", () => {
		const { mockOpen } = setupMocks();
		const address = createAddress();

		render(<AddressCardActions address={address} />);

		screen.getByText("Modifier").closest("button")?.click();

		expect(mockOpen).toHaveBeenCalledWith({ address });
	});

	it("opens delete dialog with address info when clicking delete", () => {
		const { mockDeleteOpen } = setupMocks();

		render(
			<AddressCardActions
				address={createAddress({ id: "addr-99", isDefault: true })}
			/>
		);

		screen.getByText("Supprimer").closest("button")?.click();

		expect(mockDeleteOpen).toHaveBeenCalledWith({
			addressId: "addr-99",
			addressLabel: "Marie Dupont - Paris",
			isDefault: true,
		});
	});
});
