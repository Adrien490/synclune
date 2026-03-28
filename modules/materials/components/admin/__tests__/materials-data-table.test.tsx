import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseResult } = vi.hoisted(() => ({
	mockUseResult: {
		current: {
			materials: [] as Record<string, unknown>[],
			pagination: {
				hasNextPage: false,
				hasPreviousPage: false,
				nextCursor: null,
				prevCursor: null,
			},
		},
	},
}));

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		use: (_promise: unknown) => mockUseResult.current,
	};
});

vi.mock("@/modules/materials/components/materials-row-actions", () => ({
	MaterialsRowActions: ({ materialName }: { materialName: string }) => (
		<div data-testid={`row-actions-${materialName}`}>Actions</div>
	),
}));

vi.mock("@/modules/materials/components/materials-selection-toolbar", () => ({
	MaterialsSelectionToolbar: () => <div data-testid="selection-toolbar" />,
}));

vi.mock("@/modules/materials/components/admin/material-active-toggle", () => ({
	MaterialActiveToggle: ({ isActive }: { isActive: boolean }) => (
		<div data-testid="active-toggle" data-active={String(isActive)} />
	),
}));

vi.mock("@/modules/materials/components/admin/create-material-button", () => ({
	CreateMaterialButton: () => <button>Créer un matériau</button>,
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
		role?: string;
		className?: string;
	}) => (
		<table data-testid="materials-table" aria-label={ariaLabel}>
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
	Gem: () => <svg data-testid="icon-gem" />,
}));

import { MaterialsDataTable } from "../materials-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "mat-1",
		name: "Argent 925",
		slug: "argent-925",
		description: "Argent sterling de qualité",
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

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MaterialsDataTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseResult.current = {
			materials: [],
			pagination: createPagination(),
		};
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no materials", () => {
		mockUseResult.current = { materials: [], pagination: createPagination() };
		render(
			<MaterialsDataTable
				materialsPromise={Promise.resolve({ materials: [], pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
	});

	it("shows empty state title 'Aucun matériau trouvé'", () => {
		mockUseResult.current = { materials: [], pagination: createPagination() };
		render(
			<MaterialsDataTable
				materialsPromise={Promise.resolve({ materials: [], pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByText("Aucun matériau trouvé")).toBeInTheDocument();
	});

	// ─── Table renders ────────────────────────────────────────────────────────

	it("renders table when materials are present", () => {
		mockUseResult.current = { materials: [createMaterial()], pagination: createPagination() };
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByTestId("materials-table")).toBeInTheDocument();
	});

	it("shows material name in table row", () => {
		mockUseResult.current = {
			materials: [createMaterial({ name: "Or 18 carats" })],
			pagination: createPagination(),
		};
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByText("Or 18 carats")).toBeInTheDocument();
	});

	it("shows material description when present", () => {
		mockUseResult.current = {
			materials: [createMaterial({ description: "Alliage précieux" })],
			pagination: createPagination(),
		};
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByText("Alliage précieux")).toBeInTheDocument();
	});

	it("shows '-' when description is null", () => {
		mockUseResult.current = {
			materials: [createMaterial({ description: null })],
			pagination: createPagination(),
		};
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("shows sku count in table row", () => {
		mockUseResult.current = {
			materials: [createMaterial({ _count: { skus: 7 } })],
			pagination: createPagination(),
		};
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByText("7")).toBeInTheDocument();
	});

	it("shows '0' when material has no skus", () => {
		mockUseResult.current = {
			materials: [createMaterial({ _count: { skus: 0 } })],
			pagination: createPagination(),
		};
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("renders active toggle for each material row", () => {
		mockUseResult.current = { materials: [createMaterial()], pagination: createPagination() };
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByTestId("active-toggle")).toBeInTheDocument();
	});

	it("renders row actions for each material", () => {
		mockUseResult.current = {
			materials: [createMaterial({ name: "Acier inoxydable" })],
			pagination: createPagination(),
		};
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByTestId("row-actions-Acier inoxydable")).toBeInTheDocument();
	});

	it("renders cursor pagination", () => {
		mockUseResult.current = { materials: [createMaterial()], pagination: createPagination() };
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders selection toolbar", () => {
		mockUseResult.current = { materials: [createMaterial()], pagination: createPagination() };
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("renders multiple material rows", () => {
		mockUseResult.current = {
			materials: [
				createMaterial({ id: "mat-1", name: "Argent 925" }),
				createMaterial({ id: "mat-2", name: "Or 18 carats" }),
			],
			pagination: createPagination(),
		};
		render(
			<MaterialsDataTable materialsPromise={Promise.resolve(mockUseResult.current)} perPage={20} />,
		);
		expect(screen.getByText("Argent 925")).toBeInTheDocument();
		expect(screen.getByText("Or 18 carats")).toBeInTheDocument();
	});
});
