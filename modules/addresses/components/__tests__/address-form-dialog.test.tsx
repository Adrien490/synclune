import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockUseDialog,
	mockUseAlertDialog,
	mockUseCreateAddress,
	mockUseUpdateAddress,
	mockUseStore,
	mockClose,
	mockDiscardOpen,
} = vi.hoisted(() => ({
	mockUseDialog: vi.fn(),
	mockUseAlertDialog: vi.fn(),
	mockUseCreateAddress: vi.fn(),
	mockUseUpdateAddress: vi.fn(),
	mockUseStore: vi.fn(),
	mockClose: vi.fn(),
	mockDiscardOpen: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: mockUseDialog,
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: mockUseAlertDialog,
}));

vi.mock("../../hooks/use-create-address", () => ({
	useCreateAddress: mockUseCreateAddress,
}));

vi.mock("../../hooks/use-update-address", () => ({
	useUpdateAddress: mockUseUpdateAddress,
}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(),
	useRouter: () => ({ replace: vi.fn() }),
	usePathname: () => "/compte/profil",
}));

vi.mock("@tanstack/react-form", () => ({
	useStore: mockUseStore,
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		AppField: ({
			children,
		}: {
			children: (field: {
				name: string;
				handleChange: ReturnType<typeof vi.fn>;
				state: { value: string; meta: { errors: string[] } };
				InputField: (props: { label: string }) => React.ReactNode;
				PhoneField: (props: { label: string }) => React.ReactNode;
			}) => React.ReactNode;
		}) =>
			children({
				name: "mock-field",
				handleChange: vi.fn(),
				state: { value: "", meta: { errors: [] } },
				InputField: ({ label }: { label: string }) => <input aria-label={label} />,
				PhoneField: ({ label }: { label: string }) => <input aria-label={label} />,
			}),
		Subscribe: ({ children }: { children: (values: [boolean]) => React.ReactNode }) =>
			children([true]),
		handleSubmit: vi.fn(),
		setFieldValue: vi.fn(),
		store: {},
	}),
}));

vi.mock("@/shared/components/autocomplete", () => ({
	Autocomplete: ({ error }: { error?: string }) => (
		<div>
			<input placeholder="Rechercher une adresse..." />
			{error && <p>{error}</p>}
		</div>
	),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		open,
		onOpenChange,
		children,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		children: React.ReactNode;
	}) =>
		open ? (
			<div data-testid="dialog">
				{children}
				<button onClick={() => onOpenChange(false)} data-testid="dialog-close-trigger">
					Fermer
				</button>
			</div>
		) : null,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div role="alert" data-variant={variant}>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => (
		<button type="submit" disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p>Champs obligatoires</p>,
}));

