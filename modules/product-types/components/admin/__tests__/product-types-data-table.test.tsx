import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/product-types/components/admin/product-type-row-actions", () => ({
	ProductTypeRowActions: ({ label }: { label: string }) => (
		<div data-testid={`row-actions-${label}`}>Actions</div>
	),
}));

vi.mock("@/modules/product-types/components/admin/product-type-active-toggle", () => ({
	ProductTypeActiveToggle: ({ isActive }: { isActive: boolean }) => (
		<div data-testid="active-toggle" data-active={isActive} />
	),
}));

vi.mock("@/modules/product-types/components/admin/product-types-selection-toolbar", () => ({
	ProductTypesSelectionToolbar: () => <div data-testid="selection-toolbar" />,
}));

vi.mock("@/modules/product-types/components/admin/create-product-type-button", () => ({
	CreateProductTypeButton: () => <button>Créer un type</button>,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
	}: {
		title: string;
		description: string;
		icon?: unknown;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="empty-state">
			<p>{title}</p>
			<p>{description}</p>
		</div>
	),
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: ({ type }: { type: string; itemIds?: string[]; itemId?: string }) => (
		<div data-testid={`selection-cell-${type}`} />
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		caption?: string;
		className?: string;
		role?: string;
	}) => (
		<table data-testid="product-types-table" aria-label={ariaLabel}>
			{children}
		</table>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableHead: ({
		children,
		className,
	}: {
		children?: React.ReactNode;
		className?: string;
		scope?: string;
		role?: string;
		"aria-label"?: string;
	}) => <th className={className}>{children}</th>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
	TableCell: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
}));

vi.mock("lucide-react", () => ({
	Tags: () => <svg data-testid="icon-tags" />,
}));

import { ProductTypesDataTable } from "../product-types-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		label: "Colliers",
		description: "Types de colliers",
		slug: "colliers",
		isActive: true,
		isSystem: false,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		_count: { products: 3 },
		...overrides,
	};
}

function createPagination(overrides: Record<string, unknown> = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypesDataTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no product types", async () => {
		const promise = Promise.resolve({ productTypes: [], pagination: createPagination() });
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
	});

	it("shows empty state title 'Aucun type trouvé'", async () => {
		const promise = Promise.resolve({ productTypes: [], pagination: createPagination() });
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByText("Aucun type trouvé")).toBeInTheDocument();
	});

	// ─── Table renders ────────────────────────────────────────────────────────

	it("renders table when product types are present", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType()],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("product-types-table")).toBeInTheDocument();
	});

	it("shows label in table row", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType({ label: "Bagues" })],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("shows description in table row", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType({ description: "Ma description" })],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByText("Ma description")).toBeInTheDocument();
	});

	it("shows '-' when description is null", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType({ description: null })],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("shows products count in table row", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType({ _count: { products: 7 } })],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByText("7")).toBeInTheDocument();
	});

	it("renders active toggle for each row", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType()],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("active-toggle")).toBeInTheDocument();
	});

	it("renders row actions for each row", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType({ label: "Colliers" })],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("row-actions-Colliers")).toBeInTheDocument();
	});

	it("renders cursor pagination", async () => {
		const promise = Promise.resolve({
			productTypes: [createProductType()],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders multiple rows when multiple product types are present", async () => {
		const promise = Promise.resolve({
			productTypes: [
				createProductType({ id: "pt-1", label: "Colliers" }),
				createProductType({ id: "pt-2", label: "Bagues" }),
			],
			pagination: createPagination(),
		});
		render(await ProductTypesDataTable({ productTypesPromise: promise, perPage: 20 }));
		expect(screen.getByText("Colliers")).toBeInTheDocument();
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});
});
