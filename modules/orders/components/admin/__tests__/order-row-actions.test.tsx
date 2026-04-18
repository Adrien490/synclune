import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock functions
// ---------------------------------------------------------------------------
const { mockGetOrderPermissions, mockUseAlertDialog, mockUseDialog, mockResend } = vi.hoisted(
	() => {
		return {
			mockGetOrderPermissions: vi.fn(),
			mockUseAlertDialog: vi.fn(),
			mockUseDialog: vi.fn(),
			mockResend: vi.fn(),
		};
	},
);

// ---------------------------------------------------------------------------
// Mocks - must be declared before component import
// ---------------------------------------------------------------------------

vi.mock("@/app/generated/prisma/browser", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
	} as const,
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	} as const,
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	} as const,
}));

vi.mock("@/modules/orders/services/order-status-validation.service", () => ({
	getOrderPermissions: mockGetOrderPermissions,
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: mockUseAlertDialog,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: mockUseDialog,
}));

vi.mock("@/modules/orders/hooks/use-resend-order-email", () => ({
	useResendOrderEmail: () => ({ resend: mockResend, isPending: false }),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	CreditCard: () => <svg data-testid="icon-credit-card" />,
	Eye: () => <svg data-testid="icon-eye" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	Mail: () => <svg data-testid="icon-mail" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis-vertical" />,
	Package: () => <svg data-testid="icon-package" />,
	PackageCheck: () => <svg data-testid="icon-package-check" />,
	PackageX: () => <svg data-testid="icon-package-x" />,
	RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
	ShoppingBag: () => <svg data-testid="icon-shopping-bag" />,
	StickyNote: () => <svg data-testid="icon-sticky-note" />,
	Trash2: () => <svg data-testid="icon-trash2" />,
	Truck: () => <svg data-testid="icon-truck" />,
	Undo2: () => <svg data-testid="icon-undo2" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} className={className} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

// Dialog ID sibling mocks
vi.mock("../cancel-order-alert-dialog", () => ({ CANCEL_ORDER_DIALOG_ID: "cancel-order" }));
vi.mock("../delete-order-alert-dialog", () => ({ DELETE_ORDER_DIALOG_ID: "delete-order" }));
vi.mock("../mark-as-paid-alert-dialog", () => ({ MARK_AS_PAID_DIALOG_ID: "mark-as-paid" }));
vi.mock("../mark-as-shipped-dialog", () => ({ MARK_AS_SHIPPED_DIALOG_ID: "mark-as-shipped" }));
vi.mock("../mark-as-delivered-alert-dialog", () => ({
	MARK_AS_DELIVERED_DIALOG_ID: "mark-as-delivered",
}));
vi.mock("../mark-as-processing-alert-dialog", () => ({
	MARK_AS_PROCESSING_DIALOG_ID: "mark-as-processing",
}));
vi.mock("../revert-to-processing-dialog", () => ({
	REVERT_TO_PROCESSING_DIALOG_ID: "revert-to-processing",
}));
vi.mock("../mark-as-returned-alert-dialog", () => ({
	MARK_AS_RETURNED_DIALOG_ID: "mark-as-returned",
}));
vi.mock("../order-notes-dialog", () => ({ ORDER_NOTES_DIALOG_ID: "order-notes" }));

// ---------------------------------------------------------------------------
// Component import — after all mocks
// ---------------------------------------------------------------------------
import { OrderRowActions } from "../order-row-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		status: "PENDING" as const,
		paymentStatus: "PENDING" as const,
		fulfillmentStatus: null,
		trackingNumber: null,
		trackingUrl: null,
		...overrides,
	};
}

function createPermissions(overrides: Record<string, boolean> = {}) {
	return {
		canMarkAsPaid: false,
		canCancel: false,
		canMarkAsShipped: false,
		canMarkAsDelivered: false,
		canRefund: false,
		canMarkAsProcessing: false,
		canRevertToProcessing: false,
		canMarkAsReturned: false,
		...overrides,
	};
}

function makeDialogStore() {
	return { isOpen: false, data: null, open: vi.fn(), close: vi.fn() };
}

