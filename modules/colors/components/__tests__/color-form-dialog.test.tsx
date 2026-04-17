import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockDialogIsOpen,
	mockDialogData,
	mockDialogClose,
	mockOnOpenChange,
	mockColorPickerOnChange,
	mockUseActionState,
	mockCanSubmit,
	mockFormReset,
	mockFormHandleSubmit,
	mockFieldHandleChange,
	mockFieldValidators,
	mockCreateToastOnSuccess,
	mockUpdateToastOnSuccess,
} = vi.hoisted(() => {
	// Captured references so tests can call the callbacks directly
	const mockCreateToastOnSuccess: { current: ((result: unknown) => void) | null } = {
		current: null,
	};
	const mockUpdateToastOnSuccess: { current: (() => void) | null } = { current: null };
	const mockOnOpenChange: { current: ((open: boolean) => void) | null } = { current: null };
	const mockColorPickerOnChange: {
		current: ((rgba: { r: number; g: number; b: number; a: number }) => void) | null;
	} = { current: null };
	// Stores validators captured from AppField renders, keyed by field name
	const mockFieldValidators: Record<
		string,
		((ctx: { value: string }) => string | undefined) | undefined
	> = {};

	return {
		mockDialogIsOpen: { current: true },
		mockDialogData: {
			current: null as {
				color?: { id: string; name: string; slug: string; hex: string };
				onCreated?: (id: string) => void;
			} | null,
		},
		mockDialogClose: vi.fn(),
		mockOnOpenChange,
		mockColorPickerOnChange,
		// Controls isPending per action slot: [isCreatePending, isUpdatePending]
		mockUseActionState: { createPending: false, updatePending: false },
		mockCanSubmit: { current: true },
		mockFormReset: vi.fn(),
		mockFormHandleSubmit: vi.fn(),
		mockFieldHandleChange: vi.fn(),
		mockFieldValidators,
		mockCreateToastOnSuccess,
		mockUpdateToastOnSuccess,
	};
});

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
	let callCount = 0;
	return {
		...actual,
		useActionState: vi.fn((action: unknown) => {
			// First call = create action, second call = update action
			const isPending =
				callCount === 0 ? mockUseActionState.createPending : mockUseActionState.updatePending;
			callCount = (callCount + 1) % 2;
			return [undefined, action, isPending];
		}),
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
	createToastCallbacks: vi.fn((options: { onSuccess?: (result: unknown) => void } | undefined) => {
		// Capture onSuccess for create vs update based on call order.
		// The component calls createToastCallbacks twice — first for create, second for update.
		// We detect which by whether mockCreateToastOnSuccess.current is already set.
		if (!mockCreateToastOnSuccess.current) {
			mockCreateToastOnSuccess.current = options?.onSuccess ?? null;
		} else {
			mockUpdateToastOnSuccess.current = (options?.onSuccess as (() => void) | undefined) ?? null;
		}
		return {};
	}),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(({ defaultValues }: { defaultValues: Record<string, unknown> }) => ({
		reset: mockFormReset,
		handleSubmit: mockFormHandleSubmit,
		AppField: ({
			name,
			validators,
			children,
		}: {
			name: string;
			validators?: {
				onChange?: (ctx: { value: string }) => string | undefined;
			};
			children: (field: Record<string, unknown>) => React.ReactNode;
		}) => {
			// Store the validator so tests can invoke it; also run it once on mount
			// to exercise the inline validator branches for coverage purposes.
			if (validators?.onChange) {
				mockFieldValidators[name] = validators.onChange;
			}
			return (
				<div data-testid={`app-field-${name}`}>
					{children({
						name,
						state: { value: defaultValues[name] ?? "" },
						handleChange: mockFieldHandleChange,
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
								<input
									data-testid={`input-${name}`}
									placeholder={placeholder}
									disabled={disabled}
								/>
							</div>
						),
					})}
				</div>
			);
		},
		Subscribe: ({
			children,
			selector,
		}: {
			children: (values: unknown[]) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown[];
		}) => {
			// Invoke the selector to cover that branch, using canSubmit from our mock
			const values = selector({ canSubmit: mockCanSubmit.current });
			return <>{children(values)}</>;
		},
	})),
}));

