import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkAsShippedDialog } from "../mark-as-shipped-dialog";

const { mockDialog, mockFormStore } = vi.hoisted(() => ({
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
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-mark-as-shipped-form", () => ({
	useMarkAsShippedForm: () => ({
		form: { store: {}, setFieldValue: vi.fn() },
		action: vi.fn(),
		isPending: false,
	}),
}));

vi.mock("@tanstack/react-form", () => ({
	useStore: (_store: any, selector: (s: any) => any) => selector({ values: mockFormStore }),
}));

vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	CARRIERS: [
		{ value: "colissimo", label: "Colissimo" },
		{ value: "chronopost", label: "Chronopost" },
		{ value: "autre", label: "Autre" },
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
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: any) => <input {...props} />,
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
	Select: ({ children }: any) => <div>{children}</div>,
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
	SelectTrigger: ({ children, id }: any) => <div id={id}>{children}</div>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p>* Champs obligatoires</p>,
}));

vi.mock("lucide-react", () => {
	const stub = () => <svg />;
	return { Link2: stub, Mail: stub, Truck: stub };
});

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
	});

	afterEach(cleanup);

	it("renders nothing when dialog is closed", () => {
		mockDialog.isOpen = false;
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
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Marquer comme expédiée")).toBeInTheDocument();
	});

	it("shows order number", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-099" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("CMD-099")).toBeInTheDocument();
	});

	it("shows tracking number input", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/Numéro de suivi/)).toBeInTheDocument();
	});

	it("shows carrier select", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Transporteur")).toBeInTheDocument();
	});

	it("shows tracking URL input", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/URL de suivi/)).toBeInTheDocument();
	});

	it("shows custom URL mode checkbox", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/URL personnalisée/)).toBeInTheDocument();
	});

	it('shows send email checkbox with "Envoyer l\'email de confirmation"', () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByLabelText(/Envoyer l'email de confirmation/)).toBeInTheDocument();
	});

	it('shows "Valider l\'expédition" submit button', () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<MarkAsShippedDialog />);
		expect(screen.getByText("Valider l'expédition")).toBeInTheDocument();
	});
});
