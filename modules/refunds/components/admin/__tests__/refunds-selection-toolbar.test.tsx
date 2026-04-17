import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseSelectionContext } = vi.hoisted(() => ({
	mockUseSelectionContext: vi.fn(),
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: mockUseSelectionContext,
}));

vi.mock("@/shared/components/selection-toolbar", () => ({
	SelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="selection-toolbar">{children}</div>
	),
}));

vi.mock("../refund-selection-actions", () => ({
	RefundSelectionActions: () => <div data-testid="refund-selection-actions" />,
}));

import { RefundsSelectionToolbar } from "../refunds-selection-toolbar";

afterEach(cleanup);

describe("RefundsSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders nothing when no items are selected", () => {
		mockUseSelectionContext.mockReturnValue({ selectedItems: [] });

		const { container } = render(<RefundsSelectionToolbar />);

		expect(container.firstChild).toBeNull();
	});

	it("renders the toolbar when items are selected", () => {
		mockUseSelectionContext.mockReturnValue({ selectedItems: ["a", "b"] });

		render(<RefundsSelectionToolbar />);

		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("uses singular wording for 1 selected item", () => {
		mockUseSelectionContext.mockReturnValue({ selectedItems: ["a"] });

		render(<RefundsSelectionToolbar />);

		expect(screen.getByText("1 remboursement sélectionné")).toBeInTheDocument();
	});

	it("uses plural wording for >1 selected items", () => {
		mockUseSelectionContext.mockReturnValue({ selectedItems: ["a", "b", "c"] });

		render(<RefundsSelectionToolbar />);

		expect(screen.getByText("3 remboursements sélectionnés")).toBeInTheDocument();
	});

	it("renders the RefundSelectionActions component when items are selected", () => {
		mockUseSelectionContext.mockReturnValue({ selectedItems: ["a"] });

		render(<RefundsSelectionToolbar />);

		expect(screen.getByTestId("refund-selection-actions")).toBeInTheDocument();
	});
});
