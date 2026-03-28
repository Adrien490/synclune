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
		"aria-label": ariaLabel,
	}: {
		href: string;
		children: React.ReactNode;
		"aria-label"?: string;
	}) => (
		<a href={href} aria-label={ariaLabel}>
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
	Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="badge" className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		variant?: string;
		size?: string;
		asChild?: boolean;
	}) => {
		if (asChild) return <>{children}</>;
		return <button>{children}</button>;
	},
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="empty" className={className}>
			{children}
		</div>
	),
	EmptyContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-content">{children}</div>
	),
	EmptyDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="empty-description">{children}</p>
	),
	EmptyHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-header">{children}</div>
	),
	EmptyMedia: ({ children }: { children: React.ReactNode; variant?: string }) => (
		<div data-testid="empty-media">{children}</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="empty-title">{children}</h2>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-label": ariaLabel,
		role,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		role?: string;
		className?: string;
	}) => (
		<table aria-label={ariaLabel} role={role}>
			{children}
		</table>
	),
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({
		children,
		scope,
		className,
	}: {
		children: React.ReactNode;
		scope?: string;
		className?: string;
	}) => (
		<th scope={scope} className={className}>
			{children}
		</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
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
	FULFILLMENT_STATUS_LABELS: {
		UNFULFILLED: "Non expédiée",
		PROCESSING: "En traitement",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		RETURNED: "Retournée",
	},
	FULFILLMENT_STATUS_VARIANTS: {
		UNFULFILLED: "default",
		PROCESSING: "warning",
		SHIPPED: "secondary",
		DELIVERED: "success",
		RETURNED: "destructive",
	},
}));

vi.mock("date-fns", () => ({
	format: (_date: Date, _fmt: string) => "1 janv. 2026",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("lucide-react", () => ({
	Eye: () => <svg data-testid="icon-eye" />,
	ShoppingBag: () => <svg data-testid="icon-shopping-bag" />,
}));

import { CustomerOrdersTable } from "../customer-orders-table";
import type { GetUserOrdersReturn } from "@/modules/orders/types/user-orders.types";

// ============================================================================
// HELPERS
// ============================================================================

function createOrder(id: string, orderNumber: string) {
	return {
		id,
		orderNumber,
		status: "PROCESSING",
		fulfillmentStatus: "UNFULFILLED",
		total: 4999,
		createdAt: new Date("2026-01-01"),
		_count: { items: 2 },
	};
}

function makePromise(data: GetUserOrdersReturn): Promise<GetUserOrdersReturn> {
	return Promise.resolve(data);
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomerOrdersTable", () => {
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
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		expect(screen.getByTestId("empty")).toBeInTheDocument();
	});

	it("renders empty title 'Aucune commande'", async () => {
		const promise = makePromise({
			orders: [],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		expect(screen.getByTestId("empty-title")).toHaveTextContent("Aucune commande");
	});

	it("renders discovery link in empty state", async () => {
		const promise = makePromise({
			orders: [],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		const link = screen.getByRole("link", { name: "Découvrir nos créations" });
		expect(link).toHaveAttribute("href", "/produits");
	});

	it("renders table when orders exist", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		expect(screen.getByRole("table", { name: "Liste de vos commandes" })).toBeInTheDocument();
	});

	it("renders order number in table row", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		expect(screen.getByText("CMD-001")).toBeInTheDocument();
	});

	it("renders view link for each order", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001"), createOrder("o-2", "CMD-002")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		expect(screen.getByRole("link", { name: "Voir la commande #CMD-001" })).toHaveAttribute(
			"href",
			"/commandes/CMD-001",
		);
		expect(screen.getByRole("link", { name: "Voir la commande #CMD-002" })).toHaveAttribute(
			"href",
			"/commandes/CMD-002",
		);
	});

	it("renders cursor pagination when orders are present", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders table headers", async () => {
		const promise = makePromise({
			orders: [createOrder("o-1", "CMD-001")],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		});
		const jsx = await CustomerOrdersTable({ ordersPromise: promise, perPage: 10 });
		render(jsx);
		expect(screen.getByText("Commande")).toBeInTheDocument();
		expect(screen.getByText("Total")).toBeInTheDocument();
	});
});
