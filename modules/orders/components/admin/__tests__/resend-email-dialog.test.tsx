import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockResend } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: false,
		data: null as {
			orderId: string;
			orderNumber: string;
			orderStatus: string;
			fulfillmentStatus: string;
			[key: string]: unknown;
		} | null,
		close: vi.fn(),
	},
	mockResend: vi.fn(),
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
	} as const,
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	} as const,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-resend-order-email", () => ({
	useResendOrderEmail: () => ({ resend: mockResend, isPending: false }),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
		<button {...(props as Record<string, unknown>)}>{children}</button>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		className?: string;
	}) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/shared/components/ui/radio-group", () => ({
	RadioGroup: ({
		children,
		value,
		onValueChange,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
		className?: string;
	}) => (
		<div data-testid="radio-group" data-value={value} onChange={() => onValueChange?.("")}>
			{children}
		</div>
	),
	RadioGroupItem: ({ value, id }: { value: string; id?: string; className?: string }) => (
		<input type="radio" id={id} value={value} onChange={() => {}} />
	),
}));

vi.mock("lucide-react", () => ({
	Mail: ({ className }: { className?: string; "aria-hidden"?: boolean }) => (
		<svg data-testid="icon-mail" className={className} aria-hidden={true} />
	),
	Truck: () => <svg data-testid="icon-truck" />,
	PackageCheck: () => <svg data-testid="icon-package-check" />,
}));

vi.mock("@/modules/orders/actions/resend-order-email", () => ({}));

import { ResendEmailDialog } from "../resend-email-dialog";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function openDialog(
	overrides: {
		orderId?: string;
		orderNumber?: string;
		orderStatus?: string;
		fulfillmentStatus?: string;
	} = {},
) {
	mockDialog.isOpen = true;
	mockDialog.data = {
		orderId: "order-1",
		orderNumber: "CMD-001",
		orderStatus: "PENDING",
		fulfillmentStatus: "UNFULFILLED",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("ResendEmailDialog", () => {
	describe("visibility", () => {
		it("renders nothing when dialog is closed", () => {
			mockDialog.isOpen = false;
			mockDialog.data = null;
			render(<ResendEmailDialog />);
			expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
		});

		it("shows title 'Renvoyer un email' when open", () => {
			openDialog();
			render(<ResendEmailDialog />);
			expect(screen.getByText("Renvoyer un email")).toBeInTheDocument();
		});

		it("shows order number in description", () => {
			openDialog({ orderNumber: "CMD-2026-042" });
			render(<ResendEmailDialog />);
			expect(screen.getByText("CMD-2026-042")).toBeInTheDocument();
		});
	});

	describe("email options availability", () => {
		it("always shows 'Confirmation de commande' option", () => {
			openDialog({ orderStatus: "PENDING" });
			render(<ResendEmailDialog />);
			expect(screen.getByText("Confirmation de commande")).toBeInTheDocument();
		});

		it('shows "Confirmation d\'expédition" when orderStatus is SHIPPED', () => {
			openDialog({ orderStatus: "SHIPPED", fulfillmentStatus: "SHIPPED" });
			render(<ResendEmailDialog />);
			expect(screen.getByText("Confirmation d'expédition")).toBeInTheDocument();
		});

		it("shows 'Confirmation de livraison' when orderStatus is DELIVERED", () => {
			openDialog({ orderStatus: "DELIVERED", fulfillmentStatus: "DELIVERED" });
			render(<ResendEmailDialog />);
			expect(screen.getByText("Confirmation de livraison")).toBeInTheDocument();
		});

		it("hides shipping option when orderStatus is PENDING", () => {
			openDialog({ orderStatus: "PENDING", fulfillmentStatus: "UNFULFILLED" });
			render(<ResendEmailDialog />);
			expect(screen.queryByText("Confirmation d'expédition")).not.toBeInTheDocument();
		});

		it("shows hint text when not all options are available (PENDING order)", () => {
			openDialog({ orderStatus: "PENDING", fulfillmentStatus: "UNFULFILLED" });
			render(<ResendEmailDialog />);
			expect(screen.getByText(/Certains emails ne sont pas disponibles/)).toBeInTheDocument();
		});

		it("hides hint text when all 3 options are available (DELIVERED order)", () => {
			openDialog({ orderStatus: "DELIVERED", fulfillmentStatus: "DELIVERED" });
			render(<ResendEmailDialog />);
			expect(screen.queryByText(/Certains emails ne sont pas disponibles/)).not.toBeInTheDocument();
		});
	});
});
