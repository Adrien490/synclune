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

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 className={className}>{children}</h3>
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

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes/order-42");
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
