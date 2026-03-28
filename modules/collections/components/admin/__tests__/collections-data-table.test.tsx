import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
	PrismaClient: class MockPrismaClient {},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: { deletedAt: null },
	softDelete: {},
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {},
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({ className }: { className?: string }) => <textarea className={className} />,
}));

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	InputGroupText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
	}: {
		icon?: unknown;
		title: string;
		description?: string;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="table-empty-state">
			<span>{title}</span>
			{description && <span>{description}</span>}
		</div>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children, ...rest }: { children: React.ReactNode; [key: string]: unknown }) => (
		<table {...rest}>{children}</table>
	),
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({
		children,
		className,
		...rest
	}: {
		children?: React.ReactNode;
		className?: string;
		[key: string]: unknown;
	}) => (
		<th className={className} {...rest}>
			{children}
		</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
	TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="tooltip-trigger">{children}</div>
	),
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: ({ type }: { type: string; itemIds?: string[]; itemId?: string }) => (
		<div data-testid={`selection-cell-${type}`} />
	),
}));

vi.mock("@/modules/collections/components/admin/collection-row-actions", () => ({
	CollectionRowActions: ({
		collectionName,
	}: {
		collectionName: string;
		[key: string]: unknown;
	}) => <div data-testid="collection-row-actions" data-name={collectionName} />,
}));

vi.mock("@/modules/collections/components/admin/collections-selection-toolbar", () => ({
	CollectionsSelectionToolbar: () => <div data-testid="collections-selection-toolbar" />,
}));

vi.mock("@/modules/collections/components/admin/create-collection-button", () => ({
	CreateCollectionButton: () => <button>Créer une collection</button>,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
		title,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
		title?: string;
	}) => (
		<a href={href} className={className} title={title}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	TriangleAlert: () => <svg data-testid="icon-triangle-alert" />,
	FolderOpen: () => <svg data-testid="icon-folder-open" />,
	Star: () => <svg data-testid="icon-star" />,
}));

import { CollectionsDataTable } from "../collections-data-table";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";

// ============================================================================
// HELPERS
// ============================================================================

function createCollectionsPromise(
	collections: GetCollectionsReturn["collections"],
): Promise<GetCollectionsReturn> {
	return Promise.resolve({
		collections,
		pagination: {
			hasNextPage: false,
			hasPreviousPage: false,
			nextCursor: null,
			prevCursor: null,
		},
	});
}

function createCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: "col-1",
		name: "Bagues printemps",
		slug: "bagues-printemps",
		description: "Une belle collection de bagues.",
		status: "PUBLIC" as const,
		_count: { products: 3 },
		products: [],
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionsDataTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when collections array is empty", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([]),
				perPage: 10,
			}),
		);
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
		expect(screen.getByText("Aucune collection trouvée")).toBeInTheDocument();
	});

	// ─── Table with data ──────────────────────────────────────────────────────

	it("renders table when collections exist", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([createCollection()]),
				perPage: 10,
			}),
		);
		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders collection name as link", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([createCollection()]),
				perPage: 10,
			}),
		);
		const link = screen.getByRole("link", { name: "Bagues printemps" });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/admin/catalogue/collections/bagues-printemps");
	});

	it("renders PUBLIC status badge with correct text", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([createCollection({ status: "PUBLIC" })]),
				perPage: 10,
			}),
		);
		expect(screen.getByText("Public")).toBeInTheDocument();
	});

	it("renders DRAFT status badge with correct text", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([createCollection({ status: "DRAFT" })]),
				perPage: 10,
			}),
		);
		expect(screen.getByText("Brouillon")).toBeInTheDocument();
	});

	it("renders ARCHIVED status badge with correct text", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([createCollection({ status: "ARCHIVED" })]),
				perPage: 10,
			}),
		);
		expect(screen.getByText("Archivé")).toBeInTheDocument();
	});

	it("renders row actions for each collection", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([createCollection()]),
				perPage: 10,
			}),
		);
		expect(screen.getByTestId("collection-row-actions")).toBeInTheDocument();
	});

	it("renders warning icon for PUBLIC collection with 0 products", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([
					createCollection({ status: "PUBLIC", _count: { products: 0 } }),
				]),
				perPage: 10,
			}),
		);
		expect(screen.getByTestId("icon-triangle-alert")).toBeInTheDocument();
	});

	it("does not render warning icon for PUBLIC collection with products", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([
					createCollection({ status: "PUBLIC", _count: { products: 3 } }),
				]),
				perPage: 10,
			}),
		);
		expect(screen.queryByTestId("icon-triangle-alert")).not.toBeInTheDocument();
	});

	it("renders star icon for collection with a featured product", async () => {
		render(
			await CollectionsDataTable({
				collectionsPromise: createCollectionsPromise([
					createCollection({
						products: [{ isFeatured: true }],
					}),
				]),
				perPage: 10,
			}),
		);
		expect(screen.getByTestId("icon-star")).toBeInTheDocument();
	});
});
