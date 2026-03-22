import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/selection-toolbar", () => ({
	SelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="selection-toolbar">{children}</div>
	),
}));

vi.mock("../sku-selection-actions", () => ({
	ProductVariantSelectionActions: () => <div data-testid="sku-selection-actions" />,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { ProductVariantsSelectionToolbar } from "../skus-selection-toolbar";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductVariantsSelectionToolbar", () => {
	it("renders the SelectionToolbar", () => {
		render(<ProductVariantsSelectionToolbar />);

		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("renders the ProductVariantSelectionActions inside the toolbar", () => {
		render(<ProductVariantsSelectionToolbar />);

		expect(screen.getByTestId("sku-selection-actions")).toBeInTheDocument();
	});

	it("renders selection actions as a child of the toolbar", () => {
		render(<ProductVariantsSelectionToolbar />);

		const toolbar = screen.getByTestId("selection-toolbar");
		const actions = screen.getByTestId("sku-selection-actions");

		expect(toolbar).toContainElement(actions);
	});
});
