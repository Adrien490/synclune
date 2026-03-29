import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterPush, mockFormState, mockAction, mockIsPending } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockFormState: {
		reason: "CUSTOMER_REQUEST",
		items: [] as { orderItemId: string; selected: boolean; quantity: number; restock: boolean }[],
		selectedItems: [] as {
			orderItemId: string;
			selected: boolean;
			quantity: number;
			restock: boolean;
		}[],
		totalAmount: 0,
		itemsForAction: [] as unknown[],
		note: "",
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/modules/refunds/hooks/use-create-refund-form", () => ({
	useCreateRefundForm: vi.fn(() => ({
		form: {
			store: {},
			getFieldValue: vi.fn(),
			setFieldValue: vi.fn(),
		},
		action: mockAction,
		isPending: mockIsPending.value,
		reason: mockFormState.reason,
		items: mockFormState.items,
		selectedItems: mockFormState.selectedItems,
		totalAmount: mockFormState.totalAmount,
		itemsForAction: mockFormState.itemsForAction,
	})),
	getDefaultRestock: vi.fn((reason: string) => reason === "CUSTOMER_REQUEST"),
	getAvailableQuantity: vi.fn(() => 1),
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	useStore: vi.fn(() => mockFormState.note),
}));

vi.mock("@/modules/refunds/services/refund-calculation.service", () => ({
	canSubmitRefund: vi.fn(() => true),
}));

vi.mock("@/modules/refunds/components/admin/refund-item-row", () => ({
	RefundItemRow: ({ orderItem }: { orderItem: { id: string; productTitle: string } }) => (
		<div data-testid={`refund-item-${orderItem.id}`}>{orderItem.productTitle}</div>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		variant,
		size,
		asChild,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		variant?: string;
		size?: string;
		asChild?: boolean;
		onClick?: () => void;
	}) =>
		asChild ? (
			<>{children}</>
		) : (
			<button
				disabled={disabled}
				type={type as "button" | "submit" | "reset"}
				data-variant={variant}
				onClick={onClick}
			>
				{children}
			</button>
		),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 data-testid="card-title">{children}</h3>
	),
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
		disabled,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (v: string) => void;
		disabled?: boolean;
	}) => (
		<div data-testid="select" data-value={value} data-disabled={String(disabled)}>
			{children}
		</div>
	),
	SelectTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-trigger">{children}</div>
	),
	SelectValue: () => <span data-testid="select-value" />,
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`select-item-${value}`}>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({
		value,
		onChange,
		placeholder,
		disabled,
	}: {
		value?: string;
		onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
		placeholder?: string;
		disabled?: boolean;
	}) => (
		<textarea
			data-testid="note-textarea"
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			disabled={disabled}
		/>
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	ArrowLeft: () => <svg data-testid="icon-arrow-left" />,
	Package: () => <svg data-testid="icon-package" />,
	RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
}));

