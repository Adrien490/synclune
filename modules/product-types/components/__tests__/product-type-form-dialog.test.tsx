import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

let mockDialogState = {
	isOpen: true,
	close: vi.fn(),
	data: null as Record<string, unknown> | null,
};

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/modules/product-types/actions/create-product-type", () => ({
	createProductType: vi.fn(),
}));

vi.mock("@/modules/product-types/actions/update-product-type", () => ({
	updateProductType: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("react", async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await vi.importActual<typeof import("react")>("react");
	return {
		...actual,
		useActionState: (_action: unknown, _initial: unknown) => [undefined, vi.fn(), false],
	};
});

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => <div className={className}>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="submit-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p data-testid="required-fields-note">* Champs obligatoires</p>,
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		AppField: ({
			children,
			name,
		}: {
			children: (field: {
				name: string;
				state: { value: unknown };
				InputField: (props: Record<string, unknown>) => React.ReactNode;
				TextareaField: (props: Record<string, unknown>) => React.ReactNode;
			}) => React.ReactNode;
			name: string;
			validators?: unknown;
		}) =>
			children({
				name,
				state: { value: "" },
				InputField: ({
					label,
					type,
					placeholder,
				}: {
					label?: string;
					type?: string;
					placeholder?: string;
				}) => (
					<input
						data-testid={`field-${name}`}
						aria-label={label as string | undefined}
						type={type}
						placeholder={placeholder as string | undefined}
					/>
				),
				TextareaField: ({ label }: { label?: string; placeholder?: string; rows?: number }) => (
					<textarea data-testid={`field-${name}`} aria-label={label as string | undefined} />
				),
			}),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (values: unknown) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown;
		}) => {
			const mockState = { canSubmit: true };
			const selected = selector(mockState as Record<string, unknown>);
			return <>{children(selected)}</>;
		},
		reset: vi.fn(),
	}),
}));

import { ProductTypeFormDialog, PRODUCT_TYPE_DIALOG_ID } from "../product-type-form-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypeFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogState = {
			isOpen: true,
			close: vi.fn(),
			data: null,
		};
	});

	// ─── Dialog ID export ──────────────────────────────────────────────────────

	it("exports PRODUCT_TYPE_DIALOG_ID", () => {
		expect(PRODUCT_TYPE_DIALOG_ID).toBe("product-type-form");
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };
		render(<ProductTypeFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("renders dialog when open", () => {
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	// ─── Create mode ──────────────────────────────────────────────────────────

	it("shows 'Créer un type de produit' title in create mode", () => {
		render(<ProductTypeFormDialog />);
		expect(screen.getByText("Créer un type de produit")).toBeInTheDocument();
	});

	it("shows create mode description", () => {
		render(<ProductTypeFormDialog />);
		expect(
			screen.getByText("Ajoutez un nouveau type pour catégoriser vos produits."),
		).toBeInTheDocument();
	});

	it("shows 'Créer' on submit button in create mode", () => {
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Créer");
	});

	it("does not show hidden id input in create mode", () => {
		const { container } = render(<ProductTypeFormDialog />);
		const hiddenInput = container.querySelector('input[name="id"]');
		expect(hiddenInput).toBeNull();
	});

	// ─── Update mode ──────────────────────────────────────────────────────────

	it("shows 'Modifier le type de produit' title in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				productType: {
					id: "pt-1",
					label: "Colliers",
					description: "Types de colliers",
					slug: "colliers",
				},
			},
		};
		render(<ProductTypeFormDialog />);
		expect(screen.getByText("Modifier le type de produit")).toBeInTheDocument();
	});

	it("shows update mode description", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				productType: {
					id: "pt-1",
					label: "Colliers",
					description: "Types de colliers",
					slug: "colliers",
				},
			},
		};
		render(<ProductTypeFormDialog />);
		expect(
			screen.getByText(
				"Modifiez les informations du type. Les changements seront appliqués à tous les produits utilisant ce type.",
			),
		).toBeInTheDocument();
	});

	it("shows 'Enregistrer' on submit button in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				productType: {
					id: "pt-1",
					label: "Colliers",
					description: "Types de colliers",
					slug: "colliers",
				},
			},
		};
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Enregistrer");
	});

	it("shows hidden id input in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				productType: {
					id: "pt-42",
					label: "Colliers",
					description: null,
					slug: "colliers",
				},
			},
		};
		const { container } = render(<ProductTypeFormDialog />);
		const hiddenInput = container.querySelector('input[name="id"]') as HTMLInputElement | null;
		expect(hiddenInput).not.toBeNull();
		expect(hiddenInput?.value).toBe("pt-42");
	});

	// ─── Form fields ──────────────────────────────────────────────────────────

	it("shows required fields note", () => {
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("required-fields-note")).toBeInTheDocument();
	});

	it("renders label field", () => {
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("field-label")).toBeInTheDocument();
	});

	it("renders description field", () => {
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("field-description")).toBeInTheDocument();
	});
});
