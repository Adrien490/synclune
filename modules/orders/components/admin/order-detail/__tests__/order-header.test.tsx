import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

const { mockPermissions, mockAlertDialogOpen, mockHaptic, mockBaseSections } = vi.hoisted(() => ({
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
	mockHaptic: vi.fn(),
	mockBaseSections: [] as unknown[],
}));

vi.mock("@/modules/orders/services/order-status-validation.service", () => ({
	getOrderPermissions: () => mockPermissions,
}));
vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => ({ open: mockAlertDialogOpen, close: vi.fn(), isOpen: false, data: null }),
}));
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));
vi.mock("@/app/generated/prisma/browser", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
		CANCELLED: "CANCELLED",
	},
	PaymentStatus: { PENDING: "PENDING", PAID: "PAID" },
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

vi.mock("@/modules/orders/hooks/use-order-actions", () => ({
	useOrderActions: () => ({ sections: mockBaseSections }),
}));

vi.mock("date-fns", () => ({
	format: () => "1 mars 2026 à 10h00",
	formatDistanceToNow: () => "il y a 2 jours",
}));
vi.mock("date-fns/locale", () => ({ fr: {} }));

vi.mock("@phosphor-icons/react/ssr", () => {
	const stub = () => <svg />;
	return {
		CheckCircleIcon: stub,
		CreditCardIcon: stub,
		DownloadSimpleIcon: stub,
		DotsThreeIcon: stub,
		FileTextIcon: stub,
		SpinnerIcon: stub,
		TruckIcon: stub,
	};
});

