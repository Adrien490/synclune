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
		tableFixed,
	}: {
		className?: string;
		columns: Array<{
			width: string;
			cell: { type: string; width?: string; render?: () => React.ReactNode };
		}>;
		pagination?: string;
		tableFixed?: boolean;
	}) => (
		<div
			data-testid="data-table-skeleton"
			className={className}
			data-columns={columns.length}
			data-pagination={pagination}
			data-table-fixed={String(tableFixed)}
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

import { SubscribersDataTableSkeleton } from "../subscribers-data-table-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("SubscribersDataTableSkeleton", () => {
	it("renders a DataTableSkeleton", () => {
		render(<SubscribersDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	it("renders with hidden-on-mobile class", () => {
		render(<SubscribersDataTableSkeleton />);
		const skeleton = screen.getByTestId("data-table-skeleton");
		expect(skeleton.className).toContain("hidden");
		expect(skeleton.className).toContain("md:block");
	});

	it("renders 4 columns", () => {
		render(<SubscribersDataTableSkeleton />);
		const skeleton = screen.getByTestId("data-table-skeleton");
		expect(skeleton.getAttribute("data-columns")).toBe("4");
	});

	it("uses cursor pagination", () => {
		render(<SubscribersDataTableSkeleton />);
		const skeleton = screen.getByTestId("data-table-skeleton");
		expect(skeleton.getAttribute("data-pagination")).toBe("cursor");
	});

	it("tableFixed is false", () => {
		render(<SubscribersDataTableSkeleton />);
		const skeleton = screen.getByTestId("data-table-skeleton");
		expect(skeleton.getAttribute("data-table-fixed")).toBe("false");
	});

	it("renders custom status cell with circle and text skeletons", () => {
		render(<SubscribersDataTableSkeleton />);
		// Column index 1 is the custom cell (status)
		const customCell = screen.getByTestId("custom-cell-1");
		expect(customCell).toBeInTheDocument();
		const skeletons = customCell.querySelectorAll("[data-testid='skeleton']");
		expect(skeletons.length).toBe(2);
	});

	it("status cell skeleton includes a round icon placeholder", () => {
		render(<SubscribersDataTableSkeleton />);
		const customCell = screen.getByTestId("custom-cell-1");
		const roundSkeleton = customCell.querySelector(".rounded-full");
		expect(roundSkeleton).not.toBeNull();
	});
});
