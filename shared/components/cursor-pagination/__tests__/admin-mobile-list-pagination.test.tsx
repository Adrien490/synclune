/**
 * @regression admin-mobile-list-pagination
 *
 * Verrouille le comportement du wrapper `AdminMobileListPagination` :
 * - md:hidden (desktop a sa propre pagination via AdminDataTable)
 * - Hide pendant `selectionMode` actif (priorité MobileSelectionBottomBar)
 * - Fallback non-régressif hors BulkSelectionProvider (toujours visible)
 * - Pas de positionnement sticky (rendu en flux normal en bas de liste)
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

import { AdminMobileListPagination } from "../admin-mobile-list-pagination";

const defaultProps = {
	perPage: 20,
	hasNextPage: true,
	hasPreviousPage: false,
	currentPageSize: 20,
	nextCursor: "cm1abc2def3ghi4jkl5mnop",
	prevCursor: null,
};

describe("AdminMobileListPagination", () => {
	beforeEach(() => {
		mockSelectionMode.current = false;
	});

	afterEach(cleanup);

	it("renders CursorPagination when no selection mode is active", () => {
		render(<AdminMobileListPagination {...defaultProps} />);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("returns null when selectionMode is true (MobileSelectionBottomBar takes precedence)", () => {
		mockSelectionMode.current = true;
		const { container } = render(<AdminMobileListPagination {...defaultProps} />);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByTestId("cursor-pagination")).not.toBeInTheDocument();
	});

	it("renders even when outside BulkSelectionProvider (fallback non-régressif)", () => {
		mockSelectionMode.current = null;
		render(<AdminMobileListPagination {...defaultProps} />);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("applies md:hidden class to wrapper", () => {
		const { container } = render(<AdminMobileListPagination {...defaultProps} />);
		const wrapper = container.querySelector("[data-admin-mobile-list-pagination]");
		expect(wrapper).toBeInTheDocument();
		expect(wrapper).toHaveClass("md:hidden");
	});

	it("does not apply sticky positioning, backdrop-blur, or negative margin bleed", () => {
		const { container } = render(<AdminMobileListPagination {...defaultProps} />);
		const wrapper = container.querySelector("[data-admin-mobile-list-pagination]");
		expect(wrapper?.className ?? "").not.toMatch(/sticky/);
		expect(wrapper?.className ?? "").not.toMatch(/backdrop-blur/);
		expect(wrapper?.className ?? "").not.toMatch(/-mx-/);
	});

	it("forwards all pagination props (perPage, cursors, totalCount, etc.) to CursorPagination", () => {
		render(<AdminMobileListPagination {...defaultProps} totalCount={127} />);
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
			<AdminMobileListPagination {...defaultProps} wrapperClassName="custom-class" />,
		);
		const wrapper = container.querySelector("[data-admin-mobile-list-pagination]");
		expect(wrapper).toHaveClass("custom-class");
	});
});
