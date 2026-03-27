import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Suspense } from "react";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		"aria-label": ariaLabel,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
	}) => (
		<a href={href} aria-label={ariaLabel} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		variant,
		size,
		className,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
		size?: string;
		className?: string;
	}) => {
		if (asChild) return <>{children}</>;
		return (
			<button data-variant={variant} data-size={size} className={className}>
				{children}
			</button>
		);
	},
}));

vi.mock("@/modules/orders/data/get-user-orders", () => ({
	getUserOrders: vi.fn(),
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div data-testid="empty-media" data-variant={variant}>
			{children}
		</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => (
		<h3 data-testid="empty-title">{children}</h3>
	),
	EmptyDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="empty-description">{children}</p>
	),
	EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
	}) => <table aria-label={ariaLabel}>{children}</table>,
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
	TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<th className={className}>{children}</th>
	),
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<div data-testid="table-scroll-container" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/modules/orders/constants/status-display", () => ({
	ORDER_STATUS_LABELS: {
		PENDING: "En attente",
		PROCESSING: "En traitement",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		CANCELLED: "Annulée",
	},
	ORDER_STATUS_VARIANTS: {
		PENDING: "warning",
		PROCESSING: "default",
		SHIPPED: "secondary",
		DELIVERED: "success",
		CANCELLED: "destructive",
	},
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number) => `${(cents / 100).toFixed(2)} €`),
}));

vi.mock("lucide-react", () => ({
	Package: () => <svg data-testid="icon-package" />,
}));

