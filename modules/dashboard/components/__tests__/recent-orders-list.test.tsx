import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RecentOrderItem } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		"aria-label": ariaLabel,
		onClick,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
		onClick?: (e: React.MouseEvent) => void;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
			{children}
		</a>
	),
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-footer" className={className}>
			{children}
		</div>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 className={className}>{children}</h3>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...props}>{children}</button>),
}));

vi.mock("lucide-react", () => ({
	ArrowRight: () => <span data-testid="arrow-right-icon" />,
	ChevronRight: () => <span data-testid="icon-chevron-right" />,
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: () => null,
	ItemGroup: () => null,
	ItemContent: () => null,
	ItemTitle: () => null,
	ItemMedia: () => null,
	ItemActions: () => null,
	ItemSeparator: () => null,
	ItemDescription: () => null,
	ItemFooter: () => null,
}));

// Force desktop rendering path in jsdom (no matchMedia)
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
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

vi.mock("date-fns", () => ({
	format: (date: Date, _formatStr: string) => {
		// Simple mock: return ISO date for predictable testing
		const d = new Date(date);
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		const hours = String(d.getHours()).padStart(2, "0");
		const minutes = String(d.getMinutes()).padStart(2, "0");
		return `${day}/${month}/${year} à ${hours}:${minutes}`;
	},
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("../../constants/order-status.constants", () => ({
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
	PAYMENT_STATUS_LABELS: {
		PENDING: "En attente",
		PAID: "Payée",
		FAILED: "Échouée",
		EXPIRED: "Expirée",
		REFUNDED: "Remboursée",
		PARTIALLY_REFUNDED: "Part. remboursée",
	},
	FULFILLMENT_STATUS_LABELS: {
		UNFULFILLED: "À préparer",
		PROCESSING: "En préparation",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		RETURNED: "Retournée",
	},
	FULFILLMENT_STATUS_VARIANTS: {
		UNFULFILLED: "warning",
		PROCESSING: "default",
		SHIPPED: "secondary",
		DELIVERED: "success",
		RETURNED: "destructive",
	},
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "mock-card-class",
		title: "mock-title-class",
	},
}));

import { RecentOrdersList } from "../recent-orders-list";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function createOrder(overrides: Partial<RecentOrderItem> = {}): RecentOrderItem {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		createdAt: new Date("2026-02-15T14:30:00Z"),
		status: "PROCESSING" as RecentOrderItem["status"],
		paymentStatus: "PAID" as RecentOrderItem["paymentStatus"],
		fulfillmentStatus: "UNFULFILLED" as RecentOrderItem["fulfillmentStatus"],
		total: 8500,
		customerName: "Marie Dupont",
		customerEmail: "marie@example.com",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("RecentOrdersList", () => {
	it("renders the title", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

		// Title appears in both mobile (<h3>) and desktop (<CardTitle>)
		expect(screen.getAllByText("Dernières commandes").length).toBeGreaterThanOrEqual(1);
	});

	it("renders order number with hash prefix", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

		expect(screen.getByText("#SYN-001")).toBeInTheDocument();
	});

	it("renders customer name and email", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

		expect(screen.getByText(/Marie Dupont/)).toBeInTheDocument();
		expect(screen.getByText(/marie@example.com/)).toBeInTheDocument();
	});

	it("renders order total formatted with 2 decimals", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder({ total: 8500 })] }} />);

		expect(screen.getByText("8500.00 €")).toBeInTheDocument();
	});

	it("renders order status badge", () => {
		render(
			<RecentOrdersList
				listData={{ orders: [createOrder({ status: "DELIVERED" as RecentOrderItem["status"] })] }}
			/>,
		);

		expect(screen.getByText("Livrée")).toBeInTheDocument();
	});

	it("renders fulfillment status badge", () => {
		render(
			<RecentOrdersList
				listData={{
					orders: [
						createOrder({
							fulfillmentStatus: "UNFULFILLED" as RecentOrderItem["fulfillmentStatus"],
						}),
					],
				}}
			/>,
		);

		expect(screen.getByText("À préparer")).toBeInTheDocument();
	});

	it("links each order to its detail page", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder({ id: "order-42" })] }} />);

		const links = screen.getAllByRole("link");
		const orderLink = links.find((l) => l.getAttribute("href")?.includes("order-42"));
		expect(orderLink).toHaveAttribute("href", "/admin/ventes/commandes/order-42");
	});

	it("fires a 'light' haptic when an order link is tapped", async () => {
		const { fireEvent } = await import("@testing-library/react");
		render(<RecentOrdersList listData={{ orders: [createOrder({ id: "order-42" })] }} />);

		const links = screen.getAllByRole("link");
		const orderLink = links.find((l) => l.getAttribute("href")?.includes("order-42"))!;
		fireEvent.click(orderLink);

		expect(mockHaptic).toHaveBeenCalledWith("light");
	});

	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	it("renders aria-label on each order link with order number, total, customer, and status", () => {
		render(
			<RecentOrdersList
				listData={{
					orders: [
						createOrder({
							orderNumber: "SYN-042",
							total: 4250,
							customerName: "Jean Martin",
							status: "DELIVERED" as RecentOrderItem["status"],
						}),
					],
				}}
			/>,
		);

		const links = screen.getAllByRole("link");
		const orderLink = links.find((l) => l.getAttribute("aria-label")?.includes("SYN-042"));
		expect(orderLink).toHaveAttribute(
			"aria-label",
			"Commande #SYN-042, 4250.00 €, Jean Martin, Livrée",
		);
	});

	it("renders title attribute on truncated customer info", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

		const truncatedElement = screen.getByTitle("Marie Dupont • marie@example.com");
		expect(truncatedElement).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Footer link
	// -------------------------------------------------------------------------

	it("renders 'Voir toutes les commandes' link when orders exist", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

		const footerLink = screen.getByText("Voir toutes les commandes");
		expect(footerLink).toBeInTheDocument();
		expect(footerLink.closest("a")).toHaveAttribute("href", "/admin/ventes/commandes");
	});

	it("does not render footer link when no orders", () => {
		render(<RecentOrdersList listData={{ orders: [] }} />);

		expect(screen.queryByText("Voir toutes les commandes")).toBeNull();
	});

	it("renders multiple orders", () => {
		const orders = [
			createOrder({ id: "o1", orderNumber: "SYN-001" }),
			createOrder({ id: "o2", orderNumber: "SYN-002" }),
			createOrder({ id: "o3", orderNumber: "SYN-003" }),
		];

		render(<RecentOrdersList listData={{ orders }} />);

		expect(screen.getByText("#SYN-001")).toBeInTheDocument();
		expect(screen.getByText("#SYN-002")).toBeInTheDocument();
		expect(screen.getByText("#SYN-003")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Empty state
	// -------------------------------------------------------------------------

	describe("empty state", () => {
		it("renders empty message when no orders", () => {
			render(<RecentOrdersList listData={{ orders: [] }} />);

			// Empty state appears in both mobile section and desktop Card
			expect(screen.getAllByText("Aucune commande récente").length).toBeGreaterThanOrEqual(1);
		});

		it("does not render empty message when orders exist", () => {
			render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

			expect(screen.queryByText("Aucune commande récente")).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// Fulfillment status badge variant
	// -------------------------------------------------------------------------

	describe("fulfillment badge variant", () => {
		it("uses warning variant for UNFULFILLED status", () => {
			render(
				<RecentOrdersList
					listData={{
						orders: [
							createOrder({
								fulfillmentStatus: "UNFULFILLED" as RecentOrderItem["fulfillmentStatus"],
							}),
						],
					}}
				/>,
			);

			const badges = screen.getAllByTestId("badge");
			const fulfillmentBadge = badges.find((b) => b.textContent === "À préparer");
			expect(fulfillmentBadge).toHaveAttribute("data-variant", "warning");
		});

		it("uses success variant for DELIVERED status", () => {
			render(
				<RecentOrdersList
					listData={{
						orders: [
							createOrder({
								fulfillmentStatus: "DELIVERED" as RecentOrderItem["fulfillmentStatus"],
							}),
						],
					}}
				/>,
			);

			const badges = screen.getAllByTestId("badge");
			const fulfillmentBadge = badges.find((b) => b.textContent === "Livrée");
			expect(fulfillmentBadge).toHaveAttribute("data-variant", "success");
		});
	});
});
