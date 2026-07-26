import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RecentOrderItem } from "../../types/dashboard.types";

// ============================================================================
// MOCKS (mobile path — `useIsMobile` returns true)
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
		style,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
		onClick?: (e: React.MouseEvent) => void;
		style?: React.CSSProperties;
	}) => (
		<a
			href={href}
			className={className}
			aria-label={ariaLabel}
			onClick={onClick}
			style={style}
			data-vt-name={(style as { viewTransitionName?: string } | undefined)?.viewTransitionName}
		>
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
	Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock("lucide-react", () => ({
	ArrowRight: () => <span data-testid="icon-arrow-right" />,
	ChevronRight: () => <span data-testid="icon-chevron-right" />,
	ShoppingBag: () => <span data-testid="icon-shopping-bag" />,
}));

// Item primitives — forward asChild + style for VT assertions
vi.mock("@/shared/components/ui/item", () => ({
	Item: ({ asChild, children }: { asChild?: boolean; size?: string; children: React.ReactNode }) =>
		asChild ? <>{children}</> : <div data-testid="item">{children}</div>,
	ItemGroup: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
	}) => <ul aria-label={ariaLabel}>{children}</ul>,
	ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	ItemActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemSeparator: () => <hr />,
	ItemDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => true,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		style,
	}: {
		children: React.ReactNode;
		variant?: string;
		style?: React.CSSProperties;
	}) => (
		<span
			data-testid="badge"
			data-variant={variant}
			data-vt-name={(style as { viewTransitionName?: string } | undefined)?.viewTransitionName}
		>
			{children}
		</span>
	),
}));

vi.mock("date-fns", () => ({
	format: (_date: Date) => "15/02 à 14:30",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("../../constants/order-status.constants", () => ({
	ORDER_STATUS_LABELS: {
		PROCESSING: "En traitement",
		DELIVERED: "Livrée",
	},
	ORDER_STATUS_VARIANTS: {
		PROCESSING: "default",
		DELIVERED: "success",
	},
	FULFILLMENT_STATUS_LABELS: {
		UNFULFILLED: "À préparer",
	},
	FULFILLMENT_STATUS_VARIANTS: {
		UNFULFILLED: "warning",
	},
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: { card: "", title: "" },
}));

import { RecentOrdersList } from "../recent-orders-list";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function createOrder(overrides: Partial<RecentOrderItem> = {}): RecentOrderItem {
	return {
		id: "order-42",
		orderNumber: "SYN-042",
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

describe("RecentOrdersList — mobile", () => {
	it("wraps each row in a Link to /admin/ventes/commandes/[id]", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder({ id: "abc-123" })] }} />);

		const link = screen.getAllByRole("link")[0]!;
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes/abc-123");
	});

	/**
	 * @regression no-haptic-on-passive-navigation
	 * Chaque ligne est un lien vers le détail commande : navigation passive.
	 */
	it("fires no haptic when a row is tapped", async () => {
		const user = userEvent.setup();
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

		await user.click(screen.getAllByRole("link")[0]!);
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("attaches viewTransitionName: order-card-${id} to the row Link", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder({ id: "abc-123" })] }} />);

		const link = screen.getAllByRole("link")[0]!;
		expect(link).toHaveAttribute("data-vt-name", "order-card-abc-123");
	});

	it("attaches order-status-${id} viewTransitionName on the status badge", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder({ id: "abc-123" })] }} />);

		const statusBadge = screen.getByTestId("badge");
		expect(statusBadge).toHaveAttribute("data-vt-name", "order-status-abc-123");
	});

	it("renders an aria-label summarizing the order on the Link", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);

		const link = screen.getAllByRole("link")[0]!;
		expect(link.getAttribute("aria-label")).toMatch(/commande #syn-042/i);
		expect(link.getAttribute("aria-label")).toMatch(/marie dupont/i);
		// total = centimes → formatEuro (8500 c = 85,00 €)
		expect(link.getAttribute("aria-label")).toMatch(/85,00/);
	});

	it("renders a ChevronRight affordance icon", () => {
		render(<RecentOrdersList listData={{ orders: [createOrder()] }} />);
		expect(screen.getByTestId("icon-chevron-right")).toBeInTheDocument();
	});

	it("renders an empty state with ShoppingBag icon when no orders", () => {
		render(<RecentOrdersList listData={{ orders: [] }} />);

		expect(screen.getByTestId("icon-shopping-bag")).toBeInTheDocument();
		expect(screen.getByText(/aucune commande récente/i)).toBeInTheDocument();
		expect(screen.getByText(/nouvelles commandes apparaîtront/i)).toBeInTheDocument();
	});
});
