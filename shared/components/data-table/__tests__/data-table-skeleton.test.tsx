import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<table data-testid="table" className={className}>
			{children}
		</table>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => (
		<thead data-testid="table-header">{children}</thead>
	),
	TableBody: ({ children }: { children: React.ReactNode }) => (
		<tbody data-testid="table-body">{children}</tbody>
	),
	TableRow: ({ children }: { children: React.ReactNode }) => (
		<tr data-testid="table-row">{children}</tr>
	),
	TableHead: ({ children }: { children: React.ReactNode }) => (
		<th data-testid="table-head">{children}</th>
	),
	TableCell: ({ children }: { children: React.ReactNode }) => (
		<td data-testid="table-cell">{children}</td>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
		<div data-testid="skeleton" className={className} style={style} />
	),
}));

vi.mock("@/shared/components/cursor-pagination/cursor-pagination-skeleton", () => ({
	CursorPaginationSkeleton: () => <div data-testid="cursor-pagination-skeleton" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { DataTableSkeleton } from "../data-table-skeleton";

// ============================================================================
// HELPERS
// ============================================================================

const singleTextColumn = [{ cell: { type: "text" as const, width: "w-32" } }];

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DataTableSkeleton", () => {
	// ─── Row count ─────────────────────────────────────────────────────────

	it("renders 10 data rows by default", () => {
		render(<DataTableSkeleton columns={singleTextColumn} />);

		// tbody rows (excludes the header row)
		const tbody = screen.getByTestId("table-body");
		const rows = tbody.querySelectorAll("[data-testid='table-row']");
		expect(rows.length).toBe(10);
	});

	it("renders the correct number of rows when rows prop is provided", () => {
		render(<DataTableSkeleton columns={singleTextColumn} rows={5} />);

		const tbody = screen.getByTestId("table-body");
		const rows = tbody.querySelectorAll("[data-testid='table-row']");
		expect(rows.length).toBe(5);
	});

	// ─── Pagination ────────────────────────────────────────────────────────

	it("renders offset pagination skeleton by default", () => {
		render(<DataTableSkeleton columns={singleTextColumn} />);

		// Offset pagination: contains skeletons for count label + prev/next buttons
		// No cursor-pagination-skeleton
		expect(screen.queryByTestId("cursor-pagination-skeleton")).toBeNull();
		// The offset pagination wrapper contains skeletons
		const skeletons = screen.getAllByTestId("skeleton");
		// At least 1 column header + 10 body cells + 3 offset pagination skeletons
		expect(skeletons.length).toBeGreaterThan(10);
	});

	it("renders CursorPaginationSkeleton when pagination='cursor'", () => {
		render(<DataTableSkeleton columns={singleTextColumn} pagination="cursor" />);

		expect(screen.getByTestId("cursor-pagination-skeleton")).toBeInTheDocument();
	});

	it("renders no pagination when pagination='none'", () => {
		render(<DataTableSkeleton columns={singleTextColumn} pagination="none" />);

		expect(screen.queryByTestId("cursor-pagination-skeleton")).toBeNull();
		// With a single text column and 10 rows: 1 header skeleton + 10 body skeletons = 11
		// No extra offset pagination skeletons
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBe(11);
	});

	// ─── Cell types ────────────────────────────────────────────────────────

	it("renders skeleton for checkbox cell type", () => {
		render(
			<DataTableSkeleton columns={[{ cell: { type: "checkbox" } }]} rows={1} pagination="none" />,
		);

		const skeletons = screen.getAllByTestId("skeleton");
		// 1 header skeleton + 1 body cell skeleton = 2
		expect(skeletons.length).toBe(2);
		// checkbox skeleton: size-4
		const bodySkeletons = skeletons.filter((s) => s.className.includes("size-4"));
		expect(bodySkeletons.length).toBeGreaterThan(0);
	});

	it("renders skeleton for badge cell type with rounded-full class", () => {
		render(
			<DataTableSkeleton
				columns={[{ cell: { type: "badge", width: "w-20" } }]}
				rows={1}
				pagination="none"
			/>,
		);

		const skeletons = screen.getAllByTestId("skeleton");
		const badgeSkeletons = skeletons.filter((s) => s.className.includes("rounded-full"));
		expect(badgeSkeletons.length).toBeGreaterThan(0);
	});

	it("calls render function for custom cell type", () => {
		const renderFn = vi.fn(() => <span data-testid="custom-cell">custom</span>);

		render(
			<DataTableSkeleton
				columns={[{ cell: { type: "custom", render: renderFn } }]}
				rows={2}
				pagination="none"
			/>,
		);

		// render() is called once per row (2 rows) + 0 times for header (header uses a Skeleton directly)
		expect(renderFn).toHaveBeenCalledTimes(2);
		const customCells = screen.getAllByTestId("custom-cell");
		expect(customCells.length).toBe(2);
	});

	it("renders actions cell with ml-auto class", () => {
		render(
			<DataTableSkeleton columns={[{ cell: { type: "actions" } }]} rows={1} pagination="none" />,
		);

		const skeletons = screen.getAllByTestId("skeleton");
		const actionSkeletons = skeletons.filter((s) => s.className.includes("ml-auto"));
		expect(actionSkeletons.length).toBeGreaterThan(0);
	});

	// ─── Card wrapper ──────────────────────────────────────────────────────

	it("wraps content in a Card", () => {
		render(<DataTableSkeleton columns={singleTextColumn} />);

		expect(screen.getByTestId("card")).toBeInTheDocument();
		expect(screen.getByTestId("card-content")).toBeInTheDocument();
	});
});