function setupMocks(permissions: Record<string, boolean> = {}) {
	mockGetOrderPermissions.mockReturnValue(createPermissions(permissions));
	mockUseAlertDialog.mockReturnValue(makeDialogStore());
	mockUseDialog.mockReturnValue(makeDialogStore());
}

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OrderRowActions", () => {
	describe("rendering", () => {
		it("renders trigger button with aria-label containing order number", () => {
			setupMocks();
			render(<OrderRowActions order={createOrder({ orderNumber: "CMD-042" })} />);
			expect(
				screen.getByRole("button", { name: /Actions pour la commande CMD-042/ }),
			).toBeInTheDocument();
		});

		it("always shows 'Voir les détails' link", () => {
			setupMocks();
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Voir les détails")).toBeInTheDocument();
		});

		it("always shows 'Notes internes' menu item", () => {
			setupMocks();
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Notes internes")).toBeInTheDocument();
		});

		it("always shows 'Renvoyer un email' submenu trigger", () => {
			setupMocks();
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Renvoyer un email")).toBeInTheDocument();
		});
	});

	describe("conditional items - permissions", () => {
		it("shows 'Marquer comme payée' when canMarkAsPaid is true", () => {
			setupMocks({ canMarkAsPaid: true });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Marquer comme payée")).toBeInTheDocument();
		});

		it("hides 'Marquer comme payée' when canMarkAsPaid is false", () => {
			setupMocks({ canMarkAsPaid: false });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.queryByText("Marquer comme payée")).not.toBeInTheDocument();
		});

		it("shows 'Passer en préparation' when canMarkAsProcessing is true", () => {
			setupMocks({ canMarkAsProcessing: true });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Passer en préparation")).toBeInTheDocument();
		});

		it("shows 'Marquer comme expédiée' when canMarkAsShipped is true", () => {
			setupMocks({ canMarkAsShipped: true });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Marquer comme expédiée")).toBeInTheDocument();
		});

		it("shows 'Marquer comme livrée' when canMarkAsDelivered is true", () => {
			setupMocks({ canMarkAsDelivered: true });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Marquer comme livrée")).toBeInTheDocument();
		});

		it('shows "Annuler l\'expédition" when canRevertToProcessing is true', () => {
			setupMocks({ canRevertToProcessing: true });
			render(<OrderRowActions order={createOrder({ status: "SHIPPED" as const })} />);
			expect(screen.getByText("Annuler l'expédition")).toBeInTheDocument();
		});

		it("shows 'Créer un remboursement' when canRefund is true", () => {
			setupMocks({ canRefund: true });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Créer un remboursement")).toBeInTheDocument();
		});
	});

	describe("derived permissions - tracking", () => {
		it("shows 'Suivre le colis' when status is SHIPPED and trackingUrl exists", () => {
			setupMocks();
			render(
				<OrderRowActions
					order={createOrder({
						status: "SHIPPED" as const,
						trackingUrl: "https://tracking.example.com/123",
					})}
				/>,
			);
			expect(screen.getByText("Suivre le colis")).toBeInTheDocument();
		});

		it("hides 'Suivre le colis' when trackingUrl is null", () => {
			setupMocks();
			render(
				<OrderRowActions order={createOrder({ status: "SHIPPED" as const, trackingUrl: null })} />,
			);
			expect(screen.queryByText("Suivre le colis")).not.toBeInTheDocument();
		});
	});

	describe("derived permissions - returned", () => {
		it("shows 'Marquer comme retourné' when status is DELIVERED and fulfillmentStatus is not RETURNED", () => {
			setupMocks({ canMarkAsReturned: true });
			render(
				<OrderRowActions
					order={createOrder({
						status: "DELIVERED" as const,
						fulfillmentStatus: "DELIVERED" as const,
					})}
				/>,
			);
			expect(screen.getByText("Marquer comme retourné")).toBeInTheDocument();
		});

		it("hides 'Marquer comme retourné' when fulfillmentStatus is RETURNED", () => {
			setupMocks({ canMarkAsReturned: false });
			render(
				<OrderRowActions
					order={createOrder({
						status: "DELIVERED" as const,
						fulfillmentStatus: "RETURNED" as const,
					})}
				/>,
			);
			expect(screen.queryByText("Marquer comme retourné")).not.toBeInTheDocument();
		});
	});

	describe("delete logic", () => {
		it("shows 'Supprimer' when paymentStatus is PENDING (never paid)", () => {
			setupMocks();
			render(<OrderRowActions order={createOrder({ paymentStatus: "PENDING" as const })} />);
			expect(screen.getByText("Supprimer")).toBeInTheDocument();
		});

		it("hides 'Supprimer' when paymentStatus is PAID", () => {
			setupMocks();
			render(<OrderRowActions order={createOrder({ paymentStatus: "PAID" as const })} />);
			expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
		});
	});

	describe("cancel section", () => {
		it("shows 'Annuler la commande' when canCancel is true", () => {
			setupMocks({ canCancel: true });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.getByText("Annuler la commande")).toBeInTheDocument();
		});
	});
});
