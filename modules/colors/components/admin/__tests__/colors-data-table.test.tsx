import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/colors/components/admin/color-active-toggle", () => ({
	ColorActiveToggle: ({ colorId, isActive }: { colorId: string; isActive: boolean }) => (
		<div data-testid={`active-toggle-${colorId}`} data-active={isActive} />
	),
}));

vi.mock("@/modules/colors/components/colors-row-actions", () => ({
	ColorsRowActions: ({ colorId, colorName }: { colorId: string; colorName: string }) => (
		<div data-testid={`row-actions-${colorId}`}>{colorName}</div>
	),
}));

vi.mock("@/modules/colors/components/colors-selection-toolbar", () => ({
	ColorsSelectionToolbar: () => <div data-testid="selection-toolbar" />,
}));

vi.mock("@/modules/colors/components/admin/create-color-button", () => ({
	CreateColorButton: () => <button>Créer une couleur</button>,
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
		actionElement,
	}: {
		title: string;
		description: string;
		icon?: unknown;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="empty-state">
			<p>{title}</p>
			<p>{description}</p>
			{actionElement}
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
		role?: string;
		className?: string;
	}) => (
		<table data-testid="colors-table" aria-label={ariaLabel}>
			{children}
		</table>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableHead: ({
		children,
		scope,
		role,
		className,
		"aria-label": ariaLabel,
	}: {
		children?: React.ReactNode;
		scope?: string;
		role?: string;
		className?: string;
		"aria-label"?: string;
	}) => (
		<th scope={scope} role={role} aria-label={ariaLabel} className={className}>
			{children}
		</th>
	),
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
	TableCell: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
}));

vi.mock("lucide-react", () => ({
	Palette: () => <svg data-testid="icon-palette" />,
}));

import { ColorsDataTable } from "../colors-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createColor(overrides: Record<string, unknown> = {}) {
	return {
		id: "color-1",
		name: "Rouge",
		hex: "#FF0000",
		slug: "rouge",
		isActive: true,
		_count: { skus: 3 },
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

async function renderTable(props: Parameters<typeof ColorsDataTable>[0]) {
	let result!: ReturnType<typeof render>;
	await act(async () => {
		result = render(
			<Suspense fallback={<div data-testid="loading" />}>
				<ColorsDataTable {...props} />
			</Suspense>,
		);
		await props.colorsPromise;
	});
	return result;
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorsDataTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no colors", async () => {
		const promise = Promise.resolve({ colors: [], pagination: createPagination() });
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
	});

	it("shows empty state title 'Aucune couleur trouvée'", async () => {
		const promise = Promise.resolve({ colors: [], pagination: createPagination() });
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByText("Aucune couleur trouvée")).toBeInTheDocument();
	});

	it("shows 'Créer une couleur' button in empty state", async () => {
		const promise = Promise.resolve({ colors: [], pagination: createPagination() });
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByText("Créer une couleur")).toBeInTheDocument();
	});

	// ─── Table renders ────────────────────────────────────────────────────────

	it("renders table when colors are present", async () => {
		const promise = Promise.resolve({
			colors: [createColor()],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByTestId("colors-table")).toBeInTheDocument();
	});

	it("shows color name in table row", async () => {
		const promise = Promise.resolve({
			colors: [createColor({ name: "Bleu Marine" })],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		// Color name appears in the <span title> cell and in the row-actions mock — use getAllByText
		expect(screen.getAllByText("Bleu Marine").length).toBeGreaterThanOrEqual(1);
	});

	it("renders color hex preview circle with correct background color", async () => {
		const promise = Promise.resolve({
			colors: [createColor({ hex: "#0000FF" })],
			pagination: createPagination(),
		});
		const { container } = await renderTable({ colorsPromise: promise, perPage: 20 });
		const circle = container.querySelector('[style*="background-color"]');
		expect(circle).toBeInTheDocument();
		expect(circle).toHaveStyle({ backgroundColor: "#0000FF" });
	});

	it("shows SKU count in table row", async () => {
		const promise = Promise.resolve({
			colors: [createColor({ _count: { skus: 7 } })],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByText("7")).toBeInTheDocument();
	});

	it("shows 0 SKU count when _count.skus is 0", async () => {
		const promise = Promise.resolve({
			colors: [createColor({ _count: { skus: 0 } })],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("renders ColorActiveToggle for each color row", async () => {
		const promise = Promise.resolve({
			colors: [createColor({ id: "c-42" })],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByTestId("active-toggle-c-42")).toBeInTheDocument();
	});

	it("renders ColorsRowActions for each color row", async () => {
		const promise = Promise.resolve({
			colors: [createColor({ id: "c-55", name: "Vert" })],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByTestId("row-actions-c-55")).toBeInTheDocument();
	});

	it("renders cursor pagination", async () => {
		const promise = Promise.resolve({
			colors: [createColor()],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders multiple color rows", async () => {
		const promise = Promise.resolve({
			colors: [createColor({ id: "c-1", name: "Rouge" }), createColor({ id: "c-2", name: "Bleu" })],
			pagination: createPagination(),
		});
		await renderTable({ colorsPromise: promise, perPage: 20 });
		expect(screen.getByTestId("row-actions-c-1")).toBeInTheDocument();
		expect(screen.getByTestId("row-actions-c-2")).toBeInTheDocument();
	});
});
