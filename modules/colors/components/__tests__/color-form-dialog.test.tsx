import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogIsOpen, mockDialogData, mockDialogClose } = vi.hoisted(() => ({
	mockDialogIsOpen: { current: true },
	mockDialogData: {
		current: null as {
			color?: { id: string; name: string; slug: string; hex: string };
			onCreated?: (id: string) => void;
		} | null,
	},
	mockDialogClose: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockDialogIsOpen.current,
		close: mockDialogClose,
		data: mockDialogData.current,
	}),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof React>();
	return {
		...actual,
		useActionState: vi.fn((action: unknown) => [undefined, action, false]),
		useEffect: vi.fn(),
	};
});

vi.mock("@/modules/colors/actions/create-color", () => ({
	createColor: vi.fn(),
}));

vi.mock("@/modules/colors/actions/update-color", () => ({
	updateColor: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(({ defaultValues }: { defaultValues: Record<string, unknown> }) => ({
		reset: vi.fn(),
		handleSubmit: vi.fn(),
		AppField: ({
			name,
			children,
		}: {
			name: string;
			children: (field: Record<string, unknown>) => React.ReactNode;
		}) => (
			<div data-testid={`app-field-${name}`}>
				{children({
					name,
					state: { value: defaultValues[name] ?? "" },
					handleChange: vi.fn(),
					InputField: ({
						label,
						placeholder,
						required,
						disabled,
					}: {
						label?: string;
						placeholder?: string;
						required?: boolean;
						disabled?: boolean;
					}) => (
						<div>
							{label && (
								<label>
									{label}
									{required && <span> *</span>}
								</label>
							)}
							<input data-testid={`input-${name}`} placeholder={placeholder} disabled={disabled} />
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
	})),
}));

vi.mock("@/modules/colors/components/color-picker", () => ({
	ColorPicker: ({
		children,
		value,
	}: {
		children: React.ReactNode;
		value?: string;
		onChange?: (rgba: { r: number; g: number; b: number; a: number }) => void;
		className?: string;
	}) => (
		<div data-testid="color-picker" data-value={value}>
			{children}
		</div>
	),
	ColorPickerSelection: ({ className }: { className?: string }) => (
		<div data-testid="color-picker-selection" />
	),
	ColorPickerHue: ({ className }: { className?: string }) => <div data-testid="color-picker-hue" />,
	ColorPickerFormat: ({ className }: { className?: string }) => (
		<div data-testid="color-picker-format" />
	),
	ColorPickerOutput: () => <div data-testid="color-picker-output" />,
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="responsive-dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-dialog-header">{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="responsive-dialog-title">{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="responsive-dialog-description">{children}</p>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p data-testid="required-fields-note">* Champs obligatoires</p>,
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
		<button disabled={disabled} type={type as "button" | "submit" | "reset"}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("color", () => ({
	default: {
		rgb: vi.fn(() => ({
			hex: vi.fn(() => "#FF0000"),
		})),
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { ColorFormDialog, COLOR_DIALOG_ID } from "../color-form-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
		mockDialogData.current = null;
	});

	// ─── Constants ────────────────────────────────────────────────────────────

	it("exports COLOR_DIALOG_ID constant", () => {
		expect(COLOR_DIALOG_ID).toBe("color-form");
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		render(<ColorFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("renders dialog content when dialog is open", () => {
		render(<ColorFormDialog />);
		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	// ─── Create mode ─────────────────────────────────────────────────────────

	it("shows 'Créer une couleur' title in create mode", () => {
		mockDialogData.current = null;
		render(<ColorFormDialog />);
		expect(screen.getByText("Créer une couleur")).toBeInTheDocument();
	});

	it("shows create mode description", () => {
		mockDialogData.current = null;
		render(<ColorFormDialog />);
		expect(screen.getByText("Ajoutez une nouvelle couleur au catalogue")).toBeInTheDocument();
	});

	it("renders 'Créer' submit button in create mode", () => {
		mockDialogData.current = null;
		render(<ColorFormDialog />);
		expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
	});

	// ─── Update mode ─────────────────────────────────────────────────────────

	it("shows 'Modifier la couleur' title in update mode", () => {
		mockDialogData.current = {
			color: { id: "col-1", name: "Rouge", slug: "rouge", hex: "#FF0000" },
		};
		render(<ColorFormDialog />);
		expect(screen.getByText("Modifier la couleur")).toBeInTheDocument();
	});

	it("shows update mode description", () => {
		mockDialogData.current = {
			color: { id: "col-1", name: "Rouge", slug: "rouge", hex: "#FF0000" },
		};
		render(<ColorFormDialog />);
		expect(screen.getByText("Modifiez le nom ou le code couleur")).toBeInTheDocument();
	});

	it("renders 'Enregistrer' submit button in update mode", () => {
		mockDialogData.current = {
			color: { id: "col-1", name: "Rouge", slug: "rouge", hex: "#FF0000" },
		};
		render(<ColorFormDialog />);
		expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
	});

	it("renders hidden id input in update mode", () => {
		mockDialogData.current = {
			color: { id: "col-42", name: "Bleu", slug: "bleu", hex: "#0000FF" },
		};
		render(<ColorFormDialog />);
		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("col-42");
	});

	it("does not render hidden id input in create mode", () => {
		mockDialogData.current = null;
		render(<ColorFormDialog />);
		const input = document.querySelector('input[name="id"]');
		expect(input).toBeNull();
	});

	// ─── Form fields ──────────────────────────────────────────────────────────

	it("renders the 'Nom' field", () => {
		render(<ColorFormDialog />);
		expect(screen.getByText("Nom")).toBeInTheDocument();
	});

	it("renders the 'Couleur' label", () => {
		render(<ColorFormDialog />);
		expect(screen.getByText("Couleur")).toBeInTheDocument();
	});

	it("renders the color picker", () => {
		render(<ColorFormDialog />);
		expect(screen.getByTestId("color-picker")).toBeInTheDocument();
	});

	it("renders the required fields note", () => {
		render(<ColorFormDialog />);
		expect(screen.getByTestId("required-fields-note")).toBeInTheDocument();
	});

	it("renders the name input with placeholder", () => {
		render(<ColorFormDialog />);
		expect(screen.getByPlaceholderText("ex: Rouge, Bleu Marine")).toBeInTheDocument();
	});

	// ─── Color picker sub-components ─────────────────────────────────────────

	it("renders the color picker selection, hue, format and output", () => {
		render(<ColorFormDialog />);
		expect(screen.getByTestId("color-picker-selection")).toBeInTheDocument();
		expect(screen.getByTestId("color-picker-hue")).toBeInTheDocument();
		expect(screen.getByTestId("color-picker-format")).toBeInTheDocument();
		expect(screen.getByTestId("color-picker-output")).toBeInTheDocument();
	});

	// ─── aria-live region for selected color ─────────────────────────────────

	it("has an aria-live region for the selected color announcement", () => {
		render(<ColorFormDialog />);
		const liveRegion = document.querySelector("[aria-live='polite']");
		expect(liveRegion).not.toBeNull();
	});
});
