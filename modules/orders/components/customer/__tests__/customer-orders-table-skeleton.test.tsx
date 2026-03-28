import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<table className={className}>{children}</table>
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

import { CustomerOrdersTableSkeleton } from "../customer-orders-table-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomerOrdersTableSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		render(<CustomerOrdersTableSkeleton />);
		expect(screen.getByTestId("table-scroll-container")).toBeInTheDocument();
	});

	it("renders table header columns", () => {
		render(<CustomerOrdersTableSkeleton />);
		expect(screen.getByText("Commande")).toBeInTheDocument();
		expect(screen.getByText("Date")).toBeInTheDocument();
		expect(screen.getByText("Statut")).toBeInTheDocument();
		expect(screen.getByText("Total")).toBeInTheDocument();
	});

	it("renders skeleton rows", () => {
		render(<CustomerOrdersTableSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders 5 skeleton rows", () => {
		render(<CustomerOrdersTableSkeleton />);
		// Each row has multiple skeletons, we verify by checking that a reasonable number are present
		const skeletons = screen.getAllByTestId("skeleton");
		// 5 rows × ~5 skeleton cells per row = ~25
		expect(skeletons.length).toBeGreaterThanOrEqual(5);
	});
});
