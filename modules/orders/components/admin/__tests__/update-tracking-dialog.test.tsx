import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTrackingDialog } from "../update-tracking-dialog";

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

vi.mock("@/modules/orders/hooks/use-update-tracking-form", () => ({
	useUpdateTrackingForm: () => ({
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
	});

	afterEach(cleanup);

	it("renders nothing when dialog is closed", () => {
		mockDialog.isOpen = false;
		render(<UpdateTrackingDialog />);
		expect(screen.queryByTestId("dialog")).toBeNull();
	});

	it("renders nothing when data is null even if open", () => {
		mockDialog.isOpen = true;
		mockDialog.data = null;
		render(<UpdateTrackingDialog />);
		expect(screen.queryByText("Modifier le suivi")).toBeNull();
	});

	it('shows title "Modifier le suivi" when open with data', () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Modifier le suivi")).toBeInTheDocument();
	});

	it("shows order number", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-042" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("CMD-042")).toBeInTheDocument();
	});

	it("shows tracking number input", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByLabelText(/Numéro de suivi/)).toBeInTheDocument();
	});

	it("shows carrier select", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Transporteur")).toBeInTheDocument();
	});

	it("shows tracking URL input", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByLabelText(/URL de suivi/)).toBeInTheDocument();
	});

	it("shows custom URL mode checkbox", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByLabelText(/URL personnalisée/)).toBeInTheDocument();
	});

	it("shows send email checkbox", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByLabelText(/Envoyer un email au client/)).toBeInTheDocument();
	});

	it('shows "Mettre à jour" submit button', () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<UpdateTrackingDialog />);
		expect(screen.getByText("Mettre à jour")).toBeInTheDocument();
	});
});
