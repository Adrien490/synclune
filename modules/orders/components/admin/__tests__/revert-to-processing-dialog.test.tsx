import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RevertToProcessingDialog } from "../revert-to-processing-dialog";

const { mockDialog, mockAction } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: false,
		data: null as Record<string, unknown> | null,
		open: vi.fn(),
		close: vi.fn(),
	},
	mockAction: vi.fn(),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-revert-to-processing", () => ({
	useRevertToProcessing: () => ({ action: mockAction }),
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
	Button: ({ children, disabled, onClick, ...props }: any) => (
		<button disabled={disabled} onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="loader" />,
}));

describe("RevertToProcessingDialog", () => {
	beforeEach(() => {
		mockDialog.isOpen = false;
		mockDialog.data = null;
		mockDialog.open.mockReset();
		mockDialog.close.mockReset();
		mockAction.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it("renders nothing when dialog is closed", () => {
		mockDialog.isOpen = false;
		render(<RevertToProcessingDialog />);
		expect(screen.queryByTestId("dialog")).toBeNull();
	});

	it("renders the title when dialog is open", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		render(<RevertToProcessingDialog />);
		expect(screen.getByRole("heading", { name: "Annuler l'expédition" })).toBeInTheDocument();
	});

	it("shows the order number", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-042" };
		render(<RevertToProcessingDialog />);
		expect(screen.getByText("CMD-042")).toBeInTheDocument();
	});

	it("shows tracking number warning when trackingNumber exists", () => {
		mockDialog.isOpen = true;
		mockDialog.data = {
			orderId: "order-1",
			orderNumber: "CMD-042",
			trackingNumber: "1Z999AA10123456784",
		};
		render(<RevertToProcessingDialog />);
		expect(
			screen.getByText(/Le numéro de suivi \(1Z999AA10123456784\) sera supprimé/),
		).toBeInTheDocument();
	});

	it("hides tracking number warning when trackingNumber is null", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-042", trackingNumber: null };
		render(<RevertToProcessingDialog />);
		expect(screen.queryByText(/numéro de suivi/)).toBeNull();
	});

	it("reminds admin to notify the customer when a tracking number exists", () => {
		mockDialog.isOpen = true;
		mockDialog.data = {
			orderId: "order-1",
			orderNumber: "CMD-042",
			trackingNumber: "1Z999AA10123456784",
		};
		render(<RevertToProcessingDialog />);
		expect(screen.getByText(/Pensez à le prévenir manuellement/)).toBeInTheDocument();
	});

	it("hides the customer-notification reminder when trackingNumber is null", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-042", trackingNumber: null };
		render(<RevertToProcessingDialog />);
		expect(screen.queryByText(/Pensez à le prévenir manuellement/)).toBeNull();
	});

	it("shows the reason textarea", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-042" };
		render(<RevertToProcessingDialog />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("submit button is disabled when reason is empty", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-042" };
		render(<RevertToProcessingDialog />);
		const submitButton = screen.getByRole("button", { name: /Annuler l'expédition/ });
		expect(submitButton).toBeDisabled();
	});

	it("submit button is enabled after typing a reason", () => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-042" };
		render(<RevertToProcessingDialog />);
		const textarea = screen.getByRole("textbox");
		fireEvent.change(textarea, { target: { value: "Erreur d'adresse" } });
		const submitButton = screen.getByRole("button", { name: /Annuler l'expédition/ });
		expect(submitButton).not.toBeDisabled();
	});
});
