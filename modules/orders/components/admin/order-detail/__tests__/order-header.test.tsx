import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderHeader } from "../order-header";

const { mockPermissions, mockAlertDialogOpen, mockDialogOpen } = vi.hoisted(() => ({
	mockPermissions: {
		canMarkAsPaid: false,
		canMarkAsShipped: false,
		canMarkAsDelivered: false,
		canRefund: false,
		canUpdateTracking: false,
		canCancel: false,
		canRevertToProcessing: false,
		canMarkAsProcessing: false,
		canMarkAsReturned: false,
	},
	mockAlertDialogOpen: vi.fn(),
	mockDialogOpen: vi.fn(),
}));

vi.mock("@/modules/orders/services/order-status-validation.service", () => ({
	getOrderPermissions: () => mockPermissions,
}));
vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockAlertDialogOpen, close: vi.fn(), isOpen: false, data: null }),
}));
vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockDialogOpen, close: vi.fn(), isOpen: false, data: null }),
}));
vi.mock("@/app/generated/prisma/browser", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
	},
	PaymentStatus: { PENDING: "PENDING", PAID: "PAID" },
	FulfillmentStatus: { UNFULFILLED: "UNFULFILLED", RETURNED: "RETURNED", DELIVERED: "DELIVERED" },
}));

vi.mock("@/modules/orders/components/admin/cancel-order-alert-dialog", () => ({
	CANCEL_ORDER_DIALOG_ID: "cancel",
}));
vi.mock("@/modules/orders/components/admin/mark-as-paid-alert-dialog", () => ({
	MARK_AS_PAID_DIALOG_ID: "paid",
}));
vi.mock("@/modules/orders/components/admin/mark-as-shipped-dialog", () => ({
	MARK_AS_SHIPPED_DIALOG_ID: "shipped",
}));
vi.mock("@/modules/orders/components/admin/mark-as-delivered-alert-dialog", () => ({
	MARK_AS_DELIVERED_DIALOG_ID: "delivered",
}));
vi.mock("@/modules/orders/components/admin/update-tracking-dialog", () => ({
	UPDATE_TRACKING_DIALOG_ID: "tracking",
}));
vi.mock("@/modules/orders/components/admin/order-notes-dialog", () => ({
	ORDER_NOTES_DIALOG_ID: "notes",
}));
vi.mock("@/modules/orders/components/admin/resend-email-dialog", () => ({
	RESEND_EMAIL_DIALOG_ID: "resend",
}));
vi.mock("@/modules/orders/components/admin/mark-as-returned-alert-dialog", () => ({
	MARK_AS_RETURNED_DIALOG_ID: "returned",
}));
vi.mock("@/modules/orders/components/admin/revert-to-processing-dialog", () => ({
	REVERT_TO_PROCESSING_DIALOG_ID: "revert",
}));
vi.mock("@/modules/orders/components/admin/order-detail/types", () => ({}));
vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getCarrierLabel: (c: string) => c,
}));

vi.mock("date-fns", () => ({
	format: () => "1 mars 2026 à 10h00",
	formatDistanceToNow: () => "il y a 2 jours",
}));
vi.mock("date-fns/locale", () => ({ fr: {} }));

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => {
	const stub = () => <svg />;
	return {
		CircleCheck: stub,
		CreditCard: stub,
		Download: stub,
		Edit: stub,
		Mail: stub,
		Ellipsis: stub,
		PackageX: stub,
		RotateCcw: stub,
		StickyNote: stub,
		Truck: stub,
		Undo2: stub,
		CircleX: stub,
	};
});

vi.mock("@/modules/orders/actions/export-single-order", () => ({
	exportSingleOrder: vi.fn(),
}));
vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));
vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: any) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
	DropdownMenuItem: ({ children, onClick, asChild: _asChild, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/modules/orders/utils/carrier.utils", () => ({}));

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		status: "PENDING",
		paymentStatus: "PENDING",
		fulfillmentStatus: "UNFULFILLED",
		trackingNumber: null,
		trackingUrl: null,
		shippingCarrier: null,
		createdAt: new Date("2026-03-01T10:00:00Z"),
		...overrides,
	} as Parameters<typeof OrderHeader>[0]["order"];
}

