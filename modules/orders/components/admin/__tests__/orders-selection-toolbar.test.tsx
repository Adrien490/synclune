import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectedItems } = vi.hoisted(() => ({
	mockSelectedItems: { current: [] as string[] },
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({ selectedItems: mockSelectedItems.current }),
}));

vi.mock("@/shared/components/selection-toolbar", () => ({
	SelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="selection-toolbar">{children}</div>
	),
}));

vi.mock("@/modules/orders/components/admin/order-selection-actions", () => ({
	OrderSelectionActions: () => <div data-testid="order-selection-actions" />,
}));

import { OrdersSelectionToolbar } from "../orders-selection-toolbar";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.current = [];
	});

	it("renders nothing when no items are selected", () => {
		mockSelectedItems.current = [];
		render(<OrdersSelectionToolbar />);
		expect(screen.queryByTestId("selection-toolbar")).not.toBeInTheDocument();
	});

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.current = ["order-1", "order-2"];
		render(<OrdersSelectionToolbar />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("shows singular label for one selected item", () => {
		mockSelectedItems.current = ["order-1"];
		render(<OrdersSelectionToolbar />);
		expect(screen.getByText("1 commande sélectionnée")).toBeInTheDocument();
	});

	it("shows plural label for multiple selected items", () => {
		mockSelectedItems.current = ["order-1", "order-2", "order-3"];
		render(<OrdersSelectionToolbar />);
		expect(screen.getByText("3 commandes sélectionnées")).toBeInTheDocument();
	});

	it("renders OrderSelectionActions when items are selected", () => {
		mockSelectedItems.current = ["order-1"];
		render(<OrdersSelectionToolbar />);
		expect(screen.getByTestId("order-selection-actions")).toBeInTheDocument();
	});
});
