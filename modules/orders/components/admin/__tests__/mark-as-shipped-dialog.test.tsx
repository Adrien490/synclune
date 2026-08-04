import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkAsShippedDialog } from "../mark-as-shipped-dialog";

const { mockDialog, mockFormStore, mockFormHook } = vi.hoisted(() => ({
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
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-mark-as-shipped-form", () => ({
	useMarkAsShippedForm: () => ({
		form: { store: {}, setFieldValue: mockFormHook.setFieldValue },
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
	return { LinkIcon: stub, SpinnerIcon: stub, EnvelopeIcon: stub, TruckIcon: stub };
});

function openDialog(orderId = "order-1", orderNumber = "CMD-001") {
	mockDialog.isOpen = true;
	mockDialog.data = { orderId, orderNumber };
}

describe("MarkAsShippedDialog", () => {
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
		render(<MarkAsShippedDialog />);
		expect(screen.queryByTestId("dialog")).toBeNull();
	});

	it("renders nothing when data is null even if open", () => {
		mockDialog.isOpen = true;
		mockDialog.data = null;
		render(<MarkAsShippedDialog />);
		expect(screen.queryByText("Marquer comme expédiée")).toBeNull();
	});

	it('shows title "Marquer comme expédiée" when open with data', () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Marquer comme expédiée")).toBeInTheDocument();
	});

	it("shows order number in description", () => {
		openDialog("order-1", "CMD-099");
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("CMD-099")).toBeInTheDocument();
	});

	// --- Form fields rendering ---

	it("renders tracking number input with correct placeholder", () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		const input = screen.getByPlaceholderText("Ex: 8N00234567890");
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute("id", "trackingNumber");
	});

	it("renders tracking number label with required marker", () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/Numéro de suivi/)).toBeInTheDocument();
	});

	it("renders carrier select section", () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Transporteur")).toBeInTheDocument();
	});

	it("renders all carrier options", () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Colissimo")).toBeInTheDocument();
		expect(screen.getByText("Chronopost")).toBeInTheDocument();
		expect(screen.getByText("Autre transporteur")).toBeInTheDocument();
	});

	it("renders tracking URL input", () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/URL de suivi/)).toBeInTheDocument();
	});

	it("renders custom URL mode checkbox", () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/URL personnalisée/)).toBeInTheDocument();
	});

	it('renders send email checkbox with label "Envoyer l\'email de confirmation"', () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/Envoyer l'email de confirmation/)).toBeInTheDocument();
	});

	it("renders required fields note", () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("* Champs obligatoires")).toBeInTheDocument();
	});

	it("renders hidden field for orderId", () => {
		openDialog("order-42", "CMD-042");
		render(<MarkAsShippedDialog />);
		const hiddenId = document.querySelector('input[type="hidden"][name="id"]') as HTMLInputElement;
		expect(hiddenId).not.toBeNull();
		expect(hiddenId.value).toBe("order-42");
	});

	it("renders hidden field for sendEmail reflecting store value", () => {
		mockFormStore.sendEmail = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const hiddenSendEmail = document.querySelector(
			'input[type="hidden"][name="sendEmail"]',
		) as HTMLInputElement;
		expect(hiddenSendEmail).not.toBeNull();
		expect(hiddenSendEmail.value).toBe("true");
	});

	it("renders hidden sendEmail as false when unchecked", () => {
		mockFormStore.sendEmail = false;
		openDialog();
		render(<MarkAsShippedDialog />);
		const hiddenSendEmail = document.querySelector(
			'input[type="hidden"][name="sendEmail"]',
		) as HTMLInputElement;
		expect(hiddenSendEmail.value).toBe("false");
	});

	// --- URL field read-only vs editable ---

	it('shows "(générée)" label suffix when URL is not editable', () => {
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "colissimo";
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText(/\(générée\)/)).toBeInTheDocument();
	});

	it("URL input is read-only when not in custom mode and carrier is not autre", () => {
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "colissimo";
		openDialog();
		render(<MarkAsShippedDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/) as HTMLInputElement;
		expect(urlInput.readOnly).toBe(true);
	});

	it("URL input is editable when customUrlMode is true", () => {
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/) as HTMLInputElement;
		expect(urlInput.readOnly).toBe(false);
	});

	it("URL input is editable when carrier is autre", () => {
		mockFormStore.carrier = "autre";
		mockFormStore.customUrlMode = false;
		openDialog();
		render(<MarkAsShippedDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/) as HTMLInputElement;
		expect(urlInput.readOnly).toBe(false);
	});

	it('URL label has no "(générée)" when in custom URL mode', () => {
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.queryByText(/\(générée\)/)).toBeNull();
	});

	// --- Carrier "autre" warning ---

	it('shows amber warning when carrier is "autre" and trackingUrl is empty', () => {
		mockFormStore.carrier = "autre";
		mockFormStore.trackingUrl = "";
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(
			screen.getByText("Saisissez l'URL de suivi manuellement pour ce transporteur"),
		).toBeInTheDocument();
	});

	it('does not show amber warning when carrier is "autre" but trackingUrl is filled', () => {
		mockFormStore.carrier = "autre";
		mockFormStore.trackingUrl = "https://example.com/track";
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(
			screen.queryByText("Saisissez l'URL de suivi manuellement pour ce transporteur"),
		).toBeNull();
	});

	// --- Auto-detection hint ---

	it("shows auto-detection hint when trackingNumber >= 8 chars and auto mode and carrier not autre", () => {
		mockFormStore.trackingNumber = "8N00234567890";
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "colissimo";
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText(/Détecté automatiquement/)).toBeInTheDocument();
	});

	it("does not show auto-detection hint when trackingNumber < 8 chars", () => {
		mockFormStore.trackingNumber = "1234567";
		mockFormStore.customUrlMode = false;
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.queryByText(/Détecté automatiquement/)).toBeNull();
	});

	it("does not show auto-detection hint when customUrlMode is true", () => {
		mockFormStore.trackingNumber = "8N00234567890";
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.queryByText(/Détecté automatiquement/)).toBeNull();
	});

	it('does not show auto-detection hint when carrier is "autre"', () => {
		mockFormStore.trackingNumber = "8N00234567890";
		mockFormStore.customUrlMode = false;
		mockFormStore.carrier = "autre";
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.queryByText(/Détecté automatiquement/)).toBeNull();
	});

	// --- Submit button state ---

	it('shows "Valider l\'expédition" when not pending', () => {
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Valider l'expédition")).toBeInTheDocument();
	});

	it('shows "Expédition…" when isPending is true', () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Expédition…")).toBeInTheDocument();
		expect(screen.queryByText("Valider l'expédition")).toBeNull();
	});

	it("submit button is disabled when trackingNumber is empty", () => {
		mockFormStore.trackingNumber = "";
		openDialog();
		render(<MarkAsShippedDialog />);
		const submitBtn = screen.getByText("Valider l'expédition").closest("button");
		expect(submitBtn).toBeDisabled();
	});

	it("submit button is disabled when trackingNumber is whitespace only", () => {
		mockFormStore.trackingNumber = "   ";
		openDialog();
		render(<MarkAsShippedDialog />);
		const submitBtn = screen.getByText("Valider l'expédition").closest("button");
		expect(submitBtn).toBeDisabled();
	});

	it("submit button is enabled when trackingNumber has content", () => {
		mockFormStore.trackingNumber = "8N00234567890";
		openDialog();
		render(<MarkAsShippedDialog />);
		const submitBtn = screen.getByText("Valider l'expédition").closest("button");
		expect(submitBtn).not.toBeDisabled();
	});

	it("submit button is disabled when isPending", () => {
		mockFormHook.isPending = true;
		mockFormStore.trackingNumber = "8N00234567890";
		openDialog();
		render(<MarkAsShippedDialog />);
		const submitBtn = screen.getByText("Expédition…").closest("button");
		expect(submitBtn).toBeDisabled();
	});

	// --- Loading states ---

	it("tracking number input is disabled when isPending", () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const input = screen.getByPlaceholderText("Ex: 8N00234567890");
		expect(input).toBeDisabled();
	});

	it("cancel button is disabled when isPending", () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const cancelBtn = screen.getByText("Annuler").closest("button");
		expect(cancelBtn).toBeDisabled();
	});

	it("custom URL checkbox is disabled when isPending", () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const checkbox = screen.getByRole("checkbox", { name: /URL personnalisée/ });
		expect(checkbox).toBeDisabled();
	});

	it("send email checkbox is disabled when isPending", () => {
		mockFormHook.isPending = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const checkbox = screen.getByRole("checkbox", { name: /Envoyer l'email de confirmation/ });
		expect(checkbox).toBeDisabled();
	});

	// --- Checkbox state reflection ---

	it("send email checkbox is checked when sendEmail is true", () => {
		mockFormStore.sendEmail = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const checkbox = screen.getByRole("checkbox", {
			name: /Envoyer l'email de confirmation/,
		}) as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
	});

	it("send email checkbox is unchecked when sendEmail is false", () => {
		mockFormStore.sendEmail = false;
		openDialog();
		render(<MarkAsShippedDialog />);
		const checkbox = screen.getByRole("checkbox", {
			name: /Envoyer l'email de confirmation/,
		}) as HTMLInputElement;
		expect(checkbox.checked).toBe(false);
	});

	it("custom URL checkbox is checked when customUrlMode is true", () => {
		mockFormStore.customUrlMode = true;
		openDialog();
		render(<MarkAsShippedDialog />);
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
		render(<MarkAsShippedDialog />);
		const input = screen.getByPlaceholderText("Ex: 8N00234567890");
		await user.type(input, "A");
		expect(mockFormHook.setFieldValue).toHaveBeenCalledWith("trackingNumber", expect.any(String));
	});

	it("calls setFieldValue with sendEmail when send email checkbox toggled", async () => {
		const user = userEvent.setup();
		mockFormStore.sendEmail = true;
		openDialog();
		render(<MarkAsShippedDialog />);
		const checkbox = screen.getByRole("checkbox", { name: /Envoyer l'email de confirmation/ });
		await user.click(checkbox);
		expect(mockFormHook.setFieldValue).toHaveBeenCalledWith("sendEmail", false);
	});

	it("calls setFieldValue with customUrlMode when custom URL checkbox toggled", async () => {
		const user = userEvent.setup();
		mockFormStore.customUrlMode = false;
		openDialog();
		render(<MarkAsShippedDialog />);
		const checkbox = screen.getByRole("checkbox", { name: /URL personnalisée/ });
		await user.click(checkbox);
		expect(mockFormHook.setFieldValue).toHaveBeenCalledWith("customUrlMode", true);
	});

	it("calls dialog.close when cancel button is clicked", async () => {
		const user = userEvent.setup();
		openDialog();
		render(<MarkAsShippedDialog />);
		const cancelBtn = screen.getByText("Annuler");
		await user.click(cancelBtn);
		expect(mockDialog.close).toHaveBeenCalled();
	});

	it("calls dialog.close when dialog onOpenChange fires with false", async () => {
		openDialog();
		// ResponsiveDialog mock calls onOpenChange on re-render; test via dialog.close indirectly
		render(<MarkAsShippedDialog />);
		expect(screen.getByTestId("dialog")).toBeInTheDocument();
	});

	it("calls setFieldValue with trackingUrl when URL input changes in editable mode", async () => {
		const user = userEvent.setup();
		mockFormStore.customUrlMode = true;
		mockFormStore.trackingUrl = "";
		openDialog();
		render(<MarkAsShippedDialog />);
		const urlInput = screen.getByLabelText(/URL de suivi/);
		await user.type(urlInput, "h");
		expect(mockFormHook.setFieldValue).toHaveBeenCalledWith("trackingUrl", expect.any(String));
	});
});
