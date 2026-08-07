import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock functions
// ---------------------------------------------------------------------------
const { mockGetOrderPermissions, mockUseAlertDialog, mockUseDialog, mockResend, mockPush } =
	vi.hoisted(() => {
		return {
			mockGetOrderPermissions: vi.fn(),
			mockUseAlertDialog: vi.fn(),
			mockUseDialog: vi.fn(),
			mockResend: vi.fn(),
			mockPush: vi.fn(),
		};
	});

// La chaîne actions → void-invoice → ensure-credit-note-archived tire
// UploadThing (UTApi server-only, throw en jsdom) — coupe à la racine.
vi.mock("@/shared/lib/uploadthing", () => ({ utapi: {} }));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

// ---------------------------------------------------------------------------
// Mocks - must be declared before component import
// ---------------------------------------------------------------------------

vi.mock("@/app/generated/prisma/browser", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
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

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: mockUseAlertDialog,
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

vi.mock("@phosphor-icons/react/ssr", () => ({
	MoneyIcon: () => <svg data-testid="icon-banknote" />,
	CheckCircleIcon: () => <svg data-testid="icon-circle-check" />,
	CreditCardIcon: () => <svg data-testid="icon-credit-card" />,
	EyeIcon: () => <svg data-testid="icon-eye" />,
	ArrowSquareOutIcon: () => <svg data-testid="icon-external-link" />,
	EnvelopeIcon: () => <svg data-testid="icon-mail" />,
	DotsThreeVerticalIcon: () => <svg data-testid="icon-ellipsis-vertical" />,
	PackageIcon: () => <svg data-testid="icon-package" />,
	XCircleIcon: () => <svg data-testid="icon-circle-x" />,
	ArrowArcLeftIcon: () => <svg data-testid="icon-package-x" />,
	ArrowCounterClockwiseIcon: () => <svg data-testid="icon-rotate-ccw" />,
	ShoppingBagIcon: () => <svg data-testid="icon-shopping-bag" />,
	NoteIcon: () => <svg data-testid="icon-sticky-note" />,
	TrashIcon: () => <svg data-testid="icon-trash2" />,
	TruckIcon: () => <svg data-testid="icon-truck" />,
	ArrowUUpLeftIcon: () => <svg data-testid="icon-undo2" />,
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
		canMarkAsFullyRefunded: false,
		// `canDelete` vient désormais de `getOrderPermissions` (SSOT) et non d'une règle
		// dupliquée dans le hook : il DOIT figurer ici, sinon le destructuring donne
		// `undefined` et l'item disparaît silencieusement de tous les tests.
		canDelete: false,
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

		// Lot 2 S3.3 : plus d'entrée « Créer un remboursement » dans le menu — le
		// remboursement se fait dans le dashboard Stripe (lien sur OrderRefundsCard).
		it("does NOT show 'Créer un remboursement' even when canRefund is true", () => {
			setupMocks({ canRefund: true });
			render(<OrderRowActions order={createOrder()} />);
			expect(screen.queryByText("Créer un remboursement")).toBeNull();
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
		it("shows 'Marquer comme retourné' when status is DELIVERED and status is not RETURNED", () => {
			setupMocks({ canMarkAsReturned: true });
			render(
				<OrderRowActions
					order={createOrder({
						status: "DELIVERED" as const,
					})}
				/>,
			);
			expect(screen.getByText("Marquer comme retourné")).toBeInTheDocument();
		});

		it("hides 'Marquer comme retourné' when status is RETURNED", () => {
			setupMocks({ canMarkAsReturned: false });
			render(
				<OrderRowActions
					order={createOrder({
						status: "DELIVERED" as const,
					})}
				/>,
			);
			expect(screen.queryByText("Marquer comme retourné")).not.toBeInTheDocument();
		});
	});

	describe("delete logic", () => {
		// La RÈGLE (jamais facturée + jamais encaissée) vit dans
		// `getOrderPermissions().canDelete` et y est testée exhaustivement
		// (order-status-validation.service.test.ts). Ici on vérifie seulement que ce
		// composant respecte la permission qu'on lui donne.
		it("shows 'Supprimer' when canDelete is granted", () => {
			setupMocks({ canDelete: true });
			render(<OrderRowActions order={createOrder({ paymentStatus: "PENDING" as const })} />);
			expect(screen.getByText("Supprimer")).toBeInTheDocument();
		});

		it("hides 'Supprimer' when canDelete is denied", () => {
			setupMocks({ canDelete: false });
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