describe("OrderHeader", () => {
	beforeEach(() => {
		mockPermissions.canMarkAsPaid = false;
		mockPermissions.canMarkAsShipped = false;
		mockPermissions.canMarkAsDelivered = false;
		mockPermissions.canRefund = false;
		mockPermissions.canUpdateTracking = false;
		mockPermissions.canCancel = false;
		mockPermissions.canRevertToProcessing = false;
		mockPermissions.canMarkAsProcessing = false;
		mockPermissions.canMarkAsReturned = false;
		mockAlertDialogOpen.mockReset();
		mockDialogOpen.mockReset();
	});

	afterEach(cleanup);

	it("renders order number", () => {
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Commande CMD-001")).toBeInTheDocument();
	});

	it("renders creation date", () => {
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText(/1 mars 2026 à 10h00/)).toBeInTheDocument();
	});

	it('shows "Marquer payée" button when canMarkAsPaid', () => {
		mockPermissions.canMarkAsPaid = true;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Marquer payée")).toBeInTheDocument();
	});

	it('hides "Marquer payée" button when not canMarkAsPaid', () => {
		mockPermissions.canMarkAsPaid = false;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.queryByText("Marquer payée")).toBeNull();
	});

	it('shows "Marquer expédiée" when canMarkAsShipped', () => {
		mockPermissions.canMarkAsShipped = true;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Marquer expédiée")).toBeInTheDocument();
	});

	it('shows "Marquer livrée" when canMarkAsDelivered', () => {
		mockPermissions.canMarkAsDelivered = true;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Marquer livrée")).toBeInTheDocument();
	});

	it('shows "Notes" in dropdown', () => {
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Notes")).toBeInTheDocument();
	});

	it('shows notes count "Notes (3)" when notesCount > 0', () => {
		render(<OrderHeader order={createOrder()} notesCount={3} />);
		expect(screen.getByText("Notes (3)")).toBeInTheDocument();
	});

	it('shows "Renvoyer un email" in dropdown', () => {
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Renvoyer un email")).toBeInTheDocument();
	});

	it('shows "Modifier le suivi" when canUpdateTracking', () => {
		mockPermissions.canUpdateTracking = true;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Modifier le suivi")).toBeInTheDocument();
	});

	it('shows "Créer un remboursement" when canRefund', () => {
		mockPermissions.canRefund = true;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Créer un remboursement")).toBeInTheDocument();
	});

	it('shows "Marquer retournée" when DELIVERED and not RETURNED', () => {
		mockPermissions.canMarkAsReturned = true;
		render(
			<OrderHeader
				order={createOrder({ status: "DELIVERED", fulfillmentStatus: "DELIVERED" })}
				notesCount={0}
			/>,
		);
		expect(screen.getByText("Marquer retournée")).toBeInTheDocument();
	});

	it('hides "Marquer retournée" when fulfillmentStatus is RETURNED', () => {
		mockPermissions.canMarkAsReturned = false;
		render(
			<OrderHeader
				order={createOrder({ status: "DELIVERED", fulfillmentStatus: "RETURNED" })}
				notesCount={0}
			/>,
		);
		expect(screen.queryByText("Marquer retournée")).toBeNull();
	});

	it('shows "Annuler l\'expédition" when canRevertToProcessing', () => {
		mockPermissions.canRevertToProcessing = true;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Annuler l'expédition")).toBeInTheDocument();
	});

	it('shows "Annuler la commande" when canCancel', () => {
		mockPermissions.canCancel = true;
		render(<OrderHeader order={createOrder()} notesCount={0} />);
		expect(screen.getByText("Annuler la commande")).toBeInTheDocument();
	});
});
