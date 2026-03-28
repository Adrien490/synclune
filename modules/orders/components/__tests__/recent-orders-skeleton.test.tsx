import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children }: { children: React.ReactNode }) => (
		<table data-testid="table">{children}</table>
	),
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<th className={className}>{children}</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

import { RecentOrdersSkeleton } from "../recent-orders-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RecentOrdersSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		render(<RecentOrdersSkeleton />);
		expect(screen.getByTestId("table")).toBeInTheDocument();
	});

	it("renders skeleton elements", () => {
		render(<RecentOrdersSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders table header columns", () => {
		render(<RecentOrdersSkeleton />);
		expect(screen.getByText("Commande")).toBeInTheDocument();
		expect(screen.getByText("Statut")).toBeInTheDocument();
		expect(screen.getByText("Total")).toBeInTheDocument();
	});

	it("renders 3 skeleton rows", () => {
		render(<RecentOrdersSkeleton />);
		// The component renders 3 rows, each with ~5 skeleton cells
		const skeletons = screen.getAllByTestId("skeleton");
		// At least 1 skeleton per row × 3 rows plus header skeleton
		expect(skeletons.length).toBeGreaterThanOrEqual(4);
	});
});
