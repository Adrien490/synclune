import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode }) => (
		<span data-testid="badge">{children}</span>
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
		icon?: React.ComponentType;
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
	Table: ({ children }: { children: React.ReactNode }) => (
		<table data-testid="table">{children}</table>
	),
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
	TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		variant,
		asChild,
	}: {
		children: React.ReactNode;
		variant?: string;
		asChild?: boolean;
	}) => {
		if (asChild) return <>{children}</>;
		return <button data-variant={variant}>{children}</button>;
	},
}));

vi.mock("lucide-react", () => ({
	ShoppingBag: () => <svg data-testid="icon-shopping-bag" />,
}));

vi.mock("@/modules/orders/components/admin/order-row-actions", () => ({
	OrderRowActions: ({ order }: { order: { orderNumber: string } }) => (
		<div data-testid={`row-actions-${order.orderNumber}`} />
	),
}));

vi.mock("@/modules/orders/components/admin/orders-selection-toolbar", () => ({
	OrdersSelectionToolbar: () => <div data-testid="orders-selection-toolbar" />,
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: ({ type }: { type: string; itemIds?: string[]; itemId?: string }) => (
		<div data-testid={`table-selection-cell-${type}`} />
	),
}));

vi.mock("@/modules/orders/constants/status-display", () => ({
	ORDER_STATUS_LABELS: {
		PENDING: "En attente",
		PROCESSING: "En cours",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		CANCELLED: "Annulée",
	},
	ORDER_STATUS_VARIANTS: {
		PENDING: "warning",
		PROCESSING: "info",
		SHIPPED: "secondary",
		DELIVERED: "success",
		CANCELLED: "destructive",
	},
}));

import { OrdersDataTable } from "../orders-data-table";
import type { GetOrdersReturn } from "@/modules/orders/types/order.types";

// ============================================================================
// HELPERS
// ============================================================================

function createOrder(id: string, orderNumber: string): GetOrdersReturn["orders"][number] {
	return {
		id,
		orderNumber,
		userId: null,
		stripePaymentIntentId: null,
		stripeCustomerId: null,
		customerEmail: "alice@example.com",
		customerName: "Alice",
		status: "PROCESSING" as const,
		paymentStatus: "PAID" as const,
		fulfillmentStatus: "UNFULFILLED" as const,
		total: 4999,
		currency: "EUR",
		shippingMethod: null,
		shippingCarrier: null,
		trackingNumber: null,
		trackingUrl: null,
		shippedAt: null,
		paymentMethod: null,
		paidAt: null,
		invoiceNumber: null,
		invoiceStatus: null,
		invoiceGeneratedAt: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		user: { id: "user-1", name: "Alice", email: "alice@example.com" },
		_count: { items: 2 },
	} as unknown as GetOrdersReturn["orders"][number];
}

function makePromise(data: GetOrdersReturn): Promise<GetOrdersReturn> {
	return Promise.resolve(data);
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersDataTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders empty state when orders array is empty", async () => {
		const promise = makePromise({
			orders: [],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
		expect(screen.getByText("Aucune commande trouvée")).toBeInTheDocument();
	});

	it("renders reset filters link in empty state", async () => {
		const promise = makePromise({
			orders: [],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		const link = screen.getByRole("link", { name: "Reinitialiser les filtres" });
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes");
	});

	it("renders order rows when orders are provided", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001"), createOrder("o-2", "CMD-002")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		expect(screen.getByRole("link", { name: "Voir commande CMD-001" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Voir commande CMD-002" })).toBeInTheDocument();
	});

	it("renders order links with correct href", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		const link = screen.getByRole("link", { name: "Voir commande CMD-001" });
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes/o-1");
	});

	it("renders user name in table row", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		expect(screen.getByText("Alice")).toBeInTheDocument();
	});

	it("falls back to email when user name is null", async () => {
		const order = {
			...createOrder("o-1", "CMD-001"),
			user: { id: "user-2", name: null, email: "bob@test.com" },
		};
		const promise = makePromise({
			orders: [order],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		expect(screen.getByText("bob@test.com")).toBeInTheDocument();
	});

	it("falls back to 'Invité' when user is null", async () => {
		const order = { ...createOrder("o-1", "CMD-001"), user: null };
		const promise = makePromise({
			orders: [order],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		expect(screen.getByText("Invité")).toBeInTheDocument();
	});

	it("renders cursor pagination", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: true,
				hasPreviousPage: false,
				nextCursor: "cursor-abc",
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders selection toolbar", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await OrdersDataTable({ ordersPromise: promise, perPage: 20 });
		render(jsx);
		expect(screen.getByTestId("orders-selection-toolbar")).toBeInTheDocument();
	});
});
