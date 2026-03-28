import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/data-table", () => ({
	DataTableSkeleton: ({
		className,
		columns,
		pagination,
	}: {
		className?: string;
		columns: Array<{
			width: string;
			cell: { type: string; width?: string; render?: () => React.ReactNode };
			align?: string;
		}>;
		pagination?: string;
		tableFixed?: boolean;
	}) => (
		<div
			data-testid="data-table-skeleton"
			className={className}
			data-columns={columns.length}
			data-pagination={pagination}
		>
			{columns.map((col, i) =>
				col.cell.type === "custom" && col.cell.render ? (
					<div key={i} data-testid={`custom-cell-${i}`}>
						{col.cell.render()}
					</div>
				) : null,
			)}
		</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UsersDataTableSkeleton } from "../users-data-table-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("UsersDataTableSkeleton", () => {
	it("renders a DataTableSkeleton", () => {
		render(<UsersDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	it("renders with hidden-on-mobile class", () => {
		render(<UsersDataTableSkeleton />);
		const skeleton = screen.getByTestId("data-table-skeleton");
		expect(skeleton.className).toContain("hidden");
		expect(skeleton.className).toContain("md:block");
	});

	it("renders 6 columns", () => {
		render(<UsersDataTableSkeleton />);
		const skeleton = screen.getByTestId("data-table-skeleton");
		expect(skeleton.getAttribute("data-columns")).toBe("6");
	});

	it("uses cursor pagination", () => {
		render(<UsersDataTableSkeleton />);
		const skeleton = screen.getByTestId("data-table-skeleton");
		expect(skeleton.getAttribute("data-pagination")).toBe("cursor");
	});

	it("renders the custom email cell with skeletons", () => {
		render(<UsersDataTableSkeleton />);
		// The 3rd column (index 2) is the custom email cell
		const customCell = screen.getByTestId("custom-cell-2");
		expect(customCell).toBeInTheDocument();
		const skeletons = customCell.querySelectorAll("[data-testid='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(2);
	});
});
