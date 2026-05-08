import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: (props: any) => (
		<div
			data-testid="card"
			className={props.className}
			role={props.role}
			aria-busy={props["aria-busy"]}
			aria-label={props["aria-label"]}
		>
			{props.children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-header" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "chart-card",
	},
}));

import { FulfillmentSkeleton } from "../skeletons/fulfillment-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("FulfillmentSkeleton", () => {
	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	it("renders with role=status", () => {
		render(<FulfillmentSkeleton />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-busy=true", () => {
		render(<FulfillmentSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("has the correct aria-label", () => {
		render(<FulfillmentSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute(
			"aria-label",
			"Chargement du pipeline d'expédition",
		);
	});

	// -------------------------------------------------------------------------
	// Structure
	// -------------------------------------------------------------------------

	it("renders a Card", () => {
		render(<FulfillmentSkeleton />);

		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders skeleton placeholders for title and subtitle in header", () => {
		render(<FulfillmentSkeleton />);

		const header = screen.getByTestId("card-header");
		const skeletons = header.querySelectorAll("[data-testid='skeleton']");
		expect(skeletons).toHaveLength(2);
	});

	it("renders a progress bar skeleton", () => {
		render(<FulfillmentSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		const hasProgressBar = skeletons.some(
			(s) => s.className.includes("h-3") && s.className.includes("w-full"),
		);
		expect(hasProgressBar).toBe(true);
	});

	it("renders 4 legend item skeletons", () => {
		render(<FulfillmentSkeleton />);

		// Each legend item has a dot skeleton (size-2.5 rounded-full) and a label skeleton
		const skeletons = screen.getAllByTestId("skeleton");
		const dotSkeletons = skeletons.filter((s) => s.className.includes("size-2.5"));
		expect(dotSkeletons).toHaveLength(4);
	});

	it("renders skeleton placeholders for all legend labels", () => {
		render(<FulfillmentSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		const labelSkeletons = skeletons.filter(
			(s) => s.className.includes("h-3") && s.className.includes("w-16"),
		);
		expect(labelSkeletons).toHaveLength(4);
	});
});