vi.mock("lucide-react", () => ({
	CheckCircle2: () => null,
	XCircle: () => null,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import React from "react";
import { AddressFormDialog } from "../address-form-dialog";
import { ActionStatus } from "@/shared/types/server-action";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// Helpers
// ============================================================================

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

function setupOpenDialog(address?: ReturnType<typeof createAddress>) {
	mockUseDialog.mockReturnValue({
		isOpen: true,
		close: mockClose,
		data: address ? { address } : {},
	});

	mockUseAlertDialog.mockReturnValue({
		open: mockDiscardOpen,
		close: vi.fn(),
		isOpen: false,
		data: null,
	});

	mockUseCreateAddress.mockReturnValue({
		state: undefined,
		action: vi.fn(),
		isPending: false,
	});

	mockUseUpdateAddress.mockReturnValue({
		state: undefined,
		action: vi.fn(),
		isPending: false,
	});

	mockUseStore.mockReturnValue(false);
}

function setupClosedDialog() {
	mockUseDialog.mockReturnValue({
		isOpen: false,
		close: mockClose,
		data: {},
	});

	mockUseAlertDialog.mockReturnValue({
		open: mockDiscardOpen,
		close: vi.fn(),
		isOpen: false,
		data: null,
	});

	mockUseCreateAddress.mockReturnValue({
		state: undefined,
		action: vi.fn(),
		isPending: false,
	});

	mockUseUpdateAddress.mockReturnValue({
		state: undefined,
		action: vi.fn(),
		isPending: false,
	});

	mockUseStore.mockReturnValue(false);
}

// ============================================================================
// Tests
// ============================================================================

describe("AddressFormDialog", () => {
	describe("when dialog is closed", () => {
		it("renders nothing", () => {
			setupClosedDialog();

			render(<AddressFormDialog />);

			expect(screen.queryByTestId("dialog")).toBeNull();
		});
	});

	describe("create mode (no address data)", () => {
		it("shows 'Ajouter une adresse' title", () => {
			setupOpenDialog();

			render(<AddressFormDialog />);

			expect(screen.getByText("Ajouter une adresse")).toBeInTheDocument();
		});

		it("shows 'Ajouter' submit button", () => {
			setupOpenDialog();

			render(<AddressFormDialog />);

			expect(screen.getByRole("button", { name: "Ajouter" })).toBeInTheDocument();
		});

		it("shows create description text", () => {
			setupOpenDialog();

			render(<AddressFormDialog />);

			expect(screen.getByText("Ajoutez une nouvelle adresse de livraison")).toBeInTheDocument();
		});

		it("calls useCreateAddress with onSuccess callback", () => {
			setupOpenDialog();

			render(<AddressFormDialog />);

			expect(mockUseCreateAddress).toHaveBeenCalledWith(
				expect.objectContaining({ onSuccess: expect.any(Function) }),
			);
		});
	});

	describe("edit mode (with address data)", () => {
		it("shows 'Modifier l\u2019adresse' title", () => {
			setupOpenDialog(createAddress());

			render(<AddressFormDialog />);

			expect(screen.getByText("Modifier l'adresse")).toBeInTheDocument();
		});

		it("shows 'Enregistrer' submit button", () => {
			setupOpenDialog(createAddress());

			render(<AddressFormDialog />);

			expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
		});

		it("shows edit description text", () => {
			setupOpenDialog(createAddress());

			render(<AddressFormDialog />);

			expect(screen.getByText("Modifiez les informations de cette adresse")).toBeInTheDocument();
		});

		it("calls useUpdateAddress with the address id", () => {
			setupOpenDialog(createAddress({ id: "addr-42" }));

			render(<AddressFormDialog />);

			expect(mockUseUpdateAddress).toHaveBeenCalledWith(
				"addr-42",
				expect.objectContaining({ onSuccess: expect.any(Function) }),
			);
		});
	});

	describe("state display", () => {
		it("shows success alert with message when state is success", () => {
			setupOpenDialog();
			mockUseCreateAddress.mockReturnValue({
				state: { status: ActionStatus.SUCCESS, message: "Adresse créée avec succès" },
				action: vi.fn(),
				isPending: false,
			});

			render(<AddressFormDialog />);

			expect(screen.getByText("Adresse créée avec succès")).toBeInTheDocument();
		});

		it("shows error alert with message when state is error", () => {
			setupOpenDialog();
			mockUseCreateAddress.mockReturnValue({
				state: { status: ActionStatus.ERROR, message: "Limite de 10 adresses atteinte" },
				action: vi.fn(),
				isPending: false,
			});

			render(<AddressFormDialog />);

			expect(screen.getByText("Limite de 10 adresses atteinte")).toBeInTheDocument();
		});

		it("shows 'Enregistrement...' in submit button when pending", () => {
			setupOpenDialog();
			mockUseCreateAddress.mockReturnValue({
				state: undefined,
				action: vi.fn(),
				isPending: true,
			});

			render(<AddressFormDialog />);

			expect(screen.getByRole("button", { name: "Enregistrement..." })).toBeInTheDocument();
		});

		it("does not show any alert when state is undefined", () => {
			setupOpenDialog();

			render(<AddressFormDialog />);

			expect(screen.queryByRole("alert")).toBeNull();
		});
	});

	describe("dialog close behavior", () => {
		it("calls close directly when form is not dirty", () => {
			setupOpenDialog();
			mockUseStore.mockReturnValue(false);

			render(<AddressFormDialog />);
			fireEvent.click(screen.getByTestId("dialog-close-trigger"));

			expect(mockClose).toHaveBeenCalled();
			expect(mockDiscardOpen).not.toHaveBeenCalled();
		});

		it("opens discard confirmation dialog when form is dirty", () => {
			setupOpenDialog();
			mockUseStore.mockReturnValue(true);

			render(<AddressFormDialog />);
			fireEvent.click(screen.getByTestId("dialog-close-trigger"));

			expect(mockDiscardOpen).toHaveBeenCalledWith({ onConfirm: mockClose });
			expect(mockClose).not.toHaveBeenCalled();
		});
	});

	describe("address search error", () => {
		it("shows search unavailable error when addressSearchError is true", () => {
			setupOpenDialog();

			render(<AddressFormDialog addressSearchError={true} />);

			expect(
				screen.getByText("La recherche d'adresse est temporairement indisponible"),
			).toBeInTheDocument();
		});

		it("does not show search error by default", () => {
			setupOpenDialog();

			render(<AddressFormDialog />);

			expect(
				screen.queryByText("La recherche d'adresse est temporairement indisponible"),
			).toBeNull();
		});
	});
});
