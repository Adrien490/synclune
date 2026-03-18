import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockReset } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockReset: vi.fn(),
}));

let mockDialogState: {
	isOpen: boolean;
	close: typeof mockClose;
	data: {
		material?: {
			id: string;
			name: string;
			slug: string;
			description: string | null;
			isActive: boolean;
		};
	} | null;
} = {
	isOpen: true,
	close: mockClose,
	data: null,
};

let mockCreatePending = false;
let mockUpdatePending = false;

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: (_action: unknown, _initial: unknown) => {
			const isPending = mockCreatePending || mockUpdatePending;
			return [undefined, vi.fn(), isPending];
		},
	};
});

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		reset: mockReset,
		handleSubmit: vi.fn(),
		AppField: ({
			children,
			name,
		}: {
			children: (field: Record<string, unknown>) => React.ReactNode;
			name: string;
		}) => (
			<div data-testid={`field-${name}`}>
				{children({
					InputField: ({
						label,
						placeholder,
						disabled,
						required,
					}: {
						label?: string;
						placeholder?: string;
						disabled?: boolean;
						required?: boolean;
					}) => (
						<div>
							{label && <label>{label}</label>}
							<input
								data-testid={`input-${name}`}
								placeholder={placeholder}
								disabled={disabled}
								required={required}
							/>
						</div>
					),
					TextareaField: ({
						label,
						placeholder,
						disabled,
					}: {
						label?: string;
						placeholder?: string;
						disabled?: boolean;
						rows?: number;
					}) => (
						<div>
							{label && <label>{label}</label>}
							<textarea
								data-testid={`textarea-${name}`}
								placeholder={placeholder}
								disabled={disabled}
							/>
						</div>
					),
				})}
			</div>
		),
		Subscribe: ({
			children,
		}: {
			children: (values: unknown[]) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown[];
		}) => <>{children([true])}</>,
	}),
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
		<button disabled={disabled} type={type as "submit" | "button" | undefined}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <div data-testid="required-fields-note" />,
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/modules/materials/actions/create-material", () => ({
	createMaterial: vi.fn(),
}));

vi.mock("@/modules/materials/actions/update-material", () => ({
	updateMaterial: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { MaterialFormDialog } from "../material-form-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function createMaterial(overrides = {}) {
	return {
		id: "mat-1",
		name: "Argent 925",
		slug: "argent-925",
		description: "Argent sterling",
		isActive: true,
		...overrides,
	};
}

beforeEach(() => {
	mockCreatePending = false;
	mockUpdatePending = false;
	mockDialogState = { isOpen: true, close: mockClose, data: null };
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("MaterialFormDialog", () => {
	// ─── Dialog rendering ──────────────────────────────────────────────────────

	it("renders the dialog when open", () => {
		render(<MaterialFormDialog />);
		expect(screen.getByTestId("dialog")).toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };
		render(<MaterialFormDialog />);
		expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
	});

	// ─── Create mode ──────────────────────────────────────────────────────────

	it("shows 'Créer un matériau' title in create mode", () => {
		render(<MaterialFormDialog />);
		expect(screen.getByText("Créer un matériau")).toBeInTheDocument();
	});

	it("shows 'Créer' button text in create mode", () => {
		render(<MaterialFormDialog />);
		expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
	});

	it("does not render hidden id input in create mode", () => {
		const { container } = render(<MaterialFormDialog />);
		expect(container.querySelector('input[name="id"]')).toBeNull();
	});

	// ─── Update mode ──────────────────────────────────────────────────────────

	it("shows 'Modifier le matériau' title in update mode", () => {
		mockDialogState = { ...mockDialogState, data: { material: createMaterial() } };
		render(<MaterialFormDialog />);
		expect(screen.getByText("Modifier le matériau")).toBeInTheDocument();
	});

	it("shows 'Enregistrer' button text in update mode", () => {
		mockDialogState = { ...mockDialogState, data: { material: createMaterial() } };
		render(<MaterialFormDialog />);
		expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
	});

	it("renders a hidden id input with the material id in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: { material: createMaterial({ id: "mat-42" }) },
		};
		render(<MaterialFormDialog />);
		const hiddenInput = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(hiddenInput).not.toBeNull();
		expect(hiddenInput.value).toBe("mat-42");
	});

	it("renders a hidden isActive input in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: { material: createMaterial({ isActive: true }) },
		};
		render(<MaterialFormDialog />);
		const hiddenInput = document.querySelector('input[name="isActive"]') as HTMLInputElement;
		expect(hiddenInput).not.toBeNull();
		expect(hiddenInput.value).toBe("true");
	});

	// ─── Form fields ──────────────────────────────────────────────────────────

	it("renders the name form field", () => {
		render(<MaterialFormDialog />);
		expect(screen.getByTestId("field-name")).toBeInTheDocument();
	});

	it("renders the description form field", () => {
		render(<MaterialFormDialog />);
		expect(screen.getByTestId("field-description")).toBeInTheDocument();
	});

	it("renders the required fields note", () => {
		render(<MaterialFormDialog />);
		expect(screen.getByTestId("required-fields-note")).toBeInTheDocument();
	});

	// ─── Loading state ────────────────────────────────────────────────────────

	it("shows 'Enregistrement...' when create is pending", () => {
		mockCreatePending = true;
		render(<MaterialFormDialog />);
		expect(screen.getByRole("button")).toHaveTextContent("Enregistrement...");
	});

	it("shows 'Enregistrement...' when update is pending", () => {
		mockUpdatePending = true;
		mockDialogState = { ...mockDialogState, data: { material: createMaterial() } };
		render(<MaterialFormDialog />);
		expect(screen.getByRole("button")).toHaveTextContent("Enregistrement...");
	});

	it("disables the submit button when pending", () => {
		mockCreatePending = true;
		render(<MaterialFormDialog />);
		expect(screen.getByRole("button")).toBeDisabled();
	});
});