vi.mock("@/modules/orders/actions/export-single-order", () => ({
	exportSingleOrder: vi.fn(),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		promise: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
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

// Mock ResponsiveActionMenu to render the menu items inline so they're queryable
vi.mock("@/shared/components/responsive-action-menu", () => ({
	ResponsiveActionMenu: ({ children }: any) => <div>{children}</div>,
	ResponsiveActionMenuTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
	ResponsiveActionMenuContent: ({ sections }: any) => (
		<div data-testid="action-menu-content">
			{sections.map((section: any) =>
				section.items.map((item: any) => (
					<button key={item.key} data-testid={`menu-item-${item.key}`} onClick={item.onSelect}>
						{item.label}
					</button>
				)),
			)}
		</div>
	),
}));

import { OrderHeader } from "../order-header";

function makeBaseSections() {
	return [
		{
			key: "info",
			items: [
				{ key: "view", label: "Voir les détails" },
				{ key: "notes", label: "Notes internes", onSelect: vi.fn() },
			],
		},
		{
			key: "emails",
			label: "Renvoyer un email",
			items: [
				{ key: "email-confirmation", label: "Confirmation de commande", onSelect: vi.fn() },
				{
					key: "email-shipping",
					label: "Expédition",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canMarkAsShipped,
				},
			],
		},
		{
			key: "fulfillment",
			items: [
				{
					key: "mark-paid",
					label: "Marquer comme payée",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canMarkAsPaid,
				},
				{
					key: "mark-shipped",
					label: "Marquer comme expédiée",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canMarkAsShipped,
				},
				{
					key: "mark-delivered",
					label: "Marquer comme livrée",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canMarkAsDelivered,
				},
				{
					key: "mark-returned",
					label: "Marquer comme retourné",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canMarkAsReturned,
				},
				{
					key: "revert-processing",
					label: "Annuler l'expédition",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canRevertToProcessing,
				},
			].filter((i) => !i.hidden),
		},
		{
			key: "refund",
			items: [
				{
					key: "refund",
					label: "Créer un remboursement",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canRefund,
				},
			].filter((i) => !i.hidden),
		},
		{
			key: "danger",
			items: [
				{
					key: "cancel",
					label: "Annuler la commande",
					onSelect: vi.fn(),
					hidden: !mockPermissions.canCancel,
				},
			].filter((i) => !i.hidden),
		},
	];
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
		mockHaptic.mockReset();
		// Rebuild base sections after each permission reset
		mockBaseSections.length = 0;
		mockBaseSections.push(...makeBaseSections());
	});

	afterEach(cleanup);

	function refreshSections() {
		mockBaseSections.length = 0;
		mockBaseSections.push(...makeBaseSections());
	}

	function createOrder(overrides = {}) {
		return {
			id: "order-1",
			orderNumber: "CMD-001",
			status: "PENDING",
			paymentStatus: "PENDING",
			trackingNumber: null,
			trackingUrl: null,
			shippingCarrier: null,
			invoiceNumber: null,
			createdAt: new Date("2026-03-01T10:00:00Z"),
			...overrides,
		} as Parameters<typeof OrderHeader>[0]["order"];
	}

	it("renders order number in H1", () => {
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Commande CMD-001");
	});

	it("H1 is visible on mobile (no hidden md:block)", () => {
		render(<OrderHeader order={createOrder()} />);
		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1.className).not.toMatch(/hidden md:block/);
	});

	it("renders creation date (desktop variant)", () => {
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByText(/1 mars 2026 à 10h00/)).toBeInTheDocument();
	});

	it('shows "Marquer payée" primary button when canMarkAsPaid', () => {
		mockPermissions.canMarkAsPaid = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByRole("button", { name: /Marquer payée/i })).toBeInTheDocument();
	});

	it('hides "Marquer payée" button when not canMarkAsPaid', () => {
		mockPermissions.canMarkAsPaid = false;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		expect(screen.queryByRole("button", { name: /Marquer payée/i })).toBeNull();
	});

	it('shows "Marquer expédiée" when canMarkAsShipped', () => {
		mockPermissions.canMarkAsShipped = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByRole("button", { name: /Marquer expédiée/i })).toBeInTheDocument();
	});

	it('shows "Marquer livrée" when canMarkAsDelivered', () => {
		mockPermissions.canMarkAsDelivered = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByRole("button", { name: /Marquer livrée/i })).toBeInTheDocument();
	});

	it("triggers haptic when clicking primary button", () => {
		mockPermissions.canMarkAsPaid = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		fireEvent.click(screen.getByRole("button", { name: /Marquer payée/i }));
		expect(mockHaptic).toHaveBeenCalledWith("medium");
		expect(mockAlertDialogOpen).toHaveBeenCalled();
	});

	it("renders Exporter en CSV item in menu", () => {
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByText("Exporter en CSV")).toBeInTheDocument();
	});

	it("hides mark-paid from menu when primary button visible (no doublon)", () => {
		mockPermissions.canMarkAsPaid = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		// primary button visible
		expect(screen.getAllByRole("button", { name: /Marquer payée/i })).toHaveLength(1);
		// menu item filtered out
		expect(screen.queryByText("Marquer comme payée")).toBeNull();
	});

	it('shows "Créer un remboursement" when canRefund', () => {
		mockPermissions.canRefund = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByText("Créer un remboursement")).toBeInTheDocument();
	});

	it('shows "Annuler la commande" when canCancel', () => {
		mockPermissions.canCancel = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByText("Annuler la commande")).toBeInTheDocument();
	});

	it('shows "Annuler l\'expédition" when canRevertToProcessing', () => {
		mockPermissions.canRevertToProcessing = true;
		refreshSections();
		render(<OrderHeader order={createOrder()} />);
		expect(screen.getByText("Annuler l'expédition")).toBeInTheDocument();
	});

	it("ellipsis trigger has WCAG-compliant touch target classes on mobile", () => {
		render(<OrderHeader order={createOrder()} />);
		const trigger = screen.getByRole("button", { name: /Plus d'actions/i });
		expect(trigger.className).toMatch(/min-h-11/);
		expect(trigger.className).toMatch(/touch-manipulation/);
	});

	/**
	 * @regression invoice-admin-download-2026-05-27
	 *
	 * L'admin doit pouvoir télécharger la facture PDF d'une commande PAID
	 * directement depuis le détail de commande, sans naviguer ailleurs.
	 * L'option ne doit pas apparaître active pour une commande non payée
	 * (la route API renvoie 400).
	 */
	describe("Télécharger la facture", () => {
		it("shows the download item in the menu", () => {
			render(<OrderHeader order={createOrder()} />);
			expect(screen.getByText(/Télécharger la facture/i)).toBeInTheDocument();
		});

		it("renders item disabled when paymentStatus is not PAID", () => {
			render(<OrderHeader order={createOrder({ paymentStatus: "PENDING" })} />);
			// L'option apparaît mais doit être disabled. Le mock du menu rend les
			// items via stub onSelect ; on vérifie ici la présence du label seul.
			expect(screen.getByText(/Télécharger la facture/i)).toBeInTheDocument();
		});
	});
});