vi.mock("date-fns", () => ({
	format: vi.fn((date: Date, _fmt: string) => `${date.getDate()} mars ${date.getFullYear()}`),
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

import { RecentOrders } from "../recent-orders";
import type { GetUserOrdersReturn } from "@/modules/orders/types/user-orders.types";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

const emptyPagination = {
	hasNextPage: false,
	hasPreviousPage: false,
	nextCursor: null,
	prevCursor: null,
	totalCount: 0,
};

type UserOrder = GetUserOrdersReturn["orders"][number];

function createOrder(overrides: Partial<UserOrder> = {}): UserOrder {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		total: 2500,
		currency: "EUR",
		status: "PROCESSING" as never,
		paymentStatus: "PAID" as never,
		fulfillmentStatus: "PROCESSING" as never,
		shippingCarrier: null,
		trackingNumber: null,
		trackingUrl: null,
		shippedAt: null,
		actualDelivery: null,
		paymentMethod: "CARD" as never,
		paidAt: null,
		createdAt: new Date("2024-03-15T10:00:00Z"),
		_count: { items: 2 },
		...overrides,
	} as unknown as UserOrder;
}

function makePromise(data: GetUserOrdersReturn): Promise<GetUserOrdersReturn> {
	return Promise.resolve(data);
}

async function renderRecentOrders(
	data: GetUserOrdersReturn,
	props: { limit?: number; showViewAll?: boolean } = {},
) {
	const promise = makePromise(data);
	await act(async () => {
		render(
			<Suspense fallback={<div data-testid="loading" />}>
				<RecentOrders ordersPromise={promise} {...props} />
			</Suspense>,
		);
		await promise;
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("RecentOrders", () => {
	describe("heading", () => {
		it("renders 'Commandes récentes' heading", async () => {
			await renderRecentOrders({ orders: [], pagination: emptyPagination });
			expect(screen.getByRole("heading", { name: "Commandes récentes" })).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("shows empty state when orders list is empty", async () => {
			await renderRecentOrders({ orders: [], pagination: emptyPagination });
			expect(screen.getByTestId("empty")).toBeInTheDocument();
		});

		it("shows 'Aucune commande' title in empty state", async () => {
			await renderRecentOrders({ orders: [], pagination: emptyPagination });
			expect(screen.getByTestId("empty-title")).toHaveTextContent("Aucune commande");
		});

		it("shows empty description in empty state", async () => {
			await renderRecentOrders({ orders: [], pagination: emptyPagination });
			expect(screen.getByTestId("empty-description")).toHaveTextContent(
				"Vous n'avez pas encore passé de commande",
			);
		});

		it("shows 'Découvrir nos bijoux' link to /produits", async () => {
			await renderRecentOrders({ orders: [], pagination: emptyPagination });
			const link = screen.getByRole("link", { name: "Découvrir nos bijoux" });
			expect(link).toHaveAttribute("href", "/produits");
		});

		it("does not render table in empty state", async () => {
			await renderRecentOrders({ orders: [], pagination: emptyPagination });
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	describe("with orders", () => {
		it("renders table with aria-label when orders exist", async () => {
			await renderRecentOrders({
				orders: [createOrder()],
				pagination: emptyPagination,
			});
			expect(screen.getByRole("table", { name: "Commandes récentes" })).toBeInTheDocument();
		});

		it("renders order number with # prefix", async () => {
			await renderRecentOrders({
				orders: [createOrder({ orderNumber: "CMD-042" })],
				pagination: emptyPagination,
			});
			expect(screen.getByText("#CMD-042")).toBeInTheDocument();
		});

		it("renders status badge with label", async () => {
			await renderRecentOrders({
				orders: [createOrder({ status: "PROCESSING" as never })],
				pagination: emptyPagination,
			});
			expect(screen.getByText("En traitement")).toBeInTheDocument();
		});

		it("renders formatted total amount", async () => {
			await renderRecentOrders({
				orders: [createOrder({ total: 4500 })],
				pagination: emptyPagination,
			});
			expect(screen.getByText("45.00 €")).toBeInTheDocument();
		});

		it("renders 'Voir' link for each order", async () => {
			await renderRecentOrders({
				orders: [createOrder({ orderNumber: "CMD-001" })],
				pagination: emptyPagination,
			});
			const link = screen.getByRole("link", {
				name: "Voir la commande #CMD-001",
			});
			expect(link).toHaveAttribute("href", "/commandes/CMD-001");
		});

		it("renders table headers", async () => {
			await renderRecentOrders({
				orders: [createOrder()],
				pagination: emptyPagination,
			});
			expect(screen.getByText("Commande")).toBeInTheDocument();
			expect(screen.getByText("Statut")).toBeInTheDocument();
			expect(screen.getByText("Total")).toBeInTheDocument();
		});
	});

	describe("limit prop", () => {
		it("limits displayed orders to the given limit", async () => {
			const orders = [
				createOrder({ id: "o1", orderNumber: "CMD-001" }),
				createOrder({ id: "o2", orderNumber: "CMD-002" }),
				createOrder({ id: "o3", orderNumber: "CMD-003" }),
			];
			await renderRecentOrders({ orders, pagination: emptyPagination }, { limit: 2 });
			expect(screen.getByText("#CMD-001")).toBeInTheDocument();
			expect(screen.getByText("#CMD-002")).toBeInTheDocument();
			expect(screen.queryByText("#CMD-003")).not.toBeInTheDocument();
		});

		it("shows all orders when count is within default limit of 5", async () => {
			const orders = Array.from({ length: 3 }, (_, i) =>
				createOrder({ id: `o${i}`, orderNumber: `CMD-00${i + 1}` }),
			);
			await renderRecentOrders({ orders, pagination: emptyPagination });
			expect(screen.getByText("#CMD-001")).toBeInTheDocument();
			expect(screen.getByText("#CMD-002")).toBeInTheDocument();
			expect(screen.getByText("#CMD-003")).toBeInTheDocument();
		});
	});

	describe("showViewAll prop", () => {
		it("does not show 'Voir toutes mes commandes' by default", async () => {
			const orders = Array.from({ length: 6 }, (_, i) =>
				createOrder({ id: `o${i}`, orderNumber: `CMD-00${i + 1}` }),
			);
			await renderRecentOrders({ orders, pagination: emptyPagination });
			expect(
				screen.queryByRole("link", { name: "Voir toutes mes commandes" }),
			).not.toBeInTheDocument();
		});

		it("shows 'Voir toutes mes commandes' link when showViewAll=true and hasMoreOrders", async () => {
			const orders = Array.from({ length: 6 }, (_, i) =>
				createOrder({ id: `o${i}`, orderNumber: `CMD-00${i + 1}` }),
			);
			await renderRecentOrders(
				{ orders, pagination: emptyPagination },
				{ showViewAll: true, limit: 5 },
			);
			const link = screen.getByRole("link", { name: "Voir toutes mes commandes" });
			expect(link).toHaveAttribute("href", "/commandes");
		});

		it("does not show 'Voir toutes mes commandes' when showViewAll=true but no more orders", async () => {
			const orders = [createOrder()];
			await renderRecentOrders(
				{ orders, pagination: emptyPagination },
				{ showViewAll: true, limit: 5 },
			);
			expect(
				screen.queryByRole("link", { name: "Voir toutes mes commandes" }),
			).not.toBeInTheDocument();
		});

		it("shows 'Voir toutes mes commandes' when showViewAll=true and pagination.hasNextPage=true", async () => {
			const orders = [createOrder()];
			const pagination = { ...emptyPagination, hasNextPage: true };
			await renderRecentOrders({ orders, pagination }, { showViewAll: true, limit: 5 });
			expect(screen.getByRole("link", { name: "Voir toutes mes commandes" })).toBeInTheDocument();
		});
	});

	describe("item count", () => {
		it("shows singular 'article' for 1 item", async () => {
			await renderRecentOrders({
				orders: [createOrder({ _count: { items: 1 } })],
				pagination: emptyPagination,
			});
			expect(screen.getByText("1 article")).toBeInTheDocument();
		});

		it("shows plural 'articles' for multiple items", async () => {
			await renderRecentOrders({
				orders: [createOrder({ _count: { items: 3 } })],
				pagination: emptyPagination,
			});
			expect(screen.getByText("3 articles")).toBeInTheDocument();
		});
	});

	describe("multiple orders", () => {
		it("renders a row for each displayed order", async () => {
			const orders = [
				createOrder({ id: "o1", orderNumber: "CMD-001", total: 1000, status: "PENDING" as never }),
				createOrder({
					id: "o2",
					orderNumber: "CMD-002",
					total: 2000,
					status: "DELIVERED" as never,
				}),
			];
			await renderRecentOrders({ orders, pagination: emptyPagination });
			expect(screen.getByText("#CMD-001")).toBeInTheDocument();
			expect(screen.getByText("#CMD-002")).toBeInTheDocument();
			expect(screen.getByText("10.00 €")).toBeInTheDocument();
			expect(screen.getByText("20.00 €")).toBeInTheDocument();
			expect(screen.getByText("En attente")).toBeInTheDocument();
			expect(screen.getByText("Livrée")).toBeInTheDocument();
		});
	});
});