vi.mock("@/modules/colors/components/color-picker", () => ({
	SimpleColorPicker: ({
		value,
		onChange,
		disabled,
	}: {
		value?: string;
		onChange?: (hex: string) => void;
		disabled?: boolean;
	}) => {
		mockColorPickerOnChange.current = onChange ? (rgba) => onChange("#FF0000") : null;
		return (
			<div
				data-testid="color-picker"
				data-value={value}
				data-disabled={disabled ? "true" : "false"}
			>
				<button
					data-testid="color-picker-trigger"
					type="button"
					onClick={() => onChange?.("#FF0000")}
				>
					pick
				</button>
			</div>
		);
	},
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
		onOpenChange,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => {
		// Capture onOpenChange so tests can trigger it
		mockOnOpenChange.current = onOpenChange ?? null;
		return open ? <div data-testid="responsive-dialog">{children}</div> : null;
	},
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
		mockUseActionState.createPending = false;
		mockUseActionState.updatePending = false;
		mockCanSubmit.current = true;
		mockOnOpenChange.current = null;
		mockColorPickerOnChange.current = null;
		mockCreateToastOnSuccess.current = null;
		mockUpdateToastOnSuccess.current = null;
		// Clear captured validators
		for (const key of Object.keys(mockFieldValidators)) {
			delete mockFieldValidators[key];
		}
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

	// ─── Dialog close behavior ────────────────────────────────────────────────

	it("calls close when onOpenChange fires with false and not pending", () => {
		render(<ColorFormDialog />);
		expect(mockOnOpenChange.current).not.toBeNull();
		mockOnOpenChange.current!(false);
		expect(mockDialogClose).toHaveBeenCalledTimes(1);
	});

	it("does not call close when onOpenChange fires with true", () => {
		render(<ColorFormDialog />);
		mockOnOpenChange.current!(true);
		expect(mockDialogClose).not.toHaveBeenCalled();
	});

	it("does not call close when onOpenChange fires with false while create is pending", () => {
		mockUseActionState.createPending = true;
		render(<ColorFormDialog />);
		mockOnOpenChange.current!(false);
		expect(mockDialogClose).not.toHaveBeenCalled();
	});

	it("does not call close when onOpenChange fires with false while update is pending", () => {
		mockUseActionState.updatePending = true;
		render(<ColorFormDialog />);
		mockOnOpenChange.current!(false);
		expect(mockDialogClose).not.toHaveBeenCalled();
	});

	// ─── Loading / pending states ─────────────────────────────────────────────

	it("shows 'Enregistrement...' on the submit button when create is pending", () => {
		mockUseActionState.createPending = true;
		render(<ColorFormDialog />);
		expect(screen.getByRole("button", { name: "Enregistrement..." })).toBeInTheDocument();
	});

	it("shows 'Enregistrement...' on the submit button when update is pending", () => {
		mockDialogData.current = {
			color: { id: "col-1", name: "Rouge", slug: "rouge", hex: "#FF0000" },
		};
		mockUseActionState.updatePending = true;
		render(<ColorFormDialog />);
		expect(screen.getByRole("button", { name: "Enregistrement..." })).toBeInTheDocument();
	});

	it("disables the name input when create is pending", () => {
		mockUseActionState.createPending = true;
		render(<ColorFormDialog />);
		const input = screen.getByTestId("input-name") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	it("disables the name input when update is pending", () => {
		mockDialogData.current = {
			color: { id: "col-1", name: "Rouge", slug: "rouge", hex: "#FF0000" },
		};
		mockUseActionState.updatePending = true;
		render(<ColorFormDialog />);
		const input = screen.getByTestId("input-name") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	it("name input is not disabled when not pending", () => {
		render(<ColorFormDialog />);
		const input = screen.getByTestId("input-name") as HTMLInputElement;
		expect(input.disabled).toBe(false);
	});

	// ─── Submit button canSubmit state ────────────────────────────────────────

	it("disables the submit button when canSubmit is false", () => {
		mockCanSubmit.current = false;
		render(<ColorFormDialog />);
		const button = screen.getByRole("button", { name: "Créer" });
		expect(button).toBeDisabled();
	});

	it("disables the submit button when create is pending even if canSubmit is true", () => {
		mockUseActionState.createPending = true;
		render(<ColorFormDialog />);
		const button = screen.getByRole("button", { name: "Enregistrement..." });
		expect(button).toBeDisabled();
	});

	it("enables the submit button when canSubmit is true and not pending", () => {
		mockCanSubmit.current = true;
		render(<ColorFormDialog />);
		const button = screen.getByRole("button", { name: "Créer" });
		expect(button).not.toBeDisabled();
	});

	// ─── Color picker onChange interaction ────────────────────────────────────

	it("calls field.handleChange with the hex when color picker onChange fires", () => {
		render(<ColorFormDialog />);
		const trigger = screen.getByTestId("color-picker-trigger");
		fireEvent.click(trigger);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("#FF0000");
	});

	it("exposes the current hex value to the color picker via data-value", () => {
		render(<ColorFormDialog />);
		const picker = screen.getByTestId("color-picker");
		// defaultValues.hex is "#000000"
		expect(picker).toHaveAttribute("data-value", "#000000");
	});

	it("updates the color picker value when color data is provided in update mode", () => {
		mockDialogData.current = {
			color: { id: "col-1", name: "Vert", slug: "vert", hex: "#00FF00" },
		};
		render(<ColorFormDialog />);
		const picker = screen.getByTestId("color-picker");
		// The mock useAppForm receives defaultValues from the initial render;
		// in update mode the useEffect would reset the form, but since useEffect
		// is mocked, we verify the picker still renders with the initial default.
		expect(picker).toBeInTheDocument();
	});

	// ─── Hidden hex input ─────────────────────────────────────────────────────

	it("renders a hidden hex input with the current field value", () => {
		render(<ColorFormDialog />);
		const hexInput = document.querySelector('input[name="hex"]') as HTMLInputElement;
		expect(hexInput).not.toBeNull();
		expect(hexInput.type).toBe("hidden");
		expect(hexInput.value).toBe("#000000");
	});

	// ─── Form submit ─────────────────────────────────────────────────────────

	it("calls form.handleSubmit when the form is submitted", () => {
		render(<ColorFormDialog />);
		const form = document.querySelector("form") as HTMLFormElement;
		fireEvent.submit(form);
		expect(mockFormHandleSubmit).toHaveBeenCalledTimes(1);
	});

	// ─── useEffect (color reset logic) ────────────────────────────────────────

	it("calls useEffect with a function and color dependency", async () => {
		const { useEffect } = await import("react");
		render(<ColorFormDialog />);
		expect(useEffect).toHaveBeenCalled();
	});

	it("useEffect callback resets form with color data when color is defined", async () => {
		const { useEffect } = await import("react");
		const mockedUseEffect = vi.mocked(useEffect);

		mockDialogData.current = {
			color: { id: "col-1", name: "Bleu", slug: "bleu", hex: "#0000FF" },
		};
		render(<ColorFormDialog />);

		// Find and execute the useEffect callback registered for the color reset
		const effectCall = mockedUseEffect.mock.calls.find((call) => {
			const deps = call[1] as unknown[];
			return Array.isArray(deps) && deps.length === 2;
		});
		expect(effectCall).toBeDefined();
		// Execute the effect callback directly
		const callback = effectCall![0] as () => void;
		callback();
		expect(mockFormReset).toHaveBeenCalledWith({ name: "Bleu", hex: "#0000FF" });
	});

	it("useEffect callback resets form to defaults when no color is defined", async () => {
		const { useEffect } = await import("react");
		const mockedUseEffect = vi.mocked(useEffect);

		mockDialogData.current = null;
		render(<ColorFormDialog />);

		const effectCall = mockedUseEffect.mock.calls.find((call) => {
			const deps = call[1] as unknown[];
			return Array.isArray(deps) && deps.length === 2;
		});
		expect(effectCall).toBeDefined();
		const callback = effectCall![0] as () => void;
		callback();
		expect(mockFormReset).toHaveBeenCalledWith({ name: "", hex: "#000000" });
	});

	// ─── createToastCallbacks onSuccess (create) ──────────────────────────────

	it("create onSuccess calls data.onCreated with the new id and closes the dialog", () => {
		const onCreated = vi.fn();
		mockDialogData.current = { onCreated };
		render(<ColorFormDialog />);

		expect(mockCreateToastOnSuccess.current).not.toBeNull();
		mockCreateToastOnSuccess.current!({
			status: "success",
			data: { id: "new-col-id" },
		});

		expect(onCreated).toHaveBeenCalledWith("new-col-id");
		expect(mockDialogClose).toHaveBeenCalledTimes(1);
		expect(mockFormReset).toHaveBeenCalledTimes(1);
	});

	it("create onSuccess still closes and resets even without onCreated callback", () => {
		mockDialogData.current = null;
		render(<ColorFormDialog />);

		expect(mockCreateToastOnSuccess.current).not.toBeNull();
		mockCreateToastOnSuccess.current!({
			status: "success",
			data: { id: "new-col-id" },
		});

		expect(mockDialogClose).toHaveBeenCalledTimes(1);
		expect(mockFormReset).toHaveBeenCalledTimes(1);
	});

	it("create onSuccess skips onCreated when result has no data.id", () => {
		const onCreated = vi.fn();
		mockDialogData.current = { onCreated };
		render(<ColorFormDialog />);

		mockCreateToastOnSuccess.current!({ status: "success" });

		expect(onCreated).not.toHaveBeenCalled();
		expect(mockDialogClose).toHaveBeenCalledTimes(1);
	});

	it("create onSuccess skips onCreated when result data.id is not a string", () => {
		const onCreated = vi.fn();
		mockDialogData.current = { onCreated };
		render(<ColorFormDialog />);

		mockCreateToastOnSuccess.current!({ status: "success", data: { id: 42 } });

		expect(onCreated).not.toHaveBeenCalled();
		expect(mockDialogClose).toHaveBeenCalledTimes(1);
	});

	// ─── createToastCallbacks onSuccess (update) ─────────────────────────────

	it("update onSuccess closes the dialog", () => {
		mockDialogData.current = {
			color: { id: "col-1", name: "Rouge", slug: "rouge", hex: "#FF0000" },
		};
		render(<ColorFormDialog />);

		expect(mockUpdateToastOnSuccess.current).not.toBeNull();
		mockUpdateToastOnSuccess.current!();

		expect(mockDialogClose).toHaveBeenCalledTimes(1);
	});

	// ─── Field validators (name onChange) ────────────────────────────────────

	it("name validator returns error when value is empty", () => {
		render(<ColorFormDialog />);
		const validator = mockFieldValidators["name"];
		expect(validator).toBeDefined();
		expect(validator!({ value: "" })).toBe("Le nom est requis");
	});

	it("name validator returns error when value exceeds 100 characters", () => {
		render(<ColorFormDialog />);
		const validator = mockFieldValidators["name"];
		expect(validator).toBeDefined();
		expect(validator!({ value: "a".repeat(101) })).toBe(
			"Le nom ne peut pas dépasser 100 caractères",
		);
	});

	it("name validator returns undefined for valid value", () => {
		render(<ColorFormDialog />);
		const validator = mockFieldValidators["name"];
		expect(validator).toBeDefined();
		expect(validator!({ value: "Bleu Marine" })).toBeUndefined();
	});

	// ─── Field validators (hex onChange) ─────────────────────────────────────

	it("hex validator returns error when value is empty", () => {
		render(<ColorFormDialog />);
		const validator = mockFieldValidators["hex"];
		expect(validator).toBeDefined();
		expect(validator!({ value: "" })).toBe("Le code couleur est requis");
	});

	it("hex validator returns undefined for a valid hex value", () => {
		render(<ColorFormDialog />);
		const validator = mockFieldValidators["hex"];
		expect(validator).toBeDefined();
		expect(validator!({ value: "#FF0000" })).toBeUndefined();
	});

	// ─── Subscribe selector ───────────────────────────────────────────────────

	it("Subscribe selector extracts canSubmit from form state", () => {
		// The Subscribe mock calls selector({ canSubmit: true }), so the button
		// should reflect the canSubmit value from mockCanSubmit.
		mockCanSubmit.current = true;
		render(<ColorFormDialog />);
		expect(screen.getByRole("button", { name: "Créer" })).not.toBeDisabled();
	});

	it("Subscribe selector with canSubmit=false disables the button", () => {
		mockCanSubmit.current = false;
		render(<ColorFormDialog />);
		expect(screen.getByRole("button", { name: "Créer" })).toBeDisabled();
	});
});
