import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockUseIsMobile = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));

vi.mock("@/shared/components/ui/tabs", () => ({
	Tabs: ({
		children,
		defaultValue,
		className,
	}: {
		children: React.ReactNode;
		defaultValue?: string;
		className?: string;
	}) => (
		<div data-testid="tabs" data-default-value={defaultValue} className={className}>
			{children}
		</div>
	),
	TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="tabs-list" role="tablist" className={className}>
			{children}
		</div>
	),
	TabsTrigger: ({
		children,
		value,
		className,
	}: {
		children: React.ReactNode;
		value: string;
		className?: string;
	}) => (
		<button
			data-testid={`tab-trigger-${value}`}
			role="tab"
			data-value={value}
			className={className}
		>
			{children}
		</button>
	),
	TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`tab-content-${value}`} data-value={value}>
			{children}
		</div>
	),
}));

import { DashboardListsTabs } from "../dashboard-lists-tabs";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// HELPERS
// ============================================================================

const ordersSlot = <div data-testid="orders-slot">Commandes récentes</div>;
const productsSlot = <div data-testid="products-slot">Top produits</div>;
const discountsSlot = <div data-testid="discounts-slot">Remises actives</div>;

function renderComponent() {
	return render(
		<DashboardListsTabs
			ordersSlot={ordersSlot}
			productsSlot={productsSlot}
			discountsSlot={discountsSlot}
		/>,
	);
}

// ============================================================================
// TESTS — DESKTOP (isMobile = false)
// ============================================================================

describe("DashboardListsTabs – desktop", () => {
	beforeEach(() => {
		mockUseIsMobile.mockReturnValue(false);
	});

	it("renders all three slots directly without tabs", () => {
		renderComponent();

		expect(screen.getByTestId("orders-slot")).toBeInTheDocument();
		expect(screen.getByTestId("products-slot")).toBeInTheDocument();
		expect(screen.getByTestId("discounts-slot")).toBeInTheDocument();
	});

	it("does not render a tabs component on desktop", () => {
		renderComponent();

		expect(screen.queryByTestId("tabs")).toBeNull();
	});

	it("does not render tab triggers on desktop", () => {
		renderComponent();

		expect(screen.queryByTestId("tab-trigger-orders")).toBeNull();
		expect(screen.queryByTestId("tab-trigger-products")).toBeNull();
		expect(screen.queryByTestId("tab-trigger-discounts")).toBeNull();
	});

	it("renders slots in a grid container on desktop", () => {
		const { container } = renderComponent();

		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();
	});

	it("applies xl:grid-cols-3 layout class on desktop", () => {
		const { container } = renderComponent();

		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("xl:grid-cols-3");
	});

	it("applies lg:grid-cols-2 layout class on desktop", () => {
		const { container } = renderComponent();

		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("lg:grid-cols-2");
	});
});

// ============================================================================
// TESTS — MOBILE (isMobile = true)
// ============================================================================

describe("DashboardListsTabs – mobile", () => {
	beforeEach(() => {
		mockUseIsMobile.mockReturnValue(true);
	});

	it("renders the tabs component on mobile", () => {
		renderComponent();

		expect(screen.getByTestId("tabs")).toBeInTheDocument();
	});

	it("sets defaultValue to 'orders' on the tabs component", () => {
		renderComponent();

		expect(screen.getByTestId("tabs")).toHaveAttribute("data-default-value", "orders");
	});

	it("renders all three tab triggers on mobile", () => {
		renderComponent();

		expect(screen.getByTestId("tab-trigger-orders")).toBeInTheDocument();
		expect(screen.getByTestId("tab-trigger-products")).toBeInTheDocument();
		expect(screen.getByTestId("tab-trigger-discounts")).toBeInTheDocument();
	});

	it("renders 'Commandes' tab trigger label", () => {
		renderComponent();

		expect(screen.getByTestId("tab-trigger-orders")).toHaveTextContent("Commandes");
	});

	it("renders 'Produits' tab trigger label", () => {
		renderComponent();

		expect(screen.getByTestId("tab-trigger-products")).toHaveTextContent("Produits");
	});

	it("renders 'Promos' tab trigger label", () => {
		renderComponent();

		expect(screen.getByTestId("tab-trigger-discounts")).toHaveTextContent("Promos");
	});

	it("renders all three tab content panels", () => {
		renderComponent();

		expect(screen.getByTestId("tab-content-orders")).toBeInTheDocument();
		expect(screen.getByTestId("tab-content-products")).toBeInTheDocument();
		expect(screen.getByTestId("tab-content-discounts")).toBeInTheDocument();
	});

	it("renders ordersSlot inside orders tab content", () => {
		renderComponent();

		const content = screen.getByTestId("tab-content-orders");
		expect(content).toContainElement(screen.getByTestId("orders-slot"));
	});

	it("renders productsSlot inside products tab content", () => {
		renderComponent();

		const content = screen.getByTestId("tab-content-products");
		expect(content).toContainElement(screen.getByTestId("products-slot"));
	});

	it("renders discountsSlot inside discounts tab content", () => {
		renderComponent();

		const content = screen.getByTestId("tab-content-discounts");
		expect(content).toContainElement(screen.getByTestId("discounts-slot"));
	});

	it("renders the tabs list with role tablist", () => {
		renderComponent();

		expect(screen.getByRole("tablist")).toBeInTheDocument();
	});

	it("renders tab triggers with role tab", () => {
		renderComponent();

		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(3);
	});

	it("does not render a plain grid container on mobile", () => {
		const { container } = renderComponent();

		// On mobile, no xl:grid-cols-3 class should be present (tabs layout)
		const grid = container.querySelector(".xl\\:grid-cols-3");
		expect(grid).toBeNull();
	});
});

// ============================================================================
// TESTS — RESPONSIVE SWITCH
// ============================================================================

describe("DashboardListsTabs – responsive switch", () => {
	it("switches from grid to tabs when isMobile changes to true", () => {
		mockUseIsMobile.mockReturnValue(false);

		const { rerender } = renderComponent();
		expect(screen.queryByTestId("tabs")).toBeNull();

		mockUseIsMobile.mockReturnValue(true);

		rerender(
			<DashboardListsTabs
				ordersSlot={ordersSlot}
				productsSlot={productsSlot}
				discountsSlot={discountsSlot}
			/>,
		);

		expect(screen.getByTestId("tabs")).toBeInTheDocument();
	});

	it("switches from tabs to grid when isMobile changes to false", () => {
		mockUseIsMobile.mockReturnValue(true);

		const { rerender } = renderComponent();
		expect(screen.getByTestId("tabs")).toBeInTheDocument();

		mockUseIsMobile.mockReturnValue(false);

		rerender(
			<DashboardListsTabs
				ordersSlot={ordersSlot}
				productsSlot={productsSlot}
				discountsSlot={discountsSlot}
			/>,
		);

		expect(screen.queryByTestId("tabs")).toBeNull();
	});
});