vi.mock("@/modules/refunds/constants/refund.constants", () => ({
	REFUND_REASON_LABELS: {
		CUSTOMER_REQUEST: "Rétractation client",
		DEFECTIVE: "Produit défectueux",
		WRONG_ITEM: "Erreur de préparation",
		LOST_IN_TRANSIT: "Colis perdu",
		FRAUD: "Fraude",
		OTHER: "Autre",
	},
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		DEFECTIVE: "DEFECTIVE",
		WRONG_ITEM: "WRONG_ITEM",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CreateRefundForm } from "../create-refund-form";

// ============================================================================
// TEST DATA
// ============================================================================

function createMockOrder(overrides = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-2026-0001",
		customerName: "Marie Dupont",
		total: 10000,
		refunds: [],
		items: [
			{
				id: "item-1",
				productTitle: "Bague dorée",
				productImageUrl: null,
				skuImageUrl: null,
				skuColor: null,
				skuMaterial: null,
				skuSize: null,
				price: 5000,
				quantity: 2,
				refundItems: [],
			},
		],
		...overrides,
	} as any;
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateRefundForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
		mockFormState.reason = "CUSTOMER_REQUEST";
		mockFormState.items = [];
		mockFormState.selectedItems = [];
		mockFormState.totalAmount = 0;
		mockFormState.note = "";
	});

	// ─── Header ───────────────────────────────────────────────────────────────

	it("renders the page heading 'Nouveau remboursement'", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Nouveau remboursement")).toBeInTheDocument();
	});

	it("renders the order number and customer name in subtitle", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText(/CMD-2026-0001/)).toBeInTheDocument();
		expect(screen.getByText(/Marie Dupont/)).toBeInTheDocument();
	});

	it("renders back link to the order page", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		const backLink = screen.getByText("Retour").closest("a");
		expect(backLink).toHaveAttribute("href", "/admin/ventes/commandes/order-1");
	});

	// ─── Order items ──────────────────────────────────────────────────────────

	it("renders section title 'Articles à rembourser'", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Articles à rembourser")).toBeInTheDocument();
	});

	it("renders a RefundItemRow for each order item", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("refund-item-item-1")).toBeInTheDocument();
		expect(screen.getByText("Bague dorée")).toBeInTheDocument();
	});

	it("renders 'Tout sélectionner' button", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Tout sélectionner")).toBeInTheDocument();
	});

	// ─── Reason select ────────────────────────────────────────────────────────

	it("renders the 'Motif du remboursement' section", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Motif du remboursement")).toBeInTheDocument();
	});

	it("renders a Select for refund reason", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("select")).toBeInTheDocument();
	});

	it("renders all refund reason labels as select items", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Rétractation client")).toBeInTheDocument();
		expect(screen.getByText("Produit défectueux")).toBeInTheDocument();
		expect(screen.getByText("Colis perdu")).toBeInTheDocument();
	});

	// ─── Note field ───────────────────────────────────────────────────────────

	it("renders the note textarea", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("note-textarea")).toBeInTheDocument();
	});

	it("renders the 'Note (optionnel)' section", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Note (optionnel)")).toBeInTheDocument();
	});

	// ─── Summary ──────────────────────────────────────────────────────────────

	it("renders the 'Récapitulatif' card", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Récapitulatif")).toBeInTheDocument();
	});

	it("shows total refund amount formatted in euros", () => {
		mockFormState.totalAmount = 5000;
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getAllByText(/50\.00 €/).length).toBeGreaterThan(0);
	});

	it("shows 'Déjà remboursé' row in summary", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Déjà remboursé")).toBeInTheDocument();
	});

	it("shows 'Max remboursable' row in summary", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Max remboursable")).toBeInTheDocument();
	});

	// ─── Submit button ────────────────────────────────────────────────────────

	it("renders the submit button with amount", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText(/Créer la demande/)).toBeInTheDocument();
	});

	it("shows 'Création en cours...' when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Création en cours...")).toBeInTheDocument();
	});

	// ─── Already refunded ─────────────────────────────────────────────────────

	it("calculates maxRefundable correctly (total - alreadyRefunded)", () => {
		const order = createMockOrder({
			total: 10000,
			refunds: [{ amount: 2000 }, { amount: 1000 }],
		});
		render(<CreateRefundForm order={order} />);
		// maxRefundable = 10000 - 3000 = 7000 = 70.00 €
		expect(screen.getByText(/70\.00 €/)).toBeInTheDocument();
	});

	// ─── Excess amount warning ────────────────────────────────────────────────

	it("shows excess warning when totalAmount exceeds maxRefundable", () => {
		mockFormState.totalAmount = 15000;
		const order = createMockOrder({ total: 10000, refunds: [] });
		render(<CreateRefundForm order={order} />);
		expect(screen.getByText(/Le montant dépasse le maximum remboursable/)).toBeInTheDocument();
	});

	it("does not show excess warning when totalAmount is within limit", () => {
		mockFormState.totalAmount = 5000;
		const order = createMockOrder({ total: 10000, refunds: [] });
		render(<CreateRefundForm order={order} />);
		expect(
			screen.queryByText(/Le montant dépasse le maximum remboursable/),
		).not.toBeInTheDocument();
	});
});
