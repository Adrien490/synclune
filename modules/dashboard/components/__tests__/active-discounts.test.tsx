import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActiveDiscountItem, GetActiveDiscountsReturn } from "../../types/dashboard.types";

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

vi.mock("lucide-react", () => ({
	ArrowRight: (props: any) => (
		<span data-testid="icon-arrow-right" aria-hidden={props["aria-hidden"]} />
	),

	Tag: (props: any) => <span data-testid="icon-tag" aria-hidden={props["aria-hidden"]} />,
	TriangleAlert: ({
		"aria-label": ariaLabel,
		className,
	}: {
		"aria-label"?: string;
		className?: string;
	}) => <span data-testid="icon-triangle-alert" aria-label={ariaLabel} className={className} />,
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
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...props}>{children}</button>),
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

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "mock-card-class",
		title: "mock-title-class",
	},
}));

import { ActiveDiscounts } from "../active-discounts";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function makeDiscount(overrides: Partial<ActiveDiscountItem> = {}): ActiveDiscountItem {
	return {
		id: "discount-1",
		code: "SUMMER10",
		type: "PERCENTAGE",
		value: 10,
		usageCount: 5,
		maxUsageCount: null,
		endsAt: null,
		...overrides,
	};
}

function makeData(discounts: ActiveDiscountItem[]): GetActiveDiscountsReturn {
	return { discounts };
}

function makeFutureDate(daysFromNow: number): Date {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date;
}

// ============================================================================
// TESTS
// ============================================================================

describe("ActiveDiscounts", () => {
	// -------------------------------------------------------------------------
	// Returns null when no discounts
	// -------------------------------------------------------------------------

	it("returns null when discounts array is empty", () => {
		const { container } = render(<ActiveDiscounts data={makeData([])} />);

		expect(container.firstChild).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Title and description
	// -------------------------------------------------------------------------

	it("renders the card title", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount()])} />);

		expect(screen.getByText("Codes promo actifs")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Pluralization
	// -------------------------------------------------------------------------

	it("renders singular 'code actif' for 1 discount", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount()])} />);

		expect(screen.getByText("1 code actif")).toBeInTheDocument();
	});

	it("renders plural 'codes actifs' for multiple discounts", () => {
		render(
			<ActiveDiscounts
				data={makeData([
					makeDiscount({ id: "d1", code: "CODE1" }),
					makeDiscount({ id: "d2", code: "CODE2" }),
					makeDiscount({ id: "d3", code: "CODE3" }),
				])}
			/>,
		);

		expect(screen.getByText("3 codes actifs")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Discount code and type/value display
	// -------------------------------------------------------------------------

	it("renders discount code", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount({ code: "SUMMER10" })])} />);

		expect(screen.getByText("SUMMER10")).toBeInTheDocument();
	});

	it("renders percentage discount value with minus sign", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount({ type: "PERCENTAGE", value: 20 })])} />);

		expect(screen.getByText("-20%")).toBeInTheDocument();
	});

	it("renders fixed amount discount value in euros", () => {
		render(
			<ActiveDiscounts data={makeData([makeDiscount({ type: "FIXED_AMOUNT", value: 1000 })])} />,
		);

		expect(screen.getByText("-10 €")).toBeInTheDocument();
	});

	it("renders outline variant on discount type badge", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount()])} />);

		const badge = screen.getByTestId("badge");
		expect(badge).toHaveAttribute("data-variant", "outline");
	});

	// -------------------------------------------------------------------------
	// Usage count
	// -------------------------------------------------------------------------

	it("renders usage count without max when maxUsageCount is null", () => {
		render(
			<ActiveDiscounts data={makeData([makeDiscount({ usageCount: 42, maxUsageCount: null })])} />,
		);

		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("renders usage count with max when maxUsageCount is set", () => {
		render(
			<ActiveDiscounts data={makeData([makeDiscount({ usageCount: 30, maxUsageCount: 100 })])} />,
		);

		expect(screen.getByText("30/100")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Near-expiry warning
	// -------------------------------------------------------------------------

	it("renders warning icon when discount expires within 7 days", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount({ endsAt: makeFutureDate(5) })])} />);

		expect(screen.getByTestId("icon-triangle-alert")).toBeInTheDocument();
	});

	it("renders warning icon with 'Expire bientot' label for near-expiry", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount({ endsAt: makeFutureDate(3) })])} />);

		const warning = screen.getByTestId("icon-triangle-alert");
		expect(warning).toHaveAttribute("aria-label", "Expire bientot");
	});

	it("does not render warning icon when endsAt is null", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount({ endsAt: null })])} />);

		expect(screen.queryByTestId("icon-triangle-alert")).toBeNull();
	});

	it("does not render warning icon when expiry is more than 7 days away", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount({ endsAt: makeFutureDate(10) })])} />);

		expect(screen.queryByTestId("icon-triangle-alert")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Near-saturation warning
	// -------------------------------------------------------------------------

	it("renders warning icon when usage is at 80% of max", () => {
		render(
			<ActiveDiscounts data={makeData([makeDiscount({ usageCount: 80, maxUsageCount: 100 })])} />,
		);

		expect(screen.getByTestId("icon-triangle-alert")).toBeInTheDocument();
	});

	it("renders warning icon with 'Presque sature' label for near-saturation", () => {
		render(
			<ActiveDiscounts data={makeData([makeDiscount({ usageCount: 90, maxUsageCount: 100 })])} />,
		);

		const warning = screen.getByTestId("icon-triangle-alert");
		expect(warning).toHaveAttribute("aria-label", "Presque sature");
	});

	it("does not render warning icon when usage is below 80%", () => {
		render(
			<ActiveDiscounts data={makeData([makeDiscount({ usageCount: 70, maxUsageCount: 100 })])} />,
		);

		expect(screen.queryByTestId("icon-triangle-alert")).toBeNull();
	});

	it("does not render warning icon when maxUsageCount is null regardless of usageCount", () => {
		render(
			<ActiveDiscounts
				data={makeData([makeDiscount({ usageCount: 9999, maxUsageCount: null })])}
			/>,
		);

		expect(screen.queryByTestId("icon-triangle-alert")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Footer link
	// -------------------------------------------------------------------------

	it("renders footer link to discounts page", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount()])} />);

		const link = screen.getByText("Gerer les codes promo");
		expect(link).toBeInTheDocument();
		expect(link.closest("a")).toHaveAttribute("href", "/admin/marketing/discounts");
	});

	it("renders arrow right icon in footer", () => {
		render(<ActiveDiscounts data={makeData([makeDiscount()])} />);

		expect(screen.getByTestId("icon-arrow-right")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Multiple discounts
	// -------------------------------------------------------------------------

	it("renders multiple discount codes", () => {
		render(
			<ActiveDiscounts
				data={makeData([
					makeDiscount({ id: "d1", code: "PROMO10" }),
					makeDiscount({ id: "d2", code: "FLASH20" }),
				])}
			/>,
		);

		expect(screen.getByText("PROMO10")).toBeInTheDocument();
		expect(screen.getByText("FLASH20")).toBeInTheDocument();
	});
});
