import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as RefundConstants from "@/modules/refunds/constants/refund.constants";
import { RefundReason, RefundStatus } from "@/app/generated/prisma/client";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: vi.fn(),
	requireAdminWithUser: vi.fn(),
	requireAuth: vi.fn(),
}));

vi.mock("@/modules/refunds/constants/refund.constants", async (importOriginal) => {
	const actual = await importOriginal<typeof RefundConstants>();
	return {
		...actual,
		REFUND_STATUS_LABELS: {
			PENDING: "En attente",
			APPROVED: "Approuvé",
			COMPLETED: "Remboursé",
			REJECTED: "Refusé",
			FAILED: "Échoué",
			CANCELLED: "Annulé",
		},
		REFUND_STATUS_VARIANTS: {
			PENDING: "warning",
			APPROVED: "default",
			COMPLETED: "success",
			REJECTED: "destructive",
			FAILED: "destructive",
			CANCELLED: "secondary",
		},
		REFUND_REASON_LABELS: {
			CUSTOMER_REQUEST: "Rétractation client",
			DEFECTIVE: "Produit défectueux",
			WRONG_ITEM: "Erreur de préparation",
			LOST_IN_TRANSIT: "Colis perdu",
			FRAUD: "Fraude",
			OTHER: "Autre",
		},
	};
});

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
		actionElement,
	}: {
		icon: unknown;
		title: string;
		description: string;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="table-empty-state">
			<p>{title}</p>
			<p>{description}</p>
			{actionElement}
		</div>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		caption?: string;
		striped?: boolean;
		className?: string;
	}) => <table aria-label={ariaLabel}>{children}</table>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children?: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<th className={className} aria-label={ariaLabel}>
			{children}
		</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		variant,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
	}) => (asChild ? <>{children}</> : <button data-variant={variant}>{children}</button>),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((amount: number) => `${(amount / 100).toFixed(2)} €`),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: vi.fn(() => "15/01/2026"),
}));

vi.mock("lucide-react", () => ({
	ReceiptText: () => <svg data-testid="icon-receipt-text" />,
}));

vi.mock("@/modules/refunds/components/admin/refund-row-actions", () => ({
	RefundRowActions: ({ refund }: { refund: { id: string } }) => (
		<div data-testid={`refund-row-actions-${refund.id}`} />
	),
}));

vi.mock("@/modules/refunds/components/admin/refunds-selection-toolbar", () => ({
	RefundsSelectionToolbar: () => <div data-testid="refunds-selection-toolbar" />,
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: ({
		type,
		itemId,
		itemIds,
	}: {
		type: "header" | "row";
		itemId?: string;
		itemIds?: string[];
	}) => (
		<div
			data-testid={type === "header" ? "selection-cell-header" : `selection-cell-${itemId}`}
			data-item-ids={itemIds?.join(",")}
		/>
	),
}));

import { RefundsDataTable } from "../refunds-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createPagination(overrides = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
		...overrides,
	};
}

function createRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-1",
		orderId: "order-1",
		stripeRefundId: "re_test123",
		amount: 4500,
		currency: "eur",
		reason: RefundReason.CUSTOMER_REQUEST,
		status: RefundStatus.PENDING,
		failureReason: null,
		note: null,
		createdBy: "admin-1",
		processedAt: null,
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			customerName: "Jean Dupont",
			customerEmail: "jean@test.fr",
			total: 9000,
		},
		_count: {
			items: 1,
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("RefundsDataTable", () => {
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no refunds", async () => {
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds: [], pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
	});

	it("shows 'Aucun remboursement trouvé' in empty state", async () => {
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds: [], pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("Aucun remboursement trouvé")).toBeInTheDocument();
	});

	it("shows reset link in empty state", async () => {
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds: [], pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByRole("link", { name: /Réinitialiser les filtres/i })).toBeInTheDocument();
	});

	// ─── With data ────────────────────────────────────────────────────────────

	it("renders a card when refunds exist", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders order number as link", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		const link = screen.getByRole("link", { name: "SYN-001" });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes/order-1");
	});

	it("renders customer name", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
	});

	it("renders customer email", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("jean@test.fr")).toBeInTheDocument();
	});

	it("renders status badge", async () => {
		const refunds = [createRefund({ status: "PENDING" })];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("En attente")).toBeInTheDocument();
	});

	it("renders refund reason label", async () => {
		const refunds = [createRefund({ reason: "CUSTOMER_REQUEST" })];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("Rétractation client")).toBeInTheDocument();
	});

	it("renders formatted amount", async () => {
		const refunds = [createRefund({ amount: 4500 })];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("45.00 €")).toBeInTheDocument();
	});

	it("renders row actions for each refund", async () => {
		const refunds = [createRefund({ id: "refund-1" })];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByTestId("refund-row-actions-refund-1")).toBeInTheDocument();
	});

	it("renders multiple refunds", async () => {
		const refunds = [
			createRefund({
				id: "refund-1",
				order: {
					id: "order-1",
					orderNumber: "SYN-001",
					customerName: "Jean Dupont",
					customerEmail: "jean@test.fr",
				},
			}),
			createRefund({
				id: "refund-2",
				order: {
					id: "order-2",
					orderNumber: "SYN-002",
					customerName: "Marie Martin",
					customerEmail: "marie@test.fr",
				},
			}),
		];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("SYN-001")).toBeInTheDocument();
		expect(screen.getByText("SYN-002")).toBeInTheDocument();
	});

	// ─── Pagination ───────────────────────────────────────────────────────────

	it("renders cursor pagination", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	// ─── Selection toolbar ────────────────────────────────────────────────────

	it("renders selection toolbar", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByTestId("refunds-selection-toolbar")).toBeInTheDocument();
	});

	// ─── Table structure ──────────────────────────────────────────────────────

	it("renders table with correct aria-label", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByRole("table", { name: /Liste des remboursements/i })).toBeInTheDocument();
	});

	it("renders table column headers", async () => {
		const refunds = [createRefund()];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("Commande")).toBeInTheDocument();
		expect(screen.getByText("Client")).toBeInTheDocument();
		expect(screen.getByText("Statut")).toBeInTheDocument();
		expect(screen.getByText("Montant")).toBeInTheDocument();
	});

	// ─── Fallback: no customerName ────────────────────────────────────────────

	it("shows customer email when customerName is null", async () => {
		const refunds = [
			createRefund({
				order: {
					id: "order-1",
					orderNumber: "SYN-001",
					customerName: null,
					customerEmail: "noname@test.fr",
				},
			}),
		];
		const Component = await RefundsDataTable({
			refundsPromise: Promise.resolve({ refunds, pagination: createPagination() }),
			perPage: 20,
		});
		render(Component);
		expect(screen.getByText("noname@test.fr")).toBeInTheDocument();
	});
});
