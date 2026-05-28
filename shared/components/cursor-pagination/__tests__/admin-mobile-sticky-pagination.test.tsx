/**
 * @regression admin-mobile-sticky-pagination
 *
 * Verrouille le comportement du wrapper `AdminMobileStickyPagination` (P1-4) :
 * - Hide pendant `selectionMode` actif (priorité MobileSelectionBottomBar)
 * - Sticky bottom au-dessus de `--bottom-bar-height`
 * - md:hidden (desktop a sa propre pagination via AdminDataTable)
 * - Fallback non-régressif hors BulkSelectionProvider (toujours visible)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { mockSelectionMode } = vi.hoisted(() => ({
	mockSelectionMode: { current: false as boolean | null },
}));

vi.mock("@/shared/components/data-table", () => ({
	useBulkSelectionContextOptional: () =>
		mockSelectionMode.current === null
			? null
			: { selectionMode: mockSelectionMode.current, selectedCount: 0, pageItemIds: [] },
}));

vi.mock("../cursor-pagination", () => ({
	CursorPagination: (props: Record<string, unknown>) => (
		<div data-testid="cursor-pagination" data-props={JSON.stringify(props)} />
	),
}));

import { AdminMobileStickyPagination } from "../admin-mobile-sticky-pagination";

const defaultProps = {
	perPage: 20,
	hasNextPage: true,
	hasPreviousPage: false,
	currentPageSize: 20,
	nextCursor: "cm1abc2def3ghi4jkl5mnop",
	prevCursor: null,
};

describe("AdminMobileStickyPagination", () => {
	beforeEach(() => {
		mockSelectionMode.current = false;
	});

	afterEach(cleanup);

	it("renders CursorPagination when no selection mode is active", () => {
		render(<AdminMobileStickyPagination {...defaultProps} />);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("returns null when selectionMode is true (MobileSelectionBottomBar takes precedence)", () => {
		mockSelectionMode.current = true;
		const { container } = render(<AdminMobileStickyPagination {...defaultProps} />);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByTestId("cursor-pagination")).not.toBeInTheDocument();
	});

	it("renders even when outside BulkSelectionProvider (fallback non-régressif)", () => {
		mockSelectionMode.current = null;
		render(<AdminMobileStickyPagination {...defaultProps} />);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("applies md:hidden + sticky bottom + backdrop-blur classes to wrapper", () => {
		const { container } = render(<AdminMobileStickyPagination {...defaultProps} />);
		const wrapper = container.querySelector("[data-admin-mobile-sticky-pagination]");
		expect(wrapper).toBeInTheDocument();
		expect(wrapper).toHaveClass("md:hidden");
		expect(wrapper?.className).toMatch(/sticky/);
		expect(wrapper?.className).toMatch(/bottom-\[var\(--bottom-bar-height,5rem\)\]/);
		expect(wrapper?.className).toMatch(/backdrop-blur/);
	});

	it("forwards all pagination props (perPage, cursors, totalCount, etc.) to CursorPagination", () => {
		render(<AdminMobileStickyPagination {...defaultProps} totalCount={127} />);
		const target = screen.getByTestId("cursor-pagination");
		const props = JSON.parse(target.getAttribute("data-props") ?? "{}");
		expect(props.perPage).toBe(20);
		expect(props.hasNextPage).toBe(true);
		expect(props.currentPageSize).toBe(20);
		expect(props.nextCursor).toBe("cm1abc2def3ghi4jkl5mnop");
		expect(props.totalCount).toBe(127);
	});

	it("accepts wrapperClassName override", () => {
		const { container } = render(
			<AdminMobileStickyPagination {...defaultProps} wrapperClassName="custom-class" />,
		);
		const wrapper = container.querySelector("[data-admin-mobile-sticky-pagination]");
		expect(wrapper).toHaveClass("custom-class");
	});
});
