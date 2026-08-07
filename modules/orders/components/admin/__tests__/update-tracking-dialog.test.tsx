import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTrackingDialog } from "../update-tracking-dialog";

const { mockDialog, mockFormStore, mockFormHook, mockPush } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: false,
		data: null as any,
		open: vi.fn(),
		close: vi.fn(),
	},
	mockFormStore: {
		trackingNumber: "",
		carrier: "colissimo",
		trackingUrl: "",
		sendEmail: true,
		customUrlMode: false,
	},
	mockFormHook: {
		setFieldValue: vi.fn(),
		isPending: false,
		action: vi.fn(),
	},
	mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: (fn: () => void) => fn(),
}));

vi.mock("@/shared/components/admin-form-footer", () => ({
	AdminFormFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-update-tracking-form", () => ({
	useUpdateTrackingForm: () => ({
		form: {
			store: {},
			setFieldValue: mockFormHook.setFieldValue,
			state: { isValid: true, isSubmitting: false },
			handleSubmit: () => Promise.resolve(),
			// Le numéro de suivi est rendu via `form.AppField` + `field.InputField` :
			// le mock reproduit le contrat minimal du field component (label lié par
			// htmlFor, input id/name = nom du champ, description sous le champ).
			// Contrat de saisie : c'est le COMPOSANT qui porte le binding (l'appelant
			// ne peut plus passer `onChange`, Omit du type) — représenté ici par
			// `setFieldValue` — et l'effet de bord de l'appelant passe par
			// `listeners.onChange` sur l'AppField.
			AppField: ({
				name,
				children,
				listeners,
			}: {
				name: string;
				children: (field: Record<string, unknown>) => React.ReactNode;
				listeners?: { onChange?: (payload: { value: string }) => void };
			}) =>
				children({
					InputField: ({
						label,
						required: _required,
						optional: _optional,
						description,
						...props
					}: any) => (
						<div>
							<label htmlFor={name}>{label}</label>
							<input
								id={name}
								name={name}
								value={(mockFormStore as Record<string, any>)[name] ?? ""}
								onChange={(e) => {
									mockFormHook.setFieldValue(name, e.target.value);
									listeners?.onChange?.({ value: e.target.value });
								}}
								{...props}
							/>
							{description ? <p>{description}</p> : null}
						</div>
					),
				}),
		},
		action: mockFormHook.action,
		isPending: mockFormHook.isPending,
	}),
}));

vi.mock("@tanstack/react-form", () => ({
	useStore: (_store: any, selector: (s: any) => any) => selector({ values: mockFormStore }),
}));

vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	CARRIERS: [
		{ value: "colissimo", label: "Colissimo" },
		{ value: "chronopost", label: "Chronopost" },
		{ value: "autre", label: "Autre transporteur" },
	],
	detectCarrierAndUrl: vi.fn(() => ({
		carrier: "colissimo",
		url: "https://track.colissimo.fr/123",
	})),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
		open ? <div data-testid="dialog">{children}</div> : null,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, type, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} type={type} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({ readOnly, ...props }: any) => <input readOnly={readOnly} {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ id, checked, onCheckedChange, disabled }: any) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			disabled={disabled}
		/>
	),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children, onValueChange }: any) => (
		<button data-testid="select" onClick={() => onValueChange?.("chronopost")}>
			{children}
		</button>
	),
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
	SelectTrigger: ({ children, id }: any) => <div id={id}>{children}</div>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p>* Champs obligatoires</p>,
}));

vi.mock("@phosphor-icons/react/ssr", () => {
	const stub = () => <svg />;
	return {
		CheckCircleIcon: stub,
		ArrowSquareOutIcon: stub,
		LinkIcon: stub,
		SpinnerIcon: stub,
		EnvelopeIcon: stub,
		TruckIcon: stub,
	};
});

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: () => <button type="button" data-testid="copy-button" />,
}));

vi.mock("@/shared/components/ui/kbd", () => ({
	Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/shared/hooks/use-unsaved-changes", () => ({
	useUnsavedChanges: () => ({ allowNavigation: vi.fn() }),
}));

vi.mock("@/shared/hooks/use-focus-first-error", () => ({
	useFocusFirstError: () => ({
		formRef: { current: null },
		focusFirstInvalid: vi.fn(),
		onInvalidCapture: vi.fn(),
	}),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
}));

function openDialog(
	orderId = "order-1",
	orderNumber = "CMD-001",
	extra: Record<string, unknown> = {},
) {
	mockDialog.isOpen = true;
	mockDialog.data = { orderId, orderNumber, ...extra };
}

