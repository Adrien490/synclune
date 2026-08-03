import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({
		children,
		className,
		role,
		"aria-busy": ariaBusy,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		role?: string;
		"aria-busy"?: boolean;
		"aria-label"?: string;
	}) => (
		<div
			data-testid="card"
			className={className}
			role={role}
			aria-busy={ariaBusy}
			aria-label={ariaLabel}
		>
			{children}
		</div>
	),
	CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-content" className={className}>
			{children}
		</div>
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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "chart-card",
		spacing: { kpiGap: "gap-4" },
	},
}));

import { KpiCardSkeleton, KpisSkeleton, ListSkeleton, VatProgressSkeleton } from "../index";

afterEach(cleanup);

// ============================================================================
// KpiCardSkeleton
// ============================================================================

describe("KpiCardSkeleton", () => {
	it("renders with card structure", () => {
		render(<KpiCardSkeleton />);
		expect(screen.getByTestId("card")).toBeInTheDocument();
		expect(screen.getByTestId("card-header")).toBeInTheDocument();
		expect(screen.getByTestId("card-content")).toBeInTheDocument();
	});

	it("renders skeleton placeholders inside the card", () => {
		render(<KpiCardSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// KpisSkeleton
// ============================================================================

describe("KpisSkeleton", () => {
	it("renders with role='status' and aria-busy", () => {
		render(<KpisSkeleton />);
		const status = screen.getByRole("status");
		expect(status).toBeInTheDocument();
		expect(status).toHaveAttribute("aria-busy", "true");
	});

	it("renders default 4 KpiCardSkeleton cards", () => {
		render(<KpisSkeleton />);
		// Each KpiCardSkeleton renders one card, header, content
		const cards = screen.getAllByTestId("card");
		expect(cards).toHaveLength(4);
	});

	it("renders the specified count of cards", () => {
		render(<KpisSkeleton count={3} />);
		const cards = screen.getAllByTestId("card");
		expect(cards).toHaveLength(3);
	});

	it("renders compact cards when compactCount > 0", () => {
		render(<KpisSkeleton count={4} compactCount={3} />);
		// 4 featured + 3 compact = 7 total cards
		const cards = screen.getAllByTestId("card");
		expect(cards).toHaveLength(7);
	});

	it("renders no compact row when compactCount is 0", () => {
		render(<KpisSkeleton count={2} compactCount={0} />);
		const cards = screen.getAllByTestId("card");
		expect(cards).toHaveLength(2);
	});

	it("renders only compact cards when count is 0", () => {
		render(<KpisSkeleton count={0} compactCount={3} />);
		const cards = screen.getAllByTestId("card");
		expect(cards).toHaveLength(3);
	});

	it("uses the default aria-label", () => {
		render(<KpisSkeleton />);
		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement des indicateurs");
	});

	it("uses a custom ariaLabel when provided", () => {
		render(<KpisSkeleton ariaLabel="Chargement KPIs ventes" />);
		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement KPIs ventes");
	});
});

// ============================================================================
// ListSkeleton
// ============================================================================

describe("ListSkeleton", () => {
	it("renders with role='status' and aria-busy", () => {
		render(<ListSkeleton />);
		const status = screen.getByRole("status");
		expect(status).toBeInTheDocument();
		expect(status).toHaveAttribute("aria-busy", "true");
	});

	it("uses the default aria-label", () => {
		render(<ListSkeleton />);
		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement de la liste");
	});

	it("renders default 5 list item rows", () => {
		const { container } = render(<ListSkeleton />);
		// Each item is a flex row with rounded-lg border
		const rows = container.querySelectorAll(".rounded-lg.border");
		expect(rows).toHaveLength(5);
	});

	it("renders the specified number of list item rows", () => {
		const { container } = render(<ListSkeleton itemCount={3} />);
		const rows = container.querySelectorAll(".rounded-lg.border");
		expect(rows).toHaveLength(3);
	});
});

// ============================================================================
// VatProgressSkeleton
// ============================================================================

describe("VatProgressSkeleton", () => {
	it("renders with role='status' and aria-busy", () => {
		render(<VatProgressSkeleton />);
		const status = screen.getByRole("status");
		expect(status).toBeInTheDocument();
		expect(status).toHaveAttribute("aria-busy", "true");
	});

	it("uses the default aria-label", () => {
		render(<VatProgressSkeleton />);
		expect(screen.getByRole("status")).toHaveAttribute(
			"aria-label",
			"Chargement du suivi de seuil TVA",
		);
	});

	it("accepts a custom ariaLabel", () => {
		render(<VatProgressSkeleton ariaLabel="Chargement seuil TVA franchise" />);
		expect(screen.getByRole("status")).toHaveAttribute(
			"aria-label",
			"Chargement seuil TVA franchise",
		);
	});

	it("imitates the structure of VatProgressCard (header + value/threshold + progress bar + caption)", () => {
		render(<VatProgressSkeleton />);
		// Header (title + icon) + content (value, threshold, progress bar, caption)
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThanOrEqual(5);
	});
});
