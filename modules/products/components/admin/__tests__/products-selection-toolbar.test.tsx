import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockProductSelectionActions, mockSelectionToolbar } = vi.hoisted(() => ({
	mockProductSelectionActions: vi.fn(),
	mockSelectionToolbar: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/products/components/admin/product-selection-actions", () => ({
	ProductSelectionActions: (props: Record<string, unknown>) => {
		mockProductSelectionActions(props);
		return <div data-testid="product-selection-actions" />;
	},
}));

vi.mock("stripe", () => ({
	default: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: {},
	softDelete: {},
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {},
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/shared/components/selection-toolbar", () => ({
	SelectionToolbar: ({ children }: { children: React.ReactNode }) => {
		mockSelectionToolbar({});
		return <div data-testid="selection-toolbar">{children}</div>;
	},
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductsSelectionToolbar } from "../products-selection-toolbar";

// ============================================================================
// HELPERS
// ============================================================================

const PRODUCTS = [
	{ id: "prod-1", status: "PUBLIC" as const },
	{ id: "prod-2", status: "DRAFT" as const },
	{ id: "prod-3", status: "ARCHIVED" as const },
];

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductsSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders SelectionToolbar", () => {
			render(<ProductsSelectionToolbar products={PRODUCTS} />);
			expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
		});

		it("renders ProductSelectionActions inside the toolbar", () => {
			render(<ProductsSelectionToolbar products={PRODUCTS} />);
			expect(screen.getByTestId("product-selection-actions")).toBeInTheDocument();
		});
	});

	// ─── Props forwarding ─────────────────────────────────────────────────────

	describe("props forwarding", () => {
		it("passes products array to ProductSelectionActions", () => {
			render(<ProductsSelectionToolbar products={PRODUCTS} />);
			expect(mockProductSelectionActions).toHaveBeenCalledWith(
				expect.objectContaining({ products: PRODUCTS }),
			);
		});

		it("passes all products including archived ones", () => {
			const products = [{ id: "prod-archived", status: "ARCHIVED" as const }];
			render(<ProductsSelectionToolbar products={products} />);
			expect(mockProductSelectionActions).toHaveBeenCalledWith(
				expect.objectContaining({ products: products }),
			);
		});

		it("passes empty array when no products", () => {
			render(<ProductsSelectionToolbar products={[]} />);
			expect(mockProductSelectionActions).toHaveBeenCalledWith(
				expect.objectContaining({ products: [] }),
			);
		});
	});

	// ─── Composition ──────────────────────────────────────────────────────────

	describe("composition", () => {
		it("renders SelectionToolbar once", () => {
			render(<ProductsSelectionToolbar products={PRODUCTS} />);
			expect(mockSelectionToolbar).toHaveBeenCalledTimes(1);
		});

		it("renders ProductSelectionActions as child of SelectionToolbar", () => {
			render(<ProductsSelectionToolbar products={PRODUCTS} />);
			const toolbar = screen.getByTestId("selection-toolbar");
			const actions = screen.getByTestId("product-selection-actions");
			expect(toolbar).toContainElement(actions);
		});
	});
});