describe("UpdateTrackingDialog", () => {
	beforeEach(() => {
		mockDialog.isOpen = false;
		mockDialog.data = null;
		mockDialog.open.mockReset();
		mockDialog.close.mockReset();
		mockFormStore.trackingNumber = "";
		mockFormStore.carrier = "colissimo";
		mockFormStore.trackingUrl = "";
		mockFormStore.sendEmail = true;
		mockFormStore.customUrlMode = false;
		mockFormHook.setFieldValue.mockReset();
		mockFormHook.action.mockReset();
		mockFormHook.isPending = false;
	});

	afterEach(cleanup);

	// --- Visibility ---

	it("renders nothing when dialog is closed", () => {
		render(<UpdateTrackingDialog />);
		expect(screen.queryByTestId("dialog")).toBeNull();
	});

	it("renders nothing when data is null even if open", () => {
		mockDialog.isOpen = true;
		mockDialog.data = null;
		render(<UpdateTrackingDialog />);
		expect(screen.queryByLabelText(/Numéro de suivi/)).toBeNull();
	});

	it('shows title "Modifier le suivi" when open with data', () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Modifier le suivi")).toBeInTheDocument();
	});

	it("shows order number in description", () => {
		openDialog("order-1", "CMD-042");
		render(<UpdateTrackingDialog />);
		const matches = screen.getAllByText("CMD-042");
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});

	// --- Form fields rendering ---

	it("renders tracking number input with correct placeholder", () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		const input = screen.getByPlaceholderText("Ex : 8N00234567890");
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute("id", "trackingNumber");
	});

	it("renders tracking number label with required marker", () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByLabelText(/Numéro de suivi/)).toBeInTheDocument();
	});

	it("renders carrier select section", () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Transporteur")).toBeInTheDocument();
	});

	it("renders all carrier options", () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Colissimo")).toBeInTheDocument();
		expect(screen.getByText("Chronopost")).toBeInTheDocument();
		expect(screen.getByText("Autre transporteur")).toBeInTheDocument();
	});

	it("renders tracking URL input", () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByLabelText(/URL de suivi/)).toBeInTheDocument();
	});

	it("renders custom URL mode checkbox", () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByLabelText(/URL personnalisée/)).toBeInTheDocument();
	});

	it("renders required fields note", () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("* Champs obligatoires")).toBeInTheDocument();
	});

	it("renders hidden field for orderId", () => {
		openDialog("order-99", "CMD-099");
		render(<UpdateTrackingDialog />);
		const hiddenId = document.querySelector('input[type="hidden"][name="id"]') as HTMLInputElement;
		expect(hiddenId).not.toBeNull();
		expect(hiddenId.value).toBe("order-99");
	});

	// --- URL field read-only vs editable ---

	it('shows "(générée)" label suffix when URL is not editable', () => {
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "colissimo";
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByText(/\(générée\)/)).toBeInTheDocument();
	});

	it("URL input is read-only when not in custom mode and carrier is not autre", () => {
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "colissimo";
		openDialog();
		render(<UpdateTrackingDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/) as HTMLInputElement;
		expect(urlInput.readOnly).toBe(true);
	});

	it("URL input is editable when customUrlMode is true", () => {
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<UpdateTrackingDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/) as HTMLInputElement;
		expect(urlInput.readOnly).toBe(false);
	});

	it("URL input is editable when carrier is autre", () => {
		mockFormStore.carrier = "autre";
		mockFormStore.customUrlMode = false;
		openDialog();
		render(<UpdateTrackingDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/) as HTMLInputElement;
		expect(urlInput.readOnly).toBe(false);
	});

	it('URL label has no "(générée)" when in custom URL mode', () => {
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.queryByText(/\(générée\)/)).toBeNull();
	});

	// --- Carrier "autre" warning ---

	it('shows amber warning when carrier is "autre" and trackingUrl is empty', () => {
		mockFormStore.carrier = "autre";
		mockFormStore.trackingUrl = "";
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(
			screen.getByText("Saisissez l'URL de suivi manuellement pour ce transporteur."),
		).toBeInTheDocument();
	});

	it('does not show amber warning when carrier is "autre" but trackingUrl is filled', () => {
		mockFormStore.carrier = "autre";
		mockFormStore.trackingUrl = "https://example.com/track";
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(
			screen.queryByText("Saisissez l'URL de suivi manuellement pour ce transporteur."),
		).toBeNull();
	});

	// --- Auto-detection hint ---

	it("shows auto-detection hint when trackingNumber >= 8 chars, auto mode, different from initial, carrier not autre", () => {
		mockFormStore.trackingNumber = "8N00234567890";
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "colissimo";
		openDialog("order-1", "CMD-001");
		render(<UpdateTrackingDialog />);
		expect(screen.getByText(/Détecté automatiquement.*Colissimo/)).toBeInTheDocument();
	});

	it("does not show auto-detection hint when trackingNumber equals initialTrackingNumber", () => {
		mockFormStore.trackingNumber = "8N00234567890";
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "colissimo";
		openDialog("order-1", "CMD-001", { trackingNumber: "8N00234567890" });
		render(<UpdateTrackingDialog />);
		expect(screen.queryByText(/Détecté automatiquement/)).toBeNull();
	});

	it("does not show auto-detection hint when trackingNumber < 8 chars", () => {
		mockFormStore.trackingNumber = "1234567";
		mockFormStore.customUrlMode = false;
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.queryByText(/Détecté automatiquement/)).toBeNull();
	});

	it("does not show auto-detection hint when customUrlMode is true", () => {
		mockFormStore.trackingNumber = "8N00234567890";
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.queryByText(/Détecté automatiquement/)).toBeNull();
	});

	it('does not show auto-detection hint when carrier is "autre"', () => {
		mockFormStore.trackingNumber = "8N00234567890";
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "autre";
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.queryByText(/Détecté automatiquement/)).toBeNull();
	});

	// --- Submit button state ---

	it('shows "Enregistrer le suivi" when not pending', () => {
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Enregistrer le suivi")).toBeInTheDocument();
	});

	it('shows "Mise à jour…" when isPending is true', () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Mise à jour…")).toBeInTheDocument();
		expect(screen.queryByText("Enregistrer le suivi")).toBeNull();
	});

	it("submit button is disabled when trackingNumber is empty", () => {
		mockFormStore.trackingNumber = "";
		openDialog();
		render(<UpdateTrackingDialog />);
		const submitBtn = screen.getByText("Enregistrer le suivi").closest("button");
		expect(submitBtn).toBeDisabled();
	});

	it("submit button is disabled when trackingNumber is whitespace only", () => {
		mockFormStore.trackingNumber = "   ";
		openDialog();
		render(<UpdateTrackingDialog />);
		const submitBtn = screen.getByText("Enregistrer le suivi").closest("button");
		expect(submitBtn).toBeDisabled();
	});

	it("submit button is enabled when trackingNumber has content", () => {
		mockFormStore.trackingNumber = "8N00234567890";
		openDialog();
		render(<UpdateTrackingDialog />);
		const submitBtn = screen.getByText("Enregistrer le suivi").closest("button");
		expect(submitBtn).not.toBeDisabled();
	});

	it("submit button is disabled when isPending even with valid trackingNumber", () => {
		mockFormHook.isPending = true;
		mockFormStore.trackingNumber = "8N00234567890";
		openDialog();
		render(<UpdateTrackingDialog />);
		const submitBtn = screen.getByText("Mise à jour…").closest("button");
		expect(submitBtn).toBeDisabled();
	});

	// --- Loading states ---

	it("tracking number input is disabled when isPending", () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<UpdateTrackingDialog />);
		const input = screen.getByPlaceholderText("Ex : 8N00234567890");
		expect(input).toBeDisabled();
	});

	it("custom URL checkbox is disabled when isPending", () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<UpdateTrackingDialog />);
		const checkbox = screen.getByRole("checkbox", { name: /URL personnalisée/ });
		expect(checkbox).toBeDisabled();
	});

	// --- Checkbox state reflection ---

	it("custom URL checkbox is checked when customUrlMode is true", () => {
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<UpdateTrackingDialog />);
		const checkbox = screen.getByRole("checkbox", {
			name: /URL personnalisée/,
		}) as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
	});

	// --- Interactions ---

	it("calls setFieldValue with trackingNumber on input change", async () => {
		const user = userEvent.setup();
		mockFormStore.trackingNumber = "";
		openDialog();
		render(<UpdateTrackingDialog />);
		const input = screen.getByPlaceholderText("Ex : 8N00234567890");
		await user.type(input, "A");
		expect(mockFormHook.setFieldValue).toHaveBeenCalledWith("trackingNumber", expect.any(String));
	});

	it("calls setFieldValue with customUrlMode when custom URL checkbox toggled", async () => {
		const user = userEvent.setup();
		mockFormStore.customUrlMode = false;
		openDialog();
		render(<UpdateTrackingDialog />);
		const checkbox = screen.getByRole("checkbox", { name: /URL personnalisée/ });
		await user.click(checkbox);
		expect(mockFormHook.setFieldValue).toHaveBeenCalledWith("customUrlMode", true);
	});

	it("calls setFieldValue with trackingUrl when URL input changes in editable mode", async () => {
		const user = userEvent.setup();
		mockFormStore.customUrlMode = true;
		mockFormStore.trackingUrl = "";
		openDialog();
		render(<UpdateTrackingDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/);
		await user.type(urlInput, "h");
		expect(mockFormHook.setFieldValue).toHaveBeenCalledWith("trackingUrl", expect.any(String));
	});
});
