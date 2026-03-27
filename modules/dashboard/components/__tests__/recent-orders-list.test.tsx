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

		expect(screen.getByText("Dernières commandes")).toBeInTheDocument();
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

	it("renders payment status badge", () => {
		render(
			<RecentOrdersList
				listData={{
					orders: [createOrder({ paymentStatus: "PAID" as RecentOrderItem["paymentStatus"] })],
				}}
			/>,
		);

		expect(screen.getByText("Payée")).toBeInTheDocument();
	});

	it("links each order to its detail page", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder({ id: "order-42" })] }} />);

		const links = screen.getAllByRole("link");
		const orderLink = links.find((l) => l.getAttribute("href")?.includes("order-42"));
		expect(orderLink).toHaveAttribute("href", "/admin/ventes/commandes/order-42");
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

			expect(screen.getByText("Aucune commande récente")).toBeInTheDocument();
		});

		it("does not render empty message when orders exist", () => {
			render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

			expect(screen.queryByText("Aucune commande récente")).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// Payment status badge variant
	// -------------------------------------------------------------------------

	describe("payment badge variant", () => {
		it("uses default variant for PAID status", () => {
			render(
				<RecentOrdersList
					listData={{
						orders: [createOrder({ paymentStatus: "PAID" as RecentOrderItem["paymentStatus"] })],
					}}
				/>,
			);

			const badges = screen.getAllByTestId("badge");
			const paymentBadge = badges.find((b) => b.textContent === "Payée");
			expect(paymentBadge).toHaveAttribute("data-variant", "default");
		});

		it("uses outline variant for non-PAID status", () => {
			render(
				<RecentOrdersList
					listData={{
						orders: [createOrder({ paymentStatus: "PENDING" as RecentOrderItem["paymentStatus"] })],
					}}
				/>,
			);

			const badges = screen.getAllByTestId("badge");
			// The second badge (payment) should be outline for non-PAID
			const paymentBadges = badges.filter((b) => b.className.includes("text-xs"));
			expect(paymentBadges[0]).toHaveAttribute("data-variant", "outline");
		});
	});
});
