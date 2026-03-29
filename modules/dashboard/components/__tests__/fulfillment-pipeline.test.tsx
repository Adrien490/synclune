import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FulfillmentPipeline } from "../../types/dashboard.types";

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
	AlertTriangle: (props: any) => (
		<span data-testid="icon-alert-triangle" aria-hidden={props["aria-hidden"]} />
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

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-header" className={className}>
			{children}
		</div>
	),
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

import { FulfillmentPipelineCard } from "../fulfillment-pipeline";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function makePipeline(overrides: Partial<FulfillmentPipeline> = {}): FulfillmentPipeline {
	return {
		unfulfilled: 0,
		processing: 0,
		shipped: 0,
		delivered: 0,
		returned: 0,
		lateShipments: 0,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("FulfillmentPipelineCard", () => {
	// -------------------------------------------------------------------------
	// Null when total is 0
	// -------------------------------------------------------------------------

	it("returns null when total is 0", () => {
		const { container } = render(<FulfillmentPipelineCard pipeline={makePipeline()} />);

		expect(container.firstChild).toBeNull();
	});

	it("renders when at least one stage has orders", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 5 })} />);

		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Title and description
	// -------------------------------------------------------------------------

	it("renders the card title", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 3 })} />);

		expect(screen.getByText("Pipeline d'expedition")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Pluralization
	// -------------------------------------------------------------------------

	it("renders singular 'commande' for 1 order", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 1 })} />);

		expect(screen.getByText("1 commande payee")).toBeInTheDocument();
	});

	it("renders plural 'commandes' for multiple orders", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 3, shipped: 2 })} />);

		expect(screen.getByText("5 commandes payees")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Late shipments badge
	// -------------------------------------------------------------------------

	it("renders late shipments badge when lateShipments > 0", () => {
		render(
			<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 10, lateShipments: 3 })} />,
		);

		expect(screen.getByText(/3 en retard/)).toBeInTheDocument();
	});

	it("does not render late shipments badge when lateShipments is 0", () => {
		render(
			<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 10, lateShipments: 0 })} />,
		);

		expect(screen.queryByText(/en retard/)).toBeNull();
	});

	it("links late shipments badge to unfulfilled orders", () => {
		render(
			<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 5, lateShipments: 2 })} />,
		);

		const link = screen.getByText(/2 en retard/).closest("a");
		expect(link).toHaveAttribute(
			"href",
			"/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED",
		);
	});

	it("renders destructive variant on late shipments badge", () => {
		render(
			<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 5, lateShipments: 1 })} />,
		);

		const badge = screen.getByTestId("badge");
		expect(badge).toHaveAttribute("data-variant", "destructive");
	});

	// -------------------------------------------------------------------------
	// Segmented bar accessibility
	// -------------------------------------------------------------------------

	it("renders segmented bar with role=img", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 4, shipped: 6 })} />);

		const bar = screen.getByRole("img");
		expect(bar).toBeInTheDocument();
	});

	it("renders aria-label on the bar describing pipeline stages", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 4, shipped: 6 })} />);

		const bar = screen.getByRole("img");
		expect(bar.getAttribute("aria-label")).toContain("4");
		expect(bar.getAttribute("aria-label")).toContain("a preparer");
		expect(bar.getAttribute("aria-label")).toContain("6");
		expect(bar.getAttribute("aria-label")).toContain("expediees");
	});

	// -------------------------------------------------------------------------
	// Legend items
	// -------------------------------------------------------------------------

	it("renders legend links for non-zero stages", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 3, shipped: 5 })} />);

		const links = screen.getAllByRole("link");
		// One link for shipped legend, one for unfulfilled legend (late shipments badge absent)
		const hrefValues = links.map((l) => l.getAttribute("href"));
		expect(hrefValues).toContain("/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED");
		expect(hrefValues).toContain("/admin/ventes/commandes?filter_fulfillmentStatus=SHIPPED");
	});

	it("does not render legend links for zero-count stages", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ unfulfilled: 5 })} />);

		const links = screen.getAllByRole("link");
		const hrefValues = links.map((l) => l.getAttribute("href"));
		expect(hrefValues).not.toContain("/admin/ventes/commandes?filter_fulfillmentStatus=DELIVERED");
		expect(hrefValues).not.toContain("/admin/ventes/commandes?filter_fulfillmentStatus=RETURNED");
	});

	it("renders stage count and label in legend", () => {
		render(<FulfillmentPipelineCard pipeline={makePipeline({ processing: 7 })} />);

		expect(screen.getByText("7 en preparation")).toBeInTheDocument();
	});

	it("renders correct filter URLs for each stage in legend", () => {
		render(
			<FulfillmentPipelineCard
				pipeline={makePipeline({
					unfulfilled: 1,
					processing: 2,
					shipped: 3,
					delivered: 4,
					returned: 5,
				})}
			/>,
		);

		const links = screen.getAllByRole("link");
		const hrefValues = links.map((l) => l.getAttribute("href"));

		expect(hrefValues).toContain("/admin/ventes/commandes?filter_fulfillmentStatus=PROCESSING");
		expect(hrefValues).toContain("/admin/ventes/commandes?filter_fulfillmentStatus=DELIVERED");
		expect(hrefValues).toContain("/admin/ventes/commandes?filter_fulfillmentStatus=RETURNED");
	});

	// -------------------------------------------------------------------------
	// Stage labels
	// -------------------------------------------------------------------------

	it("renders all stage labels when all stages have counts", () => {
		render(
			<FulfillmentPipelineCard
				pipeline={makePipeline({
					unfulfilled: 1,
					processing: 1,
					shipped: 1,
					delivered: 1,
					returned: 1,
				})}
			/>,
		);

		expect(screen.getByText("1 a preparer")).toBeInTheDocument();
		expect(screen.getByText("1 en preparation")).toBeInTheDocument();
		expect(screen.getByText("1 expediees")).toBeInTheDocument();
		expect(screen.getByText("1 livrees")).toBeInTheDocument();
		expect(screen.getByText("1 retournees")).toBeInTheDocument();
	});
});
